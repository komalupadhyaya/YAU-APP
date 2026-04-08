// coach-panel/src/components/layout/CoachLayout.jsx
import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import CoachSidebar from './CoachSidebar';
import CoachHeader from './CoachHeader';
import CoachDashboard from '../dashboard/CoachDashboard';
import TeamsRosters from '../teams/TeamsRosters';
import MyTeamIds from '../teams/MyTeamIds';
import Schedule from '../schedule/Schedule';
import CoachMessages from '../messages/CoachMessages';
import Resources from '../resources/Resources';
import { useCoachData } from '../../hooks/useCoachData';
import SupportPage from '../Suport/Support';
import Profile from '../Profile/Profile';
import Timesheet from '../timeSheet/Timesheet';

const CoachLayout = ({ userData, onSwitchToMemberView }) => {
  const location = useLocation();
  const [selectedTeam, setSelectedTeam] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const { rosters, schedule, loading: dataLoading, refreshData } = useCoachData(userData?.id);

  // Extract current section from URL
  const getCurrentSection = () => {
    const path = location.pathname.split('/')[1];
    return path || 'dashboard';
  };

  const activeSection = getCurrentSection();

  const filteredRosters = selectedTeam 
    ? rosters.filter(roster => roster.id === selectedTeam)
    : rosters;

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your coaching data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <CoachSidebar
        activeSection={activeSection}
        userData={userData}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSwitchToMemberView={onSwitchToMemberView}
      />

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Header */}
        <CoachHeader
          coachName={`${userData.firstName} ${userData.lastName}`}
          teams={rosters}
          selectedTeam={selectedTeam}
          onTeamChange={setSelectedTeam}
          onMenuClick={() => setSidebarOpen(true)}
          onSwitchToMemberView={onSwitchToMemberView}
        />

        {/* Page content */}
        <main className="py-8 px-4 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            <Route 
              path="/dashboard" 
              element={
                <CoachDashboard 
                  userData={userData}
                  rosters={rosters}
                  schedule={schedule}
                  onRefresh={refreshData}
                />
              } 
            />
            <Route 
              path="/timeSheet" 
              element={
                <Timesheet/>
              } 
            />
            
            <Route 
              path="/teams" 
              element={
                <TeamsRosters 
                  rosters={filteredRosters}
                  coachData={userData}
                  onRefresh={refreshData}
                />
              } 
            />
            <Route
              path="/my-teams-ids"
              element={
                <MyTeamIds
                  rosters={rosters}
                  coachData={userData}
                />
              }
            />
            
            <Route 
              path="/schedule" 
              element={
                <Schedule 
                  schedule={schedule}
                  rosters={rosters}
                  coachData={userData}
                  onRefresh={refreshData}
                />
              } 
            />
            
            <Route
              path="/messages"
              element={
                <CoachMessages
                  coachData={userData}
                  rosters={rosters}
                />
              }
            />
            
            <Route 
              path="/resources" 
              // element={<Resources />} 
              element={<> <h1 className='text-center p-4 text-2xl'>Resources Comming Soon...</h1></>} 
            />
            <Route 
              path="/attendance" 
              // element={<Resources />} 
              element={<> <h1 className='text-center p-4 text-2xl'>Attendance Comming Soon...</h1></>} 
            />
            <Route 
              path="/support" 
              element={<SupportPage  />} 

            />
            <Route 
              path="/profile" 
              element={<Profile  />} 

            />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default CoachLayout;