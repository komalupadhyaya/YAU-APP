import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Calendar,
  MapPin,
  Users,
} from "lucide-react";
import { adminTimesheetApi } from "../../firebase/apis/adminTimesheetApi";
import { useNavigate } from "react-router-dom";

const AdminTimesheetDashboard = () => {
  const [timesheets, setTimesheets] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [filteredCoaches, setFilteredCoaches] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeView, setActiveView] = useState("coaches"); // "coaches" or "timesheets"
  const [selectedTimesheets, setSelectedTimesheets] = useState([]);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const navigate = useNavigate();

  // Fetch initial data
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Filter coaches when search term changes
  useEffect(() => {
    if (searchTerm) {
      const filtered = coaches.filter(
        (coach) =>
          coach.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          coach.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCoaches(filtered);
    } else {
      setFilteredCoaches(coaches);
    }
  }, [searchTerm, coaches]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const timesheetsData = await adminTimesheetApi.getAllTimesheets();

      // Extract data array from response
      const timesheetsArray = timesheetsData.data || [];
      setTimesheets(timesheetsArray);

      // Calculate stats from the fetched timesheets
      calculateStats(timesheetsArray);

      // Extract unique coaches from timesheets
      extractCoaches(timesheetsArray);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      alert("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (timesheetsData) => {
    const total = timesheetsData.length;
    const pending = timesheetsData.filter(
      (ts) => ts.status === "submitted"
    ).length;
    const approved = timesheetsData.filter(
      (ts) => ts.status === "approved"
    ).length;
    const rejected = timesheetsData.filter(
      (ts) => ts.status === "rejected"
    ).length;

    setStats({
      total,
      pending,
      approved,
      rejected,
    });
  };

  const extractCoaches = (timesheetsData) => {
    const coachMap = new Map();

    timesheetsData.forEach((timesheet) => {
      if (timesheet.coachId && timesheet.name) {
        if (!coachMap.has(timesheet.coachId)) {
          coachMap.set(timesheet.coachId, {
            id: timesheet.coachId,
            name: timesheet.name,
            email: timesheet.email,
            timesheetCount: 1,
          });
        } else {
          const existingCoach = coachMap.get(timesheet.coachId);
          existingCoach.timesheetCount += 1;
        }
      }
    });

    const coachesArray = Array.from(coachMap.values());
    setCoaches(coachesArray);
    setFilteredCoaches(coachesArray);
  };

  const handleCoachClick = (coachId) => {
    navigate(`/admin/coach-timesheets/${coachId}`);
  };

  const handleViewToggle = () => {
    setActiveView(activeView === "coaches" ? "timesheets" : "coaches");
    setSelectedTimesheets([]); // Clear selection when switching views
  };

  // Handle checkbox selection
  const handleSelectTimesheet = (timesheetId) => {
    setSelectedTimesheets((prev) =>
      prev.includes(timesheetId)
        ? prev.filter((id) => id !== timesheetId)
        : [...prev, timesheetId]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedTimesheets.length === timesheets.length) {
      setSelectedTimesheets([]);
    } else {
      setSelectedTimesheets(timesheets.map((ts) => ts.id));
    }
  };

  // Bulk approve handler
  const handleBulkApprove = async () => {
    if (selectedTimesheets.length === 0) {
      alert("Please select at least one timesheet");
      return;
    }

    try {
      setBulkActionLoading(true);
      const result = await adminTimesheetApi.bulkApproveTimesheets(
        selectedTimesheets,
        ""
      );

      if (result.success) {
        const message = result.message || `Successfully approved ${result.data?.successful || 0} timesheet(s)`;
        alert(message);
        setSelectedTimesheets([]);
        // Refresh data
        await fetchDashboardData();
      } else {
        alert(`Error: ${result.message || "Failed to approve timesheets"}`);
      }
    } catch (error) {
      console.error("Failed to bulk approve timesheets:", error);
      alert(`Failed to approve timesheets: ${error.message}`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk reject handler
  const handleBulkReject = async () => {
    if (selectedTimesheets.length === 0) {
      alert("Please select at least one timesheet");
      return;
    }

    if (!rejectionReason || rejectionReason.trim() === "") {
      alert("Please provide a rejection reason");
      return;
    }

    try {
      setBulkActionLoading(true);
      const result = await adminTimesheetApi.bulkRejectTimesheets(
        selectedTimesheets,
        rejectionReason
      );

      if (result.success) {
        const message = result.message || `Successfully rejected ${result.data?.successful || 0} timesheet(s)`;
        alert(message);
        setSelectedTimesheets([]);
        setRejectionReason("");
        setIsRejectModalOpen(false);
        // Refresh data
        await fetchDashboardData();
      } else {
        alert(`Error: ${result.message || "Failed to reject timesheets"}`);
      }
    } catch (error) {
      console.error("Failed to bulk reject timesheets:", error);
      alert(`Failed to reject timesheets: ${error.message}`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-sm font-medium text-gray-700 mb-2">
          Dashboard / Admin / Timesheets
        </h1>
        <h1 className="text-3xl font-bold text-gray-900">
          Timesheet Management
        </h1>
        <p className="text-gray-600 mt-2">
          Review and manage coach timesheet submissions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Total Timesheets
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.total || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Eye className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Pending Review
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.pending || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.approved || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.rejected || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 lg:mb-0">
            {activeView === "coaches" ? "Coaches" : "All Timesheets"}
          </h2>
          <div className="flex space-x-4">
            <button
              onClick={handleViewToggle}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition flex items-center"
            >
              <Users className="h-4 w-4 mr-2" />
              {activeView === "coaches"
                ? "View All Timesheets"
                : "View Coaches"}
            </button>
          </div>
        </div>
      </div>

      {activeView === "coaches" ? (
        /* Coaches View */
        <div className="bg-white rounded-xl shadow-sm p-6">
          {/* Search Bar */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Coaches
            </label>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by coach name or email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Coaches Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCoaches.length > 0 ? (
              filteredCoaches.map((coach) => (
                <div
                  key={coach.id}
                  className="bg-gray-50 rounded-lg p-6 border border-gray-200 hover:border-blue-300 hover:shadow-md transition cursor-pointer"
                  onClick={() => handleCoachClick(coach.id)}
                >
                  <div className="flex items-center mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {coach.name}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">
                        {coach.timesheetCount} timesheets
                      </p>
                    </div>
                  </div>
                  <div
                    className="text-sm text-gray-600 mb-2 truncate"
                    title={coach.email}
                  >
                    {coach.email}
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Click to view timesheets</span>
                    <Eye className="h-4 w-4" />
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No coaches found</p>
                {searchTerm && (
                  <p className="text-gray-400 mt-2">
                    No coaches match your search "{searchTerm}"
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Timesheets View (your original table view) */
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  All Timesheets
                </h2>
                <p className="text-gray-600 mt-1">
                  Showing all timesheets across all coaches
                </p>
              </div>
              {/* Bulk Action Buttons */}
              {selectedTimesheets.length > 0 && (
                <div className="flex gap-3">
                  <button
                    onClick={handleBulkApprove}
                    disabled={bulkActionLoading}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold px-4 py-2 rounded-lg shadow-sm transition duration-200"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Approve All ({selectedTimesheets.length})
                  </button>
                  <button
                    onClick={() => setIsRejectModalOpen(true)}
                    disabled={bulkActionLoading}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold px-4 py-2 rounded-lg shadow-sm transition duration-200"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject All ({selectedTimesheets.length})
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={
                        timesheets.length > 0 &&
                        selectedTimesheets.length === timesheets.length
                      }
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Coach
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours & Times
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {timesheets.length > 0 ? (
                  timesheets.map((timesheet) => (
                    <tr
                      key={timesheet.id}
                      className="hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <input
                          type="checkbox"
                          checked={selectedTimesheets.includes(timesheet.id)}
                          onChange={() => handleSelectTimesheet(timesheet.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {timesheet.name || "Unknown Coach"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {timesheet.email || "No email available"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(timesheet.date).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className="text-sm text-gray-900 max-w-xs truncate"
                          title={timesheet.location}
                        >
                          {timesheet.location || "No notes"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {timesheet.totalHours || 0} hours
                        </div>
                        <div className="text-sm text-gray-500">
                          {timesheet.startTime || "N/A"} -{" "}
                          {timesheet.endTime || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className="text-sm text-gray-900 max-w-xs truncate"
                          title={timesheet.notes}
                        >
                          {timesheet.notes || "No notes"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${
                            timesheet.status === "submitted"
                              ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                              : timesheet.status === "approved"
                              ? "bg-green-100 text-green-800 border-green-200"
                              : timesheet.status === "rejected"
                              ? "bg-red-100 text-red-800 border-red-200"
                              : "bg-gray-100 text-gray-800 border-gray-200"
                          }`}
                        >
                          {timesheet.status?.charAt(0).toUpperCase() +
                            timesheet.status?.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      <div className="flex flex-col items-center">
                        <Calendar className="h-12 w-12 text-gray-300 mb-2" />
                        <p>No timesheets found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Reject Timesheets</h2>
            <p className="text-sm text-gray-600 mb-4">
              You are about to reject {selectedTimesheets.length} timesheet(s). Please provide a reason for rejection.
            </p>

            <div className="flex flex-col mb-4">
              <label className="text-sm font-medium text-gray-700 mb-1">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 min-h-[100px]"
                placeholder="Enter rejection reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectionReason("");
                }}
                disabled={bulkActionLoading}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkReject}
                disabled={bulkActionLoading || !rejectionReason.trim()}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkActionLoading ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTimesheetDashboard;
