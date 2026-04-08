// components/layout/Sidebar.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Users,
  UserCheck,
  Clipboard,
  MessageCircle,
  Menu,
  X,
  LogOut,
  User,
  LocateIcon,
  Trophy,
  Calendar,
  Group,
  CreditCard,
  CalendarRange,
  Sheet,
  Key,
  School,
} from 'lucide-react';

// Import Material-UI admin icons
import {
  AdminPanelSettings,
  SupervisorAccount,
  ManageAccounts,
  Security,
  Shield,
  VerifiedUser,
  AccountBox,
  Settings,
   
} from '@mui/icons-material';

import { useAuth } from '../../context/AuthContext';
import { getYear } from 'date-fns';

// Create a wrapper component for MUI icons to match Lucide styling
const MuiIcon = ({ children, size = 18 }) => (
  <span style={{ 
    fontSize: size, 
    display: 'inline-flex', 
    alignItems: 'center',
    width: size,
    height: size 
  }}>
    {children}
  </span>
);

const Sidebar = ({ activeSection }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: BarChart3, 
      path: '/admin/dashboard' 
    },
    { 
      id: 'timesheet', 
      label: 'Time Sheet', 
      icon: Sheet, 
      path: '/admin/timeSheet' 
    },
    { 
      id: 'coach-assignments', 
      label: 'Coach Assignments', 
      icon: UserCheck, 
      path: '/admin/coach-assignments' 
    },
    { 
      id: 'admins', 
      label: 'Admin Management', 
      icon: ({ size }) => (
        <MuiIcon size={size}>
          <AdminPanelSettings sx={{ fontSize: size }} />
        </MuiIcon>
      ), 
      path: '/admin/admin-management',
      // description: 'Manage system administrators'
    },
    // { 
    //   id: 'parents', 
    //   label: 'Parents', 
    //   icon: Users, 
    //   path: '/admin/parents' 
    // },
    { 
      id: 'members', 
      label: 'Members', 
      icon: CreditCard, 
      path: '/admin/members' 
    },
    { 
      id: 'id_management', 
      label: 'ID Management', 
      icon: AccountBox, 
      path: '/admin/id-management' 
    },
    { 
      id: 'resources', 
      label: 'Resources', 
      icon: Settings , 
      path: '/admin/resources' 
    },
    { 
      id: 'uniform-management', 
      label: 'Uniform Management', 
      icon: ManageAccounts , 
      path: '/admin/uniform-management' 
    },
    { 
      id: 'schools-pickup', 
      label: 'School Pickup', 
      icon: School, 
      path: '/admin/schools-pickup' 
    },
    { 
      id: 'coaches', 
      label: 'Coaches', 
      icon: UserCheck, 
      path: '/admin/coaches' 
    },
{ 
      id: 'rosters', 
      label: 'Rosters', 
      icon: Clipboard, 
      path: '/admin/rosters' 
    },
    { 
      id: 'coach-assignments', 
      label: 'Coach Assignments', 
      icon: UserCheck, 
      path: '/admin/coach-assignments' 
    },
    { 
      id: 'messages', 
      label: 'Messages', 
      icon: MessageCircle, 
      path: '/admin/messages' 
    },
    { 
      id: 'locations', 
      label: 'Locations', 
      icon: LocateIcon, 
      path: '/admin/locations' 
    },
    { 
      id: 'events', 
      label: 'Events', 
      icon: Trophy, 
      path: '/admin/events' 
    },
    { 
      id: 'external_schedules', 
      label: 'Team Management', 
      icon: CalendarRange, 
      path: '/admin/external_schedules' 
    },
    {
      id: 'schedule',
      icon: Calendar,
      label: 'Game Schedule',
      path: '/admin/schedule',
    },
    { 
      id: 'community', 
      label: 'Community', 
      icon: Group, 
      path: '/admin/community' 
    },
  ];

  const handleMenuItemClick = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobileMenuOpen && !event.target.closest('.sidebar-container') && !event.target.closest('.mobile-menu-button')) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  // Check if current path matches menu item
  const isActive = (path) => {
    if (location.pathname === path) return true;
    // Treat nested routes as active (e.g., /admin/schools-pickup/:schoolId)
    return location.pathname.startsWith(`${path}/`);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobileMenu}
        className="mobile-menu-button lg:hidden fixed top-4 left-4 z-50 p-3 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? (
          <X size={24} className="text-gray-600" />
        ) : (
          <Menu size={24} className="text-gray-600" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Fixed, no scrolling */}
      <nav className={`
        sidebar-container
        fixed lg:relative inset-y-0 left-0 z-40
        w-72 glass border-r border-white/20
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        h-full flex flex-col
      `}>
        {/* Logo Section - Fixed */}
        <div className="flex-shrink-0 text-center py-6 pt-16 lg:pt-6">
          <div className="flex items-center justify-center mb-2">
            <MuiIcon size={28}>
              <Security sx={{ fontSize: 28, color: '#3b82f6' }} />
            </MuiIcon>
            <h1 className="text-xl lg:text-2xl font-bold gradient-text ml-2">YAU Admin</h1>
          </div>
          <p className="text-gray-600 text-xs lg:text-sm">Youth Athlete University</p>
        </div>

        {/* Navigation Menu - Scrollable only if menu items exceed height */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          <ul className="space-y-1 lg:space-y-2 py-4">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <li key={index}>
                  <button
                    onClick={() => handleMenuItemClick(item.path)}
                    className={`w-full flex items-center px-4 lg:px-6 py-3 rounded-xl font-medium transition-all duration-300 text-sm lg:text-base group relative ${
                      active
                        ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white transform translate-x-1 shadow-lg'
                        : 'text-gray-700 hover:bg-gray-100 hover:transform hover:translate-x-1'
                    }`}
                    title={item.description || item.label}
                  >
                    <div className="mr-3 flex-shrink-0">
                      <Icon size={18} />
                    </div>
                    <span className="truncate">{item.label}</span>
                    
                    {/* Special indicator for admin management */}
                    {item.id === 'admins' && (
                      <div className="ml-auto flex-shrink-0">
                        <MuiIcon size={12}>
                          <Shield sx={{ 
                            fontSize: 12, 
                            color: active ? 'white' : '#ef4444',
                            opacity: 0.8
                          }} />
                        </MuiIcon>
                      </div>
                    )}

                    {/* Hover tooltip for mobile */}
                    {item.description && (
                      <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                        {item.description}
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Fixed Bottom Section - User Info & Logout */}
        <div className="flex-shrink-0 border-t border-gray-200 p-4 lg:p-6 bg-white/95 backdrop-blur-sm">
          {/* User Info Card */}
          <div className="bg-gray-50 rounded-xl p-3 mb-3">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                {user?.role === 'admin' || user?.role === 'super_admin' ? (
                  <MuiIcon size={18}>
                    <VerifiedUser sx={{ fontSize: 18, color: 'white' }} />
                  </MuiIcon>
                ) : (
                  <User size={18} className="text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <div className="flex items-center">
                  <p className="text-xs text-gray-600 capitalize">{user?.role}</p>
                  {(user?.role === 'admin' || user?.role === 'super_admin') && (
                    <MuiIcon size={12}>
                      <Shield sx={{ fontSize: 12, color: '#10b981', marginLeft: 0.5 }} />
                    </MuiIcon>
                  )}
                </div>
              </div>
            </div>
          </div>

       
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300 text-sm font-medium border border-red-200 hover:border-red-300"
          >
            <LogOut size={18} className="mr-2 flex-shrink-0" />
            <span>Logout</span>
          </button>

          {/* Version Info */}
          <div className="hidden sm:block mt-3 text-center">
            <p className="text-xs text-gray-500">YAU Admin Panel @{getYear(new Date())}</p>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;