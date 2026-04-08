const { db } = require("../utils/firebase");
const {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    query,
    orderBy,
    serverTimestamp,
    writeBatch,
} = require("firebase/firestore");
const RosterService = require("./rosterService");
const AuthService = require("./authService");
const EmailService = require("./emailService");

class CoachService {
    static async getCoaches() {
        try {
            console.log('📋 Fetching coaches from Firestore...');
            
            const querySnapshot = await getDocs(
                query(
                    collection(db, "users"),
                    // where("role", "==", "coach"),
                    orderBy("createdAt", "desc")
                )
            );
            
            const coaches = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt,
                updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : doc.data().updatedAt,
            }));
            
            console.log('✅ Coaches fetched successfully:', coaches.length);
            return coaches;
            
        } catch (error) {
            console.error("❌ Error getting coaches with role filter:", error);
            
            // Fallback: Get all users and filter client-side
            try {
                console.log('🔄 Trying fallback method...');
                const querySnapshot = await getDocs(collection(db, "users"));
                const allUsers = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt,
                    updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : doc.data().updatedAt,
                }));
                
                const coaches = allUsers.filter(user => user.role === 'coach');
                console.log('✅ Fallback successful, found coaches:', coaches.length);
                return coaches;
                
            } catch (fallbackError) {
                console.error("❌ Fallback also failed:", fallbackError);
                throw fallbackError;
            }
        }
    }

    static async getCoachById(id) {
        try {
            console.log('🔍 Fetching coach by ID:', id);
            
            const docRef = doc(db, "users", id);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const coachData = docSnap.data();
                const coach = {
                    id: docSnap.id,
                    ...coachData,
                    createdAt: coachData.createdAt?.toDate ? coachData.createdAt.toDate() : coachData.createdAt,
                    updatedAt: coachData.updatedAt?.toDate ? coachData.updatedAt.toDate() : coachData.updatedAt,
                };
                
                console.log('✅ Coach found:', coach.firstName, coach.lastName);
                console.log('🔍 Coach has assignedTeams:', coach.assignedTeams?.length || 0);
                return coach;
            }
            
            console.log('❌ Coach not found');
            return null;
            
        } catch (error) {
            console.error("❌ Error getting coach:", error);
            throw error;
        }
    }

    static async createCoach(coachData) {
        try {
            console.log('👨‍🏫 Creating new coach:', coachData);

            // Validate required fields
            if (!coachData.firstName || !coachData.lastName || !coachData.email) {
                throw new Error('First name, last name, and email are required');
            }

            let firebaseUserId = null;

            // Create Firebase Auth user if email and password provided
            if (coachData.email && coachData.password) {
                console.log('🔐 Creating Firebase Auth user...');
                try {
                    firebaseUserId = await AuthService.createFirebaseAuthUser(coachData.email, coachData.password);
                    console.log('✅ Firebase Auth user created with UID:', firebaseUserId);
                } catch (authError) {
                    console.error('❌ Error creating Firebase Auth user:', authError);
                    throw new Error(`Failed to create authentication account: ${authError.message}`);
                }
            }

            // Prepare coach document with all existing fields
            const coachDocData = {
                // Basic info
                firstName: coachData.firstName.trim(),
                lastName: coachData.lastName.trim(),
                email: coachData.email.toLowerCase().trim(),
                phone: coachData.phone || '',
                role: 'coach',
                
                // Firebase Auth UID (important for existing coaches)
                uid: firebaseUserId,
                
                // Sports and experience
                primarySport: coachData.primarySport || 'Soccer',
                secondarySports: coachData.secondarySports || [],
                experience: coachData.experience || '',
                certifications: coachData.certifications || [],
                yearsExperience: coachData.yearsExperience || '',
                
                // Location and assignments (matching existing structure)
                location: coachData.location || '',
                assignedGroups: coachData.assignedGroups || [],
                assignedLocations: coachData.assignedLocations || [],
                assignedTeams: coachData.assignedTeams || [],
                
                // Status and metadata
                isActive: coachData.isActive !== undefined ? coachData.isActive : true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                
                // Additional fields for compatibility
                rosters: coachData.rosters || [], // Legacy field
            };

            // Remove password from document data (don't store it in Firestore)
            delete coachDocData.password;

            console.log('💾 Saving coach to Firestore with structure:', {
                ...coachDocData,
                password: '[REMOVED]',
                uid: firebaseUserId || '[NO_UID]'
            });
            
            // Add to Firestore
            const docRef = await addDoc(collection(db, "users"), coachDocData);
            
            console.log('✅ Coach created successfully with ID:', docRef.id);
            
            // Send welcome email if password was provided
            if (coachData.password && coachData.email) {
                try {
                    console.log('📧 Sending welcome email to coach:', coachData.email);
                    await EmailService.sendCoachWelcomeEmail(
                        coachData.email,
                        coachData.password,
                        coachData.firstName
                    );
                    console.log('✅ Welcome email sent successfully');
                } catch (emailError) {
                    // Log error but don't fail coach creation if email fails
                    console.error('❌ Error sending welcome email (coach still created):', emailError);
                }
            }
            
            return docRef.id;
            
        } catch (error) {
            console.error("❌ Error creating coach:", error);
            throw error;
        }
    }

    static async updateCoach(id, updates) {
        try {
            console.log('📝 Updating coach:', id, 'with updates:', Object.keys(updates));
            
            const coach = await this.getCoachById(id);
            if (!coach) {
                throw new Error("Coach not found");
            }

            // Prepare update data, preserving existing structure
            const updateData = {
                ...updates,
                updatedAt: serverTimestamp(),
            };

            // Remove password if present (don't store in Firestore)
            delete updateData.password;
            
            // Preserve important fields if not in updates
            if (updates.assignedGroups !== undefined) {
                updateData.assignedGroups = updates.assignedGroups;
            }
            if (updates.assignedLocations !== undefined) {
                updateData.assignedLocations = updates.assignedLocations;
            }
            if (updates.assignedTeams !== undefined) {
                updateData.assignedTeams = updates.assignedTeams;
            }
            
            const docRef = doc(db, "users", id);
            await updateDoc(docRef, updateData);
            console.log('✅ Coach updated successfully');

            // Handle Email Notifications (Non-blocking)
            if (updates.status && updates.status !== coach.status) {
                if (updates.status === 'approved') {
                    EmailService.sendCoachApprovalEmail(coach.email, coach.firstName)
                        .catch(err => console.error("📧 Failed to send approval email:", err));
                } else if (updates.status === 'rejected') {
                    EmailService.sendCoachRejectionEmail(coach.email, coach.firstName, updates.rejectionReason || "")
                        .catch(err => console.error("📧 Failed to send rejection email:", err));
                }
            }
            
        } catch (error) {
            console.error("❌ Error updating coach:", error);
            throw error;
        }
    }

    static async deleteCoach(id) {
        try {
            console.log('🗑️ Deleting coach:', id);
            
            const coach = await this.getCoachById(id);
            if (!coach) {
                throw new Error("Coach not found");
            }

            // Get rosters assigned to this coach (check both coachId and uid)
            const rosters = await RosterService.getRosters();
            const assignedRosters = rosters.filter(roster => 
                roster.coachId === id || roster.coachId === coach.uid
            );
            
            console.log(`📋 Found ${assignedRosters.length} rosters assigned to this coach`);

            const batch = writeBatch(db);

            // Update all assigned rosters to remove coach
            for (const roster of assignedRosters) {
                const rosterRef = doc(db, "rosters", roster.id);
                const newStatus = roster.playerCount > 0 ? "needs-coach" : "empty";
                
                batch.update(rosterRef, {
                    coachId: null,
                    coachName: "Unassigned",
                    hasAssignedCoach: false,
                    status: newStatus,
                    lastUpdated: serverTimestamp(),
                });
                
                console.log(`📋 Updated roster ${roster.id} status to: ${newStatus}`);
            }

            // Delete the coach
            const coachRef = doc(db, "users", id);
            batch.delete(coachRef);

            await batch.commit();
            
            console.log('✅ Coach deleted successfully');
            
        } catch (error) {
            console.error("❌ Error deleting coach:", error);
            throw error;
        }
    }

    static async bulkDeleteCoaches(coachIds) {
        if (!Array.isArray(coachIds)) {
            throw new Error("coachIds must be an array");
        }

        const results = [];

        for (const coachId of coachIds) {
            if (!coachId) {
                results.push({
                    id: coachId,
                    status: 'failed',
                    error: 'Invalid coach ID'
                });
                continue;
            }

            try {
                await this.deleteCoach(coachId);
                results.push({
                    id: coachId,
                    status: 'deleted'
                });
            } catch (error) {
                console.error(`❌ Error deleting coach ${coachId}:`, error);
                results.push({
                    id: coachId,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        return results;
    }

    // Enhanced assignment method that works with existing structure
    static async assignCoachToTeams(coachId, assignmentData) {
        try {
            console.log('🎯 Assigning coach to teams:', { coachId, assignmentData });
            
            const coach = await this.getCoachById(coachId);
            if (!coach) {
                throw new Error("Coach not found");
            }

            const {
                primarySport,
                secondarySports = [],
                assignedGroups = [],
                assignedLocations = []
            } = assignmentData;

            if (!assignedGroups.length || !assignedLocations.length) {
                throw new Error("At least one age group and one location must be assigned");
            }

            const batch = writeBatch(db);
            const assignedTeams = [];
            let rostersUpdated = 0;

            // Create team assignments for each location + age group combination
            for (const location of assignedLocations) {
                for (const ageGroup of assignedGroups) {
                    // Primary sport team
                    const primaryTeamId = `${primarySport.toLowerCase().replace(/\s+/g, '-')}-${ageGroup.toLowerCase()}-${location.toLowerCase().replace(/\s+/g, '-')}`;
                    
                    const primaryTeam = {
                        id: primaryTeamId,
                        sport: primarySport,
                        ageGroup: ageGroup,
                        location: location,
                        teamName: `${ageGroup} ${primarySport} - ${location}`,
                        isPrimary: true,
                        playerCount: 0
                    };

                    assignedTeams.push(primaryTeam);

                    // Try to update existing roster
                    try {
                        const rosterRef = doc(db, "rosters", primaryTeamId);
                        const rosterSnap = await getDoc(rosterRef);
                        
                        if (rosterSnap.exists()) {
                            const existingRoster = rosterSnap.data();
                            batch.update(rosterRef, {
                                coachId: coachId,
                                coachName: `${coach.firstName} ${coach.lastName}`,
                                hasAssignedCoach: true,
                                status: existingRoster.playerCount > 0 ? 'active' : 'needs-players',
                                lastUpdated: serverTimestamp(),
                            });
                            
                            primaryTeam.playerCount = existingRoster.playerCount || 0;
                            rostersUpdated++;
                        }
                    } catch (rosterError) {
                        console.warn(`Could not update roster ${primaryTeamId}:`, rosterError.message);
                    }

                    // Secondary sport teams
                    for (const secondarySport of secondarySports) {
                        const secondaryTeamId = `${secondarySport.toLowerCase().replace(/\s+/g, '-')}-${ageGroup.toLowerCase()}-${location.toLowerCase().replace(/\s+/g, '-')}`;
                        
                        const secondaryTeam = {
                            id: secondaryTeamId,
                            sport: secondarySport,
                            ageGroup: ageGroup,
                            location: location,
                            teamName: `${ageGroup} ${secondarySport} - ${location}`,
                            isPrimary: false,
                            playerCount: 0
                        };

                        assignedTeams.push(secondaryTeam);

                        // Try to update existing roster
                        try {
                            const rosterRef = doc(db, "rosters", secondaryTeamId);
                            const rosterSnap = await getDoc(rosterRef);
                            
                            if (rosterSnap.exists()) {
                                const existingRoster = rosterSnap.data();
                                batch.update(rosterRef, {
                                    coachId: coachId,
                                    coachName: `${coach.firstName} ${coach.lastName}`,
                                    hasAssignedCoach: true,
                                    status: existingRoster.playerCount > 0 ? 'active' : 'needs-players',
                                    lastUpdated: serverTimestamp(),
                                });
                                
                                secondaryTeam.playerCount = existingRoster.playerCount || 0;
                                rostersUpdated++;
                            }
                        } catch (rosterError) {
                            console.warn(`Could not update roster ${secondaryTeamId}:`, rosterError.message);
                        }
                    }
                }
            }

            // Update coach with assignment data (matching existing structure)
            const coachRef = doc(db, "users", coachId);
            batch.update(coachRef, {
                primarySport: primarySport,
                secondarySports: secondarySports,
                assignedGroups: assignedGroups,
                assignedLocations: assignedLocations,
                assignedTeams: assignedTeams,
                updatedAt: serverTimestamp()
            });

            await batch.commit();

            console.log(`✅ Coach assignment completed: ${rostersUpdated} existing rosters updated`);
            
            return {
                success: true,
                rostersUpdated,
                totalAssignments: assignedTeams.length,
                assignedTeams
            };
            
        } catch (error) {
            console.error("❌ Error assigning coach to teams:", error);
            throw error;
        }
    }

    static async assignCoachToRoster(coachId, rosterId) {
        try {
            console.log('🎯 Assigning coach to single roster:', { coachId, rosterId });
            
            const coach = await this.getCoachById(coachId);
            if (!coach) {
                throw new Error("Coach not found");
            }

            const roster = await RosterService.getRosterById(rosterId);
            if (!roster) {
                throw new Error("Roster not found");
            }

            const batch = writeBatch(db);

            // Update roster with coach assignment
            const rosterRef = doc(db, "rosters", rosterId);
            const newStatus = roster.playerCount >= (roster.minPlayers || 6) ? "active" : "forming";
            
            batch.update(rosterRef, {
                coachId: coachId,
                coachName: `${coach.firstName} ${coach.lastName}`,
                hasAssignedCoach: true,
                status: newStatus,
                lastUpdated: serverTimestamp(),
            });

            // Update coach's assigned teams (preserve existing structure)
            const currentAssignedTeams = coach.assignedTeams || [];
            const newTeamAssignment = {
                id: rosterId,
                sport: roster.sport,
                ageGroup: roster.ageGroup,
                location: roster.location,
                teamName: roster.teamName,
                isPrimary: roster.sport === coach.primarySport,
                playerCount: roster.playerCount || 0
            };

            // Check if team is already assigned
            const existingIndex = currentAssignedTeams.findIndex(team => team.id === rosterId);
            let updatedAssignedTeams;
            
            if (existingIndex >= 0) {
                updatedAssignedTeams = [...currentAssignedTeams];
                updatedAssignedTeams[existingIndex] = newTeamAssignment;
            } else {
                updatedAssignedTeams = [...currentAssignedTeams, newTeamAssignment];
            }

            const coachRef = doc(db, "users", coachId);
            batch.update(coachRef, {
                assignedTeams: updatedAssignedTeams,
                updatedAt: serverTimestamp(),
            });

            await batch.commit();
            
            console.log('✅ Coach assigned to roster successfully');
            
        } catch (error) {
            console.error("❌ Error assigning coach to roster:", error);
            throw error;
        }
    }

    // Get coaches with their assignment status
    static async getCoachesWithAssignments() {
        try {
            console.log('📋 Getting coaches with assignment details...');
            
            const coaches = await this.getCoaches();
            const rosters = await RosterService.getRosters();
            
            const coachesWithAssignments = coaches.map(coach => {
                const assignedRosterCount = rosters.filter(roster => 
                    roster.coachId === coach.id || roster.coachId === coach.uid
                ).length;
                
                const activeRosterCount = rosters.filter(roster => 
                    (roster.coachId === coach.id || roster.coachId === coach.uid) && 
                    roster.playerCount > 0
                ).length;

                return {
                    ...coach,
                    assignmentStats: {
                        totalAssignedRosters: assignedRosterCount,
                        activeRosters: activeRosterCount,
                        assignedTeamsFromData: coach.assignedTeams?.length || 0,
                        hasAssignments: assignedRosterCount > 0 || (coach.assignedTeams?.length || 0) > 0
                    }
                };
            });
            
            console.log('✅ Coaches with assignments calculated');
            return coachesWithAssignments;
            
        } catch (error) {
            console.error("❌ Error getting coaches with assignments:", error);
            throw error;
        }
    }

    // Get coaches by sport (including secondary sports)
    static async getCoachesBySport(sport) {
        try {
            console.log('🏆 Getting coaches by sport:', sport);
            
            const coaches = await this.getCoaches();
            const filteredCoaches = coaches.filter(coach => 
                coach.primarySport === sport || 
                (coach.secondarySports && coach.secondarySports.includes(sport))
            );
            
            console.log(`✅ Found ${filteredCoaches.length} coaches for ${sport}`);
            return filteredCoaches;
            
        } catch (error) {
            console.error("❌ Error getting coaches by sport:", error);
            throw error;
        }
    }

    // Get coaches by location
    static async getCoachesByLocation(location) {
        try {
            console.log('📍 Getting coaches by location:', location);
            
            const coaches = await this.getCoaches();
            const filteredCoaches = coaches.filter(coach => 
                coach.location === location ||
                (coach.assignedLocations && coach.assignedLocations.includes(location))
            );
            
            console.log(`✅ Found ${filteredCoaches.length} coaches for ${location}`);
            return filteredCoaches;
            
        } catch (error) {
            console.error("❌ Error getting coaches by location:", error);
            throw error;
        }
    }

    // Get comprehensive coach statistics
    static async getCoachStats() {
        try {
            console.log('📊 Getting comprehensive coach statistics...');
            
            const coaches = await this.getCoaches();
            
            const stats = {
                totalCoaches: coaches.length,
                activeCoaches: coaches.filter(c => c.isActive !== false).length,
                coachesWithAssignments: coaches.filter(c => 
                    c.assignedTeams && c.assignedTeams.length > 0
                ).length,
                coachesWithUID: coaches.filter(c => c.uid).length,
                sportBreakdown: {},
                locationBreakdown: {},
                assignmentBreakdown: {
                    noAssignments: 0,
                    lightAssignments: 0, // 1-2 teams
                    mediumAssignments: 0, // 3-5 teams  
                    heavyAssignments: 0 // 6+ teams
                }
            };

            // Calculate sport breakdown
            coaches.forEach(coach => {
                const sport = coach.primarySport || 'Unknown';
                stats.sportBreakdown[sport] = (stats.sportBreakdown[sport] || 0) + 1;
                
                // Count secondary sports
                if (coach.secondarySports) {
                    coach.secondarySports.forEach(secondarySport => {
                        const key = `${secondarySport} (Secondary)`;
                        stats.sportBreakdown[key] = (stats.sportBreakdown[key] || 0) + 1;
                    });
                }
            });

            // Calculate location breakdown
            coaches.forEach(coach => {
                const location = coach.location || 'Unknown';
                stats.locationBreakdown[location] = (stats.locationBreakdown[location] || 0) + 1;
                
                // Count assigned locations
                if (coach.assignedLocations) {
                    coach.assignedLocations.forEach(assignedLocation => {
                        const key = `${assignedLocation} (Assigned)`;
                        stats.locationBreakdown[key] = (stats.locationBreakdown[key] || 0) + 1;
                    });
                }
            });

            // Calculate assignment breakdown
            coaches.forEach(coach => {
                const assignmentCount = coach.assignedTeams ? coach.assignedTeams.length : 0;
                
                if (assignmentCount === 0) {
                    stats.assignmentBreakdown.noAssignments++;
                } else if (assignmentCount <= 2) {
                    stats.assignmentBreakdown.lightAssignments++;
                } else if (assignmentCount <= 5) {
                    stats.assignmentBreakdown.mediumAssignments++;
                } else {
                    stats.assignmentBreakdown.heavyAssignments++;
                }
            });

            console.log('✅ Comprehensive coach statistics calculated');
            return stats;
            
        } catch (error) {
            console.error("❌ Error getting coach stats:", error);
            throw error;
        }
    }
}

module.exports = CoachService;