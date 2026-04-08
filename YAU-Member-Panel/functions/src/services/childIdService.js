const {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  updateDoc,
  query,
  serverTimestamp,
  where,
  limit,
} = require("firebase/firestore");
const {db} = require("../utils/firebase");

class ChildIdService {
  // Create a new Child ID order
  static async createChildIdOrder(orderData) {
    try {
      console.log("🆔 Creating Child ID order:", orderData);

      // IDEMPOTENCY CHECK: Check if order already exists for this paymentIntentId and studentId
      if (orderData.paymentIntentId && orderData.studentId) {
        const existingQuery = query(
          collection(db, "child_id_orders"),
          where("paymentIntentId", "==", orderData.paymentIntentId),
          where("studentId", "==", orderData.studentId),
          limit(1)
        );
        const existingSnapshot = await getDocs(existingQuery);

        if (!existingSnapshot.empty) {
          const existingDoc = existingSnapshot.docs[0];
          console.log("ℹ️ Child ID order already exists for:", {
            paymentIntentId: orderData.paymentIntentId,
            studentId: orderData.studentId
          });
          return {
            success: true,
            orderId: existingDoc.id,
            orderData: existingDoc.data(),
            alreadyExists: true
          };
        }
      }

      const childIdOrder = {
        // Student information
        studentId: orderData.studentId,
        studentName: orderData.studentName,
        
        // Parent information
        parentId: orderData.parentId,
        parentName: orderData.parentName,
        parentEmail: orderData.parentEmail,
        parentPhone: orderData.parentPhone || '',
        
        // Order details
        orderDate: orderData.orderDate || serverTimestamp(),
        amount: orderData.amount || 1000, // $10.00 in cents
        paymentStatus: orderData.paymentStatus || 'pending',
        orderStatus: orderData.orderStatus || 'processing',
        
        // Payment information
        paymentIntentId: orderData.paymentIntentId || null,
        
        // Additional details
        team: orderData.team || '',
        ageGroup: orderData.ageGroup || '',
        orderSource: orderData.orderSource || 'dashboard', // dashboard, registration, admin
        
        // Processing details
        received: orderData.received || false,
        notes: orderData.notes || '',
        
        // Metadata
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: orderData.createdBy || 'user',
        createdVia: orderData.createdVia || 'dashboard',
        
        // Status tracking
        lastUpdated: serverTimestamp(),
        lastUpdatedBy: orderData.lastUpdatedBy || 'system',
        lastUpdatedByName: orderData.lastUpdatedByName || 'System'
      };

      const docRef = await addDoc(collection(db, "child_id_orders"), childIdOrder);
      
      console.log("✅ Child ID order created with ID:", docRef.id);
      
      return {
        success: true,
        orderId: docRef.id,
        orderData: childIdOrder
      };
    } catch (error) {
      console.error("❌ Error creating Child ID order:", error);
      throw new Error(`Failed to create Child ID order: ${error.message}`);
    }
  }

  // Get all Child ID orders with optional filters
  static async getAllChildIdOrders(filters = {}) {
    try {
      console.log("📋 Getting all Child ID orders with filters:", filters);
      
      let ordersQuery = collection(db, "child_id_orders");
      const queryConstraints = [];

      // Apply filters
      if (filters.parentEmail) {
        queryConstraints.push(where("parentEmail", "==", filters.parentEmail));
      }
      
      if (filters.studentId) {
        queryConstraints.push(where("studentId", "==", filters.studentId));
      }
      
      if (filters.paymentStatus) {
        queryConstraints.push(where("paymentStatus", "==", filters.paymentStatus));
      }

      // Add ordering and limit
      queryConstraints.push(orderBy("orderDate", "desc"));
      
      if (filters.limit) {
        queryConstraints.push(limit(parseInt(filters.limit)));
      }

      if (queryConstraints.length > 0) {
        ordersQuery = query(ordersQuery, ...queryConstraints);
      }

      const snapshot = await getDocs(ordersQuery);
      
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        orderDate: doc.data().orderDate?.toDate ? doc.data().orderDate.toDate() : doc.data().orderDate,
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : doc.data().updatedAt,
      }));

      console.log(`✅ Retrieved ${orders.length} Child ID orders`);
      return orders;
    } catch (error) {
      console.error("❌ Error getting Child ID orders:", error);
      throw new Error(`Failed to get Child ID orders: ${error.message}`);
    }
  }

  // Get Child ID orders by parent
  static async getChildIdOrdersByParent(parentId) {
    try {
      console.log("👨‍👩‍👧‍👦 Getting Child ID orders for parent:", parentId);
      
      return await this.getAllChildIdOrders({ 
        parentId,
        limit: 50 
      });
    } catch (error) {
      console.error("❌ Error getting Child ID orders by parent:", error);
      throw new Error(`Failed to get Child ID orders by parent: ${error.message}`);
    }
  }

  // Get Child ID orders by student
  static async getChildIdOrdersByStudent(studentId) {
    try {
      console.log("🧒 Getting Child ID orders for student:", studentId);
      
      return await this.getAllChildIdOrders({ 
        studentId,
        limit: 10 
      });
    } catch (error) {
      console.error("❌ Error getting Child ID orders by student:", error);
      throw new Error(`Failed to get Child ID orders by student: ${error.message}`);
    }
  }

  // Update Child ID order
  static async updateChildIdOrder(orderId, updateData) {
    try {
      console.log("🔄 Updating Child ID order:", orderId, updateData);

      const orderRef = doc(db, "child_id_orders", orderId);
      
      const updatedData = {
        ...updateData,
        updatedAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        lastUpdatedBy: updateData.updatedBy || 'admin',
        lastUpdatedByName: updateData.updatedByName || 'Admin'
      };

      await updateDoc(orderRef, updatedData);
      
      console.log("✅ Child ID order updated successfully");
      
      return {
        success: true,
        orderId,
        updatedData
      };
    } catch (error) {
      console.error("❌ Error updating Child ID order:", error);
      throw new Error(`Failed to update Child ID order: ${error.message}`);
    }
  }

  // Update received status
  static async updateReceivedStatus(orderId, received, updatedBy = 'admin') {
    try {
      console.log("📦 Updating Child ID order received status:", orderId, received);
      
      return await this.updateChildIdOrder(orderId, {
        received,
        orderStatus: received ? 'completed' : 'processing',
        updatedBy,
        updatedByName: updatedBy === 'admin' ? 'Admin' : 'System'
      });
    } catch (error) {
      console.error("❌ Error updating received status:", error);
      throw new Error(`Failed to update received status: ${error.message}`);
    }
  }

  // Search Child ID orders
  static async searchChildIdOrders(searchTerm, filters = {}) {
    try {
      console.log("🔍 Searching Child ID orders:", searchTerm);
      
      // Get all orders first, then filter in memory
      // This is not ideal for large datasets, but works for moderate sizes
      const allOrders = await this.getAllChildIdOrders(filters);
      
      if (!searchTerm) {
        return allOrders;
      }

      const searchTermLower = searchTerm.toLowerCase();
      
      const filteredOrders = allOrders.filter(order => {
        return (
          order.studentName?.toLowerCase().includes(searchTermLower) ||
          order.parentName?.toLowerCase().includes(searchTermLower) ||
          order.parentEmail?.toLowerCase().includes(searchTermLower) ||
          order.team?.toLowerCase().includes(searchTermLower) ||
          order.orderId?.toLowerCase().includes(searchTermLower)
        );
      });

      console.log(`✅ Found ${filteredOrders.length} Child ID orders matching search`);
      return filteredOrders;
    } catch (error) {
      console.error("❌ Error searching Child ID orders:", error);
      throw new Error(`Failed to search Child ID orders: ${error.message}`);
    }
  }
}

module.exports = ChildIdService;