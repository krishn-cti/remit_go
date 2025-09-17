
import express from "express";
import { signup, verifyEmail, login, getProfile, updateProfile, forgotPassword, changePassword, loadResetPasswordForm, resetPassword, changeDocumentRequest, deleteDriverAccount, updateToken, updateLocation, getDriverNotifications, acceptPackage, rejectPackage, completePackage, deleteSingleNotification, deleteAllNotification, getMyPackages } from "../controllers/driverController.js";
import { driverAuth } from "../middleware/driverMiddleware.js";
import { upload } from "../config/multer.js";

const router = express.Router();

router.post("/signup", upload, signup);
router.get("/verify/:token", verifyEmail);
router.post("/login", login);
router.get("/get-profile", driverAuth, getProfile);
router.put("/update-profile", driverAuth, upload, updateProfile);
router.put("/update-token", driverAuth, updateToken);
router.put("/update-location", driverAuth, updateLocation);
router.put("/change-password", driverAuth, changePassword);
router.post("/forgot-password", forgotPassword);
router.get("/reset-password/:token", loadResetPasswordForm)
router.post("/reset-password", resetPassword);
router.post("/change-document-request", driverAuth, changeDocumentRequest);
router.delete("/delete-driver-account", driverAuth, deleteDriverAccount);

router.get("/get-all-notifications", driverAuth, getDriverNotifications);
router.post("/accept-package", driverAuth, acceptPackage);
router.post("/reject-package", driverAuth, rejectPackage);
router.post("/complete-package", driverAuth, completePackage);
router.delete("/delete-single-notification", driverAuth, deleteSingleNotification);
router.delete("/delete-all-notifications", driverAuth, deleteAllNotification);

router.get("/get-my-packages", driverAuth, getMyPackages);
export default router;