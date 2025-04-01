
import express from "express";
import { signup, verifyEmail, login, getProfile, updateProfile, forgotPassword, changePassword, loadResetPasswordForm, resetPassword, changeDocumentRequest } from "../controllers/driverController.js";
import { driverAuth } from "../middleware/driverMiddleware.js";
import { upload } from "../config/multer.js";

const router = express.Router();

router.post("/signup", upload, signup);
router.get("/verify/:token", verifyEmail);
router.post("/login", login);
router.get("/get-profile", driverAuth, getProfile);
router.put("/update-profile", driverAuth, upload, updateProfile);
router.put("/change-password", driverAuth, changePassword);
router.post("/forgot-password", forgotPassword);
router.get("/reset-password/:token", loadResetPasswordForm)
router.post("/reset-password", resetPassword);
router.post("/change-document-request", driverAuth, changeDocumentRequest);
export default router;