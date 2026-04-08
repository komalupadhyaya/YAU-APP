import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../layout/Header';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Table, { TableRow, TableCell } from '../common/Table';
import TextField from '../common/TextField';
import ImportWizard from '../common/ImportWizard';
import PickupAPI from '../../firebase/apis/api-pickup';
import { useAuth } from '../../context/AuthContext';
import { Plus, Search, Upload, Eye, Edit, Trash2, School as SchoolIcon, LayoutGrid, List } from 'lucide-react';

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
    const d = typeof timestamp === 'string' ? new Date(timestamp) : timestamp?.toDate?.() || timestamp;
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString();
  } catch {
    return '—';
  }
};

const PickupAdminSchools = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const adminId = user?.uid || user?.id || 'system';

  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState([]);
  const [statusFilter, setStatusFilter] = useState('active'); // active|inactive|all
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('list'); // list|cards
  const [selectedSchoolIds, setSelectedSchoolIds] = useState([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [bulkDeleteAlsoStudents, setBulkDeleteAlsoStudents] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', location: '', sports: '' });

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImportStudentsOpen, setIsImportStudentsOpen] = useState(false);

  const loadSchools = async () => {
    try {
      setLoading(true);
      const query = {};
      if (statusFilter === 'active') query.isActive = true;
      if (statusFilter === 'inactive') query.isActive = false;
      const data = await PickupAPI.getAllSchools(query);
      setSchools(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('❌ Error loading schools:', e);
      alert(`Error loading schools: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('pickup.schoolPickup.schools.viewMode');
      if (saved === 'list' || saved === 'cards') setViewMode(saved);
    } catch {
      // ignore
    }
  }, []);

  const updateViewMode = (mode) => {
    setViewMode(mode);
    try {
      window.localStorage.setItem('pickup.schoolPickup.schools.viewMode', mode);
    } catch {
      // ignore
    }
  };

  const isSelected = (id) => selectedSchoolIds.includes(id);

  const toggleSelected = (id) => {
    if (!id) return;
    setSelectedSchoolIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAllVisible = () => {
    setSelectedSchoolIds((prev) => {
      const set = new Set(prev);
      visibleSchoolIds.forEach((id) => set.add(id));
      return Array.from(set);
    });
  };

  const clearSelection = () => setSelectedSchoolIds([]);

  const clearNonVisibleSelection = () => {
    setSelectedSchoolIds((prev) => prev.filter((id) => visibleSchoolIds.includes(id)));
  };

  const openBulkDelete = () => {
    if (!selectedSchoolIds.length) return;
    setBulkDeleteAlsoStudents(false);
    setIsBulkDeleteOpen(true);
  };

  const confirmBulkDelete = async () => {
    if (!selectedSchoolIds.length) return;
    if (!window.confirm(`Permanently delete ${selectedSchoolIds.length} school(s)? This cannot be undone.`)) return;
    try {
      setBulkDeleting(true);
      await PickupAPI.bulkDeleteSchools(selectedSchoolIds, bulkDeleteAlsoStudents, adminId);
      setIsBulkDeleteOpen(false);
      clearSelection();
      await loadSchools();
      alert('✅ Bulk delete completed');
    } catch (e) {
      console.error('Bulk delete schools failed:', e);
      alert(e.message);
    } finally {
      setBulkDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return schools;
    return (schools || []).filter((s) => {
      const name = String(s?.name || '').toLowerCase();
      const location = String(s?.location || '').toLowerCase();
      const sports = (Array.isArray(s?.sports) ? s.sports.join(', ') : String(s?.sports || '')).toLowerCase();
      return name.includes(q) || location.includes(q) || sports.includes(q);
    });
  }, [schools, search]);

  const visibleSchoolIds = useMemo(() => (filtered || []).map((s) => s?.id).filter(Boolean), [filtered]);

  const openAdd = () => {
    setForm({ name: '', location: '', sports: '' });
    setIsAddOpen(true);
  };

  const openEdit = (school) => {
    setEditing(school);
    setForm({
      name: school?.name || '',
      location: school?.location || '',
      sports: (Array.isArray(school?.sports) ? school.sports.join(', ') : school?.sports) || '',
    });
    setIsEditOpen(true);
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert('School Name is required');
    try {
      setLoading(true);
      await PickupAPI.createSchool(
        {
          name: form.name.trim(),
          location: form.location.trim() || null,
          sports: normalizeSports(form.sports),
        },
        adminId
      );
      setIsAddOpen(false);
      await loadSchools();
      alert('✅ School created');
    } catch (err) {
      console.error('Create school failed:', err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editing?.id) return;
    if (!form.name.trim()) return alert('School Name is required');
    try {
      setLoading(true);
      await PickupAPI.updateSchool(
        editing.id,
        {
          name: form.name.trim(),
          location: form.location.trim() || null,
          sports: normalizeSports(form.sports),
          isActive: editing?.isActive !== undefined ? !!editing.isActive : true,
        },
        adminId
      );
      setIsEditOpen(false);
      setEditing(null);
      await loadSchools();
      alert('✅ School updated');
    } catch (err) {
      console.error('Update school failed:', err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteSchool = async (school) => {
    if (!school?.id) return;
    if (!window.confirm(`Permanently delete school "${school.name}"? This cannot be undone.`)) return;
    try {
      setLoading(true);
      await PickupAPI.deleteSchool(school.id, adminId);
      await loadSchools();
      alert('✅ School deleted');
    } catch (err) {
      console.error('Delete school failed:', err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const importFields = [
    { key: 'name', label: 'School Name', required: true, candidates: ['School Name', 'School', 'Name'] },
    { key: 'location', label: 'Location', required: false, candidates: ['Location', 'City', 'City, State'] },
    { key: 'sports', label: 'Sports', required: false, candidates: ['Sports', 'Sport', 'Programs'] },
  ];

  // Multi-school student import (single file containing multiple schools)
  // Backend supports: createMissingSchools: true
  const importStudentsFields = [
    // Parent
    { key: 'parentFirstName', label: 'Parent First Name', required: false, candidates: ['Parent First Name', 'First Name'] },
    { key: 'parentLastName', label: 'Parent Last Name', required: false, candidates: ['Parent Last Name', 'Last Name'] },
    { key: 'parentEmail', label: 'Email', required: false, candidates: ['Email'] },
    { key: 'parentPhone', label: 'Mobile Number', required: false, candidates: ['Mobile Number', 'Phone'] },
    // Student
    {
      key: 'studentFirstName',
      label: 'Student First Name',
      required: false,
      candidates: ['Student First Name', 'Student Name (First Name)', 'Student First', 'Child First Name'],
    },
    {
      key: 'studentLastName',
      label: 'Student Last Name',
      required: false,
      candidates: ['Student Last Name', 'Student Name (Last Name)', 'Student Last', 'Child Last Name'],
    },
    // School + Grade + Sports (form-style headers included)
    {
      key: 'schoolName',
      label: 'School Name',
      required: false,
      candidates: ['School Name', 'What school does your student attend?', 'What school does your child attend?'],
    },
    {
      key: 'grade',
      label: 'Grade',
      required: false,
      candidates: ['Grade', "Your Student's Current Grade ?", "Your Student's Current Grade", 'Current Grade'],
    },
    {
      key: 'sports',
      label: 'Sports',
      required: false,
      candidates: ['Sports', 'Which sport would your student like to play?', 'Which sport does your child want to play?'],
    },
    // Seasons
    { key: 'season1', label: 'Season 1', required: false, candidates: ['Season 1', 'Season1'] },
    { key: 'season2', label: 'Season 2', required: false, candidates: ['Season 2', 'Season2'] },
    { key: 'season3', label: 'Season 3', required: false, candidates: ['Season 3', 'Season3'] },
    { key: 'season4', label: 'Season 4', required: false, candidates: ['Season 4', 'Season4'] },
  ];

  const compactColumnMap = (map) => {
    const out = {};
    Object.entries(map || {}).forEach(([k, v]) => {
      if (v) out[k] = v;
    });
    return Object.keys(out).length ? out : null;
  };

  return (
    <div className="space-y-6">
      <Header title="School Pickup — Schools" subtitle="Step 1: Manage the master list of schools (required before importing students)." />

      <div className="glass rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <SchoolIcon size={18} /> Schools ({filtered.length})
            </h3>
            <p className="text-sm text-gray-600">Search, add, edit, soft-delete, or import schools.</p>
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
            <Button variant="secondary" onClick={() => navigate('/admin/schools-pickup/enrollments')}>
              <Eye size={16} className="mr-2" />
              View Enrollments
            </Button>
            <Button variant="secondary" onClick={() => setIsImportOpen(true)}>
              <Upload size={16} className="mr-2" />
              Import Schools
            </Button>
            <Button variant="secondary" onClick={() => setIsImportStudentsOpen(true)}>
              <Upload size={16} className="mr-2" />
              Import Students
            </Button>
            <Button onClick={openAdd}>
              <Plus size={16} className="mr-2" />
              Add School
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search school name or location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
        </div>

        {/* Bulk actions (shown only when selection exists) */}
        {selectedSchoolIds.length ? (
          <div className="mb-6 bg-blue-50/60 border border-blue-100 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="text-sm text-gray-800">
              <span className="font-semibold">{selectedSchoolIds.length}</span> selected
              <span className="text-gray-500 ml-2">(actions apply to current filtered view)</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={selectAllVisible} disabled={bulkDeleting}>
                Select all visible
              </Button>
              <Button variant="secondary" onClick={clearNonVisibleSelection} disabled={bulkDeleting}>
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
                      checked={visibleSchoolIds.length > 0 && visibleSchoolIds.every((id) => selectedSchoolIds.includes(id))}
                      onChange={(e) => (e.target.checked ? selectAllVisible() : clearNonVisibleSelection())}
                      aria-label="Select all visible schools"
                    />
                  </TableCell>
                  <TableCell isHeader>School Name</TableCell>
                  <TableCell isHeader>Location</TableCell>
                  <TableCell isHeader>Sports</TableCell>
                  <TableCell isHeader>Students</TableCell>
                  <TableCell isHeader>Status</TableCell>
                  <TableCell isHeader>Actions</TableCell>
                </TableRow>
              </thead>
              <tbody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No schools found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => (
                    <TableRow
                      key={s.id}
                      className={isSelected(s.id) ? 'bg-blue-50' : ''}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={isSelected(s.id)}
                          onChange={() => toggleSelected(s.id)}
                          aria-label={`Select school ${s.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.location || '—'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {normalizeSports(s.sports).slice(0, 6).map((sp) => (
                            <span key={sp} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              {sp}
                            </span>
                          ))}
                          {normalizeSports(s.sports).length > 6 ? (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              +{normalizeSports(s.sports).length - 6}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{s.studentCount ?? '—'}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            s.isActive === false ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {s.isActive === false ? 'Inactive' : 'Active'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/admin/schools-pickup/${s.id}`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => openEdit(s)}
                            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => deleteSchool(s)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-full text-center py-10 text-gray-500">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="col-span-full text-center py-10 text-gray-500">No schools found.</div>
            ) : (
              filtered.map((s) => (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/admin/schools-pickup/${s.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') navigate(`/admin/schools-pickup/${s.id}`);
                  }}
                  className={`bg-white/80 border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                    isSelected(s.id) ? 'bg-blue-50' : s.isActive === false ? 'opacity-90' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-base font-semibold text-gray-900 truncate">{s.name}</div>
                      <div className="text-sm text-gray-600 mt-1 truncate">{s.location || '—'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected(s.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelected(s.id);
                        }}
                        aria-label={`Select school ${s.name}`}
                      />
                      <span
                        className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-medium ${
                          s.isActive === false ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {s.isActive === false ? 'Inactive' : 'Active'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Sports</div>
                    <div className="flex flex-wrap gap-1">
                      {normalizeSports(s.sports).length ? (
                        <>
                          {normalizeSports(s.sports).slice(0, 8).map((sp) => (
                            <span key={sp} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              {sp}
                            </span>
                          ))}
                          {normalizeSports(s.sports).length > 8 ? (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              +{normalizeSports(s.sports).length - 8}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-sm text-gray-500">—</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500">Students</div>
                      <div className="font-medium text-gray-800">{s.studentCount ?? '—'}</div>
                    </div>
                    <div />
                  </div>

                  <div className="mt-5 flex items-center justify-end gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(s);
                      }}
                      className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSchool(s);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Bulk Delete Schools */}
      <Modal
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        title={`Delete ${selectedSchoolIds.length} School(s)`}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            This is a permanent delete. Selected schools are greyed out in the list/cards.
          </p>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={bulkDeleteAlsoStudents}
              onChange={(e) => setBulkDeleteAlsoStudents(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            Also delete all students under these schools
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsBulkDeleteOpen(false)} disabled={bulkDeleting}>
              Cancel
            </Button>
            <Button variant="danger" type="button" onClick={confirmBulkDelete} disabled={bulkDeleting || !selectedSchoolIds.length}>
              {bulkDeleting ? 'Deleting…' : 'Confirm Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add School */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add School" size="md">
        <form onSubmit={submitAdd} className="space-y-4">
          <TextField label="School Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <TextField label="Location (optional)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g., Austin, TX" />
          <TextField
            label="Sports (comma-separated)"
            value={form.sports}
            onChange={(e) => setForm({ ...form, sports: e.target.value })}
            placeholder="Soccer, Basketball, Swimming"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit School */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit School" size="md">
        <form onSubmit={submitEdit} className="space-y-4">
          <TextField label="School Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <TextField label="Location (optional)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <TextField label="Sports (comma-separated)" value={form.sports} onChange={(e) => setForm({ ...form, sports: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

      {/* Import Schools */}
      <ImportWizard
        isOpen={isImportOpen}
        onClose={() => {
          setIsImportOpen(false);
          loadSchools();
        }}
        title="Import Schools (Excel/CSV)"
        fields={importFields}
        defaultMode="upsert"
        onImportChunk={async ({ rows, columnMap, settings }) => {
          const res = await PickupAPI.bulkImportSchools(
            rows,
            {
              mode: settings.mode,
              columnMap: {
                name: columnMap.name,
                location: columnMap.location,
                sports: columnMap.sports,
              },
            },
            adminId
          );
          return res || {};
        }}
      />

      {/* Import Students (multi-school) */}
      <ImportWizard
        isOpen={isImportStudentsOpen}
        onClose={() => {
          setIsImportStudentsOpen(false);
          loadSchools();
        }}
        title="Import Students (Excel/CSV — multiple schools supported)"
        fields={importStudentsFields}
        defaultMode="upsert"
        onImportChunk={async ({ rows, columnMap, settings }) => {
          const cm = compactColumnMap(columnMap);
          const res = await PickupAPI.bulkImportSchoolStudents(
            rows,
            {
              mode: settings.mode,
              createMissingSchools: true,
              ...(cm ? { columnMap: { ...cm, school: cm.schoolName, schoolName: cm.schoolName } } : {}),
            },
            adminId
          );
          return res || {};
        }}
      />
    </div>
  );
};

export default PickupAdminSchools;

