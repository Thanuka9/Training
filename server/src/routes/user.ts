import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import * as userController from "../controllers/userController.js";

const router = Router();

router.use(authenticate, requireRole("USER", "ADMIN"));

router.get("/dashboard", asyncHandler(userController.dashboard));
router.get("/lookups", asyncHandler(userController.lookups));
router.get("/training-programs", asyncHandler(userController.listPrograms));
router.get("/training-programs/:id", asyncHandler(userController.getProgram));
router.get("/participations", asyncHandler(userController.listMine));
router.post("/participations", asyncHandler(userController.createMine));
router.get("/participations/:id", asyncHandler(userController.getMine));
router.put("/participations/:id", asyncHandler(userController.updateMine));
router.post("/participations/:id/submit", asyncHandler(userController.submitMine));

export default router;
