// services/uploadService.js
const { ref, uploadBytesResumable, getDownloadURL, deleteObject } = require('firebase/storage');
const { collection, addDoc, doc, deleteDoc, getDocs, query, where, orderBy, limit, getDoc } = require('firebase/firestore');
const { storage, db } = require("../utils/firebase");

const UPLOAD_COLLECTIONS = {
  FILES: 'uploaded_files',
  USAGE_LOGS: 'upload_usage_logs'
};

class UploadService {
  // Community media upload using Firebase Client SDK
  static async uploadCommunityMedia(file, options = {}) {
    try {
      const { postId, userId, mediaType = 'image' } = options;
      
      console.log('🚀 Starting community media upload with Client SDK:', {
        fileName: file.originalname,
        size: file.size,
        type: file.mimetype,
        postId,
        mediaType
      });

      // Validate file
      const validation = this.validateFile(file, {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: [
          'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
          'video/mp4', 'video/avi', 'video/mov', 'video/wmv'
        ],
        required: true
      });

      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Generate file path
      const timestamp = Date.now();
      const fileName = `${postId}_${timestamp}_${file.originalname}`;
      const filePath = `community/${mediaType}s/${fileName}`;
      
      console.log('📁 Upload path:', filePath);

      // Create storage reference using Client SDK
      const storageRef = ref(storage, filePath);
      
      console.log('⬆️ Starting upload with uploadBytesResumable...');

      // Convert buffer to Uint8Array for Client SDK
      const uint8Array = new Uint8Array(file.buffer);

      // Upload using Client SDK uploadBytesResumable
      const uploadTask = uploadBytesResumable(storageRef, uint8Array, {
        contentType: file.mimetype,
        customMetadata: {
          originalName: file.originalname,
          uploadedBy: userId || 'system',
          postId: postId,
          mediaType: mediaType,
          uploadTimestamp: new Date().toISOString(),
          fileSize: file.size.toString()
        }
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
              console.log('✅ Upload completed, getting download URL...');
              
              // Get download URL using Client SDK
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              
              console.log('🔗 Download URL obtained:', downloadURL);

              // Save metadata to Firestore using Client SDK
              const fileRecord = {
                fileName,
                originalName: file.originalname,
                downloadURL,
                filePath,
                fileSize: file.size,
                mimeType: file.mimetype,
                fileType: 'community_media',
                folder: 'community',
                subFolder: `${mediaType}s`,
                postId,
                mediaType,
                uploadedBy: userId || 'system',
                createdAt: new Date(),
                updatedAt: new Date(),
                isActive: true,
                downloadCount: 0,
                isPublic: true
              };

              console.log('💾 Saving file record to Firestore...');
              const docRef = await addDoc(collection(db, UPLOAD_COLLECTIONS.FILES), fileRecord);
              
              console.log('✅ File record saved with ID:', docRef.id);

              // Log usage
              try {
                await this.logUploadUsage(userId, 'community_media', file.size);
              } catch (logError) {
                console.warn('⚠️ Could not log usage:', logError.message);
              }

              resolve({
                id: docRef.id,
                url: downloadURL,
                fileName: fileName,
                type: mediaType,
                size: file.size,
                uploadedAt: new Date().toISOString(),
                isPublic: true
              });

            } catch (error) {
              console.error('❌ Error getting download URL:', error);
              reject(error);
            }
          }
        );
      });

    } catch (error) {
      console.error('❌ Error uploading community media:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  // Generic image upload using Client SDK
  static async uploadImage(file, options = {}) {
    try {
      const { folder = 'images', userId, metadata = {} } = options;
      
      console.log('🖼️ Starting image upload with Client SDK');

      const validation = this.validateFile(file, {
        maxSize: 5 * 1024 * 1024, // 5MB for images
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
        required: true
      });

      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      const timestamp = Date.now();
      const fileName = `image_${timestamp}_${Math.random().toString(36).substring(2, 8)}_${file.originalname}`;
      const filePath = `${folder}/${fileName}`;
      
      // Create storage reference
      const storageRef = ref(storage, filePath);
      const uint8Array = new Uint8Array(file.buffer);

      // Upload using Client SDK
      const uploadTask = uploadBytesResumable(storageRef, uint8Array, {
        contentType: file.mimetype,
        customMetadata: {
          originalName: file.originalname,
          uploadedBy: userId || 'system',
          uploadTimestamp: new Date().toISOString(),
          ...metadata
        }
      });

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`📊 Image upload progress: ${progress.toFixed(2)}%`);
          },
          (error) => {
            console.error('❌ Image upload error:', error);
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

              // Save to Firestore
              const fileRecord = {
                fileName,
                originalName: file.originalname,
                downloadURL,
                filePath,
                fileSize: file.size,
                mimeType: file.mimetype,
                fileType: 'image',
                folder,
                uploadedBy: userId || 'system',
                metadata,
                createdAt: new Date(),
                isActive: true,
                isPublic: true
              };

              const docRef = await addDoc(collection(db, UPLOAD_COLLECTIONS.FILES), fileRecord);

              resolve({
                id: docRef.id,
                url: downloadURL,
                fileName,
                type: 'image',
                size: file.size
              });

            } catch (error) {
              reject(error);
            }
          }
        );
      });

    } catch (error) {
      console.error('❌ Error uploading image:', error);
      throw new Error(`Image upload failed: ${error.message}`);
    }
  }

  // Delete file using Client SDK
  static async deleteFile(fileId) {
    try {
      console.log('🗑️ Deleting file:', fileId);

      // Get file record
      const docRef = doc(db, UPLOAD_COLLECTIONS.FILES, fileId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('File not found');
      }

      const fileData = docSnap.data();

      // Delete from storage using Client SDK
      try {
        const storageRef = ref(storage, fileData.filePath);
        await deleteObject(storageRef);
        console.log('✅ File deleted from storage:', fileData.filePath);
      } catch (storageError) {
        console.warn('⚠️ Could not delete from storage:', storageError.message);
      }

      // Delete record from Firestore
      await deleteDoc(docRef);
      console.log('✅ File record deleted from Firestore');

    } catch (error) {
      console.error('❌ Error deleting file:', error);
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  // Get files using Client SDK
  static async getFiles(options = {}) {
    try {
      const { 
        userId, 
        folder, 
        fileType, 
        page = 1, 
        limitCount = 20
      } = options;

      // Build query using Client SDK
      let q = query(
        collection(db, UPLOAD_COLLECTIONS.FILES),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      // Add filters
      if (userId) {
        q = query(q, where('uploadedBy', '==', userId));
      }
      if (folder) {
        q = query(q, where('folder', '==', folder));
      }
      if (fileType) {
        q = query(q, where('fileType', '==', fileType));
      }

      const snapshot = await getDocs(q);
      const files = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt
      }));

      return {
        files,
        totalCount: files.length,
        page,
        hasMore: files.length === limitCount,
        pagination: {
          currentPage: page,
          itemsPerPage: limitCount,
          hasNextPage: files.length === limitCount
        }
      };

    } catch (error) {
      console.error('❌ Error getting files:', error);
      throw new Error(`Failed to get files: ${error.message}`);
    }
  }

  // Helper methods
  static validateFile(file, options = {}) {
    const {
      maxSize = 10 * 1024 * 1024,
      allowedTypes = [],
      required = true
    } = options;

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
        error: `File too large. Maximum ${Math.round(maxSize / (1024 * 1024))}MB allowed` 
      };
    }

    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      return { 
        isValid: false, 
        error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` 
      };
    }

    return { isValid: true };
  }

  static async logUploadUsage(userId, fileType, fileSize) {
    try {
      await addDoc(collection(db, UPLOAD_COLLECTIONS.USAGE_LOGS), {
        userId: userId || 'anonymous',
        fileType,
        fileSize,
        timestamp: new Date(),
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.warn('Could not log upload usage:', error.message);
    }
  }
}

module.exports = UploadService;