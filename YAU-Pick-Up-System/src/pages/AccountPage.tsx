import { LogOut, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCoachAuth } from "../auth/CoachAuthContext";

export function AccountPage() {
  const nav = useNavigate();
  const { coachProfile, firebaseUser, logout } = useCoachAuth();

  return (
    <div className="glass rounded-2xl p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Account</h2>
          <p className="text-sm text-gray-600 mt-1">Coach access + session controls</p>
        </div>
        <div className="glass rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 text-gray-800">
            <UserRound className="h-5 w-5 text-primary-600" />
            <span className="text-sm font-semibold">Coach</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass rounded-xl p-4 space-y-2">
          <div className="text-sm text-gray-600">Signed in as</div>
          <div className="font-semibold text-gray-900">{coachProfile?.email ?? firebaseUser?.email ?? "—"}</div>
          {(coachProfile?.firstName || coachProfile?.lastName) && (
            <div className="text-sm text-gray-700">
              Name: {[coachProfile?.firstName, coachProfile?.lastName].filter(Boolean).join(" ")}
            </div>
          )}
          <div className="text-sm text-gray-700">
            Role: <span className="font-semibold">{coachProfile?.role ?? "—"}</span>
          </div>
          <div className="text-sm text-gray-700">
            Active: <span className="font-semibold">{coachProfile?.isActive === false ? "No" : "Yes"}</span>
          </div>
        </div>

        <div className="glass rounded-xl p-4 space-y-3">
          <div className="text-sm text-gray-600">Session</div>
          <button
            className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 rounded-xl px-4 py-3 inline-flex items-center justify-center gap-2"
            onClick={() => nav("/schools")}
            type="button"
          >
            Back to Schools
          </button>
          <button
            className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 py-3 inline-flex items-center justify-center gap-2"
            onClick={async () => {
              await logout();
              nav("/login");
            }}
            type="button"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}

