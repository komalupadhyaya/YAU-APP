// coach/components/schedule/Schedule.jsx
import React, { useState } from 'react';
import { Calendar, Plus, Trophy, MapPin, Clock, Users } from 'lucide-react';
import CreatePractice from './CreatePractice';
import GameScoreReport from './GameScoreReport';

const Schedule = ({ schedule, rosters, coachData, onRefresh }) => {
  const [showCreatePractice, setShowCreatePractice] = useState(false);
  const [showReportScore, setShowReportScore] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [filterType, setFilterType] = useState('all'); // 'all', 'practice', 'game'

  const formatEventDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return { text: 'Today', color: 'text-green-600' };
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return { text: 'Tomorrow', color: 'text-blue-600' };
    } else {
      return { 
        text: date.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        }), 
        color: 'text-gray-600' 
      };
    }
  };

  const formatEventTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'practice':
        return <Users size={18} className="text-blue-500" />;
      case 'game':
        return <Trophy size={18} className="text-orange-500" />;
      default:
        return <Calendar size={18} className="text-gray-500" />;
    }
  };

  const filteredSchedule = schedule.filter(event => {
    if (filterType === 'all') return true;
    return event.eventType === filterType || event.type === filterType;
  });

  const upcomingEvents = filteredSchedule.filter(event => 
    new Date(event.date) >= new Date()
  ).sort((a, b) => new Date(a.date) - new Date(b.date));

  const pastEvents = filteredSchedule.filter(event => 
    new Date(event.date) < new Date()
  ).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Schedule</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCreatePractice(true)}
            className="hidden flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            <span>Create Practice</span>
          </button>
          <button
            onClick={() => setShowReportScore(true)}
            className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Trophy size={16} />
            <span>Report Score</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-800">View Options</h3>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Filter:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Events</option>
              <option value="practice">Practices Only</option>
              <option value="game">Games Only</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">
              {upcomingEvents.filter(e => e.eventType === 'practice' || e.type === 'practice').length}
            </div>
            <div className="text-sm text-blue-600">Upcoming Practices</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-600">
              {upcomingEvents.filter(e => e.eventType === 'game' || e.type === 'game').length}
            </div>
            <div className="text-sm text-orange-600">Upcoming Games</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">
              {filteredSchedule.length}
            </div>
            <div className="text-sm text-green-600">Total Events</div>
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Calendar className="mr-2 text-blue-600" size={20} />
            Upcoming Events ({upcomingEvents.length})
          </h3>
          
          <div className="space-y-4">
            {upcomingEvents.slice(0, 5).map((event) => {
              const dateInfo = formatEventDate(event.date);
              const isToday = dateInfo.text === 'Today';
              const isTomorrow = dateInfo.text === 'Tomorrow';
              
              return (
                <div 
                  key={event.id} 
                  className={`flex items-center space-x-4 p-4 rounded-lg border-l-4 ${
                    isToday ? 'border-green-500 bg-green-50' :
                    isTomorrow ? 'border-blue-500 bg-blue-50' :
                    'border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {getEventIcon(event.eventType || event.type)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-800">
                        {event.title || 
                         (event.eventType === 'practice' ? 'Team Practice' : 
                          event.eventType === 'game' ? `Game vs ${event.opponent || 'TBD'}` : 
                          event.name || 'Event')}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className={`font-medium ${dateInfo.color}`}>
                          {dateInfo.text}
                        </span>
                        <span className="flex items-center">
                          <Clock size={14} className="mr-1" />
                          {formatEventTime(event.date)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                      {(event.location || event.field) && (
                        <span className="flex items-center">
                          <MapPin size={14} className="mr-1" />
                          {event.location || event.field}
                        </span>
                      )}
                      
                      {event.teamName && (
                        <span className="flex items-center">
                          <Users size={14} className="mr-1" />
                          {event.teamName}
                        </span>
                      )}
                      
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        event.eventType === 'practice' || event.type === 'practice' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {(event.eventType || event.type || 'event').toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {upcomingEvents.length > 5 && (
            <div className="text-center mt-4">
              <p className="text-sm text-gray-500">
                +{upcomingEvents.length - 5} more upcoming events
              </p>
            </div>
          )}
        </div>
      )}

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Trophy className="mr-2 text-gray-600" size={20} />
            Recent Events ({pastEvents.length})
          </h3>
          
          <div className="space-y-3">
            {pastEvents.slice(0, 3).map((event) => (
              <div key={event.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 opacity-60">
                  {getEventIcon(event.eventType || event.type)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-700">
                      {event.title || 
                       (event.eventType === 'practice' ? 'Team Practice' : 
                        event.eventType === 'game' ? `Game vs ${event.opponent || 'TBD'}` : 
                        event.name || 'Event')}
                    </h4>
                    <div className="text-sm text-gray-500">
                      {new Date(event.date).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {event.homeScore !== undefined && event.awayScore !== undefined && (
                    <div className="text-sm text-gray-600 mt-1">
                      Final Score: {event.homeScore} - {event.awayScore}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Events */}
      {filteredSchedule.length === 0 && (
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <Calendar size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No Events Scheduled</h3>
          <p className="text-gray-500 mb-4">
            You don't have any {filterType === 'all' ? 'events' : filterType + 's'} scheduled yet.
          </p>
          <button
            onClick={() => setShowCreatePractice(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your First Practice
          </button>
        </div>
      )}

      {/* Modals */}
      {showCreatePractice && (
        <CreatePractice
          coachData={coachData}
          teams={rosters}
          isOpen={showCreatePractice}
          onClose={() => setShowCreatePractice(false)}
          onCreated={() => {
            setShowCreatePractice(false);
            onRefresh();
          }}
        />
      )}

      {showReportScore && (
        <GameScoreReport
          coachData={coachData}
          teams={rosters}
          isOpen={showReportScore}
          onClose={() => setShowReportScore(false)}
          onReported={() => {
            setShowReportScore(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};

export default Schedule;