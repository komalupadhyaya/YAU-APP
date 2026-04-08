import React, { useState, useEffect } from 'react';
import { X, CreditCard, AlertCircle } from 'lucide-react';
import { CardManagementService } from '../../firebase/apis/api-card-management';

const PaymentUpdateModal = ({ isOpen, onClose, user, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);

  useEffect(() => {
    if (isOpen && user?.email) {
      loadPaymentMethods();
    }
  }, [isOpen, user]);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const customer = await CardManagementService.getCustomerByEmail(user.email);
      if (customer) {
        const methods = await CardManagementService.getPaymentMethods(customer.customerId);
        setPaymentMethods(methods);
        if (methods.length > 0) {
          setSelectedMethod(methods[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePayment = async () => {
    if (!selectedMethod) {
      alert('Please select a payment method');
      return;
    }

    try {
      setLoading(true);

      // Try to process payment with selected method
      const response = await fetch('/api/stripe/retry-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethodId: selectedMethod,
          userEmail: user.email,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ Payment updated successfully!');
        onSuccess();
        onClose();
      } else {
        alert('❌ Failed to update payment: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      alert('❌ Error updating payment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-red-500" size={20} />
            <h2 className="text-xl font-semibold text-gray-800">Payment Failed</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Your recent payment failed. Please select a payment method to retry payment.
          </p>

          {paymentMethods.length > 0 ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Select Payment Method:
              </label>
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className={`p-3 border rounded-lg cursor-pointer ${
                    selectedMethod === method.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedMethod(method.id)}
                >
                  <div className="flex items-center gap-2">
                    <CreditCard size={16} className="text-gray-400" />
                    <span>**** **** **** {method.card.last4}</span>
                    <span className="text-sm text-gray-500 capitalize">
                      {method.card.brand}
                    </span>
                    <span className="text-sm text-gray-500">
                      {method.card.exp_month}/{method.card.exp_year}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500">No saved payment methods found.</p>
              <p className="text-sm text-gray-400 mt-1">
                Please contact support to update your payment information.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpdatePayment}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
            disabled={loading || paymentMethods.length === 0}
          >
            {loading ? (
              'Processing...'
            ) : (
              <>
                <CreditCard size={16} />
                Retry Payment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentUpdateModal;