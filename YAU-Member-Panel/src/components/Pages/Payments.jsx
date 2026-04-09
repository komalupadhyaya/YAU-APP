import React, { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { FaSpinner, FaReceipt, FaCalendar, FaTimes, FaDollarSign, FaExclamationTriangle, FaCreditCard, FaTshirt, FaUserCog, FaIdCard } from "react-icons/fa";
import PaymentAPIService from "../../firebase/apis/api-payment-history"; // Fixed path
import { CheckCircle, Clock, RefreshCcw } from "lucide-react";
import { MembershipService } from "../../firebase/apis/api-membership";
import CardManagement from "../Cards/CardManagement";
import AccountInfoEditor from "../Account/AccountInfoEditor";

function Payments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentStats, setPaymentStats] = useState(null);
  const [uniformOrders, setUniformOrders] = useState([]);
  const [childIdOrders, setChildIdOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [uniformLoading, setUniformLoading] = useState(false);
  const [childIdLoading, setChildIdLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'cards', or 'account'
  const [canceling, setCanceling] = useState(false);
  const hasFetchedRef = useRef(false);

  const fetchPaymentHistory = useCallback(async (email) => {
    if (!email) return [];

    setHistoryLoading(true);
    try {
      console.log('🔄 Fetching payment history for:', email);
      const history = await PaymentAPIService.getPaymentHistoryByEmail(email);
      console.log('✅ Payment history received:', history?.length || 0, 'records');
      return history || [];
    } catch (error) {
      console.error('❌ Error fetching payment history:', error);
      throw new Error(`Failed to load payment history: ${error.message}`);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const fetchPaymentStats = useCallback(async (userId) => {
    if (!userId) return null;

    setStatsLoading(true);
    try {
      console.log('🔄 Fetching payment stats for:', userId);
      const stats = await PaymentAPIService.getPaymentStats(userId);
      console.log('✅ Payment stats received:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Error fetching payment stats:', error);
      // Don't throw error for stats - it's not critical
      return null;
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch uniform orders
  const fetchUniformOrders = useCallback(async (userEmail) => {
    if (!userEmail) return [];

    setUniformLoading(true);
    try {
      console.log('👕 Fetching uniform orders for:', userEmail);

      // Create a mock API call - replace with actual API when available
      const mockUniformOrders = [];

      // Only show uniform orders if user has monthly plan or made standalone uniform purchase
      // One-time payments already include uniforms, so don't show separate uniform orders for them
      if (user?.membershipType === 'monthly') {
        mockUniformOrders.push({
          id: 'uniform_1',
          orderDate: new Date(Date.now() - 86400000), // 1 day ago
          studentName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Student',
          uniformTop: 'Adult L',
          uniformBottom: 'Adult L',
          amount: 7500, // $75 - separate purchase for monthly members
          paymentStatus: 'completed',
          orderStatus: 'processing',
          orderSource: 'standalone', // Standalone uniform purchase
          paymentIntentId: 'pi_uniform_standalone_123'
        });
      }

      // Check if user has recent uniform orders from sessionStorage
      const recentUniformPayment = sessionStorage.getItem("uniformPaymentCompleted");
      if (recentUniformPayment && (Date.now() - parseInt(recentUniformPayment)) < 86400000) {
        // Only add if this was a standalone uniform purchase (monthly users)
        // One-time payment users get uniforms included in their $200 payment
        const wasStandalonePurchase = user?.membershipType === 'monthly' || sessionStorage.getItem("standaloneUniformPurchase");

        if (wasStandalonePurchase) {
          const recentOrder = {
            id: 'uniform_recent',
            orderDate: new Date(parseInt(recentUniformPayment)),
            studentName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Student',
            uniformTop: sessionStorage.getItem("recentUniformTop") || 'Adult M',
            uniformBottom: sessionStorage.getItem("recentUniformBottom") || 'Adult M',
            amount: 7500, // $75 for standalone uniform purchase
            paymentStatus: 'completed',
            orderStatus: 'processing',
            orderSource: 'standalone', // Mark as standalone purchase
            paymentIntentId: 'pi_recent_uniform_' + parseInt(recentUniformPayment)
          };
          mockUniformOrders.unshift(recentOrder);
        }
      }

      console.log('✅ Uniform orders fetched:', mockUniformOrders.length, 'records');
      return mockUniformOrders;
    } catch (error) {
      console.error('❌ Error fetching uniform orders:', error);
      return [];
    } finally {
      setUniformLoading(false);
    }
  }, [user]);

  // Fetch Child ID orders
  const fetchChildIdOrders = useCallback(async (userEmail) => {
    if (!userEmail) return [];

    setChildIdLoading(true);
    try {
      console.log('🆔 Fetching Child ID orders for:', userEmail);

      // Create a mock API call - replace with actual API when available
      const mockChildIdOrders = [];

      // Only show Child ID orders if user has made a purchase
      // Check if user has recent Child ID orders from sessionStorage
      const recentChildIdPayment = sessionStorage.getItem("childIdPaymentCompleted");
      if (recentChildIdPayment && (Date.now() - parseInt(recentChildIdPayment)) < 86400000) {
        const recentOrder = {
          id: 'childid_recent',
          orderDate: new Date(parseInt(recentChildIdPayment)),
          studentName: sessionStorage.getItem("recentChildIdStudent") || (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Student'),
          amount: 1000, // $10
          paymentStatus: 'completed',
          orderStatus: 'processing',
          orderSource: 'standalone', // Mark as standalone purchase
          paymentIntentId: 'pi_recent_childid_' + parseInt(recentChildIdPayment)
        };
        mockChildIdOrders.unshift(recentOrder);
      }

      console.log('✅ Child ID orders fetched:', mockChildIdOrders.length, 'records');
      return mockChildIdOrders;
    } catch (error) {
      console.error('❌ Error fetching Child ID orders:', error);
      return [];
    } finally {
      setChildIdLoading(false);
    }
  }, [user]);

  const fetchPaymentData = useCallback(async () => {
    if (!user?.email || hasFetchedRef.current) return;

    console.log('🔄 Starting payment data fetch for user:', user.email);
    setLoading(true);
    setError(null);
    hasFetchedRef.current = true;

    try {
      const AuthUser = await MembershipService.findUserByEmail(user.email);
      console.log('👤 AuthUser data:', AuthUser);
      console.log('👤 AuthUser data:user', user);
      // Fetch all data in parallel but handle errors separately
      const [historyResult, statsResult, uniformResult, childIdResult] = await Promise.allSettled([
        fetchPaymentHistory(user.email),
        fetchPaymentStats(user?.uid),
        fetchUniformOrders(user.email),
        fetchChildIdOrders(user.email)
      ]);

      console.log("Payment_History_Details:", { historyResult, statsResult, uniformResult, childIdResult });


      // Handle payment history result
      if (historyResult.status === 'fulfilled') {
        const payments = historyResult.value?.payments || historyResult.value || [];
        const paymentArray = Array.isArray(payments) ? payments : [];
        setPaymentHistory(paymentArray);

        // If no payments found but user is paid, add fallback data
        if (paymentArray.length === 0) {
          addFallbackPaymentData();
        }
      } else {
        console.error('Payment history failed:', historyResult.reason);
        // Add fallback payment data if user recently made a payment
        addFallbackPaymentData();
        setError(historyResult.reason.message);
      }

      // Handle payment stats result (non-critical)
      let baseStats = null;
      if (statsResult.status === 'fulfilled') {
        baseStats = statsResult.value;
      } else {
        console.warn('Payment stats failed (non-critical):', statsResult.reason);
      }

      // Handle uniform orders result  
      let uniformOrdersData = [];
      if (uniformResult.status === 'fulfilled') {
        uniformOrdersData = uniformResult.value || [];
        setUniformOrders(uniformOrdersData);
      } else {
        console.warn('Uniform orders failed (non-critical):', uniformResult.reason);
        setUniformOrders([]);
      }

      // Handle Child ID orders result  
      let childIdOrdersData = [];
      if (childIdResult.status === 'fulfilled') {
        childIdOrdersData = childIdResult.value || [];
        setChildIdOrders(childIdOrdersData);
      } else {
        console.warn('Child ID orders failed (non-critical):', childIdResult.reason);
        setChildIdOrders([]);
      }

      // Handle payment stats - don't double count uniforms for one-time payments
      if (baseStats || uniformOrdersData.length > 0 || childIdOrdersData.length > 0) {
        // Only count standalone uniform orders (not included in one-time payments)
        const standaloneUniforms = uniformOrdersData.filter(order =>
          order.orderSource === 'dashboard' || order.orderSource === 'standalone'
        );
        const uniformAmount = standaloneUniforms.reduce((sum, order) => sum + (order.amount || 0), 0);
        const uniformSuccessful = standaloneUniforms.filter(order => order.paymentStatus === 'completed').length;
        const uniformPending = standaloneUniforms.filter(order => order.paymentStatus === 'pending').length;

        // Add Child ID orders (all standalone)
        const childIdAmount = childIdOrdersData.reduce((sum, order) => sum + (order.amount || 0), 0);
        const childIdSuccessful = childIdOrdersData.filter(order => order.paymentStatus === 'completed').length;
        const childIdPending = childIdOrdersData.filter(order => order.paymentStatus === 'pending').length;

        const combinedStats = {
          totalAmount: (baseStats?.totalAmount || 0),
          successfulPayments: (baseStats?.successfulPayments || 0),
          totalPayments: (baseStats?.totalPayments || 0),
          pendingPayments: (baseStats?.pendingPayments || 0),
          failedPayments: baseStats?.failedPayments || 0,
          lastPaymentDate: baseStats?.lastPaymentDate || null
        };

        console.log('📊 Combined payment stats (including Child ID):', combinedStats);
        setPaymentStats(combinedStats);
      } else if (baseStats) {
        setPaymentStats(baseStats);
      }

    } catch (error) {
      console.error('❌ Unexpected error in fetchPaymentData:', error);
      // Add fallback payment data if user recently made a payment
      addFallbackPaymentData();
      setError(error.message || 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  }, [user?.email, user?.uid, fetchPaymentHistory, fetchPaymentStats]);

  // Add fallback payment data if user recently completed payment
  const addFallbackPaymentData = useCallback(() => {
    const paymentCompleted = sessionStorage.getItem("paymentCompleted");
    const recentPayment = paymentCompleted && (Date.now() - parseInt(paymentCompleted)) < 86400000; // 24 hours

    if (recentPayment || (user?.isPaidMember && paymentHistory.length === 0)) {
      console.log('📝 Adding fallback payment record for recent/paid user');
      const fallbackPayments = [];

      // Add recent payment if exists - use correct amounts from stripe config
      if (recentPayment) {
        const planType = user?.membershipType || 'monthly';
        const isMonthly = planType === 'monthly';
        fallbackPayments.push({
          id: 'recent-payment',
          planName: isMonthly ? 'Monthly Membership' : 'One-Time Payment with Uniform',
          amount: isMonthly ? 5000 : 20000, // $50 monthly, $200 one-time (includes uniform)
          currency: 'USD',
          paymentStatus: 'completed',
          paymentDate: new Date(parseInt(paymentCompleted)),
          paymentMethod: 'card',
          planType: planType,
          paymentIntentId: 'fallback-' + Date.now(),
          includesUniform: !isMonthly // One-time payments include uniform
        });
      } else if (user?.isPaidMember) {
        // Add generic payment for paid members without history
        const planType = user?.membershipType || 'monthly';
        const isMonthly = planType === 'monthly';
        fallbackPayments.push({
          id: 'paid-member-payment',
          planName: isMonthly ? 'Monthly Membership' : 'One-Time Payment with Uniform',
          amount: isMonthly ? 5000 : 20000, // $50 monthly, $200 one-time (includes uniform)
          currency: 'USD',
          paymentStatus: 'completed',
          paymentDate: user?.membershipActivatedAt ? new Date(user.membershipActivatedAt) : new Date(),
          paymentMethod: 'card',
          planType: planType,
          paymentIntentId: 'existing-member-' + (user?.uid || 'unknown'),
          includesUniform: !isMonthly // One-time payments include uniform
        });
      }

      if (fallbackPayments.length > 0) {
        setPaymentHistory(fallbackPayments);

        // Update stats - don't double count uniforms already included in one-time payments
        const totalAmount = fallbackPayments.reduce((sum, payment) => sum + payment.amount, 0);
        // Only count standalone uniform orders (not included in one-time payments)
        const standaloneUniforms = uniformOrders.filter(order =>
          order.orderSource === 'dashboard' || order.orderSource === 'standalone'
        );
        const uniformAmount = standaloneUniforms.reduce((sum, order) => sum + (order.amount || 0), 0);

        setPaymentStats({
          totalAmount: totalAmount + uniformAmount,
          successfulPayments: fallbackPayments.length + standaloneUniforms.filter(order => order.paymentStatus === 'completed').length,
          totalPayments: fallbackPayments.length + standaloneUniforms.length,
          pendingPayments: standaloneUniforms.filter(order => order.paymentStatus === 'pending').length,
          failedPayments: 0,
          lastPaymentDate: fallbackPayments[0]?.paymentDate
        });
      }
    }
  }, [user, paymentHistory.length]);

  const handleRetry = useCallback(() => {
    console.log('🔄 Retrying payment data fetch...');
    hasFetchedRef.current = false;
    setRetryCount(prev => prev + 1);
    setError(null);
    fetchPaymentData();
  }, [fetchPaymentData]);

  // Test API directly (for debugging)
  const testAPI = useCallback(async () => {
    if (!user?.email) return;

    console.log('🧪 Testing payment API directly...');
    try {
      const testUrl = `${process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:5001/yau-app/us-central1/apis' : 'https://yau-app.onrender.com'}/payments/history/email/${encodeURIComponent(user.email)}`;
      console.log('🔗 Testing URL:', testUrl);

      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Response status:', response.status);
      const result = await response.text();
      console.log('📡 Raw response:', result);

      if (response.ok) {
        const jsonResult = JSON.parse(result);
        console.log('✅ API Test successful:', jsonResult);
        if (jsonResult.success && jsonResult.data) {
          setPaymentHistory(jsonResult.data.payments || jsonResult.data);
          setError(null);
        }
      } else {
        console.error('❌ API Test failed:', result);
      }
    } catch (error) {
      console.error('❌ API Test error:', error);
    }
  }, [user?.email]);

  const handleCancelMembership = async () => {
    if (!user?.email) return;

    const confirmCancel = window.confirm(
      "Are you sure you want to cancel your membership? You will lose access to member-only features at the end of your current billing period."
    );

    if (!confirmCancel) return;

    setCanceling(true);
    try {
      console.log('❌ Requesting membership cancellation for:', user.email);
      const result = await MembershipService.cancelMembership(user.email);

      if (result.success) {
        alert("Your membership has been canceled successfully. You will continue to have access until the end of your billing cycle.");
        // Refresh the page or update user context to reflect the change
        window.location.reload();
      }
    } catch (error) {
      console.error('❌ Error canceling membership:', error);
      alert(`Failed to cancel membership: ${error.message}`);
    } finally {
      setCanceling(false);
    }
  };

  useEffect(() => {
    if (user?.email && !hasFetchedRef.current) {
      fetchPaymentData();
    }
  }, [user?.email, fetchPaymentData]);

  // Reset fetch flag when user changes
  useEffect(() => {
    hasFetchedRef.current = false;
  }, [user?.email]);

  if (loading) {
    return (
      <div className="flex-1 p-6 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-6">Payments</h1>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading payment data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Payments</h1>
        {error && (
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <RefreshCcw className="text-sm" />
            Retry
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${activeTab === 'overview'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
            }`}
        >
          <div className="flex items-center space-x-2">
            <FaDollarSign className="text-sm" />
            <span>Overview</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('cards')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${activeTab === 'cards'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
            }`}
        >
          <div className="flex items-center space-x-2">
            <FaCreditCard className="text-sm" />
            <span>Payment Methods</span>
          </div>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700">
            <FaExclamationTriangle />
            <span className="font-medium">Error loading payment data</span>
          </div>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          {retryCount > 0 && (
            <p className="text-red-500 text-xs mt-1">Retry attempt: {retryCount}</p>
          )}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Status Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Payment Status</h2>
            <p className="text-lg mb-4">
              Status: <span className={`font-bold ${user?.isPaidMember ? 'text-green-600' : 'text-orange-600'}`}>
                {/* {user?.isPaidMember ? 'Paid' : 'Pending'} */}
                {user.isPaidMember ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    <CheckCircle size={12} />
                    Paid
                  </span>
                ) : user?.paymentStatus === 'Active' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    <CheckCircle size={12} />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                    <Clock size={12} />
                    Pending
                  </span>
                )}
              </span>
            </p>



            {!user?.isPaidMember && (
              <button
                onClick={() => navigate('/checkout')}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Make Payment
              </button>
            )}

            {user?.isPaidMember && user?.membershipType === 'monthly' && (
              <button
                onClick={handleCancelMembership}
                disabled={canceling}
                className={`w-full mt-4 px-6 py-3 border-2 border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2 ${canceling ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {canceling ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Canceling...
                  </>
                ) : (
                  <>
                    <FaTimes />
                    Cancel Monthly Membership
                  </>
                )}
              </button>
            )}

            {/* Payment Stats */}
            {statsLoading ? (
              <div className="mt-6 flex items-center justify-center py-8">
                <FaSpinner className="animate-spin text-2xl text-blue-600" />
              </div>
            ) : paymentStats ? (
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <FaDollarSign className="mx-auto text-2xl text-blue-600 mb-2" />
                  <div className="text-lg font-bold text-blue-800">
                    ${((paymentStats.totalAmount || 0) / 100).toFixed(2)}
                  </div>
                  <div className="text-sm text-blue-600">Total Paid</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <FaReceipt className="mx-auto text-2xl text-green-600 mb-2" />
                  <div className="text-lg font-bold text-green-800">
                    {paymentStats.successfulPayments || 0}
                  </div>
                  <div className="text-sm text-green-600">Successful</div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Payment History Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Payment History</h2>

            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <FaSpinner className="animate-spin text-2xl text-blue-600 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">Loading history...</p>
                </div>
              </div>
            ) : paymentHistory.length === 0 ? (
              <div className="text-center py-8">
                <FaReceipt className="mx-auto text-4xl text-gray-300 mb-4" />
                <p className="text-gray-500">No payment history available</p>
                {user?.isPaidMember && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-blue-700 text-sm">
                      Your payment was processed successfully, but history may take a few minutes to appear.
                    </p>
                    <button
                      onClick={testAPI}
                      className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      🔄 Refresh History
                    </button>
                  </div>
                )}
                {!user?.isPaidMember && (
                  <button
                    onClick={() => navigate('/checkout')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Make Your First Payment
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {paymentHistory?.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div>
                      <div className="font-medium">{payment.planName || 'Payment'}</div>
                      {payment.includesUniform && (
                        <div className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                          <FaTshirt className="text-xs" />
                          <span>Includes Uniform</span>
                        </div>
                      )}
                      {/* <div className="text-sm text-gray-600 flex items-center gap-1">
                      <FaCalendar className="text-xs" />
                      {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : 'N/A'}
                    </div> */}
                    </div>
                    <div className="text-right">
                      <div className="font-bold">${((payment.amount || 0) / 100).toFixed(2)}</div>
                      <div className={`text-xs font-medium ${payment.paymentStatus === 'completed' ? 'text-green-600' :
                          payment.paymentStatus === 'pending' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                        {(payment.paymentStatus || 'unknown').toUpperCase()}
                      </div>
                    </div>
                  </div>
                ))}
                {paymentHistory?.length > 5 && (
                  <button
                    onClick={() => {/* TODO: Navigate to full history page */ }}
                    className="w-full text-blue-600 hover:text-blue-800 text-sm mt-2 py-2 hover:bg-blue-50 rounded transition-colors"
                  >
                    View All History ({paymentHistory?.length} total)
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Uniform Orders Card */}
          {/* <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FaTshirt className="text-blue-600" />
            Uniform Orders
          </h2>
          
          {uniformLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <FaSpinner className="animate-spin text-2xl text-blue-600 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">Loading uniform orders...</p>
              </div>
            </div>
          ) : uniformOrders.length === 0 ? (
            <div className="text-center py-8">
              <FaTshirt className="mx-auto text-4xl text-gray-300 mb-4" />
              <p className="text-gray-500">No uniform orders yet</p>
              <button 
                onClick={() => navigate('/uniform')} 
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Order Your Uniform
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {uniformOrders.map((order) => (
                <div key={order.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div>
                    <div className="font-medium">{order.studentName}</div>
                    <div className="text-sm text-gray-600">
                      Top: {order.uniformTop} • Bottom: {order.uniformBottom}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center gap-1">
                      <FaCalendar className="text-xs" />
                      {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">${((order.amount || 0) / 100).toFixed(2)}</div>
                    <div className={`text-xs font-medium ${
                      order.paymentStatus === 'completed' ? 'text-green-600' : 
                      order.paymentStatus === 'pending' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {(order.paymentStatus || 'unknown').toUpperCase()}
                    </div>
                    <div className={`text-xs ${
                      order.orderStatus === 'delivered' ? 'text-green-600' : 
                      order.orderStatus === 'shipped' ? 'text-blue-600' :
                      order.orderStatus === 'processing' ? 'text-yellow-600' : 'text-gray-600'
                    }`}>
                      Order: {(order.orderStatus || 'pending').toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
              {uniformOrders.length > 3 && (
                <button 
                  onClick={() => navigate('/uniform')}
                  className="w-full text-blue-600 hover:text-blue-800 text-sm mt-2 py-2 hover:bg-blue-50 rounded transition-colors"
                >
                  View All Orders ({uniformOrders.length} total)
                </button>
              )}
            </div>
          )}
        </div> */}


        </div>
      ) : (
        /* Card Management Tab */
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <CardManagement userEmail={user?.email} />
        </div>
      )}
    </div>
  );
}

export default Payments;