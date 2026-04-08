import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useCoachAuth } from "../auth/CoachAuthContext";

export function RequireAuth() {
  const loc = useLocation();
  const { coachProfile, loading } = useCoachAuth();

  if (loading) return null;

  if (!coachProfile) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  return <Outlet />;
}

