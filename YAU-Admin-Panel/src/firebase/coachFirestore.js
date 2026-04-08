// coach-panel/src/firebase/coachFirestore.js
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc,
  serverTimestamp,
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from './config';

// Get coach's assigned teams/rosters
export const getCoachRosters = async (coachId) => {
  try {
    console.log('🔍 Fetching rosters for coach:', coachId);
    
    const rostersQuery = query(
      collection(db, 'rosters'),
      where('coachId', '==', coachId)
    );
    
    const snapshot = await getDocs(rostersQuery);
    const rosters = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log('✅ Found rosters:', rosters.length);
    return rosters;
  } catch (error) {
    console.error('❌ Error fetching coach rosters:', error);
    return [];
  }
};

// Get team players/participants
export const getTeamPlayers = async (rosterId) => {
  try {
    console.log('👥 Fetching players for roster:', rosterId);
    
    const rosterDoc = await getDoc(doc(db, 'rosters', rosterId));
    if (rosterDoc.exists()) {
      const rosterData = rosterDoc.data();
      console.log('✅ Found players:', rosterData.participants?.length || 0);
      return rosterData.participants || [];
    }
    return [];
  } catch (error) {
    console.error('❌ Error fetching team players:', error);
    return [];
  }
};

// Create practice/event
export const createPracticeEvent = async (eventData) => {
  try {
    console.log('📅 Creating practice event:', eventData.title);
    
    const docRef = await addDoc(collection(db, 'events'), {
      ...eventData,
      type: 'practice',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Practice created:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating practice:', error);
    throw error;
  }
};

// Report game score
export const reportGameScore = async (gameData) => {
  try {
    console.log('🏆 Reporting game score:', gameData);
    
    // Update game schedule if gameId exists
    if (gameData.gameId) {
      await updateDoc(doc(db, 'game_schedules', gameData.gameId), {
        homeScore: gameData.homeScore,
        awayScore: gameData.awayScore,
        status: 'completed',
        reportedBy: gameData.coachId,
        reportedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    // Create game result record
    const gameResult = await addDoc(collection(db, 'game_results'), {
      ...gameData,
      createdAt: serverTimestamp()
    });

    console.log('✅ Game score reported:', gameResult.id);
    return gameResult.id;
  } catch (error) {
    console.error('❌ Error reporting game score:', error);
    throw error;
  }
};

// Get coach's schedule
export const getCoachSchedule = async (coachId) => {
  try {
    console.log('📋 Fetching schedule for coach:', coachId);
    
    // Get practices
    const practicesQuery = query(
      collection(db, 'events'),
      where('coachId', '==', coachId),
      orderBy('date', 'asc')
    );
    
    const practicesSnapshot = await getDocs(practicesQuery);
    const practices = practicesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      eventType: 'practice'
    }));

    // Get coach's rosters to filter games
    const coachRosters = await getCoachRosters(coachId);
    const teamIds = coachRosters.map(roster => roster.id);
    
    let games = [];
    if (teamIds.length > 0) {
      const gamesQuery = query(
        collection(db, 'game_schedules'),
        orderBy('date', 'asc')
      );
      
      const gamesSnapshot = await getDocs(gamesQuery);
      games = gamesSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(game => 
          teamIds.some(teamId => 
            game.team1?.includes(teamId) || 
            game.team2?.includes(teamId) ||
            game.team1Id === teamId ||
            game.team2Id === teamId
          )
        )
        .map(game => ({ ...game, eventType: 'game' }));
    }

    const allEvents = [...practices, ...games].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    console.log('✅ Schedule loaded:', {
      practices: practices.length,
      games: games.length,
      total: allEvents.length
    });

    return allEvents;
  } catch (error) {
    console.error('❌ Error fetching coach schedule:', error);
    return [];
  }
};

// Send message to team
export const sendTeamMessage = async (messageData) => {
  try {
    console.log('📨 Sending team message');
    
    const docRef = await addDoc(collection(db, 'parent_messages'), {
      ...messageData,
      timestamp: serverTimestamp()
    });
    
    console.log('✅ Team message sent:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error sending team message:', error);
    throw error;
  }
};

// Get parent messages for coach's teams
export const getTeamMessages = (coachId, callback) => {
  try {
    console.log('👂 Setting up message listener for coach:', coachId);
    
    const messagesQuery = query(
      collection(db, 'parent_messages'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    
    return onSnapshot(messagesQuery, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('📬 Messages updated:', messages.length);
      callback(messages);
    });
  } catch (error) {
    console.error('❌ Error setting up messages listener:', error);
    callback([]);
    return () => {}; // Return empty unsubscribe function
  }
};

// Real-time group chat
export const subscribeToGroupChat = (rosterId, callback) => {
  try {
    console.log('💬 Subscribing to group chat:', rosterId);
    
    const chatRef = doc(db, 'groupChats', rosterId);
    const messagesQuery = query(
      collection(chatRef, 'messages'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    
    return onSnapshot(messagesQuery, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).reverse(); // Reverse to show oldest first
      
      console.log('💬 Chat messages updated:', messages.length);
      callback(messages);
    });
  } catch (error) {
    console.error('❌ Error subscribing to group chat:', error);
    callback([]);
    return () => {}; // Return empty unsubscribe function
  }
};

// Send group chat message
export const sendGroupMessage = async (rosterId, messageData) => {
  try {
    console.log('💬 Sending group message to:', rosterId);
    
    const chatRef = doc(db, 'groupChats', rosterId);
    const messagesRef = collection(chatRef, 'messages');
    
    await addDoc(messagesRef, {
      ...messageData,
      timestamp: serverTimestamp()
    });
    
    console.log('✅ Group message sent');
  } catch (error) {
    console.error('❌ Error sending group message:', error);
    throw error;
  }
};

// Send bulk message to team parents
export const sendBulkTeamMessage = async (messageData) => {
  try {
    console.log('📢 Sending bulk team message');
    
    // This would integrate with your existing API
    const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/parents/send-bulk-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messageData)
    });

    if (!response.ok) {
      throw new Error('Failed to send bulk message');
    }

    const result = await response.json();
    console.log('✅ Bulk message sent:', result);
    return result;
  } catch (error) {
    console.error('❌ Error sending bulk message:', error);
    throw error;
  }
};