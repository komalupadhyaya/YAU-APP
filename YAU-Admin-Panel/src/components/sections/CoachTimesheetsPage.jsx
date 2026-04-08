import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Filter,
  Download,
  CheckCircle,
  XCircle,
  Calendar,
  MapPin,
  FileText,
  Clock,
  Edit,
  Send,
  Eye,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Banknote,
} from "lucide-react";
import { adminTimesheetApi } from "../../firebase/apis/adminTimesheetApi";
import dayjs from 'dayjs';
import utc from "dayjs/plugin/utc";
import { getCoachById } from "../../firebase/firestore";

dayjs.extend(utc);

const CoachTimesheetsPage = () => {
  const { coachId } = useParams();
  const navigate = useNavigate();
  const [timesheets, setTimesheets] = useState([]);
  const [filteredTimesheets, setFilteredTimesheets] = useState([]);
  const [coachInfo, setCoachInfo] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTimesheets, setSelectedTimesheets] = useState([]);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 0,
  });

  // Filters state
  const [filters, setFilters] = useState({
    status: "",
    startDate: "",
    endDate: "",
    search: "",
    location: "",
  });

  // Fetch coach timesheets
  useEffect(() => {
    fetchCoachTimesheets();
  }, [coachId, pagination.page, pagination.limit]);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [timesheets, filters]);

  const fetchCoachTimesheets = async () => {
    try {
      setLoading(true);
      const response = await adminTimesheetApi.getCoachTimesheets(coachId, {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      });

      // Handle the new API response structure
      const responseData = response.data || {};
      const timesheetsArray = responseData.timesheets || [];
      let coachData = responseData.coach || {};

      try {
        const fullCoachDoc = await getCoachById(coachId);
        if (fullCoachDoc) {
          coachData = { ...coachData, ...fullCoachDoc };
        }
      } catch (err) {
        console.warn("Could not fetch full coach data", err);
      }

      const summaryData = responseData.summary || {};
      const paginationData = responseData.pagination || {};

      setTimesheets(timesheetsArray);
      setCoachInfo(coachData);
      setSummary(summaryData);
      setPagination((prev) => ({
        ...prev,
        total: paginationData.total || 0,
        totalPages: paginationData.totalPages || 0,
      }));
    } catch (error) {
      console.error("Failed to fetch coach timesheets:", error);
      alert("Failed to load coach timesheets");
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats from timesheets
  const calculateStats = (timesheetsData) => {
    const submittedCount = timesheetsData.filter(
      (ts) => ts.status === "submitted"
    ).length;
    const approvedCount = timesheetsData.filter(
      (ts) => ts.status === "approved"
    ).length;
    const rejectedCount = timesheetsData.filter(
      (ts) => ts.status === "rejected"
    ).length;

    return {
      submitted: submittedCount,
      approved: approvedCount,
      rejected: rejectedCount,
    };
  };

  const applyFilters = () => {
    let filtered = timesheets;

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter((ts) => ts.status === filters.status);
    }

    // Apply location filter
    if (filters.location) {
      filtered = filtered.filter((ts) =>
        ts.location?.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    // Apply date range filter
    if (filters.startDate) {
      filtered = filtered.filter(
        (ts) => new Date(ts.date) >= new Date(filters.startDate)
      );
    }
    if (filters.endDate) {
      filtered = filtered.filter(
        (ts) => new Date(ts.date) <= new Date(filters.endDate)
      );
    }

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (ts) =>
          ts.location?.toLowerCase().includes(searchLower) ||
          ts.notes?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredTimesheets(filtered);
  };

  const handleApprove = async (timesheetId) => {
    try {
      const timesheet = timesheets.find(ts => ts.id === timesheetId);
      const hours = timesheet?.totalHours || 0;
      const rate = coachInfo?.hourlyRate || 0;
      const payout = hours * rate;

      const confirmMessage = `Approve this timesheet?\n\n` +
        `Hours: ${hours}h\n` +
        `Rate: $${rate.toFixed(2)}/hr\n` +
        `Payout: $${payout.toFixed(2)}\n\n` +
        `Do you want to proceed?`;

      if (!window.confirm(confirmMessage)) return;

      setActionLoading(timesheetId);
      await adminTimesheetApi.approveTimesheet(timesheetId);

      // Refresh data after action
      await fetchCoachTimesheets();
      alert("Timesheet approved successfully");
    } catch (error) {
      console.error("Failed to approve timesheet:", error);
      alert("Failed to approve timesheet");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (timesheetId) => {
    const reason = prompt("Please enter reason for rejection:");
    if (reason === null) return;

    try {
      setActionLoading(timesheetId);
      await adminTimesheetApi.rejectTimesheet(timesheetId, reason);

      // Refresh data after action
      await fetchCoachTimesheets();
      alert("Timesheet rejected successfully");
    } catch (error) {
      console.error("Failed to reject timesheet:", error);
      alert("Failed to reject timesheet");
    } finally {
      setActionLoading(null);
    }
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
    if (selectedTimesheets.length === filteredTimesheets.length) {
      setSelectedTimesheets([]);
    } else {
      setSelectedTimesheets(filteredTimesheets.map((ts) => ts.id));
    }
  };

  // Bulk approve handler
  const handleBulkApprove = async () => {
    if (selectedTimesheets.length === 0) {
      alert("Please select at least one timesheet");
      return;
    }

    try {
      const selectedEntries = timesheets.filter(ts => selectedTimesheets.includes(ts.id));
      const totalHours = selectedEntries.reduce((sum, entry) => sum + (entry.totalHours || 0), 0);
      const hourlyRate = coachInfo?.hourlyRate || 0;
      const totalPayout = totalHours * hourlyRate;

      const confirmMessage = `Approve ${selectedTimesheets.length} timesheet(s)?\n\n` +
        `Total Hours: ${totalHours}h\n` +
        `Hourly Rate: $${hourlyRate.toFixed(2)}/hr\n` +
        `Total Payout: $${totalPayout.toFixed(2)}\n\n` +
        `Do you want to proceed?`;

      if (!window.confirm(confirmMessage)) return;

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
        await fetchCoachTimesheets();
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
        await fetchCoachTimesheets();
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

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: "",
      startDate: "",
      endDate: "",
      search: "",
      location: "",
    });
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (newLimit) => {
    setPagination((prev) => ({ ...prev, limit: parseInt(newLimit), page: 1 }));
  };

  const handleExport = async () => {
    try {
      setActionLoading("export");
      await adminTimesheetApi.exportTimesheets({
        coachId,
        status: filters.status,
        startDate: filters.startDate,
        endDate: filters.endDate,
        location: filters.location,
      });
      alert("Export completed successfully!");
    } catch (error) {
      console.error("Failed to export timesheets:", error);
      alert(`Failed to export timesheets: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      submitted: "bg-yellow-100 text-yellow-800 border-yellow-200",
      approved: "bg-green-100 text-green-800 border-green-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium border ${statusStyles[status] || statusStyles.draft
          }`}
      >
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  const getUniqueLocations = () => {
    const locations = timesheets
      .map((ts) => ts.location)
      .filter((location) => location && location.trim() !== "");

    return [...new Set(locations)].sort();
  };

  const stats = calculateStats(timesheets);

  const openTimesheetModal = (timesheet) => {
    setSelectedTimesheet(timesheet);
    setIsModalOpen(true);
  };

  const closeTimesheetModal = () => {
    setSelectedTimesheet(null);
    setIsModalOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading timesheets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Coaches
        </button>

        <h1 className="text-sm font-medium text-gray-700 mb-2">
          Dashboard / Admin / Coaches / {coachInfo?.name || "Coach"}
        </h1>
        <h1 className="text-3xl font-bold text-gray-900">
          {coachInfo?.name || "Coach"} Timesheets
        </h1>
        <p className="text-gray-600 mt-2">
          {coachInfo?.email || "No email available"}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Total Timesheets */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Entries</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary?.totalEntries || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Total Hours */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Duration</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary?.totalHours || 0}h
              </p>
            </div>
          </div>
        </div>

        {/* Total Payout - NEW */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Banknote className="h-6 w-6 text-emerald-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Payout</p>
              <p className="text-2xl font-bold text-emerald-700">
                ${((summary?.totalHours || 0) * (coachInfo?.hourlyRate || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* Submitted */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Send className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Submitted</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.submitted || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Approved */}
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
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-2 lg:mb-0">
            Filters
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              Clear Filters
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by location, notes..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
            >
              <option value="">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                value={filters.location}
                onChange={(e) => handleFilterChange("location", e.target.value)}
              >
                <option value="">All Locations</option>
                {getUniqueLocations().map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Start Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
            />
          </div>

          {/* End Date Filter - ADD THIS */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Timesheets Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Bulk Action Buttons */}
        {selectedTimesheets.length > 0 && (
          <div className="p-4 border-b border-gray-200 flex justify-end gap-3">
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
        <div className="overflow-x-auto">
          <div className="min-w-full inline-block align-middle">
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={
                          filteredTimesheets.length > 0 &&
                          selectedTimesheets.length === filteredTimesheets.length
                        }
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Start - End
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap text-green-700">
                      Total Pay
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Notes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      View
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTimesheets.length > 0 ? (
                    filteredTimesheets.map((timesheet) => (
                      <tr
                        key={timesheet.id}
                        className="hover:bg-gray-50 transition"
                      >
                        {/* Checkbox Column */}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <input
                            type="checkbox"
                            checked={selectedTimesheets.includes(timesheet.id)}
                            onChange={() => handleSelectTimesheet(timesheet.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        {/* Date Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {/* {new Date(timesheet.date).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })} */}
                            {!timesheet?.date
                              ? " "
                              : (typeof timesheet.date === "string" && isNaN(Date.parse(timesheet.date)))
                                ? "Invalid Date"
                                : dayjs.utc(timesheet.date).isValid()
                                  ? dayjs.utc(timesheet.date).format("DD-MMM-YYYY")
                                  : "Invalid Date"
                            }

                          </div>
                        </td>

                        {/* Location Column */}
                        <td className="px-6 py-4">
                          <div className="relative group">
                            <div
                              className="text-sm text-gray-900 max-w-xs truncate cursor-help"
                              title={timesheet.location || "No location"}
                            >
                              {timesheet.location || "No location"}
                            </div>
                            {/* Tooltip */}
                            {timesheet.location && timesheet.location.length > 50 && (
                              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10">
                                <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 max-w-xs break-words whitespace-normal">
                                  {timesheet.location}
                                  <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-900"></div>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Start Time Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {timesheet.startTime || "N/A"} - {timesheet.endTime || "N/A"}
                          </div>
                        </td>

                        {/* Total Hours Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {timesheet.totalHours || 0} hours
                          </div>
                        </td>

                        {/* Rate Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            ${(coachInfo?.hourlyRate || 0).toFixed(2)}/hr
                          </div>
                        </td>

                        {/* Total Pay Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-green-700">
                            ${((timesheet.totalHours || 0) * (coachInfo?.hourlyRate || 0)).toFixed(2)}
                          </div>
                        </td>

                        {/* Notes Column with Tooltip */}
                        <td className="px-6 py-4">
                          <div className="relative group">
                            <div
                              className="text-sm text-gray-900 max-w-xs truncate cursor-help"
                              title={timesheet.notes || "No notes"}
                            >
                              {timesheet.notes || "No notes"}
                            </div>
                            {/* Tooltip */}
                            {timesheet.notes && timesheet.notes.length > 50 && (
                              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10">
                                <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 max-w-xs break-words whitespace-normal">
                                  {timesheet.notes}
                                  <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-900"></div>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Status Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(timesheet.status)}
                        </td>

                        {/* View Column */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => openTimesheetModal(timesheet)}
                            className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="text-sm">View</span>
                          </button>
                        </td>

                        {/* Actions Column */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {timesheet.status === "submitted" && (
                              <>
                                <button
                                  onClick={() => handleApprove(timesheet.id)}
                                  disabled={actionLoading === timesheet.id}
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50 flex items-center whitespace-nowrap"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(timesheet.id)}
                                  disabled={actionLoading === timesheet.id}
                                  className="text-red-600 hover:text-red-900 disabled:opacity-50 flex items-center whitespace-nowrap"
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </button>
                              </>
                            )}
                            {(timesheet.status === "approved" ||
                              timesheet.status === "rejected") && (
                                <span className="text-gray-500 text-xs whitespace-nowrap">
                                  Action completed
                                </span>
                              )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="9"
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        <div className="flex flex-col items-center">
                          <Filter className="h-12 w-12 text-gray-300 mb-2" />
                          <p>No timesheets found matching your filters</p>
                          <button
                            onClick={clearFilters}
                            className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Clear filters to see all timesheets
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Pagination */}
        {pagination.totalPages >= 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
              {/* Page Info */}
              <div className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-medium">
                  {(pagination.page - 1) * pagination.limit + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total
                  )}
                </span>{" "}
                of <span className="font-medium">{pagination.total}</span>{" "}
                results
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center space-x-2">
                {/* Rows per page */}
                <select
                  value={pagination.limit}
                  onChange={(e) => handleLimitChange(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="5">5 per page</option>
                  <option value="10">10 per page</option>
                  <option value="25">25 per page</option>
                  <option value="50">50 per page</option>
                </select>

                {/* Previous Button */}
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="p-2 rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {/* Page Numbers */}
                <div className="flex space-x-1">
                  {Array.from(
                    { length: Math.min(5, pagination.totalPages) },
                    (_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1 text-sm rounded-md border ${pagination.page === pageNum
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                  )}
                </div>

                {/* Next Button */}
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="p-2 rounded-md border border-gray-300 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Timesheet Detail Modal */}
      {isModalOpen && selectedTimesheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl relative">
            <div className="flex items-start justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Timesheet Details
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Review the submitted entry information.
                </p>
              </div>
              <button
                onClick={closeTimesheetModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(selectedTimesheet.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Start - End</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedTimesheet.startTime || "N/A"} -{" "}
                      {selectedTimesheet.endTime || "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Total Duration</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedTimesheet.totalHours || 0} hours
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedTimesheet.location || "No location provided"}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Hourly Rate</p>
                      <p className="text-sm font-medium text-gray-900">
                        ${(coachInfo?.hourlyRate || 0).toFixed(2)}/hr
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Banknote className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-xs text-green-500">Calculated Payout</p>
                      <p className="text-sm font-medium text-green-700">
                        ${((selectedTimesheet.totalHours || 0) * (coachInfo?.hourlyRate || 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  {getStatusBadge(selectedTimesheet.status)}
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Notes</p>
                  <p className="text-sm text-gray-900 whitespace-pre-line border rounded-md p-3 bg-gray-50">
                    {selectedTimesheet.notes || "No notes provided"}
                  </p>
                </div>
                {selectedTimesheet.status !== "submitted" &&
                  selectedTimesheet.rejectionReason && (
                    <div>
                      <p className="text-xs text-red-500 mb-1">Rejection Reason</p>
                      <p className="text-sm text-red-700 whitespace-pre-line border rounded-md p-3 bg-red-50">
                        {selectedTimesheet.rejectionReason}
                      </p>
                    </div>
                  )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
              <button
                onClick={closeTimesheetModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition"
              >
                Close
              </button>
            </div>
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

export default CoachTimesheetsPage;
