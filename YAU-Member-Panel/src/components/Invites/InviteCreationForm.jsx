// src/components/Invites/InviteCreationForm.jsx
import React, { useState } from 'react';
import { FaEnvelope, FaSms, FaLink, FaSpinner, FaCheck, FaTimes, FaCopy, FaInfoCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';
import {
  sendEmailInvite,
  sendSMSInvite,
  createInvite,
  checkEmailRateLimit,
  InviteChannel,
  generateTrackingUrl
} from '../../services/inviteService';

const InviteCreationForm = ({ user, onInviteCreated }) => {
  const [activeTab, setActiveTab] = useState('email'); // 'email', 'sms', 'link'
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState(null);

  // Form states
  const [emailForm, setEmailForm] = useState({
    recipientEmail: '',
    recipientName: '',
    message: ''
  });

  const [smsForm, setSmsForm] = useState({
    recipientPhone: '',
    recipientName: '',
    message: ''
  });

  const [errors, setErrors] = useState({});

  // Validate email
  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Validate phone
  const validatePhone = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10 || cleaned.length === 11;
  };

  // Format phone number
  const formatPhone = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  // Handle email invite submission
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!emailForm.recipientEmail) {
      newErrors.recipientEmail = 'Email is required';
    } else if (!validateEmail(emailForm.recipientEmail)) {
      newErrors.recipientEmail = 'Invalid email address';
    }

    if (!emailForm.recipientName) {
      newErrors.recipientName = 'Name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      // Check rate limit
      const rateLimitCheck = await checkEmailRateLimit(user.uid);
      if (!rateLimitCheck.allowed) {
        toast.error(`Daily email limit reached. You can send ${rateLimitCheck.remaining} more invites tomorrow.`);
        setLoading(false);
        return;
      }

      // Send email invite
      const result = await sendEmailInvite({
        senderId: user.uid,
        senderName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        senderEmail: user.email,
        recipientEmail: emailForm.recipientEmail,
        recipientName: emailForm.recipientName,
        message: emailForm.message
      });

      if (result.success) {
        toast.success(`Invite sent to ${emailForm.recipientEmail}!`);
        setEmailForm({ recipientEmail: '', recipientName: '', message: '' });
        setErrors({});
        onInviteCreated && onInviteCreated(result.invite);
      }
    } catch (error) {
      console.error('Error sending email invite:', error);
      toast.error('Failed to send invite. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle SMS invite submission
  const handleSMSSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!smsForm.recipientPhone) {
      newErrors.recipientPhone = 'Phone number is required';
    } else if (!validatePhone(smsForm.recipientPhone)) {
      newErrors.recipientPhone = 'Invalid phone number';
    }

    if (!smsForm.recipientName) {
      newErrors.recipientName = 'Name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      // Send SMS invite
      const result = await sendSMSInvite({
        senderId: user.uid,
        senderName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        senderEmail: user.email,
        recipientPhone: smsForm.recipientPhone,
        recipientName: smsForm.recipientName,
        message: smsForm.message
      });

      if (result.success) {
        toast.success(`Invite sent to ${smsForm.recipientPhone}!`);
        setSmsForm({ recipientPhone: '', recipientName: '', message: '' });
        setErrors({});
        onInviteCreated && onInviteCreated(result.invite);
      }
    } catch (error) {
      console.error('Error sending SMS invite:', error);
      toast.error('Failed to send invite. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle link generation
  const handleGenerateLink = async () => {
    setLoading(true);
    try {
      const invite = await createInvite({
        senderId: user.uid,
        senderName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        senderEmail: user.email,
        source: InviteChannel.LINK,
        channel: InviteChannel.LINK
      });

      setGeneratedLink(invite);
      toast.success('Referral link generated!');
      onInviteCreated && onInviteCreated(invite);
    } catch (error) {
      console.error('Error generating link:', error);
      toast.error('Failed to generate link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Copy link to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <h2 className="text-2xl font-bold mb-2">Send Invites</h2>
        <p className="text-blue-100">Invite friends and family to join YAU</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('email')}
          className={`flex-1 px-6 py-4 font-medium transition-colors ${
            activeTab === 'email'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <FaEnvelope />
            <span>Email</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('sms')}
          className={`flex-1 px-6 py-4 font-medium transition-colors ${
            activeTab === 'sms'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <FaSms />
            <span>SMS</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('link')}
          className={`flex-1 px-6 py-4 font-medium transition-colors ${
            activeTab === 'link'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <FaLink />
            <span>Share Link</span>
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Email Form */}
        {activeTab === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <FaInfoCircle className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Email Rate Limit</p>
                  <p>You can send up to 50 email invites per day. All emails include our compliance footer.</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Email *
              </label>
              <input
                type="email"
                value={emailForm.recipientEmail}
                onChange={(e) => {
                  setEmailForm({ ...emailForm, recipientEmail: e.target.value });
                  setErrors({ ...errors, recipientEmail: null });
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.recipientEmail ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="friend@example.com"
              />
              {errors.recipientEmail && (
                <p className="text-red-600 text-sm mt-1">{errors.recipientEmail}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Name *
              </label>
              <input
                type="text"
                value={emailForm.recipientName}
                onChange={(e) => {
                  setEmailForm({ ...emailForm, recipientName: e.target.value });
                  setErrors({ ...errors, recipientName: null });
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.recipientName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="John Doe"
              />
              {errors.recipientName && (
                <p className="text-red-600 text-sm mt-1">{errors.recipientName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Personal Message (Optional)
              </label>
              <textarea
                value={emailForm.message}
                onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
                placeholder="Add a personal message to your invite..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <FaSpinner className="animate-spin" />
                  Sending...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <FaEnvelope />
                  Send Email Invite
                </div>
              )}
            </button>
          </form>
        )}

        {/* SMS Form */}
        {activeTab === 'sms' && (
          <form onSubmit={handleSMSSubmit} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <FaInfoCircle className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">SMS Invites</p>
                  <p>Send a text message with your referral link. Standard messaging rates may apply.</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Phone *
              </label>
              <input
                type="tel"
                value={smsForm.recipientPhone}
                onChange={(e) => {
                  setSmsForm({ ...smsForm, recipientPhone: formatPhone(e.target.value) });
                  setErrors({ ...errors, recipientPhone: null });
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.recipientPhone ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="(555) 123-4567"
                maxLength="14"
              />
              {errors.recipientPhone && (
                <p className="text-red-600 text-sm mt-1">{errors.recipientPhone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Name *
              </label>
              <input
                type="text"
                value={smsForm.recipientName}
                onChange={(e) => {
                  setSmsForm({ ...smsForm, recipientName: e.target.value });
                  setErrors({ ...errors, recipientName: null });
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.recipientName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="John Doe"
              />
              {errors.recipientName && (
                <p className="text-red-600 text-sm mt-1">{errors.recipientName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Personal Message (Optional)
              </label>
              <textarea
                value={smsForm.message}
                onChange={(e) => setSmsForm({ ...smsForm, message: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="3"
                placeholder="Add a personal message to your invite..."
                maxLength="160"
              />
              <p className="text-xs text-gray-500 mt-1">
                {smsForm.message.length}/160 characters
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <FaSpinner className="animate-spin" />
                  Sending...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <FaSms />
                  Send SMS Invite
                </div>
              )}
            </button>
          </form>
        )}

        {/* Link Generation */}
        {activeTab === 'link' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <FaInfoCircle className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Shareable Link</p>
                  <p>Generate a unique referral link you can share anywhere - social media, messaging apps, or in person.</p>
                </div>
              </div>
            </div>

            {!generatedLink ? (
              <button
                onClick={handleGenerateLink}
                disabled={loading}
                className={`w-full py-4 px-6 rounded-lg font-semibold transition-all ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <FaSpinner className="animate-spin" />
                    Generating...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <FaLink />
                    Generate Referral Link
                  </div>
                )}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FaCheck className="text-green-600" />
                    <span className="font-medium text-green-800">Link Generated!</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Your unique referral link is ready to share.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Referral Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={generatedLink.inviteCode}
                      readOnly
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono"
                    />
                    <button
                      onClick={() => copyToClipboard(generatedLink.inviteCode)}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                    >
                      <FaCopy />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Referral Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={generatedLink.trackingUrl}
                      readOnly
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(generatedLink.trackingUrl)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <FaCopy />
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setGeneratedLink(null)}
                  className="w-full py-3 px-6 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                >
                  Generate New Link
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InviteCreationForm;
