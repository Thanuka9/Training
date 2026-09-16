import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authenticate, requireRole, requireSuperAdmin } from "../middleware/auth.js";
import * as adminController from "../controllers/adminController.js";

const router = Router();

router.use(authenticate, requireRole("ADMIN"));

router.get("/lookups", asyncHandler(adminController.lookups));
router.get("/dashboard/summary", asyncHandler(adminController.dashboardSummary));
router.get("/dashboard/monthly", asyncHandler(adminController.dashboardMonthly));
router.get("/dashboard/distributions", asyncHandler(adminController.dashboardDistributions));
router.get("/dashboard/top-institutions", asyncHandler(adminController.dashboardTopInstitutions));
router.get("/dashboard/top-officers", asyncHandler(adminController.dashboardTopOfficers));
router.get("/dashboard/rankings", asyncHandler(adminController.dashboardRankings));
router.get("/dashboard/yearly", asyncHandler(adminController.dashboardYearly));
router.get("/dashboard/compare", asyncHandler(adminController.dashboardCompare));
router.get("/officers", asyncHandler(adminController.listOfficersSelect));

router.get("/admins", requireSuperAdmin, asyncHandler(adminController.listAdmins));
router.post("/admins", requireSuperAdmin, asyncHandler(adminController.createAdmin));

router.get("/users", asyncHandler(adminController.listUsers));
router.post("/users", asyncHandler(adminController.createUser));
router.get("/users/:id/dashboard", asyncHandler(adminController.officerDashboard));
router.get("/users/:id", asyncHandler(adminController.getUser));
router.patch("/users/:id", asyncHandler(adminController.updateUser));
router.post("/users/:id/approve", asyncHandler(adminController.approveUser));
router.post("/users/:id/reject", asyncHandler(adminController.rejectUser));
router.post("/users/:id/disable", asyncHandler(adminController.disableUser));
router.post("/users/:id/reactivate", asyncHandler(adminController.reactivateUser));

router.get("/training-programs", asyncHandler(adminController.listPrograms));
router.post("/training-programs", asyncHandler(adminController.createProgram));
router.get("/training-programs/:id", asyncHandler(adminController.getProgram));
router.put("/training-programs/:id", asyncHandler(adminController.updateProgram));
router.delete("/training-programs/:id", asyncHandler(adminController.archiveProgram));

router.get("/participations", asyncHandler(adminController.listParticipations));
router.get("/participations/:id", asyncHandler(adminController.getParticipation));
router.put("/participations/:id", asyncHandler(adminController.updateParticipation));
router.post("/participations/:id/approve", asyncHandler(adminController.approveParticipation));
router.post("/participations/:id/return", asyncHandler(adminController.returnParticipation));
router.post("/participations/:id/reject", asyncHandler(adminController.rejectParticipation));

router.get("/training-types", asyncHandler(adminController.listTrainingTypes));
router.post("/training-types", asyncHandler(adminController.createTrainingType));
router.put("/training-types/:id", asyncHandler(adminController.updateTrainingType));

router.get("/institutions", asyncHandler(adminController.listInstitutions));
router.post("/institutions", asyncHandler(adminController.createInstitution));
router.put("/institutions/:id", asyncHandler(adminController.updateInstitution));

router.get("/participation-roles", asyncHandler(adminController.listRoles));
router.post("/participation-roles", asyncHandler(adminController.createRole));
router.put("/participation-roles/:id", asyncHandler(adminController.updateRole));

router.get("/completion-statuses", asyncHandler(adminController.listCompletionStatuses));
router.post("/completion-statuses", asyncHandler(adminController.createCompletionStatus));
router.put("/completion-statuses/:id", asyncHandler(adminController.updateCompletionStatus));

router.get("/reports/training-register", asyncHandler(adminController.trainingRegister));
router.get("/reports/officer-summary", asyncHandler(adminController.officerSummary));
router.get("/reports/officer-activity", asyncHandler(adminController.officerActivity));
router.get("/reports/program-summary", asyncHandler(adminController.programSummary));
router.get("/reports/institution-summary", asyncHandler(adminController.institutionSummary));
router.get("/exports/:file", asyncHandler(adminController.exportReport));

router.get("/audit", asyncHandler(adminController.listAudit));
router.get("/settings", asyncHandler(adminController.getSettings));
router.put("/settings", asyncHandler(adminController.updateSettings));

export default router;
