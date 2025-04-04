
import express from "express";
import { signup, verifyEmail, login, getProfile, updateProfile, forgotPassword, changePassword, loadResetPasswordForm, resetPassword, changeDocumentRequest } from "../controllers/driverController.js";
import { driverAuth } from "../middleware/driverMiddleware.js";
import { upload } from "../config/multer.js";
import { handleValidationErrors, validateChangePassword, validateDriverChangeDocumentRequest, validateDriverSignup, validateDriverUpdateProfile, validateForgotPassword, validateLogin } from "../validation/drivervalidation.js";

const router = express.Router();

router.post("/signup",validateDriverSignup,handleValidationErrors, upload, signup);
router.get("/verify/:token", verifyEmail);
router.post("/login",validateLogin,handleValidationErrors, login);
router.get("/get-profile", driverAuth, getProfile);
router.put("/update-profile", driverAuth,validateDriverUpdateProfile ,handleValidationErrors,upload, updateProfile);
router.put("/change-password", driverAuth,validateChangePassword,handleValidationErrors, changePassword);
router.post("/forgot-password",validateForgotPassword,handleValidationErrors, forgotPassword);
router.get("/reset-password/:token", loadResetPasswordForm)
router.post("/reset-password", resetPassword);
router.post("/change-document-request", driverAuth,validateDriverChangeDocumentRequest,handleValidationErrors, changeDocumentRequest);
export default router;