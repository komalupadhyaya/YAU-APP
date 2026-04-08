import {
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
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './config';
import { getMembers } from './apis/api-members';
// Collection references
export const COLLECTIONS = {
  PARENTS: 'members',
  COACHES: 'users',
  LOCATIONS: 'locations',
  GAME_NOTIFICATIONS: 'game_notifications'
};

// Locations functions
export const getLocations = async () => {
  try {
    const querySnapshot = await getDocs(
      query(
        collection(db, COLLECTIONS.LOCATIONS),
        orderBy('name', 'asc')
      )
    );

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting locations:', error);
    try {
      // Fallback without orderBy
      const querySnapshot = await getDocs(collection(db, COLLECTIONS.LOCATIONS));

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (fallbackError) {
      console.error('Fallback error getting locations:', fallbackError);
      throw fallbackError;
    }
  }
};

export const getLocationById = async (id) => {
  try {
    const docRef = doc(db, COLLECTIONS.LOCATIONS, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting location:', error);
    throw error;
  }
};

export const addLocation = async (locationData) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.LOCATIONS), {
      ...locationData,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding location:', error);
    throw error;
  }
};

export const updateLocation = async (id, updates) => {
  try {
    const docRef = doc(db, COLLECTIONS.LOCATIONS, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating location:', error);
    throw error;
  }
};

export const deleteLocation = async (id) => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.LOCATIONS, id));
  } catch (error) {
    console.error('Error deleting location:', error);
    throw error;
  }
};

// Member/Registration functions
export const getCoaches = async () => {
  try {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc')
      )
    );

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt
    }));
  } catch (error) {
    console.error('Error getting coaches:', error);
    // If orderBy fails due to index, try without it
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, 'users'),
          where('role', '==', 'coach')
        )
      );

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt
      }));
    } catch (fallbackError) {
      console.error('Fallback error getting coaches:', fallbackError);
      throw fallbackError;
    }
  }
};

export const createInterestRecordNew = async (parentId, parentData, child, searchCriteria) => {
  try {
    await addDoc(collection(db, 'interest_records'), {
      parentId: parentId,
      parentName: `${parentData.firstName} ${parentData.lastName}`,
      parentEmail: parentData.email,
      parentPhone: parentData.phone,
      parentLocation: parentData.location,
      childName: child.name || child.firstName,
      childAgeGroup: child.ageGroup,
      childDob: child.dob,
      requestedSport: searchCriteria.sport,
      requestedAgeGroup: searchCriteria.ageGroup,
      requestedLocation: searchCriteria.location,
      status: 'waiting_for_team',
      reason: 'no_coach_assigned',
      createdAt: serverTimestamp(),
      needsCoachAssignment: true
    });
    
    console.log(`📝 Created interest record for ${child.name || child.firstName}`);
  } catch (error) {
    console.error('❌ Error creating interest record:', error);
    throw error;
  }
};

// NEW: Generate initial rosters from existing parents
export const generateInitialRosters = async () => {
  try {
    console.log('🏗️ Generating initial rosters from existing parents...');
    
    const parentsData = await getMembers();
    console.log(`📋 Found ${parentsData.length} parents to process`);

    if (parentsData.length === 0) {
      console.log('⚠️ No parents found, skipping roster generation');
      return;
    }

    const batch = writeBatch(db);
    const sportMapping = { 'Flag Football': 'Football', 'Tackle Football': 'Football' };
    const rosterMap = new Map(); // To track unique rosters needed
    const currentTimestamp = new Date().toISOString();

    // First pass: Identify all unique roster combinations needed
    parentsData.forEach(parent => {
      if (parent.students && Array.isArray(parent.students)) {
        parent.students.forEach(child => {
          if (!child.name && !child.firstName) return;

          const childAgeGroup = calculateAgeGroup(child.dob, child.ageGroup);
          const mappedSport = sportMapping[parent.sport] || parent.sport;
          const rosterId = `${mappedSport.toLowerCase()}-${childAgeGroup.toLowerCase()}-${parent.location.replace(/\s+/g, '-').toLowerCase()}`;

          if (!rosterMap.has(rosterId)) {
            rosterMap.set(rosterId, {
              id: rosterId,
              teamName: `${childAgeGroup} ${mappedSport} - ${parent.location}`,
              sport: mappedSport,
              ageGroup: childAgeGroup,
              location: parent.location,
              participants: [],
              players: [],
              playerCount: 0,
              hasPlayers: false,
              hasAssignedCoach: false,
              isEmpty: true,
              status: 'empty',
              coachId: null,
              coachName: 'Unassigned',
              createdAt: serverTimestamp(),
              lastUpdated: serverTimestamp()
            });
          }
        });
      }
    });

    console.log(`🏆 Found ${rosterMap.size} unique roster combinations needed`);

    // Second pass: Add participants to rosters
    parentsData.forEach(parent => {
      if (parent.students && Array.isArray(parent.students)) {
        parent.students.forEach(child => {
          if (!child.name && !child.firstName) return;

          const childAgeGroup = calculateAgeGroup(child.dob, child.ageGroup);
          const mappedSport = sportMapping[parent.sport] || parent.sport;
          const rosterId = `${mappedSport.toLowerCase()}-${childAgeGroup.toLowerCase()}-${parent.location.replace(/\s+/g, '-').toLowerCase()}`;

          const participant = {
            id: `${parent.id}-${child.name || child.firstName}`,
            firstName: child.firstName || '',
            lastName:child.lastName||'',
            dob: child.dob || null,
            ageGroup: childAgeGroup,
            parentId: parent.id,
            parentName: `${parent.firstName || ''} ${parent.lastName || ''}`.trim(),
            parentEmail: parent.email || '',
            parentPhone: parent.phone || '',
            sport: mappedSport,
            location: parent.location || '',
            registeredAt: currentTimestamp
          };

          // Add participant to the roster
          const roster = rosterMap.get(rosterId);
          if (roster) {
            roster.participants.push(participant);
            roster.players.push(participant);
          }
        });
      }
    });

    // Third pass: Update roster stats and create in Firestore
    for (const [rosterId, roster] of rosterMap) {
      const playerCount = roster.participants.length;
      
      roster.playerCount = playerCount;
      roster.hasPlayers = playerCount > 0;
      roster.isEmpty = playerCount === 0;
      roster.status = playerCount > 0 ? 'needs-coach' : 'empty';

      console.log(`📝 Creating roster: ${rosterId} with ${playerCount} players`);

      const rosterRef = doc(db, 'rosters', rosterId);
      batch.set(rosterRef, roster);
    }

    await batch.commit();
    console.log(`✅ Successfully created ${rosterMap.size} initial rosters`);

    // Log summary
    const rostersByStatus = {};
    for (const roster of rosterMap.values()) {
      rostersByStatus[roster.status] = (rostersByStatus[roster.status] || 0) + 1;
    }
    
    console.log('📊 Roster summary:', rostersByStatus);
    return rosterMap.size;

  } catch (error) {
    console.error('❌ Error generating initial rosters:', error);
    throw error;
  }
};

// Helper function (same as before but exported for reuse)
export const calculateAgeGroup = (dob, storedAgeGroup = null) => {
  if (!dob && storedAgeGroup) {
    return storedAgeGroup;
  }
  if (!dob) {
    return '6U';
  }

  try {
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) {
      return storedAgeGroup || '6U';
    }

    const today = new Date();
    const currentYear = today.getFullYear();

    // Create the cutoff date for this year (July 31)
    const cutoffDate = new Date(currentYear, 6, 31); // Month is 0-indexed (6 = July)

    // 1. Calculate the player's "season age" (age on Dec 31 of this year)
    const seasonAge = currentYear - birthDate.getFullYear();

    // 2. Check if the season age is within the valid range (3-14)
    if (seasonAge < 3 || seasonAge > 14) {
      return storedAgeGroup || '6U';
    }

    // 3. Create the player's birthday for THIS year
    const birthdayThisYear = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());

    // 4. Apply the Roster Logic
    let ageGroup;
    if (birthdayThisYear > cutoffDate) {
      // Player's birthday is AFTER the cutoff.
      // They are eligible to play one group DOWN (e.g., 12U base -> 11U eligible).
      ageGroup = (seasonAge - 1) + "U";
    } else {
      // Player's birthday is ON or BEFORE the cutoff.
      // They must play in their base group.
      ageGroup = seasonAge + "U";
    }

    // 5. Handle the edge case for the youngest group.
    const groupNumber = parseInt(ageGroup);
    if (groupNumber < 3) {
      return "3U";
    }

    return ageGroup;

  } catch (error) {
    console.error('❌ Error calculating age group:', error);
    return storedAgeGroup || '6U';
  }
};

// FIXED: Bulk sync function without serverTimestamp in arrays
export const syncAllRosters = async () => {
  try {
    console.log('🔄 Starting bulk roster sync...');
    
    const [parentsData, rostersData] = await Promise.all([
      getMembers(),
      getRosters()
    ]);

    const batch = writeBatch(db);
    const sportMapping = { 'Flag Football': 'Football', 'Tackle Football': 'Football' };
    const currentTimestamp = new Date().toISOString(); // Use ISO string

    // Generate current participants from all parents
    const allParticipants = [];
    parentsData.forEach(parent => {
      if (parent.students && Array.isArray(parent.students)) {
        parent.students.forEach(child => {
          // Validate child data
          if (!child.name && !child.firstName) {
            console.log('⚠️ Skipping child with no name:', child);
            return;
          }

          const correctAgeGroup = calculateAgeGroup(child.dob, child.ageGroup);
          const mappedSport = sportMapping[parent.sport] || parent.sport;

          // FIXED: Create participant without serverTimestamp
          const participant = {
            id: `${parent.id}-${child.name || child.firstName}`,
            name: child.name || child.firstName || '',
            dob: child.dob || null,
            ageGroup: correctAgeGroup,
            parentId: parent.id,
            parentName: `${parent.firstName || ''} ${parent.lastName || ''}`.trim(),
            parentEmail: parent.email || '',
            parentPhone: parent.phone || '',
            sport: mappedSport,
            location: parent.location || '',
            registeredAt: currentTimestamp // Use ISO string
          };

          // Remove undefined values
          Object.keys(participant).forEach(key => {
            if (participant[key] === undefined) {
              participant[key] = null;
            }
          });

          allParticipants.push(participant);
        });
      }
    });

    console.log(`👥 Generated ${allParticipants.length} participants from ${parentsData.length} parents`);

    // Update each roster with matching participants
    for (const roster of rostersData) {
      const matchingParticipants = allParticipants.filter(p =>
        p.sport && roster.sport &&
        p.sport.toLowerCase() === roster.sport.toLowerCase() &&
        p.ageGroup && roster.ageGroup &&
        p.ageGroup.toLowerCase() === roster.ageGroup.toLowerCase() &&
        p.location && roster.location &&
        p.location.toLowerCase() === roster.location.toLowerCase()
      );

      const playerCount = matchingParticipants.length;
      const hasAssignedCoach = !!roster.coachId;
      
      // Determine status
      let status = 'empty';
      if (playerCount > 0 && hasAssignedCoach) {
        status = 'active';
      } else if (playerCount > 0 && !hasAssignedCoach) {
        status = 'needs-coach';
      } else if (playerCount === 0 && hasAssignedCoach) {
        status = 'needs-players';
      }

      // Only update if there are changes
      if (
        roster.playerCount !== playerCount ||
        roster.status !== status ||
        !roster.participants ||
        roster.participants.length !== playerCount
      ) {
        console.log(`🔄 Updating roster ${roster.id}: ${roster.playerCount || 0} → ${playerCount} players`);
        
        // FIXED: Update data without undefined values
        const updateData = {
          participants: matchingParticipants,
          players: matchingParticipants,
          playerCount: playerCount,
          hasPlayers: playerCount > 0,
          isEmpty: playerCount === 0 && !hasAssignedCoach,
          status: status,
          lastUpdated: serverTimestamp() // This is OK at document level
        };

        // Remove undefined values
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === undefined) {
            delete updateData[key];
          }
        });

        const rosterRef = doc(db, 'rosters', roster.id);
        batch.update(rosterRef, updateData);
      }
    }

    await batch.commit();
    console.log('✅ Bulk roster sync completed');
    
  } catch (error) {
    console.error('❌ Error in bulk sync:', error);
    throw error;
  }
};

// FIXED: Safe update roster function
export const updateRoster = async (id, updates) => {
  try {
    console.log('🔄 Updating roster:', id, updates);
    
    // Remove undefined values from updates
    const cleanUpdates = {};
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        cleanUpdates[key] = updates[key];
      }
    });

    // Add timestamp
    cleanUpdates.updatedAt = serverTimestamp();

    const docRef = doc(db, 'rosters', id);
    await updateDoc(docRef, cleanUpdates);
    
    console.log('✅ Roster updated successfully');
  } catch (error) {
    console.error('❌ Error updating roster:', error);
    throw error;
  }
};

// FIXED: Enhanced getRosters function
export const getRosters = async () => {
  try {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'rosters'),
        orderBy('createdAt', 'desc')
      )
    );

    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      
      // Clean up any undefined values
      const cleanData = {};
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined) {
          cleanData[key] = data[key];
        }
      });

      return {
        id: doc.id,
        ...cleanData,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
        lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate() : data.lastUpdated
      };
    });
  } catch (error) {
    console.error('Error getting rosters:', error);
    // Fallback without orderBy
    try {
      const querySnapshot = await getDocs(collection(db, 'rosters'));
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Clean up any undefined values
        const cleanData = {};
        Object.keys(data).forEach(key => {
          if (data[key] !== undefined) {
            cleanData[key] = data[key];
          }
        });

        return {
          id: doc.id,
          ...cleanData
        };
      });
    } catch (fallbackError) {
      console.error('Fallback error getting rosters:', fallbackError);
      throw fallbackError;
    }
  }
};


// Add coach to users collection
export const addCoach = async (coachData) => {
  try {
    const docRef = await addDoc(collection(db, 'users'), {
      ...coachData,
      role: 'coach',
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding coach:', error);
    throw error;
  }
};

// Update coach in users collection
export const updateCoach = async (id, updates) => {
  try {
    const docRef = doc(db, 'users', id);
    await updateDoc(docRef, {
      ...updates,
      role: 'coach',
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating coach:', error);
    throw error;
  }
};

// Delete coach from users collection
export const deleteCoach = async (id) => {
  try {
    await deleteDoc(doc(db, 'users', id));
  } catch (error) {
    console.error('Error deleting coach:', error);
    throw error;
  }
};

// Messages/Posts functions
export const getMessages = async () => {
  try {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'admin_posts'),
        orderBy('timestamp', 'desc')
      )
    );

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : doc.data().timestamp
    }));
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
};

export const addMessage = async (messageData) => {
  try {
    const docRef = await addDoc(collection(db, 'admin_posts'), {
      ...messageData,
      timestamp: serverTimestamp(),
      read: false
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding message:', error);
    throw error;
  }
};

export const updateMessage = async (id, updates) => {
  try {
    const docRef = doc(db, 'admin_posts', id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating message:', error);
    throw error;
  }
};

export const deleteMessage = async (id) => {
  try {
    await deleteDoc(doc(db, 'admin_posts', id));
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};

// Get messages for specific groups (for coaches/parents)
export const getMessagesForGroup = async (ageGroup, location, sport) => {
  try {
    let q = collection(db, 'admin_posts');

    // Add filters based on targeting
    if (ageGroup || location || sport) {
      q = query(
        q,
        where('targetAgeGroup', 'in', ['all', ageGroup]),
        where('targetLocation', 'in', ['all', location]),
        where('targetSport', 'in', ['all', sport]),
        orderBy('timestamp', 'desc')
      );
    } else {
      q = query(q, orderBy('timestamp', 'desc'));
    }

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : doc.data().timestamp
    }));
  } catch (error) {
    console.error('Error getting targeted messages:', error);
    throw error;
  }
};


export const addRoster = async (roster) => {
  await addDoc(collection(db, 'rosters'), roster);
};

export const sendMessage = async (message) => {
  await addDoc(collection(db, 'messages'), message);
};

// New functions for events
export const getEvents = async () => {
  try {
    const eventsSnapshot = await getDocs(collection(db, 'events'));
    return eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
};
// Updated addEvent function to include expiration
export const addEvent = async (eventData) => {
  try {
    // Create expiration timestamp from date and time
    if (eventData.date && eventData.time) {
      const eventDateTime = new Date(`${eventData.date}T${eventData.time}:00`);
      eventData.expiresAt = eventDateTime;
    }
    
    await addDoc(collection(db, 'events'), eventData);
  } catch (error) {
    console.error('Error adding event:', error);
    throw error;
  }
};

// Updated updateEvent function to include expiration
export const updateEvent = async (eventId, eventData) => {
  try {
    // Update expiration timestamp from date and time
    if (eventData.date && eventData.time) {
      const eventDateTime = new Date(`${eventData.date}T${eventData.time}:00`);
      eventData.expiresAt = eventDateTime;
    }
    
    const eventRef = doc(db, 'events', eventId);
    await updateDoc(eventRef, eventData);
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
};

// New function to delete expired events
export const deleteExpiredEvents = async () => {
  try {
    const now = new Date();
    const eventsRef = collection(db, 'events');
    const expiredEventsQuery = query(
      eventsRef,
      where('expiresAt', '<=', now)
    );
    
    const expiredSnapshot = await getDocs(expiredEventsQuery);
    
    if (!expiredSnapshot.empty) {
      console.log(`🗑️ Deleting ${expiredSnapshot.docs.length} expired events`);
      
      const batch = writeBatch(db);
      expiredSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log('✅ Expired events deleted successfully');
    }
  } catch (error) {
    console.error('❌ Error deleting expired events:', error);
    throw error;
  }
};
export const deleteEvent = async (eventId) => {
  try {
    const eventRef = doc(db, 'events', eventId);
    await deleteDoc(eventRef);
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
};

// Game Schedule CRUD functions
export const getSchedules = async () => {
  try {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'schedules'),
        orderBy('createdAt', 'desc')
      )
    );

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt
    }));
  } catch (error) {
    console.error('Error getting schedules:', error);
    // Fallback without orderBy
    try {
      const querySnapshot = await getDocs(collection(db, 'schedules'));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt
      }));
    } catch (fallbackError) {
      console.error('Fallback error getting schedules:', fallbackError);
      throw fallbackError;
    }
  }
};

export const getScheduleById = async (id) => {
  try {
    const docRef = doc(db, 'schedules', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate()
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting schedule:', error);
    throw error;
  }
};

export const addSchedule = async (scheduleData) => {
  try {
    const docRef = await addDoc(collection(db, 'schedules'), {
      ...scheduleData,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding schedule:', error);
    throw error;
  }
};

export const updateSchedule = async (id, updates) => {
  try {
    const docRef = doc(db, 'schedules', id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    throw error;
  }
};

export const deleteSchedule = async (id) => {
  try {
    await deleteDoc(doc(db, 'schedules', id));
  } catch (error) {
    console.error('Error deleting schedule:', error);
    throw error;
  }
};

// Enhanced mobile notification with multiple age groups support
export const sendGameNotification = async (gameData, notificationType = 'game_scheduled') => {
  try {
    // FIXED: Support both single and multiple age groups
    const ageGroups = gameData.ageGroups || (gameData.ageGroup ? [gameData.ageGroup] : []);
    
    console.log('📱 Sending interactive mobile notification:', { 
      gameTitle: `${gameData.team1 || gameData.team1Name} vs ${gameData.team2 || gameData.team2Name}`,
      type: notificationType,
      sport: gameData.sport,
      ageGroups: ageGroups, // CHANGED: Now supports multiple
      recipientAgeGroups: ageGroups.join(', ')
    });

    // Get recipients with enhanced matching for multiple age groups
    const recipients = await getGameRecipients({
      ...gameData,
      ageGroups: ageGroups // Pass age groups array
    });
    
    if (recipients.total === 0) {
      console.log('⚠️ No recipients found for this game notification');
      return null;
    }

    // Create enhanced notification payload
    const notificationPayload = {
      gameId: gameData.id,
      type: notificationType,
      title: getNotificationTitle(gameData, notificationType),
      body: getNotificationBody(gameData, notificationType, ageGroups),
      data: {
        gameId: gameData.id,
        team1: gameData.team1Name || gameData.team1,
        team2: gameData.team2Name || gameData.team2,
        date: gameData.date,
        time: gameData.time,
        location: gameData.location,
        sport: gameData.sport,
        ageGroups: ageGroups.join(','), // CHANGED: Multiple age groups
        status: gameData.status,
        coachName: gameData.coachName,
        notes: gameData.notes,
        actions: getNotificationActions(notificationType, gameData)
      },
      recipients: recipients.total,
      recipientBreakdown: {
        parents: recipients.parentIds.length,
        coaches: recipients.coachIds.length,
        ageGroups: ageGroups // ADDED: Track which age groups
      },
      sentAt: new Date().toISOString()
    };

    // Save notification record
    const docRef = await addDoc(collection(db, COLLECTIONS.GAME_NOTIFICATIONS), {
      ...notificationPayload,
      sentAt: serverTimestamp(),
      status: 'sent'
    });

    // ENHANCED: Send actual push notifications to mobile devices
    await sendMobilePushNotifications(recipients, notificationPayload);
    
    console.log('✅ Interactive mobile notifications sent:', {
      notificationId: docRef.id,
      recipients: recipients.total,
      parents: recipients.parentIds.length,
      coaches: recipients.coachIds.length,
      ageGroups: ageGroups.join(', ')
    });
    
    return docRef.id;
    
  } catch (error) {
    console.error('❌ Error sending mobile notification:', error);
    throw error;
  }
};

// Enhanced recipient matching with multiple age groups support
export const getGameRecipients = async (gameData) => {
  try {
    const recipients = {
      parentIds: [],
      coachIds: [],
      total: 0
    };

    const ageGroups = gameData.ageGroups || (gameData.ageGroup ? [gameData.ageGroup] : []);
    
    console.log('🔍 Finding recipients for game:', {
      sport: gameData.sport,
      ageGroups: ageGroups,
      location: gameData.location,
      team1: gameData.team1 || gameData.team1Name,
      team2: gameData.team2 || gameData.team2Name
    });

    // Get all parents from registrations collection (mobile users)
    const [parentsData, coachesData] = await Promise.all([
      getMembers(), // This should get from 'registrations' collection
      getCoaches()
    ]);

    // Enhanced parent filtering for mobile users
    const relevantMember = parentsData.filter(parent => {
      if (!parent.students || !Array.isArray(parent.students)) {
        return false;
      }
      
      // Check if parent has relevant child in ANY of the age groups
      const hasRelevantChild = parent.students.some(student => {
        const sportMatch = parent.sport === gameData.sport;
        const ageGroupMatch = ageGroups.includes(student.ageGroup || calculateAgeGroup(student.dob));
        
        const locationMatch = !gameData.location || 
                            parent.location === gameData.location ||
                            (parent.sport === gameData.sport && ageGroups.includes(student.ageGroup));

        return sportMatch && ageGroupMatch && locationMatch;
      });

      return hasRelevantChild;
    });

    // Add parent recipients
    relevantMember.forEach(parent => {
      recipients.parentIds.push({
        id: parent.id,
        name: `${parent.firstName} ${parent.lastName}`,
        email: parent.email,
        phone: parent.phone,
        sport: parent.sport,
        location: parent.location,
        smsOptIn: parent.smsOptIn || parent.smsOtpIn,
        fcmToken: parent.fcmToken, // Mobile FCM token
        children: parent.students.filter(student => 
          ageGroups.includes(student.ageGroup || calculateAgeGroup(student.dob))
        ).map(student => ({
          name: student.firstName + ' ' + (student.lastName || ''),
          ageGroup: student.ageGroup || calculateAgeGroup(student.dob)
        }))
      });
    });

    // Coach filtering remains the same...
    const relevantCoaches = coachesData.filter(coach => {
      if (!coach.assignedTeams || coach.role !== 'coach') {
        return false;
      }
      
      const hasRelevantTeam = coach.assignedTeams.some(team => 
        team.sport === gameData.sport &&
        ageGroups.includes(team.ageGroup) &&
        (team.id === gameData.team1Id || 
         team.id === gameData.team2Id ||
         (team.sport === gameData.sport && ageGroups.includes(team.ageGroup)))
      );

      return hasRelevantTeam;
    });

    // Add coach recipients
    relevantCoaches.forEach(coach => {
      recipients.coachIds.push({
        id: coach.id,
        name: `${coach.firstName} ${coach.lastName}`,
        email: coach.email,
        phone: coach.phone,
        primarySport: coach.primarySport,
        assignedTeams: coach.assignedTeams?.filter(team => 
          team.sport === gameData.sport && ageGroups.includes(team.ageGroup)
        ) || []
      });
    });

    recipients.total = recipients.parentIds.length + recipients.coachIds.length;

    console.log('📊 Final notification recipients:', {
      parents: recipients.parentIds.length,
      coaches: recipients.coachIds.length,
      total: recipients.total,
      ageGroups: ageGroups.join(', ')
    });

    return recipients;

  } catch (error) {
    console.error('❌ Error getting recipients:', error);
    throw error;
  }
};


// ENHANCED: Mobile push notification sender with actual FCM integration
const sendMobilePushNotifications = async (recipients, payload) => {
  try {
    console.log('📱 Sending to mobile devices...');
    
    const allRecipientIds = [
      ...recipients.parentIds.map(p => p.id),
      ...recipients.coachIds.map(c => c.id)
    ];

    if (allRecipientIds.length > 0) {
      // Save to Firestore for app notification list
        await addDoc(collection(db, 'mobile_notifications'), {
        recipientIds: allRecipientIds,
        recipients: {
          parents: recipients.parentIds,
          coaches: recipients.coachIds
        },
        title: payload.title,
        body: payload.body,
        data: payload.data,
        type: payload.type,
        gameId: payload.gameId,
        priority: payload.type === 'game_reminder' ? 'high' : 'normal',
        sentAt: serverTimestamp(),
        read: false,
        interacted: false
      });

      // ADDED: Actually send push notifications via FCM
      await sendFCMPushNotifications(allRecipientIds, payload);

      console.log(`✅ Enhanced mobile notification saved for ${allRecipientIds.length} recipients`);
    }
    
  } catch (error) {
    console.error('❌ Error sending mobile notifications:', error);
    throw error;
  }
};

// NEW: Actual FCM push notification sender
export const sendFCMPushNotifications = async (recipientIds, payload) => {
  try {
    console.log('📱 Sending to mobile devices...');
    
    // Get FCM tokens for all recipients from 'registrations' collection
    const tokenPromises = recipientIds.map(async (userId) => {
      try {
        // Look in registrations collection first
        const userDoc = await getDoc(doc(db, 'registrations', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          return {
            userId,
            token: userData?.fcmToken,
            platform: userData?.platform || 'mobile'
          };
        }
        
        // Fallback to users collection
        const userDocFallback = await getDoc(doc(db, 'users', userId));
        if (userDocFallback.exists()) {
          const userData = userDocFallback.data();
          return {
            userId,
            token: userData?.fcmToken,
            platform: userData?.platform || 'web'
          };
        }
        
        return null;
      } catch (error) {
        console.error(`Error getting FCM token for user ${userId}:`, error);
        return null;
      }
    });

    const tokenResults = await Promise.allSettled(tokenPromises);
    const validTokens = tokenResults
      .filter(result => result.status === 'fulfilled' && result.value?.token)
      .map(result => result.value);

    if (validTokens.length === 0) {
      console.log('⚠️ No valid FCM tokens found');
      return;
    }

    console.log(`📱 Sending FCM notifications to ${validTokens.length} devices`);

    // Create FCM payload
    const fcmPayload = {
      notification: {
        title: payload.title,
        body: payload.body,
        icon: '/favicon.ico',
        badge: '/badge.png',
        tag: `game_${payload.gameId || Date.now()}`,
        renotify: true,
        requireInteraction: payload.type === 'game_reminder'
      },
      data: {
        ...payload.data,
        click_action: '/game-schedule',
        url: `/game-schedule?game=${payload.gameId || ''}`
      },
      android: {
        notification: {
          sound: 'default',
          channel_id: 'game_notifications',
          priority: payload.type === 'game_reminder' ? 'high' : 'normal'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            'mutable-content': 1
          }
        }
      },
      webpush: {
        notification: {
          icon: '/favicon.ico',
          badge: '/badge.png',
          requireInteraction: payload.type === 'game_reminder',
          actions: payload.data.actions?.map(action => ({
            action: action.id,
            title: action.title
          })) || []
        }
      }
    };

    // Send via your backend API
    const results = await sendToMultipleTokens(validTokens.map(t => t.token), fcmPayload);
    
    console.log(`✅ FCM notifications sent: ${results.successCount}/${validTokens.length}`);
    
    if (results.failureCount > 0) {
      console.warn(`⚠️ Some notifications failed: ${results.failureCount}`);
    }

    return results;

  } catch (error) {
    console.error('❌ Error sending FCM notifications:', error);
    throw error;
  }
};


// Helper function to send FCM to multiple tokens
const sendToMultipleTokens = async (tokens, payload) => {
  // This would typically be implemented server-side
  // For client-side, you might need to call your backend API
  try {
    const response = await fetch('/api/send-fcm-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tokens,
        payload
      })
    });

    return await response.json();
  } catch (error) {
    console.error('Error calling FCM API:', error);
    return { successCount: 0, failureCount: tokens.length };
  }
};

// UPDATED: Notification body with multiple age groups support
const getNotificationBody = (gameData, type, ageGroups = []) => {
  const gameTitle = `${gameData.team1Name || gameData.team1} vs ${gameData.team2Name || gameData.team2}`;
  const gameTime = `${gameData.date} at ${gameData.time}`;
  const ageGroupText = ageGroups.length > 1 ? `(${ageGroups.join(', ')})` : `(${ageGroups[0] || ''})`;
  
  switch (type) {
    case 'game_scheduled':
      return `${gameTitle} ${ageGroupText} - ${gameTime} at ${gameData.location}`;
    case 'game_updated':
      return `${gameTitle} ${ageGroupText} details have been updated. Check the app for details.`;
    case 'game_cancelled':
      return `${gameTitle} ${ageGroupText} scheduled for ${gameTime} has been cancelled.`;
    case 'game_reminder':
      return `Don't forget! ${gameTitle} ${ageGroupText} is coming up at ${gameData.time}`;
    default:
      return `${gameTitle} ${ageGroupText} - ${gameTime}`;
  }
};

// Add notification actions for mobile interactivity
const getNotificationActions = (type, gameData) => {
  const actions = [];
  
  switch (type) {
    case 'game_scheduled':
    case 'game_updated':
      actions.push(
        { id: 'view', title: 'View Game', icon: '👁️' },
        { id: 'directions', title: 'Get Directions', icon: '🗺️' }
      );
      break;
    case 'game_reminder':
      actions.push(
        { id: 'view', title: 'View Details', icon: '👁️' },
        { id: 'directions', title: 'Get Directions', icon: '🗺️' },
        { id: 'remind_later', title: 'Remind Later', icon: '⏰' }
      );
      break;
    case 'game_cancelled':
      actions.push(
        { id: 'view', title: 'View Details', icon: '👁️' }
      );
      break;
    default:
      return [];
  }
  
  return actions;
};

// Generate notification titles
const getNotificationTitle = (gameData, type) => {
  switch (type) {
    case 'game_scheduled':
      return '🏆 New Game Scheduled!';
    case 'game_updated':
      return '📝 Game Updated';
    case 'game_cancelled':
      return '❌ Game Cancelled';
    case 'game_reminder':
      return '⏰ Game Reminder';
    default:
      return '🏆 Game Notification';
  }
};
