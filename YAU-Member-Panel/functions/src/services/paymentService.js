const {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  writeBatch,
  updateDoc,
  query,
  serverTimestamp,
  where,
  limit,
} = require("firebase/firestore");
const {db} = require("../utils/firebase");
const UniformService = require("./uniformService");
const ChildIdService = require("./childIdService");
const MembershipService = require("./membershipService");

class PaymentService {
  // Create payment record in Firestore
  static async createPaymentRecord(paymentData) {
    try {
      console.log("💾 Creating payment record:", paymentData);

      // IDEMPOTENCY CHECK: Check if record already exists for this paymentIntentId
      if (paymentData.paymentIntentId) {
        const paymentQuery = query(
            collection(db, "payment_history"),
            where("paymentIntentId", "==", paymentData.paymentIntentId),
            limit(1),
        );
        const paymentSnapshot = await getDocs(paymentQuery);

        if (!paymentSnapshot.empty) {
          const existingDoc = paymentSnapshot.docs[0];
          console.log("ℹ️ Payment record already exists for:", paymentData.paymentIntentId);
          return {
            success: true,
            paymentHistoryId: existingDoc.id,
            paymentRecord: existingDoc.data(),
            alreadyExists: true,
          };
        }
      }

      const paymentRecord = {
        // User information
        userId: paymentData.userId,
        userEmail: paymentData.userEmail,

        // Payment details
        amount: paymentData.amount,
        currency: paymentData.currency || "USD",
        paymentMethod: paymentData.paymentMethod || "card",
        paymentStatus: paymentData.paymentStatus || "pending",
        paymentDate: paymentData.paymentDate || serverTimestamp(),

        // Plan information
        planType: paymentData.planType,
        planName: paymentData.planName,

        // Stripe details
        paymentIntentId: paymentData.paymentIntentId,
        subscriptionId: paymentData.subscriptionId || null,
        customerId: paymentData.customerId || null,

        // Transaction type
        transactionType: paymentData.transactionType || "one_time",

        // Metadata
        metadata: paymentData.metadata || {},

        // Timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        // Status tracking
        refundStatus: null,
        refundAmount: null,
        refundDate: null,

        // Additional fields
        description: `${paymentData.planName} - Payment`,
        receipt_url: null,
        invoice_pdf: null,
      };

      const docRef = await addDoc(collection(db, "payment_history"), paymentRecord);

      console.log("✅ Payment record created with ID:", docRef.id);

      return {
        success: true,
        paymentHistoryId: docRef.id,
        paymentRecord,
      };
    } catch (error) {
      console.error("❌ Error creating payment record:", error);
      throw new Error(`Failed to create payment record: ${error.message}`);
    }
  }

  // Update payment status
  static async updatePaymentStatus(paymentHistoryId, updates) {
    try {
      console.log("🔄 Updating payment status:", paymentHistoryId, updates);

      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
      };

      const paymentRef = doc(db, "payment_history", paymentHistoryId);
      await updateDoc(paymentRef, updateData);

      console.log("✅ Payment status updated successfully");
      return {success: true};
    } catch (error) {
      console.error("❌ Error updating payment status:", error);
      throw new Error(`Failed to update payment status: ${error.message}`);
    }
  }

  // Get user payment history with better error handling
  static async getUserPaymentHistory(userId, limitCount = 50) {
    try {
      console.log("📋 Fetching payment history for user:", userId);

      if (!userId) {
        console.log("⚠️ No userId provided, returning empty array");
        return [];
      }

      // Try with index-optimized query
      const paymentsQuery = query(
          collection(db, "payment_history"),
          where("userId", "==", userId),
          orderBy("paymentDate", "desc"),
          limit(limitCount),
      );

      const paymentsSnapshot = await getDocs(paymentsQuery);

      const payments = paymentsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          paymentDate: data.paymentDate?.toDate ? data.paymentDate.toDate() : data.paymentDate,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
        };
      });

      console.log(`✅ Found ${payments.length} payment records for user`);
      return payments;
    } catch (error) {
      console.error("❌ Error fetching payment history for user:", error);

      // If index error, try fallback query without ordering
      if (error.code === "failed-precondition") {
        console.log("🔄 Trying fallback query without ordering...");
        return await this.getUserPaymentHistoryFallback(userId, limitCount);
      }

      throw new Error(`Failed to fetch payment history: ${error.message}`);
    }
  }

  // Fallback method without ordering (while indexes are building)
  static async getUserPaymentHistoryFallback(userId, limitCount = 50) {
    try {
      console.log("🔄 Using fallback query for user:", userId);

      const paymentsQuery = query(
          collection(db, "payment_history"),
          where("userId", "==", userId),
          limit(limitCount),
      );

      const paymentsSnapshot = await getDocs(paymentsQuery);

      let payments = paymentsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          paymentDate: data.paymentDate?.toDate ? data.paymentDate.toDate() : data.paymentDate,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
        };
      });

      // Sort manually by paymentDate (newest first)
      payments = payments.sort((a, b) => {
        const dateA = new Date(a.paymentDate || 0);
        const dateB = new Date(b.paymentDate || 0);
        return dateB - dateA;
      });

      console.log(`✅ Found ${payments.length} payment records for user (fallback)`);
      return payments;
    } catch (error) {
      console.error("❌ Error in fallback query:", error);
      return []; // Return empty array instead of throwing
    }
  }

  // Get payment history by email with better error handling
  static async getPaymentHistoryByEmail(userEmail, limitCount = 50) {
    try {
      console.log("📋 Fetching payment history for email:", userEmail);

      if (!userEmail) {
        console.log("⚠️ No userEmail provided, returning empty array");
        return [];
      }

      const paymentsQuery = query(
          collection(db, "payment_history"),
          where("userEmail", "==", userEmail),
          orderBy("paymentDate", "desc"),
          limit(limitCount),
      );

      const paymentsSnapshot = await getDocs(paymentsQuery);

      const payments = paymentsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          paymentDate: data.paymentDate?.toDate ? data.paymentDate.toDate() : data.paymentDate,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
        };
      });

      console.log(`✅ Found ${payments.length} payment records for email`);
      return payments;
    } catch (error) {
      console.error("❌ Error fetching payment history by email:", error);

      // If index error, try fallback query without ordering
      if (error.code === "failed-precondition") {
        console.log("🔄 Trying fallback query for email without ordering...");
        return await this.getPaymentHistoryByEmailFallback(userEmail, limitCount);
      }

      throw new Error(`Failed to fetch payment history: ${error.message}`);
    }
  }

  // Fallback method for email queries
  static async getPaymentHistoryByEmailFallback(userEmail, limitCount = 50) {
    try {
      console.log("🔄 Using fallback query for email:", userEmail);

      const paymentsQuery = query(
          collection(db, "payment_history"),
          where("userEmail", "==", userEmail),
          limit(limitCount),
      );

      const paymentsSnapshot = await getDocs(paymentsQuery);

      let payments = paymentsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          paymentDate: data.paymentDate?.toDate ? data.paymentDate.toDate() : data.paymentDate,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
        };
      });

      // Sort manually by paymentDate (newest first)
      payments = payments.sort((a, b) => {
        const dateA = new Date(a.paymentDate || 0);
        const dateB = new Date(b.paymentDate || 0);
        return dateB - dateA;
      });

      console.log(`✅ Found ${payments.length} payment records for email (fallback)`);
      return payments;
    } catch (error) {
      console.error("❌ Error in email fallback query:", error);
      return []; // Return empty array instead of throwing
    }
  }

  // Get payment statistics with improved error handling
  static async getPaymentStats(userId) {
    try {
      console.log("📊 Getting payment stats for user:", userId);

      // FIXED: Better validation
      if (!userId || userId === "undefined" || userId === "null") {
        console.log("⚠️ No valid userId provided for stats");
        return {
          totalPayments: 0,
          totalAmount: 0,
          successfulPayments: 0,
          pendingPayments: 0,
          failedPayments: 0,
          refundedPayments: 0,
          lastPaymentDate: null,
          paymentMethods: {},
          planTypes: {},
          recentPayments: 0,
        };
      }

      // FIXED: Get payments with better error handling
      let payments = [];
      try {
        payments = await this.getUserPaymentHistory(userId, 100);
      } catch (error) {
        console.warn("⚠️ Could not fetch payment history for stats:", error.message);
      // Continue with empty array instead of failing completely
      }

      const stats = {
        totalPayments: payments.length,
        totalAmount: payments.reduce((sum, payment) => sum + (payment.amount || 0), 0),
        successfulPayments: payments.filter((p) => ["completed", "complete"].includes(p.paymentStatus)).length,
        pendingPayments: payments.filter((p) => p.paymentStatus === "pending").length,
        failedPayments: payments.filter((p) => p.paymentStatus === "failed").length,
        refundedPayments: payments.filter((p) => p.paymentStatus === "refunded").length,
        lastPaymentDate: payments.length > 0 ? payments[0].paymentDate : null,

        // Payment methods breakdown
        paymentMethods: payments.reduce((acc, payment) => {
          const method = payment.paymentMethod || "unknown";
          acc[method] = (acc[method] || 0) + 1;
          return acc;
        }, {}),

        // Plan types breakdown
        planTypes: payments.reduce((acc, payment) => {
          const plan = payment.planType || "unknown";
          acc[plan] = (acc[plan] || 0) + 1;
          return acc;
        }, {}),

        // Recent payments (last 30 days)
        recentPayments: payments.filter((p) => {
          if (!p.paymentDate) return false;
          const paymentDate = new Date(p.paymentDate);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return paymentDate >= thirtyDaysAgo;
        }).length,
      };

      console.log("✅ Payment stats calculated:", stats);
      return stats;
    } catch (error) {
      console.error("❌ Error calculating payment stats:", error);

      // FIXED: Return default stats instead of throwing
      return {
        totalPayments: 0,
        totalAmount: 0,
        successfulPayments: 0,
        pendingPayments: 0,
        failedPayments: 0,
        refundedPayments: 0,
        lastPaymentDate: null,
        paymentMethods: {},
        planTypes: {},
        recentPayments: 0,
        error: error.message,
      };
    }
  }

  // Rest of your existing methods remain the same...
  static async recordRefund(paymentHistoryId, refundData) {
    try {
      console.log("💸 Recording refund for payment:", paymentHistoryId, refundData);

      const refundUpdateData = {
        paymentStatus: "refunded",
        refundStatus: "completed",
        refundAmount: refundData.amount,
        refundDate: refundData.refundDate || serverTimestamp(),
        refundReason: refundData.reason || "user_requested",
        refundId: refundData.refundId,
        updatedAt: serverTimestamp(),
      };

      await this.updatePaymentStatus(paymentHistoryId, refundUpdateData);

      const refundRecord = {
        originalPaymentId: paymentHistoryId,
        refundAmount: refundData.amount,
        refundDate: refundData.refundDate || serverTimestamp(),
        refundReason: refundData.reason || "user_requested",
        refundId: refundData.refundId,
        refundStatus: "completed",
        createdAt: serverTimestamp(),
      };

      const refundDocRef = await addDoc(collection(db, "refund_history"), refundRecord);

      console.log("✅ Refund recorded successfully");
      return {
        success: true,
        refundRecordId: refundDocRef.id,
      };
    } catch (error) {
      console.error("❌ Error recording refund:", error);
      throw new Error(`Failed to record refund: ${error.message}`);
    }
  }

  // Handle Stripe webhook events
  static async handlePaymentSuccess(paymentIntent) {
    try {
      console.log("✅ Handling payment success:", paymentIntent.id);
      console.log("🔍 Payment intent metadata:", JSON.stringify(paymentIntent.metadata, null, 2));
      console.log("🔍 Checking for uniform order - productType:", paymentIntent.metadata?.productType);

      const paymentQuery = query(
          collection(db, "payment_history"),
          where("paymentIntentId", "==", paymentIntent.id),
          limit(1),
      );

      const paymentSnapshot = await getDocs(paymentQuery);

      if (paymentSnapshot.empty) {
        console.warn("⚠️ No payment record found for payment intent:", paymentIntent.id);
        return;
      }

      const paymentDoc = paymentSnapshot.docs[0];
      const paymentData = paymentDoc.data();

      await updateDoc(paymentDoc.ref, {
        paymentStatus: "completed",
        receipt_url: paymentIntent.charges?.data[0]?.receipt_url || null,
        stripeCustomerId: paymentIntent.customer || paymentData.customerId,
        updatedAt: serverTimestamp(),
      });

      console.log("✅ Payment record updated to completed");

      // Update member record with customer ID if not already set
      if (paymentIntent.customer && paymentData.userEmail) {
        try {
          const memberData = await MembershipService.findUserByEmail(paymentData.userEmail);
          
          if (memberData && !memberData.stripeCustomerId) {
            await MembershipService.updateMemberData(paymentData.userEmail, {
              stripeCustomerId: paymentIntent.customer,
              updatedAt: new Date(),
            });
            console.log("✅ Member updated with customer ID from payment success");
          }
        } catch (updateError) {
          console.warn("⚠️ Failed to update member with customer ID:", updateError.message);
        }
      }

      // Ensure payment method is attached to customer
      if (paymentIntent.payment_method && paymentIntent.customer) {
        try {
          console.log("🔗 Ensuring payment method is attached to customer:", {
            paymentMethodId: paymentIntent.payment_method,
            customerId: paymentIntent.customer
          });

          const StripeService = require("./stripeService");
          
          // Check if payment method is already attached
          const paymentMethods = await StripeService.getPaymentMethods(paymentIntent.customer);
          const isAlreadyAttached = paymentMethods.paymentMethods.some(
            pm => pm.id === paymentIntent.payment_method
          );

          if (!isAlreadyAttached) {
            // Attach the payment method to the customer
            await StripeService.attachPaymentMethod(
              paymentIntent.payment_method, 
              paymentIntent.customer
            );
            console.log("✅ Payment method attached to customer successfully");
          } else {
            console.log("ℹ️ Payment method already attached to customer");
          }
        } catch (attachError) {
          console.warn("⚠️ Failed to attach payment method to customer:", attachError.message);
          // Don't fail the webhook for this
        }
      }

      // 🆕 Create uniform orders if uniforms were purchased
      if (paymentData.metadata?.includeUniform && paymentData.metadata?.registrationData) {
        try {
          console.log('👕 Creating uniform orders from registration payment success');
          await this.createUniformOrdersFromPayment(paymentData, paymentIntent.id);
        } catch (uniformError) {
          console.warn('⚠️ Failed to create uniform orders from payment:', uniformError.message);
          // Don't fail the payment for uniform tracking issues
        }
      }

      // 🆕 Handle standalone uniform orders (from dashboard)
      console.log('🔍 Checking uniform order conditions:');
      console.log('   paymentData.metadata?.productType:', paymentData.metadata?.productType);
      console.log('   paymentData.planType:', paymentData.planType);
      console.log('   paymentIntent.metadata?.productType:', paymentIntent.metadata?.productType);
      console.log('   paymentIntent.metadata full object:', JSON.stringify(paymentIntent.metadata, null, 2));
      
      if (paymentIntent.metadata?.productType === 'uniform') {
        try {
          console.log('👕 ✅ UNIFORM ORDER DETECTED! Creating standalone uniform order from payment success');
          console.log('👕 Payment intent data for uniform:', {
            id: paymentIntent.id,
            amount: paymentIntent.amount,
            metadata: paymentIntent.metadata,
            customer: paymentIntent.customer,
            receipt_email: paymentIntent.receipt_email
          });
          
          await this.createStandaloneUniformOrder(paymentIntent, paymentIntent.id);
          console.log('👕 ✅ Uniform order creation completed successfully!');
        } catch (uniformError) {
          console.error('❌ Failed to create standalone uniform order:', uniformError.message);
          console.error('❌ Error stack:', uniformError.stack);
          console.error('❌ Payment intent data was:', paymentIntent);
          // Don't fail the payment for uniform tracking issues
        }
      } else {
        console.log('❌ No uniform order detected - not a uniform payment');
        console.log('   Expected: productType === "uniform"');
        console.log('   Got metadata:', paymentIntent.metadata);
      }

      // 🆕 Handle Child ID orders
      if (paymentIntent.metadata?.productType === 'childId') {
        try {
          console.log('🆔 ✅ CHILD ID ORDER DETECTED! Creating Child ID order from payment success');
          console.log('🆔 Payment intent data for Child ID:', {
            id: paymentIntent.id,
            amount: paymentIntent.amount,
            metadata: paymentIntent.metadata,
            customer: paymentIntent.customer,
            receipt_email: paymentIntent.receipt_email
          });
          
          await this.createStandaloneChildIdOrder(paymentIntent, paymentIntent.id);
          console.log('🆔 ✅ Child ID order creation completed successfully!');
        } catch (childIdError) {
          console.error('❌ Failed to create Child ID order:', childIdError.message);
          console.error('❌ Error stack:', childIdError.stack);
          console.error('❌ Payment intent data was:', paymentIntent);
          // Don't fail the payment for Child ID tracking issues
        }
      }
    } catch (error) {
      console.error("❌ Error handling payment success:", error);
      throw error;
    }
  }

  // 🆕 Helper function to create uniform orders from payment data
  static async createUniformOrdersFromPayment(paymentData, paymentIntentId) {
    try {
      const registrationData = paymentData.metadata?.registrationData;
      
      if (!registrationData || !registrationData.memberData?.students) {
        console.log('⚠️ No student data found in payment metadata');
        return;
      }

      const memberData = registrationData.memberData;
      const userEmail = registrationData.userEmail;
      const userUID = registrationData.userUID;

      console.log(`👕 Creating uniform orders for ${memberData.students.length} students`);

      // Create uniform orders for each student
      for (const student of memberData.students) {
        if (student.uniformTop || student.uniformBottom || memberData.uniformTop || memberData.uniformBottom) {
          const uniformOrderData = {
            studentId: student.uid || `${userUID}_${student.firstName}`,
            studentName: `${student.firstName} ${student.lastName}`,
            parentId: userUID,
            parentName: `${memberData.firstName} ${memberData.lastName}`,
            parentEmail: userEmail,
            team: memberData.sport || 'YAU',
            ageGroup: student.ageGroup || '',
            uniformTop: student.uniformTop || memberData.uniformTop || 'M',
            uniformBottom: student.uniformBottom || memberData.uniformBottom || 'M',
            orderDate: new Date().toISOString(),
            paymentIntentId: paymentIntentId,
            paymentStatus: 'completed',
            orderSource: 'included_in_payment', // Mark as included in one-time payment
            received: false
          };

          console.log('👕 Creating uniform order for student:', uniformOrderData.studentName);
          
          await UniformService.createUniformOrder(uniformOrderData);
        }
      }

      console.log('✅ All uniform orders created successfully from payment');
    } catch (error) {
      console.error('❌ Error creating uniform orders from payment:', error);
      throw error;
    }
  }

  // 🆕 Helper function to create standalone uniform orders from dashboard purchases
  static async createStandaloneUniformOrder(paymentData, paymentIntentId) {
    try {
      console.log('👕 Creating standalone uniform order from payment intent:', paymentIntentId);
      console.log('👕 Payment data received:', JSON.stringify(paymentData, null, 2));

      // Extract user info from metadata or customer data
      const userId = paymentData.metadata?.userId || paymentData.customer?.email || 'unknown';
      const userEmail = paymentData.metadata?.userEmail || paymentData.receipt_email || paymentData.customer?.email || '';
      const userName = paymentData.metadata?.userName || paymentData.customer?.name || userEmail.split('@')[0] || 'Unknown';
      
      console.log('👤 Extracted user info from payment:', {
        userId,
        userEmail,
        userName,
        amount: paymentData.amount
      });

      const uniformOrderData = {
        studentId: userId,
        studentName: userName || 'Student',
        parentId: userId,
        parentName: userName || 'Parent',
        parentEmail: userEmail,
        parentPhone: '', // Can be enhanced to get from user data
        team: 'YAU', // Can be enhanced to get from user data  
        ageGroup: 'General', // Can be enhanced to get from user data
        uniformTop: paymentData.metadata?.uniformTop || 'Adult M',
        uniformBottom: paymentData.metadata?.uniformBottom || 'Adult M',
        orderDate: new Date(),
        paymentIntentId: paymentIntentId,
        paymentStatus: 'completed',
        orderStatus: 'processing',
        orderSource: 'standalone', // Mark as standalone uniform purchase
        received: false,
        amount: paymentData.amount || 7500, // $75 default
        quantity: paymentData.metadata?.quantity || 1,
        notes: `Webhook order - Payment: ${paymentIntentId}`,
        createdBy: 'webhook',
        createdVia: 'stripe_webhook',
        stripePaymentStatus: 'succeeded',
        // Additional tracking
        webhookTimestamp: new Date().toISOString(),
        lastUpdated: new Date(),
        lastUpdatedBy: 'stripe_webhook',
        lastUpdatedByName: 'Stripe Webhook'
      };

      console.log('👕 Creating standalone uniform order with data:', JSON.stringify(uniformOrderData, null, 2));
      
      console.log('👕 Calling UniformService.createUniformOrder...');
      const result = await UniformService.createUniformOrder(uniformOrderData);
      console.log('👕 UniformService.createUniformOrder result:', result);
      
      console.log('✅ Standalone uniform order created successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Error creating standalone uniform order:', error);
      console.error('❌ Payment data was:', paymentData);
      throw error;
    }
  }

  // 🆕 Helper function to create standalone Child ID orders from dashboard purchases
  static async createStandaloneChildIdOrder(paymentData, paymentIntentId) {
    try {
      console.log('🆔 Creating standalone Child ID order from payment intent:', paymentIntentId);
      console.log('🆔 Payment data received:', JSON.stringify(paymentData, null, 2));

      // Extract user info from metadata or customer data
      const userId = paymentData.metadata?.userId || paymentData.customer?.email || 'unknown';
      const userEmail = paymentData.metadata?.userEmail || paymentData.receipt_email || paymentData.customer?.email || '';
      const userName = paymentData.metadata?.userName || paymentData.customer?.name || userEmail.split('@')[0] || 'Unknown';
      const studentName = paymentData.metadata?.studentName || userName || 'Student';
      
      console.log('👤 Extracted user info from payment:', {
        userId,
        userEmail,
        userName,
        studentName,
        amount: paymentData.amount
      });

      const childIdOrderData = {
        studentId: paymentData.metadata?.studentId || userId,
        studentName: studentName,
        parentId: userId,
        parentName: userName || 'Parent',
        parentEmail: userEmail,
        parentPhone: '', // Can be enhanced to get from user data
        team: 'YAU', // Can be enhanced to get from user data  
        ageGroup: paymentData.metadata?.ageGroup || 'General',
        orderDate: new Date(),
        paymentIntentId: paymentIntentId,
        paymentStatus: 'completed',
        orderStatus: 'processing',
        orderSource: 'standalone',
        received: false,
        amount: paymentData.amount || 1000, // $10 default
        notes: `Child ID order - Payment: ${paymentIntentId}`,
        createdBy: 'webhook',
        createdVia: 'stripe_webhook',
        // Additional tracking
        webhookTimestamp: new Date().toISOString(),
        lastUpdated: new Date(),
        lastUpdatedBy: 'stripe_webhook',
        lastUpdatedByName: 'Stripe Webhook'
      };

      console.log('🆔 Creating standalone Child ID order with data:', JSON.stringify(childIdOrderData, null, 2));
      
      console.log('🆔 Calling ChildIdService.createChildIdOrder...');
      const result = await ChildIdService.createChildIdOrder(childIdOrderData);
      console.log('🆔 ChildIdService.createChildIdOrder result:', result);
      
      console.log('✅ Standalone Child ID order created successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Error creating standalone Child ID order:', error);
      console.error('❌ Payment data was:', paymentData);
      throw error;
    }
  }

  static async handlePaymentFailed(paymentIntent) {
    try {
      console.log("❌ Handling payment failure:", paymentIntent.id);

      const paymentQuery = query(
          collection(db, "payment_history"),
          where("paymentIntentId", "==", paymentIntent.id),
          limit(1),
      );

      const paymentSnapshot = await getDocs(paymentQuery);

      if (paymentSnapshot.empty) {
        console.warn("⚠️ No payment record found for failed payment intent:", paymentIntent.id);
        return;
      }

      const paymentDoc = paymentSnapshot.docs[0];

      await updateDoc(paymentDoc.ref, {
        paymentStatus: "failed",
        failureReason: paymentIntent.last_payment_error?.message || "Payment failed",
        updatedAt: serverTimestamp(),
      });

      console.log("✅ Payment record updated to failed");
    } catch (error) {
      console.error("❌ Error handling payment failure:", error);
      throw error;
    }
  }

  static async handleSubscriptionPaymentSuccess(invoice) {
    try {
      console.log("💳 Handling subscription payment success:", invoice.id);

      const subscriptionPayment = {
        userEmail: invoice.customer_email,
        userId: invoice.metadata?.userId,
        amount: invoice.amount_paid,
        currency: invoice.currency?.toUpperCase() || "USD",
        paymentMethod: "card",
        paymentStatus: "completed", // ✅ Automatically completed for subscriptions
        planType: "monthly",
        planName: "Monthly Subscription",
        paymentIntentId: invoice.payment_intent,
        subscriptionId: invoice.subscription,
        customerId: invoice.customer,
        transactionType: "subscription",
        description: "Monthly subscription payment",
        receipt_url: invoice.hosted_invoice_url,
        invoice_pdf: invoice.invoice_pdf,
        paymentDate: new Date(invoice.created * 1000),
        metadata: {
          invoiceId: invoice.id,
          subscriptionPeriodStart: new Date(invoice.period_start * 1000),
          subscriptionPeriodEnd: new Date(invoice.period_end * 1000),
        },
      };

      await this.createPaymentRecord(subscriptionPayment);

      console.log("✅ Subscription payment record created as completed");
    } catch (error) {
      console.error("❌ Error handling subscription payment success:", error);
      throw error;
    }
  }


  // Handle subscription creation (when subscription is first created)
  static async handleSubscriptionCreated(subscription) {
    try {
      console.log("🔄 Handling subscription creation:", subscription.id);

      // Get customer email from subscription
      const stripe = require("../config/stripe").stripe;
      const customer = await stripe.customers.retrieve(subscription.customer);
      
      // Get the latest invoice to get payment details
      const latestInvoice = subscription.latest_invoice;
      let invoice = null;
      if (latestInvoice) {
        invoice = typeof latestInvoice === 'string' 
          ? await stripe.invoices.retrieve(latestInvoice)
          : latestInvoice;
      }

      // Calculate amount from subscription items
      const amount = subscription.items.data.reduce((sum, item) => {
        return sum + (item.price.unit_amount * item.quantity);
      }, 0);

      const subscriptionRecord = {
        userEmail: customer.email,
        userId: subscription.metadata?.userId || customer.metadata?.userId,
        amount: amount,
        currency: subscription.currency?.toUpperCase() || "USD",
        paymentMethod: "card",
        paymentStatus: subscription.status === 'active' ? "completed" : "pending", // incomplete subscriptions are pending
        planType: "monthly",
        planName: "Monthly Subscription",
        paymentIntentId: invoice?.payment_intent || null,
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        transactionType: "subscription",
        description: "Monthly subscription",
        paymentDate: new Date(subscription.created * 1000),
        metadata: {
          subscriptionStatus: subscription.status,
          subscriptionCurrentPeriodStart: new Date(subscription.current_period_start * 1000),
          subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
          quantity: subscription.items.data[0]?.quantity || 1,
          childrenCount: subscription.metadata?.childrenCount || subscription.items.data[0]?.quantity || 1,
        },
      };

      await this.createPaymentRecord(subscriptionRecord);

      console.log("✅ Subscription record created:", subscription.id);
    } catch (error) {
      console.error("❌ Error handling subscription creation:", error);
      throw error;
    }
  }

  static async handleSubscriptionCanceled(subscription) {
    try {
      console.log("❌ Handling subscription cancellation:", subscription.id);

      // Update member status to Canceled
      if (subscription.customer) {
        try {
          await this.updateMemberStatusFromStripe(subscription.customer, 'Canceled');
        } catch (memberError) {
          console.warn("⚠️ Failed to update member status:", memberError.message);
        }
      }

      const subscriptionQuery = query(
          collection(db, "payment_history"),
          where("subscriptionId", "==", subscription.id),
      );

      const subscriptionSnapshot = await getDocs(subscriptionQuery);

      const batch = writeBatch(db);

      subscriptionSnapshot.docs.forEach((docSnap) => {
        batch.update(docSnap.ref, {
          subscriptionStatus: "canceled",
          subscriptionCanceledAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit();

      console.log(`✅ Updated ${subscriptionSnapshot.docs.length} payment records for canceled subscription`);
    } catch (error) {
      console.error("❌ Error handling subscription cancellation:", error);
      throw error;
    }
  }

  // New webhook handlers for member status sync
  static async handleInvoicePaymentFailed(invoice) {
    try {
      console.log("❌ Handling invoice payment failure:", invoice.id);

      // Update member status to Past Due
      if (invoice.customer) {
        await this.updateMemberStatusFromStripe(invoice.customer, 'Past Due');
      }

      console.log("✅ Member status updated to Past Due");
    } catch (error) {
      console.error("❌ Error handling invoice payment failure:", error);
      throw error;
    }
  }

  static async handleSubscriptionUpdated(subscription) {
    try {
      console.log("🔄 Handling subscription update:", subscription.id);

      // Update member status based on subscription status
      let memberStatus = 'Active';
      if (subscription.status === 'past_due') {
        memberStatus = 'Past Due';
      } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
        memberStatus = 'Canceled';
      } else if (subscription.status === 'active') {
        memberStatus = 'Active';
      }

      if (subscription.customer) {
        await this.updateMemberStatusFromStripe(subscription.customer, memberStatus, {
          next_payment_date: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
          subscription_status: subscription.status,
          plan_type: subscription.items?.data[0]?.price?.recurring?.interval || 'monthly'
        });
      }

      console.log(`✅ Member status updated to ${memberStatus}`);
    } catch (error) {
      console.error("❌ Error handling subscription update:", error);
      throw error;
    }
  }

  // Update member status from Stripe customer ID
  static async updateMemberStatusFromStripe(stripeCustomerId, status, additionalData = {}) {
    try {
      console.log(`🔄 Updating member status from Stripe customer ${stripeCustomerId} to ${status}`);

      const memberQuery = query(
        collection(db, "members"),
        where("stripeCustomerId", "==", stripeCustomerId),
        limit(1)
      );

      const memberSnapshot = await getDocs(memberQuery);

      if (memberSnapshot.empty) {
        console.warn("⚠️ No member found with Stripe customer ID:", stripeCustomerId);
        return;
      }

      const memberDoc = memberSnapshot.docs[0];

      const updateData = {
        paymentStatus: status,
        lastPaymentUpdate: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...additionalData
      };

      await updateDoc(memberDoc.ref, updateData);

      console.log(`✅ Member status updated to ${status}`);
    } catch (error) {
      console.error("❌ Error updating member status from Stripe:", error);
      throw error;
    }
  }

  // Webhook logging methods
  static async logWebhookEvent(event, status = 'processing') {
    try {
      const webhookLog = {
        eventId: event.id,
        eventType: event.type,
        status: status, // processing, completed, failed
        data: event.data,
        metadata: event.metadata || {},
        created: new Date(event.created * 1000),
        attempts: 1,
        lastAttempt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "webhook_logs"), webhookLog);
      console.log(`📝 Webhook event logged: ${event.type} (${docRef.id})`);

      return docRef.id;
    } catch (error) {
      console.error("❌ Error logging webhook event:", error);
      return null;
    }
  }

  static async updateWebhookLog(logId, status, errorMessage = null) {
    try {
      const logRef = doc(db, "webhook_logs", logId);

      const updateData = {
        status: status,
        updatedAt: serverTimestamp(),
        lastAttempt: serverTimestamp(),
      };

      if (errorMessage) {
        updateData.errorMessage = errorMessage;
      }

      await updateDoc(logRef, updateData);
      console.log(`📝 Webhook log updated: ${status} (${logId})`);
    } catch (error) {
      console.error("❌ Error updating webhook log:", error);
    }
  }
}

module.exports = PaymentService;
