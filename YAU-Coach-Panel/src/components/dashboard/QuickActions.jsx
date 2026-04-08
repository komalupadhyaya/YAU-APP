// coach/components/dashboard/QuickActions.jsx
import React, { useState } from 'react';
import { MessageSquare, Plus, Trophy, RefreshCw } from 'lucide-react';
import CreatePractice from '../schedule/CreatePractice';
import GameScoreReport from '../schedule/GameScoreReport';
import MessageComposer from '../messages/MessageComposer';

const QuickActions = ({ coachData, teams, onRefresh }) => {
  const [showCreatePractice, setShowCreatePractice] = useState(false);
  const [showReportScore, setShowReportScore] = useState(false);
  const [showMessageTeam, setShowMessageTeam] = useState(false);

  const quickActions = [
    {
      label: 'Message Team',
      icon: MessageSquare,
      bgColor: 'bg-blue-600',
      hoverColor: 'hover:bg-blue-700',
      onClick: () => setShowMessageTeam(true)
    },
    {
      label: 'Create Practice',
      icon: Plus,
      bgColor: 'bg-green-600',
      hoverColor: 'hover:bg-green-700',
      onClick: () => setShowCreatePractice(true)
    },
    {
      label: 'Report Game Score',
      icon: Trophy,
      bgColor: 'bg-orange-600',
      hoverColor: 'hover:bg-orange-700',
      onClick: () => setShowReportScore(true)
    }
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Quick Actions</h2>
        <button
          onClick={onRefresh}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            // <button
            //   key={index}
            //   onClick={action.onClick}
            //   className={`${action.bgColor} ${action.hoverColor} text-white p-2  rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl hover:transform hover:-translate-y-1 flex align- items-center gap-2`}
            // >
            //   <Icon size={32} />
            //   <span className="font-semibold text-lg">{action.label}</span>
            // </button>

//             <button
//   key={index}
//   onClick={action.onClick}
//   className={`
//     ${action.bgColor} ${action.hoverColor} 
//     text-white p-3 rounded-xl 
//     shadow-md hover:shadow-xl 
//     transition-all duration-300 ease-in-out 
//     transform hover:-translate-y-1 
//     flex items-center gap-3 
//     bg-gradient-to-r from-blue-950  via-slate-400 to-blue-950
//     hover:brightness-110
//   `}
// >
//   <Icon size={28} />
//   <span className="font-semibold text-lg">{action.label}</span>
// </button>


<button
  key={index}
  onClick={action.onClick}
  className={`
    ${action.bgColor} ${action.hoverColor} 
    text-white p-3 rounded-xl 
    shadow-md hover:shadow-xl 
    transition-all duration-300 ease-in-out 
    transform hover:-translate-y-1 
    flex items-center gap-3 
    relative overflow-hidden
    group
  `}
>

  
  <Icon size={28} className="z-10" />
  <span className="font-semibold text-lg z-10">{action.label}</span>
</button>


          );
        })}
      </div>

      {/* Modals */}
      {showMessageTeam && (
        <MessageComposer
          coachData={coachData}
          teams={teams}
          isOpen={showMessageTeam}
          onClose={() => setShowMessageTeam(false)}
          onSent={() => {
            setShowMessageTeam(false);
            onRefresh();
          }}
        />
      )}

      {showCreatePractice && (
        <CreatePractice
          coachData={coachData}
          teams={teams}
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
          teams={teams}
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

export default QuickActions;