// components/Messages/GroupInfoModal.js
import React from 'react';
import Modal from '../common/Model';

const GroupInfoModal = ({ isOpen, onClose, groupChat }) => {
  if (!groupChat) return null;

  const formatDate = (date) => {
    try {
      if (!date) return 'Unknown';
      
      // Handle different date formats
      let dateObj;
      if (date instanceof Date) {
        dateObj = date;
      } else if (typeof date === 'string') {
        dateObj = new Date(date);
      } else if (date.toDate && typeof date.toDate === 'function') {
        // Firestore Timestamp
        dateObj = date.toDate();
      } else if (date.seconds) {
        // Firestore Timestamp object
        dateObj = new Date(date.seconds * 1000);
      } else {
        dateObj = new Date(date);
      }

      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
      }

      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Unknown';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Group Information">
      <div className="space-y-4">
        {/* Group Name */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {groupChat.name}
          </h3>
        </div>

        {/* Group Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Sport</label>
            <p className="mt-1 text-sm text-gray-900">{groupChat.sport || 'Not specified'}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Age Group</label>
            <p className="mt-1 text-sm text-gray-900">{groupChat.ageGroup || 'Not specified'}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Location</label>
            <p className="mt-1 text-sm text-gray-900">{groupChat.location || 'Not specified'}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Members</label>
            <p className="mt-1 text-sm text-gray-900">{groupChat.memberCount || 0} members</p>
          </div>
        </div>

        {/* Coach Information */}
        {groupChat.hasAssignedCoach && groupChat.coachName && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Coach</label>
            <p className="mt-1 text-sm text-gray-900">{groupChat.coachName}</p>
          </div>
        )}

        {/* User Role */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Your Role</label>
          <p className="mt-1 text-sm text-gray-900 capitalize">
            {groupChat.userRole || 'Member'}
            {groupChat.userRole === 'coach' && (
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                Coach
              </span>
            )}
          </p>
        </div>

        {/* Timestamps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Created</label>
            <p className="mt-1 text-sm text-gray-900">{formatDate(groupChat.createdAt)}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Last Activity</label>
            <p className="mt-1 text-sm text-gray-900">{formatDate(groupChat.lastActivity)}</p>
          </div>
        </div>

        {/* Group ID for debugging */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Group ID</label>
          <p className="mt-1 text-xs text-gray-500 font-mono break-all">{groupChat.id}</p>
        </div>
      </div>
    </Modal>
  );
};

export default GroupInfoModal;