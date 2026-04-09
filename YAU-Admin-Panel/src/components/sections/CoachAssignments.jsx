import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import TextField from '../common/TextField';
import { getCoaches } from '../../firebase/firestore';
import { getCoachAssignments, createCoachAssignment, updateCoachAssignment } from '../../firebase/apis/api-coach-assignments';
import { API_CONFIG } from '../../firebase/config';

/* ── Icons ── */
const IconCalendar = ({ className = '' }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12,6 12,12 16,14" />
  </svg>
);

const IconPencil = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconPlus = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconSend = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

/* ── Helper for initials ── */
const getInitials = (name) => {
  if (!name) return '??';
  const par = name.trim().split(' ');
  return par.length > 1 ? (par[0][0] + par[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
};

/* ── Status Badge ── */
const StatusBadge = ({ status }) => {
  const styles = {
    Confirmed: 'bg-green-50 text-green-700',
    Pending: 'bg-orange-50 text-orange-600',
    Cancelled: 'bg-red-50 text-red-700',
  };
  const dotStyles = {
    Confirmed: 'bg-green-500',
    Pending: 'bg-orange-400',
    Cancelled: 'bg-red-500',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${styles[status] || styles.Confirmed}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotStyles[status] || dotStyles.Confirmed}`} />
      {status}
    </span>
  );
};

/* ── Stat Card ── */
const StatCard = ({ iconBg, iconColorClass, icon, label, primary, secondary }) => (
  <div className="flex-1 min-w-[150px] bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 shadow-sm">
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg} ${iconColorClass}`}>
      {icon}
    </div>
    <div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-[13px] font-bold text-slate-800 leading-tight">{primary}</p>
      {secondary && <p className="text-[11px] text-slate-500">{secondary}</p>}
    </div>
  </div>
);

/* ── Main Component ── */
const CoachAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [searchVal, setSearchVal] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingNotification, setSendingNotification] = useState(null);

  const [formData, setFormData] = useState({
    coachId: '',
    coachName: '', // For easy displaying
    site: '',
    address: '',
    report: '',
    hours: '',
    role: '',
    status: 'Pending',
    note: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedAssignments, fetchedCoaches] = await Promise.all([
        getCoachAssignments(),
        getCoaches()
      ]);
      setAssignments(fetchedAssignments);
      setCoaches(fetchedCoaches);
    } catch (e) {
      console.error("Failed to load assignments data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.coachId) {
      alert("Please select a coach");
      return;
    }

    try {
      if (editingAssignment) {
        await updateCoachAssignment(editingAssignment.id, formData);
      } else {
        await createCoachAssignment(formData);
      }
      setIsFormOpen(false);
      setEditingAssignment(null);
      loadData(); // Re-fetch to guarantee sync
    } catch (error) {
      console.error("Failed to save assignment", error);
      alert("Failed to save assignment");
    }
  };

  const handleSendNotification = async (assignment) => {
    const confirm = window.confirm(`Send SMS and Email notification to ${assignment.coachName}?`);
    if (!confirm) return;

    setSendingNotification(assignment.id);
    try {
      const response = await fetch(`${API_CONFIG.baseURL}/admin/coach-assignments/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assignmentId: assignment.id,
          coachId: assignment.coachId
        })
      });

      if (!response.ok) {
        let errMsg = 'Failed to send notification via server';
        try {
          const errData = await response.json();
          errMsg = errData.details || errData.error || errMsg;
        } catch (e) {}
        throw new Error(errMsg);
      }

      alert('Notification sent successfully!');
    } catch (error) {
      console.error('Failed to send notification', error);
      alert(`Error: ${error.message}`);
    } finally {
      setSendingNotification(null);
    }
  };

  const filtered = assignments.filter(a => {
    const q = searchVal.toLowerCase();
    const matchSearch = !q || a.site.toLowerCase().includes(q) || a.address.toLowerCase().includes(q) || (a.coachName && a.coachName.toLowerCase().includes(q));
    const matchStatus = statusFilter === 'All Statuses' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  /* ── Mobile Assignment Card ── */
  const MobileCard = ({ row }) => (
    <div className="bg-white border border-slate-200 rounded-xl p-4 mb-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-[11px] font-bold text-blue-500 flex-shrink-0">
            {getInitials(row.coachName)}
          </div>
          <div>
            <p className="text-[13px] font-bold text-slate-800">{row.site}</p>
            <p className="text-[11px] font-semibold text-slate-500">{row.coachName}</p>
            <p className="text-[11px] text-slate-400">{row.role || '—'}</p>
          </div>
        </div>
        <StatusBadge status={row.status} />
      </div>

      <p className="text-xs text-slate-500 mb-1">{row.address}</p>
      <p className="text-xs text-slate-400 italic mb-3">{row.note}</p>

      <div className="flex flex-wrap gap-4 mb-3">
        <span className="text-xs font-medium text-slate-600">{row.report}</span>
        <span className="text-xs font-medium text-slate-600">{row.hours}</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => handleSendNotification(row)}
          disabled={sendingNotification === row.id}
          className="flex-1 flex items-center justify-center gap-1.5 border border-indigo-200 rounded-lg px-3 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 cursor-pointer bg-white transition-colors"
        >
          <IconSend /> {sendingNotification === row.id ? 'Sending...' : 'Notify Coach'}
        </button>
        <button
          onClick={() => {
            setEditingAssignment(row);
            setFormData(row);
            setIsFormOpen(true);
          }}
          className="w-9 h-9 flex items-center justify-center border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-indigo-500 cursor-pointer bg-white transition-colors flex-shrink-0">
          <IconPencil />
        </button>
      </div>
    </div>
  );

  return (
    <div className="font-sans bg-slate-50 min-h-screen">
      <div className="px-6 py-6 md:px-8 max-w-screen-xl">
        {/* Heading */}
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Coach Assignments Overview</h1>
        <p className="text-[13px] font-semibold text-indigo-500 mb-6">Manage assignments and notify coaches</p>

        {/* ── Stats Banner ── */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-100 rounded-2xl p-4 mb-6 shadow-sm">
          <div className="flex flex-wrap gap-3 items-stretch">
            <StatCard
              iconBg="bg-violet-100"
              iconColorClass="text-violet-600"
              icon={<IconCalendar className="text-violet-600" />}
              label="Total Assignments"
              primary={assignments.length}
            />
            <StatCard
              iconBg="bg-sky-50"
              iconColorClass="text-sky-500"
              icon={<IconClock className="text-sky-500" />}
              label="Pending"
              primary={assignments.filter(a => a.status === 'Pending').length}
            />
            <StatCard
              iconBg="bg-green-50"
              iconColorClass="text-green-600"
              icon={<IconSearch className="text-green-600" />}
              label="Confirmed"
              primary={assignments.filter(a => a.status === 'Confirmed').length}
            />
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap gap-3 items-center mb-5 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex">
              <IconSearch />
            </span>
            <input
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              placeholder="Search assignments or coaches..."
              className="w-full pl-9 pr-3 h-10 border border-slate-200 rounded-lg text-[13px] text-slate-600 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-300 focus:bg-white placeholder-slate-400 transition-all"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-10 border border-slate-200 rounded-lg px-3 text-[13px] text-slate-600 bg-slate-50 cursor-pointer outline-none focus:ring-2 focus:ring-indigo-300 hover:bg-white transition-all"
          >
            <option>All Statuses</option>
            <option>Confirmed</option>
            <option>Pending</option>
            <option>Cancelled</option>
          </select>

          <button
            onClick={() => {
              setEditingAssignment(null);
              setFormData({
                coachId: '',
                coachName: '',
                site: '',
                address: '',
                report: '',
                hours: '',
                role: '',
                status: 'Pending',
                note: ''
              });
              setIsFormOpen(true);
            }}
            className="flex items-center justify-center gap-2 h-10 px-5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-[13px] font-semibold rounded-lg cursor-pointer border-none whitespace-nowrap transition-all shadow-md hover:shadow-lg transform active:scale-95">
            <IconPlus /> New Assignment
          </button>
        </div>

        {/* ── Desktop Table (hidden on mobile) ── */}
        {loading ? (
          <div className="flex justify-center p-10"><div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full font-bold text-indigo-500"></div></div>
        ) : assignments.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-slate-500">No coach assignments found.</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ minWidth: 920 }}>
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['Coach', 'Site', 'Location / Time', 'Role', 'Status', 'Actions'].map(h => (
                        <th key={h} className="text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider px-5 py-3 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row, i) => (
                      <tr
                        key={row.id}
                        className={`hover:bg-slate-50 transition-colors ${i < filtered.length - 1 ? 'border-b border-slate-100' : ''}`}
                      >
                        {/* Coach */}
                        <td className="px-5 py-4 align-top w-48">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-[12px] font-bold text-indigo-600">
                              {getInitials(row.coachName)}
                            </div>
                            <span className="font-semibold text-[13px] text-slate-800">{row.coachName}</span>
                          </div>
                        </td>

                        {/* Site */}
                        <td className="px-5 py-4 align-top min-w-[170px]">
                          <p className="text-[13px] font-bold text-slate-800 mb-0.5">{row.site}</p>
                          <p className="text-[11px] text-slate-400 max-w-[180px] truncate">{row.note}</p>
                        </td>

                        {/* Location / Time */}
                        <td className="px-5 py-4 align-top min-w-[200px]">
                          <p className="text-[12px] text-slate-600 font-medium mb-1 line-clamp-1">{row.address}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              <IconCalendar className="w-3 h-3" /> {row.report}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              <IconClock /> {row.hours}
                            </span>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-5 py-4 align-top text-[13px] text-slate-600 font-medium min-w-[110px]">
                          {row.role || '—'}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4 align-top min-w-[110px]">
                          <StatusBadge status={row.status} />
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 align-top min-w-[185px]">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSendNotification(row)}
                              disabled={sendingNotification === row.id}
                              className="flex items-center gap-1.5 border hover:shadow-sm transition-all border-indigo-200 rounded-lg px-3 py-1.5 text-[11px] text-indigo-600 hover:bg-indigo-50 cursor-pointer bg-white whitespace-nowrap font-semibold">
                              <IconSend /> {sendingNotification === row.id ? 'Sending...' : 'Notify'}
                            </button>
                            <button
                              onClick={() => {
                                setEditingAssignment(row);
                                setFormData(row);
                                setIsFormOpen(true);
                              }}
                              className="w-8 h-8 flex items-center justify-center border hover:shadow-sm transition-all border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-indigo-500 cursor-pointer bg-white flex-shrink-0 p-0"
                              title="Edit Assignment">
                              <IconPencil />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Mobile Cards (visible on mobile only) ── */}
            <div className="md:hidden">
              {filtered.map(row => <MobileCard key={row.id} row={row} />)}
            </div>
          </>
        )}
      </div>

      {/* ── Assignment Form Modal ── */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingAssignment ? 'Edit Assignment' : 'New Assignment'}
        size="lg"
      >
        <form className="space-y-4" onSubmit={handleFormSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Coach *</label>
            <select
              required
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              value={formData.coachId}
              onChange={(e) => {
                const selected = coaches.find(c => c.id === e.target.value);
                setFormData({
                  ...formData,
                  coachId: e.target.value,
                  coachName: selected ? `${selected.firstName} ${selected.lastName}` : ''
                });
              }}
            >
              <option value="">Select a coach...</option>
              {coaches.map(coach => (
                <option key={coach.id} value={coach.id}>
                  {coach.firstName} {coach.lastName}
                </option>
              ))}
            </select>
          </div>

          <TextField
            label="Site Name *"
            value={formData.site}
            onChange={(e) => setFormData({ ...formData, site: e.target.value })}
            placeholder="Enter site project or school name"
            required
          />
          <TextField
            label="Site Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Enter full address"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField
              label="Report Date *"
              value={formData.report}
              onChange={(e) => setFormData({ ...formData, report: e.target.value })}
              placeholder="e.g., Tuesday, April 30"
              required
            />
            <TextField
              label="Staff Hours *"
              value={formData.hours}
              onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
              placeholder="e.g., 3:00 PM – 6:00 PM"
              required
            />
          </div>
          <TextField
            label="Role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            placeholder="e.g., Head Coach Assistant"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <TextField
            label="Notes"
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            multiline
            rows={3}
            placeholder="Additional notes or instructions for the coach..."
          />
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsFormOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingAssignment ? 'Update Assignment' : 'Create Assignment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CoachAssignments;