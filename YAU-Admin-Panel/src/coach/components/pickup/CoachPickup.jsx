import React, { useEffect, useMemo, useState } from 'react';
import PickupAPI from '../../../firebase/apis/api-pickup';
import Button from '../../../components/common/Button';
import Modal from '../../../components/common/Modal';

const getLocalISODate = (d = new Date()) => {
  const tzOffsetMs = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 10);
};

const formatDateTime = (value) => {
  if (!value) return '—';
  try {
    let d;
    // Handle Firestore timestamp object format from API: { type: "firestore/timestamp/1.0", seconds: ..., nanoseconds: ... }
    if (value?.type === 'firestore/timestamp/1.0' && typeof value?.seconds === 'number') {
      // Convert seconds to milliseconds (nanoseconds are typically negligible for display)
      d = new Date(value.seconds * 1000);
    } else if (typeof value === 'string') {
      d = new Date(value);
    } else if (value?.toDate && typeof value.toDate === 'function') {
      // Firestore Timestamp instance
      d = value.toDate();
    } else {
      d = new Date(value);
    }
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString();
  } catch {
    return '—';
  }
};

const normalizeSports = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
};

const getStudentId = (st) => st?.id || st?.schoolStudentId || null;

const CoachPickup = ({ coachData }) => {
  const coachUsername =
    coachData?.username ||
    coachData?.email ||
    `${coachData?.firstName || ''} ${coachData?.lastName || ''}`.trim() ||
    'coach';

  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [schools, setSchools] = useState([]);
  const [schoolId, setSchoolId] = useState('');

  const [loading, setLoading] = useState(false);
  const [pickupStatus, setPickupStatus] = useState(null);
  const [students, setStudents] = useState([]);

  const [date, setDate] = useState(getLocalISODate());
  const [statusFilter, setStatusFilter] = useState('active'); // active|inactive|all
  const [gradeFilter, setGradeFilter] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [signedOutOnly, setSignedOutOnly] = useState(false);
  const [search, setSearch] = useState('');

  const [signoutOpen, setSignoutOpen] = useState(false);
  const [signoutStudent, setSignoutStudent] = useState(null);
  const [signoutForm, setSignoutForm] = useState({ parentGuardianName: '', notes: '' });
  const [signingOut, setSigningOut] = useState(false);

  const loadSchools = async () => {
    try {
      setSchoolsLoading(true);
      const data = await PickupAPI.getAllSchools({ isActive: true });
      const list = Array.isArray(data) ? data : [];
      setSchools(list);
      if (!schoolId && list.length) setSchoolId(list[0].id);
    } catch (e) {
      console.error('Failed to load pickup schools:', e);
    } finally {
      setSchoolsLoading(false);
    }
  };

  const loadPickupStatus = async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const query = {};
      if (date) query.date = date;
      if (statusFilter === 'active') query.isActive = true;
      if (statusFilter === 'inactive') query.isActive = false;
      if (gradeFilter) query.grade = gradeFilter;
      if (sportFilter) query.sport = sportFilter;

      const data = await PickupAPI.getPickupStatusBySchool(schoolId, query);
      setPickupStatus(data || null);

      const signouts = Array.isArray(data?.signouts) ? data.signouts : [];
      const signoutByStudentId = new Map(
        signouts
          .map((s) => [s?.schoolStudentId, s])
          .filter(([id]) => !!id)
      );

      const normalized = (Array.isArray(data?.students) ? data.students : []).map((st) => {
        const id = getStudentId(st);
        const explicitSignout = st?.signout || (id ? signoutByStudentId.get(id) : null) || null;
        const explicitFlag = st?.isSignedOut ?? st?.signedOut;
        const isSignedOut = explicitFlag !== undefined ? !!explicitFlag : !!explicitSignout;
        return { ...st, __isSignedOut: isSignedOut, __signout: explicitSignout };
      });

      setStudents(normalized);
    } catch (e) {
      console.error('Failed to load pickup status:', e);
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadPickupStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, date, statusFilter, gradeFilter, sportFilter]);

  const clearFilters = () => {
    setSearch('');
    setGradeFilter('');
    setSportFilter('');
    setStatusFilter('active');
    setSignedOutOnly(false);
    setDate(getLocalISODate());
  };

  const grades = useMemo(() => {
    const set = new Set();
    (students || []).forEach((s) => s?.grade && set.add(String(s.grade)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [students]);

  const sports = useMemo(() => {
    const set = new Set();
    (students || []).forEach((s) => normalizeSports(s?.sports).forEach((sp) => set.add(sp)));
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

  const openSignout = (st) => {
    setSignoutStudent(st);
    setSignoutForm({ parentGuardianName: '', notes: '' });
    setSignoutOpen(true);
  };

  const submitSignout = async () => {
    const studentId = getStudentId(signoutStudent);
    if (!schoolId || !studentId) return;
    if (!signoutForm.parentGuardianName.trim()) return alert('Parent/Guardian name is required');
    try {
      setSigningOut(true);
      await PickupAPI.createSchoolSignOutForSchool(schoolId, {
        schoolStudentId: studentId,
        parentGuardianName: signoutForm.parentGuardianName.trim(),
        notes: signoutForm.notes.trim() || undefined,
        signedOutBy: coachUsername,
        date,
      });
      setSignoutOpen(false);
      setSignoutStudent(null);
      await loadPickupStatus();
      alert('✅ Signed out');
    } catch (e) {
      console.error('Signout failed:', e);
      alert(e.message);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2">
        <div className="text-xl font-semibold text-gray-900">School Pickup</div>
        <div className="text-sm text-gray-600">View pickup status and sign students out.</div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">School</label>
            <select
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              disabled={schoolsLoading}
              className="px-3 py-2 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Grade</label>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="px-3 py-2 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              {grades.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sport</label>
            <select
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
              className="px-3 py-2 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All</option>
              {sports.map((sp) => (
                <option key={sp} value={sp}>
                  {sp}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Student Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="signedOutOnly"
              type="checkbox"
              checked={signedOutOnly}
              onChange={(e) => setSignedOutOnly(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="signedOutOnly" className="text-sm text-gray-700">
              Signed out only
            </label>
          </div>

          <div className="md:col-span-2 flex items-center gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student or parent…"
              className="px-3 py-2 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button variant="secondary" type="button" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        </div>

        {pickupStatus?.totals ? (
          <div className="text-sm text-gray-700">
            Totals: <span className="font-semibold">{pickupStatus.totals.students ?? '—'}</span> students •{' '}
            <span className="font-semibold">{pickupStatus.totals.signedOut ?? '—'}</span> signed out
          </div>
        ) : null}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-900">Students ({filtered?.length || 0})</div>
          <Button variant="secondary" type="button" onClick={loadPickupStatus} disabled={loading || !schoolId}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left px-5 py-3">Student</th>
                <th className="text-left px-5 py-3">Parent</th>
                <th className="text-left px-5 py-3">Grade</th>
                <th className="text-left px-5 py-3">Sports</th>
                <th className="text-left px-5 py-3">Pickup</th>
                <th className="text-right px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-5 py-6 text-gray-500" colSpan={6}>
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="px-5 py-6 text-gray-500" colSpan={6}>
                    No students found.
                  </td>
                </tr>
              ) : (
                filtered.map((st) => {
                  const id = getStudentId(st);
                  return (
                    <tr key={id} className="border-t border-gray-100">
                      <td className="px-5 py-4 font-medium text-gray-900">
                        {st.studentFirstName} {st.studentLastName}
                      </td>
                      <td className="px-5 py-4 text-gray-700">
                        {st.parentFirstName} {st.parentLastName}
                      </td>
                      <td className="px-5 py-4 text-gray-700">{st.grade || '—'}</td>
                      <td className="px-5 py-4 text-gray-700">
                        <div className="flex flex-wrap gap-1">
                          {normalizeSports(st.sports)
                            .slice(0, 4)
                            .map((sp) => (
                              <span key={sp} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                {sp}
                              </span>
                            ))}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {st.__isSignedOut ? (
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
                                <span className="text-gray-500"> • {formatDateTime(st.__signout.signedOutAt)}</span>
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
                      </td>
                      <td className="px-5 py-4 text-right">
                        {st.__isSignedOut ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          <Button type="button" onClick={() => openSignout(st)}>
                            Sign out
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={signoutOpen} onClose={() => setSignoutOpen(false)} title="Sign out student" size="md">
        <div className="space-y-4">
          <div className="text-sm text-gray-700">
            Student:{' '}
            <span className="font-semibold">
              {signoutStudent?.studentFirstName} {signoutStudent?.studentLastName}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent/Guardian name</label>
            <input
              value={signoutForm.parentGuardianName}
              onChange={(e) => setSignoutForm((p) => ({ ...p, parentGuardianName: e.target.value }))}
              className="px-3 py-2 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type parent/guardian name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={signoutForm.notes}
              onChange={(e) => setSignoutForm((p) => ({ ...p, notes: e.target.value }))}
              className="px-3 py-2 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Optional notes"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setSignoutOpen(false)} disabled={signingOut}>
              Cancel
            </Button>
            <Button type="button" onClick={submitSignout} disabled={signingOut}>
              {signingOut ? 'Signing out…' : 'Confirm'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CoachPickup;

