const uniformService = require('../services/uniformService');

class UniformController {
  // Get all uniform orders (Admin only)
  async getAllUniformOrders(req, res) {
    try {
      const filters = {
        team: req.query.team,
        ageGroup: req.query.ageGroup,
        received: req.query.received !== undefined ? req.query.received === 'true' : undefined,
        paymentStatus: req.query.paymentStatus,
        limit: req.query.limit
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => 
        filters[key] === undefined && delete filters[key]
      );

      console.log('📋 Admin fetching uniform orders with filters:', filters);

      const orders = await uniformService.getAllUniformOrders(filters);

      res.status(200).json({
        success: true,
        data: orders,
        count: orders.uniforms.length,
        filters: filters
      });

    } catch (error) {
      console.error('❌ Error fetching all uniform orders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch uniform orders',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get uniform orders by parent (Member access)
  async getUniformOrdersByParent(req, res) {
    try {
      const { parentId } = req.params;

      if (!parentId) {
        return res.status(400).json({
          success: false,
          message: 'Parent ID is required'
        });
      }

      console.log('👨‍👩‍👧‍👦 Fetching uniform orders for parent:', parentId);

      const orders = await uniformService.getUniformOrdersByParent(parentId);

      res.status(200).json({
        success: true,
        data: orders,
        count: orders.length
      });

    } catch (error) {
      console.error('❌ Error fetching parent uniform orders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch uniform orders',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get uniform orders by student (Member access)
  async getUniformOrdersByStudent(req, res) {
    try {
      const { studentId } = req.params;

      if (!studentId) {
        return res.status(400).json({
          success: false,
          message: 'Student ID is required'
        });
      }

      console.log('👦 Fetching uniform orders for student:', studentId);

      const orders = await uniformService.getUniformOrdersByStudent(studentId);

      res.status(200).json({
        success: true,
        data: orders,
        count: orders.length
      });

    } catch (error) {
      console.error('❌ Error fetching student uniform orders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch uniform orders',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update received status (Admin only)
  async updateReceivedStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { received, notes } = req.body;
      const adminId = req.user?.uid || req.body.adminId; // From auth middleware
      const adminName = req.user?.name || req.body.adminName;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Order ID is required'
        });
      }

      if (typeof received !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'Received status must be true or false'
        });
      }

      console.log('✅ Admin updating received status:', { orderId, received, adminId });

      await uniformService.updateReceivedStatus(
        orderId, 
        received, 
        adminId, 
        adminName, 
        notes || ''
      );

      res.status(200).json({
        success: true,
        message: `Uniform marked as ${received ? 'received' : 'not received'}`
      });

    } catch (error) {
      console.error('❌ Error updating received status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update received status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get uniform summary (Admin only)
  async getUniformSummary(req, res) {
    try {
      const filters = {
        team: req.query.team,
        ageGroup: req.query.ageGroup
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => 
        filters[key] === undefined && delete filters[key]
      );

      console.log('📊 Admin fetching uniform summary with filters:', filters);

      const summary = await uniformService.getUniformSummary(filters);

      res.status(200).json({
        success: true,
        data: summary
      });

    } catch (error) {
      console.error('❌ Error fetching uniform summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch uniform summary',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Search uniform orders (Admin only)
  async searchUniformOrders(req, res) {
    try {
      const { q } = req.query;

      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search query must be at least 2 characters long'
        });
      }

      console.log('🔍 Admin searching uniform orders:', q);

      const results = await uniformService.searchUniformOrders(q.trim());

      res.status(200).json({
        success: true,
        data: results,
        count: results.length,
        searchTerm: q.trim()
      });

    } catch (error) {
      console.error('❌ Error searching uniform orders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search uniform orders',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Create uniform order manually (Admin only)
  async createUniformOrder(req, res) {
    try {
      const {
        studentId,
        studentName,
        parentId,
        parentName,
        parentEmail,
        parentPhone,
        team,
        ageGroup,
        uniformTop,
        uniformBottom,
        paymentStatus,
        notes
      } = req.body;

      // Validation
      if (!studentName || !parentName || !uniformTop || !uniformBottom) {
        return res.status(400).json({
          success: false,
          message: 'Student name, parent name, uniform top, and uniform bottom are required'
        });
      }

      console.log('👕 Admin creating manual uniform order:', { studentName, parentName });

      const result = await uniformService.createUniformOrder({
        studentId: studentId || `manual_${Date.now()}`,
        studentName,
        parentId: parentId || `manual_parent_${Date.now()}`,
        parentName,
        parentEmail: parentEmail || '',
        parentPhone: parentPhone || '',
        team: team || '',
        ageGroup: ageGroup || '',
        uniformTop,
        uniformBottom,
        orderDate: new Date(),
        paymentIntentId: `manual_${Date.now()}`,
        paymentStatus: paymentStatus || 'completed',
        orderSource: 'admin',
        notes: notes || ''
      });

      res.status(201).json({
        success: true,
        message: 'Uniform order created successfully',
        orderId: result.orderId
      });

    } catch (error) {
      console.error('❌ Error creating uniform order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create uniform order',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update uniform order (Admin only)
  async updateUniformOrder(req, res) {
    try {
      const { orderId } = req.params;
      const updateData = req.body;
      const adminId = req.user?.uid || req.body.adminId;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Order ID is required'
        });
      }

      console.log('✏️ Admin updating uniform order:', { orderId, adminId });

      await uniformService.updateUniformOrder(orderId, updateData, adminId);

      res.status(200).json({
        success: true,
        message: 'Uniform order updated successfully'
      });

    } catch (error) {
      console.error('❌ Error updating uniform order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update uniform order',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Export uniforms to CSV (Admin only)
  async exportUniformOrdersCSV(req, res) {
    try {
      const filters = {
        team: req.query.team,
        ageGroup: req.query.ageGroup,
        received: req.query.received !== undefined ? req.query.received === 'true' : undefined,
        paymentStatus: req.query.paymentStatus
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => 
        filters[key] === undefined && delete filters[key]
      );

      console.log('📥 Admin exporting uniform orders CSV with filters:', filters);

      const csvData = await uniformService.exportUniformsData(filters);

      // Convert to CSV string
      if (csvData.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No data to export',
          data: []
        });
      }

      const headers = Object.keys(csvData[0]);
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => 
          headers.map(header => `"${(row[header] || '').toString().replace(/"/g, '""')}"`).join(',')
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="uniform-orders-${new Date().toISOString().split('T')[0]}.csv"`);
      res.status(200).send(csvContent);

    } catch (error) {
      console.error('❌ Error exporting uniform orders CSV:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export uniform orders',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = new UniformController();