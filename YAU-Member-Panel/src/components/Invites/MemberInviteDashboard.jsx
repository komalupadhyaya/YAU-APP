// src/components/Invites/MemberInviteDashboard.jsx
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
  FaRedo
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import {
  getUserInvites,
  getUserInviteStats,
  resendInvite,
  InviteStatus,
  InviteChannel
} from '../../services/inviteService';
import InviteCreationForm from './InviteCreationForm';

const MemberInviteDashboard = ({ user }) => {
  const [invites, setInvites] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterChannel, setFilterChannel] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [resendingId, setResendingId] = useState(null);

  // Load invites and stats
  useEffect(() => {
    loadData();
  }, [user, filterStatus, filterChannel]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invitesResult, statsResult] = await Promise.all([
        getUserInvites(user.uid, {
          status: filterStatus !== 'all' ? filterStatus : undefined,
          channel: filterChannel !== 'all' ? filterChannel : undefined
        }),
        getUserInviteStats(user.uid)
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

  // Handle resend invite
  const handleResend = async (inviteId) => {
    setResendingId(inviteId);
    try {
      await resendInvite(inviteId);
      toast.success('Invite resent successfully!');
      loadData();
    } catch (error) {
      console.error('Error resending invite:', error);
      toast.error('Failed to resend invite');
    } finally {
      setResendingId(null);
    }
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
      [InviteStatus.JOINED]: {
        icon: FaDollarSign,
        color: 'bg-green-100 text-green-700',
        label: 'Joined'
      },
      // Keep backward compatibility
      [InviteStatus.REGISTERED]: {
        icon: FaUserPlus,
        color: 'bg-purple-100 text-purple-700',
        label: 'Joined'
      },
      [InviteStatus.PAID]: {
        icon: FaDollarSign,
        color: 'bg-green-100 text-green-700',
        label: 'Joined'
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

  if (showCreateForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800">Send Invite</h1>
          <button
            onClick={() => setShowCreateForm(false)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>
        <InviteCreationForm
          user={user}
          onInviteCreated={() => {
            setShowCreateForm(false);
            loadData();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">My Invites</h1>
          <p className="text-gray-600 mt-1">Track and manage your referrals</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          + Send Invite
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600 text-sm font-medium">Total Sent</span>
              <FaPaperPlane className="text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
            <div className="mt-2 flex gap-2 text-xs">
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
              <span className="text-gray-600 text-sm font-medium">Joined</span>
              <FaDollarSign className="text-green-400" />
            </div>
            <p className="text-3xl font-bold text-green-600">{stats.joined || stats.registered || stats.paid}</p>
            <p className="text-sm text-gray-500 mt-2">
              {stats.conversionRate.joinRate || stats.conversionRate.registrationRate}% conversion
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <FaFilter className="text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
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
              <option value={InviteStatus.JOINED}>Joined</option>
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

      {/* Invites List */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">
            Invite History ({invites.length})
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <FaSpinner className="animate-spin text-3xl text-blue-600" />
          </div>
        ) : invites.length === 0 ? (
          <div className="text-center py-12">
            <FaChartLine className="text-5xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No invites found</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              Send Your First Invite
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {invites.map((invite) => (
              <div key={invite.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getChannelBadge(invite.channel)}
                      {getStatusBadge(invite.status)}
                    </div>

                    <div className="space-y-1">
                      {invite.recipientEmail && (
                        <p className="text-gray-800 font-medium">
                          {invite.recipientName || invite.recipientEmail}
                        </p>
                      )}
                      {invite.recipientPhone && (
                        <p className="text-gray-800 font-medium">
                          {invite.recipientName || invite.recipientPhone}
                        </p>
                      )}
                      {invite.channel === InviteChannel.LINK && !invite.recipientEmail && !invite.recipientPhone && (
                        <p className="text-gray-800 font-medium">
                          Shareable Link
                        </p>
                      )}

                      <p className="text-sm text-gray-500">
                        Code: <span className="font-mono font-medium">{invite.inviteCode}</span>
                      </p>

                      <p className="text-xs text-gray-400">
                        Sent {formatRelativeTime(invite.sentAt)}
                      </p>
                    </div>

                    {/* Timeline */}
                    <div className="mt-4 flex items-center gap-2 text-xs">
                      <div className={`flex items-center gap-1 ${invite.sentAt ? 'text-green-600' : 'text-gray-400'}`}>
                        <FaCheckCircle />
                        <span>Sent</span>
                      </div>
                      <div className="w-12 h-px bg-gray-300"></div>
                      <div className={`flex items-center gap-1 ${invite.openedAt ? 'text-green-600' : 'text-gray-400'}`}>
                        <FaCheckCircle />
                        <span>Opened</span>
                      </div>
                      <div className="w-12 h-px bg-gray-300"></div>
                      <div className={`flex items-center gap-1 ${invite.joinedAt || invite.registeredAt || invite.paidAt ? 'text-green-600' : 'text-gray-400'}`}>
                        <FaCheckCircle />
                        <span>Joined</span>
                      </div>
                    </div>

                    {invite.inviteeName && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800">
                          <strong>{invite.inviteeName}</strong> joined using your referral!
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="ml-4">
                    {invite.status === InviteStatus.SENT && invite.channel !== InviteChannel.LINK && (
                      <button
                        onClick={() => handleResend(invite.id)}
                        disabled={resendingId === invite.id}
                        className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {resendingId === invite.id ? (
                          <FaSpinner className="animate-spin" />
                        ) : (
                          'Resend'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberInviteDashboard;
