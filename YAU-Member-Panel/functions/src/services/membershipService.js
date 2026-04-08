const {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  serverTimestamp,
  where,
  setDoc,
} = require("firebase/firestore");
const {db} = require("../utils/firebase");

class MembershipService {
  // Find user in both collections by email
  static async findUserByEmail(email) {
    try {
      console.log("🔍 Searching for user with email:", email);

      // First check members collection
      const membersQuery = query(
          collection(db, "members"),
          where("email", "==", email),
      );
      const membersSnapshot = await getDocs(membersQuery);

      if (!membersSnapshot.empty) {
        const userDoc = membersSnapshot.docs[0];
        console.log("✅ Found user in members collection");
        return {
          id: userDoc.id,
          data: userDoc.data(),
          collection: "members",
          docRef: userDoc.ref,
        };
      }

      // Then check registrations collection
      const registrationsQuery = query(
          collection(db, "registrations"),
          where("email", "==", email),
      );
      const registrationsSnapshot = await getDocs(registrationsQuery);

      if (!registrationsSnapshot.empty) {
        const userDoc = registrationsSnapshot.docs[0];
        console.log("✅ Found user in registrations collection");
        return {
          id: userDoc.id,
          data: userDoc.data(),
          collection: "registrations",
          docRef: userDoc.ref,
        };
      }

      console.log("❌ User not found in any collection");
      return null;
    } catch (error) {
      console.error("❌ Error finding user:", error);
      throw error;
    }
  }

  // Update user membership status
  static async upgradeMembership(userEmail, membershipDetails) {
    try {
      console.log("💳 Upgrading membership for:", userEmail);

      // Find user in database
      const userInfo = await this.findUserByEmail(userEmail);
      if (!userInfo) {
        throw new Error("User not found in database");
      }

      // Prepare update data using client SDK serverTimestamp
      const updateData = {
        // Membership status
        isPaidMember: true,
        membershipType: membershipDetails.planType || "monthly",
        membershipActivatedAt: serverTimestamp(),
        lastPaymentDate: serverTimestamp(),

        // Payment details
        paymentStatus: "active",
        paymentMethod: membershipDetails.paymentMethod || "card",

        // If upgrading from registrations to members
        upgradedAt: serverTimestamp(),
        upgradedFrom: userInfo.collection,

        // Update timestamps
        updatedAt: serverTimestamp(),

        // Additional payment info
        ...(membershipDetails.paymentIntentId && {
          paymentIntentId: membershipDetails.paymentIntentId,
        }),
        ...(membershipDetails.subscriptionId && {
          subscriptionId: membershipDetails.subscriptionId,
        }),
        ...(membershipDetails.customerId && {
          customerId: membershipDetails.customerId,
        }),
      };

      // Update the user document using client SDK
      await updateDoc(userInfo.docRef, updateData);

      console.log("✅ Membership upgraded successfully");

      return {
        success: true,
        userId: userInfo.id,
        collection: userInfo.collection,
        updatedData: {...userInfo.data, ...updateData},
      };
    } catch (error) {
      console.error("❌ Error upgrading membership:", error);
      throw error;
    }
  }

  // Get user membership status
  static async getMembershipStatus(userEmail) {
    try {
      const userInfo = await this.findUserByEmail(userEmail);
      if (!userInfo) {
        return null;
      }

      return {
        isPaidMember: userInfo.data.isPaidMember || false,
        membershipType: userInfo.data.membershipType || null,
        paymentStatus: userInfo.data.paymentStatus || "inactive",
        membershipActivatedAt: userInfo.data.membershipActivatedAt || null,
        collection: userInfo.collection,
      };
    } catch (error) {
      console.error("❌ Error getting membership status:", error);
      throw error;
    }
  }

  // Cancel membership (downgrade)
  static async cancelMembership(userEmail, reason = "user_requested") {
    try {
      console.log("❌ Canceling membership for:", userEmail);

      const userInfo = await this.findUserByEmail(userEmail);
      if (!userInfo) {
        throw new Error("User not found");
      }

      // 1. Cancel Stripe subscription if it exists
      if (userInfo.data.subscriptionId) {
        try {
          console.log("💳 Canceling Stripe subscription:", userInfo.data.subscriptionId);
          // Lazy load StripeService to avoid potential circular dependencies
          const StripeService = require("./stripeService");
          await StripeService.cancelSubscription(userInfo.data.subscriptionId, reason);
          console.log("✅ Stripe subscription canceled successfully");
        } catch (stripeError) {
          console.warn("⚠️ Failed to cancel Stripe subscription:", stripeError.message);
          // We continue anyway to update the local database, but log the error
        }
      } else {
        console.log("ℹ️ No Stripe subscription ID found for user, skipping Stripe cancellation");
      }

      // 2. Update local database
      const updateData = {
        isPaidMember: false,
        paymentStatus: "canceled",
        membershipCanceledAt: serverTimestamp(),
        cancellationReason: reason,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(userInfo.docRef, updateData);

      console.log("✅ Membership canceled successfully in database");
      return {success: true};
    } catch (error) {
      console.error("❌ Error canceling membership:", error);
      throw error;
    }
  }

  // Create new member
  static async createMember(memberData) {
    try {
      console.log("👤 Creating new member:", memberData.email);

      const memberRef = doc(db, "members", memberData.uid);
      const memberDoc = {
        ...memberData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isPaidMember: memberData.isPaidMember || false,
        paymentStatus: memberData.paymentStatus || "inactive",
      };

      await setDoc(memberRef, memberDoc);

      console.log("✅ Member created successfully");
      return {
        success: true,
        memberId: memberData.uid,
        data: memberDoc,
      };
    } catch (error) {
      console.error("❌ Error creating member:", error);
      throw error;
    }
  }

  // Update member data with specific fields
  static async updateMemberData(userEmail, updateFields) {
    try {
      console.log("🔄 Updating member data for:", userEmail);

      const userInfo = await this.findUserByEmail(userEmail);
      if (!userInfo) {
        throw new Error("User not found");
      }

      const updateData = {
        ...updateFields,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(userInfo.docRef, updateData);

      console.log("✅ Member data updated successfully");
      return {
        success: true,
        userId: userInfo.id,
        collection: userInfo.collection,
      };
    } catch (error) {
      console.error("❌ Error updating member data:", error);
      throw error;
    }
  }

  // Move user from registrations to members collection
  static async moveToMembersCollection(userEmail, membershipDetails) {
    try {
      console.log("🔄 Moving user to members collection:", userEmail);

      // Find user in registrations collection
      const userInfo = await this.findUserByEmail(userEmail);
      if (!userInfo) {
        throw new Error("User not found");
      }

      if (userInfo.collection === "members") {
        // Already in members collection, just update
        return await this.upgradeMembership(userEmail, membershipDetails);
      }

      // Create new document in members collection
      const memberData = {
        ...userInfo.data,
        // Upgrade fields
        isPaidMember: true,
        membershipType: membershipDetails.planType || "monthly",
        membershipActivatedAt: serverTimestamp(),
        lastPaymentDate: serverTimestamp(),
        paymentStatus: "active",

        // Migration fields
        migratedFrom: "registrations",
        migratedAt: serverTimestamp(),
        originalRegistrationId: userInfo.id,

        // Payment details
        ...(membershipDetails.paymentIntentId && {
          paymentIntentId: membershipDetails.paymentIntentId,
        }),

        // Update timestamp
        updatedAt: serverTimestamp(),
      };

      // Add to members collection using client SDK
      const memberRef = doc(db, "members", userInfo.id);
      await setDoc(memberRef, memberData);

      console.log("✅ User moved to members collection successfully");

      return {
        success: true,
        userId: userInfo.id,
        collection: "members",
        updatedData: memberData,
      };
    } catch (error) {
      console.error("❌ Error moving user to members collection:", error);
      throw error;
    }
  }
}

module.exports = MembershipService;
