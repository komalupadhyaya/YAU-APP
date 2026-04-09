// coach-panel/src/components/layout/CoachSidebar.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart3, Sheet, Users, Calendar, MessageSquare, BookOpen,
  LogOut, ExternalLink, X, Menu, User, ClipboardPenLine, IdCard, HandHelping, UserRound
} from 'lucide-react';
import { signOutCoach } from '../../firebase/coachAuth';

const CoachSidebar = ({
  activeSection,
  userData,
  isOpen,
  onClose,
  onSwitchToMemberView
}) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOutCoach();
      localStorage.removeItem('coachUser');
      window.location.href = '/login';
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      path: '/dashboard'
    },
    {
      id: 'timeSheet',
      label: 'Time Sheet',
      icon: Sheet,
      path: '/timeSheet'
    },
    {
      id: 'teams',
      label: 'Teams & Rosters',
      icon: Users,
      path: '/teams'
    },
    {
      id: 'my-teams-ids',
      label: `My Team ID's`,
      icon: IdCard,
      path: '/my-teams-ids'
    },
    {
      id: 'schedule',
      label: 'Schedule',
      icon: Calendar,
      path: '/schedule'
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: MessageSquare,
      path: '/messages'
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: ClipboardPenLine,
      path: '/attendance'
    },
    {
      id: 'resources',
      label: 'Resources',
      icon: BookOpen,
      path: '/resources'
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: UserRound,
      path: '/profile'
    }
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Coach Portal</h2>
            <p className="text-sm text-blue-200">
              {userData?.firstName || 'Coach'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <Link
              key={item.id}
              to={item.path}
              onClick={onClose}
              className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                  ? 'bg-white text-blue-600 shadow-lg'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
            >
              <Icon
                size={20}
                className={`flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-blue-200'
                  } group-hover:scale-110 transition-transform`}
              />
              <span className="ml-3 font-medium">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full"></div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Quick Actions */}
      <div className="p-4 border-t border-white/10">
        <div className="space-y-2">
          <button
            onClick={() => navigate('/support')}
            className="w-full flex items-center px-4 py-2 text-sm text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <MessageSquare size={16} className="mr-3" />
            Contact Support
          </button>
          <button
            onClick={onSwitchToMemberView}
            className="w-full flex items-center px-4 py-2 text-sm text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <ExternalLink size={16} className="mr-3" />
            Member Portal
          </button>

        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center px-4 py-3 text-blue-200 hover:text-white hover:bg-red-500/20 rounded-xl transition-all duration-200 group"
        >
          <LogOut size={20} className="flex-shrink-0 group-hover:scale-110 transition-transform" />
          <span className="ml-3 font-medium">Sign Out</span>
        </button>

        <div className="mt-4 pt-4 border-t border-white/10 text-center">
          <p className="text-xs text-blue-300">YAU Coach Portal</p>
          <p className="text-xs text-blue-400 mt-1">v1.0.0</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="flex flex-col flex-grow bg-gradient-to-b from-blue-600 to-blue-800 overflow-y-auto">
          <SidebarContent />
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div className={`lg:hidden fixed inset-y-0 left-0 flex w-72 flex-col transform transition-transform duration-300 ease-in-out z-50 ${isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <div className="flex flex-col flex-grow bg-gradient-to-b from-blue-600 to-blue-800 overflow-y-auto">
          <SidebarContent />
        </div>
      </div>
    </>
  );
};

export default CoachSidebar;