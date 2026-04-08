import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { RequireAuth } from "./components/RequireAuth";
import { LoginPage } from "./pages/LoginPage";
import { SchoolsPickupPage } from "./pages/SchoolsPickupPage";
import { SchoolPickupPage } from "./pages/SchoolPickupPage";
import { useCoachAuth } from "./auth/CoachAuthContext";
import { useParams } from "react-router-dom";
import { AccountPage } from "./pages/AccountPage";
import { EnrollmentPage } from "./pages/EnrollmentPage";

function IndexRedirect() {
  const { coachProfile, loading } = useCoachAuth();
  if (loading) return null;
  const authed = !!coachProfile;
  return <Navigate to={authed ? "/schools" : "/login"} replace />;
}

function AdminSchoolPickupRedirect() {
  const { schoolId } = useParams();
  return <Navigate to={`/schools/${encodeURIComponent(schoolId ?? "")}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<IndexRedirect />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="enrollment" element={<EnrollmentPage />} />

        {/* Everything below requires login */}
        <Route element={<RequireAuth />}>
          <Route path="schools" element={<SchoolsPickupPage />} />
          <Route path="schools/:schoolId" element={<SchoolPickupPage />} />
          <Route path="account" element={<AccountPage />} />

          {/* Admin-route aliases (for parity with existing admin URLs) */}
          <Route path="admin/schools-pickup" element={<Navigate to="/schools" replace />} />
          <Route path="admin/schools-pickup/:schoolId" element={<AdminSchoolPickupRedirect />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

