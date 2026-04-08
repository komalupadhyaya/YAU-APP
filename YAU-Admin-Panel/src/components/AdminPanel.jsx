import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import Sidebar from './layout/Sidebar';
import Dashboard from './sections/Dashboard';
import Parents from './sections/Parents';
import Coaches from './sections/Coaches';
import Rosters from './sections/Rosters';
import Messages from './sections/Messages';
import { Locations } from './sections/Locations';
import { Events } from './sections/Events';
import GameSchedule from './sections/GameSchedule';
import CommunityManagement from './sections/community/Community';
import CommunityFeed from './sections/community/CommunityFeed';
import Members from './sections/Members';
import AdminManagement from './sections/AdminManagement';
import IDManagement from './sections/IDManagement';
import Resource from './sections/Resource';
import UniformManagement from './sections/UniformManagement';
import OrganizationManagement from './sections/OrganizationManagement';
import MatchCreation from './sections/community/MatchCreation';
import Timesheet from './sections/Timesheet';
import AdminTimesheetDashboard from './sections/AdminTimesheetDashboard';
import CoachTimesheetsPage from './sections/CoachTimesheetsPage';
import PickupAdminSchools from './sections/PickupAdminSchools';
import PickupAdminSchoolDetail from './sections/PickupAdminSchoolDetail';
import PickupAdminEnrollments from './sections/PickupAdminEnrollments';
import PickupAdminEnrollmentDetail from './sections/PickupAdminEnrollmentDetail';
import CoachAssignments from './sections/CoachAssignments';

const PickupAdminSchoolDetailRedirect = () => {
  const { schoolId } = useParams();
  return <Navigate to={`/admin/schools-pickup/${schoolId}`} replace />;
};

const AdminPanel = () => {
  const location = useLocation();

  // Extract current section from URL
  const getCurrentSection = () => {
    const path = location.pathname.split('/')[2]; // Get section after /admin/
    return path || 'dashboard';
  };

  const activeSection = getCurrentSection();

  return (
    <div className="gradient-bg h-screen overflow-hidden">
      <div className="flex h-full">
        {/* Fixed Sidebar */}
        <Sidebar activeSection={activeSection} />

        {/* Main Content Area - Only this scrolls */}
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 lg:p-8">
              <Routes>
                <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/timeSheet" element={<AdminTimesheetDashboard/>} />
                <Route path="/coach-timesheets/:coachId" element={<CoachTimesheetsPage />} />
                <Route path="/admin-management" element={<AdminManagement />} />
                <Route path="/parents" element={<Parents />} />
                <Route path="/members" element={<Members />} />
                <Route path="/id-management" element={<IDManagement/>} />
                <Route path="/resources" element={<Resource/>} />
                <Route path="/uniform-management" element={<UniformManagement/>} />
                <Route path="/schools-pickup" element={<PickupAdminSchools/>} />
                <Route path="/schools-pickup/enrollments" element={<PickupAdminEnrollments/>} />
                <Route path="/schools-pickup/enrollments/:enrollmentId" element={<PickupAdminEnrollmentDetail/>} />
                <Route path="/schools-pickup/:schoolId" element={<PickupAdminSchoolDetail/>} />
                {/* Backwards-compatible redirects */}
                <Route path="/pickup-admin/schools" element={<Navigate to="/admin/schools-pickup" replace />} />
                <Route path="/pickup-admin/schools/:schoolId" element={<PickupAdminSchoolDetailRedirect />} />
                <Route path="/coaches" element={<Coaches />} />
                <Route path="/rosters" element={<Rosters />} />
                <Route path="/coach-assignments" element={<CoachAssignments />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/locations" element={<Locations />} />
                <Route path="/events" element={<Events />} />
                <Route path="/schedule" element={<GameSchedule />} />
                {/* Backwards-compatible redirect (temporary alias) */}
                <Route path="/team-management" element={<Navigate to="/admin/schedule" replace />} />
                <Route path="/community" element={<CommunityManagement />} />
                <Route path="/community-feed" element={<CommunityFeed />} />
                <Route path="/community-feed" element={<CommunityFeed />} />
                <Route path="/external_schedules" element={<OrganizationManagement />} />
                <Route path="/match" element={<MatchCreation/>} />
                <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
              </Routes>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;