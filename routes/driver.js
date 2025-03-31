
import express from "express";
import { signup, verifyEmail, login, getProfile, updateProfile, forgotPassword, changePassword, loadResetPasswordForm, resetPassword } from "../controllers/driverController.js";
import { auth } from "../middleware/driverMiddleware.js";
import { upload } from "../config/multer.js";

const router = express.Router();

router.post("/signup", upload, signup);
router.get("/verify/:token", verifyEmail);
router.post("/login", login);
router.get("/get-profile", auth, getProfile);
router.put("/update-profile", auth, upload, updateProfile);
router.put("/change-password", auth, changePassword);
router.post("/forgot-password", forgotPassword);
router.get("/reset-password/:token", loadResetPasswordForm)
router.post("/reset-password", resetPassword);
export default router;