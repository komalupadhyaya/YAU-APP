import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../layout/Header';
import Button from '../common/Button';
import Table, { TableRow, TableCell } from '../common/Table';
import PickupAPI from '../../firebase/apis/api-pickup';
import { ChevronLeft, Eye, RefreshCw, Search } from 'lucide-react';

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

const PickupAdminEnrollments = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState([]);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await PickupAPI.getAllEnrollments({ limit: Number(limit) || 50 });
      setEnrollments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('❌ Error loading enrollments:', e);
      alert(`Error loading enrollments: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enrollments;
    return (enrollments || []).filter((e) => {
      const parts = [
        e?.id,
        e?.parentFirstName,
        e?.parentLastName,
        e?.email,
        e?.mobileNumber,
        e?.status,
        e?.source,
        Array.isArray(e?.volunteerInterests) ? e.volunteerInterests.join(', ') : e?.volunteerInterest,
      ]
        .filter(Boolean)
        .map((x) => String(x).toLowerCase());
      return parts.some((p) => p.includes(q));
    });
  }, [enrollments, search]);

  return (
    <div className="space-y-6">
      <Header
        title="School Pickup — Enrollments"
        subtitle="View enrollment submissions (newest first). Click View to see the full payload/answers."
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => navigate('/admin/schools-pickup')}>
          <ChevronLeft size={18} className="mr-2" />
          Back to Schools
        </Button>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Enrollments ({filtered.length})</h3>
            <p className="text-sm text-gray-600">Reads from `pickupEnrollments` via your existing `/pickup/enrollments` endpoints.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 bg-white/70 border border-gray-200 rounded-lg px-3 h-10">
              <span className="text-sm text-gray-700">Limit</span>
              <input
                type="number"
                min={1}
                max={500}
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="w-24 h-8 px-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <Button
                variant="secondary"
                onClick={load}
                disabled={loading}
                className="h-8 px-3"
              >
                <RefreshCw size={16} className="mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
          <div className="relative md:col-span-4">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, email, phone, status, id…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-10 pr-4 w-full border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="md:col-span-2 flex items-center justify-end">
            <Button variant="secondary" type="button" onClick={() => setSearch('')} disabled={!search.trim()}>
              Clear search
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <thead>
              <TableRow>
                <TableCell isHeader>Submitted</TableCell>
                <TableCell isHeader>Parent</TableCell>
                <TableCell isHeader>Email</TableCell>
                <TableCell isHeader>Phone</TableCell>
                <TableCell isHeader>Students</TableCell>
                <TableCell isHeader>Status</TableCell>
                <TableCell isHeader>Actions</TableCell>
              </TableRow>
            </thead>
            <tbody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No enrollments found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((e) => (
                  <TableRow key={e?.id}>
                    <TableCell>{formatDate(e?.submittedAt || e?.createdAt || e?.updatedAt)}</TableCell>
                    <TableCell className="font-medium">
                      {[e?.parentFirstName, e?.parentLastName].filter(Boolean).join(' ') || '—'}
                    </TableCell>
                    <TableCell>{e?.email || '—'}</TableCell>
                    <TableCell>{e?.mobileNumber || '—'}</TableCell>
                    <TableCell>{Array.isArray(e?.studentsRaw) ? e.studentsRaw.length : Array.isArray(e?.rawPayload?.students) ? e.rawPayload.students.length : '—'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        e?.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : e?.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-700'
                      }`}>
                        {e?.status || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => navigate(`/admin/schools-pickup/enrollments/${e?.id}`)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View enrollment"
                      >
                        <Eye size={18} />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default PickupAdminEnrollments;

