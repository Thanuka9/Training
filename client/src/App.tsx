import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { GuestRoute, ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { AdminLayout, PublicLayout, UserLayout } from "@/layouts/AppLayouts";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { UserDashboardPage } from "@/pages/user/UserDashboardPage";
import { MyTrainingPage } from "@/pages/user/MyTrainingPage";
import { ParticipationFormPage } from "@/pages/user/ParticipationFormPage";
import { ProfilePage } from "@/pages/user/ProfilePage";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { AdminProgramsPage } from "@/pages/admin/AdminProgramsPage";
import { AdminRecordsPage } from "@/pages/admin/AdminRecordsPage";
import { AdminRecordDetailPage } from "@/pages/admin/AdminRecordDetailPage";
import { AdminMasterDataPage } from "@/pages/admin/AdminMasterDataPage";
import { AdminReportsPage } from "@/pages/admin/AdminReportsPage";
import { AdminAuditPage } from "@/pages/admin/AdminAuditPage";
import { AdminSettingsPage } from "@/pages/admin/AdminSettingsPage";
import { AdminOfficerDashboardPage } from "@/pages/admin/AdminOfficerDashboardPage";
import { AdminComparePage } from "@/pages/admin/AdminComparePage";
import { AdminMePage } from "@/pages/admin/AdminMePage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute roles={["USER"]} />}>
            <Route element={<UserLayout />}>
              <Route path="/app" element={<UserDashboardPage />} />
              <Route path="/app/training" element={<MyTrainingPage />} />
              <Route path="/app/training/new" element={<ParticipationFormPage />} />
              <Route path="/app/training/:id" element={<ParticipationFormPage />} />
              <Route path="/app/profile" element={<ProfilePage />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/me" element={<AdminMePage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/users/:id/dashboard" element={<AdminOfficerDashboardPage />} />
              <Route path="/admin/analytics/compare" element={<AdminComparePage />} />
              <Route path="/admin/training-programs" element={<AdminProgramsPage />} />
              <Route path="/admin/records" element={<AdminRecordsPage />} />
              <Route path="/admin/records/:id" element={<AdminRecordDetailPage />} />
              <Route path="/admin/master-data" element={<AdminMasterDataPage />} />
              <Route path="/admin/reports" element={<AdminReportsPage />} />
              <Route path="/admin/audit" element={<AdminAuditPage />} />
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
