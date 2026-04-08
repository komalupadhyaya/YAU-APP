const ChildIdService = require('../services/childIdService');

class ChildIdController {
  // Get all Child ID orders with optional filters
  static async getAllChildIdOrders(req, res) {
    try {
      const filters = {
        parentEmail: req.query.parentEmail,
        studentId: req.query.studentId,
        paymentStatus: req.query.paymentStatus,
        limit: req.query.limit || 100
      };

      const orders = await ChildIdService.getAllChildIdOrders(filters);
      
      res.json({
        success: true,
        data: orders,
        count: orders.length
      });
    } catch (error) {
      console.error('❌ Error getting Child ID orders:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get Child ID orders',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get Child ID orders by parent
  static async getChildIdOrdersByParent(req, res) {
    try {
      const { parentId } = req.params;
      
      if (!parentId) {
        return res.status(400).json({
          success: false,
          error: 'Parent ID is required'
        });
      }

      const orders = await ChildIdService.getChildIdOrdersByParent(parentId);
      
      res.json({
        success: true,
        data: orders,
        count: orders.length
      });
    } catch (error) {
      console.error('❌ Error getting Child ID orders by parent:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get Child ID orders by parent',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get Child ID orders by student
  static async getChildIdOrdersByStudent(req, res) {
    try {
      const { studentId } = req.params;
      
      if (!studentId) {
        return res.status(400).json({
          success: false,
          error: 'Student ID is required'
        });
      }

      const orders = await ChildIdService.getChildIdOrdersByStudent(studentId);
      
      res.json({
        success: true,
        data: orders,
        count: orders.length
      });
    } catch (error) {
      console.error('❌ Error getting Child ID orders by student:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get Child ID orders by student',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Create Child ID order manually (admin)
  static async createChildIdOrder(req, res) {
    try {
      const orderData = req.body;
      
      const result = await ChildIdService.createChildIdOrder(orderData);
      
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('❌ Error creating Child ID order:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to create Child ID order',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update Child ID order
  static async updateChildIdOrder(req, res) {
    try {
      const { orderId } = req.params;
      const updateData = req.body;
      
      if (!orderId) {
        return res.status(400).json({
          success: false,
          error: 'Order ID is required'
        });
      }

      const result = await ChildIdService.updateChildIdOrder(orderId, updateData);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('❌ Error updating Child ID order:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to update Child ID order',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update received status
  static async updateReceivedStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { received } = req.body;
      
      if (!orderId) {
        return res.status(400).json({
          success: false,
          error: 'Order ID is required'
        });
      }

      if (typeof received !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'Received status must be a boolean'
        });
      }

      const result = await ChildIdService.updateReceivedStatus(orderId, received);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('❌ Error updating received status:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to update received status',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Search Child ID orders
  static async searchChildIdOrders(req, res) {
    try {
      const { q: searchTerm } = req.query;
      
      if (!searchTerm) {
        return res.status(400).json({
          success: false,
          error: 'Search term is required'
        });
      }

      const filters = {
        paymentStatus: req.query.paymentStatus,
        limit: req.query.limit || 50
      };

      const orders = await ChildIdService.searchChildIdOrders(searchTerm, filters);
      
      res.json({
        success: true,
        data: orders,
        count: orders.length,
        searchTerm
      });
    } catch (error) {
      console.error('❌ Error searching Child ID orders:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search Child ID orders',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get Child ID summary statistics
  static async getChildIdSummary(req, res) {
    try {
      const allOrders = await ChildIdService.getAllChildIdOrders();
      
      const summary = {
        totalOrders: allOrders.length,
        completedOrders: allOrders.filter(order => order.paymentStatus === 'completed').length,
        pendingOrders: allOrders.filter(order => order.paymentStatus === 'pending').length,
        processingOrders: allOrders.filter(order => order.orderStatus === 'processing').length,
        receivedOrders: allOrders.filter(order => order.received === true).length,
        totalRevenue: allOrders
          .filter(order => order.paymentStatus === 'completed')
          .reduce((sum, order) => sum + (order.amount || 0), 0),
        recentOrders: allOrders
          .filter(order => {
            const orderDate = new Date(order.orderDate);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return orderDate >= thirtyDaysAgo;
          }).length
      };
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('❌ Error getting Child ID summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get Child ID summary',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = ChildIdController;