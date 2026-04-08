import { RefreshCw, UserRound } from "lucide-react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BrandMark } from "./BrandMark";
import { useCoachAuth } from "../auth/CoachAuthContext";
import { useRefresh } from "../contexts/RefreshContext";

function initialsFromProfile(input?: {
  firstName?: string;
  lastName?: string;
  email?: string;
}): string {
  const first = (input?.firstName ?? "").trim();
  const last = (input?.lastName ?? "").trim();
  if (first || last) {
    const a = first ? first[0] : "";
    const b = last ? last[0] : "";
    return (a + b).toUpperCase() || "C";
  }
  const email = (input?.email ?? "").trim();
  if (email) return email[0]!.toUpperCase();
  return "C";
}

export function AppShell() {
  const nav = useNavigate();
  const loc = useLocation();
  const { coachProfile, firebaseUser } = useCoachAuth();
  const { refreshSchools, refreshStudents } = useRefresh();

  const showTopNav = loc.pathname !== "/login" && loc.pathname !== "/enrollment";
  const initials = initialsFromProfile({
    firstName: coachProfile?.firstName,
    lastName: coachProfile?.lastName,
    email: coachProfile?.email ?? firebaseUser?.email ?? undefined
  });

  const handleRefreshClick = () => {
    if (loc.pathname === "/schools") {
      refreshSchools?.();
    } else if (loc.pathname.startsWith("/schools/")) {
      refreshStudents?.();
    }
  };

  return (
    <div className="gradient-bg">
      <div className="mx-auto max-w-5xl space-y-3 md:space-y-4">
        {showTopNav && (
          <header className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-white border-b border-gray-200 rounded-b-xl">
            <div className="mx-auto max-w-5xl flex items-center justify-between gap-2">
              <Link to="/schools">
                <BrandMark label="After school sign-out" />
              </Link>

              <div className="flex items-center gap-1">
                <button
                  className=" md:inline-flex h-6 w-6 items-center justify-center rounded-full bg-white hover:bg-gray-50"
                  onClick={handleRefreshClick}
                  type="button"
                  aria-label="Refresh"
                  title="Refresh"
                >
                  <RefreshCw className="h-4 w-4 text-primary-600" />
                </button>
                <button
                  className="bg-white hover:bg-gray-50 text-gray-900 rounded-full px-2 py-1 inline-flex items-center gap-1 border border-gray-200"
                  onClick={() => nav("/account")}
                  type="button"
                  title="Account"
                >
                  {/* Mobile: initials only */}
                  <span className="md:hidden inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-600 text-white text-xs font-bold">
                    {initials}
                  </span>

                  {/* Desktop: icon + label */}
                  <span className="hidden md:inline-flex items-center gap-1">
                    <UserRound className="h-3 w-3 text-primary-600" />
                    <span className="max-w-[8rem] truncate text-xs font-semibold">
                      {coachProfile?.email ?? firebaseUser?.email ?? "Account"}
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </header>
        )}

        <div className="">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

