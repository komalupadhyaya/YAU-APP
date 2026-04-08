import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { APIClient } from '../../firebase/ApiClient';
import { FaTshirt, FaCheckCircle, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const UniformDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUniformOrders();
  }, [user]);

  const fetchUniformOrders = async () => {
    try {
      if (!user?.uid) {
        console.warn('⚠️ No user UID available for uniform dashboard');
        setOrders([]);
        return;
      }

      const response = await APIClient.getUniformOrdersByParent(user.uid);
      setOrders(response.data || []);

    } catch (error) {
      console.error('❌ Error fetching uniform orders:', error);
      setError('Failed to load uniform data');
      setOrders([]); // Ensure orders is still set to empty array
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-3 text-red-600">
          <FaExclamationTriangle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  const totalOrders = orders.length;
  const readyOrders = orders.filter(order => order.received && order.paymentStatus === 'completed').length;
  const processingOrders = orders.filter(order => !order.received && order.paymentStatus === 'completed').length;
  const pendingPayment = orders.filter(order => order.paymentStatus !== 'completed').length;

  if (totalOrders === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-4">
          <FaTshirt className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Uniforms</h3>
        </div>
        <p className="text-gray-600 text-sm mb-4">
          No uniform orders found. Uniforms can be purchased during registration.
        </p>
        <Link 
          to="/uniform" 
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          View Uniform Orders →
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <FaTshirt className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Uniforms</h3>
        </div>
        <Link 
          to="/uniform" 
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          View All →
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{totalOrders}</div>
          <div className="text-sm text-gray-600">Total Orders</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{readyOrders}</div>
          <div className="text-sm text-gray-600">Ready for Pickup</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{processingOrders}</div>
          <div className="text-sm text-gray-600">Processing</div>
        </div>
      </div>

      {/* Status Alerts */}
      {readyOrders > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2">
            <FaCheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-green-800 text-sm font-medium">
              {readyOrders} uniform{readyOrders > 1 ? 's' : ''} ready for pickup!
            </span>
          </div>
        </div>
      )}

      {pendingPayment > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2">
            <FaExclamationTriangle className="w-4 h-4 text-yellow-600" />
            <span className="text-yellow-800 text-sm font-medium">
              {pendingPayment} order{pendingPayment > 1 ? 's' : ''} pending payment
            </span>
          </div>
        </div>
      )}

      {processingOrders > 0 && readyOrders === 0 && pendingPayment === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2">
            <FaClock className="w-4 h-4 text-blue-600" />
            <span className="text-blue-800 text-sm font-medium">
              Your uniforms are being processed
            </span>
          </div>
        </div>
      )}

      {/* Recent Orders Preview */}
      {orders.slice(0, 2).map((order) => (
        <div key={order.id} className="border-t border-gray-200 pt-3 mt-3 first:border-t-0 first:pt-0 first:mt-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900">{order.studentName}</div>
              <div className="text-xs text-gray-600">
                {order.uniformTop}/{order.uniformBottom} • {order.team || 'Team TBD'}
              </div>
            </div>
            <div className="text-right">
              {order.received ? (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Ready
                </span>
              ) : order.paymentStatus !== 'completed' ? (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Pending
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Processing
                </span>
              )}
            </div>
          </div>
        </div>
      ))}

      {orders.length > 2 && (
        <div className="border-t border-gray-200 pt-3 mt-3">
          <Link 
            to="/uniform" 
            className="text-center block text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            View {orders.length - 2} more orders →
          </Link>
        </div>
      )}
    </div>
  );
};

export default UniformDashboard;