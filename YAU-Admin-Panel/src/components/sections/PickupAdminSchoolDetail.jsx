import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../layout/Header';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Table, { TableRow, TableCell } from '../common/Table';
import TextField from '../common/TextField';
import ImportWizard from '../common/ImportWizard';
import PickupAPI from '../../firebase/apis/api-pickup';
import { useAuth } from '../../context/AuthContext';
import { ChevronLeft, Plus, Search, Upload, Edit, Trash2, LayoutGrid, List, Download, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

const normalizeSports = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
};

const formatDate = (timestamp) => {
  if (!timestamp) return '—';
  try {
    let d;
    // Handle Firestore timestamp object format from API: { type: "firestore/timestamp/1.0", seconds: ..., nanoseconds: ... }
    if (timestamp?.type === 'firestore/timestamp/1.0' && typeof timestamp?.seconds === 'number') {
      // Convert seconds to milliseconds (nanoseconds are typically negligible for display)
      d = new Date(timestamp.seconds * 1000);
    } else if (typeof timestamp === 'string') {
      d = new Date(timestamp);
    } else if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
      // Firestore Timestamp instance
      d = timestamp.toDate();
    } else {
      d = new Date(timestamp);
    }
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString();
  } catch {
    return '—';
  }
};

const getLocalISODate = (d = new Date()) => {
  // Ensure YYYY-MM-DD reflects the user's local date (not UTC date)
  const tzOffsetMs = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 10);
};

const truthySeason = (v) => {
  const s = String(v ?? '').trim().toLowerCase();
  return s === 'y' || s === 'yes' || s === 'true' || s === '1';
};

const getStudentId = (st) => st?.id || st?.schoolStudentId || null;

const PickupAdminSchoolDetail = () => {
  const navigate = useNavigate();
  const { schoolId } = useParams();
  const { user } = useAuth();
  const adminId = user?.uid || user?.id || 'system';

  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState(null);

  const [studentsLoading, setStudentsLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [pickupStatus, setPickupStatus] = useState(null);

  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // active|inactive|all
  const [date, setDate] = useState(getLocalISODate());
  const [signedOutOnly, setSignedOutOnly] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // list|cards
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    studentFirstName: '',
    studentLastName: '',
    parentFirstName: '',
    parentLastName: '',
    parentEmail: '',
    parentPhone: '',
    grade: '',
    sports: '',
    season1: false,
    season2: false,
    season3: false,
    season4: false,
  });

  const [isImportOpen, setIsImportOpen] = useState(false);

  const loadSchool = async () => {
    try {
      setLoading(true);
      const data = await PickupAPI.getSchoolById(schoolId);
      setSchool(data);
    } catch (e) {
      console.error('❌ Error loading school:', e);
      alert(`Error loading school: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    if (!schoolId) return;
    try {
      setStudentsLoading(true);
      const query = {};
      if (statusFilter === 'active') query.isActive = true;
      if (statusFilter === 'inactive') query.isActive = false;
      if (gradeFilter) query.grade = gradeFilter;
      if (sportFilter) query.sport = sportFilter;
      if (date) query.date = date;

      // NEW: server returns students + signed-out status (and signouts list)
      const data = await PickupAPI.getPickupStatusBySchool(schoolId, query);
      setPickupStatus(data || null);

      const signouts = Array.isArray(data?.signouts) ? data.signouts : [];
      const signoutByStudentId = new Map(
        signouts
          .map((s) => [s?.schoolStudentId, s])
          .filter(([id]) => !!id)
      );

      const normalizedStudents = (Array.isArray(data?.students) ? data.students : []).map((st) => {
        const id = st?.id || st?.schoolStudentId;
        const explicitSignout =
          st?.signout || st?.signedOutRecord || st?.pickupSignout || (id ? signoutByStudentId.get(id) : null) || null;
        const explicitFlag = st?.isSignedOut ?? st?.signedOut ?? st?.pickupSignedOut;
        const isSignedOut = explicitFlag !== undefined ? !!explicitFlag : !!explicitSignout;
        return {
          ...st,
          __isSignedOut: isSignedOut,
          __signout: explicitSignout,
        };
      });

      setStudents(normalizedStudents);
    } catch (e) {
      console.error('❌ Error loading students:', e);
      alert(`Error loading students: ${e.message}`);
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => {
    loadSchool();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  useEffect(() => {
    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, statusFilter, gradeFilter, sportFilter, date]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('pickup.schoolPickup.students.viewMode');
      if (saved === 'list' || saved === 'cards') setViewMode(saved);
    } catch {
      // ignore
    }
  }, []);

  const updateViewMode = (mode) => {
    setViewMode(mode);
    try {
      window.localStorage.setItem('pickup.schoolPickup.students.viewMode', mode);
    } catch {
      // ignore
    }
  };

  const isSelected = (id) => selectedStudentIds.includes(id);

  const toggleSelected = (id) => {
    if (!id) return;
    setSelectedStudentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAllVisible = (visibleIds) => {
    setSelectedStudentIds((prev) => {
      const set = new Set(prev);
      (visibleIds || []).forEach((id) => set.add(id));
      return Array.from(set);
    });
  };

  const clearSelection = () => setSelectedStudentIds([]);

  const clearNonVisibleSelection = (visibleIds) => {
    setSelectedStudentIds((prev) => prev.filter((id) => (visibleIds || []).includes(id)));
  };

  const openBulkDelete = () => {
    if (!selectedStudentIds.length) return;
    setIsBulkDeleteOpen(true);
  };

  const confirmBulkDelete = async () => {
    if (!selectedStudentIds.length) return;
    if (!window.confirm(`Permanently delete ${selectedStudentIds.length} student(s)? This cannot be undone.`)) return;
    try {
      setBulkDeleting(true);
      await PickupAPI.bulkDeleteSchoolStudentsForSchool(schoolId, selectedStudentIds, adminId);
      setIsBulkDeleteOpen(false);
      clearSelection();
      await loadStudents();
      alert('✅ Bulk delete completed');
    } catch (e) {
      console.error('Bulk delete students failed:', e);
      alert(e.message);
    } finally {
      setBulkDeleting(false);
    }
  };

  const grades = useMemo(() => {
    const set = new Set();
    (students || []).forEach(s => s?.grade && set.add(String(s.grade)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [students]);

  const sports = useMemo(() => {
    const set = new Set();
    (students || []).forEach(s => normalizeSports(s?.sports).forEach(sp => set.add(sp)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [students]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = signedOutOnly ? (students || []).filter((st) => !!st?.__isSignedOut) : students;
    if (!q) return base;
    return (base || []).filter((st) => {
      const parts = [
        st?.studentFirstName,
        st?.studentLastName,
        st?.parentFirstName,
        st?.parentLastName,
        st?.parentEmail,
        st?.parentPhone,
        st?.grade,
        normalizeSports(st?.sports).join(', '),
      ]
        .filter(Boolean)
        .map((x) => String(x).toLowerCase());
      return parts.some((p) => p.includes(q));
    });
  }, [students, search, signedOutOnly]);

  const visibleStudentIds = useMemo(() => (filtered || []).map((s) => getStudentId(s)).filter(Boolean), [filtered]);

  const clearFilters = () => {
    setSearch('');
    setGradeFilter('');
    setSportFilter('');
    setStatusFilter('active');
    setSignedOutOnly(false);
    setDate(getLocalISODate());
  };

  const filtersAppliedCount = useMemo(() => {
    const today = getLocalISODate();
    return [
      !!search.trim(),
      date && date !== today,
      signedOutOnly,
      statusFilter !== 'active',
      !!gradeFilter,
      !!sportFilter,
    ].filter(Boolean).length;
  }, [search, date, signedOutOnly, statusFilter, gradeFilter, sportFilter]);

  const openAdd = () => {
    setForm({
      studentFirstName: '',
      studentLastName: '',
      parentFirstName: '',
      parentLastName: '',
      parentEmail: '',
      parentPhone: '',
      grade: '',
      sports: '',
      season1: false,
      season2: false,
      season3: false,
      season4: false,
    });
    setIsAddOpen(true);
  };

  const openEdit = (st) => {
    setEditing(st);
    setForm({
      studentFirstName: st?.studentFirstName || '',
      studentLastName: st?.studentLastName || '',
      parentFirstName: st?.parentFirstName || '',
      parentLastName: st?.parentLastName || '',
      parentEmail: st?.parentEmail || '',
      parentPhone: st?.parentPhone || '',
      grade: st?.grade || '',
      sports: Array.isArray(st?.sports) ? st.sports.join(', ') : st?.sports || '',
      season1: !!st?.season1,
      season2: !!st?.season2,
      season3: !!st?.season3,
      season4: !!st?.season4,
    });
    setIsEditOpen(true);
  };

  const validateStudent = () => {
    if (!form.studentFirstName.trim()) return 'Student First Name is required';
    if (!form.studentLastName.trim()) return 'Student Last Name is required';
    if (!form.parentFirstName.trim()) return 'Parent First Name is required';
    if (!form.parentLastName.trim()) return 'Parent Last Name is required';
    if (!form.grade.trim()) return 'Grade is required';
    if (!normalizeSports(form.sports).length) return 'Sports is required';
    return null;
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    const err = validateStudent();
    if (err) return alert(err);
    try {
      setStudentsLoading(true);
      await PickupAPI.createSchoolStudent(
        schoolId,
        {
          studentFirstName: form.studentFirstName.trim(),
          studentLastName: form.studentLastName.trim(),
          parentFirstName: form.parentFirstName.trim(),
          parentLastName: form.parentLastName.trim(),
          parentEmail: form.parentEmail.trim() || null,
          parentPhone: form.parentPhone.trim() || null,
          grade: form.grade.trim(),
          sports: normalizeSports(form.sports),
          season1: !!form.season1,
          season2: !!form.season2,
          season3: !!form.season3,
          season4: !!form.season4,
        },
        adminId
      );
      setIsAddOpen(false);
      await loadStudents();
      alert('✅ Student created');
    } catch (e2) {
      console.error('Create student failed:', e2);
      alert(e2.message);
    } finally {
      setStudentsLoading(false);
    }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    const err = validateStudent();
    if (err) return alert(err);
    if (!editing?.id) return;
    try {
      setStudentsLoading(true);
      await PickupAPI.updateSchoolStudent(
        editing.id,
        {
          studentFirstName: form.studentFirstName.trim(),
          studentLastName: form.studentLastName.trim(),
          parentFirstName: form.parentFirstName.trim(),
          parentLastName: form.parentLastName.trim(),
          parentEmail: form.parentEmail.trim() || null,
          parentPhone: form.parentPhone.trim() || null,
          grade: form.grade.trim(),
          sports: normalizeSports(form.sports),
          season1: !!form.season1,
          season2: !!form.season2,
          season3: !!form.season3,
          season4: !!form.season4,
        },
        adminId
      );
      setIsEditOpen(false);
      setEditing(null);
      await loadStudents();
      alert('✅ Student updated');
    } catch (e2) {
      console.error('Update student failed:', e2);
      alert(e2.message);
    } finally {
      setStudentsLoading(false);
    }
  };

  const deleteStudent = async (st) => {
    if (!st?.id) return;
    if (!window.confirm(`Permanently delete student "${st.studentFirstName} ${st.studentLastName}"? This cannot be undone.`)) return;
    try {
      setStudentsLoading(true);
      await PickupAPI.deleteSchoolStudent(st.id, adminId);
      await loadStudents();
      alert('✅ Student deleted');
    } catch (e2) {
      console.error('Delete student failed:', e2);
      alert(e2.message);
    } finally {
      setStudentsLoading(false);
    }
  };

  const exportStudentsToExcel = () => {
    try {
      if (!students || students.length === 0) {
        alert('No students to export');
        return;
      }

      // Prepare data for Excel with all student information
      const excelData = students.map((st) => {
        const signoutInfo = st?.__isSignedOut
          ? {
              signedOut: 'Yes',
              signedOutBy: st?.__signout?.signedOutBy || '—',
              signedOutAt: st?.__signout?.signedOutAt ? formatDate(st.__signout.signedOutAt) : '—',
              parentGuardianName: st?.__signout?.parentGuardianName || '—',
            }
          : {
              signedOut: 'No',
              signedOutBy: '—',
              signedOutAt: '—',
              parentGuardianName: '—',
            };

        return {
          'Student First Name': st.studentFirstName || '',
          'Student Last Name': st.studentLastName || '',
          'Parent First Name': st.parentFirstName || '',
          'Parent Last Name': st.parentLastName || '',
          'Parent Email': st.parentEmail || '',
          'Parent Phone': st.parentPhone || '',
          'Grade': st.grade || '',
          'Sports': Array.isArray(st.sports) ? st.sports.join(', ') : st.sports || '',
          'Season 1': st.season1 ? 'Yes' : 'No',
          'Season 2': st.season2 ? 'Yes' : 'No',
          'Season 3': st.season3 ? 'Yes' : 'No',
          'Season 4': st.season4 ? 'Yes' : 'No',
          'Signed Out': signoutInfo.signedOut,
          'Signed Out By': signoutInfo.signedOutBy,
          'Signed Out At': signoutInfo.signedOutAt,
          'Parent/Guardian Name': signoutInfo.parentGuardianName,
        };
      });

      // Convert to Excel workbook
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Students');

      // Generate filename: schoolname + date
      const schoolName = (school?.name || 'School').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const filename = `${schoolName}_${dateStr}.xlsx`;

      // Download Excel file
      XLSX.writeFile(wb, filename);

      alert(`✅ Exported ${students.length} student(s) to ${filename}`);
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Failed to export: ${error.message}`);
    }
  };

  const importFields = [
    { key: 'parentFirstName', label: 'Parent First Name', required: true, candidates: ['Parent First Name', 'Parent First', 'Guardian First Name'] },
    { key: 'parentLastName', label: 'Parent Last Name', required: true, candidates: ['Parent Last Name', 'Parent Last', 'Guardian Last Name'] },
    { key: 'parentEmail', label: 'Email', required: false, candidates: ['Email', 'Parent Email'] },
    { key: 'parentPhone', label: 'Mobile Number', required: false, candidates: ['Mobile Number', 'Phone', 'Parent Phone'] },
    { key: 'studentFirstName', label: 'Student First Name', required: true, candidates: ['Student First Name', 'Student First', 'Child First Name'] },
    { key: 'studentLastName', label: 'Student Last Name', required: true, candidates: ['Student Last Name', 'Student Last', 'Child Last Name'] },
    { key: 'schoolName', label: 'School Name', required: true, candidates: ['School Name', 'School'] },
    { key: 'grade', label: 'Grade', required: true, candidates: ['Grade', 'Current Grade'] },
    { key: 'sports', label: 'Sports', required: true, candidates: ['Sports', 'Sport'] },
    { key: 'season1', label: 'Season 1', required: false, candidates: ['Season 1', 'Season1'] },
    { key: 'season2', label: 'Season 2', required: false, candidates: ['Season 2', 'Season2'] },
    { key: 'season3', label: 'Season 3', required: false, candidates: ['Season 3', 'Season3'] },
    { key: 'season4', label: 'Season 4', required: false, candidates: ['Season 4', 'Season4'] },
  ];

  const preflight = ({ rows, columnMap }) => {
    // If school column exists in file, ensure every row matches selected school name (recommended)
    const col = columnMap?.schoolName;
    const selectedName = String(school?.name || '').trim().toLowerCase();
    if (!col || !selectedName) return null;
    const mismatches = (rows || []).filter((r) => String(r?.[col] || '').trim().toLowerCase() !== selectedName);
    if (mismatches.length) {
      return `School Name in file does not match selected school (“${school?.name}”). Fix the file or import from the correct school.`;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <Header
        title={`School Pickup — ${school?.name || 'School'}`}
        subtitle={`Step 2: Students + pickup status${date ? ` (${date})` : ''}.`}
      />

      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={() => navigate('/admin/schools-pickup')}>
          <ChevronLeft size={18} className="mr-2" />
          Back to Schools
        </Button>
        <Button variant="secondary" onClick={loadStudents} disabled={loading || studentsLoading}>
          <RefreshCw size={18} className="mr-2" />
          Refresh
        </Button>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              Students ({filtered.length})
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
              <span>
                <span className="text-gray-500">Location:</span> {school?.location || '—'}
              </span>
              <span className="text-gray-300">•</span>
              <span className="truncate">
                <span className="text-gray-500">Sports:</span> {normalizeSports(school?.sports).join(', ') || '—'}
              </span>
              {pickupStatus?.totals ? (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">
                    <span>
                      <span className="font-semibold">{pickupStatus.totals.students ?? '—'}</span> students
                    </span>
                    <span className="text-gray-400">/</span>
                    <span>
                      <span className="font-semibold">{pickupStatus.totals.signedOut ?? '—'}</span> signed out
                    </span>
                  </span>
                </>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1 bg-white/70 border border-gray-200 rounded-lg p-1">
              <button
                type="button"
                onClick={() => updateViewMode('list')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  viewMode === 'list' ? 'bg-primary-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
                title="List view"
              >
                <List size={16} />
                List
              </button>
              <button
                type="button"
                onClick={() => updateViewMode('cards')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  viewMode === 'cards' ? 'bg-primary-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
                title="Card view"
              >
                <LayoutGrid size={16} />
                Cards
              </button>
            </div>
            <Button variant="secondary" onClick={exportStudentsToExcel} disabled={loading || studentsLoading || !students.length}>
              <Download size={16} className="mr-2" />
              Export
            </Button>
            <Button variant="secondary" onClick={() => setIsImportOpen(true)}>
              <Upload size={16} className="mr-2" />
              Import Students
            </Button>
            <Button onClick={openAdd}>
              <Plus size={16} className="mr-2" />
              Add Student
            </Button>
          </div>
        </div>

        {/* Row 1: Search | Date | Signed out */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-3">
          <div className="relative md:col-span-3">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search student or parent…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-10 pr-4 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="md:col-span-2">
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Date"
                value={date ? dayjs(date) : null}
                onChange={(newValue) => {
                  if (newValue) {
                    setDate(newValue.format('YYYY-MM-DD'));
                  } else {
                    setDate(getLocalISODate());
                  }
                }}
                format="MM/DD/YYYY"
                slotProps={{
                  textField: {
                    fullWidth: true,
                    variant: 'outlined',
                    sx: {
                      '& .MuiInputBase-root': {
                        height: '40px',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                      },
                    },
                  },
                }}
              />
            </LocalizationProvider>
          </div>

          <label className="md:col-span-1 h-10 flex items-center gap-2 text-sm text-gray-700 px-3 border border-gray-200 rounded-lg bg-white/60">
            <input
              type="checkbox"
              checked={signedOutOnly}
              onChange={(e) => setSignedOutOnly(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            Signed out
          </label>
        </div>

        {/* Row 2: Active | Grade | Sports | Clear (with badge) */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 md:col-span-2"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>

          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 md:col-span-2"
          >
            <option value="">All Grades</option>
            {grades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          <select
            value={sportFilter}
            onChange={(e) => setSportFilter(e.target.value)}
            className="h-10 px-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 md:col-span-2"
          >
            <option value="">All Sports</option>
            {sports.map((sp) => (
              <option key={sp} value={sp}>
                {sp}
              </option>
            ))}
          </select>

          <div className="md:col-span-6 flex justify-end">
            <Button variant="secondary" type="button" onClick={clearFilters} disabled={filtersAppliedCount === 0}>
              <span className="flex items-center gap-2">
                Clear filters
                {filtersAppliedCount ? (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary-600 text-white text-[11px] font-semibold">
                    {filtersAppliedCount}
                  </span>
                ) : null}
              </span>
            </Button>
          </div>
        </div>

        {/* Bulk actions (shown only when selection exists) */}
        {selectedStudentIds.length ? (
          <div className="mb-5 bg-blue-50/60 border border-blue-100 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="text-sm text-gray-800">
              <span className="font-semibold">{selectedStudentIds.length}</span> selected
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={() => selectAllVisible(visibleStudentIds)} disabled={bulkDeleting}>
                Select all visible
              </Button>
              <Button variant="secondary" onClick={() => clearNonVisibleSelection(visibleStudentIds)} disabled={bulkDeleting}>
                Keep only visible
              </Button>
              <Button variant="secondary" onClick={clearSelection} disabled={bulkDeleting}>
                Clear
              </Button>
              <Button variant="danger" onClick={openBulkDelete} disabled={bulkDeleting}>
                Delete selected
              </Button>
            </div>
          </div>
        ) : null}

        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <TableRow>
                  <TableCell isHeader className="w-10">
                    <input
                      type="checkbox"
                      checked={visibleStudentIds.length > 0 && visibleStudentIds.every((id) => selectedStudentIds.includes(id))}
                      onChange={(e) => (e.target.checked ? selectAllVisible(visibleStudentIds) : clearNonVisibleSelection(visibleStudentIds))}
                      aria-label="Select all visible students"
                    />
                  </TableCell>
                  <TableCell isHeader>Student Name</TableCell>
                  <TableCell isHeader>Parent Name</TableCell>
                  <TableCell isHeader>Email</TableCell>
                  <TableCell isHeader>Phone</TableCell>
                  <TableCell isHeader>Grade</TableCell>
                  <TableCell isHeader>Sports</TableCell>
                  <TableCell isHeader>Seasons</TableCell>
                  <TableCell isHeader>Pickup Status</TableCell>
                  <TableCell isHeader>Actions</TableCell>
                </TableRow>
              </thead>
              <tbody>
                {loading || studentsLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      No students found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((st) => {
                    const studentId = getStudentId(st);
                    return (
                    <TableRow key={studentId || st?.id || `${st?.studentFirstName || ''}-${st?.studentLastName || ''}`} className={isSelected(studentId) ? 'bg-blue-50' : ''}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={isSelected(studentId)}
                          onChange={() => toggleSelected(studentId)}
                          aria-label={`Select student ${st.studentFirstName} ${st.studentLastName}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {st.studentFirstName} {st.studentLastName}
                      </TableCell>
                      <TableCell>
                        {st.parentFirstName} {st.parentLastName}
                      </TableCell>
                      <TableCell>{st.parentEmail || '—'}</TableCell>
                      <TableCell>{st.parentPhone || '—'}</TableCell>
                      <TableCell>{st.grade || '—'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {normalizeSports(st.sports).slice(0, 4).map((sp) => (
                            <span key={sp} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              {sp}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {st.season1 ? <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded">S1</span> : null}
                          {st.season2 ? <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded">S2</span> : null}
                          {st.season3 ? <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded">S3</span> : null}
                          {st.season4 ? <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded">S4</span> : null}
                          {!st.season1 && !st.season2 && !st.season3 && !st.season4 ? <span className="text-gray-400">—</span> : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {st?.__isSignedOut ? (
                          <div className="space-y-1">
                            <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                              Signed out
                            </span>
                            <div className="text-xs text-gray-700">
                              {st?.__signout?.parentGuardianName ? (
                                <span className="font-medium">{st.__signout.parentGuardianName}</span>
                              ) : (
                                <span className="text-gray-500">Parent: —</span>
                              )}
                              {st?.__signout?.signedOutAt ? (
                                <span className="text-gray-500"> • {formatDate(st.__signout.signedOutAt)}</span>
                              ) : null}
                            </div>
                            {st?.__signout?.signedOutBy ? (
                              <div className="text-xs text-gray-500">By: {st.__signout.signedOutBy}</div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            Not signed out
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(st)}
                            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => deleteStudent(st)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {loading || studentsLoading ? (
              <div className="col-span-full text-center py-10 text-gray-500">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="col-span-full text-center py-10 text-gray-500">No students found.</div>
            ) : (
              filtered.map((st) => {
                const studentId = getStudentId(st);
                return (
                <div
                  key={studentId || st?.id || `${st?.studentFirstName || ''}-${st?.studentLastName || ''}`}
                  className={`bg-white/80 border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow ${
                    isSelected(studentId) ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-base font-semibold text-gray-900 truncate">
                        {st.studentFirstName} {st.studentLastName}
                      </div>
                      <div className="text-sm text-gray-600 mt-1 truncate">
                        Parent: {st.parentFirstName} {st.parentLastName}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected(studentId)}
                        onChange={() => toggleSelected(studentId)}
                        aria-label={`Select student ${st.studentFirstName} ${st.studentLastName}`}
                      />
                      <div className="flex-shrink-0 text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                        Grade {st.grade || '—'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
                    <div className="text-gray-700 truncate">
                      <span className="text-gray-500">Email:</span> {st.parentEmail || '—'}
                    </div>
                    <div className="text-gray-700 truncate">
                      <span className="text-gray-500">Phone:</span> {st.parentPhone || '—'}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Sports</div>
                    <div className="flex flex-wrap gap-1">
                      {normalizeSports(st.sports).length ? (
                        <>
                          {normalizeSports(st.sports).slice(0, 6).map((sp) => (
                            <span key={sp} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              {sp}
                            </span>
                          ))}
                          {normalizeSports(st.sports).length > 6 ? (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              +{normalizeSports(st.sports).length - 6}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-sm text-gray-500">—</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Seasons</div>
                    <div className="flex flex-wrap gap-1">
                      {st.season1 ? <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded">S1</span> : null}
                      {st.season2 ? <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded">S2</span> : null}
                      {st.season3 ? <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded">S3</span> : null}
                      {st.season4 ? <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded">S4</span> : null}
                      {!st.season1 && !st.season2 && !st.season3 && !st.season4 ? <span className="text-gray-500">—</span> : null}
                    </div>
                  </div>

                  <div className="mt-4 text-sm">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Pickup Status</div>
                    {st?.__isSignedOut ? (
                      <div className="space-y-1">
                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          Signed out
                        </span>
                        <div className="text-xs text-gray-700 truncate">
                          {st?.__signout?.parentGuardianName ? `Parent: ${st.__signout.parentGuardianName}` : 'Parent: —'}
                        </div>
                        {st?.__signout?.signedOutAt ? (
                          <div className="text-xs text-gray-500 truncate">{formatDate(st.__signout.signedOutAt)}</div>
                        ) : null}
                      </div>
                    ) : (
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        Not signed out
                      </span>
                    )}
                  </div>

                  <div className="mt-5 flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEdit(st)}
                      className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => deleteStudent(st)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Bulk Delete Students */}
      <Modal
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        title={`Delete ${selectedStudentIds.length} Student(s)`}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            This is a permanent delete. Selected students are greyed out in the list/cards.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsBulkDeleteOpen(false)} disabled={bulkDeleting}>
              Cancel
            </Button>
            <Button variant="danger" type="button" onClick={confirmBulkDelete} disabled={bulkDeleting || !selectedStudentIds.length}>
              {bulkDeleting ? 'Deleting…' : 'Confirm Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Student */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Student" size="lg">
        <form onSubmit={submitAdd} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label="Student First Name" value={form.studentFirstName} onChange={(e) => setForm({ ...form, studentFirstName: e.target.value })} required />
            <TextField label="Student Last Name" value={form.studentLastName} onChange={(e) => setForm({ ...form, studentLastName: e.target.value })} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label="Parent First Name" value={form.parentFirstName} onChange={(e) => setForm({ ...form, parentFirstName: e.target.value })} required />
            <TextField label="Parent Last Name" value={form.parentLastName} onChange={(e) => setForm({ ...form, parentLastName: e.target.value })} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label="Email (optional)" value={form.parentEmail} onChange={(e) => setForm({ ...form, parentEmail: e.target.value })} />
            <TextField label="Phone (optional)" value={form.parentPhone} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label="Grade" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} required />
            <TextField label="Sports (comma-separated)" value={form.sports} onChange={(e) => setForm({ ...form, sports: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['season1', 'season2', 'season3', 'season4'].map((k, idx) => (
              <label key={k} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={!!form[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.checked })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                Season {idx + 1}
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={studentsLoading}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Student */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Student" size="lg">
        <form onSubmit={submitEdit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label="Student First Name" value={form.studentFirstName} onChange={(e) => setForm({ ...form, studentFirstName: e.target.value })} required />
            <TextField label="Student Last Name" value={form.studentLastName} onChange={(e) => setForm({ ...form, studentLastName: e.target.value })} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label="Parent First Name" value={form.parentFirstName} onChange={(e) => setForm({ ...form, parentFirstName: e.target.value })} required />
            <TextField label="Parent Last Name" value={form.parentLastName} onChange={(e) => setForm({ ...form, parentLastName: e.target.value })} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label="Email (optional)" value={form.parentEmail} onChange={(e) => setForm({ ...form, parentEmail: e.target.value })} />
            <TextField label="Phone (optional)" value={form.parentPhone} onChange={(e) => setForm({ ...form, parentPhone: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label="Grade" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} required />
            <TextField label="Sports (comma-separated)" value={form.sports} onChange={(e) => setForm({ ...form, sports: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['season1', 'season2', 'season3', 'season4'].map((k, idx) => (
              <label key={k} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={!!form[k]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.checked })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                Season {idx + 1}
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={studentsLoading}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

      {/* Import Students */}
      <ImportWizard
        isOpen={isImportOpen}
        onClose={() => {
          setIsImportOpen(false);
          loadStudents();
        }}
        title="Import Students (Excel/CSV)"
        fields={importFields}
        defaultMode="upsert"
        preflight={preflight}
        onImportChunk={async ({ rows, columnMap, settings }) => {
          // If backend expects seasons as boolean, pre-normalize common Y/N values when columns are present.
          const normalized = (rows || []).map((r) => {
            const out = { ...(r || {}) };
            if (columnMap.season1) out[columnMap.season1] = truthySeason(r?.[columnMap.season1]);
            if (columnMap.season2) out[columnMap.season2] = truthySeason(r?.[columnMap.season2]);
            if (columnMap.season3) out[columnMap.season3] = truthySeason(r?.[columnMap.season3]);
            if (columnMap.season4) out[columnMap.season4] = truthySeason(r?.[columnMap.season4]);
            return out;
          });

          const res = await PickupAPI.bulkImportSchoolStudents(
            normalized,
            {
              mode: settings.mode,
              // Send both schoolName and school keys to be tolerant to backend implementations
              columnMap: {
                parentFirstName: columnMap.parentFirstName,
                parentLastName: columnMap.parentLastName,
                parentEmail: columnMap.parentEmail,
                parentPhone: columnMap.parentPhone,
                studentFirstName: columnMap.studentFirstName,
                studentLastName: columnMap.studentLastName,
                grade: columnMap.grade,
                sports: columnMap.sports,
                schoolName: columnMap.schoolName,
                school: columnMap.schoolName,
                season1: columnMap.season1,
                season2: columnMap.season2,
                season3: columnMap.season3,
                season4: columnMap.season4,
              },
            },
            adminId
          );
          return res || {};
        }}
      />
    </div>
  );
};

export default PickupAdminSchoolDetail;

