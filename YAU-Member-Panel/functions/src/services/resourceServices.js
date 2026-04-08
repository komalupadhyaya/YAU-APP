// src/services/resourceService.js
const { db, storage } = require('../utils/firebase');
const { ref, uploadBytesResumable, getDownloadURL, deleteObject } = require('firebase/storage');
const { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc } = require('firebase/firestore');

class ResourceService {
  static async getAllResources() {
    try {
      console.log('🚀 Fetching all resources');
      const resourcesRef = collection(db, 'resources');
      const snapshot = await getDocs(resourcesRef);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt || new Date(),
      }));
    } catch (error) {
      console.error('❌ Error fetching resources:', error);
      throw new Error(`Failed to fetch resources: ${error.message}`);
    }
  }

  static async getResourceById(id) {
    try {
      console.log(`🚀 Fetching resource with ID: ${id}`);
      const resourceRef = doc(db, 'resources', id);
      const resourceSnap = await getDoc(resourceRef);
      if (!resourceSnap.exists()) {
        throw new Error('Resource not found');
      }
      return {
        id: resourceSnap.id,
        ...resourceSnap.data(),
        createdAt: resourceSnap.data().createdAt?.toDate?.() || resourceSnap.data().createdAt || new Date(),
        updatedAt: resourceSnap.data().updatedAt?.toDate?.() || resourceSnap.data().updatedAt || new Date(),
      };
    } catch (error) {
      console.error(`❌ Error fetching resource ${id}:`, error);
      throw new Error(`Failed to fetch resource: ${error.message}`);
    }
  }

  static async createResource(resourceData) {
    try {
      console.log('🚀 Creating new resource:', resourceData.name);
      const resourceRef = await addDoc(collection(db, 'resources'), {
        ...resourceData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`✅ Resource created with ID: ${resourceRef.id}`);
      return resourceRef.id;
    } catch (error) {
      console.error('❌ Error creating resource:', error);
      throw new Error(`Failed to create resource: ${error.message}`);
    }
  }

  static async updateResource(id, updates) {
    try {
      console.log(`🚀 Updating resource with ID: ${id}`);
      const resourceRef = doc(db, 'resources', id);
      await updateDoc(resourceRef, {
        ...updates,
        updatedAt: new Date(),
      });
      console.log(`✅ Resource ${id} updated successfully`);
    } catch (error) {
      console.error(`❌ Error updating resource ${id}:`, error);
      throw new Error(`Failed to update resource: ${error.message}`);
    }
  }

  static async deleteResource(id) {
    try {
      console.log(`🚀 Deleting resource with ID: ${id}`);
      const resourceRef = doc(db, 'resources', id);
      const resourceSnap = await getDoc(resourceRef);
      if (!resourceSnap.exists()) {
        throw new Error('Resource not found');
      }
      const { logo } = resourceSnap.data();
      if (logo) {
        try {
          const logoRef = ref(storage, logo);
          await deleteObject(logoRef);
          console.log(`✅ Deleted logo from storage: ${logo}`);
        } catch (storageError) {
          console.warn(`⚠️ Failed to delete logo for resource ${id}:`, storageError);
        }
      }
      await deleteDoc(resourceRef);
      console.log(`✅ Resource ${id} deleted successfully`);
      return { success: true, message: 'Resource deleted successfully' };
    } catch (error) {
      console.error(`❌ Error deleting resource ${id}:`, error);
      throw new Error(`Failed to delete resource: ${error.message}`);
    }
  }

  static async batchDeleteResources(ids) {
    try {
      console.log(`🚀 Batch deleting resources: ${ids.length} IDs`);
      let successful = 0;
      let failed = 0;
      const errors = [];
      for (const id of ids) {
        try {
          const resourceRef = doc(db, 'resources', id);
          const resourceSnap = await getDoc(resourceRef);
          if (!resourceSnap.exists()) {
            failed++;
            errors.push(`Resource ${id} not found`);
            continue;
          }
          const { logo } = resourceSnap.data();
          if (logo) {
            try {
              const logoRef = ref(storage, logo);
              await deleteObject(logoRef);
              console.log(`✅ Deleted logo for resource ${id}`);
            } catch (storageError) {
              console.warn(`⚠️ Failed to delete logo for resource ${id}:`, storageError);
            }
          }
          await deleteDoc(resourceRef);
          successful++;
          console.log(`✅ Resource ${id} deleted successfully`);
        } catch (error) {
          failed++;
          errors.push(`Failed to delete resource ${id}: ${error.message}`);
        }
      }
      console.log(`✅ Batch delete completed: ${successful} successful, ${failed} failed`);
      return { successful, failed, errors };
    } catch (error) {
      console.error('❌ Error batch deleting resources:', error);
      throw new Error(`Failed to batch delete resources: ${error.message}`);
    }
  }

  static async uploadResourceLogo(file) {
    try {
      console.log('🖼️ Starting resource logo upload');
      const validation = this.validateFile(file, {
        maxSize: 5 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
        required: true,
      });
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
      const timestamp = Date.now();
      const fileName = `resource_logo_${timestamp}_${Math.random().toString(36).substring(2, 8)}_${file.originalname}`;
      const filePath = `resources/logos/${fileName}`;
      const storageRef = ref(storage, filePath);
      const uint8Array = new Uint8Array(file.buffer);
      const uploadTask = uploadBytesResumable(storageRef, uint8Array, {
        contentType: file.mimetype,
        customMetadata: {
          originalName: file.originalname,
          uploadTimestamp: new Date().toISOString(),
          fileSize: file.size.toString(),
        },
      });
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`📊 Upload progress: ${progress.toFixed(2)}%`);
          },
          (error) => {
            console.error('❌ Upload error:', error);
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              console.log('✅ Logo uploaded:', downloadURL);
              resolve({ url: downloadURL, filePath });
            } catch (error) {
              console.error('❌ Error getting download URL:', error);
              reject(error);
            }
          }
        );
      });
    } catch (error) {
      console.error('❌ Error uploading resource logo:', error);
      throw new Error(`Logo upload failed: ${error.message}`);
    }
  }

  static validateFile(file, options = {}) {
    const { maxSize = 5 * 1024 * 1024, allowedTypes = [], required = true } = options;
    if (required && !file) {
      return { isValid: false, error: 'No file provided' };
    }
    if (!file) return { isValid: true };
    if (!file.buffer || !Buffer.isBuffer(file.buffer)) {
      return { isValid: false, error: 'Invalid file buffer' };
    }
    if (file.size === 0) {
      return { isValid: false, error: 'File is empty' };
    }
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File too large. Maximum ${Math.round(maxSize / (1024 * 1024))}MB allowed`,
      };
    }
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      return {
        isValid: false,
        error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
      };
    }
    return { isValid: true };
  }
}

module.exports = ResourceService;