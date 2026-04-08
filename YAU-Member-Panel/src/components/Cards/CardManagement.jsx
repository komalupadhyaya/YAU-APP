import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { FaCreditCard, FaPlus, FaTrash, FaStar, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import CardManagementService from '../../firebase/apis/api-card-management';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

// Card display component
const PaymentMethodCard = ({ paymentMethod, isDefault, onSetDefault, onRemove, loading }) => {
  const { card } = paymentMethod;
  
  const getCardBrandIcon = (brand) => {
    const brandIcons = {
      visa: '💳',
      mastercard: '💳',
      amex: '💳',
      discover: '💳',
    };
    return brandIcons[brand] || '💳';
  };

  return (
    <div className={`p-4 border rounded-lg ${isDefault ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getCardBrandIcon(card.brand)}</span>
          <div>
            <div className="font-medium capitalize">
              {card.brand} •••• {card.last4}
            </div>
            <div className="text-sm text-gray-600">
              Expires {card.exp_month}/{card.exp_year}
            </div>
          </div>
          {isDefault && (
            <div className="flex items-center space-x-1 text-blue-600">
              <FaStar className="text-sm" />
              <span className="text-sm font-medium">Default</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {!isDefault && (
            <button
              onClick={() => onSetDefault(paymentMethod.id)}
              disabled={loading}
              className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded border border-blue-200 disabled:opacity-50"
            >
              Set Default
            </button>
          )}
          <button
            onClick={() => onRemove(paymentMethod.id)}
            disabled={loading || isDefault}
            className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
            title={isDefault ? "Cannot remove default payment method" : "Remove card"}
          >
            <FaTrash className="text-sm" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Add new card component
const AddCardForm = ({ customerId, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create setup intent
      const setupIntentData = await CardManagementService.createSetupIntent(customerId);
      
      const card = elements.getElement(CardElement);
      
      // Confirm setup intent with card
      const { error: confirmError, setupIntent } = await stripe.confirmCardSetup(
        setupIntentData.clientSecret,
        {
          payment_method: {
            card: card,
          }
        }
      );

      if (confirmError) {
        setError(confirmError.message);
        return;
      }

      // Attach payment method to customer
      await CardManagementService.attachPaymentMethod(setupIntent.payment_method, customerId);
      
      onSuccess();
    } catch (err) {
      console.error('Error adding card:', err);
      setError(err.message || 'Failed to add card');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
      <h4 className="font-semibold mb-4">Add New Payment Method</h4>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Information
          </label>
          <div className="border border-gray-300 rounded-lg p-3 bg-white">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                },
              }}
            />
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={!stripe || loading}
            className={`flex-1 py-2 px-4 rounded-lg font-medium text-white transition-colors ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <FaSpinner className="animate-spin" />
                <span>Adding Card...</span>
              </div>
            ) : (
              'Add Card'
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

// Main card management component
const CardManagement = ({ userEmail }) => {
  const [customer, setCustomer] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [error, setError] = useState('');

  const loadCustomerData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get customer by email
      const customerData = await CardManagementService.getCustomerByEmail(userEmail);
      
      if (!customerData) {
        setError('No payment account found. Complete a payment first to manage cards.');
        return;
      }
      
      setCustomer(customerData);
      
      // Get payment methods
      const methods = await CardManagementService.getPaymentMethods(customerData.customerId);
      setPaymentMethods(methods);
      
    } catch (err) {
      console.error('Error loading customer data:', err);
      setError('Failed to load payment information.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (paymentMethodId) => {
    try {
      setActionLoading(true);
      await CardManagementService.setDefaultPaymentMethod(customer.customerId, paymentMethodId);
      
      // Update local state
      setCustomer(prev => ({
        ...prev,
        defaultPaymentMethod: paymentMethodId
      }));
      
    } catch (err) {
      console.error('Error setting default payment method:', err);
      setError('Failed to set default payment method.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveCard = async (paymentMethodId) => {
    if (!window.confirm('Are you sure you want to remove this payment method?')) {
      return;
    }
    
    try {
      setActionLoading(true);
      await CardManagementService.detachPaymentMethod(paymentMethodId);
      
      // Update local state
      setPaymentMethods(prev => prev.filter(pm => pm.id !== paymentMethodId));
      
    } catch (err) {
      console.error('Error removing payment method:', err);
      setError('Failed to remove payment method.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddCardSuccess = () => {
    setShowAddCard(false);
    loadCustomerData(); // Reload to get updated list
  };

  useEffect(() => {
    if (userEmail) {
      loadCustomerData();
    }
  }, [userEmail]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <FaSpinner className="animate-spin text-2xl text-blue-600 mx-auto mb-2" />
            <p className="text-gray-600">Loading payment methods...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !customer) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-yellow-700">
            <FaExclamationTriangle />
            <span className="font-medium">Payment Account Not Found</span>
          </div>
          <p className="text-yellow-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-red-700">
            <FaExclamationTriangle />
            <span className="font-medium">Error</span>
          </div>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Payment Methods</h3>
        {customer && !showAddCard && (
          <button
            onClick={() => setShowAddCard(true)}
            disabled={actionLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <FaPlus className="text-sm" />
            <span>Add Card</span>
          </button>
        )}
      </div>
      
      {showAddCard && customer && (
        <Elements stripe={stripePromise}>
          <AddCardForm
            customerId={customer.customerId}
            onSuccess={handleAddCardSuccess}
            onCancel={() => setShowAddCard(false)}
          />
        </Elements>
      )}
      
      {paymentMethods.length === 0 ? (
        <div className="text-center py-8">
          <FaCreditCard className="mx-auto text-4xl text-gray-300 mb-4" />
          <p className="text-gray-500">No payment methods found</p>
          <p className="text-gray-400 text-sm">Add a payment method to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paymentMethods.map((paymentMethod) => (
            <PaymentMethodCard
              key={paymentMethod.id}
              paymentMethod={paymentMethod}
              isDefault={customer?.defaultPaymentMethod === paymentMethod.id}
              onSetDefault={handleSetDefault}
              onRemove={handleRemoveCard}
              loading={actionLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CardManagement;