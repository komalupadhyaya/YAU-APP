import React, { useState } from 'react';
import { X, CreditCard, Calendar } from 'lucide-react';

const UpgradeModal = ({ isOpen, onClose, onUpgrade, loading }) => {
  const [selectedPlan, setSelectedPlan] = useState('monthly');

  const plans = {
    monthly: {
      name: 'Monthly',
      price: 50,
      description: 'Pay monthly, cancel anytime',
      interval: 'month'
    },
    seasonal: {
      name: 'Seasonal',
      price: 150,
      description: 'Pay for the entire season, save money',
      interval: 'season'
    }
  };

  const handleUpgrade = () => {
    onUpgrade(selectedPlan, plans[selectedPlan]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Upgrade Your Membership</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          {Object.entries(plans).map(([key, plan]) => (
            <div
              key={key}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                selectedPlan === key
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedPlan(key)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">{plan.name}</h3>
                  <p className="text-sm text-gray-600">{plan.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-gray-900">${plan.price}</div>
                  <div className="text-sm text-gray-600">per {plan.interval}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpgrade}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading ? (
              'Processing...'
            ) : (
              <>
                <CreditCard size={16} />
                Upgrade Now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;