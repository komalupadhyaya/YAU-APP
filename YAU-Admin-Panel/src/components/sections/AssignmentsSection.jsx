import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, FileText, Plus, Trash2, ChevronLeft, ChevronRight, User } from 'lucide-react';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { createCoachAssignment, getCoachAssignments, deleteCoachAssignment } from '../../firebase/apis/api-coach-assignments';
import dayjs from 'dayjs';

const AssignmentsSection = ({ coaches, locations, selectedWeek, setSelectedWeek }) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    coachId: '',
    schoolName: '',
    days: [],
    startTime: '15:00',
    endTime: '18:00',
    address: '',
    notes: ''
  });

  const [viewTab, setViewTab] = useState('active'); // 'active' or 'archived'

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const currentWeekMonday = dayjs().startOf('week').add(1, 'day');

  useEffect(() => {
    fetchAssignments();
  }, [selectedWeek, viewTab]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const data = await getCoachAssignments();
      
      const mondayStr = selectedWeek.format('YYYY-MM-DD');
      
      if (viewTab === 'active') {
        const filtered = data.filter(a => a.weekOf === mondayStr);
        setAssignments(filtered);
      } else {
        // Archived: anything before the CURRENT week's Monday
        const currentMondayStr = currentWeekMonday.format('YYYY-MM-DD');
        const archived = data.filter(a => a.weekOf < currentMondayStr);
        // Sort by date descending
        archived.sort((a, b) => b.weekOf.localeCompare(a.weekOf));
        setAssignments(archived);
      }
    } catch (error) {
      console.error("Error fetching assignments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (day) => {
    setForm(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.coachId || !form.schoolName || form.days.length === 0) {
      alert("Please fill in all required fields and select at least one day.");
      return;
    }

    try {
      const coach = coaches.find(c => c.id === form.coachId);
      const assignmentData = {
        ...form,
        coachName: `${coach.firstName} ${coach.lastName}`,
        weekOf: selectedWeek.format('YYYY-MM-DD'),
      };

      await createCoachAssignment(assignmentData);
      setIsModalOpen(false);
      setForm({
        coachId: '',
        schoolName: '',
        days: [],
        startTime: '15:00',
        endTime: '18:00',
        address: '',
        notes: ''
      });
      fetchAssignments();
    } catch (error) {
      console.error("Error creating assignment:", error);
      alert("Failed to create assignment");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this assignment?")) {
      try {
        await deleteCoachAssignment(id);
        fetchAssignments();
      } catch (error) {
        console.error("Error deleting assignment:", error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Coach Assignments</h3>
          <p className="text-sm text-gray-500">Manage weekly schedules for your coaching staff</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Sub-tabs */}
          <div className="flex bg-gray-100 p-1 rounded-lg mr-2">
            <button 
              onClick={() => setViewTab('active')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewTab === 'active' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Active
            </button>
            <button 
              onClick={() => setViewTab('archived')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewTab === 'archived' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Archived
            </button>
          </div>

          {viewTab === 'active' && (
            <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <button 
                onClick={() => setSelectedWeek(selectedWeek.subtract(1, 'week'))}
                className="p-2 hover:bg-gray-50 border-r border-gray-200 text-gray-600"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="px-4 py-2 text-sm font-medium text-gray-800 bg-gray-50/50">
                Week of {selectedWeek.format('MMM DD, YYYY')}
              </div>
              <button 
                onClick={() => setSelectedWeek(selectedWeek.add(1, 'week'))}
                className="p-2 hover:bg-gray-50 border-l border-gray-200 text-gray-600"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
          
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus size={20} className="mr-2" />
            Create Assignment
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
          <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
          <h4 className="text-lg font-medium text-gray-700 mb-1">
            {viewTab === 'active' ? 'No assignments for this week' : 'No archived assignments'}
          </h4>
          <p className="text-gray-500 mb-6">
            {viewTab === 'active' ? 'Start by creating a new assignment for a coach.' : 'Past assignments will appear here once the week has passed.'}
          </p>
          {viewTab === 'active' && (
            <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
              Create Assignment
            </Button>
          )}
        </div>
      ) : viewTab === 'archived' ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
            <h4 className="font-bold text-gray-800">Archived Assignments</h4>
            <span className="text-sm text-gray-500">{assignments.length} total records</span>
          </div>
          <div className="divide-y divide-gray-100">
            {assignments.map(a => (
              <div key={a.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center">
                      <User size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-lg">{a.coachName}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <p className="text-sm text-gray-500 flex items-center gap-1.5">
                          <MapPin size={14} /> {a.schoolName}
                        </p>
                        <p className="text-sm text-primary-600 font-medium">
                          Week of {dayjs(a.weekOf).format('MMM DD, YYYY')}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                    <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-sm font-medium">
                      {a.days.join(', ')}
                    </div>
                    <div className="text-gray-600 text-sm">
                      {a.startTime} – {a.endTime}
                    </div>
                    <button 
                      onClick={() => handleDelete(a.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors ml-auto md:ml-0"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                {a.notes && (
                  <div className="mt-3 text-sm text-gray-500 italic bg-gray-50 p-2 rounded-lg border border-gray-100">
                    "{a.notes}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {weekDays.map(day => {
            const dayAssignments = assignments.filter(a => a.days.includes(day));
            if (dayAssignments.length === 0) return null;
            
            return (
              <div key={day} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-100">
                  <h4 className="font-bold text-gray-800">{day}</h4>
                </div>
                <div className="divide-y divide-gray-100 font-medium">
                  {dayAssignments.map(a => (
                    <div key={`${a.id}-${day}`} className="px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center shrink-0">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{a.coachName}</p>
                          <p className="text-sm text-gray-500 flex items-center gap-1.5">
                            <MapPin size={14} className="text-gray-400" />
                            {a.schoolName}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 flex-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock size={16} className="text-gray-400" />
                          <span>{a.startTime} – {a.endTime}</span>
                        </div>
                        <div className="text-xs text-gray-400 italic truncate max-w-[200px]">
                          {a.notes || 'No notes'}
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleDelete(a.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-2"
                        title="Delete Assignment"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Assignment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Weekly Assignment"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Coach *</label>
              <select
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                value={form.coachId}
                onChange={(e) => setForm({ ...form, coachId: e.target.value })}
                required
              >
                <option value="">Select a coach</option>
                {coaches.map(coach => (
                  <option key={coach.id} value={coach.id}>
                    {coach.firstName} {coach.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">School / Site Name *</label>
              <input
                type="text"
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                value={form.schoolName}
                onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
                placeholder="e.g. Lincoln High School"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Days of Week *</label>
            <div className="flex flex-wrap gap-2">
              {weekDays.map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayToggle(day)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    form.days.includes(day)
                      ? 'bg-primary-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Time *</label>
              <input
                type="time"
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Time *</label>
              <input
                type="time"
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Address / Location Details</label>
            <input
              type="text"
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Full address of the school"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
            <textarea
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
              value={form.notes}
              
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows="3"
              placeholder="Any specific instructions for the coach..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Assignment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AssignmentsSection;
