const AdminTimesheetService = require("../services/adminTimesheetService");

exports.getAllTimesheets = async (req, res) => {
  try {
    const {
      coachId,
      location,
      startDate,
      endDate,
      status,
      page = 1,
      limit = 50,
    } = req.query;

    const filters = {
      coachId,
      location,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      status,
      page: parseInt(page),
      limit: parseInt(limit),
    };

    const result = await AdminTimesheetService.getAllTimesheets(filters);

    res.status(200).json({
      success: true,
      data: result.timesheets,
      pagination: result.pagination,
      filters: filters,
    });
  } catch (error) {
    console.error("Get all timesheets error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getCoachTimesheets = async (req, res) => {
  try {
    const { coachId } = req.params;
    const { startDate, endDate, status, page = 1, limit = 10 } = req.query;

    const filters = {
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      status,
      page: parseInt(page),
      limit: parseInt(limit),
    };

    const result = await AdminTimesheetService.getCoachTimesheets(
      coachId,
      filters
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get coach timesheets error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getTimesheetStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filters = {
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    };

    const stats = await AdminTimesheetService.getTimesheetStats(filters);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get timesheet stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.approveTimesheet = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const result = await AdminTimesheetService.approveTimesheet(id, notes);

    res.status(200).json({
      success: true,
      data: result,
      message: "Timesheet approved successfully",
    });
  } catch (error) {
    console.error("Approve timesheet error:", error);

    const status = error.message.includes("not found") ? 404 : 500;
    res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

exports.rejectTimesheet = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await AdminTimesheetService.rejectTimesheet(id, reason);

    res.status(200).json({
      success: true,
      data: result,
      message: "Timesheet rejected successfully",
    });
  } catch (error) {
    console.error("Reject timesheet error:", error);

    const status = error.message.includes("not found") ? 404 : 500;
    res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

exports.bulkApproveTimesheets = async (req, res) => {
  try {
    const { entryIds, notes } = req.body;

    if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "entryIds array is required and cannot be empty",
      });
    }

    const result = await AdminTimesheetService.bulkApproveTimesheets(
      entryIds,
      notes || ""
    );

    res.status(200).json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (error) {
    console.error("Bulk approve timesheets error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.bulkRejectTimesheets = async (req, res) => {
  try {
    const { entryIds, reason } = req.body;

    if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "entryIds array is required and cannot be empty",
      });
    }

    if (!reason || reason.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const result = await AdminTimesheetService.bulkRejectTimesheets(
      entryIds,
      reason
    );

    res.status(200).json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (error) {
    console.error("Bulk reject timesheets error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.exportTimesheets = async (req, res) => {
  try {
    const { coachId, location, startDate, endDate, status, format = "json" } = req.query;

    const filters = {
      coachId,
      location,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      status,
    };

    const result = await AdminTimesheetService.exportTimesheets(
      filters,
      format
    );

    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=timesheets-${
          new Date().toISOString().split("T")[0]
        }.csv`
      );
      return res.send(result);
    }

    res.status(200).json({
      success: true,
      data: result,
      count: result.length,
      filters: filters
    });
  } catch (error) {
    console.error("Export timesheets error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
