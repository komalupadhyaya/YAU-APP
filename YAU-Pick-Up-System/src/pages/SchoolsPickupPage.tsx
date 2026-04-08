import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import type { PickupSchool } from "../types/pickup";
import { listSchools } from "../services/pickupApi";
import { useRefresh } from "../contexts/RefreshContext";

export function SchoolsPickupPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schools, setSchools] = useState<PickupSchool[]>([]);
  const [q, setQ] = useState("");
  const { setRefreshSchools } = useRefresh();

  const fetchSchools = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listSchools(true);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "Failed to load schools");
      return;
    }
    setSchools(res.data ?? []);
  }, []);

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  useEffect(() => {
    setRefreshSchools(() => fetchSchools);
    return () => setRefreshSchools(null);
  }, [setRefreshSchools, fetchSchools]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return schools;
    return schools.filter((x) => x.name.toLowerCase().includes(s));
  }, [q, schools]);

  return (
    <div className="glass rounded-2xl p-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">All Schools</h2>
          <p className="text-gray-600 text-sm mt-1">Select a school to start pickup.</p>
        </div>
        <div className="w-full md:w-96 space-y-2">
          <label className="text-sm font-semibold text-gray-700">Search</label>
          <input
            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type school name…"
          />
        </div>
      </div>

      {loading && <div className="text-gray-700">Loading…</div>}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-sm">{error}</div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <Link
              key={s.id}
              to={`/schools/${encodeURIComponent(s.id)}`}
              className="glass rounded-2xl p-5 hover:bg-white/90 transition focus:outline-none focus:ring-2 focus:ring-primary-500 border border-gray-200"
            >
              <div className="font-semibold text-gray-900 text-lg">{s.name}</div>
              {s.location && <div className="text-sm text-gray-600 mt-1">{s.location}</div>}
              {typeof s.studentCount === "number" && (
                <div className="text-sm text-gray-700 mt-2 font-medium">
                  {s.studentCount} {s.studentCount === 1 ? "student" : "students"}
                </div>
              )}
              {!!(s.sports?.length) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {s.sports!.slice(0, 3).map((sp) => (
                    <span key={sp} className="text-xs bg-gray-100 text-gray-800 rounded px-2 py-1">
                      {sp}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}

          {filtered.length === 0 && <div className="text-gray-700">No schools match your search.</div>}
        </div>
      )}
    </div>
  );
}

