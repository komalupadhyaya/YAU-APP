// components/NavBar/NavBar.jsx
import React from "react";
import { FaBars, FaSignOutAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import profilePic from "../../assets/profilePic.jpg";
import { useAuth } from "../../context/AuthContext";
import NotificationIcon from "../Notifications/NotificationIcon";

const NavBar = ({ setSidebarOpen, activeTab }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="w-full h-14 bg-white shadow flex items-center justify-between px-4">
      {/* Left: Hamburger (mobile only) */}
      <div className="flex items-center">
        <button onClick={() => setSidebarOpen(true)} className="md:hidden mr-3">
          <FaBars className="text-xl text-gray-700" />
        </button>

        <div>
          <div className="text-2xl font-bold text-blue-600 italic">YAU</div>
          <p className="text-xs font-bold italic text-blue-900">
            Young Athlete University
          </p>
        </div>
      </div>

      {/* Right: Notifications, Profile / Account */}
      <div className="flex items-center gap-3">
        <NotificationIcon />
        <span className="text-gray-600 text-sm">
          {user?.firstName || user?.email || "My Account"}
        </span>
        <img src={profilePic} alt="profile" className="w-8 h-8 rounded-full" />
        <div className="relative group">
          <button
            onClick={handleLogout}
            className="flex items-center text-gray-600 group-hover:text-red-600 transition-colors"
          >
            <FaSignOutAlt className="text-lg" />
            <span className="ml-1 hidden group-hover:inline text-sm font-medium">
              Logout
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NavBar;
