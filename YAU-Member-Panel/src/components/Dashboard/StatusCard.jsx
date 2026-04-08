import React from 'react';
import { CheckCircle, Clock, AlertCircle, CreditCard, ArrowUpCircle } from 'lucide-react';

const StatusCard = ({ user, onUpgrade, onUpdatePayment }) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'Active':
        return {
          color: 'green',
          icon: CheckCircle,
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800',
          description: 'Legacy member - not connected to Stripe billing'
        };
      case 'Paid - Monthly':
      case 'Paid - Seasonal':
        return {
          color: 'blue',
          icon: CheckCircle,
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          description: 'Stripe billing active'
        };
      case 'Past Due':
        return {
          color: 'red',
          icon: AlertCircle,
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          description: 'Payment failed - please update your payment method'
        };
      case 'Canceled':
        return {
          color: 'gray',
          icon: Clock,
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-800',
          description: 'Subscription canceled'
        };
      default:
        return {
          color: 'gray',
          icon: Clock,
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-800',
          description: 'Status unknown'
        };
    }
  };

  const status = user?.paymentStatus || 'Active';
  const config = getStatusConfig(status);
  const StatusIcon = config.icon;

  return (
    <div className={`p-6 rounded-lg ${config.bg} ${config.border} border-2`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <StatusIcon className={config.text} size={24} />
          <div>
            <h3 className={`font-semibold text-lg ${config.text}`}>
              {status}
            </h3>
            <p className="text-sm text-gray-600">{config.description}</p>
          </div>
        </div>

        {status === 'Active' && (
          <button
            onClick={onUpgrade}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowUpCircle size={16} />
            Upgrade
          </button>
        )}

        {status === 'Past Due' && (
          <button
            onClick={onUpdatePayment}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <CreditCard size={16} />
            Update Payment Info
          </button>
        )}
      </div>

      {user?.next_payment_date && (
        <div className="text-sm text-gray-600">
          <strong>Next Payment:</strong> {new Date(user.next_payment_date).toLocaleDateString()}
        </div>
      )}

      {user?.last_payment_date && (
        <div className="text-sm text-gray-600">
          <strong>Last Payment:</strong> {new Date(user.last_payment_date).toLocaleDateString()}
          {user?.last_payment_amount && ` - $${(user.last_payment_amount / 100).toFixed(2)}`}
        </div>
      )}
    </div>
  );
};

export default StatusCard;