// components/Sidebar/Sidebar.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaHome, FaUser, FaCreditCard, FaTshirt, FaCalendarAlt, FaIdBadge, FaStore, FaCalendar, FaUsers, FaBook, FaQuestionCircle, FaSignOutAlt, FaIdCard,FaComments } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { CheckCircle, Clock } from "lucide-react";

// SidebarItem Component
const SidebarItem = ({ icon: Icon, label, path, active, onClick, isLogout = false }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-4 py-2 rounded-xl text-sm font-medium transition-colors 
      ${isLogout 
        ? "text-red-600 hover:bg-red-50" 
        : active 
        ? "text-blue-600 bg-blue-50" 
        : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      <Icon className="text-lg" />
      {label}
    </button>
  );
};

// Sidebar Component
const Sidebar = ({ setSidebarOpen }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (setSidebarOpen) {
      setSidebarOpen(false); // Close mobile sidebar after navigation
    }
  };

  const menuItems = [
    { label: "Dashboard", icon: FaHome, path: "/" },
    { label: "Profile", icon: FaUser, path: "/profile" },
    { label: "Messages", icon: FaComments, path: "/messages" },
    { label: "Payments", icon: FaCreditCard, path: "/payments" },
    { label: "Uniform", icon: FaTshirt, path: "/uniform" },
    // { label: "Order Child ID", icon: FaIdCard, path: "/child-id-order" },
    { label: "Game Schedule", icon: FaCalendarAlt, path: "/schedule" },
    { label: "My Child's ID", icon: FaIdBadge, path: "/child-id" },
    { label: "Shop", icon: FaStore, path: "/shop" },
    { label: "Events", icon: FaCalendar, path: "/events" },
    { label: "Invitations", icon: FaUsers, path: "/invitaions" },
    { label: "Resources", icon: FaBook, path: "/resources" },
    { label: "Support", icon: FaQuestionCircle, path: "/support" },
  ];

  return (
    <aside className="w-64 bg-white h-full overflow-scroll overflow-x-hidden shadow-md flex flex-col p-4 gap-2" style={{scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent'}}>
      {/* User Info */}
      <div className="mb-4 p-3 bg-blue-50 rounded-xl">
        <p className="text-sm font-medium text-blue-800">
          {user?.firstName ? `${user.firstName} ${user.lastName}` : user?.email}
        </p>
        <p className="text-xs text-blue-600">
          {/* {user?.isPaidMember ? 'Paid Member' : 'Free Member'} */}
            {user?.isPaidMember ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                <CheckCircle size={12} />
                Paid Member
              </span>
            ) : user?.paymentStatus === 'Active' ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                <CheckCircle size={12} />
                Active Member
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                <Clock size={12} />
                Free Member
              </span>
            )}
        </p>
      </div>

      {/* Menu Items */}
      {menuItems.map((item) => (
        <SidebarItem
          key={item.label}
          icon={item.icon}
          label={item.label}
          path={item.path}
          active={location.pathname === item.path}
          onClick={() => handleNavigation(item.path)}
        />
      ))}

      {/* Logout Button */}
      <div className="mt-auto pt-4 border-t">
        <SidebarItem
          icon={FaSignOutAlt}
          label="Logout"
          onClick={handleLogout}
          isLogout={true}
        />
      </div>
    </aside>
  );
};

export default Sidebar;