import { useEffect, useMemo, useRef, useState } from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import { User, School, Activity, HandHeart, FileCheck } from "lucide-react";
import yauLogo from "../assets/YAU Logo.png";

type YesNo = "Yes" | "No";

const GRADES = [
  "Kindergarten",
  "1st Grade",
  "2nd Grade",
  "3rd Grade",
  "4th Grade",
  "5th Grade",
  "6th Grade",
  "7th Grade",
  "8th Grade"
];

const AGES = Array.from({ length: 13 }, (_, i) => String(i + 4)); // typical K-8 range (4-16)

const SPORTS = ["Flag Football", "Cheer", "Soccer"] as const;

const VOLUNTEER_OPTIONS = [
  "Coach/Assistant Coach",
  "Referee",
  "Field Set Up/Clean Up",
  "Team Parent",
  "Team Mom/Dad - Administrator",
  "After School Practices",
  "Game Day Support",
  "Contribute Team Snacks",
  "I don't want to volunteer"
];

const COUNTRY_CODES = [
  { code: "+1", country: "United States", flag: "🇺🇸", maxDigits: 10 },
  { code: "+91", country: "India", flag: "🇮🇳", maxDigits: 10 },
  { code: "+44", country: "United Kingdom", flag: "🇬🇧", maxDigits: 10 },
  { code: "+61", country: "Australia", flag: "🇦🇺", maxDigits: 9 },
  { code: "+49", country: "Germany", flag: "🇩🇪", maxDigits: 10 },
  { code: "+33", country: "France", flag: "🇫🇷", maxDigits: 9 },
  { code: "+81", country: "Japan", flag: "🇯🇵", maxDigits: 10 },
  { code: "+86", country: "China", flag: "🇨🇳", maxDigits: 11 },
  { code: "+7", country: "Russia", flag: "🇷🇺", maxDigits: 10 },
  { code: "+55", country: "Brazil", flag: "🇧🇷", maxDigits: 11 },
  { code: "+27", country: "South Africa", flag: "🇿🇦", maxDigits: 9 },
  { code: "+52", country: "Mexico", flag: "🇲🇽", maxDigits: 10 },
  { code: "+39", country: "Italy", flag: "🇮🇹", maxDigits: 10 },
  { code: "+34", country: "Spain", flag: "🇪🇸", maxDigits: 9 },
  { code: "+31", country: "Netherlands", flag: "🇳🇱", maxDigits: 9 },
  { code: "+46", country: "Sweden", flag: "🇸🇪", maxDigits: 9 },
  { code: "+47", country: "Norway", flag: "🇳🇴", maxDigits: 8 },
  { code: "+45", country: "Denmark", flag: "🇩🇰", maxDigits: 8 },
  { code: "+41", country: "Switzerland", flag: "🇨🇭", maxDigits: 9 },
  { code: "+43", country: "Austria", flag: "🇦🇹", maxDigits: 10 }
];

type EnrollmentSubmitPayload = {
  parentFirstName: string;
  parentLastName: string;
  email: string;
  mobileNumber: string;
  receiveMessages?: boolean;
  students: Array<{
    firstName: string;
    lastName: string;
    schoolId: string;
    schoolAttendance: string;
    studentGrade: string;
    studentAge: string;
    studentDob: string; // YYYY-MM-DD
    sportSelections: string[];
    gameCommitment: YesNo;
  }>;
  volunteerInterest: string[];
  termsAccepted: boolean;
  electronicSignature: string;
  // UI removed; backend payload supports it, so we send true.
  humanVerified: true;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

type PickupSchoolLite = {
  id: string;
  name: string;
  isActive?: boolean;
  sports?: string[] | null;
};

function pickupApiBase(): string {
  // Prefer VITE_API_BASE_URL if configured (should include /apis)
  // Example: http://127.0.0.1:5001/yau-app/us-central1/apis
  return (
    (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ||
    "http://127.0.0.1:5001/yau-app/us-central1/apis"
  );
}

function schoolsUrl(q?: string): string {
  const qs = new URLSearchParams();
  qs.set("isActive", "true");
  if (q && q.trim().length > 0) qs.set("q", q.trim());
  return `${pickupApiBase()}/pickup/schools?${qs.toString()}`;
}

type StudentDraft = {
  id: string;
  firstName: string;
  lastName: string;
  schoolId: string;
  schoolAttendance: string;
  studentGrade: string;
  studentAge: string;
  studentDob: string; // YYYY-MM-DD
  sportSelections: string[];
  gameCommitment: YesNo | "";
};

function toIsoDateOnly(d: Date) {
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

function newStudent(idSeed: number): StudentDraft {
  return {
    id: `student_${idSeed}_${Math.random().toString(16).slice(2)}`,
    firstName: "",
    lastName: "",
    schoolId: "",
    schoolAttendance: "",
    studentGrade: "",
    studentAge: "",
    studentDob: "",
    sportSelections: [],
    gameCommitment: ""
  };
}

function enrollmentsSubmitUrl(): string {
  return `${pickupApiBase()}/pickup/enrollments/submit`;
}

const STEP_NAMES = [
  "Your Info",
  "School & Student Details",
  "Sports & Commitment",
  "Volunteer Interest",
  "Review & Submit"
];

const STEP_NAMES_SHORT = [
  "Your Info",
  "School Details",
  "Sports",
  "Volunteer",
  "Review"
];

const STEP_ICONS = [
  User,
  School,
  Activity,
  HandHeart,
  FileCheck
];

export function EnrollmentPage() {
  const stepsCount = 5;
  const [step, setStep] = useState(0);

  const [parentFirstName, setParentFirstName] = useState("");
  const [parentLastName, setParentLastName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [mobileNumber, setMobileNumber] = useState("");
  const [receiveMessages, setReceiveMessages] = useState(false);

  const [students, setStudents] = useState<StudentDraft[]>(() => [newStudent(0)]);
  const [schoolQueryByStudentId, setSchoolQueryByStudentId] = useState<Record<string, string>>({});

  const [schoolResultsByStudentId, setSchoolResultsByStudentId] = useState<Record<string, PickupSchoolLite[]>>({});
  const [schoolLoadingByStudentId, setSchoolLoadingByStudentId] = useState<Record<string, boolean>>({});
  const [schoolErrorByStudentId, setSchoolErrorByStudentId] = useState<Record<string, string | null>>({});
  const [schoolCacheByName, setSchoolCacheByName] = useState<Record<string, PickupSchoolLite>>({});
  const [allSchools, setAllSchools] = useState<PickupSchoolLite[]>([]);
  const [allSchoolsLoading, setAllSchoolsLoading] = useState(false);
  const [allSchoolsError, setAllSchoolsError] = useState<string | null>(null);

  const [volunteerInterest, setVolunteerInterest] = useState<string[]>([]);

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [electronicSignature, setElectronicSignature] = useState("");

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Track which fields have been touched/attempted for validation
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [attemptedNext, setAttemptedNext] = useState(false);

  const progress = Math.round(((step + 1) / stepsCount) * 100);

  const debounceTimersRef = useRef<Record<string, number>>({});
  const abortRef = useRef<Record<string, AbortController>>({});
  const prevQueryRef = useRef<Record<string, string>>({});

  // Track which steps are completed
  const stepCompleted = useMemo(() => {
    const completed = [false, false, false, false, false];
    if (parentFirstName.trim().length > 0 && parentLastName.trim().length > 0 && isEmail(email) && mobileNumber.trim().length > 0 && students.length > 0 && students.every((s) => s.firstName.trim().length > 0 && s.lastName.trim().length > 0)) {
      completed[0] = true;
    }
    if (students.every((s) => !!s.schoolId && !!s.schoolAttendance && !!s.studentGrade && !!s.studentAge && !!s.studentDob)) {
      completed[1] = true;
    }
    if (students.every((s) => s.sportSelections.length > 0 && !!s.gameCommitment)) {
      completed[2] = true;
    }
    if (volunteerInterest.length > 0) {
      completed[3] = true;
    }
    if (termsAccepted && electronicSignature.trim().length > 0) {
      completed[4] = true;
    }
    return completed;
  }, [parentFirstName, parentLastName, email, mobileNumber, students, volunteerInterest, termsAccepted, electronicSignature]);

  // Validation helpers
  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    return cleaned.length >= selectedCountry.maxDigits;
  };

  useEffect(() => {
    // Load ALL schools once so empty search can render everything.
    let alive = true;
    const ac = new AbortController();

    (async () => {
      setAllSchoolsLoading(true);
      setAllSchoolsError(null);
      try {
        const res = await fetch(schoolsUrl(), { method: "GET", signal: ac.signal });
        if (!res.ok) throw new Error(`Failed to load schools (${res.status})`);
        const json = (await res.json()) as { data?: PickupSchoolLite[] };
        const raw = Array.isArray(json?.data) ? json.data : [];

        const next = raw
          .filter((s) => s && typeof s.name === "string" && s.name.trim().length > 0)
          .filter((s) => s.isActive !== false)
          .map((s) => ({
            id: s.id,
            name: s.name,
            isActive: s.isActive,
            sports: s.sports ?? []
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        if (!alive) return;
        setAllSchools(next);
        setSchoolCacheByName((p) => {
          const merged = { ...p };
          for (const s of next) merged[s.name] = s;
          return merged;
        });
      } catch (e) {
        if (ac.signal.aborted) return;
        if (!alive) return;
        setAllSchoolsError(e instanceof Error ? e.message : "Failed to load schools");
      } finally {
        if (!ac.signal.aborted && alive) setAllSchoolsLoading(false);
      }
    })();

    return () => {
      alive = false;
      ac.abort();
    };
  }, []);

  useEffect(() => {
    // Debounced server-side search per student (q=...).
    for (const stu of students) {
      const id = stu.id;
      const q = (schoolQueryByStudentId[id] ?? "").trim();
      const prevQ = prevQueryRef.current[id] ?? "";
      // Always handle the empty-query case so we can show ALL schools.
      if (q === prevQ && q.length > 0) continue;
      prevQueryRef.current[id] = q;

      // Clear any pending timer and abort in-flight request for this student.
      const t = debounceTimersRef.current[id];
      if (t) window.clearTimeout(t);
      const acPrev = abortRef.current[id];
      if (acPrev) acPrev.abort();

      // If input is empty, render ALL schools.
      if (!q) {
        setSchoolLoadingByStudentId((p) => ({ ...p, [id]: allSchoolsLoading }));
        setSchoolErrorByStudentId((p) => ({ ...p, [id]: allSchoolsError }));
        if (!allSchoolsLoading && !allSchoolsError) {
          setSchoolResultsByStudentId((p) => ({ ...p, [id]: allSchools }));
        }
        continue;
      }

      setSchoolLoadingByStudentId((p) => ({ ...p, [id]: true }));
      setSchoolErrorByStudentId((p) => ({ ...p, [id]: null }));

      debounceTimersRef.current[id] = window.setTimeout(async () => {
        const ac = new AbortController();
        abortRef.current[id] = ac;
        try {
          const res = await fetch(schoolsUrl(q), { method: "GET", signal: ac.signal });
          if (!res.ok) throw new Error(`Failed to load schools (${res.status})`);
          const json = (await res.json()) as { data?: PickupSchoolLite[] };
          const raw = Array.isArray(json?.data) ? json.data : [];

          const next = raw
            .filter((s) => s && typeof s.name === "string" && s.name.trim().length > 0)
            .filter((s) => s.isActive !== false)
            .map((s) => ({
              id: s.id,
              name: s.name,
              isActive: s.isActive,
              sports: s.sports ?? []
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

          setSchoolResultsByStudentId((p) => ({ ...p, [id]: next }));
          setSchoolCacheByName((p) => {
            const merged = { ...p };
            for (const s of next) merged[s.name] = s;
            return merged;
          });
        } catch (e) {
          if (ac.signal.aborted) return;
          setSchoolErrorByStudentId((p) => ({
            ...p,
            [id]: e instanceof Error ? e.message : "Failed to load schools"
          }));
        } finally {
          if (!ac.signal.aborted) setSchoolLoadingByStudentId((p) => ({ ...p, [id]: false }));
        }
      }, 300);
    }

    // Cleanup for removed students: clear timers + abort fetches.
    const active = new Set(students.map((s) => s.id));
    for (const id of Object.keys(debounceTimersRef.current)) {
      if (!active.has(id)) {
        window.clearTimeout(debounceTimersRef.current[id]);
        delete debounceTimersRef.current[id];
      }
    }
    for (const id of Object.keys(abortRef.current)) {
      if (!active.has(id)) {
        abortRef.current[id].abort();
        delete abortRef.current[id];
      }
    }
    for (const id of Object.keys(prevQueryRef.current)) {
      if (!active.has(id)) delete prevQueryRef.current[id];
    }
  }, [allSchools, allSchoolsError, allSchoolsLoading, schoolQueryByStudentId, students]);

  const canGoNext = useMemo(() => {
    if (step === 0)
      return (
        parentFirstName.trim().length > 0 &&
        parentLastName.trim().length > 0 &&
        isEmail(email) &&
        mobileNumber.trim().length > 0 &&
        validatePhone(mobileNumber) &&
        students.length > 0 &&
        students.every((s) => s.firstName.trim().length > 0 && s.lastName.trim().length > 0)
      );
    if (step === 1)
      return students.every((s) => !!s.schoolId && !!s.schoolAttendance && !!s.studentGrade && !!s.studentAge && !!s.studentDob);
    if (step === 2) return students.every((s) => s.sportSelections.length > 0 && !!s.gameCommitment);
    if (step === 3) return volunteerInterest.length > 0;
    if (step === 4) return termsAccepted && electronicSignature.trim().length > 0;
    return false;
  }, [
    step,
    parentFirstName,
    parentLastName,
    email,
    mobileNumber,
    students,
    volunteerInterest,
    termsAccepted,
    electronicSignature
  ]);

  async function submit() {
    if (submitting) return;
    setSubmitError(null);
    setSubmitting(true);

    try {
      const fullPhoneNumber = `${selectedCountry.code}${mobileNumber.replace(/\D/g, "")}`;

      const payload: EnrollmentSubmitPayload = {
        parentFirstName: parentFirstName.trim(),
        parentLastName: parentLastName.trim(),
        email: email.trim(),
        mobileNumber: fullPhoneNumber,
        receiveMessages,
        students: students.map((s) => ({
          firstName: s.firstName.trim(),
          lastName: s.lastName.trim(),
          schoolId: s.schoolId,
          schoolAttendance: s.schoolAttendance,
          studentGrade: s.studentGrade,
          studentAge: s.studentAge,
          studentDob: s.studentDob,
          sportSelections: s.sportSelections,
          gameCommitment: s.gameCommitment as YesNo
        })),
        volunteerInterest,
        termsAccepted,
        electronicSignature: electronicSignature.trim(),
        humanVerified: true
      };

      const res = await fetch(enrollmentsSubmitUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = (await res.json().catch(() => undefined)) as any;
      if (!res.ok) {
        throw new Error(
          (typeof json === "string" ? json : json?.message ?? json?.error) || `Enrollment submit failed (${res.status})`
        );
      }

      // Send welcome SMS
      try {
        const { APIClient } = await import("../firebase/ApiClient");
        const csrfToken = await APIClient.getCSRFToken();
        await APIClient.sendWelcomeSMS(fullPhoneNumber, csrfToken, "pickup");
        console.log("✅ Welcome SMS sent successfully");
      } catch (smsError) {
        console.warn("⚠️ Failed to send welcome SMS:", smsError);
        // Don't fail the whole submission if SMS fails
      }

      setDone(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(to bottom, #3b82f6 0%, #60a5fa 30%, #93c5fd 60%, #dbeafe 85%, #ffffff 100%)"
        }}
      >
        <div className="min-h-[calc(100vh-3rem)] md:min-h-[calc(100vh-5rem)] px-4 py-10">
          <div className="max-w-xl mx-auto">
            <div className="glass rounded-2xl p-6 md:p-8 text-center">
              <div className="text-2xl font-bold text-gray-900">Thank You!</div>
              <p className="mt-2 text-gray-700 leading-relaxed">
                Your submission has been received. One of our staff members and/or a member from the school staff will be in
                touch with you via email and/or phone. Su envío ha sido recibido. Un miembro de nuestro personal y/o un miembro
                del personal de la escuela se pondrá en contacto con usted por correo electrónico y/o teléfono.
              </p>

              <div className="mt-6 flex items-center justify-center">
                <button
                  type="button"
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-3 font-semibold"
                  onClick={() => {
                    setDone(false);
                    setStep(0);
                    setSubmitError(null);
                    setSubmitting(false);

                    setParentFirstName("");
                    setParentLastName("");
                    setEmail("");
                    setSelectedCountry(COUNTRY_CODES[0]);
                    setMobileNumber("");
                    setReceiveMessages(false);
                    setStudents([newStudent(0)]);
                    setSchoolQueryByStudentId({});
                    setSchoolResultsByStudentId({});
                    setSchoolLoadingByStudentId({});
                    setSchoolErrorByStudentId({});
                    setVolunteerInterest([]);
                    setTermsAccepted(false);
                    setElectronicSignature("");
                  }}
                >
                  Go to Enrollment
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background: "linear-gradient( to bottom, #d9e4f5 0%, #f0f4f9 15%, #ffffff 40%)"
      }}
    >
      <div className="min-h-[calc(100vh-3rem)] md:min-h-[calc(100vh-5rem)] px-4 py-8 md:py-10">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Logo Section */}
          <div className="flex justify-center">
            <img
              src={yauLogo}
              alt="YAU TeamUp Logo"
              className="h-32 md:h-40 w-auto object-contain"
            />
          </div>

          {/* Header Text Section */}
          <div className="text-center space-y-3 md:space-y-4 px-4">
            {/* Main Heading */}
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 leading-tight">
              YAU TeamUp Afterschool Enrollment
            </h1>

            {/* Subheading */}
            <h2 className="text-lg md:text-xl lg:text-2xl font-semibold text-slate-700">
              Student Registration & Pickup Authorization
            </h2>

            {/* Requirement Statement */}
            <p className="text-sm md:text-base font-medium text-slate-600">
              Required for all students participating in YAU TeamUp Afterschool
              Programs
            </p>

            {/* Purpose Statement */}
            <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-xl mx-auto">
              This form helps us ensure safe dismissal, authorized pickup, and
              accurate rosters for your child
              <span className="inline-block mx-2 w-8 h-0.5 bg-red-500 align-middle"></span>
            </p>

            {/* Privacy Statement */}
            <p className="text-xs md:text-sm text-slate-500 italic">
              Your information is secure and will only be used for program
              operations.
            </p>
          </div>

          {/* Step Navigation */}
          <div className="border-t border-gray-200  ">
            <div className="  p-4 md:p-5 pb-4">
              {/* Desktop: Horizontal step indicators */}
              <div className="hidden md:flex items-center justify-center gap-3 mb-4 flex-wrap">
                {STEP_NAMES_SHORT.map((name, idx) => {
                  const IconComponent = STEP_ICONS[idx];
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        // Only allow navigation to completed steps or current step
                        if (
                          idx <= step ||
                          stepCompleted[idx - 1] ||
                          idx === 0
                        ) {
                          setStep(idx);
                        }
                      }}
                      disabled={
                        submitting ||
                        (idx > step && !stepCompleted[idx - 1] && idx > 0)
                      }
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${step === idx
                        ? "bg-blue-600 text-white shadow-lg scale-105"
                        : stepCompleted[idx]
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : idx < step
                            ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {stepCompleted[idx] && idx < step ? (
                        <svg
                          className="w-4 h-4 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <IconComponent className="w-4 h-4 flex-shrink-0" />
                      )}
                      <span>{name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Mobile: Compact step indicators */}
              <div className="md:hidden flex items-center justify-between mb-4 gap-1">
                {STEP_NAMES.map((name, idx) => {
                  const IconComponent = STEP_ICONS[idx];
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (
                          idx <= step ||
                          stepCompleted[idx - 1] ||
                          idx === 0
                        ) {
                          setStep(idx);
                        }
                      }}
                      disabled={
                        submitting ||
                        (idx > step && !stepCompleted[idx - 1] && idx > 0)
                      }
                      className={`flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs font-semibold transition-all ${step === idx
                        ? "bg-blue-600 text-white "
                        : stepCompleted[idx]
                          ? "bg-green-100 text-green-700"
                          : idx < step
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-400"
                        } disabled:opacity-50`}
                    >
                      {stepCompleted[idx] && idx < step ? (
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <IconComponent className="w-5 h-5" />
                      )}
                      <span className="text-[10px] leading-tight text-center line-clamp-2">
                        {name.split(" ")[0]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{ width: `${progress}%`, backgroundColor: "#ca2227" }}
                />
              </div>
            </div>

            <div className="  p-5 md:p-6 -mt-4  pt-6">
              {submitError && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-sm">
                  {submitError}
                </div>
              )}

              <div className="mt-6">
                {step === 0 && (
                  <div className="space-y-4">
                    <div className="text-sm text-gray-600 mb-4">
                      Please provide the information below. This will be used
                      for daily sign-out, emergency contact, and program
                      communication.
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">
                          Parent First Name{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          className={`w-full p-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-colors ${parentFirstName.trim().length > 0
                            ? "border-gray-200 focus:ring-blue-500"
                            : (touchedFields.has("parentFirstName") ||
                              attemptedNext) &&
                              parentFirstName.trim().length === 0
                              ? "border-red-300 focus:ring-red-500"
                              : "border-gray-200 focus:ring-blue-500"
                            }`}
                          value={parentFirstName}
                          onChange={(e) => {
                            setParentFirstName(e.target.value);
                            setTouchedFields((prev) =>
                              new Set(prev).add("parentFirstName"),
                            );
                          }}
                          onBlur={() =>
                            setTouchedFields((prev) =>
                              new Set(prev).add("parentFirstName"),
                            )
                          }
                          placeholder="First name"
                          autoComplete="given-name"
                        />
                        {(touchedFields.has("parentFirstName") ||
                          attemptedNext) &&
                          parentFirstName.trim().length === 0 && (
                            <div className="text-xs text-red-600 flex items-center gap-1">
                              <svg
                                className="w-3 h-3"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Required field
                            </div>
                          )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">
                          Parent Last Name{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          className={`w-full p-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-colors ${parentLastName.trim().length > 0
                            ? "border-gray-200 focus:ring-blue-500"
                            : (touchedFields.has("parentLastName") ||
                              attemptedNext) &&
                              parentLastName.trim().length === 0
                              ? "border-red-300 focus:ring-red-500"
                              : "border-gray-200 focus:ring-blue-500"
                            }`}
                          value={parentLastName}
                          onChange={(e) => {
                            setParentLastName(e.target.value);
                            setTouchedFields((prev) =>
                              new Set(prev).add("parentLastName"),
                            );
                          }}
                          onBlur={() =>
                            setTouchedFields((prev) =>
                              new Set(prev).add("parentLastName"),
                            )
                          }
                          placeholder="Last name"
                          autoComplete="family-name"
                        />
                        {(touchedFields.has("parentLastName") ||
                          attemptedNext) &&
                          parentLastName.trim().length === 0 && (
                            <div className="text-xs text-red-600 flex items-center gap-1">
                              <svg
                                className="w-3 h-3"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Required field
                            </div>
                          )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          className={`w-full p-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-colors ${email.trim().length > 0 && isEmail(email)
                            ? "border-gray-200 focus:ring-blue-500"
                            : (touchedFields.has("email") || attemptedNext) &&
                              (email.trim().length === 0 || !isEmail(email))
                              ? "border-red-300 focus:ring-red-500"
                              : "border-gray-200 focus:ring-blue-500"
                            }`}
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setTouchedFields((prev) =>
                              new Set(prev).add("email"),
                            );
                          }}
                          onBlur={() =>
                            setTouchedFields((prev) =>
                              new Set(prev).add("email"),
                            )
                          }
                          placeholder="email@domain.com"
                          autoComplete="email"
                          type="email"
                        />
                        {(touchedFields.has("email") || attemptedNext) &&
                          email.trim().length > 0 &&
                          !isEmail(email) && (
                            <div className="text-xs text-red-600 flex items-center gap-1">
                              <svg
                                className="w-3 h-3"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Please enter a valid email address
                            </div>
                          )}
                        {(touchedFields.has("email") || attemptedNext) &&
                          email.trim().length === 0 && (
                            <div className="text-xs text-red-600 flex items-center gap-1">
                              <svg
                                className="w-3 h-3"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Required field
                            </div>
                          )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700">
                          Mobile Number <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                          <select
                            className="p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[100px]"
                            value={selectedCountry.code}
                            onChange={(e) => {
                              const country = COUNTRY_CODES.find(
                                (c) => c.code === e.target.value,
                              );
                              if (country) setSelectedCountry(country);
                            }}
                          >
                            {COUNTRY_CODES.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.flag} {c.code}
                              </option>
                            ))}
                          </select>
                          <div className="flex-1 space-y-2">
                            <input
                              className={`w-full p-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-colors ${mobileNumber.trim().length > 0 &&
                                validatePhone(mobileNumber)
                                ? "border-gray-200 focus:ring-blue-500"
                                : (touchedFields.has("mobileNumber") ||
                                  attemptedNext) &&
                                  (mobileNumber.trim().length === 0 ||
                                    !validatePhone(mobileNumber))
                                  ? "border-red-300 focus:ring-red-500"
                                  : "border-gray-200 focus:ring-blue-500"
                                }`}
                              value={mobileNumber}
                              onChange={(e) => {
                                setMobileNumber(e.target.value);
                                setTouchedFields((prev) =>
                                  new Set(prev).add("mobileNumber"),
                                );
                              }}
                              onBlur={() =>
                                setTouchedFields((prev) =>
                                  new Set(prev).add("mobileNumber"),
                                )
                              }
                              placeholder={`e.g. ${selectedCountry.maxDigits === 10 ? "555-555-5555" : "12345678"}`}
                              autoComplete="tel"
                              inputMode="tel"
                            />
                          </div>
                        </div>
                        {(touchedFields.has("mobileNumber") || attemptedNext) &&
                          mobileNumber.trim().length > 0 &&
                          !validatePhone(mobileNumber) && (
                            <div className="text-xs text-red-600 flex items-center gap-1">
                              <svg
                                className="w-3 h-3"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Please enter a valid phone number (at least{" "}
                              {selectedCountry.maxDigits} digits)
                            </div>
                          )}
                        {(touchedFields.has("mobileNumber") || attemptedNext) &&
                          mobileNumber.trim().length === 0 && (
                            <div className="text-xs text-red-600 flex items-center gap-1">
                              <svg
                                className="w-3 h-3"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Required field
                            </div>
                          )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-gray-700">
                          Students
                        </div>
                        <button
                          type="button"
                          className="rounded-xl px-3 py-2 text-sm font-semibold border border-gray-200 bg-white hover:bg-gray-50"
                          onClick={() =>
                            setStudents((prev) => [
                              ...prev,
                              newStudent(prev.length),
                            ])
                          }
                        >
                          Add student
                        </button>
                      </div>

                      <div className="space-y-3">
                        {students.map((s, idx) => (
                          <div
                            key={s.id}
                            className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-bold text-gray-900">
                                Student {idx + 1}
                              </div>
                              <button
                                type="button"
                                className="text-sm font-semibold text-red-700 hover:text-red-800 disabled:opacity-60"
                                disabled={students.length === 1}
                                onClick={() =>
                                  setStudents((prev) =>
                                    prev.filter((x) => x.id !== s.id),
                                  )
                                }
                              >
                                Remove
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">
                                  Student First Name{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <input
                                  className={`w-full p-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-colors ${s.firstName.trim().length > 0
                                    ? "border-gray-200 focus:ring-blue-500"
                                    : (touchedFields.has(
                                      `student-${s.id}-firstName`,
                                    ) ||
                                      attemptedNext) &&
                                      s.firstName.trim().length === 0
                                      ? "border-red-300 focus:ring-red-500"
                                      : "border-gray-200 focus:ring-blue-500"
                                    }`}
                                  value={s.firstName}
                                  onChange={(e) => {
                                    setStudents((prev) =>
                                      prev.map((x) =>
                                        x.id === s.id
                                          ? { ...x, firstName: e.target.value }
                                          : x,
                                      ),
                                    );
                                    setTouchedFields((prev) =>
                                      new Set(prev).add(
                                        `student-${s.id}-firstName`,
                                      ),
                                    );
                                  }}
                                  onBlur={() =>
                                    setTouchedFields((prev) =>
                                      new Set(prev).add(
                                        `student-${s.id}-firstName`,
                                      ),
                                    )
                                  }
                                  placeholder="First name"
                                />
                                {(touchedFields.has(
                                  `student-${s.id}-firstName`,
                                ) ||
                                  attemptedNext) &&
                                  s.firstName.trim().length === 0 && (
                                    <div className="text-xs text-red-600 flex items-center gap-1">
                                      <svg
                                        className="w-3 h-3"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      Required field
                                    </div>
                                  )}
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">
                                  Student Last Name{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <input
                                  className={`w-full p-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-colors ${s.lastName.trim().length > 0
                                    ? "border-gray-200 focus:ring-blue-500"
                                    : (touchedFields.has(
                                      `student-${s.id}-lastName`,
                                    ) ||
                                      attemptedNext) &&
                                      s.lastName.trim().length === 0
                                      ? "border-red-300 focus:ring-red-500"
                                      : "border-gray-200 focus:ring-blue-500"
                                    }`}
                                  value={s.lastName}
                                  onChange={(e) => {
                                    setStudents((prev) =>
                                      prev.map((x) =>
                                        x.id === s.id
                                          ? { ...x, lastName: e.target.value }
                                          : x,
                                      ),
                                    );
                                    setTouchedFields((prev) =>
                                      new Set(prev).add(
                                        `student-${s.id}-lastName`,
                                      ),
                                    );
                                  }}
                                  onBlur={() =>
                                    setTouchedFields((prev) =>
                                      new Set(prev).add(
                                        `student-${s.id}-lastName`,
                                      ),
                                    )
                                  }
                                  placeholder="Last name"
                                />
                                {(touchedFields.has(
                                  `student-${s.id}-lastName`,
                                ) ||
                                  attemptedNext) &&
                                  s.lastName.trim().length === 0 && (
                                    <div className="text-xs text-red-600 flex items-center gap-1">
                                      <svg
                                        className="w-3 h-3"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      Required field
                                    </div>
                                  )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-4">
                    <div className="text-lg font-bold text-gray-900">
                      School + Student Details
                    </div>

                    <div className="space-y-4">
                      {students.map((stu, idx) => {
                        const schoolQuery =
                          schoolQueryByStudentId[stu.id] ?? "";
                        const loading = !!schoolLoadingByStudentId[stu.id];
                        const error = schoolErrorByStudentId[stu.id] ?? null;
                        const results = schoolResultsByStudentId[stu.id] ?? [];

                        const selectedSchool = (() => {
                          if (stu.schoolId) {
                            return (
                              results.find((r) => r.id === stu.schoolId) ??
                              allSchools.find((s) => s.id === stu.schoolId) ??
                              null
                            );
                          }
                          if (stu.schoolAttendance)
                            return (
                              schoolCacheByName[stu.schoolAttendance] ?? null
                            );
                          return null;
                        })();

                        const options =
                          selectedSchool &&
                            !results.some((r) => r.id === selectedSchool.id)
                            ? [selectedSchool, ...results]
                            : results;
                        return (
                          <div
                            key={stu.id}
                            className="rounded-2xl border border-gray-200 bg-white p-4 space-y-4"
                          >
                            <div className="font-bold text-gray-900">
                              Student {idx + 1}: {stu.firstName || "First"}{" "}
                              {stu.lastName || "Last"}
                            </div>

                            <div className="space-y-2">
                              <label className="text-sm font-semibold text-gray-700">
                                School <span className="text-red-500">*</span>
                              </label>
                              <Autocomplete
                                options={options}
                                value={selectedSchool}
                                getOptionLabel={(o) => o.name}
                                isOptionEqualToValue={(opt, val) =>
                                  opt.id === val.id
                                }
                                onChange={(_, newValue) => {
                                  setStudents((prev) =>
                                    prev.map((x) =>
                                      x.id === stu.id
                                        ? (() => {
                                          const nextSchoolId =
                                            newValue?.id ?? "";
                                          const nextSchool =
                                            newValue?.name ?? "";
                                          const allowedSports =
                                            (nextSchool &&
                                              schoolCacheByName[
                                                nextSchool
                                              ]?.sports?.filter(Boolean)) ||
                                            [];
                                          const available =
                                            allowedSports.length > 0
                                              ? allowedSports
                                              : [...SPORTS];
                                          return {
                                            ...x,
                                            schoolId: nextSchoolId,
                                            schoolAttendance: nextSchool,
                                            sportSelections:
                                              x.sportSelections.filter((s) =>
                                                available.includes(s),
                                              ),
                                          };
                                        })()
                                        : x,
                                    ),
                                  );
                                  setTouchedFields((prev) =>
                                    new Set(prev).add(
                                      `student-${stu.id}-school`,
                                    ),
                                  );
                                }}
                                onBlur={() =>
                                  setTouchedFields((prev) =>
                                    new Set(prev).add(
                                      `student-${stu.id}-school`,
                                    ),
                                  )
                                }
                                inputValue={schoolQuery}
                                onInputChange={(_, newInputValue) =>
                                  setSchoolQueryByStudentId((prev) => ({
                                    ...prev,
                                    [stu.id]: newInputValue,
                                  }))
                                }
                                openOnFocus={false}
                                fullWidth
                                loading={loading}
                                noOptionsText={
                                  schoolQuery.trim().length
                                    ? "No schools found"
                                    : "No schools available"
                                }
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    label="Search schools"
                                    placeholder="Type to search…"
                                    error={
                                      !stu.schoolId &&
                                      schoolQuery.trim().length === 0 &&
                                      step === 1
                                    }
                                    slotProps={{
                                      input: {
                                        ...(params as any).InputProps,
                                        type: "search",
                                      },
                                    }}
                                  />
                                )}
                              />
                              {loading && (
                                <div className="text-xs text-gray-600 flex items-center gap-1">
                                  <svg
                                    className="animate-spin h-3 w-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                    ></circle>
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                  </svg>
                                  Loading schools…
                                </div>
                              )}
                              {error && (
                                <div className="text-xs text-red-600 flex items-center gap-1">
                                  <svg
                                    className="w-3 h-3"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  {error}
                                </div>
                              )}
                              {(touchedFields.has(`student-${stu.id}-school`) ||
                                attemptedNext) &&
                                !stu.schoolId &&
                                schoolQuery.trim().length === 0 &&
                                step === 1 && (
                                  <div className="text-xs text-red-600 flex items-center gap-1">
                                    <svg
                                      className="w-3 h-3"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                    Please select a school
                                  </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">
                                  Current Grade{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <select
                                  className={`w-full p-3 border-2 rounded-xl focus:outline-none focus:ring-2 bg-white transition-colors ${stu.studentGrade
                                    ? "border-gray-200 focus:ring-blue-500"
                                    : (touchedFields.has(
                                      `student-${stu.id}-grade`,
                                    ) ||
                                      attemptedNext) &&
                                      step === 1 &&
                                      !stu.studentGrade
                                      ? "border-red-300 focus:ring-red-500"
                                      : "border-gray-200 focus:ring-blue-500"
                                    }`}
                                  value={stu.studentGrade}
                                  onChange={(e) => {
                                    setStudents((prev) =>
                                      prev.map((x) =>
                                        x.id === stu.id
                                          ? {
                                            ...x,
                                            studentGrade: e.target.value,
                                          }
                                          : x,
                                      ),
                                    );
                                    setTouchedFields((prev) =>
                                      new Set(prev).add(
                                        `student-${stu.id}-grade`,
                                      ),
                                    );
                                  }}
                                  onBlur={() =>
                                    setTouchedFields((prev) =>
                                      new Set(prev).add(
                                        `student-${stu.id}-grade`,
                                      ),
                                    )
                                  }
                                >
                                  <option value="">Select…</option>
                                  {GRADES.map((g) => (
                                    <option key={g} value={g}>
                                      {g}
                                    </option>
                                  ))}
                                </select>
                                {(touchedFields.has(
                                  `student-${stu.id}-grade`,
                                ) ||
                                  attemptedNext) &&
                                  step === 1 &&
                                  !stu.studentGrade && (
                                    <div className="text-xs text-red-600 flex items-center gap-1">
                                      <svg
                                        className="w-3 h-3"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      Required field
                                    </div>
                                  )}
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">
                                  Current Age{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <select
                                  className={`w-full p-3 border-2 rounded-xl focus:outline-none focus:ring-2 bg-white transition-colors ${stu.studentAge
                                    ? "border-gray-200 focus:ring-blue-500"
                                    : (touchedFields.has(
                                      `student-${stu.id}-age`,
                                    ) ||
                                      attemptedNext) &&
                                      step === 1 &&
                                      !stu.studentAge
                                      ? "border-red-300 focus:ring-red-500"
                                      : "border-gray-200 focus:ring-blue-500"
                                    }`}
                                  value={stu.studentAge}
                                  onChange={(e) => {
                                    setStudents((prev) =>
                                      prev.map((x) =>
                                        x.id === stu.id
                                          ? { ...x, studentAge: e.target.value }
                                          : x,
                                      ),
                                    );
                                    setTouchedFields((prev) =>
                                      new Set(prev).add(
                                        `student-${stu.id}-age`,
                                      ),
                                    );
                                  }}
                                  onBlur={() =>
                                    setTouchedFields((prev) =>
                                      new Set(prev).add(
                                        `student-${stu.id}-age`,
                                      ),
                                    )
                                  }
                                >
                                  <option value="">Select…</option>
                                  {AGES.map((a) => (
                                    <option key={a} value={a}>
                                      {a}
                                    </option>
                                  ))}
                                </select>
                                {(touchedFields.has(`student-${stu.id}-age`) ||
                                  attemptedNext) &&
                                  step === 1 &&
                                  !stu.studentAge && (
                                    <div className="text-xs text-red-600 flex items-center gap-1">
                                      <svg
                                        className="w-3 h-3"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      Required field
                                    </div>
                                  )}
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">
                                  Date of Birth{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <LocalizationProvider
                                  dateAdapter={AdapterDateFns}
                                >
                                  <DatePicker
                                    value={parseIsoDateOnly(stu.studentDob)}
                                    onChange={(d) => {
                                      setStudents((prev) =>
                                        prev.map((x) =>
                                          x.id === stu.id
                                            ? {
                                              ...x,
                                              studentDob: d
                                                ? toIsoDateOnly(d)
                                                : "",
                                            }
                                            : x,
                                        ),
                                      );
                                      setTouchedFields((prev) =>
                                        new Set(prev).add(
                                          `student-${stu.id}-dob`,
                                        ),
                                      );
                                    }}
                                    format="MM/dd/yyyy"
                                    slotProps={{
                                      textField: {
                                        fullWidth: true,
                                        size: "medium",
                                        placeholder: "MM/DD/YYYY",
                                        error:
                                          (touchedFields.has(
                                            `student-${stu.id}-dob`,
                                          ) ||
                                            attemptedNext) &&
                                          step === 1 &&
                                          !stu.studentDob,
                                        onBlur: () =>
                                          setTouchedFields((prev) =>
                                            new Set(prev).add(
                                              `student-${stu.id}-dob`,
                                            ),
                                          ),
                                      },
                                    }}
                                  />
                                </LocalizationProvider>
                                {(touchedFields.has(`student-${stu.id}-dob`) ||
                                  attemptedNext) &&
                                  step === 1 &&
                                  !stu.studentDob && (
                                    <div className="text-xs text-red-600 flex items-center gap-1">
                                      <svg
                                        className="w-3 h-3"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      Required field
                                    </div>
                                  )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-5">
                    <div className="text-lg font-bold text-gray-900">
                      Sports + Commitment
                    </div>

                    <div className="space-y-4">
                      {students.map((stu, idx) => (
                        <div
                          key={stu.id}
                          className="rounded-2xl border border-gray-200 bg-white p-4 space-y-5"
                        >
                          <div className="font-bold text-gray-900">
                            Student {idx + 1}: {stu.firstName || "First"}{" "}
                            {stu.lastName || "Last"}
                          </div>

                          <div className="space-y-2">
                            <div className="text-sm font-semibold text-gray-700">
                              Sport Selection
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {SPORTS.map((sport) => {
                                const checked =
                                  stu.sportSelections.includes(sport);
                                return (
                                  <button
                                    key={sport}
                                    type="button"
                                    className={[
                                      "rounded-xl border-2 p-4 text-left",
                                      checked
                                        ? "border-blue-600 bg-blue-50"
                                        : "border-gray-200 bg-white hover:bg-gray-50",
                                    ].join(" ")}
                                    onClick={() =>
                                      setStudents((prev) =>
                                        prev.map((x) => {
                                          if (x.id !== stu.id) return x;
                                          const has =
                                            x.sportSelections.includes(sport);
                                          return {
                                            ...x,
                                            sportSelections: has
                                              ? x.sportSelections.filter(
                                                (s) => s !== sport,
                                              )
                                              : [...x.sportSelections, sport],
                                          };
                                        }),
                                      )
                                    }
                                  >
                                    <div className="font-bold text-gray-900">
                                      {sport}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                            <div className="text-xs text-gray-600">
                              Select one or more sports.
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="text-sm font-bold text-red-700">
                              <div>
                                Games will be held on weekends and some games on
                                weekdays.
                              </div>
                              <div>
                                Can you commit to bringing your students to the
                                games on time ?
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {(["Yes", "No"] as const).map((v) => (
                                <button
                                  key={v}
                                  type="button"
                                  className={[
                                    "rounded-xl border-2 p-4 text-left",
                                    stu.gameCommitment === v
                                      ? "border-blue-600 bg-blue-50"
                                      : "border-gray-200 bg-white hover:bg-gray-50",
                                  ].join(" ")}
                                  onClick={() =>
                                    setStudents((prev) =>
                                      prev.map((x) =>
                                        x.id === stu.id
                                          ? { ...x, gameCommitment: v }
                                          : x,
                                      ),
                                    )
                                  }
                                >
                                  <div className="font-bold text-gray-900">
                                    {v}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <div className="text-lg font-bold text-gray-900">
                      Parent Volunteers
                    </div>
                    <p className="text-gray-700">
                      Parent volunteers are essential for supporting the school
                      and team. Select one or more ways you’d like to help.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {VOLUNTEER_OPTIONS.map((opt) => {
                        const checked = volunteerInterest.includes(opt);
                        return (
                          <button
                            key={opt}
                            type="button"
                            className={[
                              "rounded-xl border-2 p-4 text-left",
                              checked
                                ? "border-blue-600 bg-blue-50"
                                : "border-gray-200 bg-white hover:bg-gray-50",
                            ].join(" ")}
                            onClick={() =>
                              setVolunteerInterest((prev) =>
                                prev.includes(opt)
                                  ? prev.filter((x) => x !== opt)
                                  : [...prev, opt],
                              )
                            }
                          >
                            <div className="font-bold text-gray-900">{opt}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-6">
                    <div className="text-lg font-bold text-gray-900">
                      Review & Submit
                    </div>

                    {/* Review Summary */}
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <svg
                            className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <div className="text-sm text-blue-800">
                            <p className="font-semibold mb-1">
                              Please review your information before submitting
                            </p>
                            <p>
                              Make sure all details are correct. You can go back
                              to any step to make changes.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Parent Information */}
                      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                          <svg
                            className="w-5 h-5 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                          Parent/Guardian Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-600">Name:</span>
                            <span className="ml-2 font-semibold text-gray-900">
                              {parentFirstName} {parentLastName}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Email:</span>
                            <span className="ml-2 font-semibold text-gray-900">
                              {email}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Phone:</span>
                            <span className="ml-2 font-semibold text-gray-900">
                              {mobileNumber
                                ? `${selectedCountry.code} ${mobileNumber}`
                                : "Not provided"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Students Information */}
                      <div className="space-y-3">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                          <svg
                            className="w-5 h-5 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                          </svg>
                          Students ({students.length})
                        </h3>
                        {students.map((stu, idx) => {
                          const school =
                            allSchools.find((s) => s.id === stu.schoolId) ||
                            schoolCacheByName[stu.schoolAttendance];
                          return (
                            <div
                              key={stu.id}
                              className="rounded-xl border border-gray-200 bg-white p-4 space-y-3"
                            >
                              <div className="font-semibold text-gray-900">
                                Student {idx + 1}: {stu.firstName}{" "}
                                {stu.lastName}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div>
                                  <span className="text-gray-600">School:</span>
                                  <span className="ml-2 font-semibold text-gray-900">
                                    {school?.name ||
                                      stu.schoolAttendance ||
                                      "Not selected"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Grade:</span>
                                  <span className="ml-2 font-semibold text-gray-900">
                                    {stu.studentGrade || "Not selected"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Age:</span>
                                  <span className="ml-2 font-semibold text-gray-900">
                                    {stu.studentAge || "Not selected"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">
                                    Date of Birth:
                                  </span>
                                  <span className="ml-2 font-semibold text-gray-900">
                                    {stu.studentDob
                                      ? new Date(
                                        stu.studentDob,
                                      ).toLocaleDateString()
                                      : "Not provided"}
                                  </span>
                                </div>
                                <div className="md:col-span-2">
                                  <span className="text-gray-600">Sports:</span>
                                  <span className="ml-2 font-semibold text-gray-900">
                                    {stu.sportSelections.length > 0
                                      ? stu.sportSelections.join(", ")
                                      : "None selected"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">
                                    Game Commitment:
                                  </span>
                                  <span className="ml-2 font-semibold text-gray-900">
                                    {stu.gameCommitment || "Not answered"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Volunteer Information */}
                      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                          <svg
                            className="w-5 h-5 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                          Volunteer Interest
                        </h3>
                        <div className="text-sm">
                          {volunteerInterest.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {volunteerInterest.map((opt) => (
                                <span
                                  key={opt}
                                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold"
                                >
                                  {opt}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-500">
                              No volunteer options selected
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Terms and Signature */}
                    <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 space-y-4">
                      <div className="text-center font-bold text-gray-900">
                        Terms and Conditions*
                      </div>

                      <label
                        className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${termsAccepted
                          ? "bg-green-50 border border-green-200"
                          : "bg-red-50 border border-red-200"
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-gray-900 font-semibold">
                          By clicking the submit button, I agree to terms &amp;
                          conditions.*REQUIRED
                        </span>
                      </label>
                      {!termsAccepted && (
                        <div className="text-xs text-red-600 flex items-center gap-1">
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                          You must accept the terms and conditions to submit
                        </div>
                      )}

                      <div className="space-y-3 leading-relaxed text-xs max-h-48 overflow-y-auto">
                        <p>
                          By allowing my student to partcipate in the YAU TeamUP
                          After School Program operated by Youth Athlete
                          University, Inc., I understand that participation in
                          athletic and recreational activities carries some risk
                          of injury. I agree to release and hold harmless Youth
                          Athlete University, Inc., its staff, volunteers, and
                          affiliates from any liability or claims related to my
                          student's participation. I am responsible for my
                          student's medical coverage and authorize emergency
                          care if needed. I also give permission for my
                          student's image and likeness to be used in photos,
                          videos, or other media for YAU TeamUP program
                          activities and related organizational purposes only.
                        </p>
                        <p>
                          Al permitir que mi estudiante participe en el Programa
                          Después de la Escuela YAU TeamUP operado por Youth
                          Athlete University, Inc., entiendo que la
                          participación en actividades atléticas y recreativas
                          conlleva cierto riesgo de lesión. Acepto liberar y
                          eximir de toda responsabilidad a Youth Athlete
                          University, Inc., su personal, voluntarios y afiliados
                          de cualquier reclamo o demanda relacionada con la
                          participación de mi estudiante. Soy responsable de la
                          cobertura médica de mi estudiante y autorizo la
                          atención médica de emergencia si fuera necesaria.
                          Asimismo, doy permiso para que la imagen y semejanza
                          de mi estudiante se utilicen en fotografías, videos u
                          otros medios únicamente para actividades del programa
                          YAU TeamUP y con fines relacionados con la
                          organización.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">
                        Electronic Signature{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        className={`w-full p-3 border-2 rounded-xl focus:outline-none focus:ring-2 transition-colors ${electronicSignature.trim().length > 0
                          ? "border-gray-200 focus:ring-blue-500"
                          : (touchedFields.has("electronicSignature") ||
                            attemptedNext) &&
                            electronicSignature.trim().length === 0
                            ? "border-red-300 focus:ring-red-500"
                            : "border-gray-200 focus:ring-blue-500"
                          }`}
                        value={electronicSignature}
                        onChange={(e) => {
                          setElectronicSignature(e.target.value);
                          setTouchedFields((prev) =>
                            new Set(prev).add("electronicSignature"),
                          );
                        }}
                        onBlur={() =>
                          setTouchedFields((prev) =>
                            new Set(prev).add("electronicSignature"),
                          )
                        }
                        placeholder="Type your full name"
                      />
                      <div className="text-xs text-gray-600">
                        Your typed name acts as your electronic signature.
                      </div>
                      {(touchedFields.has("electronicSignature") ||
                        attemptedNext) &&
                        electronicSignature.trim().length === 0 && (
                          <div className="text-xs text-red-600 flex items-center gap-1">
                            <svg
                              className="w-3 h-3"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Required field
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </div>

              {/* Text Message Consent Checkbox - Only show on Step 1 (Your Info) */}
              {step === 0 && (
                <div className="bg-transparent mt-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={receiveMessages}
                      onChange={(e) => setReceiveMessages(e.target.checked)}
                      className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500 rounded-full"
                    />
                    <span className="text-sm text-gray-800">
                      <span className="font-semibold font-sm text-gray-800">
                        Receive Text Messages & Emails
                      </span>
                      <br />
                      <div className="text-[13px] text-gray-600 mt-1 leading-relaxed">
                        By checking this box, you agree to receive SMS messages from Youth Athlete University regarding schedules, updates, and notifications.
                        <br /><br />
                        Message and data rates may apply. Message frequency varies.
                        <br /><br />
                        Reply STOP to opt out, HELP for help.
                        <br /><br />
                        <a href="https://youthathleteuniversity.org/privacyterms/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>Privacy Policy</a> <span className="text-black">|</span> <a href="https://youthathleteuniversity.org/terms/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>Terms</a>
                      </div>
                    </span>
                  </label>
                </div>
              )}

              <div className="mt-8 flex items-center justify-between gap-3">
                <button
                  type="button"
                  className="rounded-xl px-4 py-3 font-semibold border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-60"
                  onClick={() =>
                    setStep((s) => clamp(s - 1, 0, stepsCount - 1))
                  }
                  disabled={step === 0 || submitting}
                >
                  Back
                </button>

                {step < stepsCount - 1 ? (
                  <button
                    type="button"
                    className="rounded-xl px-5 py-3 font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60 disabled:hover:bg-blue-600"
                    onClick={() => {
                      if (canGoNext) {
                        setStep((s) => clamp(s + 1, 0, stepsCount - 1));
                        setAttemptedNext(false);
                        setTouchedFields(new Set()); // Reset touched fields for next step
                      } else {
                        setAttemptedNext(true);
                      }
                    }}
                    disabled={!canGoNext || submitting}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    className="rounded-xl px-5 py-3 font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60 disabled:hover:bg-blue-600"
                    onClick={submit}
                    disabled={!canGoNext || submitting}
                  >
                    {submitting ? "Submitting…" : "Submit"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
