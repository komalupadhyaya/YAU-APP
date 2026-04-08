// coach/services/realTimeService.js
import { 
  onSnapshot, 
  collection, 
  query, 
  where, 
  orderBy,
  doc,
  limit 
} from 'firebase/firestore';
import { db } from '../../firebase/config';

class RealTimeService {
  constructor() {
    this.listeners = new Map();
  }

  // Subscribe to coach's roster updates
  subscribeToCoachRosters(coachId, callback) {
    const listenerId = `coach-rosters-${coachId}`;
    
    if (this.listeners.has(listenerId)) {
      this.unsubscribe(listenerId);
    }

    const rostersQuery = query(
      collection(db, 'rosters'),
      where('coachId', '==', coachId)
    );

    const unsubscribe = onSnapshot(rostersQuery, (snapshot) => {
      const rosters = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(rosters);
    }, (error) => {
      console.error('Error in rosters subscription:', error);
      callback([]);
    });

    this.listeners.set(listenerId, unsubscribe);
    return listenerId;
  }

  // Subscribe to team group chat
  subscribeToGroupChat(rosterId, callback) {
    const listenerId = `group-chat-${rosterId}`;
    
    if (this.listeners.has(listenerId)) {
      this.unsubscribe(listenerId);
    }

    const chatRef = doc(db, 'groupChats', rosterId);
    const messagesQuery = query(
      collection(chatRef, 'messages'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).reverse(); // Reverse to show oldest first
      
      callback(messages);
    }, (error) => {
      console.error('Error in group chat subscription:', error);
      callback([]);
    });

    this.listeners.set(listenerId, unsubscribe);
    return listenerId;
  }

  // Subscribe to parent messages
  subscribeToParentMessages(coachId, callback) {
    const listenerId = `parent-messages-${coachId}`;
    
    if (this.listeners.has(listenerId)) {
      this.unsubscribe(listenerId);
    }

    // Get coach's teams first, then filter messages
    const rostersQuery = query(
      collection(db, 'rosters'),
      where('coachId', '==', coachId)
    );

    const rosterUnsubscribe = onSnapshot(rostersQuery, (rosterSnapshot) => {
      const rosterIds = rosterSnapshot.docs.map(doc => doc.id);
      
      if (rosterIds.length === 0) {
        callback([]);
        return;
      }

      // Subscribe to parent messages for these rosters
      const messagesQuery = query(
        collection(db, 'parent_messages'),
        where('rosterId', 'in', rosterIds),
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      const messagesUnsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(messages);
      }, (error) => {
        console.error('Error in parent messages subscription:', error);
        callback([]);
      });

      // Store both unsubscribes
      this.listeners.set(listenerId, () => {
        rosterUnsubscribe();
        messagesUnsubscribe();
      });
    });

    return listenerId;
  }

  // Subscribe to coach's schedule
  subscribeToCoachSchedule(coachId, callback) {
    const listenerId = `coach-schedule-${coachId}`;
    
    if (this.listeners.has(listenerId)) {
      this.unsubscribe(listenerId);
    }

    // Subscribe to practices
    const practicesQuery = query(
      collection(db, 'events'),
      where('coachId', '==', coachId),
      orderBy('date', 'asc')
    );

    const practicesUnsubscribe = onSnapshot(practicesQuery, (practiceSnapshot) => {
      const practices = practiceSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        eventType: 'practice'
      }));

      // Get coach's rosters for game filtering
      const rostersQuery = query(
        collection(db, 'rosters'),
        where('coachId', '==', coachId)
      );

      const rostersUnsubscribe = onSnapshot(rostersQuery, (rosterSnapshot) => {
        const rosterIds = rosterSnapshot.docs.map(doc => doc.id);
        
        if (rosterIds.length === 0) {
          callback(practices);
          return;
        }

        // Get games for these teams
        const gamesQuery = query(
          collection(db, 'game_schedules'),
          orderBy('date', 'asc')
        );

        const gamesUnsubscribe = onSnapshot(gamesQuery, (gameSnapshot) => {
          const games = gameSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(game => 
              rosterIds.some(rosterId => 
                game.team1?.includes(rosterId) || game.team2?.includes(rosterId)
              )
            )
            .map(game => ({ ...game, eventType: 'game' }));

          const allEvents = [...practices, ...games].sort((a, b) => 
            new Date(a.date) - new Date(b.date)
          );
          
          callback(allEvents);
        });

        // Store all unsubscribes
        this.listeners.set(listenerId, () => {
          practicesUnsubscribe();
          rostersUnsubscribe();
          gamesUnsubscribe();
        });
      });
    });

    return listenerId;
  }

  // Subscribe to admin announcements/notifications
  subscribeToAdminPosts(callback) {
    const listenerId = 'admin-posts';
    
    if (this.listeners.has(listenerId)) {
      this.unsubscribe(listenerId);
    }

    const postsQuery = query(
      collection(db, 'admin_posts'),
      where('targetAudience', 'in', ['coaches', 'all']),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(posts);
    }, (error) => {
      console.error('Error in admin posts subscription:', error);
      callback([]);
    });

    this.listeners.set(listenerId, unsubscribe);
    return listenerId;
  }

  // Unsubscribe from specific listener
  unsubscribe(listenerId) {
    const unsubscribe = this.listeners.get(listenerId);
    if (unsubscribe) {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
      this.listeners.delete(listenerId);
      console.log(`Unsubscribed from: ${listenerId}`);
    }
  }

  // Unsubscribe from all listeners
  unsubscribeAll() {
    this.listeners.forEach((unsubscribe, listenerId) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.listeners.clear();
    console.log('Unsubscribed from all real-time listeners');
  }

  // Get active listener count
  getActiveListenerCount() {
    return this.listeners.size;
  }

  // Check if listener exists
  hasListener(listenerId) {
    return this.listeners.has(listenerId);
  }
}

// Export singleton instance
export const realTimeService = new RealTimeService();
export default realTimeService;