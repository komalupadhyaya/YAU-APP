import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../layout/Header';
import Button from '../common/Button';
import PickupAPI from '../../firebase/apis/api-pickup';
import { ChevronLeft, RefreshCw } from 'lucide-react';

const Badge = ({ tone = 'gray', children }) => {
  const tones = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
    amber: 'bg-amber-100 text-amber-800',
    indigo: 'bg-indigo-100 text-indigo-800',
  };
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
};

const toDate = (ts) => {
  if (!ts) return null;
  if (typeof ts === 'string' || typeof ts === 'number') {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof ts?.toDate === 'function') {
    const d = ts.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  const seconds = ts?.seconds ?? ts?._seconds;
  const nanos = ts?.nanoseconds ?? ts?._nanoseconds ?? 0;
  if (typeof seconds === 'number') {
    const d = new Date(seconds * 1000 + Math.floor(nanos / 1e6));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const formatDate = (ts) => {
  const d = toDate(ts);
  return d ? d.toLocaleString() : '—';
};

const PickupAdminEnrollmentDetail = () => {
  const navigate = useNavigate();
  const { enrollmentId } = useParams();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await PickupAPI.getEnrollmentById(enrollmentId);
      setData(res || null);
    } catch (e) {
      console.error('❌ Error loading enrollment:', e);
      alert(`Error loading enrollment: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollmentId]);

  const parentName = useMemo(
    () => [data?.parentFirstName, data?.parentLastName].filter(Boolean).join(' ') || '—',
    [data]
  );

  const studentsCount = useMemo(() => {
    if (Array.isArray(data?.studentsRaw)) return data.studentsRaw.length;
    if (Array.isArray(data?.rawPayload?.students)) return data.rawPayload.students.length;
    return null;
  }, [data]);

  const answers = data?.rawPayload || {};
  const volunteerInterests = useMemo(() => {
    const v = answers?.volunteerInterest ?? data?.volunteerInterests ?? data?.volunteerInterest;
    if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
    if (!v) return [];
    return [String(v).trim()].filter(Boolean);
  }, [answers?.volunteerInterest, data?.volunteerInterests, data?.volunteerInterest]);

  const students = useMemo(() => {
    const raw = Array.isArray(data?.studentsRaw)
      ? data.studentsRaw
      : Array.isArray(answers?.students)
        ? answers.students
        : [];
    return raw.map((s, idx) => ({ __idx: idx, ...(s || {}) }));
  }, [data?.studentsRaw, answers?.students]);

  return (
    <div className="space-y-6">
      <Header
        title="School Pickup — Enrollment Detail"
        subtitle={enrollmentId ? `Enrollment ID: ${enrollmentId}` : 'Enrollment'}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => navigate('/admin/schools-pickup/enrollments')}>
          <ChevronLeft size={18} className="mr-2" />
          Back to Enrollments
        </Button>
        <Button variant="secondary" onClick={load} disabled={loading}>
          <RefreshCw size={16} className="mr-2" />
          Refresh
        </Button>
      </div>

      <div className="glass rounded-2xl p-6">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading…</div>
        ) : !data ? (
          <div className="text-center py-10 text-gray-500">No data.</div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/70 border border-gray-200 rounded-xl p-4">
                <div className="text-xs uppercase tracking-wide text-gray-500">Parent</div>
                <div className="mt-1 text-sm font-semibold text-gray-900 truncate">{parentName}</div>
                <div className="mt-1 text-sm text-gray-700 truncate">{data?.email || '—'}</div>
                <div className="mt-1 text-sm text-gray-700 truncate">{data?.mobileNumber || '—'}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {answers?.termsAccepted ? <Badge tone="green">Terms accepted</Badge> : <Badge tone="red">Terms not accepted</Badge>}
                </div>
              </div>
              <div className="bg-white/70 border border-gray-200 rounded-xl p-4">
                <div className="text-xs uppercase tracking-wide text-gray-500">Status</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{data?.status || '—'}</div>
                <div className="mt-2 text-xs text-gray-500">Submitted</div>
                <div className="text-sm text-gray-800">{formatDate(data?.submittedAt || data?.createdAt)}</div>
                <div className="mt-2 text-xs text-gray-500">Updated</div>
                <div className="text-sm text-gray-800">{formatDate(data?.updatedAt)}</div>
              </div>
              <div className="bg-white/70 border border-gray-200 rounded-xl p-4">
                <div className="text-xs uppercase tracking-wide text-gray-500">Students</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">{studentsCount ?? '—'}</div>
              </div>
            </div>

            {/* Students */}
            <div className="bg-white/70 border border-gray-200 rounded-xl p-4">
              <div className="text-sm font-semibold text-gray-900 mb-3">Students</div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">School</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Grade</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Age</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">DOB</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Sports</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Commitment</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.length ? (
                      students.map((s) => {
                        const sports = Array.isArray(s?.sportSelections) ? s.sportSelections : [];
                        const fullName = [s?.firstName, s?.lastName].filter(Boolean).join(' ') || '—';
                        return (
                          <tr key={`${s?.schoolId || 'school'}-${s?.studentDob || 'dob'}-${s.__idx}`} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{fullName}</td>
                            <td className="px-4 py-4 text-sm text-gray-800">
                              <div className="font-medium">{s?.schoolAttendance || '—'}</div>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-800 whitespace-nowrap">{s?.studentGrade || '—'}</td>
                            <td className="px-4 py-4 text-sm text-gray-800 whitespace-nowrap">{s?.studentAge || '—'}</td>
                            <td className="px-4 py-4 text-sm text-gray-800 whitespace-nowrap">{s?.studentDob || '—'}</td>
                            <td className="px-4 py-4 text-sm text-gray-800">
                              <div className="flex flex-wrap gap-2">
                                {sports.length ? sports.map((sp) => <Badge key={`${s.__idx}-${sp}`} tone="blue">{sp}</Badge>) : '—'}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-800 whitespace-nowrap">
                              {s?.gameCommitment ? <Badge tone={String(s.gameCommitment).toLowerCase() === 'yes' ? 'green' : 'gray'}>{String(s.gameCommitment)}</Badge> : '—'}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                          No students found in this enrollment.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Answers */}
            <div className="bg-white/70 border border-gray-200 rounded-xl p-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 mb-3">
                <div className="text-sm font-semibold text-gray-900">Enrollment answers</div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <div className="text-xs uppercase tracking-wide text-gray-500">Signature</div>
                  <div className="mt-1 text-sm text-gray-900">{answers?.electronicSignature || '—'}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500">Volunteer interests</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {volunteerInterests.length ? (
                      volunteerInterests.map((v) => (
                        <Badge key={v} tone="blue">
                          {v}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-gray-600">—</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PickupAdminEnrollmentDetail;

