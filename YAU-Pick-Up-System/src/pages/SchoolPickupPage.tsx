import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Filter, Phone, Search } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import type { PickupSchool, PickupSchoolSignout, PickupSchoolStudent, PickupStatusPayload } from "../types/pickup";
import { createSchoolSignout, getPickupStatus, listSchools } from "../services/pickupApi";
import { displayFromApiDate, todayApiYyyyMmDd } from "../utils/date";
import { useCoachAuth } from "../auth/CoachAuthContext";
import { useRefresh } from "../contexts/RefreshContext";

type IsActiveFilter = "active" | "inactive" | "all";

function toIsoDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIsoDateOnly(v: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const [y, m, d] = v.split("-").map((n) => Number(n));
  const dt = new Date(y, m - 1, d);
  // Guard against JS Date rollover (e.g. 2026-02-31)
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
}

function fullStudentName(s: PickupSchoolStudent) {
  const first = (s.studentFirstName ?? "").trim();
  const last = (s.studentLastName ?? "").trim();
  return `${first} ${last}`.trim() || s.id;
}

function fullParentName(s: PickupSchoolStudent) {
  const first = (s.parentFirstName ?? "").trim();
  const last = (s.parentLastName ?? "").trim();
  return `${first} ${last}`.trim();
}

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function signedOutTimeLabel(so?: PickupSchoolSignout) {
  const v = so?.signedOutAt;
  if (!v) return "";
  try {
    const d =
      typeof v === "number"
        ? new Date(v)
        : typeof v === "string"
          ? new Date(v)
          : typeof v === "object" && v && "seconds" in v
            ? new Date(
                ((v as any).seconds as number) * 1000 +
                  Math.floor(((v as any).nanoseconds as number | undefined) ?? 0 / 1_000_000)
              )
            : null;
    if (!d || Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch {
    return "";
  }
}

export function SchoolPickupPage() {
  const { schoolId } = useParams();
  const id = schoolId ?? "";
  const { coachProfile } = useCoachAuth();
  const { setRefreshStudents } = useRefresh();

  const todayApi = todayApiYyyyMmDd();

  const [schools, setSchools] = useState<PickupSchool[]>([]);
  const selectedSchoolId = id;

  // Row 1
  const [search, setSearch] = useState("");
  const [apiDate, setApiDate] = useState<string>(todayApi);
  const [signedOutOnly, setSignedOutOnly] = useState(false);

  // Row 2 (server-side)
  const [isActiveFilter, setIsActiveFilter] = useState<IsActiveFilter>("active");
  const [grade, setGrade] = useState<string>("");
  const [sport, setSport] = useState<string>("");

  const [showFilters, setShowFilters] = useState(false);
  const filtersSheetRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<PickupStatusPayload | null>(null);

  // signout modal
  const [modalStudent, setModalStudent] = useState<PickupSchoolStudent | null>(null);
  const [parentGuardianName, setParentGuardianName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signoutError, setSignoutError] = useState<string | null>(null);

  const displayDate = displayFromApiDate(apiDate);

  // When opening the mobile filters sheet:
  // - reset internal scroll so it starts at the top
  // - lock background scrolling so the underlying page doesn't shift
  useEffect(() => {
    if (!showFilters) return;

    // reset scroll position
    requestAnimationFrame(() => {
      if (filtersSheetRef.current) filtersSheetRef.current.scrollTop = 0;
    });

    // lock body scroll (mobile UX)
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [showFilters]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await listSchools(true);
      if (!alive) return;
      if (!res.ok) {
        setError(res.error ?? "Failed to load schools");
        return;
      }
      setSchools(res.data ?? []);
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const schoolName = useMemo(() => {
    return schools.find((s) => s.id === selectedSchoolId)?.name ?? "School Pickup";
  }, [schools, selectedSchoolId]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (search.trim().length > 0) n += 1;
    if (apiDate !== todayApi) n += 1;
    if (signedOutOnly) n += 1;
    if (isActiveFilter !== "active") n += 1;
    if (grade) n += 1;
    if (sport) n += 1;
    return n;
  }, [apiDate, grade, isActiveFilter, search, signedOutOnly, sport, todayApi]);

  const canClearFilters = activeFilterCount > 0;

  const fetchStatus = useCallback(async () => {
    if (!selectedSchoolId) return;
    setLoading(true);
    setError(null);

    const isActive = isActiveFilter === "all" ? undefined : isActiveFilter === "active" ? true : false;

    const res = await getPickupStatus({
      schoolId: selectedSchoolId,
      date: apiDate,
      isActive,
      grade: grade || undefined,
      sport: sport || undefined
    });

    setLoading(false);

    if (!res.ok) {
      setError(res.error ?? "Failed to load pickup status");
      setPayload(null);
      return;
    }

    setPayload(res.data);
  }, [selectedSchoolId, apiDate, isActiveFilter, grade, sport]);

  // Fetch ONLY on server-side changes (not on search keystrokes)
  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    setRefreshStudents(() => fetchStatus);
    return () => setRefreshStudents(null);
  }, [setRefreshStudents, fetchStatus]);

  const signoutsByStudentId = useMemo(() => {
    const m = new Map<string, PickupSchoolSignout>();
    for (const so of payload?.signouts ?? []) m.set(so.schoolStudentId, so);
    return m;
  }, [payload?.signouts]);

  const derivedGrades = useMemo(() => {
    const set = new Set<string>();
    for (const s of payload?.students ?? []) {
      const g = (s.grade ?? "").trim();
      if (g) set.add(g);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [payload?.students]);

  const derivedSports = useMemo(() => {
    const set = new Set<string>();
    for (const s of payload?.students ?? []) {
      for (const sp of s.sports ?? []) {
        const v = (sp ?? "").trim();
        if (v) set.add(v);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [payload?.students]);

  const filteredStudents = useMemo(() => {
    const q = normalize(search);
    const base = payload?.students ?? [];
    return base.filter((s) => {
      const so = signoutsByStudentId.get(s.id);
      const isSignedOut = !!so;
      if (signedOutOnly && !isSignedOut) return false;
      if (!q) return true;
      const hay = [fullStudentName(s), fullParentName(s), s.grade ?? "", ...(s.sports ?? [])].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [payload?.students, search, signoutsByStudentId, signedOutOnly]);

  const totals = payload?.totals ?? {
    students: payload?.students?.length ?? 0,
    signedOut: payload?.signouts?.length ?? 0
  };

  const openModal = (s: PickupSchoolStudent) => {
    setModalStudent(s);
    setParentGuardianName(fullParentName(s));
    setNotes("");
    setSignoutError(null);
  };

  const closeModal = () => {
    setModalStudent(null);
    setParentGuardianName("");
    setNotes("");
    setSignoutError(null);
    setSubmitting(false);
  };

  const existing = modalStudent ? signoutsByStudentId.get(modalStudent.id) : undefined;

  const FiltersPanel = (
    <div className="bg-white/70 border border-white/30 rounded-2xl p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-2 md:col-span-1">
          <label className="text-sm font-semibold text-gray-700">Search</label>
          <input
            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Student or parent name…"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Date</label>
          <DatePicker
            value={parseIsoDateOnly(apiDate)}
            onChange={(d) => {
              setApiDate(d ? toIsoDateOnly(d) : todayApi);
            }}
            format="MM/dd/yyyy"
            disableFuture
            slotProps={{
              textField: {
                fullWidth: true,
                size: "small",
                className: "w-full",
                sx: {
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "0.75rem",
                    fontSize: "0.875rem",
                  },
                },
              },
            }}
          />
        </div>
        <div className="flex items-end">
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 select-none">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={signedOutOnly}
              onChange={(e) => setSignedOutOnly(e.target.checked)}
            />
            Signed out only
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Student status</label>
          <select
            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={isActiveFilter}
            onChange={(e) => setIsActiveFilter(e.target.value as IsActiveFilter)}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Grade</label>
          <select
            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
          >
            <option value="">All</option>
            {derivedGrades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Sport</label>
          <select
            className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={sport}
            onChange={(e) => setSport(e.target.value)}
          >
            <option value="">All</option>
            {derivedSports.map((sp) => (
              <option key={sp} value={sp}>
                {sp}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end justify-start md:justify-end gap-2">
          <button
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 rounded-xl px-4 py-3 disabled:opacity-60"
            disabled={!canClearFilters}
            type="button"
            onClick={() => {
              setSearch("");
              setApiDate(todayApi);
              setSignedOutOnly(false);
              setIsActiveFilter("active");
              setGrade("");
              setSport("");
            }}
          >
            Clear{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Sticky header (no glass) */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        {/* Unified compact layout (mobile-first, scales up to tablet/desktop) */}
        <div className="p-4 md:p-5 space-y-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/schools"
                className="inline-flex items-center gap-2 text-primary-700"
                aria-label="All schools"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="text-lg md:text-xl font-bold text-gray-900 leading-tight">
                {schoolName}{" "}
                <span className="text-sm text-gray-600 font-semibold">
                  [{totals.students} / {totals.signedOut}]
                </span>
              </div>
            </div>
            <div className="pb-1">
              <DatePicker
                value={parseIsoDateOnly(apiDate)}
                onChange={(d) => {
                  setApiDate(d ? toIsoDateOnly(d) : todayApi);
                }}
                format="MM/dd/yyyy"
                disableFuture
                slotProps={{
                  textField: {
                    size: "small",
                    sx: {
                      width: "160px",
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "0.75rem",
                        fontSize: "0.875rem",
                        height: "44px",
                      },
                    },
                  },
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="relative flex-1 max-w-3xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                className="w-full h-11 pl-9 pr-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
              />
            </div>
            <div className="md:hidden">
              {/* <DatePicker
                value={parseIsoDateOnly(apiDate)}
                onChange={(d) => {
                  setApiDate(d ? toIsoDateOnly(d) : todayApi);
                }}
                format="MM/dd/yyyy"
                slotProps={{
                  textField: {
                    size: "small",
                    sx: {
                      width: "44px",
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "0.75rem",
                        fontSize: "0.875rem",
                        height: "44px",
                        padding: 0,
                        display: "flex",
                        justifyContent: "center",
                        ".MuiInputAdornment-root": {
                          margin: 0,
                        },
                        ".MuiSvgIcon-root": {
                          width: "0.9em",
                          height: "0.9em",
                        },
                      },
                      ".MuiOutlinedInput-input": {
                        padding: 0,
                        display: "none",
                      },
                    },
                  },
                }}
              /> */}
            </div>

            <button
              className="relative h-11 w-11 inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50"
              onClick={() => setShowFilters(true)}
              type="button"
              aria-label="Filters"
              title="Filters"
            >
              <Filter className="h-5 w-5 text-gray-800" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-primary-600 text-white text-xs grid place-items-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Filters are always opened via modal (same style on mobile/tablet/desktop) */}

      {/* Mobile filter sheet (anchored from header) */}
      {showFilters && (
        <div className="fixed inset-0 z-tooltip">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilters(false)} />
          <div
            ref={filtersSheetRef}
            className="absolute left-0 right-0 top-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center"
          >
            <div className="bg-white w-full h-full md:h-auto md:max-h-[85vh] md:max-w-2xl md:rounded-2xl md:border md:border-gray-200 overflow-auto overscroll-contain">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                <div className="font-bold text-gray-900">
                  Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                </div>
                <button
                  className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 rounded-xl px-3 py-2"
                  onClick={() => setShowFilters(false)}
                  type="button"
                >
                  Done
                </button>
              </div>
              <div className="p-4">{FiltersPanel}</div>
            </div>
          </div>
        </div>
      )}

      {/* Results: only this area scrolls */}
      <div className="px-1 md:px-5 pb-0">
        <div className="max-h-[calc(100dvh-12rem)] md:max-h-[calc(100dvh-12rem)] overflow-y-auto overscroll-contain pt-2">
        {loading && (
          <div className="space-y-3 mt-2">
            <div className="h-24 bg-gray-200 rounded-xl animate-pulse"></div>
            <div className="h-24 bg-gray-200 rounded-xl animate-pulse"></div>
            <div className="h-24 bg-gray-200 rounded-xl animate-pulse"></div>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-sm">{error}</div>
        )}

        {!loading && !error && (
          <>
            <div className="md:hidden space-y-3 mt-2">
              {filteredStudents.map((s) => {
                const so = signoutsByStudentId.get(s.id);
                const pickedUp = !!so;
                return (
                  <div key={s.id} className="shadow-md rounded-xl p-2">
                    <div className="flex items-start justify-between gap-0">
                      <div>
                        <div className="font-semibold text-gray-900 text-lg">{fullStudentName(s)}</div>
                        {fullParentName(s) && (
                          <div className="text-sm text-gray-600 mt-1 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span>Parent: {fullParentName(s)}</span>
                            </div>
                            {s.parentPhone && (
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <Phone className="w-3.5 h-3.5" />
                                <a 
                                  href={`tel:${s.parentPhone}`}
                                  className="hover:text-blue-600 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {s.parentPhone}
                                </a>
                              </div>
                            )}
                            {pickedUp && (
                              <div className="text-xs text-gray-700 mt-2 space-y-1">
                                <div>
                                  Parent/Guardian: <span className="font-semibold">{so?.parentGuardianName ?? "—"}</span>
                                </div>
                                <div className="text-gray-600">
                                  {signedOutTimeLabel(so) ? `${signedOutTimeLabel(so)} • ` : ""}
                                  {so?.signedOutBy ? `By ${so.signedOutBy}` : ""}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0">
                        {pickedUp ? (
                          <span className="bg-blue-100 text-blue-800 text-xs rounded px-2 py-1">Signed out</span>
                        ) : (
                          <div className="flex items-center justify-end">
                            <button
                              className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-2 py-1 text-sm disabled:opacity-60"
                              disabled={pickedUp}
                              onClick={() => openModal(s)}
                            >
                              Sign out
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredStudents.length === 0 && <div className="text-gray-700">No students found.</div>}
            </div>

            <div className="hidden md:block overflow-x-auto mt-2">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-600 py-3 pr-4">
                      Student
                    </th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-600 py-3 pr-4">
                      Status
                    </th>
                    <th className="text-right text-xs font-semibold uppercase tracking-wider text-gray-600 py-3">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((s) => {
                    const so = signoutsByStudentId.get(s.id);
                    const pickedUp = !!so;
                    return (
                      <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 pr-4">
                          <div className="font-semibold text-gray-900">{fullStudentName(s)}</div>
                          {fullParentName(s) && (
                            <div className="text-sm text-gray-600 mt-1 space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span>Parent: {fullParentName(s)}</span>
                              </div>
                              {s.parentPhone && (
                                <div className="flex items-center gap-1.5 text-gray-600">
                                  <Phone className="w-3.5 h-3.5" />
                                  <a 
                                    href={`tel:${s.parentPhone}`}
                                    className="hover:text-blue-600 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {s.parentPhone}
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          {pickedUp ? (
                            <span className="bg-blue-100 text-blue-800 text-xs rounded px-2 py-1">Signed out</span>
                          ) : (
                            <span className="bg-yellow-100 text-yellow-800 text-xs rounded px-2 py-1">Not signed out</span>
                          )}
                          {pickedUp && (
                            <div className="text-xs text-gray-700 mt-2 space-y-1">
                              <div>
                                Parent/Guardian: <span className="font-semibold">{so?.parentGuardianName ?? "—"}</span>
                              </div>
                              <div className="text-gray-600">
                                {signedOutTimeLabel(so) ? `${signedOutTimeLabel(so)} • ` : ""}
                                {so?.signedOutBy ? `By ${so.signedOutBy}` : ""}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-2 disabled:opacity-60"
                            disabled={pickedUp}
                            onClick={() => openModal(s)}
                          >
                            Sign out
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-6 text-gray-700">
                        No students found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
        </div>
      </div>

      {/* Signout modal */}
      {modalStudent && (
        <div className="fixed inset-0 z-modal flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-lg animate-in">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-bold text-gray-900">Sign out</div>
                <div className="text-gray-700 mt-1 font-semibold">{fullStudentName(modalStudent)}</div>
                <div className="text-sm text-gray-600 mt-1">Date: {displayDate}</div>
              </div>
              <button
                className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 rounded-xl px-3 py-2"
                onClick={closeModal}
              >
                Close
              </button>
            </div>

            {existing && (
              <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-3 text-sm">
                Already signed out for this date. Submission is disabled.
              </div>
            )}

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Parent / Guardian name</label>
                <input
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={parentGuardianName}
                  onChange={(e) => setParentGuardianName(e.target.value)}
                  placeholder="Type name…"
                  disabled={!!existing}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Notes (optional)</label>
                <input
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes…"
                  disabled={!!existing}
                />
              </div>

              {signoutError && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-sm">
                  {signoutError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 rounded-xl px-4 py-2"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:hover:bg-green-600 text-white rounded-xl px-4 py-2"
                  disabled={!!existing || submitting || parentGuardianName.trim().length === 0}
                  onClick={async () => {
                    if (!modalStudent) return;
                    if (existing) return;
                    if (parentGuardianName.trim().length === 0) return;

                    setSubmitting(true);
                    setSignoutError(null);

                    const res = await createSchoolSignout({
                      schoolId: selectedSchoolId,
                      schoolStudentId: modalStudent.id,
                      parentGuardianName: parentGuardianName.trim(),
                      notes: notes.trim().length ? notes.trim() : undefined,
                      date: apiDate,
                      signedOutBy: coachProfile?.email ?? undefined
                    });

                    setSubmitting(false);

                    if (!res.ok) {
                      setSignoutError(res.error ?? "Failed to sign out");
                      return;
                    }

                    closeModal();
                    void fetchStatus();
                  }}
                >
                  {submitting ? "Signing out…" : "Confirm sign-out"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </LocalizationProvider>
  );
}

