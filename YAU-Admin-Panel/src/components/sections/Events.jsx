import React, { useEffect, useState } from 'react';
import Header from '../layout/Header';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { getEvents, addEvent, updateEvent, deleteEvent, getLocations, deleteExpiredEvents } from '../../firebase/firestore';
import { Calendar, MapPin, Users, Search, Filter, AlertTriangle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus, Edit, Trash2, FileText, Upload, X, Clock } from 'lucide-react';
import { Autocomplete } from '../common/AutoComplete';
import { storage } from '../../firebase/config';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import CustomDatePicker from '../common/CustomDatePicker';

// MUI Imports
import {
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    LinearProgress,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import dayjs from 'dayjs';

export const Events = ({ userRole = 'admin' }) => {
    const [events, setEvents] = useState([]);
    const [locations, setLocations] = useState([]);
    const [selectedType, setSelectedType] = useState('all');
    const [selectedLocation, setSelectedLocation] = useState('all');
    const [selectedAudience, setSelectedAudience] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        date: '',
        time: '12:00', // Keep as string for storage
        audience: 'All Ages',
        location: '',
        type: 'Game',
        imageUrl: '',
        description: ''
    });
    const [timePickerValue, setTimePickerValue] = useState(dayjs().hour(12).minute(0)); // Separate state for MUI TimePicker

    const defaultEventTypes = ['Game', 'Practice', 'Tryout', 'Other'];
    const audienceOptions = ['All Ages', 'Youth', 'Parents', 'Coaches'];
    const itemsPerPageOptions = [5, 10, 25, 50, 100];

    // Get unique event types from existing events plus defaults
    const getEventTypes = () => {
        const existingTypes = [...new Set(events.map(event => event.type).filter(Boolean))];
        const allTypes = [...new Set([...defaultEventTypes, ...existingTypes])];
        return allTypes.sort();
    };

    // Format date to "August, 7, 2025" format with comma
    const formatDisplayDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        const formatted = date.toLocaleDateString('en-US', options);
        return formatted.replace(/(\w+) (\d+),/, '$1, $2,');
    };

    // Format time from 24-hour to 12-hour format
    const formatDisplayTime = (time24) => {
        if (!time24) return '';
        try {
            const [hour, minute] = time24.split(':');
            const hourInt = parseInt(hour);
            const hour12 = hourInt === 0 ? 12 : hourInt > 12 ? hourInt - 12 : hourInt;
            const ampm = hourInt >= 12 ? 'PM' : 'AM';
            return `${hour12}:${minute} ${ampm}`;
        } catch (error) {
            return time24;
        }
    };

    // Convert dayjs time to 24-hour string format
    const convertTimeToString = (dayjsTime) => {
        if (!dayjsTime || !dayjs.isDayjs(dayjsTime)) return '12:00';
        return dayjsTime.format('HH:mm');
    };

    // Convert 24-hour string to dayjs object
    const convertStringToTime = (timeString) => {
        if (!timeString) return dayjs().hour(12).minute(0);
        try {
            const [hour, minute] = timeString.split(':');
            return dayjs().hour(parseInt(hour)).minute(parseInt(minute));
        } catch (error) {
            return dayjs().hour(12).minute(0);
        }
    };

    // Create full datetime for comparison
    const createEventDateTime = (date, time) => {
        if (!date || !time) return null;
        const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        return new Date(`${dateStr}T${time}:00`);
    };

    // Convert date string to proper format for storage
    const convertDateForStorage = (dateValue) => {
        if (!dateValue) return '';

        if (typeof dateValue === 'string' && dateValue.match(/^\d{2}-\d{2}-\d{4}$/)) {
            const [month, day, year] = dateValue.split('-');
            return `${year}-${month}-${day}`;
        }

        if (dateValue instanceof Date) {
            return dateValue.toISOString().split('T')[0];
        }

        return dateValue;
    };

    // Convert stored date to display format
    const convertDateForDisplay = (storedDate) => {
        if (!storedDate) return '';

        const date = new Date(storedDate);
        if (isNaN(date.getTime())) return '';

        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();

        return `${month}-${day}-${year}`;
    };

    // Check if event is expired
    const isEventExpired = (event) => {
        if (!event.date || !event.time) return false;
        const eventDateTime = createEventDateTime(event.date, event.time);
        return eventDateTime && eventDateTime < new Date();
    };

    // Reset form data
    const resetFormData = () => {
        setFormData({
            title: '',
            date: '',
            time: '12:00',
            audience: 'All Ages',
            location: '',
            type: 'Game',
            imageUrl: '',
            description: ''
        });
        setTimePickerValue(dayjs().hour(12).minute(0));
    };

    useEffect(() => {
        loadEventsData();

        // Set up interval to check for expired events every 5 minutes
        const expiredCheckInterval = setInterval(() => {
            checkAndRemoveExpiredEvents();
        }, 5 * 60 * 1000); // 5 minutes

        return () => clearInterval(expiredCheckInterval);// eslint-disable-next-line
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedType, selectedLocation, selectedAudience, searchTerm]);

    // Sync time picker value with form data
    useEffect(() => {
        setFormData(prev => ({ ...prev, time: convertTimeToString(timePickerValue) }));
    }, [timePickerValue]);

    const loadEventsData = async () => {
        try {
            setLoading(true);
            console.log('🔄 Loading events data...');

            // First, remove expired events
            await checkAndRemoveExpiredEvents();

            const [eventsData, locationsData] = await Promise.all([
                getEvents(),
                getLocations()
            ]);

            console.log('📅 Raw events data:', eventsData.length);
            console.log('📍 Locations data:', locationsData.length);

            const sortedEvents = eventsData.sort((a, b) => {
                const dateTimeA = createEventDateTime(a.date, a.time) || new Date(0);
                const dateTimeB = createEventDateTime(b.date, b.time) || new Date(0);
                return dateTimeA - dateTimeB; // Sort by upcoming events first
            });

            setEvents(sortedEvents);
            setLocations(locationsData.map(loc => loc.name));
        } catch (error) {
            console.error('❌ Error loading events data:', error);
            alert('Failed to load events data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const checkAndRemoveExpiredEvents = async () => {
        try {
            await deleteExpiredEvents();
        } catch (error) {
            console.error('❌ Error removing expired events:', error);
        }
    };

    const handleImageUpload = (file) => {
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            alert('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
            return;
        }

        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            alert('Image size should be less than 5MB');
            return;
        }

        setImageFile(file);

        const reader = new FileReader();
        reader.onload = (e) => {
            setImagePreview(e.target.result);
        };
        reader.readAsDataURL(file);
    };

    const uploadImageToFirebase = async (file) => {
        return new Promise((resolve, reject) => {
            const fileName = `events/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, fileName);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(progress);
                },
                (error) => {
                    console.error('Upload error:', error);
                    reject(error);
                },
                async () => {
                    try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve(downloadURL);
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    };

    const deleteImageFromFirebase = async (imageUrl) => {
        if (!imageUrl || !imageUrl.includes('firebase')) return;

        try {
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef);
        } catch (error) {
            console.error('Error deleting image:', error);
        }
    };

    const resetImageState = () => {
        setImageFile(null);
        setImagePreview('');
        setUploadProgress(0);
        setUploading(false);
    };

    const handleAddEvent = async () => {
        if (!formData.title || !formData.date || !formData.time || !formData.location || !formData.type || !formData.audience) {
            alert('Please fill in all required fields.');
            return;
        }

        // Check if the event date/time is in the future
        const eventDateTime = createEventDateTime(formData.date, formData.time);
        if (eventDateTime && eventDateTime <= new Date()) {
            alert('Event date and time must be in the future.');
            return;
        }

        try {
            setLoading(true);
            setUploading(true);

            let imageUrl = formData.imageUrl;

            if (imageFile) {
                imageUrl = await uploadImageToFirebase(imageFile);
            }

            const eventData = {
                ...formData,
                date: convertDateForStorage(formData.date),
                imageUrl,
                timestamp: new Date(),
                expiresAt: eventDateTime, // Add expiration timestamp
            };

            await addEvent(eventData);
            await loadEventsData();
            setIsModalOpen(false);
            resetFormData();
            resetImageState();
            alert('Event added successfully!');
        } catch (error) {
            console.error('❌ Error adding event:', error);
            alert('Failed to add event. Please try again.');
        } finally {
            setLoading(false);
            setUploading(false);
        }
    };

    const handleUpdateEvent = async () => {
        if (!formData.title || !formData.date || !formData.time || !formData.location || !formData.type || !formData.audience) {
            alert('Please fill in all required fields.');
            return;
        }

        const eventDateTime = createEventDateTime(formData.date, formData.time);
        if (eventDateTime && eventDateTime <= new Date()) {
            alert('Event date and time must be in the future.');
            return;
        }

        try {
            setLoading(true);
            setUploading(true);

            let imageUrl = formData.imageUrl;

            if (imageFile) {
                if (selectedEvent.imageUrl) {
                    await deleteImageFromFirebase(selectedEvent.imageUrl);
                }
                imageUrl = await uploadImageToFirebase(imageFile);
            }

            await updateEvent(selectedEvent.id, {
                ...formData,
                date: convertDateForStorage(formData.date),
                imageUrl,
                timestamp: new Date(),
                expiresAt: eventDateTime,
            });
            await loadEventsData();
            setIsModalOpen(false);
            setIsEditing(false);
            setSelectedEvent(null);
            resetImageState();
            alert('Event updated successfully!');
        } catch (error) {
            console.error('❌ Error updating event:', error);
            alert('Failed to update event. Please try again.');
        } finally {
            setLoading(false);
            setUploading(false);
        }
    };

    const handleDeleteEvent = async (eventId) => {
        if (!window.confirm('Are you sure you want to delete this event?')) return;

        try {
            setLoading(true);

            if (selectedEvent.imageUrl) {
                await deleteImageFromFirebase(selectedEvent.imageUrl);
            }

            await deleteEvent(eventId);
            await loadEventsData();
            setIsModalOpen(false);
            setSelectedEvent(null);
            resetImageState();
            alert('Event deleted successfully!');
        } catch (error) {
            console.error('❌ Error deleting event:', error);
            alert('Failed to delete event. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getFilteredEvents = () => {
        return events.filter(event => {
            const typeMatch = selectedType === 'all' || event.type === selectedType;
            const locationMatch = selectedLocation === 'all' || event.location === selectedLocation;
            const audienceMatch = selectedAudience === 'all' || event.audience === selectedAudience;
            const searchMatch = !searchTerm || (
                event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                event.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                event.audience.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (event.description && event.description.toLowerCase().includes(searchTerm.toLowerCase()))
            );

            return typeMatch && locationMatch && audienceMatch && searchMatch;
        });
    };

    const filteredEvents = getFilteredEvents();
    const upcomingEvents = filteredEvents.filter(e => {
        const eventDateTime = createEventDateTime(e.date, e.time);
        return eventDateTime && eventDateTime >= new Date();
    });

    const totalItems = filteredEvents.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = filteredEvents.slice(startIndex, endIndex);

    const eventTypes = getEventTypes();

    // Pagination handlers
    const goToFirstPage = () => setCurrentPage(1);
    const goToLastPage = () => setCurrentPage(totalPages);
    const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
    const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
    const goToPage = (page) => setCurrentPage(page);

    const getPageNumbers = () => {
        const delta = 2;
        const pages = [];
        const startPage = Math.max(1, currentPage - delta);
        const endPage = Math.min(totalPages, currentPage + delta);
        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        return pages;
    };

    if (userRole !== 'admin') {
        return (
            <div>
                <Header title="Access Denied" subtitle="Only administrators can access event management" />
                <div className="glass rounded-2xl p-6">
                    <div className="text-center py-12">
                        <AlertTriangle size={64} className="mx-auto text-red-300 mb-4" />
                        <h3 className="text-lg font-medium text-red-600 mb-2">Access Restricted</h3>
                        <p className="text-red-500 mb-4">This section is only available to administrators.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div>
                <Header title="Event Management" subtitle="Loading event data..." />
                <div className="glass rounded-2xl p-6">
                    <div className="animate-pulse">
                        <div className="h-32 bg-gray-200 rounded-xl mb-6"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="bg-gray-200 rounded-xl p-4">
                                    <div className="h-6 bg-gray-300 rounded mb-2"></div>
                                    <div className="h-4 bg-gray-300 rounded mb-1"></div>
                                    <div className="h-4 bg-gray-300 rounded"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <div>
                <Header
                    title="Event Management"
                    subtitle="View and manage events for your youth athletic organization"
                />

                <div className="glass rounded-2xl p-6">
                    {/* Filters */}
                    <div className="bg-white rounded-xl p-4 mb-6 border">
                        <div className="flex items-center gap-2 mb-4">
                            <Filter size={20} className="text-gray-600" />
                            <h3 className="font-semibold text-gray-700">Filter Events</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <FormControl fullWidth>
                                    <InputLabel>Event Type</InputLabel>
                                    <Select
                                        value={selectedType}
                                        onChange={(e) => setSelectedType(e.target.value)}
                                        label="Event Type"
                                        className="rounded-xl"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '12px',
                                                '& fieldset': {
                                                    borderWidth: '2px',
                                                    borderColor: '#e5e7eb',
                                                },
                                                '&:hover fieldset': {
                                                    borderColor: '#6366f1',
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: '#6366f1',
                                                },
                                            },
                                            '& .MuiSelect-select': {
                                                padding: '11px', // Apply padding here if needed
                                            },
                                        }}
                                    >
                                        <MenuItem value="all">All Types</MenuItem>
                                        {eventTypes.map((type) => (
                                            <MenuItem key={type} value={type}>
                                                {type}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </div>

                            <div>
                                <FormControl fullWidth>
                                    <InputLabel>Location</InputLabel>
                                    <Select
                                        value={selectedLocation}
                                        onChange={(e) => setSelectedLocation(e.target.value)}
                                        label="Location"
                                        className="rounded-xl"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '12px',
                                                '& fieldset': {
                                                    borderWidth: '2px',
                                                    borderColor: '#e5e7eb',
                                                },
                                                '&:hover fieldset': {
                                                    borderColor: '#6366f1',
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: '#6366f1',
                                                },
                                            },
                                            '& .MuiSelect-select': {
                                                padding: '11px', // Apply padding here as well
                                            },
                                        }}
                                    >
                                        <MenuItem value="all">All Locations</MenuItem>
                                        {locations.map((location) => (
                                            <MenuItem key={location} value={location}>
                                                {location}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </div>

                            <div>
                                <FormControl fullWidth>
                                    <InputLabel>Audience</InputLabel>
                                    <Select
                                        value={selectedAudience}
                                        onChange={(e) => setSelectedAudience(e.target.value)}
                                        label="Audience"
                                        className="rounded-xl" // Tailwind class for border-radius
                                        sx={{
                                            // Remove default MUI border-radius
                                            '& .MuiOutlinedInput-root .MuiSelect-root': {
                                                borderRadius: '0 !important', // Ensure no default MUI border radius is applied
                                                '& fieldset': {
                                                    borderWidth: '2px',
                                                    borderColor: '#e5e7eb',
                                                },
                                                '&:hover fieldset': {
                                                    borderColor: '#6366f1',
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: '#6366f1',
                                                },
                                            },
                                            '& .MuiSelect-select': {
                                                padding: '11px', // Apply padding here as well
                                            },
                                        }}
                                    >
                                        <MenuItem value="all">All Audiences</MenuItem>
                                        {audienceOptions.map((audience) => (
                                            <MenuItem key={audience} value={audience}>
                                                {audience}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </div>
                        </div>
                        <div className="mt-4">
                            <div className="relative">
                                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search events by title, location, type, audience, or description..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                                />
                            </div>
                        </div>
                        <div className="mt-4 flex flex-col sm:flex-row justify-between gap-3">
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button onClick={() => {
                                    setSelectedType('all')
                                    setSelectedLocation('all')
                                    setSelectedAudience('all')
                                }} variant="outline" className="w-full sm:w-auto">
                                    Reset Filter
                                </Button>
                                <Button onClick={loadEventsData} variant="secondary" className="w-full sm:w-auto">
                                    Refresh Data
                                </Button>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="p-2 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none text-sm"
                                >
                                    {itemsPerPageOptions.map(option => (
                                        <option key={option} value={option}>{option} per page</option>
                                    ))}
                                </select>
                            </div>
                            <Button
                                onClick={() => {
                                    setIsEditing(false);
                                    resetFormData();
                                    resetImageState();
                                    setIsModalOpen(true);
                                }}
                                variant="primary"
                                className="w-full sm:w-auto flex items-center gap-2 justify-center"
                            >
                                <Plus size={20} />
                                Add Event
                            </Button>
                        </div>
                    </div>

                    {/* Statistics */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-50 rounded-xl p-4">
                            <div className="text-2xl font-bold text-blue-600">{filteredEvents.length}</div>
                            <div className="text-sm text-blue-600">Total Events</div>
                        </div>
                        <div className="bg-green-50 rounded-xl p-4">
                            <div className="text-2xl font-bold text-green-600">{upcomingEvents.length}</div>
                            <div className="text-sm text-green-600">Upcoming Events</div>
                        </div>
                        <div className="bg-purple-50 rounded-xl p-4">
                            <div className="text-2xl font-bold text-purple-600">{filteredEvents.filter(e => e.type === 'Game').length}</div>
                            <div className="text-sm text-purple-600">Games</div>
                        </div>
                        <div className="bg-yellow-50 rounded-xl p-4">
                            <div className="text-2xl font-bold text-yellow-600">{filteredEvents.filter(e => e.type === 'Practice').length}</div>
                            <div className="text-sm text-yellow-600">Practices</div>
                        </div>
                    </div>

                    {/* Pagination Controls (Top) */}
                    <div className="flex justify-between items-center mb-4">
                        <div className="text-sm text-gray-600">
                            Showing {currentItems.length} of {totalItems} events
                        </div>
                        <div className="text-sm text-gray-500">
                            Page {currentPage} of {totalPages}
                        </div>
                    </div>

                    {/* Events Grid */}
                    {currentItems.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {currentItems.map((event) => {
                                const expired = isEventExpired(event);
                                return (
                                    <div
                                        key={event.id}
                                        onClick={() => {
                                            setSelectedEvent(event);
                                            setFormData({
                                                title: event.title,
                                                date: convertDateForDisplay(event.date),
                                                time: event.time || '12:00',
                                                audience: event.audience,
                                                location: event.location,
                                                type: event.type,
                                                imageUrl: event.imageUrl || '',
                                                description: event.description || ''
                                            });
                                            setTimePickerValue(convertStringToTime(event.time || '12:00'));
                                            setImagePreview(event.imageUrl || '');
                                            setIsEditing(true);
                                            setIsModalOpen(true);
                                        }}
                                        className={`bg-white rounded-xl p-6 cursor-pointer hover:shadow-lg transition-all duration-300 hover:transform hover:-translate-y-1 border-2 border-gray-200 hover:border-primary-500 h-full flex flex-col ${expired ? 'opacity-60 bg-gray-50' : ''}`}
                                    >
                                        {event.imageUrl && (
                                            <div className="w-full h-32 mb-3 flex-shrink-0">
                                                <img
                                                    src={event.imageUrl}
                                                    alt={event.title}
                                                    className="w-full h-full object-cover rounded-lg"
                                                />
                                            </div>
                                        )}
                                        <div className="flex-1 flex flex-col">
                                            <div className="flex justify-between items-start mb-3">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${event.type === 'Game' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                                    {event.type}
                                                </span>
                                                <span className="text-lg">{event.title.toLowerCase().includes('football') || event.title.toLowerCase().includes('soccer') ? '⚽' : '📅'}</span>
                                            </div>
                                            <h3 className="font-bold text-lg text-gray-800 mb-2">{event.title}</h3>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Calendar size={16} className="text-gray-500" />
                                                <p className="text-gray-600 text-sm">{formatDisplayDate(event.date)}</p>
                                            </div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Clock size={16} className="text-gray-500" />
                                                <p className="text-gray-600 text-sm">
                                                    {formatDisplayTime(event.time || '12:00')}
                                                    {expired && <span className="text-red-500 ml-2">(Expired)</span>}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <MapPin size={16} className="text-gray-500" />
                                                <p className="text-gray-600 text-sm truncate">{event.location}</p>
                                            </div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Users size={16} className="text-gray-500" />
                                                <p className="text-gray-600 text-sm">{event.audience}</p>
                                            </div>
                                            {event.description && (
                                                <div className="flex items-start gap-2 mt-auto">
                                                    <FileText size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                                                    <p className="text-gray-600 text-sm line-clamp-2">{event.description}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Calendar size={64} className="mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-600 mb-2">No Events Found</h3>
                            <p className="text-gray-500 mb-4">No events match your current filters or search criteria.</p>
                            <Button
                                onClick={() => {
                                    setIsEditing(false);
                                    resetFormData();
                                    resetImageState();
                                    setIsModalOpen(true);
                                }}
                                variant="primary"
                                className="flex items-center gap-2 mx-auto"
                            >
                                <Plus size={20} />
                                Add New Event
                            </Button>
                        </div>
                    )}

                    {/* Enhanced Pagination */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-6 border-t border-gray-200">
                            <div className="text-sm text-gray-600">
                                Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} entries
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={goToFirstPage}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="First Page"
                                >
                                    <ChevronsLeft size={16} />
                                </button>
                                <button
                                    onClick={goToPreviousPage}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Previous Page"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <div className="flex items-center gap-1">
                                    {getPageNumbers().map(pageNum => (
                                        <button
                                            key={pageNum}
                                            onClick={() => goToPage(pageNum)}
                                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${pageNum === currentPage
                                                ? 'bg-primary-500 text-white'
                                                : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={goToNextPage}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Next Page"
                                >
                                    <ChevronRight size={16} />
                                </button>
                                <button
                                    onClick={goToLastPage}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Last Page"
                                >
                                    <ChevronsRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Event Modal */}
                <Modal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setIsEditing(false);
                        setSelectedEvent(null);
                        resetImageState();
                    }}
                    title={isEditing ? 'Edit Event' : 'Add Event'}
                    size="lg"
                >
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Title <span className="pl-1 text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                                    placeholder="Enter event title"
                                />
                            </div>
                            <div>
                                <CustomDatePicker
                                    label="Date"
                                    value={formData.date}
                                    onChange={(newValue) => setFormData({ ...formData, date: newValue })}
                                    placeholder="mm-dd-yyyy"
                                    required
                                    minDate={new Date()}
                                    textpadding="14px"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Time <span className="pl-1 text-red-500">*</span></label>
                                <TimePicker
                                    value={timePickerValue}
                                    onChange={(newValue) => {
                                        if (newValue && dayjs.isDayjs(newValue)) {
                                            setTimePickerValue(newValue);
                                        }
                                    }}
                                    renderInput={(params) => (
                                        <input
                                            {...params.inputProps}
                                            ref={params.inputRef}
                                            className="w-full p-1 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:outline-none"
                                            placeholder="Select time"
                                        />
                                    )}
                                    slotProps={{
                                        textField: {
                                            className: "w-full",
                                            sx: {
                                                '& .MuiPickersSectionList-root': {
                                                    padding: '14px', // Adjust the padding here
                                                },
                                                '& .MuiPickersOutlinedInput-root': {
                                                    borderRadius: '12px',
                                                    '& fieldset': {
                                                        borderWidth: '2px',
                                                        borderColor: '#e5e7eb',
                                                    },
                                                    '&:hover fieldset': {
                                                        borderColor: '#6366f1',
                                                    },
                                                    '&.Mui-focused fieldset': {
                                                        borderColor: '#6366f1',
                                                    },
                                                },

                                            },
                                        },

                                    }}
                                    views={['hours', 'minutes']}
                                    format="h:mm A"
                                    ampm={true}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Type <span className="pl-1 text-red-500">*</span></label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        list="event-types"
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                                        placeholder="Enter or select event type"
                                    />
                                    <datalist id="event-types">
                                        {eventTypes.map((type) => (
                                            <option key={type} value={type} />
                                        ))}
                                    </datalist>
                                </div>
                            </div>
                            <div>
                                <Autocomplete
                                    label="Event Location "
                                    options={locations}
                                    value={formData.location}
                                    onChange={(value) => setFormData({ ...formData, location: value })}
                                    placeholder="Select location or enter custom location"
                                    getOptionLabel={(location) => location}
                                    getOptionValue={(location) => location}
                                    allowCustomInput={userRole === 'admin'}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Audience <span className="pl-1 text-red-500">*</span></label>
                                <select
                                    value={formData.audience}
                                    onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                                >
                                    {audienceOptions.map((audience) => (
                                        <option key={audience} value={audience}>{audience}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Event Image
                                    <span className="text-gray-500 text-xs ml-2">(Optional)</span>
                                </label>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleImageUpload(e.target.files[0])}
                                            className="hidden"
                                            id="image-upload"
                                            disabled={uploading}
                                        />
                                        <label
                                            htmlFor="image-upload"
                                            className={`flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary-500 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <Upload size={20} className="text-gray-500" />
                                            <span className="text-sm text-gray-600">
                                                {imageFile ? 'Change Image' : 'Upload Image'}
                                            </span>
                                        </label>
                                        {(imageFile || imagePreview) && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setImageFile(null);
                                                    setImagePreview('');
                                                    setFormData({ ...formData, imageUrl: '' });
                                                }}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                                                title="Remove image"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>

                                    {uploading && uploadProgress > 0 && (
                                        <div className="w-full">
                                            <LinearProgress
                                                variant="determinate"
                                                value={uploadProgress}
                                                sx={{
                                                    height: 8,
                                                    borderRadius: 4,
                                                    backgroundColor: '#e5e7eb',
                                                    '& .MuiLinearProgress-bar': {
                                                        borderRadius: 4,
                                                        backgroundColor: '#6366f1',
                                                    },
                                                }}
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Uploading... {Math.round(uploadProgress)}%
                                            </p>
                                        </div>
                                    )}

                                    {(imagePreview || formData.imageUrl) && (
                                        <div className="relative">
                                            <img
                                                src={imagePreview || formData.imageUrl}
                                                alt="Preview"
                                                className="w-full h-32 object-cover rounded-lg border"
                                            />
                                            <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                                                Preview
                                            </div>
                                        </div>
                                    )}

                                    <p className="text-xs text-gray-500">
                                        Supported formats: JPEG, PNG, GIF, WebP (Max 5MB)
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Description Field - Full Width */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description
                                <span className="text-gray-500 text-xs ml-2">(Optional)</span>
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value.slice(0, 500) })}
                                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none resize-vertical"
                                placeholder="Enter event description, additional details, or instructions..."
                                rows={4}
                                maxLength={500}
                            />
                            <div className="text-xs text-gray-500 mt-1">
                                {formData.description.length}/500 characters
                            </div>
                        </div>

                        {selectedEvent && isEditing && (
                            <div className="bg-gray-50 rounded-xl p-4">
                                <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <Calendar size={18} />
                                    Event Details
                                </h4>
                                <p className="text-sm text-gray-600 mb-3">
                                    <span className="font-medium">Created:</span> {selectedEvent.timestamp?.toDate ? selectedEvent.timestamp.toDate().toLocaleString() : new Date(selectedEvent.timestamp).toLocaleString()}
                                </p>
                                <p className="text-sm text-gray-600 mb-3">
                                    <span className="font-medium">Date & Time:</span> {formatDisplayDate(selectedEvent.date)} at {formatDisplayTime(selectedEvent.time)}
                                </p>
                                {isEventExpired(selectedEvent) && (
                                    <div className="bg-red-100 border border-red-200 rounded-lg p-3 mb-3">
                                        <p className="text-sm text-red-700 font-medium">⚠️ This event has expired and will be automatically removed from the database.</p>
                                    </div>
                                )}
                                {selectedEvent.description && (
                                    <div className="mb-3">
                                        <span className="font-medium text-sm text-gray-700">Current Description:</span>
                                        <p className="text-sm text-gray-600 mt-1 p-2 bg-white rounded border">
                                            {selectedEvent.description}
                                        </p>
                                    </div>
                                )}
                                {selectedEvent.imageUrl && (
                                    <img
                                        src={selectedEvent.imageUrl}
                                        alt={selectedEvent.title}
                                        className="w-full aspect-[16/9] object-cover rounded-lg"
                                    />
                                )}
                            </div>
                        )}

                        <div className="flex justify-end gap-2">
                            {isEditing && (
                                <Button
                                    onClick={() => handleDeleteEvent(selectedEvent.id)}
                                    variant="danger"
                                    className="flex items-center gap-2"
                                    disabled={uploading}
                                >
                                    <Trash2 size={20} />
                                    Delete Event
                                </Button>
                            )}
                            <Button
                                onClick={isEditing ? handleUpdateEvent : handleAddEvent}
                                variant="primary"
                                className="flex items-center gap-2"
                                disabled={uploading}
                            >
                                {uploading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        {uploadProgress > 0 ? `${Math.round(uploadProgress)}%` : 'Processing...'}
                                    </>
                                ) : (
                                    <>
                                        {isEditing ? <Edit size={20} /> : <Plus size={20} />}
                                        {isEditing ? 'Update Event' : 'Add Event'}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </Modal>
            </div>
        </LocalizationProvider>
    );
};