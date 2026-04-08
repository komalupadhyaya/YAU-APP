import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getCurrentUserData } from "../../firebase/apis/api-members";
import { useNavigate, useLocation } from "react-router-dom";
import UniformDashboard from "../Uniforms/UniformDashboard";
import { GameSchedulesService, EventsService, CommunityService } from "../../services/apiService";
import NotificationService from "../../services/notificationService";
import defaultChild from '../../assets/child.jpg';
import StudentInfo from "./StudentInfo";
// src\services\rosterTeamChatService.js
import RosterTeamChatService from "../../services/rosterTeamChatService";
import NextGameCard from "./GameCard";
import TeamUpdates from "./TeamUpdates";
import { CheckCircle, Clock } from "lucide-react";
import dayjs from "dayjs";

import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';


dayjs.extend(utc);
dayjs.extend(timezone);

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showWelcome, setShowWelcome] = useState(false);
  const [chats, setChats] = useState([]);
  const [nextGameDataFilter, setNextGameDataFilter] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    currentUser: null,
    upcomingGames: [],
    upcomingEvents: [],
    recentNotifications: [],
    communityStats: null,
    membershipStatus: 'Free',
    children: [],
    loading: true
  });

  useEffect(() => {
  const checkWelcomeMessage = () => {
    if (!dashboardData.currentUser) return;

    // Use registration date (createdAt) or payment date as fallback
    const registrationDate = dashboardData.currentUser.createdAt || dashboardData.currentUser.lastPaymentDate;
    if (!registrationDate) return;

    const regDate = new Date(registrationDate);
    const now = new Date();

    const diffInMs = now - regDate;
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    // Check if dismissed from user profile (database)
    const dismissed = dashboardData.currentUser.welcomeMessageDismissed === true;

    if (diffInDays <= 7 && !dismissed) {
      setShowWelcome(true);
    }
  };

  checkWelcomeMessage();
}, [dashboardData.currentUser, user]);

  // Check for welcome message from registration
  useEffect(() => {
    if (location.state?.justRegistered && location.state?.showWelcome) {
      setShowWelcome(true);
      // Clear the location state after showing welcome
      const timer = setTimeout(() => {
        setShowWelcome(false);
        // Clear state to prevent showing again on refresh
        navigate('/', { replace: true, state: {} });
      }, 8000); // Show for 8 seconds

      return () => clearTimeout(timer);
    }
  }, [location.state, navigate]);

    console.log("useruseruseruser", user)
    console.log("chats", chats)
    useEffect(() => {
    const fetchChats = async () => {
      try {
        if (!user) return;

        const data = await RosterTeamChatService.getUserChatsWithMessages(
          user.uid,
          user.email,
          1
        );

        setChats(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchChats();
  }, [user]);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user?.email) {
        console.log('No user email available');
        setDashboardData(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        console.log('🔄 Loading dashboard data for user email:', user.email);

        // Get current user's detailed data from both collections using EMAIL
        const currentUserData = await getCurrentUserData(user.email);

        console.log("currentUserData-API", currentUserData)
console.log(currentUserData);
        // Fetch dynamic data in parallel
        const [schedulesResponse, eventsResponse, notificationsResponse, communityStatsResponse] = await Promise.allSettled([
          GameSchedulesService.getAll(),
          EventsService.getAll(),
          NotificationService.getAdminNotifications(),
          CommunityService.getStats()
        ]);

        console.log("schedulesResponse", schedulesResponse?.value?.data.map(g => ({date: g.date, time:g.time, team1: g.team1, team2: g.team2})))
        setNextGameDataFilter(schedulesResponse?.value?.data || []);

        // Process upcoming games from API
        const schedulesData = schedulesResponse.status === 'fulfilled'
          ? (schedulesResponse.value.data || schedulesResponse.value)
          : [];

        const upcomingGames = schedulesData
          .filter(game => {
            const gameDate = new Date(game.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Normalize today's date to midnight
            const diffTime = gameDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Filter by sport, ageGroup, and location from user data
            const matchesSport = currentUserData.sport.toLowerCase() === game.sport.toLowerCase();
            const matchesAgeGroup = currentUserData.students.some(student => 
              student.ageGroup === game.ageGroup
            );
            const matchesLocation = game.location === currentUserData.location;
            
            return diffDays >= 0 && diffDays <= 7 && matchesSport && matchesAgeGroup && matchesLocation;
          })
          .slice(0, 3) // Get the first 3 games
          .map(game => ({
            id: game.id,
            time: game.time,
            opponent: game.team2Name || game.team2 || "TBD",
            location: game.location || "TBD",
            team: game.team1Name || game.team1 || "Team",
            date: game.date,
            homeAway: game.team1Id.includes(currentUserData.location.toLowerCase()) ? 'Home' : 'Away',
            notes: game.notes || ''
          }));

        // Process upcoming events from API
        const eventsData = eventsResponse.status === 'fulfilled'
          ? (eventsResponse.value.data || eventsResponse.value)
          : [];

        const upcomingEvents = eventsData
          .filter(event => {
            const eventDate = new Date(event.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Normalize today's date to midnight
            return eventDate >= today;
          })
          .slice(0, 3) // Get only the first 3 upcoming events
          .map(event => ({
            id: event.id,
            title: event.title,
            date: event.date,
            time: event.time,
            location: event.location,
            imageUrl: event.imageUrl || ''
          }));

        // Process recent notifications
        const notificationsData = notificationsResponse.status === 'fulfilled'
          ? (notificationsResponse.value.data || [])
          : [];

        const recentNotifications = notificationsData
          .filter(notif => !notif.read)
          .slice(0, 3)
          .map(notif => ({
            id: notif.id,
            title: notif.title,
            description: notif.description,
            priority: notif.priority,
            timestamp: notif.timestamp
          }));

        // Process community stats
        const communityStats = communityStatsResponse.status === 'fulfilled'
          ? communityStatsResponse.value
          : null;

        setDashboardData({
          currentUser: currentUserData,
          upcomingGames: upcomingGames,
          upcomingEvents: upcomingEvents,
          recentNotifications: recentNotifications,
          communityStats: communityStats,
          membershipStatus: currentUserData.isPaidMember ? 'Paid' : 'Free',
          children: currentUserData.students || [],
          loading: false
        });

        console.log('✅ Dashboard data loaded:', {
          userName: `${currentUserData.firstName} ${currentUserData.lastName}`,
          collection: currentUserData.collection,
          isPaidMember: currentUserData?.isPaidMember,
          childrenCount: currentUserData.childrenCount,
          upcomingGamesCount: upcomingGames.length,
          upcomingEventsCount: upcomingEvents.length,
          unreadNotifications: recentNotifications.length
        });


        

      } catch (error) {
        console.error('❌ Error loading dashboard data:', error);

        // Create minimal user data if there's an error
        const minimalUser = {
          email: user?.email || '',
          firstName: user?.displayName?.split(' ')[0] || '',
          lastName: user?.displayName?.split(' ')[1] || '',
          isPaidMember: false,
          students: [],
          collection: 'firebase_only',
          sport: '',
          location: ''
        };

        setDashboardData(prev => ({
          ...prev,
          loading: false,
          currentUser: minimalUser,
          upcomingGames: [],
          upcomingEvents: [],
          recentNotifications: [],
          communityStats: null,
          membershipStatus: 'Free',
          children: []
        }));
      }
    };

    loadDashboardData();
  }, [user]);



  if (dashboardData.loading) {
    return (
      <div className="flex-1 p-6 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentUser = dashboardData.currentUser || user;
  const userName = currentUser?.firstName && currentUser?.lastName
    ? `${currentUser.firstName} ${currentUser.lastName}`.trim()
    : currentUser?.firstName
      ? currentUser.firstName
      : currentUser?.email?.split('@')[0] || 'User';

  const nextGame = dashboardData.upcomingGames.length > 0 ? dashboardData.upcomingGames[0] : null;


  console.log("currentUser?.students?", currentUser?.students)
  console.log("currentUsercurrentUsercurrentUser", currentUser)
  console.log("nextGame", nextGame)





  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {/* Page title */}
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Welcome Message for New Registrations */}
      {showWelcome && (
        <div className="mb-6 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-2xl shadow-xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                🎉
              </div>
              <div>
                <h3 className="text-2xl font-bold">Welcome to Youth Athlete University!</h3>
                <p className="text-green-100">Your registration and membership are now active</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-semibold text-yellow-200 mb-2">✅ What You Can Do Now:</h4>
                <ul className="space-y-1 text-white/90">
                  <li>• View your student's team messages & schedules</li>
                  <li>• Order uniforms {location.state?.membershipType === 'one_time' ? '(included with your plan!)' : '($75 each)'}</li>
                  <li>• Join community events and activities</li>
                  <li>• Access exclusive parent resources</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-yellow-200 mb-2">🚀 Next Steps:</h4>
                <ul className="space-y-1 text-white/90">
                  <li>• Check your email for welcome information</li>
                  <li>• Explore your dashboard features below</li>
                  <li>• Connect with other YAU families</li>
                  <li>• Stay tuned for practice schedules</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 flex gap-3 flex-wrap">
              <button 
                onClick={() => navigate('/uniform')}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
              >
                {location.state?.membershipType === 'one_time' ? 'Get Your Free Uniform' : 'Order Uniform'}
              </button>
              <button 
                onClick={() => navigate('/invitaions')}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
              >
                Explore Community
              </button>
              <button
                onClick={async () => {
                  setShowWelcome(false);
                  // Update user document in database
                  try {
                    const { updateMember } = await import("../../firebase/apis/api-members");
                    await updateMember(user.uid, { welcomeMessageDismissed: true });
                  } catch (error) {
                    console.error("Error dismissing welcome message:", error);
                  }
                }}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors ml-auto"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome */}
      <h2 className="text-3xl font-bold mb-6">
        {showWelcome ? `Hello, ${userName}! 🎉` : `Welcome back, ${userName}`}
      </h2>


       <div className="flex-1 p-6 overflow-y-auto">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Membership Status */}
        <div className="bg-white rounded-2xl shadow p-5 hidden">
          <h3 className="font-semibold mb-2">Membership Status</h3>
          <p
            className={`font-bold ${
              currentUser?.isPaidMember ? "text-green-600" : "text-orange-600"
            }`}
          >
            {dashboardData.membershipStatus}
          </p>
          <div className="w-full h-2 bg-gray-200 rounded mt-2">
            <div
              className={`h-2 rounded ${
                currentUser?.isPaidMember
                  ? "bg-green-500 w-full"
                  : "bg-orange-500 w-3/4"
              }`}
            ></div>
          </div>

          {!currentUser?.isPaidMember ? (
            <button
              onClick={() => navigate("/checkout")}
              className="mt-3 px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-medium"
            >
              Pay Now
            </button>
          ) : (
            <button
              onClick={() => navigate("/payments")}
              className="mt-3 px-4 py-2 rounded-lg bg-gray-100 text-sm font-medium"
            >
              View Details
            </button>
          )}
        </div>



        <div className="bg-white rounded-2xl shadow p-5">
  <h3 className="font-semibold mb-2">Membership Status</h3>
  
  {/* Badge */}
  {currentUser?.isPaidMember ? (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
      <CheckCircle size={12} />
      Paid
    </span>
  ) : currentUser?.paymentStatus === 'Active' ? (
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

  {/* Progress Bar */}
  <div className="w-full h-2 bg-gray-200 rounded mt-2">
    <div
      className={`h-2 rounded ${
        currentUser?.isPaidMember
          ? "bg-green-500 w-full"
          : "bg-orange-500 w-3/4"
      }`}
    ></div>
  </div>

  {/* Buttons */}
  {(currentUser?.paymentStatus === 'Active' || !currentUser?.isPaidMember) ? (
    <button
      onClick={() => navigate("/checkout")}
      className="mt-3 px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-medium"
    >
      Pay Now
    </button>
  ) : (
    <button
      onClick={() => navigate("/payments")}
      className="mt-3 px-4 py-2 rounded-lg bg-gray-100 text-sm font-medium"
    >
      View Details
    </button>
  )}
</div>


        {/* Next Game */}
        <div className="">
          <NextGameCard  schedulesResponse={nextGameDataFilter}/>
        </div>

        {/* Student Info */}
        <div className="bg-white rounded-2xl shadow p-5 flex items-center gap-4">
          <StudentInfo childrenData={dashboardData.children} />
        </div>

        {/* Team Updates */}
        <div className="">
          {/* <h3 className="font-semibold mb-2">Team Updates</h3> */}
          {/* {dashboardData.recentNotifications.length > 0 ? (
            dashboardData.recentNotifications.map((update) => (
              <p
                key={update.id}
                className="text-sm text-gray-600 border-b py-2"
              >
                {update.description}
              </p>
            ))
          ) : (
            <p className="text-sm text-gray-500">No team updates</p>
          )} */}

          <TeamUpdates teams={chats?.data} />
        </div>
          {/* upcomming events  */}
        <div className="bg-white rounded-2xl shadow p-5">
                <div className="gap-2 flex flex-col">
        {/* Upcoming Events */}
        <div className="bg-white rounded-2xl shadow p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Upcoming Events</h3>
            <button
              onClick={() => navigate('/events')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All
            </button>
          </div>
          {dashboardData.upcomingEvents.length > 0 ? (
            <div className="space-y-2">
              {dashboardData.upcomingEvents.map(event => (
                <div key={event.id} className="flex justify-between items-start py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="font-medium text-sm">{event.title}</p>
                    <p className="text-xs text-gray-500">
                      {/* {new Date(event.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })} at {event.time} */}

                        {dayjs(`${event.date}T${event.time}`)
                          .tz('America/New_York')
                          .format('ddd, MMM D, h:mm A')} EST
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">{event.location}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No upcoming events</p>
          )}
        </div>

        {/* Recent Notifications */}
        <div className="bg-white rounded-2xl shadow p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Recent Notifications</h3>
            <button
              onClick={() => navigate('/messages')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All
            </button>
          </div>
          {dashboardData.recentNotifications.length > 0 ? (
            <div className="space-y-2">
              {dashboardData.recentNotifications.map(notification => (
                <div key={notification.id} className="flex items-start gap-2 py-2 border-b border-gray-100 last:border-b-0">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    notification.priority === 'high' ? 'bg-red-500' :
                    notification.priority === 'normal' ? 'bg-blue-500' : 'bg-gray-400'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{notification.title}</p>
                    <p className="text-xs text-gray-500 line-clamp-2">{notification.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No new notifications</p>
          )}
        </div>
      </div>
        </div>
        {/* Quick Links */}
        <div className="bg-white rounded-2xl shadow p-5">
      <div className="bg-white rounded-2xl shadow p-4 mb-6">
        <h3 className="font-semibold mb-3">Quick Links</h3>
        <div className="flex gap-2 flex-wrap">
          {!currentUser?.isPaidMember && (
            <button
              onClick={() => navigate('/checkout')}
              className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors"
            >
              Pay Now
            </button>
          )}
          <button
            onClick={() => navigate('/uniform')}
            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium"
          >
            View Uniforms
          </button>
          <button
            onClick={() => navigate('/schedule')}
            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium"
          >
            View Schedule
          </button>
          <button
            onClick={() => navigate('/events')}
            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium"
          >
            Events
          </button>
          <button
            onClick={() => navigate('/community')}
            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium"
          >
            Community
          </button>
          <button
            onClick={() => navigate('/resources')}
            className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium"
          >
            Resources
          </button>
          {dashboardData.children.length > 0 && (
            <button
              onClick={() => navigate('/children')}
              className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium"
            >
              View Children ({dashboardData.children.length})
            </button>
          )}
        </div>
      </div>
        </div>
      </div>
    </div>

      {/* Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 hidden">
        {/* Membership Status */}
        <div className="bg-white rounded-2xl shadow p-4">
          <h3 className="font-semibold mb-2">Membership Status</h3>
          <p className={`text-lg font-bold ${currentUser?.isPaidMember ? 'text-green-600' : 'text-orange-600'}`}>
            {dashboardData.membershipStatus}
          </p>
          <div className="w-full h-2 bg-gray-200 rounded mt-2">
            <div className={`h-2 rounded transition-all duration-300 ${currentUser?.isPaidMember
              ? 'bg-green-500 w-full'
              : 'bg-orange-500 w-3/4'
            }`}></div>
          </div>
          {!currentUser?.isPaidMember ? (
            <button
              onClick={() => navigate('/checkout')}
              className="mt-3 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors"
            >
              Pay Now
            </button>
          ) : (
            <button
              className="mt-3 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium"
              onClick={() => navigate('/membership')}
            >
              View Details
            </button>
          )}
        </div>

        {/* Next Game */}
        <div className="bg-white rounded-2xl shadow p-4">
          <h3 className="font-semibold mb-2">Next Game</h3>
          {nextGame ? (
            <>
              <p className="text-red-500 font-bold">{nextGame.team} vs. {nextGame.opponent}</p>
              <p className="text-gray-700">
                {new Date(nextGame.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                })} at {nextGame.time}
              </p>
              <p className="text-sm text-gray-500 mt-1">{nextGame.location}</p>
              {nextGame.notes && (
                <p className="text-sm text-gray-500 mt-1">Notes: {nextGame.notes}</p>
              )}
            </>
          ) : (
            <>
              <p className="text-gray-500 font-bold">No games scheduled</p>
              <p className="text-gray-700">Check back later</p>
              <button
                onClick={() => navigate('/schedule')}
                className="mt-3 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-medium"
              >
                View Schedule
              </button>
            </>
          )}
        </div>

        {/* Uniforms Widget */}
        <div className="lg:col-span-1">
          <UniformDashboard />
        </div>
      </div>

      {/* Secondary Cards Row - Events and Notifications */}


      {/* Quick Links */}


      {/* Today's Schedule */}
      <div className="bg-white rounded-2xl shadow p-4 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Today's Schedule</h3>
          <button
            onClick={() => navigate('/schedule')}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View All
          </button>
        </div>
        {dashboardData.upcomingGames.length > 0 ? (
          dashboardData.upcomingGames.slice(0, 3).map((game, index) => (
            <div key={game.id} className={`flex justify-between items-start py-2 ${index < dashboardData.upcomingGames.slice(0, 3).length - 1 ? 'border-b' : ''}`}>
              <div>
                <span className="font-medium">{game.team} vs. {game.opponent}</span>
                <p className="text-xs text-gray-500">
                  {new Date(game.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })} at {game.time}
                </p>
                {game.notes && (
                  <p className="text-xs text-gray-500">Notes: {game.notes}</p>
                )}
              </div>
              <span className="text-sm text-gray-500">{game.location}</span>
            </div>
          ))
        ) : (
          <div className="flex justify-between py-2">
            <span className="text-gray-500">No games scheduled</span>
            <button
              onClick={() => navigate('/schedule')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View Schedule
            </button>
          </div>
        )}
      </div>

      {/* Account Summary */}
      <div className="bg-white rounded-2xl shadow p-4">
        <h3 className="font-semibold mb-3">Account Summary</h3>

        {/* Children Info */}
        {dashboardData.children.length > 0 && (
          <>
            <div className="flex justify-between py-2 border-b">
              <span>Registered Children</span>
              <span className="font-medium">{dashboardData.children.length}</span>
            </div>
            {dashboardData.children.map((child, index) => (
              <div key={index} className="flex justify-between py-2 border-b">
                <span>{child.firstName} {child.lastName}</span>
                <span className="text-sm text-gray-500">{child.grade || child.ageGroup || "N/A"}</span>
              </div>
            ))}
          </>
        )}

        {/* Sport & Location */}
        {currentUser?.sport && (
          <div className="flex justify-between py-2 border-b">
            <span>Sport</span>
            <span className="font-medium">{currentUser.sport}</span>
          </div>
        )}

        {currentUser?.location && (
          <div className="flex justify-between py-2 border-b">
            <span>Location</span>
            <span className="text-sm text-gray-500">{currentUser.location}</span>
          </div>
        )}

        {/* Registration Source */}
        <div className="flex justify-between py-2 border-b">
          <span>Registration Source</span>
          <span className="text-sm text-gray-500">
            {currentUser?.collection === 'members' ? 'Web Portal' : 'Mobile App'}
          </span>
        </div>

        {/* Account Created */}
        <div className="flex justify-between py-2">
          <span>Member Since</span>
          <span className="text-sm text-gray-500">
            {currentUser?.createdAt
              ? new Date(currentUser.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })
              : 'Unknown'
            }
          </span>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;