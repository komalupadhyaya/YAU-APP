// coach/utils/constants.js
export const COACH_ROLES = {
  HEAD_COACH: 'head_coach',
  ASSISTANT_COACH: 'assistant_coach',
  VOLUNTEER_COACH: 'volunteer_coach'
};

export const MESSAGE_TYPES = {
  TEAM_ANNOUNCEMENT: 'team_announcement',
  PRACTICE_UPDATE: 'practice_update',
  GAME_UPDATE: 'game_update',
  GENERAL: 'general'
};

export const EVENT_TYPES = {
  PRACTICE: 'practice',
  GAME: 'game',
  TOURNAMENT: 'tournament',
  MEETING: 'meeting'
};

export const SPORTS_ICONS = {
  'Soccer': '⚽',
  'Basketball': '🏀',
  'Baseball': '⚾',
  'Track & Field': '🏃‍♂️',
  'Flag Football': '🏈',
  'Tackle Football': '🏈',
  'Kickball': '🥎',
  'Golf': '🏌️',
  'Cheer': '📣'
};

export const AGE_GROUPS = ['3U', '4U', '5U', '6U', '7U', '8U', '9U', '10U', '11U', '12U', '13U', '14U'];

export const LOCATIONS = [
  'National Harbor, MD',
  'Greenbelt, MD',
  'Bowie, MD',
  'Andrews AFB - Clinton',
  'Waldorf-Laplata, MD',
  'New York'
];

export const QUICK_MESSAGE_TEMPLATES = [
  {
    id: 'practice_reminder',
    title: 'Practice Reminder',
    subject: 'Practice Reminder - {{teamName}}',
    message: 'Hi families!\n\nJust a friendly reminder about our upcoming practice:\n\nDate: {{date}}\nTime: {{time}}\nLocation: {{location}}\n\nPlease make sure your child brings water and appropriate gear.\n\nSee you there!'
  },
  {
    id: 'game_reminder',
    title: 'Game Reminder',
    subject: 'Game Day - {{teamName}} vs {{opponent}}',
    message: 'Game Day is here!\n\nDetails:\nDate: {{date}}\nTime: {{time}}\nLocation: {{location}}\nOpponent: {{opponent}}\n\nPlease arrive 15 minutes early. Good luck team!'
  },
  {
    id: 'weather_update',
    title: 'Weather Update',
    subject: 'Weather Update - {{teamName}}',
    message: 'Hi families,\n\nDue to weather conditions, today\'s {{eventType}} has been {{status}}.\n\nWe will update you with the makeup date/time as soon as possible.\n\nStay safe!'
  }
];

export const COACH_PERMISSIONS = {
  VIEW_ROSTER: 'view_roster',
  MESSAGE_TEAM: 'message_team',
  CREATE_EVENTS: 'create_events',
  REPORT_SCORES: 'report_scores',
  VIEW_PARENT_CONTACTS: 'view_parent_contacts'
};