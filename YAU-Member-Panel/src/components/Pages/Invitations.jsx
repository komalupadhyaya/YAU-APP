// src/components/Pages/Invitations.jsx
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import MemberInviteDashboard from '../Invites/MemberInviteDashboard';
import AdminInviteDashboard from '../Invites/AdminInviteDashboard';

const Invitations = () => {
  const { user } = useAuth();

  // Check if user is admin
  // Adjust this check based on your admin role logic
  const isAdmin = user?.isAdmin === true || user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      Comming Soon.......
      <div className="hidden max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {isAdmin ? (
          <AdminInviteDashboard user={user} />
        ) : (
          <MemberInviteDashboard user={user} />
        )}
      </div>
    </div>
  );
};

export default Invitations;
