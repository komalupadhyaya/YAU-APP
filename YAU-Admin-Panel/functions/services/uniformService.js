const admin = require("firebase-admin");

class UniformService {
  constructor() {
    this.db = admin.firestore();
    this.uniformCollection = 'uniformOrders';
  }

  // Get all uniform orders with filters
  async getAllUniformOrders(filters = {}) {
    try {
      console.log('📋 Getting all uniform orders with filters:', filters);
      
      let query = this.db.collection(this.uniformCollection);
      
      // Apply filters
      if (filters.team) {
        query = query.where('team', '==', filters.team);
      }
      
      if (filters.ageGroup) {
        query = query.where('ageGroup', '==', filters.ageGroup);
      }
      
      if (filters.received !== undefined) {
        query = query.where('received', '==', filters.received);
      }
      
      if (filters.paymentStatus) {
        query = query.where('paymentStatus', '==', filters.paymentStatus);
      }

      // Add ordering
      query = query.orderBy('orderDate', 'desc');
      
      // Apply limit
      if (filters.limit) {
        query = query.limit(parseInt(filters.limit));
      }

      const snapshot = await query.get();
      const uniforms = [];

      snapshot.forEach(doc => {
        uniforms.push({
          id: doc.id,
          ...doc.data(),
          orderDate: doc.data().orderDate?.toDate?.()?.toISOString() || doc.data().orderDate
        });
      });

      console.log(`✅ Retrieved ${uniforms.length} uniform orders`);
      return { uniforms };
    } catch (error) {
      console.error('❌ Error getting uniform orders:', error);
      throw new Error(`Failed to get uniform orders: ${error.message}`);
    }
  }

  // Get uniform orders by parent ID
  async getUniformOrdersByParent(parentId) {
    try {
      console.log('👨‍👩‍👧‍👦 Getting uniform orders for parent:', parentId);
      
      const snapshot = await this.db.collection(this.uniformCollection)
        .where('parentId', '==', parentId)
        .orderBy('orderDate', 'desc')
        .get();

      const uniforms = [];
      snapshot.forEach(doc => {
        uniforms.push({
          id: doc.id,
          ...doc.data(),
          orderDate: doc.data().orderDate?.toDate?.()?.toISOString() || doc.data().orderDate
        });
      });

      console.log(`✅ Retrieved ${uniforms.length} uniform orders for parent`);
      return uniforms;
    } catch (error) {
      console.error('❌ Error getting parent uniform orders:', error);
      throw new Error(`Failed to get parent uniform orders: ${error.message}`);
    }
  }

  // Get uniform orders by student ID
  async getUniformOrdersByStudent(studentId) {
    try {
      console.log('👦 Getting uniform orders for student:', studentId);
      
      const snapshot = await this.db.collection(this.uniformCollection)
        .where('studentId', '==', studentId)
        .orderBy('orderDate', 'desc')
        .get();

      const uniforms = [];
      snapshot.forEach(doc => {
        uniforms.push({
          id: doc.id,
          ...doc.data(),
          orderDate: doc.data().orderDate?.toDate?.()?.toISOString() || doc.data().orderDate
        });
      });

      console.log(`✅ Retrieved ${uniforms.length} uniform orders for student`);
      return uniforms;
    } catch (error) {
      console.error('❌ Error getting student uniform orders:', error);
      throw new Error(`Failed to get student uniform orders: ${error.message}`);
    }
  }

  // Update received status
  async updateReceivedStatus(orderId, received, adminId, adminName = '', notes = '') {
    try {
      console.log('✅ Updating received status:', { orderId, received, adminId });
      
      const updateData = {
        received,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        lastUpdatedBy: adminId,
        lastUpdatedByName: adminName
      };

      if (notes) {
        updateData.notes = notes;
      }

      // Add to update history
      updateData.updateHistory = admin.firestore.FieldValue.arrayUnion({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        action: `marked as ${received ? 'received' : 'not received'}`,
        adminId,
        adminName,
        notes
      });

      await this.db.collection(this.uniformCollection).doc(orderId).update(updateData);
      
      console.log('✅ Received status updated successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating received status:', error);
      throw new Error(`Failed to update received status: ${error.message}`);
    }
  }

  // Get uniform summary statistics
  async getUniformSummary(filters = {}) {
    try {
      console.log('📊 Getting uniform summary with filters:', filters);
      
      let baseQuery = this.db.collection(this.uniformCollection);
      
      // Apply base filters
      if (filters.team) {
        baseQuery = baseQuery.where('team', '==', filters.team);
      }
      
      if (filters.ageGroup) {
        baseQuery = baseQuery.where('ageGroup', '==', filters.ageGroup);
      }

      // Get all orders with filters
      const allSnapshot = await baseQuery.get();
      
      // Get received orders
      const receivedSnapshot = await baseQuery.where('received', '==', true).get();
      
      // Get pending payment orders
      const pendingPaymentSnapshot = await baseQuery.where('paymentStatus', '==', 'pending').get();

      const summary = {
        totalOrders: allSnapshot.size,
        received: receivedSnapshot.size,
        notReceived: allSnapshot.size - receivedSnapshot.size,
        pendingPayment: pendingPaymentSnapshot.size,
        timestamp: new Date().toISOString()
      };

      console.log('✅ Summary generated:', summary);
      return summary;
    } catch (error) {
      console.error('❌ Error getting uniform summary:', error);
      throw new Error(`Failed to get uniform summary: ${error.message}`);
    }
  }

  // Search uniform orders
  async searchUniformOrders(searchTerm) {
    try {
      console.log('🔍 Searching uniform orders for:', searchTerm);
      
      // Get all uniform orders and filter in memory
      // Note: Firestore doesn't support full-text search natively
      const snapshot = await this.db.collection(this.uniformCollection)
        .orderBy('orderDate', 'desc')
        .get();

      const results = [];
      const searchLower = searchTerm.toLowerCase();

      snapshot.forEach(doc => {
        const data = doc.data();
        const searchFields = [
          data.studentName,
          data.parentName,
          data.parentEmail,
          data.team,
          data.ageGroup
        ].filter(field => field).join(' ').toLowerCase();

        if (searchFields.includes(searchLower)) {
          results.push({
            id: doc.id,
            ...data,
            orderDate: data.orderDate?.toDate?.()?.toISOString() || data.orderDate
          });
        }
      });

      console.log(`✅ Search returned ${results.length} results`);
      return results;
    } catch (error) {
      console.error('❌ Error searching uniform orders:', error);
      throw new Error(`Failed to search uniform orders: ${error.message}`);
    }
  }

  // Create uniform order
  async createUniformOrder(orderData) {
    try {
      console.log('👕 Creating new uniform order:', orderData.studentName);
      
      const docRef = await this.db.collection(this.uniformCollection).add({
        ...orderData,
        received: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        orderDate: admin.firestore.Timestamp.fromDate(new Date(orderData.orderDate))
      });

      console.log('✅ Uniform order created with ID:', docRef.id);
      return { orderId: docRef.id, success: true };
    } catch (error) {
      console.error('❌ Error creating uniform order:', error);
      throw new Error(`Failed to create uniform order: ${error.message}`);
    }
  }

  // Update uniform order
  async updateUniformOrder(orderId, updateData, adminId) {
    try {
      console.log('✏️ Updating uniform order:', { orderId, adminId });
      
      // Filter out undefined values
      const filteredData = Object.entries(updateData).reduce((acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {});

      // Add metadata
      filteredData.lastUpdated = admin.firestore.FieldValue.serverTimestamp();
      filteredData.lastUpdatedBy = adminId;

      await this.db.collection(this.uniformCollection).doc(orderId).update(filteredData);
      
      console.log('✅ Uniform order updated:', { orderId, adminId });
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating uniform order:', error);
      throw new Error(`Failed to update uniform order: ${error.message}`);
    }
  }

  // Export uniforms to CSV format data
  async exportUniformsData(filters = {}) {
    try {
      console.log('📥 Exporting uniforms data with filters:', filters);
      
      const { uniforms } = await this.getAllUniformOrders(filters);
      
      // Convert to CSV-friendly format
      const csvData = uniforms.map(uniform => ({
        'Student Name': uniform.studentName || '',
        'Parent Name': uniform.parentName || '',
        'Parent Email': uniform.parentEmail || '',
        'Parent Phone': uniform.parentPhone || '',
        'Team': uniform.team || '',
        'Age Group': uniform.ageGroup || '',
        'Uniform Top': uniform.uniformTop || '',
        'Uniform Bottom': uniform.uniformBottom || '',
        'Order Date': uniform.orderDate ? new Date(uniform.orderDate).toLocaleDateString() : '',
        'Payment Status': uniform.paymentStatus || '',
        'Received': uniform.received ? 'Yes' : 'No',
        'Notes': uniform.notes || '',
        'Last Updated': uniform.lastUpdated ? new Date(uniform.lastUpdated.seconds * 1000).toLocaleDateString() : ''
      }));

      console.log(`✅ Exported ${csvData.length} uniform records`);
      return csvData;
    } catch (error) {
      console.error('❌ Error exporting uniforms data:', error);
      throw new Error(`Failed to export uniforms data: ${error.message}`);
    }
  }
}

module.exports = new UniformService();