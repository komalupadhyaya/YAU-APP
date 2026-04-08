import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { EventsService } from '../../services/apiService';

// Memoized EventCard component
const EventCard = React.memo(({ 
  event, 
  getCategoryIcon, 
  getCategoryColor, 
  formatDate, 
  formatTime, 
  isEventSoon,
  onAddToCalendar 
}) => (
  <div 
    className={`bg-white rounded-2xl shadow overflow-hidden hover:shadow-md transition-shadow ${
      isEventSoon(event.date, event.time) ? 'ring-2 ring-yellow-200' : ''
    }`}
  >
    {/* Event Image */}
    {event.imageUrl && (
      <div className="relative h-48 overflow-hidden">
        <img
          src={event.imageUrl}
          alt={event.title}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
        {/* Fallback placeholder */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 hidden items-center justify-center"
          style={{ display: 'none' }}
        >
          <span className="text-4xl text-white opacity-80">
            {getCategoryIcon(event.category)}
          </span>
        </div>
        
        {/* Overlay with category and status */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(event.category)} backdrop-blur-sm bg-opacity-90`}>
            {event.category}
          </span>
          {event.isRecurring && (
            <span className="text-xs text-gray-700 bg-white bg-opacity-90 backdrop-blur-sm px-2 py-1 rounded">
              Recurring
            </span>
          )}
        </div>

        {/* Coming Soon Badge */}
        {isEventSoon(event.date, event.time) && (
          <div className="absolute top-4 right-4">
            <span className="text-xs text-yellow-700 bg-yellow-200 bg-opacity-95 backdrop-blur-sm px-3 py-1 rounded-full font-medium">
              Coming Soon
            </span>
          </div>
        )}
      </div>
    )}

    {/* Content */}
    <div className="p-6">
      {/* Event Header - without image */}
      {!event.imageUrl && (
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getCategoryIcon(event.category)}</span>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{event.title}</h3>
              <p className="text-sm text-gray-600">{event.organizer}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(event.category)}`}>
              {event.category}
            </span>
            {event.isRecurring && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                Recurring
              </span>
            )}
            {isEventSoon(event.date, event.time) && (
              <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded font-medium">
                Coming Soon
              </span>
            )}
          </div>
        </div>
      )}

      {/* Event Header - with image */}
      {event.imageUrl && (
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-gray-900 mb-1">{event.title}</h3>
          <p className="text-sm text-gray-600">{event.organizer}</p>
        </div>
      )}

      {/* Event Description */}
      <p className="text-gray-700 mb-4 leading-relaxed line-clamp-2">{event.description}</p>

      {/* Event Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">📅</span>
          <span className="font-medium">{formatDate(event.date)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">🕒</span>
          <span>{formatTime(event.time)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">📍</span>
          <span>{event.location}</span>
        </div>
        {event.audience && event.audience !== 'All Ages' && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">👥</span>
            <span>{event.audience}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          Learn More
        </button>
        <button 
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          onClick={() => onAddToCalendar(event)}
        >
          Add to Calendar
        </button>
      </div>
    </div>
  </div>
));



export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [imageLoadErrors, setImageLoadErrors] = useState(new Set());

  // const categories = useMemo(() => 
  //   ['all', 'event', 'registration', 'meeting', 'social', 'training', 'community'],
  //   []
  // );

  const inferCategory = useCallback((title, description) => {
    const text = `${title} ${description}`.toLowerCase();
    if (text.includes('registration') || text.includes('register')) return 'registration';
    if (text.includes('meeting') || text.includes('coach') || text.includes('parent')) return 'meeting';
    if (text.includes('bbq') || text.includes('family') || text.includes('fun')) return 'social';
    if (text.includes('training') || text.includes('skills') || text.includes('workshop')) return 'training';
    if (text.includes('community') || text.includes('volunteer') || text.includes('drive')) return 'community';
    return 'event';
  }, []);

  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  const formatTime = useCallback((timeString) => {
    return timeString;
  }, []);

  const getCategoryColor = useCallback((category) => {
    const colors = {
      event: 'bg-indigo-100 text-indigo-800',
      registration: 'bg-blue-100 text-blue-800',
      meeting: 'bg-purple-100 text-purple-800',
      social: 'bg-green-100 text-green-800',
      training: 'bg-orange-100 text-orange-800',
      community: 'bg-pink-100 text-pink-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  }, []);

  const getCategoryIcon = useCallback((category) => {
    const icons = {
      event: '📅',
      registration: '📝',
      meeting: '👥',
      social: '🎉',
      training: '⚽',
      community: '🤝'
    };
    return icons[category] || '📅';
  }, []);

  const isEventSoon = useCallback((dateString, timeString) => {
    const eventDateTime = new Date(`${dateString} ${timeString}`);
    const now = new Date();
    const timeDiff = eventDateTime - now;
    const daysDiff = timeDiff / (1000 * 3600 * 24);
    return daysDiff <= 7 && daysDiff >= 0;
  }, []);

  // Function to add event to Google Calendar
  const addToGoogleCalendar = useCallback((event) => {
    // Format date and time for Google Calendar URL
    const startDate = new Date(`${event.date}T${event.time}`);
    const endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000)); // Default 2 hour event
    
    const formatForGoogle = (date) => {
      return date.toISOString().replace(/-|:|\.\d+/g, '');
    };
    
    // Create Google Calendar URL
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${formatForGoogle(startDate)}/${formatForGoogle(endDate)}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.location)}&sf=true&output=xml`;
    
    // Open Google Calendar in a new tab
    window.open(googleCalendarUrl, '_blank');
  }, []);

  // Function to handle adding all events to calendar
  const handleAddAllToCalendar = useCallback(() => {
    // For multiple events, we can only add them one by one
    // Let's add the first event and notify the user about the process
    if (events.length > 0) {
      addToGoogleCalendar(events[0]);
      
      // Notify user about adding multiple events
      if (events.length > 1) {
        setTimeout(() => {
          alert(`To add all events to your calendar, please repeat the process for each event. Google Calendar doesn't support adding multiple events at once via URL.`);
        }, 1000);
      }
    }
  }, [events, addToGoogleCalendar]);

  // Function to handle adding a single event to calendar
  const handleAddToCalendar = useCallback((event) => {
    addToGoogleCalendar(event);
  }, [addToGoogleCalendar]);

  // Memoized filtered events
  const filteredEvents = useMemo(() => {
    return filter === 'all' 
      ? events 
      : events.filter(event => event.category === filter);
  }, [events, filter]);

  // Memoized statistics
  const eventStats = useMemo(() => ({
    total: events.length,
    upcoming: events.filter(e => isEventSoon(e.date, e.time)).length,
    recurring: events.filter(e => e.isRecurring).length
  }), [events, isEventSoon]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await EventsService.getAll();
        const eventsData = response.data || response;
        
        // Map Firebase event structure to component format
        const formattedEvents = eventsData.map(event => ({
          id: event.id,
          title: event.title,
          description: event.description,
          date: event.date,
          time: event.time,
          location: event.location,
          audience: event.audience || 'All Ages',
          imageUrl: event.imageUrl,
          createdAt: event.createdAt,
          expiresAt: event.expiresAt,
          category: inferCategory(event.title, event.description),
          isRecurring: event.isRecurring || false,
          organizer: event.organizer || 'YAU Events Team'
        }));

        // Sort events by date (upcoming first)
        const sortedEvents = formattedEvents.sort((a, b) => {
          const dateA = new Date(`${a.date} ${a.time}`);
          const dateB = new Date(`${b.date} ${b.time}`);
          return dateA - dateB;
        });

        setEvents(sortedEvents);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching events:', error);
        setEvents([]);
        setLoading(false);
      }
    };

    fetchEvents();
  }, [inferCategory]);

  const handleFilterChange = useCallback((newFilter) => {
    setFilter(newFilter);
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-8 bg-gray-200 rounded-full w-24"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-gray-200 rounded-2xl">
                <div className="h-48 bg-gray-300 rounded-t-2xl"></div>
                <div className="p-6 space-y-4">
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-300 rounded w-full"></div>
                    <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Events</h1>
        <div className="flex gap-2">
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            onClick={handleAddAllToCalendar}
          >
            Add to Calendar
          </button>
        </div>
      </div>


      {/* Events Grid */}
      {filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {filteredEvents.map(event => (
            <EventCard
              key={event.id}
              event={event}
              getCategoryIcon={getCategoryIcon}
              getCategoryColor={getCategoryColor}
              formatDate={formatDate}
              formatTime={formatTime}
              isEventSoon={isEventSoon}
              onAddToCalendar={handleAddToCalendar}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 mb-8">
          <div className="text-gray-500 text-lg mb-2">No events found</div>
          <div className="text-gray-400 text-sm">
            {filter === 'all' ? 'No events are currently scheduled' : `No ${filter} events are currently scheduled`}
          </div>
          {filter !== 'all' && (
            <button
              onClick={() => setFilter('all')}
              className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
            >
              View all events
            </button>
          )}
        </div>
      )}
    </div>
  );
}