const express = require('express');
const pickupService = require('../services/pickupService');

class PickupController {
  // ==================== PICKUP ROSTERS ====================

  async createRoster(req, res) {
    try {
      const { school, program, grade, groupName, days, sessionStartDate, sessionEndDate, isActive } = req.body;
      const createdBy = req.body.createdBy || req.headers['x-admin-id'] || 'system';

      if (!school || !program || !grade) {
        return res.status(400).json({
          success: false,
          message: 'School, program, and grade are required'
        });
      }

      const roster = await pickupService.createRoster({
        school,
        program,
        grade,
        groupName,
        days,
        sessionStartDate,
        sessionEndDate,
        isActive: isActive !== undefined ? isActive : true,
        createdBy
      });

      res.status(201).json({
        success: true,
        data: roster,
        message: 'Roster created successfully'
      });
    } catch (error) {
      console.error('❌ Error creating roster:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create roster',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getAllRosters(req, res) {
    try {
      const filters = {
        school: req.query.school,
        program: req.query.program,
        grade: req.query.grade,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined
      };

      Object.keys(filters).forEach(key => 
        filters[key] === undefined && delete filters[key]
      );

      const rosters = await pickupService.getAllRosters(filters);

      res.status(200).json({
        success: true,
        data: rosters,
        count: rosters.length
      });
    } catch (error) {
      console.error('❌ Error getting rosters:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get rosters',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getRosterById(req, res) {
    try {
      const rosterId = req.params.rosterId || req.params.id;

      if (!rosterId) {
        return res.status(400).json({
          success: false,
          message: 'Roster ID is required'
        });
      }

      const roster = await pickupService.getRosterById(rosterId);

      res.status(200).json({
        success: true,
        data: roster
      });
    } catch (error) {
      console.error('❌ Error getting roster:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get roster',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async updateRoster(req, res) {
    try {
      const rosterId = req.params.rosterId || req.params.id;
      const updateData = req.body;
      const updatedBy = req.body.updatedBy || req.headers['x-admin-id'] || 'system';

      if (!rosterId) {
        return res.status(400).json({
          success: false,
          message: 'Roster ID is required'
        });
      }

      await pickupService.updateRoster(rosterId, updateData, updatedBy);

      res.status(200).json({
        success: true,
        message: 'Roster updated successfully'
      });
    } catch (error) {
      console.error('❌ Error updating roster:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update roster',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async deleteRoster(req, res) {
    try {
      const rosterId = req.params.rosterId || req.params.id;

      if (!rosterId) {
        return res.status(400).json({
          success: false,
          message: 'Roster ID is required'
        });
      }

      await pickupService.deleteRoster(rosterId);

      res.status(200).json({
        success: true,
        message: 'Roster deleted successfully'
      });
    } catch (error) {
      console.error('❌ Error deleting roster:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete roster',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ==================== ROSTER STUDENTS ====================

  async addStudent(req, res) {
    try {
      const rosterId = req.params.rosterId || req.body.rosterId;
      const { childName, parentName, school, grade, program } = req.body;
      const addedBy = req.body.addedBy || req.headers['x-admin-id'] || 'system';

      if (!rosterId || !childName || !parentName || !school || !grade || !program) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required: rosterId, childName, parentName, school, grade, program'
        });
      }

      const student = await pickupService.addStudentToRoster({
        rosterId,
        childName,
        parentName,
        school,
        grade,
        program,
        addedBy
      });

      res.status(201).json({
        success: true,
        data: student,
        message: 'Student added successfully'
      });
    } catch (error) {
      console.error('❌ Error adding student:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to add student',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getStudentsByRoster(req, res) {
    try {
      const rosterId = req.params.rosterId || req.params.id;
      const filters = {
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined
      };

      Object.keys(filters).forEach(key => 
        filters[key] === undefined && delete filters[key]
      );

      if (!rosterId) {
        return res.status(400).json({
          success: false,
          message: 'Roster ID is required'
        });
      }

      const students = await pickupService.getStudentsByRoster(rosterId, filters);

      res.status(200).json({
        success: true,
        data: students,
        count: students.length
      });
    } catch (error) {
      console.error('❌ Error getting students:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get students',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async updateStudent(req, res) {
    try {
      const studentId = req.params.studentId || req.params.id;
      const updateData = req.body;

      if (!studentId) {
        return res.status(400).json({
          success: false,
          message: 'Student ID is required'
        });
      }

      await pickupService.updateStudent(studentId, updateData);

      res.status(200).json({
        success: true,
        message: 'Student updated successfully'
      });
    } catch (error) {
      console.error('❌ Error updating student:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update student',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async deleteStudent(req, res) {
    try {
      const studentId = req.params.studentId || req.params.id;
      const deletedBy = req.body.deletedBy || req.headers['x-admin-id'] || 'system';

      if (!studentId) {
        return res.status(400).json({
          success: false,
          message: 'Student ID is required'
        });
      }

      await pickupService.deleteStudent(studentId, deletedBy);

      res.status(200).json({
        success: true,
        message: 'Student deleted successfully'
      });
    } catch (error) {
      console.error('❌ Error deleting student:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete student',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async bulkAddStudents(req, res) {
    try {
      const rosterId = req.params.rosterId || req.body.rosterId;
      const { students } = req.body;
      const addedBy = req.body.addedBy || req.headers['x-admin-id'] || 'system';

      if (!rosterId || !students || !Array.isArray(students) || students.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'rosterId and students array are required'
        });
      }

      const addedStudents = await pickupService.bulkAddStudents(students, rosterId, addedBy);

      res.status(201).json({
        success: true,
        data: addedStudents,
        count: addedStudents.length,
        message: `${addedStudents.length} students added successfully`
      });
    } catch (error) {
      console.error('❌ Error bulk adding students:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to bulk add students',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ==================== SIGN-OUTS ====================

  async createSignOut(req, res) {
    try {
      const { studentId, rosterId, parentGuardianName, notes } = req.body;
      const signedOutBy = req.body.signedOutBy || req.headers['x-username'] || 'unknown';

      if (!studentId || !rosterId || !parentGuardianName) {
        return res.status(400).json({
          success: false,
          message: 'studentId, rosterId, and parentGuardianName are required'
        });
      }

      const signOut = await pickupService.createSignOut({
        studentId,
        rosterId,
        parentGuardianName,
        notes,
        signedOutBy
      });

      res.status(201).json({
        success: true,
        data: signOut,
        message: 'Sign-out recorded successfully'
      });
    } catch (error) {
      console.error('❌ Error creating sign-out:', error);
      const statusCode = error.message.includes('already signed out') ? 409 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to create sign-out',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getSignOutsByRoster(req, res) {
    try {
      const rosterId = req.params.rosterId || req.params.id;
      const date = req.query.date || null;

      if (!rosterId) {
        return res.status(400).json({
          success: false,
          message: 'Roster ID is required'
        });
      }

      const signOuts = await pickupService.getSignOutsByRoster(rosterId, date);

      res.status(200).json({
        success: true,
        data: signOuts,
        count: signOuts.length
      });
    } catch (error) {
      console.error('❌ Error getting sign-outs:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get sign-outs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getAllSignOuts(req, res) {
    try {
      const filters = {
        rosterId: req.query.rosterId,
        studentId: req.query.studentId,
        date: req.query.date,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        limit: req.query.limit
      };

      Object.keys(filters).forEach(key => 
        filters[key] === undefined && delete filters[key]
      );

      const signOuts = await pickupService.getAllSignOuts(filters);

      res.status(200).json({
        success: true,
        data: signOuts,
        count: signOuts.length
      });
    } catch (error) {
      console.error('❌ Error getting sign-outs:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get sign-outs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ==================== PICKUP USERS ====================

  async createPickupUser(req, res) {
    try {
      const { username, password, role, isShared, notes, isActive } = req.body;
      const createdBy = req.body.createdBy || req.headers['x-admin-id'] || 'system';

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
      }

      const user = await pickupService.createPickupUser({
        username,
        password,
        role: role || 'coach',
        isShared: isShared || false,
        notes,
        isActive: isActive !== undefined ? isActive : true,
        createdBy
      });

      res.status(201).json({
        success: true,
        data: user,
        message: 'Pickup user created successfully'
      });
    } catch (error) {
      console.error('❌ Error creating pickup user:', error);
      const statusCode = error.message.includes('already exists') ? 409 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to create pickup user',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getAllPickupUsers(req, res) {
    try {
      const filters = {
        role: req.query.role,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined
      };

      Object.keys(filters).forEach(key => 
        filters[key] === undefined && delete filters[key]
      );

      const users = await pickupService.getAllPickupUsers(filters);

      res.status(200).json({
        success: true,
        data: users,
        count: users.length
      });
    } catch (error) {
      console.error('❌ Error getting pickup users:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get pickup users',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getPickupUserById(req, res) {
    try {
      const userId = req.params.userId || req.params.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      const user = await pickupService.getPickupUserById(userId);

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('❌ Error getting pickup user:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get pickup user',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async updatePickupUser(req, res) {
    try {
      const userId = req.params.userId || req.params.id;
      const updateData = req.body;
      const updatedBy = req.body.updatedBy || req.headers['x-admin-id'] || 'system';

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      await pickupService.updatePickupUser(userId, updateData, updatedBy);

      res.status(200).json({
        success: true,
        message: 'Pickup user updated successfully'
      });
    } catch (error) {
      console.error('❌ Error updating pickup user:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update pickup user',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async resetPickupUserPassword(req, res) {
    try {
      const userId = req.params.userId || req.params.id;
      const { newPassword } = req.body;
      const updatedBy = req.body.updatedBy || req.headers['x-admin-id'] || 'system';

      if (!userId || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'User ID and new password are required'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }

      await pickupService.resetPickupUserPassword(userId, newPassword, updatedBy);

      res.status(200).json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      console.error('❌ Error resetting password:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to reset password',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async deletePickupUser(req, res) {
    try {
      const userId = req.params.userId || req.params.id;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      await pickupService.deletePickupUser(userId);

      res.status(200).json({
        success: true,
        message: 'Pickup user deleted successfully'
      });
    } catch (error) {
      console.error('❌ Error deleting pickup user:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete pickup user',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async authenticatePickupUser(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
      }

      const user = await pickupService.authenticatePickupUser(username, password);

      res.status(200).json({
        success: true,
        data: user,
        message: 'Authentication successful'
      });
    } catch (error) {
      console.error('❌ Authentication error:', error);
      res.status(401).json({
        success: false,
        message: error.message || 'Invalid credentials',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

const controller = new PickupController();
const router = express.Router();

// Rosters
router.get('/rosters', controller.getAllRosters.bind(controller));
router.post('/rosters', controller.createRoster.bind(controller));
router.get('/rosters/:id', controller.getRosterById.bind(controller));
router.put('/rosters/:id', controller.updateRoster.bind(controller));
router.delete('/rosters/:id', controller.deleteRoster.bind(controller));

// Students
router.post('/rosters/:rosterId/students', controller.addStudent.bind(controller));
router.get('/rosters/:rosterId/students', controller.getStudentsByRoster.bind(controller));
router.post('/rosters/:rosterId/students/bulk', controller.bulkAddStudents.bind(controller));
router.put('/students/:studentId', controller.updateStudent.bind(controller));
router.delete('/students/:studentId', controller.deleteStudent.bind(controller));

// Backward-compatible student routes (older UI)
router.get('/students/roster/:rosterId', controller.getStudentsByRoster.bind(controller));
router.post('/students/bulk', controller.bulkAddStudents.bind(controller));

// Sign-outs
router.post('/signouts', controller.createSignOut.bind(controller));
router.get('/rosters/:rosterId/signouts', controller.getSignOutsByRoster.bind(controller));
router.get('/signouts', controller.getAllSignOuts.bind(controller));

// Users
router.get('/users', controller.getAllPickupUsers.bind(controller));
router.post('/users', controller.createPickupUser.bind(controller));
router.get('/users/:id', controller.getPickupUserById.bind(controller));
router.put('/users/:id', controller.updatePickupUser.bind(controller));
router.delete('/users/:id', controller.deletePickupUser.bind(controller));
router.put('/users/:id/reset-password', controller.resetPickupUserPassword.bind(controller));
router.post('/users/authenticate', controller.authenticatePickupUser.bind(controller));

// Backward-compatible user routes (older UI)
router.put('/users/:id/password', controller.resetPickupUserPassword.bind(controller));
router.post('/authenticate', controller.authenticatePickupUser.bind(controller));

module.exports = router;
