// services/communityService.js
const { db } = require("../utils/firebase");
const {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limitToLast,
  serverTimestamp,
  writeBatch,
} = require("firebase/firestore");

const COMMUNITY_COLLECTIONS = {
  COMMUNITY: "yau_community",
  COMMUNITY_LIKES: "community_likes",
  COMMUNITY_COMMENTS: "community_comments",
  COMMUNITY_REPORTS: "community_reports",
};

class CommunityService {
  static async getCommunityPosts(limit = 50, orderByField = "createdAt", orderDirection = "desc") {
    try {
      const postsQuery = limit
        ? query(
            collection(db, COMMUNITY_COLLECTIONS.COMMUNITY),
            orderBy(orderByField, orderDirection),
            limitToLast(limit)
          )
        : query(
            collection(db, COMMUNITY_COLLECTIONS.COMMUNITY),
            orderBy(orderByField, orderDirection)
          );

      const querySnapshot = await getDocs(postsQuery);
      if (querySnapshot.empty) {
        return [];
      }

      const posts = await Promise.all(
        querySnapshot.docs.map(async (docSnap) => {
          const postData = docSnap.data();
          const [likesCount, commentsCount] = await Promise.all([
            this.getPostLikes(docSnap.id),
            this.getPostComments(docSnap.id),
          ]);

          return {
            id: docSnap.id,
            ...postData,
            likesCount: likesCount.length,
            commentsCount: commentsCount.length,
            createdAt: postData.createdAt?.toDate ? postData.createdAt.toDate() : postData.createdAt,
            updatedAt: postData.updatedAt?.toDate ? postData.updatedAt.toDate() : postData.updatedAt,
          };
        })
      );

      return posts;
    } catch (error) {
      console.error("Error getting community posts:", error);
      throw error;
    }
  }

  static async getCommunityPostById(id) {
    try {
      const docRef = doc(db, COMMUNITY_COLLECTIONS.COMMUNITY, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const postData = docSnap.data();
        return {
          id: docSnap.id,
          ...postData,
          createdAt: postData.createdAt?.toDate ? postData.createdAt.toDate() : postData.createdAt,
          updatedAt: postData.updatedAt?.toDate ? postData.updatedAt.toDate() : postData.updatedAt,
        };
      }
      return null;
    } catch (error) {
      console.error("Error getting community post:", error);
      throw error;
    }
  }

  static async addCommunityPost(postData) {
    try {
      const docRef = await addDoc(collection(db, COMMUNITY_COLLECTIONS.COMMUNITY), {
        ...postData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: postData.status || "published",
        reportCount: 0,
        isBlocked: false,
        likesCount: 0,
        commentsCount: 0,
        shareCount: 0,
      });
      return docRef.id;
    } catch (error) {
      console.error("Error adding community post:", error);
      throw error;
    }
  }

  static async updateCommunityPost(postId, updates) {
    try {
      const docRef = doc(db, COMMUNITY_COLLECTIONS.COMMUNITY, postId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating community post:", error);
      throw error;
    }
  }

  static async deleteCommunityPost(postId) {
    try {
      const postDoc = await getDoc(doc(db, COMMUNITY_COLLECTIONS.COMMUNITY, postId));
      if (postDoc.exists()) {
        await Promise.all([
          this.deletePostLikes(postId),
          this.deletePostComments(postId),
        ]);
      }
      await deleteDoc(doc(db, COMMUNITY_COLLECTIONS.COMMUNITY, postId));
    } catch (error) {
      console.error("Error deleting community post:", error);
      throw error;
    }
  }

  static async toggleLike(postId, userId, userType, userName) {
    try {
      const likeQuery = query(
        collection(db, COMMUNITY_COLLECTIONS.COMMUNITY_LIKES),
        where("postId", "==", postId),
        where("userId", "==", userId)
      );

      const querySnapshot = await getDocs(likeQuery);

      if (querySnapshot.empty) {
        await addDoc(collection(db, COMMUNITY_COLLECTIONS.COMMUNITY_LIKES), {
          postId,
          userId,
          userType,
          userName,
          createdAt: serverTimestamp(),
        });
        return { liked: true, action: "liked" };
      } else {
        const likeDoc = querySnapshot.docs[0];
        await deleteDoc(likeDoc.ref);
        return { liked: false, action: "unliked" };
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      throw error;
    }
  }

  static async getPostLikes(postId) {
    try {
      const likesQuery = query(
        collection(db, COMMUNITY_COLLECTIONS.COMMUNITY_LIKES),
        where("postId", "==", postId),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(likesQuery);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt,
      }));
    } catch (error) {
      console.error("Error getting post likes:", error);
      return [];
    }
  }

  static async deletePostLikes(postId) {
    try {
      const likesQuery = query(
        collection(db, COMMUNITY_COLLECTIONS.COMMUNITY_LIKES),
        where("postId", "==", postId)
      );
      const querySnapshot = await getDocs(likesQuery);

      const batch = writeBatch(db);
      querySnapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    } catch (error) {
      console.error("Error deleting post likes:", error);
    }
  }

  static async getPostComments(postId) {
    try {
      const commentsQuery = query(
        collection(db, COMMUNITY_COLLECTIONS.COMMUNITY_COMMENTS),
        where("postId", "==", postId),
        orderBy("createdAt", "asc")
      );
      const querySnapshot = await getDocs(commentsQuery);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt,
      }));
    } catch (error) {
      console.error("Error getting post comments:", error);
      return [];
    }
  }

  static async addComment(postId, userId, userType, userName, comment) {
    try {
      const docRef = await addDoc(collection(db, COMMUNITY_COLLECTIONS.COMMUNITY_COMMENTS), {
        postId,
        userId,
        userType,
        userName,
        comment,
        createdAt: serverTimestamp(),
        isBlocked: false,
      });
      return docRef.id;
    } catch (error) {
      console.error("Error adding comment:", error);
      throw error;
    }
  }

  static async deleteComment(commentId) {
    try {
      await deleteDoc(doc(db, COMMUNITY_COLLECTIONS.COMMUNITY_COMMENTS, commentId));
    } catch (error) {
      console.error("Error deleting comment:", error);
      throw error;
    }
  }

  static async deletePostComments(postId) {
    try {
      const commentsQuery = query(
        collection(db, COMMUNITY_COLLECTIONS.COMMUNITY_COMMENTS),
        where("postId", "==", postId)
      );
      const querySnapshot = await getDocs(commentsQuery);

      const batch = writeBatch(db);
      querySnapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    } catch (error) {
      console.error("Error deleting post comments:", error);
    }
  }

  static async reportPost(postId, reporterId, reporterType, reason) {
    try {
      await addDoc(collection(db, COMMUNITY_COLLECTIONS.COMMUNITY_REPORTS), {
        postId,
        reporterId,
        reporterType,
        reason,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      const postRef = doc(db, COMMUNITY_COLLECTIONS.COMMUNITY, postId);
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        const currentReportCount = postSnap.data().reportCount || 0;
        await updateDoc(postRef, {
          reportCount: currentReportCount + 1,
          updatedAt: serverTimestamp(),
        });

        if (currentReportCount + 1 >= 5) {
          await updateDoc(postRef, {
            isBlocked: true,
            blockedReason: "Multiple reports",
            blockedAt: serverTimestamp(),
          });
        }
      }
    } catch (error) {
      console.error("Error reporting post:", error);
      throw error;
    }
  }

  static async getCommunityStats() {
    try {
      const [postsSnap, likesSnap, commentsSnap] = await Promise.all([
        getDocs(collection(db, COMMUNITY_COLLECTIONS.COMMUNITY)),
        getDocs(collection(db, COMMUNITY_COLLECTIONS.COMMUNITY_LIKES)),
        getDocs(collection(db, COMMUNITY_COLLECTIONS.COMMUNITY_COMMENTS)),
      ]);

      const posts = postsSnap.docs.map(doc => doc.data());

      return {
        totalPosts: posts.length,
        publishedPosts: posts.filter(p => p.status === "published" && !p.isBlocked).length,
        blockedPosts: posts.filter(p => p.isBlocked).length,
        reportedPosts: posts.filter(p => (p.reportCount || 0) > 0).length,
        totalLikes: likesSnap.size,
        totalComments: commentsSnap.size,
        adminPosts: posts.filter(p => p.authorType === "admin").length,
        coachPosts: posts.filter(p => p.authorType === "coach").length,
        parentPosts: posts.filter(p => p.authorType === "parent").length,
      };
    } catch (error) {
      console.error("Error getting community stats:", error);
      return {};
    }
  }

  static async getReportedPosts() {
    try {
      const postsQuery = query(
        collection(db, COMMUNITY_COLLECTIONS.COMMUNITY),
        where("reportCount", ">", 0),
        orderBy("reportCount", "desc")
      );
      const querySnapshot = await getDocs(postsQuery);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error getting reported posts:", error);
      throw error;
    }
  }

  static async getCommunityAnalytics(timeRange = "7d") {
    try {
      const now = new Date();
      const startDate = new Date();

      switch (timeRange) {
        case "24h":
          startDate.setHours(now.getHours() - 24);
          break;
        case "7d":
          startDate.setDate(now.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(now.getDate() - 30);
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }

      const postsQuery = query(
        collection(db, COMMUNITY_COLLECTIONS.COMMUNITY),
        where("createdAt", ">=", startDate),
        orderBy("createdAt", "desc")
      );

      const postsSnapshot = await getDocs(postsQuery);
      const posts = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const totalLikes = posts.reduce((sum, post) => sum + (post.likesCount || 0), 0);
      const totalComments = posts.reduce((sum, post) => sum + (post.commentsCount || 0), 0);
      const totalShares = posts.reduce((sum, post) => sum + (post.shareCount || 0), 0);
      const totalReports = posts.reduce((sum, post) => sum + (post.reportCount || 0), 0);

      return {
        timeRange,
        totalPosts: posts.length,
        totalLikes,
        totalComments,
        totalShares,
        totalReports,
        totalEngagement: totalLikes + totalComments + totalShares,
        averageEngagement: posts.length > 0 ? ((totalLikes + totalComments + totalShares) / posts.length).toFixed(1) : 0,
        topPosts: posts
          .sort((a, b) => ((b.likesCount || 0) + (b.commentsCount || 0)) - ((a.likesCount || 0) + (a.commentsCount || 0)))
          .slice(0, 5),
        authorBreakdown: posts.reduce((acc, post) => {
          acc[post.authorType] = (acc[post.authorType] || 0) + 1;
          return acc;
        }, {}),
        dailyActivity: posts.reduce((acc, post) => {
          const date = new Date(post.createdAt).toDateString();
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {}),
      };
    } catch (error) {
      console.error("Error getting community analytics:", error);
      return null;
    }
  }

  static async bulkUpdatePosts(postIds, updates) {
    try {
      const batch = writeBatch(db);

      postIds.forEach(postId => {
        const postRef = doc(db, COMMUNITY_COLLECTIONS.COMMUNITY, postId);
        batch.update(postRef, {
          ...updates,
          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit();
    } catch (error) {
      console.error("Error in bulk update:", error);
      throw error;
    }
  }
}

module.exports = CommunityService;