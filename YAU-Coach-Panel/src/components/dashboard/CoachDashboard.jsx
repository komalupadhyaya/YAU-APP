import React, { useState, useEffect } from 'react';
import { useCoachData } from '../../hooks/useCoachData';
import { useTeamMessages } from '../../hooks/useRealTimeMessages';
import QuickActions from './QuickActions';
import TodaysSnapshot from './TodaysSnapshot';
import TeamsRosters from '../teams/TeamsRosters';
import Schedule from '../schedule/Schedule';
import { getCurrentCoachData, signOutCoach } from '../../firebase/coachAuth';
import { MessageSquare, Users, Calendar, BookOpen, BarChart3 } from 'lucide-react';

const CoachDashboard = ({ onSwitchToMemberView }) => {
  const [coachData, setCoachData] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  const { rosters, schedule, loading: dataLoading, refreshData, } = useCoachData(coachData?.id);
  const { messages } = useTeamMessages(coachData?.id);

  useEffect(() => {
    const loadCoachData = async () => {
      try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser && currentUser.userType === 'coach') {
          const coachInfo = await getCurrentCoachData(currentUser.uid);
          setCoachData(coachInfo);
        }
      } catch (error) {
        console.error('Error loading coach data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCoachData();
  }, []);

  const getUnreadMessages = () => {
    return messages.filter(msg => !msg.read).length;
  };

  const getNextEvent = () => {
    const now = new Date();
    return schedule
      .filter(event => new Date(event.date) > now)
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
  };

  const filteredRosters = selectedTeam
    ? rosters.filter(roster => roster.id === selectedTeam)
    : rosters;

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your coaching dashboard...</p>
        </div>
      </div>
    );
  }

  if (!coachData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">Unable to load coach data. Please try logging in again.</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'teams', label: 'Teams & Rosters', icon: Users },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: getUnreadMessages() },
    { id: 'resources', label: 'Resources', icon: BookOpen }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* <CoachHeader
        coachName={`${coachData.firstName} ${coachData.lastName}`}
        teams={rosters}
        selectedTeam={selectedTeam}
        onTeamChange={setSelectedTeam}
        notifications={messages.filter(msg => !msg.read)}
        onSwitchToMemberView={onSwitchToMemberView}
        onSignOut={handleSignOut}
      /> */}

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm relative ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                  {tab.badge && tab.badge > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <QuickActions
              coachData={coachData}
              teams={rosters}
              onRefresh={refreshData}
            />
            <TodaysSnapshot
              nextEvent={getNextEvent()}
              unreadMessages={getUnreadMessages()}
              teams={rosters}
            />
          </div>
        )}

        {activeTab === 'teams' && (
          <TeamsRosters
            rosters={filteredRosters}
            coachData={coachData}
            onRefresh={refreshData}
          />
        )}

        {activeTab === 'schedule' && (
          <Schedule
            schedule={schedule}
            rosters={rosters}
            coachData={coachData}
            onRefresh={refreshData}
          />
        )}

        {activeTab === 'messages' && (
          // <CoachMessages 
          //   coachData={coachData}
          //   rosters={rosters}
          //   messages={messages}
          // />
          <>
            <h1>Comming Soon...</h1>
          </>
        )}

        {activeTab === 'resources' && (
          // <Resources />
          <>
            <h1>Comming Soon...</h1>
          </>
        )}
      </div>
    </div>
  );
};

export default CoachDashboard;