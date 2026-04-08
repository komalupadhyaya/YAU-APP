// src/components/Invites/AdminInviteDashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  FaEnvelope,
  FaSms,
  FaLink,
  FaSpinner,
  FaCheckCircle,
  FaEye,
  FaUserPlus,
  FaDollarSign,
  FaPaperPlane,
  FaChartLine,
  FaFilter,
  FaRedo,
  FaSearch,
  FaTrophy,
  FaDownload,
  FaTrash
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import {
  getAllInvites,
  getGlobalInviteStats,
  deleteInvite,
  InviteStatus,
  InviteChannel
} from '../../services/inviteService';

const AdminInviteDashboard = ({ user }) => {
  const [invites, setInvites] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterChannel, setFilterChannel] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // Load invites and stats
  useEffect(() => {
    loadData();
  }, [filterStatus, filterChannel]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invitesResult, statsResult] = await Promise.all([
        getAllInvites({
          status: filterStatus !== 'all' ? filterStatus : undefined,
          channel: filterChannel !== 'all' ? filterChannel : undefined,
          search: searchQuery || undefined
        }),
        getGlobalInviteStats()
      ]);

      setInvites(invitesResult.invites);
      setStats(statsResult);
    } catch (error) {
      console.error('Error loading invite data:', error);
      toast.error('Failed to load invites');
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = () => {
    loadData();
  };

  // Handle delete invite
  const handleDelete = async (inviteId) => {
    if (!window.confirm('Are you sure you want to delete this invite?')) {
      return;
    }

    setDeletingId(inviteId);
    try {
      await deleteInvite(inviteId);
      toast.success('Invite deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting invite:', error);
      toast.error('Failed to delete invite');
    } finally {
      setDeletingId(null);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Invite Code',
      'Sender',
      'Sender Email',
      'Channel',
      'Status',
      'Recipient',
      'Sent At',
      'Opened At',
      'Registered At',
      'Paid At',
      'Invitee Name',
      'Invitee Email'
    ];

    const rows = invites.map(invite => [
      invite.inviteCode,
      invite.senderName,
      invite.senderEmail,
      invite.channel,
      invite.status,
      invite.recipientEmail || invite.recipientPhone || 'N/A',
      invite.sentAt,
      invite.openedAt || 'N/A',
      invite.registeredAt || 'N/A',
      invite.paidAt || 'N/A',
      invite.inviteeName || 'N/A',
      invite.inviteeEmail || 'N/A'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invites-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Export downloaded!');
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const badges = {
      [InviteStatus.SENT]: {
        icon: FaPaperPlane,
        color: 'bg-gray-100 text-gray-700',
        label: 'Sent'
      },
      [InviteStatus.OPENED]: {
        icon: FaEye,
        color: 'bg-blue-100 text-blue-700',
        label: 'Opened'
      },
      [InviteStatus.REGISTERED]: {
        icon: FaUserPlus,
        color: 'bg-purple-100 text-purple-700',
        label: 'Registered'
      },
      [InviteStatus.PAID]: {
        icon: FaDollarSign,
        color: 'bg-green-100 text-green-700',
        label: 'Paid'
      }
    };

    const badge = badges[status];
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className="text-xs" />
        {badge.label}
      </span>
    );
  };

  // Get channel badge
  const getChannelBadge = (channel) => {
    const badges = {
      [InviteChannel.EMAIL]: {
        icon: FaEnvelope,
        color: 'bg-blue-50 text-blue-600',
        label: 'Email'
      },
      [InviteChannel.SMS]: {
        icon: FaSms,
        color: 'bg-green-50 text-green-600',
        label: 'SMS'
      },
      [InviteChannel.LINK]: {
        icon: FaLink,
        color: 'bg-purple-50 text-purple-600',
        label: 'Link'
      }
    };

    const badge = badges[channel];
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${badge.color}`}>
        <Icon />
        {badge.label}
      </span>
    );
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format relative time
  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return formatDate(dateString);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Invite Analytics</h1>
          <p className="text-gray-600 mt-1">Admin view - All member invites and referrals</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <FaDownload />
          Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm font-medium">Total Sent</span>
                <FaPaperPlane className="text-gray-400" />
              </div>
              <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
              <div className="mt-2 flex flex-col gap-1 text-xs">
                <span className="text-blue-600">{stats.byChannel.email} email</span>
                <span className="text-green-600">{stats.byChannel.sms} SMS</span>
                <span className="text-purple-600">{stats.byChannel.link} link</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm font-medium">Opened</span>
                <FaEye className="text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-blue-600">{stats.opened}</p>
              <p className="text-sm text-gray-500 mt-2">
                {stats.conversionRate.openRate}% open rate
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm font-medium">Registered</span>
                <FaUserPlus className="text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-purple-600">{stats.registered}</p>
              <p className="text-sm text-gray-500 mt-2">
                {stats.conversionRate.registrationRate}% conversion
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm font-medium">Paid</span>
                <FaDollarSign className="text-green-400" />
              </div>
              <p className="text-3xl font-bold text-green-600">{stats.paid}</p>
              <p className="text-sm text-gray-500 mt-2">
                {stats.conversionRate.paymentRate}% payment rate
              </p>
            </div>

            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl shadow-md p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Top Referrer</span>
                <FaTrophy className="text-yellow-200" />
              </div>
              {stats.topReferrers.length > 0 ? (
                <>
                  <p className="text-2xl font-bold truncate">
                    {stats.topReferrers[0].senderName}
                  </p>
                  <p className="text-sm opacity-90 mt-2">
                    {stats.topReferrers[0].paidInvites} paid referrals
                  </p>
                </>
              ) : (
                <p className="text-lg">No data yet</p>
              )}
            </div>
          </div>

          {/* Top Referrers */}
          {stats.topReferrers.length > 0 && (
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FaTrophy className="text-yellow-500" />
                Top Referrers
              </h3>
              <div className="space-y-3">
                {stats.topReferrers.map((referrer, index) => (
                  <div key={referrer.senderId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? 'bg-yellow-400 text-white' :
                        index === 1 ? 'bg-gray-300 text-gray-700' :
                        index === 2 ? 'bg-orange-400 text-white' :
                        'bg-gray-200 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{referrer.senderName}</p>
                        <p className="text-sm text-gray-500">{referrer.senderEmail}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{referrer.paidInvites} paid</p>
                      <p className="text-sm text-gray-500">{referrer.totalInvites} total</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <FaFilter className="text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-md">
            <FaSearch className="text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by email, name, or code..."
              className="flex-1 px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
            >
              Search
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value={InviteStatus.SENT}>Sent</option>
              <option value={InviteStatus.OPENED}>Opened</option>
              <option value={InviteStatus.REGISTERED}>Registered</option>
              <option value={InviteStatus.PAID}>Paid</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Channel:</label>
            <select
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value={InviteChannel.EMAIL}>Email</option>
              <option value={InviteChannel.SMS}>SMS</option>
              <option value={InviteChannel.LINK}>Link</option>
            </select>
          </div>

          <button
            onClick={loadData}
            className="ml-auto px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
          >
            <FaRedo className="text-sm" />
            Refresh
          </button>
        </div>
      </div>

      {/* Invites Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            All Invites ({invites.length})
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <FaSpinner className="animate-spin text-3xl text-blue-600" />
          </div>
        ) : invites.length === 0 ? (
          <div className="text-center py-12">
            <FaChartLine className="text-5xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No invites found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sender
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recipient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Channel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invites.map((invite) => (
                  <tr key={invite.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">{invite.senderName}</div>
                        <div className="text-gray-500">{invite.senderEmail}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {invite.inviteeName ? (
                          <>
                            <div className="font-medium text-green-600">{invite.inviteeName}</div>
                            <div className="text-gray-500">{invite.inviteeEmail}</div>
                          </>
                        ) : invite.recipientEmail ? (
                          <>
                            <div className="font-medium text-gray-900">{invite.recipientName}</div>
                            <div className="text-gray-500">{invite.recipientEmail}</div>
                          </>
                        ) : invite.recipientPhone ? (
                          <>
                            <div className="font-medium text-gray-900">{invite.recipientName}</div>
                            <div className="text-gray-500">{invite.recipientPhone}</div>
                          </>
                        ) : (
                          <div className="text-gray-400">Link share</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-600">{invite.inviteCode}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getChannelBadge(invite.channel)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(invite.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatRelativeTime(invite.sentAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleDelete(invite.id)}
                        disabled={deletingId === invite.id}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                        title="Delete invite"
                      >
                        {deletingId === invite.id ? (
                          <FaSpinner className="animate-spin" />
                        ) : (
                          <FaTrash />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminInviteDashboard;
