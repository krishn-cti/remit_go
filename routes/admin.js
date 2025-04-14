import express from "express";
import {
    login, getAdminProfile, forgotPassword, loadResetPasswordForm, resetPassword, updateProfile,
    getUsers, changePassword, createNewUser, editUserProfile,
    getDrivers,
    createNewDriver,
    editDriverProfile,
    deleteDriverProfile,
    deleteUserProfile,
    getDashboard,
    changeUserStatus,
    changeDriverStatus,
    createNewPackage,
    editPackage,
    deletePackage
} from "../controllers/adminController.js";
import { adminAuth } from "../middleware/adminMiddleware.js";
import { upload } from "../config/multer.js";
import { getAllPackages } from "../controllers/packageController.js";

const router = express.Router();

router.post("/login", login);
router.get("/get-profile", adminAuth, getAdminProfile);
router.post("/update-profile", adminAuth, upload, updateProfile)
router.post("/change-password", adminAuth, changePassword);
router.get("/reset-password/:token", loadResetPasswordForm);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/get-dashboard", adminAuth, getDashboard);

// routes for package CRUD 
router.get("/get-packages", adminAuth, getAllPackages);
router.post("/create-package", adminAuth, upload, createNewPackage);
router.post("/update-package", adminAuth, upload, editPackage);
router.delete("/delete-package", adminAuth, deletePackage);

// routes for user CRUD 
router.get("/get-users", adminAuth, getUsers);
router.post("/create-user", adminAuth, upload, createNewUser);
router.post("/update-user", adminAuth, upload, editUserProfile);
router.delete("/delete-user", adminAuth, upload, deleteUserProfile);

// routes for driver CRUD
router.get("/get-drivers", adminAuth, getDrivers);
router.post("/create-driver", adminAuth, upload, createNewDriver);
router.post("/update-driver", adminAuth, upload, editDriverProfile);
router.delete("/delete-driver", adminAuth, upload, deleteDriverProfile);

router.post("/change-user-status", adminAuth, changeUserStatus);
router.post("/change-driver-status", adminAuth, changeDriverStatus);
export default router;