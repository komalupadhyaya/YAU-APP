import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getCurrentUserData } from '../../firebase/apis/api-members';
import { QRCodeCanvas } from 'qrcode.react';
import { Copy, Mail, MessageSquare, Share2, Download, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { createInvite, InviteChannel } from '../../services/inviteService';

const referralsData = [
  {
    id: 1,
    name: "Alex G.",
    channel: "Link",
    status: "Sent",
    teamSport: "10U Soccer",
    sentDate: "2023-07-29",
    lastActivity: "2023-07-29",
  },
  {
    id: 2,
    name: "Maya R.",
    channel: "Email",
    status: "Opened",
    teamSport: "8U Flag Football",
    sentDate: "2023-08-14",
    lastActivity: "2023-08-14",
  },
  {
    id: 3,
    name: "Claire S.",
    channel: "Link",
    status: "Sent",
    teamSport: "3rend",
    sentDate: "2023-08-01",
    lastActivity: "",
  },
];

const Community = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [referrals, setReferrals] = useState(referralsData);
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [creatingReferralLink, setCreatingReferralLink] = useState(false);
  const qrRef = useRef(null);

  // Default share message
  const defaultMessage = "Join me at YAU! It's an amazing youth athletics program. Use my referral link to get started:";

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const currentUserData = await getCurrentUserData(user.email);
        setUserData(currentUserData);
        setShareMessage(defaultMessage);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setLoading(false);
      }
    };

    if (user?.email) {
      fetchUserData();
    }
  }, [user]);

  // Generate referral link
  const getReferralLink = () => {
    if (userData?.referralCode) {
      const baseUrl = window.location.origin; // Use current origin (localhost in dev, production in prod)
      return `${baseUrl}/join?ref=${userData.referralCode}`;
    }
    return null;
  };

  const inviteLink = getReferralLink();

  // Copy to clipboard
  const handleCopyLink = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  // SMS share
  const handleSMSShare = () => {
    if (!inviteLink) return;

    const smsText = `${shareMessage}\n\n${inviteLink}`;
    const smsUrl = `sms:?&body=${encodeURIComponent(smsText)}`;
    window.location.href = smsUrl;
  };

  // Email share
  const handleEmailShare = () => {
    if (!inviteLink) return;

    const subject = 'Join me at YAU!';
    const body = `${shareMessage}\n\n${inviteLink}\n\nLooking forward to seeing you there!`;
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  // Web Share API
  const handleWebShare = async () => {
    if (!inviteLink) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me at YAU!',
          text: shareMessage,
          url: inviteLink,
        });
        toast.success('Shared successfully!');
      } catch (error) {
        if (error.name !== 'AbortError') {
          toast.error('Failed to share');
        }
      }
    } else {
      toast.error('Sharing is not supported on this device');
    }
  };

  // Download QR code
  const handleDownloadQR = () => {
    if (!qrRef.current) return;

    try {
      const canvas = qrRef.current.querySelector('canvas');
      if (!canvas) return;

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'yau-referral-qr.png';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('QR code downloaded!');
      });
    } catch (error) {
      toast.error('Failed to download QR code');
    }
  };

  // Create referral link
  const handleCreateReferralLink = async () => {
    if (!user || !userData) {
      toast.error('User data not available');
      return;
    }

    setCreatingReferralLink(true);

    try {
      // Create a referral link using the backend API
      const result = await createInvite({
        senderId: user.uid,
        senderName: userData.firstName && userData.lastName
          ? `${userData.firstName} ${userData.lastName}`
          : userData.displayName || user.displayName || 'YAU Member',
        senderEmail: user.email,
        source: InviteChannel.LINK,
        channel: InviteChannel.LINK
      });

      // Update userData with the new referral code
      const updatedUserData = {
        ...userData,
        referralCode: result.inviteCode
      };

      setUserData(updatedUserData);
      toast.success('Referral link created successfully!');
    } catch (error) {
      console.error('Error creating referral link:', error);
      toast.error('Failed to create referral link. Please try again.');
    } finally {
      setCreatingReferralLink(false);
    }
  };

  // Filter referrals
  const filteredReferrals = referrals.filter((r) => {
    const statusMatch = filterStatus === "All" || r.status === filterStatus;
    const searchMatch =
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.channel.toLowerCase().includes(searchTerm.toLowerCase());
    return statusMatch && searchMatch;
  });

  const totalSent = referrals.length;
  const totalOpened = referrals.filter((r) => r.status === "Opened").length;

  const exportCSV = () => {
    const header = [
      "Name",
      "Channel",
      "Status",
      "Team/Sport",
      "Sent Date",
      "Last Activity",
    ];
    const rows = referrals.map((r) => [
      r.name,
      r.channel,
      r.status,
      r.teamSport,
      r.sentDate,
      r.lastActivity || "-",
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [header, ...rows].map((e) => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.href = encodedUri;
    link.download = "referrals.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto font-sans p-5 bg-gray-100 rounded-lg shadow-md">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h2 className="text-2xl font-semibold">Invite Families to YAU</h2>
          <p className="text-gray-600 mt-2">
            It's fast, friendly, and helps your team grow!
          </p>
        </div>
        <button
          onClick={() => navigate('/invitations')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition whitespace-nowrap"
        >
          <Mail className="w-4 h-4" />
          My Invites
        </button>
      </div>
      <div className="mb-6"></div>

      {inviteLink ? (
        <>
          {/* Invite Link Section */}
          <div className="bg-white p-5 rounded-lg shadow-sm mb-6">
            <div className="mb-5">
              <label htmlFor="inviteLink" className="font-semibold text-lg block mb-2">
                Your Invite Link
              </label>
              <div className="flex gap-2 items-center mb-4">
                <input
                  id="inviteLink"
                  type="text"
                  readOnly
                  value={inviteLink}
                  onClick={(e) => e.target.select()}
                  className="flex-grow p-3 text-base border border-gray-300 rounded select-all font-mono"
                />
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition whitespace-nowrap"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </>
                  )}
                </button>
              </div>

              {/* Share Actions */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <button
                  onClick={handleSMSShare}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition"
                >
                  <MessageSquare className="w-5 h-5" />
                  SMS
                </button>

                <button
                  onClick={handleEmailShare}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded font-semibold transition"
                >
                  <Mail className="w-5 h-5" />
                  Email
                </button>

                {navigator.share && (
                  <button
                    onClick={handleWebShare}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded font-semibold transition"
                  >
                    <Share2 className="w-5 h-5" />
                    Share
                  </button>
                )}

                <button
                  onClick={handleDownloadQR}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded font-semibold transition"
                >
                  <Download className="w-5 h-5" />
                  QR Code
                </button>
              </div>

              {/* Editable Message */}
              <div>
                <label className="font-semibold block mb-2">
                  Customize Your Message
                </label>
                <textarea
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  rows={3}
                  maxLength="200"
                  placeholder="Add a personal note (optional)..."
                  className="w-full p-3 text-base border border-gray-300 rounded resize-y"
                />
                <div className="flex justify-between items-center mt-2">
                  <small className="text-gray-500">
                    {shareMessage.length}/200 characters
                  </small>
                  <button
                    onClick={() => setShareMessage(defaultMessage)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Reset to Default
                  </button>
                </div>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="flex flex-col md:flex-row gap-5 items-start">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">Message Preview</h3>
                <div className="p-4 border border-gray-300 rounded min-h-[100px] whitespace-pre-wrap text-sm bg-gray-50">
                  {shareMessage}
                  {"\n\n"}
                  {inviteLink}
                </div>
              </div>

              <div ref={qrRef} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 text-center">
                <QRCodeCanvas
                  value={inviteLink}
                  size={140}
                  level="H"
                  includeMargin={true}
                />
                <p className="mt-2 text-sm text-gray-600">Scan to join</p>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-5 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">How It Works</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                <span className="font-semibold">📱 SMS:</span> Opens your texting app with a pre-filled message. Just select a contact and send!
              </p>
              <p>
                <span className="font-semibold">✉️ Email:</span> Opens your email app with a pre-filled subject and message. Add recipients and send!
              </p>
              {navigator.share && (
                <p>
                  <span className="font-semibold">🔗 Share:</span> Uses your device's native sharing options to send the link via any app you choose.
                </p>
              )}
              <p>
                <span className="font-semibold">📲 QR Code:</span> Download and share the QR code image. Anyone can scan it to access your referral link!
              </p>
            </div>
          </div>

          {/* Referrals List & Filters */}
          <div className="bg-white p-5 rounded-lg shadow-sm mb-6">
            <h3 className="text-xl font-semibold mb-4">Your Referrals</h3>
            <div className="flex flex-wrap justify-between gap-3 mb-4">
              <div>
                <label htmlFor="filterStatus" className="font-semibold">
                  Filter by Status:
                </label>
                <select
                  id="filterStatus"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="ml-2 p-1 text-sm border border-gray-300 rounded"
                >
                  <option>All</option>
                  <option>Sent</option>
                  <option>Opened</option>
                </select>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Search name/email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="p-1 text-sm border border-gray-300 rounded w-56"
                />
              </div>

              <button
                onClick={exportCSV}
                className="bg-blue-600 text-white py-2 px-4 rounded font-semibold hover:bg-blue-700 transition"
              >
                Export CSV
              </button>
            </div>

            {/* Summary */}
            <p className="font-semibold mb-3">
              Total Sent: {totalSent} | Opened: {totalOpened}
            </p>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-200 text-left">
                    <th className="py-2 px-3">Name/Email</th>
                    <th className="py-2 px-3">Channel</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Team/Sport</th>
                    <th className="py-2 px-3">Sent Date</th>
                    <th className="py-2 px-3">Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReferrals.length ? (
                    filteredReferrals.map((ref) => (
                      <tr
                        key={ref.id}
                        className="border-b border-gray-300 even:bg-gray-50"
                      >
                        <td className="py-2 px-3">{ref.name}</td>
                        <td className="py-2 px-3">{ref.channel}</td>
                        <td
                          className={`py-2 px-3 font-semibold ${
                            ref.status === "Opened"
                              ? "text-orange-500"
                              : "text-green-600"
                          }`}
                        >
                          {ref.status}
                        </td>
                        <td className="py-2 px-3">{ref.teamSport}</td>
                        <td className="py-2 px-3">{ref.sentDate}</td>
                        <td className="py-2 px-3">{ref.lastActivity || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-gray-400 italic"
                      >
                        No referrals found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        // No Referral Code State
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-8 text-center mb-6">
          <div className="max-w-md mx-auto">
            <div className="text-5xl mb-4">🔗</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Create Your Referral Link
            </h2>
            <p className="text-gray-600 mb-6">
              You don't have a referral link yet. Click the button below to create your personal referral link and start inviting friends!
            </p>
            <button
              onClick={handleCreateReferralLink}
              disabled={creatingReferralLink}
              className={`px-6 py-3 rounded-lg font-semibold text-white transition ${
                creatingReferralLink
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {creatingReferralLink ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </span>
              ) : (
                'Create Referral Link'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Community;
