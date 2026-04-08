import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { APIClient } from '../../firebase/ApiClient';
import { getCurrentUserData } from '../../firebase/apis/api-members';
import { FaShoppingBag, FaCheckCircle, FaClock, FaTshirt, FaUser, FaCalendar, FaCreditCard, FaTimes } from 'react-icons/fa';

const UniformOrders = () => {
  console.log('👕 UniformOrders component rendering');
  
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('all');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderFormData, setOrderFormData] = useState({
    studentId: '',
    studentName: '',
    ageGroup: '',
    uniformTop: 'Adult M',
    uniformBottom: 'Adult M',
    team: ''
  });
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [memberData, setMemberData] = useState(null);
  const [availableStudents, setAvailableStudents] = useState([]);

  useEffect(() => {
    if (user) {
      fetchMemberData();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      // Wait a bit for memberData to load, then fetch uniforms
      const timer = setTimeout(() => {
        fetchUniformOrders();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [user, memberData]);

  const fetchMemberData = async () => {
    try {
      if (!user?.email) {
        console.warn('⚠️ No user email available');
        return;
      }

      console.log('📋 Fetching member data for uniform ordering:', user.email);
      const userData = await getCurrentUserData(user.email);
      setMemberData(userData);
      
      // Set available students from member data
      const students = userData.students || [];
      setAvailableStudents(students);
      
      console.log('✅ Member data loaded for uniforms:', userData);
      console.log('👥 Available students:', students);
      
    } catch (error) {
      console.error('❌ Error fetching member data:', error);
    }
  };

  const fetchUniformOrders = async () => {
    try {
      if (!user?.uid) {
        console.warn('⚠️ No user UID available, setting empty orders');
        setOrders([]);
        setError('');
        return;
      }

      console.log('📋 Fetching uniform orders for parent:', user.uid);
      console.log('👤 User object:', { uid: user.uid, email: user.email });
      console.log('👥 Member data:', memberData);
      
      // First try with user.uid (Firebase Auth UID)
      let response = await APIClient.getUniformOrdersByParent(user.uid);
      console.log('🔍 Raw API response with user.uid:', response);
      console.log('🔍 Response type:', typeof response);
      console.log('🔍 Response keys:', response ? Object.keys(response) : 'null');
      
      // Handle different response formats
      let ordersData = [];
      if (Array.isArray(response)) {
        ordersData = response;
        console.log('✅ Response is direct array');
      } else if (response && typeof response === 'object') {
        console.log('📦 Response is object, checking properties...');
        if (Array.isArray(response.data)) {
          ordersData = response.data;
          console.log('✅ Found data property as array');
        } else if (response.success && Array.isArray(response.data)) {
          ordersData = response.data;
          console.log('✅ Found success response with data array');
        } else {
          console.warn('⚠️ Response object structure unexpected:', response);
        }
      } else {
        console.warn('⚠️ Response format unexpected:', response);
      }
      
      // If no orders found with user.uid, try with member document ID
      if (ordersData.length === 0 && memberData?.id) {
        console.log('👤 No orders with user.uid, trying with member document ID:', memberData.id);
        const secondResponse = await APIClient.getUniformOrdersByParent(memberData.id);
        console.log('🔍 API response with member.id:', secondResponse);
        
        if (secondResponse && Array.isArray(secondResponse)) {
          ordersData = secondResponse;
        } else if (secondResponse && secondResponse.data && Array.isArray(secondResponse.data)) {
          ordersData = secondResponse.data;
        } else if (secondResponse && secondResponse.success && Array.isArray(secondResponse.data)) {
          ordersData = secondResponse.data;
        }
      }
      
      setOrders(ordersData);
      console.log(`👕 Final result: Found ${ordersData.length} uniform orders`);
      
      if (ordersData.length === 0) {
        console.log('👕 No uniform orders found for parent:', user.uid, 'or member ID:', memberData?.id);
      }

    } catch (error) {
      console.error('❌ Error fetching uniform orders:', error);
      setError('Failed to load uniform orders. Please try again.');
      setOrders([]); // Ensure orders is still set to empty array
    } finally {
      setLoading(false);
    }
  };

  // Get unique students for filter
  const students = [...new Set(orders.map(order => order.studentName))];

  // Filter orders by selected student
  const filteredOrders = selectedStudent === 'all' 
    ? orders 
    : orders.filter(order => order.studentName === selectedStudent);

  // Group orders by student for better display
  const ordersByStudent = filteredOrders.reduce((acc, order) => {
    const studentName = order.studentName;
    if (!acc[studentName]) {
      acc[studentName] = [];
    }
    acc[studentName].push(order);
    return acc;
  }, {});

  const getStatusBadge = (order) => {
    if (order.paymentStatus !== 'completed') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <FaCreditCard className="mr-1 w-3 h-3" />
          Payment Pending
        </span>
      );
    }

    if (order.received) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <FaCheckCircle className="mr-1 w-3 h-3" />
          Ready for Pickup
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <FaClock className="mr-1 w-3 h-3" />
        Processing
      </span>
    );
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    
    if (!user?.uid) {
      setError('User not authenticated');
      return;
    }

    setSubmittingOrder(true);
    
    try {
      const uniformOrderData = {
        studentId: orderFormData.studentId,
        studentName: orderFormData.studentName,
        parentId: user.uid,
        parentName: memberData ? `${memberData.firstName || ''} ${memberData.lastName || ''}`.trim() : user.email?.split('@')[0] || 'Parent',
        parentEmail: user.email,
        parentPhone: memberData?.phone || '',
        team: orderFormData.team || memberData?.sport || 'SOCCER',
        ageGroup: orderFormData.ageGroup,
        uniformTop: orderFormData.uniformTop,
        uniformBottom: orderFormData.uniformBottom,
        orderDate: new Date().toISOString(),
        paymentStatus: 'pending',
        orderSource: 'member_request',
        received: false,
        status: 'payment_pending'
      };

      console.log('📝 Submitting uniform order request:', uniformOrderData);
      
      const response = await APIClient.createUniformOrder(uniformOrderData);
      
      if (response.success) {
        console.log('✅ Uniform order request created successfully');
        
        // Reset form
        setOrderFormData({
          studentId: '',
          studentName: '',
          ageGroup: '',
          uniformTop: 'Adult M',
          uniformBottom: 'Adult M',
          team: ''
        });
        
        setShowOrderForm(false);
        
        // Refresh orders list
        await fetchUniformOrders();
        
        // Show success message (you could add a toast notification here)
        alert('Uniform order request submitted! You will receive payment instructions shortly.');
        
        // Debug: Log the created order data
        console.log('✅ Successfully created uniform order with data:', uniformOrderData);
      }
    } catch (error) {
      console.error('❌ Error submitting uniform order:', error);
      setError('Failed to submit uniform order. Please try again.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading uniform orders...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <FaTshirt className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Uniform Orders</h1>
            </div>
            {Object.keys(ordersByStudent).length > 0 && availableStudents.length > 0 && (
              <button
                onClick={() => setShowOrderForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <FaTshirt className="mr-2 w-4 h-4" />
                Order New Uniform
              </button>
            )}
          </div>
          <p className="text-gray-600">
            Track your uniform purchases and delivery status
          </p>
          
          {/* Debug button - remove in production */}
          <div className="mt-4">
            <button
              onClick={() => {
                console.log('🔄 Manual refresh triggered');
                setLoading(true);
                fetchUniformOrders();
              }}
              className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded text-gray-600"
            >
              🔄 Refresh Orders (Debug)
            </button>
          </div>
        </div>

        {/* Uniform Order Form Modal */}
        {showOrderForm && (
          <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowOrderForm(false)}></div>
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
                <form onSubmit={handleOrderSubmit}>
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Order New Uniform
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowOrderForm(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <FaTimes className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="studentSelect" className="block text-sm font-medium text-gray-700">
                          Select Student *
                        </label>
                        <select
                          id="studentSelect"
                          required
                          value={orderFormData.studentId}
                          onChange={(e) => {
                            const selectedStudentId = e.target.value;
                            const selectedStudent = availableStudents.find(s => s.uid === selectedStudentId);
                            
                            if (selectedStudent) {
                              setOrderFormData({
                                ...orderFormData,
                                studentId: selectedStudent.uid,
                                studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
                                ageGroup: selectedStudent.ageGroup,
                                uniformTop: selectedStudent.uniformTop || 'Adult M',
                                uniformBottom: selectedStudent.uniformBottom || 'Adult M',
                                team: memberData?.sport || 'SOCCER'
                              });
                            } else {
                              setOrderFormData({
                                studentId: '',
                                studentName: '',
                                ageGroup: '',
                                uniformTop: 'Adult M',
                                uniformBottom: 'Adult M',
                                team: ''
                              });
                            }
                          }}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Choose a student...</option>
                          {availableStudents.map((student) => (
                            <option key={student.uid} value={student.uid}>
                              {student.firstName} {student.lastName} ({student.ageGroup})
                            </option>
                          ))}
                        </select>
                      </div>

                      {orderFormData.studentId && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-sm">
                            <div className="font-medium text-blue-900">Student Information:</div>
                            <div className="text-blue-700 mt-1">
                              <div>Name: {orderFormData.studentName}</div>
                              <div>Age Group: {orderFormData.ageGroup}</div>
                              <div>Sport: {memberData?.sport}</div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <label htmlFor="team" className="block text-sm font-medium text-gray-700">
                          Team/Sport
                        </label>
                        <input
                          type="text"
                          id="team"
                          value={orderFormData.team}
                          onChange={(e) => setOrderFormData({...orderFormData, team: e.target.value})}
                          placeholder={memberData?.sport || "e.g., SOCCER, Flag Football"}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="uniformTop" className="block text-sm font-medium text-gray-700">
                            Top Size *
                          </label>
                          <select
                            id="uniformTop"
                            required
                            value={orderFormData.uniformTop}
                            onChange={(e) => setOrderFormData({...orderFormData, uniformTop: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="Youth XS">Youth XS</option>
                            <option value="Youth S">Youth S</option>
                            <option value="Youth M">Youth M</option>
                            <option value="Youth L">Youth L</option>
                            <option value="Youth XL">Youth XL</option>
                            <option value="Adult XS">Adult XS</option>
                            <option value="Adult S">Adult S</option>
                            <option value="Adult M">Adult M</option>
                            <option value="Adult L">Adult L</option>
                            <option value="Adult XL">Adult XL</option>
                            <option value="Adult 2XL">Adult 2XL</option>
                            <option value="Adult 3XL">Adult 3XL</option>
                          </select>
                        </div>

                        <div>
                          <label htmlFor="uniformBottom" className="block text-sm font-medium text-gray-700">
                            Bottom Size *
                          </label>
                          <select
                            id="uniformBottom"
                            required
                            value={orderFormData.uniformBottom}
                            onChange={(e) => setOrderFormData({...orderFormData, uniformBottom: e.target.value})}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="Youth XS">Youth XS</option>
                            <option value="Youth S">Youth S</option>
                            <option value="Youth M">Youth M</option>
                            <option value="Youth L">Youth L</option>
                            <option value="Youth XL">Youth XL</option>
                            <option value="Adult XS">Adult XS</option>
                            <option value="Adult S">Adult S</option>
                            <option value="Adult M">Adult M</option>
                            <option value="Adult L">Adult L</option>
                            <option value="Adult XL">Adult XL</option>
                            <option value="Adult 2XL">Adult 2XL</option>
                            <option value="Adult 3XL">Adult 3XL</option>
                          </select>
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <FaTshirt className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">Price: $75 per uniform set</span>
                        </div>
                        <p className="text-xs text-blue-700 mt-1">
                          Payment instructions will be provided after submitting this request.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      disabled={submittingOrder || !orderFormData.studentId}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      {submittingOrder ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Submitting...
                        </>
                      ) : (
                        'Submit Order Request'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowOrderForm(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Student Filter */}
        {students.length > 1 && (
          <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Filter by student:</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Students ({orders.length} orders)</option>
                {students.map(student => (
                  <option key={student} value={student}>
                    {student} ({orders.filter(o => o.studentName === student).length} orders)
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Orders Display */}
        {Object.keys(ordersByStudent).length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <FaShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Uniform Orders</h3>
            <p className="text-gray-600 mb-4">
              You haven't purchased any uniforms yet.
            </p>
            <div className="space-y-3">
              {availableStudents.length > 0 ? (
                <button
                  onClick={() => setShowOrderForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <FaTshirt className="mr-2 w-4 h-4" />
                  Order Uniforms
                </button>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="text-sm text-yellow-700">
                    <div className="font-medium">No students found</div>
                    <div className="mt-1">
                      Please ensure you have registered students in your profile before ordering uniforms.
                    </div>
                  </div>
                </div>
              )}
              <p className="text-sm text-gray-500">
                Or contact the office for assistance with uniform orders.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(ordersByStudent).map(([studentName, studentOrders]) => (
              <div key={studentName} className="bg-white rounded-lg shadow-sm overflow-hidden">
                {/* Student Header */}
                <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FaUser className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">{studentName}</h3>
                      <span className="text-sm text-blue-600 font-medium">
                        {studentOrders.length} order{studentOrders.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Orders for this student */}
                <div className="divide-y divide-gray-200">
                  {studentOrders.map((order) => (
                    <div key={order.id} className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                        {/* Order Details */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <h4 className="text-lg font-medium text-gray-900">
                                Uniform Order #{order.id.slice(-6).toUpperCase()}
                              </h4>
                              {getStatusBadge(order)}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            {/* Sizes */}
                            <div>
                              <span className="font-medium text-gray-700">Sizes:</span>
                              <div className="mt-1">
                                <div>Top: <span className="font-medium">{order.uniformTop}</span></div>
                                <div>Bottom: <span className="font-medium">{order.uniformBottom}</span></div>
                              </div>
                            </div>

                            {/* Team & Age Group */}
                            <div>
                              <span className="font-medium text-gray-700">Team:</span>
                              <div className="mt-1">
                                <div>{order.team || 'Not specified'}</div>
                                {order.ageGroup && (
                                  <div className="text-gray-600">{order.ageGroup}</div>
                                )}
                              </div>
                            </div>

                            {/* Order Date */}
                            <div>
                              <span className="font-medium text-gray-700">Order Date:</span>
                              <div className="mt-1 flex items-center space-x-1">
                                <FaCalendar className="w-3 h-3 text-gray-400" />
                                <span>{formatDate(order.orderDate)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Status Details */}
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            {order.received ? (
                              <div className="text-green-700">
                                <div className="flex items-center space-x-2 mb-1">
                                  <FaCheckCircle className="w-4 h-4" />
                                  <span className="font-medium">Ready for Pickup!</span>
                                </div>
                                {order.receivedDate && (
                                  <div className="text-sm">
                                    Ready since: {formatDate(order.receivedDate)}
                                  </div>
                                )}
                                {order.notes && (
                                  <div className="text-sm mt-1">
                                    Note: {order.notes}
                                  </div>
                                )}
                              </div>
                            ) : order.paymentStatus !== 'completed' ? (
                              <div className="text-yellow-700">
                                <div className="flex items-center space-x-2 mb-1">
                                  <FaCreditCard className="w-4 h-4" />
                                  <span className="font-medium">Payment Processing</span>
                                </div>
                                <div className="text-sm">
                                  Your payment is being processed. You'll receive an email when your order is confirmed.
                                </div>
                              </div>
                            ) : (
                              <div className="text-blue-700">
                                <div className="flex items-center space-x-2 mb-1">
                                  <FaClock className="w-4 h-4" />
                                  <span className="font-medium">Order Processing</span>
                                </div>
                                <div className="text-sm">
                                  Your uniform is being prepared. We'll notify you when it's ready for pickup.
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Order Source */}
                          <div className="mt-2 text-xs text-gray-500">
                            Ordered via: {order.orderSource === 'registration' ? 'Registration' : 'Direct Order'}
                            {order.paymentIntentId && order.paymentIntentId.startsWith('pi_') && (
                              <span className="ml-2">• Payment ID: {order.paymentIntentId.slice(-8)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3">Uniform Information</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>• Uniforms are typically ready within 2-3 weeks of ordering</p>
            <p>• You'll receive an email notification when your order is ready for pickup</p>
            <p>• Pickup is available at practice sessions or by appointment</p>
            <p>• Contact the office at <a href="tel:301-292-3688" className="font-medium underline">301-292-3688</a> for questions</p>
          </div>
        </div>

        {/* Contact Section */}
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Questions about your uniform order?{' '}
            <a 
              href="mailto:Fun@YAUSports.org" 
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Contact us
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default UniformOrders;