import express from "express";
import {
    login, getAdminProfile, forgotPassword, loadResetPasswordForm, resetPassword, updateProfile,
    getUsers, changePassword, createNewUser, editUserProfile
} from "../controllers/adminController.js";
import { adminAuth } from "../middleware/adminMiddleware.js";
import { upload } from "../config/multer.js";
import { getAllPackages } from "../controllers/packageController.js";

const router = express.Router();

router.post("/login", login);
router.get("/get-profile", adminAuth, getAdminProfile);
router.post("/update-profile", adminAuth, upload, updateProfile);
router.post("/change-password", adminAuth, changePassword);
router.get("/reset-password/:token", loadResetPasswordForm)
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/get-users", adminAuth, getUsers);
router.post("/create-user", adminAuth, upload, createNewUser);
router.post("/update-user", adminAuth, upload, editUserProfile);

router.get("/get-all-packages", adminAuth, getAllPackages);

export default router;