// coach/utils/coachHelpers.js
import { SPORTS_ICONS, AGE_GROUPS } from './constants';

export const getSportIcon = (sport) => {
  return SPORTS_ICONS[sport] || '🏆';
};

export const getAgeGroupColor = (ageGroup) => {
  const colors = {
    '3U': 'bg-pink-100 text-pink-800 border-pink-200',
    '4U': 'bg-purple-100 text-purple-800 border-purple-200',
    '5U': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    '6U': 'bg-blue-100 text-blue-800 border-blue-200',
    '7U': 'bg-cyan-100 text-cyan-800 border-cyan-200',
    '8U': 'bg-green-100 text-green-800 border-green-200',
    '9U': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    '10U': 'bg-orange-100 text-orange-800 border-orange-200',
    '11U': 'bg-red-100 text-red-800 border-red-200',
    '12U': 'bg-rose-100 text-rose-800 border-rose-200',
    '13U': 'bg-violet-100 text-violet-800 border-violet-200',
    '14U': 'bg-gray-100 text-gray-800 border-gray-200'
  };
  return colors[ageGroup] || 'bg-gray-100 text-gray-800 border-gray-200';
};

export const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  return age;
};

export const formatDate = (date, options = {}) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  return dateObj.toLocaleDateString('en-US', { ...defaultOptions, ...options });
};

export const formatTime = (date, options = {}) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };
  
  return dateObj.toLocaleTimeString('en-US', { ...defaultOptions, ...options });
};

export const getRelativeTime = (date) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now - dateObj;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return formatDate(dateObj);
};

export const getUpcomingEvents = (events, limit = 5) => {
  const now = new Date();
  return events
    .filter(event => new Date(event.date) > now)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, limit);
};

export const getEventStatus = (event) => {
  const now = new Date();
  const eventDate = new Date(event.date);
  const diffHours = (eventDate - now) / (1000 * 60 * 60);
  
  if (diffHours < 0) return { status: 'past', color: 'text-gray-500' };
  if (diffHours < 2) return { status: 'starting-soon', color: 'text-red-600' };
  if (diffHours < 24) return { status: 'today', color: 'text-green-600' };
  if (diffHours < 48) return { status: 'tomorrow', color: 'text-blue-600' };
  
  return { status: 'upcoming', color: 'text-gray-600' };
};

export const generateTeamCode = (sport, ageGroup, location) => {
  const sportCode = sport.replace(/\s+/g, '').substring(0, 3).toUpperCase();
  const locationCode = location.replace(/\s+/g, '').substring(0, 3).toUpperCase();
  return `${sportCode}-${ageGroup}-${locationCode}`;
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone) => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
  }
  
  return phone; // Return original if not 10 digits
};

export const getPlayerInitials = (player) => {
  if (player.firstName && player.lastName) {
    return `${player.firstName[0]}${player.lastName[0]}`.toUpperCase();
  }
  if (player.name) {
    const nameParts = player.name.split(' ');
    return nameParts.map(part => part[0]).join('').substring(0, 2).toUpperCase();
  }
  return '??';
};

export const sortPlayersByName = (players) => {
  return [...players].sort((a, b) => {
    const nameA = a.name || `${a.firstName || ''} ${a.lastName || ''}`.trim();
    const nameB = b.name || `${b.firstName || ''} ${b.lastName || ''}`.trim();
    return nameA.localeCompare(nameB);
  });
};

export const groupPlayersByAge = (players) => {
  const groups = {};
  
  players.forEach(player => {
    const age = calculateAge(player.dob) || 'Unknown';
    if (!groups[age]) {
      groups[age] = [];
    }
    groups[age].push(player);
  });
  
  return groups;
};

export const getTeamStatistics = (roster) => {
  const players = roster.participants || [];
  
  return {
    totalPlayers: players.length,
    averageAge: players.length > 0 ? 
      players.reduce((sum, player) => sum + (calculateAge(player.dob) || 0), 0) / players.length : 0,
    uniqueFamilies: new Set(players.map(p => p.parentId)).size,
    playersWithCompleteInfo: players.filter(p => p.parentEmail && p.parentPhone).length
  };
};

export const createGroupChatId = (rosterId) => {
  // Create consistent group chat ID from roster ID
  return rosterId.toLowerCase().replace(/[^a-z0-9]/g, '_');
};

export const isValidRosterStatus = (status) => {
  const validStatuses = ['active', 'needs-coach', 'needs-players', 'empty', 'inactive'];
  return validStatuses.includes(status);
};