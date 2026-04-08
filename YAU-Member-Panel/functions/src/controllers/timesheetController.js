const TimesheetService = require("../services/timesheetService");

exports.createEntry = async (req, res) => {

  console.log("Create entry called with params:", req.data, req.params); 
  try {
    const { coachId } = req.params;
    const entryData = {
      ...req.body,
      coachId: coachId, // Now from params instead of auth
      status: "draft",
    };
    console.log("entery data",entryData)
    const entry = await TimesheetService.createEntry(entryData);

    res.status(201).json({
      success: true,
      data: entry,
    });
  } catch (error) {
    console.error("Create entry error:", error);

    if (error.message.includes("Validation failed")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create timesheet entry",
    });
  }
};

exports.getAllEntries = async (req, res) => {
  try {
    const { coachId } = req.params;
    console.log("coach id from params:", coachId);

    const entries = await TimesheetService.getEntriesByCoachId(coachId);

    res.status(200).json({
      success: true,
      data: entries,
      count: entries.length,
    });
  } catch (error) {
    console.error("Get all entries error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch timesheet entries",
      error: error.message,
    });
  }
};

exports.getEntryById = async (req, res) => {
  try {
    const { coachId, id } = req.params;
    const entry = await TimesheetService.getEntryById(id, coachId);

    res.status(200).json({
      success: true,
      data: entry,
    });
  } catch (error) {
    console.error("Get entry by ID error:", error);

    const status = error.message.includes("not found")
      ? 404
      : error.message.includes("Access denied")
      ? 403
      : 500;

    res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateEntry = async (req, res) => {
  try {
    const { coachId, id } = req.params;
    const updated = await TimesheetService.updateEntry(id, req.body, coachId);

    res.status(200).json({
      success: true,
      data: updated,
      message: "Timesheet entry updated successfully",
    });
  } catch (error) {
    console.error("Update entry error:", error);

    const status = error.message.includes("not found")
      ? 404
      : error.message.includes("Access denied")
      ? 403
      : error.message.includes("Cannot update")
      ? 400
      : error.message.includes("Validation failed")
      ? 400
      : 500;

    res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteEntry = async (req, res) => {
  try {
    const { coachId, id } = req.params;
    const result = await TimesheetService.deleteEntry(id, coachId);

    res.status(200).json({
      success: true,
      data: result,
      message: "Timesheet entry deleted successfully",
    });
  } catch (error) {
    console.error("Delete entry error:", error);

    const status = error.message.includes("not found")
      ? 404
      : error.message.includes("Access denied")
      ? 403
      : error.message.includes("Cannot delete")
      ? 400
      : 500;

    res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

exports.submitTimesheet = async (req, res) => {
  try {
    const { coachId, id } = req.params;
    const updated = await TimesheetService.submitTimesheet(id, coachId);

    res.status(200).json({
      success: true,
      data: updated,
      message: "Timesheet submitted successfully",
    });
  } catch (error) {
    console.error("Submit timesheet error:", error);

    const status = error.message.includes("not found")
      ? 404
      : error.message.includes("Access denied")
      ? 403
      : error.message.includes("already submitted")
      ? 400
      : 500;

    res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getCoachStats = async (req, res) => {
  try {
    const { coachId } = req.params;
    const stats = await TimesheetService.getCoachStats(coachId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get coach stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch coach statistics",
    });
  }
};
