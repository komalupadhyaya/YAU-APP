// EnhancedTimesheet.jsx
import React, { useState, useEffect } from "react";
import { Edit, Trash2, Send, Clock, Eye } from "lucide-react";
import {
  getTimesheetEntries,
  createTimesheetEntry,
  updateTimesheetEntry,
  deleteTimesheetEntry,
  submitTimesheetEntry,
} from "../../services/coachAPI";
import dayjs from 'dayjs';

const Timesheet = () => {
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addTimesheetButton, setAddTimesheetButton] = useState(false);
  const [editingEntry, setEditingEntry] = useState({
    id: null,
    date: "",
    startTime: { hours: "", minutes: "", ampm: "AM" },
    endTime: { hours: "", minutes: "", ampm: "AM" },
    location: "",
    notes: "",
    status: "draft",
  });

  const [viewingEntry, setViewingEntry] = useState({
    id: null,
    date: "",
    startTime: { hours: "", minutes: "", ampm: "AM" },
    endTime: { hours: "", minutes: "", ampm: "AM" },
    location: "",
    notes: "",
    status: "draft",
    totalHours: 0,
    rejectionReason: "",
  });

  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split("T")[0],
    startTime: { hours: "9", minutes: "00", ampm: "AM" },
    endTime: { hours: "5", minutes: "00", ampm: "PM" },
    location: "",
    notes: "",
  });

  const [timeError, setTimeError] = useState("");

  // Generate time options for dropdowns
  const hoursOptions = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutesOptions = ["00", "15", "30", "45"];

  // Recalculate hours for existing entries on component load - FIXED VERSION
  useEffect(() => {
    const recalculateExistingEntries = async () => {
      if (entries.length > 0) {
        console.log("Recalculating hours for existing entries...");

        let needsUpdate = false;
        const updatedEntries = entries.map((entry) => {
          // Only recalculate entries that have 0 hours but valid times
          if (
            (entry.totalHours === 0 || entry.totalHours === null) &&
            entry.startTime &&
            entry.endTime
          ) {
            const calculatedHours = calculateHours(
              entry.startTime,
              entry.endTime,
              entry.date
            );
            console.log(
              `Entry ${entry.id}: ${entry.startTime} - ${entry.endTime} = ${calculatedHours}h`
            );

            if (calculatedHours > 0 && calculatedHours !== entry.totalHours) {
              needsUpdate = true;
              return { ...entry, totalHours: calculatedHours };
            }
          }
          return entry;
        });

        if (needsUpdate) {
          console.log("Updating entries with corrected hours");
          setEntries(updatedEntries);
        }
      }
    };

    // Only run this once when entries are first loaded, not on every re-render
    if (entries.length > 0) {
      recalculateExistingEntries();
    }
  }, [entries.length === 0 ? null : entries[0]?.id]); // Only run when the first entry ID changes (initial load)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch timesheet entries
        const entriesData = await getTimesheetEntries();
        setEntries(entriesData.data || []);

        setLoading(false);
      } catch (err) {
        setLoading(false);
        console.error("Failed to fetch data:", err);
        alert(err.message || "Failed to load timesheet data");
      }
    };

    fetchData();
  }, []);

  // Apply filter and search
  useEffect(() => {
    setFilteredEntries(entries);
  }, [entries]);

  // Convert time object to 12-hour format string
  const timeObjectToString = (timeObj) => {
    if (!timeObj.hours || !timeObj.minutes || !timeObj.ampm) return "";
    return `${timeObj.hours}:${timeObj.minutes} ${timeObj.ampm}`;
  };

  // Convert 12-hour format string to time object
  const timeStringToObject = (timeString) => {
    if (!timeString) return { hours: "", minutes: "", ampm: "AM" };

    try {
      const [timePart, ampm] = timeString.split(" ");
      const [hours, minutes] = timePart.split(":");
      return { hours, minutes, ampm: ampm || "AM" };
    } catch (error) {
      return { hours: "", minutes: "", ampm: "AM" };
    }
  };

  // Convert time to US timezone and format for storage
  const convertToUSTime = (date, timeObj) => {
    if (!timeObj.hours || !timeObj.minutes) return "";

    try {
      // Simply return the formatted time without timezone conversion for now
      // Timezone conversion is causing issues with hour calculation
      return `${timeObj.hours}:${timeObj.minutes} ${timeObj.ampm}`;
    } catch (error) {
      console.error("Error converting time:", error);
      // Fallback to original if conversion fails
      return `${timeObj.hours}:${timeObj.minutes} ${timeObj.ampm}`;
    }
  };

  // Validate that times are valid (allows overnight shifts)
  const validateTimes = (date, startTime, endTime) => {
    if (
      !startTime.hours ||
      !startTime.minutes ||
      !endTime.hours ||
      !endTime.minutes
    ) {
      return true; // Allow empty times for form validation
    }
    return true;
  };

  const calculateHours = (startTimeStr, endTimeStr, date) => {
    if (!startTimeStr || !endTimeStr) return 0;

    try {
      // Helper function to convert 12-hour time to minutes since midnight
      const timeToMinutes = (timeStr) => {
        const [timePart, ampm] = timeStr.split(" ");
        const [hours, minutes] = timePart.split(":");

        let hour = parseInt(hours, 10);
        const min = parseInt(minutes, 10) || 0;

        // Convert to 24-hour format
        if (ampm === "PM" && hour !== 12) {
          hour += 12;
        } else if (ampm === "AM" && hour === 12) {
          hour = 0;
        }

        return hour * 60 + min;
      };

      const startMinutes = timeToMinutes(startTimeStr);
      const endMinutes = timeToMinutes(endTimeStr);

      let totalMinutes;

      // Handle overnight shifts (end time is earlier than start time)
      if (endMinutes <= startMinutes) {
        totalMinutes = 24 * 60 - startMinutes + endMinutes;
      } else {
        totalMinutes = endMinutes - startMinutes;
      }

      const hours = totalMinutes / 60;
      return Math.round(hours * 100) / 100;
    } catch (error) {
      console.error("Error calculating hours:", error);
      return 0;
    }
  };

  // Calculate total hours from entries
  const calculateTotalStats = () => {
    const totalHours = entries.reduce(
      (sum, entry) => sum + (entry.totalHours || 0),
      0
    );
    const draftEntries = entries.filter(
      (entry) => entry.status === "draft"
    ).length;
    const submittedEntries = entries.filter(
      (entry) => entry.status === "submitted"
    ).length;
    const approvedEntries = entries.filter(
      (entry) => entry.status === "approved"
    ).length;
    const rejectedEntries = entries.filter(
      (entry) => entry.status === "rejected"
    ).length;

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      totalEntries: entries.length,
      draftEntries,
      submittedEntries,
      approvedEntries,
      rejectedEntries,
    };
  };

  const stats = calculateTotalStats();

  // Add new entry
  const handleAddEntry = async () => {
    if (
      !newEntry.date ||
      !newEntry.startTime.hours ||
      !newEntry.endTime.hours ||
      !newEntry.location
    ) {
      alert("Please fill in all required fields");
      return;
    }

    if (!newEntry.location.trim()) {
      alert("Please enter a location");
      return;
    }

    try {
      const startTimeString = timeObjectToString(newEntry.startTime);
      const endTimeString = timeObjectToString(newEntry.endTime);

      console.log(
        "Adding entry with times:",
        startTimeString,
        endTimeString,
        newEntry.date
      );

      const calculatedHours = calculateHours(
        startTimeString,
        endTimeString,
        newEntry.date
      );
      console.log("Calculated hours for new entry:", calculatedHours);

      const entryData = {
        date: newEntry.date,
        startTime: convertToUSTime(newEntry.date, newEntry.startTime),
        endTime: convertToUSTime(newEntry.date, newEntry.endTime),
        location: newEntry.location.trim(),
        notes: newEntry.notes || "",
        totalHours: calculatedHours,
      };

      console.log("Final entry data:", entryData);

      const response = await createTimesheetEntry(entryData);

      if (response.success) {
        setEntries([response.data, ...entries]);
        setNewEntry({
          date: new Date().toISOString().split("T")[0],
          startTime: { hours: "9", minutes: "00", ampm: "AM" },
          endTime: { hours: "5", minutes: "00", ampm: "PM" },
          location: "",
          notes: "",
        });
        alert("Timesheet entry added successfully!");
      } else {
        alert(response.message || "Failed to add entry");
      }
    } catch (err) {
      console.error("Failed to add timesheet entry:", err);
      alert(err.message || "Failed to add timesheet entry");
    }
  };

  // Edit entry
  const handleEdit = (entry) => {
    setEditingEntry({
      id: entry.id,
      date: entry.date?.split("T")[0] || new Date().toISOString().split("T")[0],
      startTime: timeStringToObject(entry.startTime),
      endTime: timeStringToObject(entry.endTime),
      location: entry.location,
      notes: entry.notes || "",
      status: entry.status,
    });
    setIsModalOpen(true);
    setTimeError("");
  };

  // View entry details
  const handleView = (entry) => {
    setViewingEntry({
      id: entry.id,
      date: entry.date?.split("T")[0] || new Date().toISOString().split("T")[0],
      startTime: timeStringToObject(entry.startTime),
      endTime: timeStringToObject(entry.endTime),
      location: entry.location,
      notes: entry.notes || "",
      status: entry.status,
      totalHours: entry.totalHours || 0,
      rejectionReason: entry.rejectionReason || "",
    });
    setIsViewModalOpen(true);
  };

  // Save edited entry
  const handleSaveEdit = async () => {
    if (
      !editingEntry.date ||
      !editingEntry.startTime.hours ||
      !editingEntry.endTime.hours ||
      !editingEntry.location
    ) {
      alert("Please fill in all required fields");
      return;
    }

    if (!editingEntry.location.trim()) {
      alert("Please enter a location");
      return;
    }

    try {
      const startTimeString = timeObjectToString(editingEntry.startTime);
      const endTimeString = timeObjectToString(editingEntry.endTime);

      const updateData = {
        date: editingEntry.date,
        startTime: convertToUSTime(editingEntry.date, editingEntry.startTime),
        endTime: convertToUSTime(editingEntry.date, editingEntry.endTime),
        location: editingEntry.location.trim(),
        notes: editingEntry.notes || "",
        totalHours: calculateHours(
          startTimeString,
          endTimeString,
          editingEntry.date
        ),
      };

      const response = await updateTimesheetEntry(editingEntry.id, updateData);

      if (response.success) {
        setEntries(
          entries.map((entry) =>
            entry.id === editingEntry.id ? response.data : entry
          )
        );
        setIsModalOpen(false);
        alert("Timesheet entry updated successfully!");
      } else {
        alert(response.message || "Failed to update entry");
      }
    } catch (err) {
      console.error("Failed to update timesheet entry:", err);
      alert(err.message || "Failed to update timesheet entry");
    }
  };

  // Delete entry
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;

    try {
      const response = await deleteTimesheetEntry(id);

      if (response.success) {
        setEntries(entries.filter((entry) => entry.id !== id));
        alert("Timesheet entry deleted successfully!");
      } else {
        alert(response.message || "Failed to delete entry");
      }
    } catch (err) {
      console.error("Failed to delete timesheet entry:", err);
      alert(err.message || "Failed to delete timesheet entry");
    }
  };

  // Submit timesheet for review
  const handleSubmit = async (id, isResubmit = false) => {
    if (
      !window.confirm(
        isResubmit
          ? "Resubmit this timesheet for review?"
          : "Are you sure you want to submit this timesheet for review? You won't be able to edit it after submission."
      )
    )
      return;

    try {
      const response = await submitTimesheetEntry(id);

      if (response.success) {
        setEntries(
          entries.map((entry) => (entry.id === id ? response.data : entry))
        );
        // Fetch timesheet entries
        const entriesData = await getTimesheetEntries();
        setEntries(entriesData.data || []);
        alert(isResubmit ? "Timesheet resubmitted successfully!" : "Timesheet submitted for review successfully!");
      } else {
        alert(response.message || "Failed to submit timesheet");
      }
    } catch (err) {
      console.error("Failed to submit timesheet:", err);
      alert(err.message || "Failed to submit timesheet");
    }
  };

  // Format date for display
  const formatDisplayDate = (dateString) => {
    if (!dateString) return "Invalid Date";
    try {
      return new Date(dateString).toString();
      // return dateString.toString()
      // return new Date(dateString).toLocaleDateString("en-US", {
      //   year: "numeric",
      //   month: "short",
      //   day: "numeric",
      // });
    } catch (error) {
      return "Invalid Date";
    }
  };

  // Get status badge color
  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { color: "bg-yellow-100 text-yellow-800", label: "Draft" },
      submitted: { color: "bg-blue-100 text-blue-800", label: "Submitted" },
      approved: { color: "bg-green-100 text-green-800", label: "Approved" },
      rejected: { color: "bg-red-100 text-red-800", label: "Rejected" },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
      >
        {config.label}
      </span>
    );
  };

  // Time Selection Component
  const TimeSelection = ({ time, onChange, label, readOnly = false }) => (
    <div className="flex flex-col">
      <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
        <Clock size={16} className="text-gray-400" />
        {label} (US Time Zone) *
      </label>
      <div className="flex gap-2">
        {/* Hours Dropdown */}
        <select
          value={time.hours || ""}
          onChange={(e) => onChange({ ...time, hours: e.target.value })}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          disabled={readOnly}
        >
          <option value="">Hour</option>
          {hoursOptions.map((hour) => (
            <option key={hour} value={hour}>
              {hour}
            </option>
          ))}
        </select>

        {/* Minutes Dropdown */}
        <select
          value={time.minutes || ""}
          onChange={(e) => onChange({ ...time, minutes: e.target.value })}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          disabled={readOnly}
        >
          <option value="">Min</option>
          {minutesOptions.map((minute) => (
            <option key={minute} value={minute}>
              {minute}
            </option>
          ))}
        </select>

        {/* AM/PM Dropdown */}
        <select
          value={time.ampm || "AM"}
          onChange={(e) => onChange({ ...time, ampm: e.target.value })}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          disabled={readOnly}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <h1 className="text-sm font-medium text-gray-700 mb-2">
        Dashboard / Timesheet
      </h1>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Timesheet</h1>
        <button
          onClick={() => setAddTimesheetButton((pre) => !pre)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors font-medium shadow-sm"
        >
          {addTimesheetButton ? "Add Hours" : "Add Hours"}
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="text-2xl font-bold text-gray-900">
            {stats.totalEntries}
          </div>
          <div className="text-sm text-gray-600">Total Entries</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="text-2xl font-bold text-gray-900">
            {stats.totalHours}h
          </div>
          <div className="text-sm text-gray-600">Total Hours</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="text-2xl font-bold text-yellow-600">
            {stats.draftEntries}
          </div>
          <div className="text-sm text-gray-600">Draft Entries</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="text-2xl font-bold text-blue-600">
            {stats.submittedEntries}
          </div>
          <div className="text-sm text-gray-600">Submitted</div>
        </div>
      </div>

      {/* Add Entry Form */}
      {addTimesheetButton && (
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between border-b pb-4 mb-6">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
                Add Hours
              </h1>
              <p className="text-gray-600">Create a new timesheet entry</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                value={newEntry.date}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, date: e.target.value })
                }
              />
            </div>

            {/* Start Time */}
            <TimeSelection
              time={newEntry.startTime}
              onChange={(startTime) => setNewEntry({ ...newEntry, startTime })}
              label="Start Time"
            />

            {/* End Time */}
            <TimeSelection
              time={newEntry.endTime}
              onChange={(endTime) => setNewEntry({ ...newEntry, endTime })}
              label="End Time"
            />

            {/* Location - Input Field */}
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Location *
              </label>
              <input
                type="text"
                placeholder="Enter location name..."
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                value={newEntry.location}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, location: e.target.value })
                }
              />
            </div>
          </div>

          {timeError && (
            <div className="mt-2 text-red-600 text-sm">{timeError}</div>
          )}

          {/* Notes */}
          <div className="grid grid-cols-1 mt-4">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                placeholder="Add any additional information about the work session..."
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-none"
                rows="3"
                value={newEntry.notes}
                onChange={(e) =>
                  setNewEntry({ ...newEntry, notes: e.target.value })
                }
              />
            </div>
          </div>

          <div className="mt-6 flex justify-start">
            <button
              onClick={handleAddEntry}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow-sm transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Adding..." : "+ Add Entry"}
            </button>
          </div>
        </div>
      )}

      {/* Timesheet Table */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading timesheet entries...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
            <div className="min-w-full inline-block align-middle">
              <div className="overflow-hidden border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Time
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Hours
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Location
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Notes
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Status
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredEntries.length > 0 ? (
                      filteredEntries.map((entry) => (
                        <tr
                          key={entry.id}
                          className="hover:bg-gray-50 transition"
                        >
                          <td className="px-4 py-3 text-gray-800 whitespace-nowrap">
                          {!entry?.date 
                            ? " " 
                            : (typeof(entry.date) === 'object' || entry.date instanceof Date && isNaN(entry.date) 
                                ? "Invalid Date" 
                                : dayjs(entry.date).isValid() 
                                  ? dayjs(entry.date).format("DD-MMM-YYYY") // Format to '07-Dec-2025'
                                  : "Invalid Date"
                            )
                          }
                          </td>
                          <td className="px-4 py-3 text-gray-800 whitespace-nowrap">
                            {entry.startTime} - {entry.endTime}
                          </td>
                          <td className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap">
                            {entry.totalHours || 0}h
                          </td>
                          <td
                            className="px-4 py-3 text-gray-800 max-w-xs truncate"
                            title={entry.location}
                          >
                            {entry.location || "-"}
                          </td>
                          <td
                            className="px-4 py-3 text-gray-800 max-w-xs truncate"
                            title={entry.notes}
                          >
                            {entry.notes || "-"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {getStatusBadge(entry.status)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2 min-w-[140px]">
                              {/* Eye button for non-draft entries (approved/rejected/submitted) */}
                              {entry.status !== "draft" && entry.status !== undefined && (
                                <button
                                  onClick={() => handleView(entry)}
                                  className="text-gray-600 hover:text-gray-800 p-1"
                                  title="View Details"
                                >
                                  <Eye size={18} />
                                </button>
                              )}

                              {/* Edit, Delete, Submit buttons for draft entries (3 actions) */}
                              {(entry.status === "draft" || entry.status === undefined) && (
                                <>
                                  <button
                                    onClick={() => handleEdit(entry)}
                                    className="text-blue-600 hover:text-blue-800 p-1"
                                    title="Edit"
                                  >
                                    <Edit size={18} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(entry.id)}
                                    className="text-red-600 hover:text-red-800 p-1"
                                    title="Delete"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                  <button
                                    onClick={() => handleSubmit(entry.id)}
                                    className="text-green-600 hover:text-green-800 p-1"
                                    title="Submit for Review"
                                  >
                                    <Send size={18} />
                                  </button>
                                </>
                              )}

                              {/* Edit + Resubmit for rejected entries (with view) */}
                              {entry.status === "rejected" && (
                                <>
                                  <button
                                    onClick={() => handleEdit(entry)}
                                    className="text-blue-600 hover:text-blue-800 p-1"
                                    title="Edit"
                                  >
                                    <Edit size={18} />
                                  </button>
                                  <button
                                    onClick={() => handleSubmit(entry.id, true)}
                                    className="text-green-600 hover:text-green-800 p-1"
                                    title="Resubmit for Review"
                                  >
                                    <Send size={18} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="7"
                          className="text-center text-gray-500 py-8 italic"
                        >
                          No timesheet entries found. Create your first entry
                          above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
              </div>

              <div className="mt-4 flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  Total entries: {entries.length}
                </p>
                <div className="text-sm text-gray-500">
                  Total Hours: {stats.totalHours}h
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Edit Timesheet Entry</h2>

            <div className="flex flex-col mb-3">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                value={editingEntry.date}
                onChange={(e) =>
                  setEditingEntry({ ...editingEntry, date: e.target.value })
                }
              />
            </div>

            {/* Start Time Selection */}
            <div className="mb-3">
              <TimeSelection
                time={editingEntry.startTime}
                onChange={(startTime) =>
                  setEditingEntry({ ...editingEntry, startTime })
                }
                label="Start Time"
              />
            </div>

            {/* End Time Selection */}
            <div className="mb-3">
              <TimeSelection
                time={editingEntry.endTime}
                onChange={(endTime) =>
                  setEditingEntry({ ...editingEntry, endTime })
                }
                label="End Time"
              />
            </div>

            {timeError && (
              <div className="mb-3 text-red-600 text-sm">{timeError}</div>
            )}

            <div className="flex flex-col mb-3">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Location *
              </label>
              <input
                type="text"
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                value={editingEntry.location}
                onChange={(e) =>
                  setEditingEntry({ ...editingEntry, location: e.target.value })
                }
                placeholder="Enter location name..."
              />
            </div>

            <div className="flex flex-col mb-4">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 resize-none"
                rows="3"
                value={editingEntry.notes}
                onChange={(e) =>
                  setEditingEntry({ ...editingEntry, notes: e.target.value })
                }
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {isViewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Timesheet Entry Details</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <div className="border border-gray-300 rounded-lg px-3 py-2 bg-gray-50">
                  {formatDisplayDate(viewingEntry.date)}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <div className="border border-gray-300 rounded-lg px-3 py-2 bg-gray-50">
                  {timeObjectToString(viewingEntry.startTime)}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <div className="border border-gray-300 rounded-lg px-3 py-2 bg-gray-50">
                  {timeObjectToString(viewingEntry.endTime)}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Total Hours
                </label>
                <div className="border border-gray-300 rounded-lg px-3 py-2 bg-gray-50">
                  {viewingEntry.totalHours}h
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <div className="border border-gray-300 rounded-lg px-3 py-2 bg-gray-50">
                  {viewingEntry.location}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <div className="border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 min-h-[80px]">
                  {viewingEntry.notes || "-"}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <div className="border border-gray-300 rounded-lg px-3 py-2">
                  {getStatusBadge(viewingEntry.status)}
                </div>
              </div>

              {/* Show rejection reason if status is rejected */}
              {viewingEntry.status === "rejected" && viewingEntry.rejectionReason && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1">
                    Rejection Reason
                  </label>
                  <div className="border border-red-300 rounded-lg px-3 py-2 bg-red-50 text-red-800">
                    {viewingEntry.rejectionReason}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timesheet;
