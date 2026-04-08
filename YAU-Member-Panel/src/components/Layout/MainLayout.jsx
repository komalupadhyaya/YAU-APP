// components/Layout/MainLayout.jsx
import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import NavBar from "../NavBar/NavBar";

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top NavBar (always full width) */}
      <NavBar setSidebarOpen={setSidebarOpen} />

      {/* Main content area (fills rest of screen below navbar) */}
      <div className="flex h-[calc(100vh-56px)] overflow-hidden">
        {/* Sidebar - desktop */}
        <div className="hidden md:block w-64 flex-shrink-0">
          <Sidebar />
        </div>

        {/* Sidebar - mobile (overlay) */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 flex md:hidden">
            <div className="w-64 bg-white h-full shadow-lg">
              <Sidebar setSidebarOpen={setSidebarOpen} />
            </div>
            {/* Overlay background */}
            <div
              className="flex-1 bg-black bg-opacity-50"
              onClick={() => setSidebarOpen(false)}
            />
          </div>
        )}

        {/* Right side content - Dynamic pages rendered here */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto overflow-x-hidden p-4 lg:p-6">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;