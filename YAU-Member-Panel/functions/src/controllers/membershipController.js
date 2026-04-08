const MembershipService = require("../services/membershipService");

class MembershipController {
  // Find user by email
  static async findUserByEmail(req, res) {
    try {
      const {email} = req.params;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: "Email is required",
        });
      }

      const result = await MembershipService.findUserByEmail(email);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Find user error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Upgrade membership
  static async upgradeMembership(req, res) {
    try {
      const {userEmail, membershipDetails} = req.body;

      if (!userEmail || !membershipDetails) {
        return res.status(400).json({
          success: false,
          error: "User email and membership details are required",
        });
      }

      const result = await MembershipService.upgradeMembership(userEmail, membershipDetails);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Upgrade membership error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Get membership status
  static async getMembershipStatus(req, res) {
    try {
      const {email} = req.params;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: "Email is required",
        });
      }

      const result = await MembershipService.getMembershipStatus(email);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Get membership status error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Cancel membership
  static async cancelMembership(req, res) {
    try {
      const {userEmail, reason} = req.body;

      if (!userEmail) {
        return res.status(400).json({
          success: false,
          error: "User email is required",
        });
      }

      const result = await MembershipService.cancelMembership(userEmail, reason);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Cancel membership error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Move to members collection
  static async moveToMembersCollection(req, res) {
    try {
      const {userEmail, membershipDetails} = req.body;

      if (!userEmail || !membershipDetails) {
        return res.status(400).json({
          success: false,
          error: "User email and membership details are required",
        });
      }

      const result = await MembershipService.moveToMembersCollection(userEmail, membershipDetails);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Move to members collection error:", error);
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = MembershipController;
