// components/StripePayment.jsx
import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
// import { APIClient } from '../../firebase/ApiClient';
import { APIClient } from '../../../firebase/ApiClient';
import { FaCreditCard, FaLock, FaSpinner } from 'react-icons/fa';

const STRIPE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
if (!STRIPE_KEY) {
  console.error("❌ STRIPE_PUBLISHABLE_KEY is missing from environment variables!");
}
const stripePromise = loadStripe(STRIPE_KEY);

const StripeCheckoutForm = ({ amount, description, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        console.log('Creating payment intent for amount:', amount);
        
        // Use your API client to create a payment intent
        const result = await APIClient.createPaymentIntent(
          amount,
          'usd',
          'league_id',
          '', // email can be passed if available
          '', // user ID if available
          { description }
        );

        setClientSecret(result.clientSecret);
      } catch (error) {
        console.error('Error creating payment intent:', error);
        onError(error);
      }
    };

    if (amount) {
      createPaymentIntent();
    }
  }, [amount, description, onError]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setLoading(true);

    try {
      const card = elements.getElement(CardElement);
      
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: card,
          billing_details: {
            // Add billing details if available
          },
        }
      });

      if (error) {
        console.error('Payment failed:', error);
        onError(error);
      } else {
        console.log('Payment succeeded:', paymentIntent);
        onSuccess(paymentIntent);
      }
    } catch (error) {
      console.error('Payment error:', error);
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-2xl shadow-md border border-gray-200">
      <h3 className="text-lg font-semibold text-green-700 mb-4">Payment Information</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Details
          </label>
          <div className="border border-gray-300 rounded-lg p-4 bg-white">
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

        <button
          type="submit"
          disabled={!stripe || loading || !clientSecret}
          className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all ${
            loading || !clientSecret
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <FaSpinner className="animate-spin" />
              Processing Payment...
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <FaLock />
              Pay ${(amount / 100).toFixed(2)}
            </div>
          )}
        </button>
      </form>
      
      {/* For production: Remove this test card info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-sm">
          <p className="font-medium mb-1">Test Card:</p>
          <p>4242 4242 4242 4242 - Any future expiry - Any CVC</p>
        </div>
      )}
    </div>
  );
};

const StripePayment = ({ amount, description, onSuccess, onError }) => {
  return (
    <Elements stripe={stripePromise}>
      <StripeCheckoutForm 
        amount={amount} 
        description={description}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
};

export default StripePayment;