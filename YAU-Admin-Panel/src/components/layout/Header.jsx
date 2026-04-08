import React, { useState } from 'react';
import { Bell, Search, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Header = ({ title, subtitle, showActions = true }) => {
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };

  return (
    <div className="glass rounded-2xl p-4 lg:p-6 mb-6 lg:mb-8 relative z-20 flex-shrink-0">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        {/* Title Section */}
        <div className="flex-1 pt-12 lg:pt-0">
          <h2 className="text-xl lg:text-2xl font-semibold text-gray-800 mb-1 lg:mb-2 leading-tight">
            {title}
          </h2>
          <p className="text-gray-600 text-sm lg:text-base leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Action Section */}
        {showActions && (
          <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0">

            {/* Action Buttons */}
            <button className="p-2 lg:p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors relative">
              <Bell size={18} className="text-gray-600" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                3
              </span>
            </button>

            <button className="p-2 lg:p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Settings size={18} className="text-gray-600" />
            </button>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={toggleDropdown}
                className="hidden sm:flex items-center gap-2 lg:gap-3 bg-white border border-gray-200 rounded-lg p-2 lg:p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                  <User size={16} className="text-white" />
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-medium text-gray-800">{user?.name}</p>
                  <p className="text-xs text-gray-600 capitalize">{user?.role}</p>
                </div>
                <ChevronDown 
                  size={16} 
                  className={`text-gray-400 transition-transform duration-200 ${
                    isDropdownOpen ? 'rotate-180' : ''
                  }`} 
                />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={closeDropdown} />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 z-40 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                          <User size={20} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 truncate">{user?.name}</p>
                          <p className="text-sm text-gray-600 truncate">{user?.email}</p>
                          <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                        </div>
                      </div>
                    </div>

                    <div className="py-2">
                      <button
                        onClick={() => {
                          closeDropdown();
                        }}
                        className="w-full flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors text-left"
                      >
                        <User size={16} className="mr-3 text-gray-400" />
                        View Profile
                      </button>
                      
                      <button
                        onClick={() => {
                          closeDropdown();
                        }}
                        className="w-full flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors text-left"
                      >
                        <Settings size={16} className="mr-3 text-gray-400" />
                        Settings
                      </button>
                      
                      <div className="border-t border-gray-100 my-1"></div>
                      
                      <button
                        onClick={() => {
                          closeDropdown();
                          logout();
                        }}
                        className="w-full flex items-center px-4 py-3 text-red-600 hover:bg-red-50 transition-colors text-left"
                      >
                        <LogOut size={16} className="mr-3" />
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mobile Search Button */}
            <button className="md:hidden p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Search size={18} className="text-gray-600" />
            </button>
          </div>
        )}
      </div>

      {/* Mobile Search Bar */}
      <div className="md:hidden mt-4 pt-4 border-t border-gray-200">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
};

export default Header;