import React, { useState } from 'react';
import Button from '../common/Button';
import { Users, UserCheck, ArrowLeft } from 'lucide-react';

const RoleSelection = ({ onRoleSelect, onBackToLogin }) => {
  const [selectedRole, setSelectedRole] = useState('');

  const roles = [
    {
      id: 'parent',
      title: 'Parent',
      description: 'Register your child and connect with coaches',
      icon: Users,
      features: [
        'Register your children',
        'View practice schedules',
        'Receive messages from coaches',
        'Track your child\'s progress'
      ]
    },
    {
      id: 'coach',
      title: 'Coach',
      description: 'Manage teams and communicate with parents',
      icon: UserCheck,
      features: [
        'Manage team rosters',
        'Send messages to parents',
        'Schedule practices and games',
        'Track player development'
      ]
    }
  ];

  const handleContinue = () => {
    if (selectedRole) {
      onRoleSelect(selectedRole);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={onBackToLogin}
            className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Login
          </button>
          
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <span className="text-2xl font-bold gradient-text">YAU</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Join YAU</h1>
          <p className="text-white/80">Choose your role to get started</p>
        </div>

        {/* Role Selection */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <div
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`glass rounded-2xl p-6 cursor-pointer transition-all duration-300 ${
                  selectedRole === role.id
                    ? 'ring-4 ring-white/30 transform scale-105'
                    : 'hover:transform hover:scale-102'
                }`}
              >
                <div className="text-center mb-4">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 ${
                    selectedRole === role.id
                      ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Icon size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{role.title}</h3>
                  <p className="text-gray-600">{role.description}</p>
                </div>

                <ul className="space-y-2">
                  {role.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-700">
                      <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mr-3 flex-shrink-0"></div>
                      {feature}
                    </li>
                  ))}
                </ul>

                {selectedRole === role.id && (
                  <div className="mt-4 p-3 bg-primary-50 rounded-xl">
                    <p className="text-sm text-primary-700 font-medium text-center">
                      ✓ Selected
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Continue Button */}
        {selectedRole && (
          <div className="text-center">
            <Button
              onClick={handleContinue}
              size="lg"
              className="px-8 py-4 text-lg"
            >
              Continue as {roles.find(r => r.id === selectedRole)?.title}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleSelection;