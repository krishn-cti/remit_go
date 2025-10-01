import express from "express";
import { signup, verifyEmail, login, getProfile, updateProfile, forgotPassword, changePassword, loadResetPasswordForm, resetPassword, deleteUserAccount, createUserReport, getUserReports, updateToken, getUserNotifications, deleteSingleNotification, deleteAllNotification, googleLoginUser } from "../controllers/userController.js";
import { auth } from "../middleware/authMiddleware.js";
import { upload } from "../config/multer.js";
import { getAllPackages, getMyPackageDetails, getMyPackages, sendPackage } from "../controllers/packageController.js";
import { getPickupAddresses, createPickupAddress, updatePickupAddress, deletePickupAddress } from "../controllers/pickupAddressController.js";
import { createDropupAddress, deleteDropupAddress, getDropupAddresses, updateDropupAddress } from "../controllers/dropupAddressController.js";
import { createPayment, getCards, getPaymentMethods, paymentHistory, saveCard, updateDefaultCard } from "../controllers/paymentController.js";

const router = express.Router();

router.post("/google-login", googleLoginUser);
router.post("/signup", signup);
router.get("/verify/:token", verifyEmail);
router.post("/login", login);
router.get("/get-profile", auth, getProfile);
router.put("/update-profile", auth, upload, updateProfile);
router.put("/update-token", auth, updateToken);
router.put("/change-password", auth, changePassword);
router.post("/forgot-password", forgotPassword);
router.get("/reset-password/:token", loadResetPasswordForm)
router.post("/reset-password", resetPassword);

router.get("/get-packages", auth, getAllPackages);
router.post("/send-package", auth, sendPackage);
router.get("/get-my-packages", auth, getMyPackages);
router.get("/get-my-package-details/:id", auth, getMyPackageDetails);

router.get("/get-pickup-addresses", auth, getPickupAddresses);
router.post("/create-pickup-address", auth, createPickupAddress);
router.put("/update-pickup-address", auth, updatePickupAddress);
router.delete("/delete-pickup-address", auth, deletePickupAddress);

router.get("/get-dropup-addresses", auth, getDropupAddresses);
router.post("/create-dropup-address", auth, createDropupAddress);
router.put("/update-dropup-address", auth, updateDropupAddress);
router.delete("/delete-dropup-address", auth, deleteDropupAddress);

router.get("/get-payment-methods", auth, getPaymentMethods);
router.delete("/delete-user-account", auth, deleteUserAccount);

router.post("/create-user-report", auth, upload, createUserReport);
router.get("/get-user-reports", auth, getUserReports);

router.get("/get-all-notifications", auth, getUserNotifications);
router.delete("/delete-single-notification", auth, deleteSingleNotification);
router.delete("/delete-all-notifications", auth, deleteAllNotification);

// router.post("/save-card", auth, saveCard);
// router.get("/get-all-payments", auth, getAllPayments);
// router.post("/save-card", saveCard);
// router.get("/get-cards/:userId", getCards);
// router.post("/set-default-card", updateDefaultCard);
router.post("/create-payment", auth, createPayment);
router.get("/payment-history/:userId", auth, paymentHistory);
export default router;