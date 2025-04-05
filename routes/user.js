import express from "express";
import { signup, verifyEmail, login, getProfile, updateProfile, forgotPassword, changePassword, loadResetPasswordForm, resetPassword, pickupAdress, dropAddress, getPackages, getPaymentMethode } from "../controllers/userController.js";
import { auth } from "../middleware/authMiddleware.js";
import { upload } from "../config/multer.js";
import { getAllPackages, getSinglePackage, sendPackage } from "../controllers/packageController.js";
import { addPickupAddress, getPickupAddresses } from "../controllers/pickupAddressController.js";
import { getDropupAddresses } from "../controllers/dropupAddressController.js";
import { getPaymentMethods } from "../controllers/paymentController.js";

const router = express.Router();

router.post("/signup", signup);
router.get("/verify/:token", verifyEmail);
router.post("/login", login);
router.get("/get-profile", auth, getProfile);
router.put("/update-profile", auth, upload, updateProfile);
router.put("/change-password", auth, changePassword);
router.post("/forgot-password", forgotPassword);
router.get("/reset-password/:token", loadResetPasswordForm)
router.post("/reset-password", resetPassword);

router.post("/send-package", auth, sendPackage);
router.get("/get-all-packages", auth, getAllPackages);
router.get("/get-packages-by-id/:package_id", getSinglePackage);
router.post("/add-pickup-address",auth,addPickupAddress);
router.get("/get-pickup-addresses", auth, getPickupAddresses);
router.get("/get-dropup-addresses", auth, getDropupAddresses);
router.get("/get-payment-methods", auth, getPaymentMethods);
export default router;