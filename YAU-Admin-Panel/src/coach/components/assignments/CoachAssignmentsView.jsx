import React, { useState, useEffect } from 'react';
import { getCoachAssignments } from '../../../firebase/apis/api-coach-assignments';
import { Calendar, Clock, MapPin, Search, FileText, ChevronDown } from 'lucide-react';

const CoachAssignmentsView = ({ coachData }) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchVal, setSearchVal] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [weekFilter, setWeekFilter] = useState('This Week');

  useEffect(() => {
    const fetchAssignments = async () => {
      if (!coachData?.id) return;
      try {
        const data = await getCoachAssignments(coachData.id);
        setAssignments(data);
      } catch (error) {
        console.error("Error loading personal assignments", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAssignments();
  }, [coachData]);

  // Rough estimation logic for top stats
  let totalHours = 0;
  let nextAssignment = null;

  assignments.forEach(a => {
    // Attempt rudimentary hour extraction (e.g., "3:00 PM – 6:00 PM" -> ~3)
    if (a.hours && a.hours.includes('–') || a.hours?.includes('-')) {
      const parts = a.hours.replace(/–/g, '-').split('-');
      if (parts.length === 2) {
        const h1 = parseInt(parts[0].replace(/[^0-9]/g, ''));
        const h2 = parseInt(parts[1].replace(/[^0-9]/g, ''));
        if (h1 && h2) {
            let diff = h2 - h1;
            if (diff < 0) diff = (h2 + 12) - h1; // basic handle AM/PM crossing 12 loosely
            if (diff > 0 && diff < 12) totalHours += diff;
        }
      }
    }
  });

  if (assignments.length > 0) {
      nextAssignment = assignments[0];
  }

  // Formatting dates for header
  const getThisWeekLabel = () => {
    const today = new Date();
    const first = today.getDate() - today.getDay();
    const last = first + 6;
    const firstDay = new Date(today.setDate(first));
    const lastDay = new Date(today.setDate(last));
    const format = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `Week of ${format(firstDay)} - ${format(lastDay)}`;
  };

  const filtered = assignments.filter(a => {
    const q = searchVal.toLowerCase();
    const matchesSearch = !q || 
      a.schoolName?.toLowerCase().includes(q) || 
      a.address?.toLowerCase().includes(q) ||
      a.notes?.toLowerCase().includes(q);
    
    const matchesStatus = statusFilter === 'All Statuses' || a.status === statusFilter;
    
    // Week filtering logic
    const today = new Date();
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
    currentMonday.setHours(0, 0, 0, 0);
    const mondayStr = currentMonday.toISOString().split('T')[0];

    const isPast = a.weekOf < mondayStr;
    const isThisWeek = a.weekOf === mondayStr;
    
    const matchesWeek = weekFilter === 'This Week' ? isThisWeek : 
                       weekFilter === 'Past Weeks' ? isPast : true;

    return matchesSearch && matchesStatus && matchesWeek;
  });

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (+
    <div className="space-y-6">
      
      {/* Top 3 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Next Assignment Card */}
        <div className="bg-indigo-50/60 rounded-xl p-5 border border-indigo-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <Calendar size={20} className="opacity-80" />
          </div>
          <div>
            <p className="text-sm font-medium text-indigo-500 mb-0.5">Next Assignment</p>
            <h3 className="font-bold text-gray-800 text-sm">
                {nextAssignment ? nextAssignment.hours : 'No upcoming'}
            </h3>
            <p className="text-xs text-gray-500">{nextAssignment ? nextAssignment.site : '—'}</p>
          </div>
        </div>

        {/* This Week Card */}
        <div className="bg-purple-50/60 rounded-xl p-5 border border-purple-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
            <Calendar size={20} className="opacity-80" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start mb-0.5">
                <p className="text-sm font-medium text-purple-500">This Week</p>
                <ChevronDown size={14} className="text-gray-400 cursor-pointer" />
            </div>
            <p className="text-xs font-semibold text-gray-800">{getThisWeekLabel()}</p>
          </div>
        </div>

        {/* Hours Card */}
        <div className="bg-amber-50/60 rounded-xl p-5 border border-amber-100 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
                <Clock size={16} className="text-amber-500" />
                <p className="text-sm font-medium text-amber-600">Hours</p>
            </div>
            <h3 className="text-2xl font-bold text-gray-800">{totalHours > 0 ? totalHours : '--'} hrs</h3>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Search size={16} />
          </span>
          <input
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            placeholder="Search assignments..."
            className="w-full pl-9 pr-3 h-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-white"
          />
        </div>
        
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option>All Statuses</option>
          <option>Confirmed</option>
          <option>Pending</option>
          <option>Cancelled</option>
        </select>
        
        <select 
          value={weekFilter}
          onChange={(e) => setWeekFilter(e.target.value)}
          className="h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option>This Week</option>
          <option>Past Weeks</option>
          <option>All Weeks</option>
        </select>
      </div>

      {/* Main List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No assignments found.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((assignment) => {
              const displayDays = Array.isArray(assignment.days) ? assignment.days.join(', ') : assignment.days;
              return (
              <div key={assignment.id} className="p-5 hover:bg-gray-50 transition-colors">
                
                {/* Date/Week Headline */}
                <div className="flex items-center gap-3 mb-4 bg-blue-50/50 -mx-5 px-5 -mt-5 pt-3 pb-2 border-b border-blue-100/50">
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm border border-blue-200 uppercase tracking-widest">
                        {displayDays}
                    </span>
                    <p className="text-sm font-semibold text-gray-800">Week of {assignment.weekOf}</p>
                </div>

                <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                  
                  {/* Left: Location details */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-gray-900 mb-0.5">{assignment.schoolName || 'N/A'}</h3>
                      <p className="text-[13px] text-gray-500 mb-1">{assignment.address || 'No address provided'}</p>
                      {/* Mobile view snippet */}
                      <p className="text-[12px] text-gray-400 block lg:hidden">
                          Time: <span className="font-semibold text-gray-600">{assignment.startTime} - {assignment.endTime}</span>
                      </p>
                    </div>
                  </div>

                  {/* Middle: Time details */}
                  <div className="hidden lg:flex flex-col w-48 shrink-0 border-l border-gray-100 pl-6">
                      <p className="text-[12px] text-gray-500 mb-1 flex items-center gap-1.5">
                          <Clock size={12} />
                          Time: <span className="font-semibold text-gray-800">{assignment.startTime} - {assignment.endTime}</span>
                      </p>
                      <p className="text-[12px] text-gray-500">
                          Days: <span className="font-medium text-gray-600">{displayDays}</span>
                      </p>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                      <a href={`https://maps.google.com/?q=${encodeURIComponent(assignment.address || '')}`} target="_blank" rel="noreferrer" 
                         className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[12px] font-semibold rounded-lg transition-colors">
                          <MapPin size={14} />
                          Directions
                      </a>
                      
                      <button 
                        onClick={() => assignment.notes ? alert(`Notes:\n${assignment.notes}`) : alert('No notes provided for this assignment.')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[12px] font-semibold rounded-lg transition-colors">
                          <FileText size={14} />
                          View Notes
                      </button>
                  </div>

                </div>
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoachAssignmentsView;
