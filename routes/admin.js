import express from "express";
import { login, getAdminProfile, forgotPassword, loadResetPasswordForm, resetPassword, updateProfile, changePassword } from "../controllers/adminController.js";
import { adminAuth } from "../middleware/adminMiddleware.js";
import { upload } from "../config/multer.js";

const router = express.Router();

router.post("/login", login);
router.get("/get-profile", adminAuth, getAdminProfile);
router.put("/update-profile", adminAuth, upload, updateProfile);
router.put("/change-password", adminAuth, changePassword);
router.get("/reset-password/:token", loadResetPasswordForm)
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;