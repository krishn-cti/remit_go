import argon2 from 'argon2';
import fs from 'fs';
import os from 'os';
import path from 'path';
import nodemailer from "nodemailer";
import { fileURLToPath } from "url";
import jwt from 'jsonwebtoken';
import admin from "../config/firebase.js";
import dotenv from 'dotenv';
import { sendDriverVerificationEmail } from "../config/mailer.js";
import { generateToken } from "../utils/driverAuth.js";
import Msg from "../utils/message.js"

import {
    findDriverByEmail,
    createDriver,
    findDriverByActToken,
    verifyDriverEmail,
    getDriverById,
    updateDriverProfile,
    fetchDriverPassword,
    updatePassword,
    createChangeRequest,
    findDriverByUuid,
    deleteDriver,
    driverNotifications,
    getDriversByCoordinates,
    updateNotificationDetails,
    updateDriverLogin
} from "../models/driverModel.js";
import { findUserByEmail, getUserById } from '../models/userModel.js';
import { findAdminByEmail } from '../models/adminModel.js';
import { deleteAllDriverNotification, deleteNotification, findOrderByPackageNo, getDriversPackages, getUsersPackages, saveNotification, updatePackageDetails } from '../models/packageModel.js';
import { createNotificationMessage, NotificationTypes, sendNotification } from '../utils/helper.js';
import { getUserPickupAddressById } from '../models/pickupAddressModel.js';

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

dotenv.config();
const __dirname = path.resolve();

const getLocalIp = () => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
            if (net.family === "IPv4" && !net.internal) {
                return net.address;
            }
        }
    }
    return "localhost";
};

let localIp = getLocalIp();
let baseUrl = `http://${localIp}:${process.env.PORT}`;

const generateUniqueId = async () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let id;
    let isUnique = false;

    while (!isUnique) {
        id = Array.from({ length: 10 }, () => characters[Math.floor(Math.random() * characters.length)]).join("");

        // Check if ID already exists in the database
        const existingDriver = await findDriverByUuid(id);
        if (!existingDriver) {
            isUnique = true;
        }
    }

    return id;
};

export const googleLoginDriver = async (req, res) => {
    try {
        const { idToken, email, socialId, userName, fcmToken } = req.body;

        if (!idToken) {
            return res.status(400).json({ success: false, message: "Firebase ID token is required" });
        }

        // Verify Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        if (decodedToken.uid !== socialId) {
            return res.status(401).json({ success: false, message: "Token mismatch" });
        }

        // ✅ Check if user already registered as another role
        const existingUser = await findUserByEmail(email);
        const existingAdmin = await findAdminByEmail(email);

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "You are already registered as a user.",
            });
        }

        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                message: "You are already registered as an admin.",
            });
        }

        // Check if driver exists
        let driver = await findDriverByEmail(email);

        if (!driver) {
            // Create new driver record
            const newDriver = {
                driver_uuid: await generateUniqueId(),
                name: userName,
                email,
                social_id: socialId,
                social_provider: "google",
                fcm_token: fcmToken,
                login_type: "social",
                email_verified_at: new Date()
            };

            const response = await createDriver(newDriver);

            if (response.insertId) {
                newDriver.id = response.insertId; // attach new ID
            }

            driver = newDriver;
        } else {
            // Update FCM token on login
            await updateDriverLogin(email, { fcm_token: fcmToken, login_type: "social" });
        }

        // Generate JWT token
        const token = jwt.sign(
            { email: driver.email, id: driver.id },
            process.env.DRIVER_JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            success: true,
            message: "Google login successful",
            token,
            driver,
        });
    } catch (err) {
        console.error("Google Login (Driver) Error:", err);
        res.status(500).json({ success: false, message: "Google login failed" });
    }
};

// Signup API
export const signup = async (req, res) => {
    const { name, email, password, phone_number, country_code, dl_number, rc_number } = req.body;

    try {
        const existingDriver = await findDriverByEmail(email);
        const existingUser = await findUserByEmail(email);
        const existingAdmin = await findAdminByEmail(email);

        if (existingDriver || existingUser || existingAdmin) {
            return res.status(400).json({ success: false, message: Msg.EMAIL_ALREADY_REGISTERED });
        }

        const hashedPassword = await argon2.hash(password);
        const token = jwt.sign({ email }, process.env.DRIVER_JWT_SECRET, { expiresIn: "1h" });

        // Access files correctly using req.files
        const dlImage = req.files?.dl_image ? req.files.dl_image[0].filename : "";
        const rcImage = req.files?.rc_image ? req.files.rc_image[0].filename : "";

        await sendDriverVerificationEmail(req, email, token);

        const driverData = {
            driver_uuid: await generateUniqueId(), // Ensures unique 10-character ID
            name,
            email,
            country_code,
            phone_number,
            dl_number,
            rc_number,
            dl_image: dlImage,
            rc_image: rcImage,
            password: hashedPassword,
            show_password: password,
            act_token: token,
        };

        const response = await createDriver(driverData);

        if (response.affectedRows > 0) {
            res.status(201).json({
                success: true,
                message: `${Msg.SIGNUP_SUCCESSFULL} (${email}) to verify your account.`,
            });
        } else {
            res.status(500).json({ success: false, message: Msg.SIGNUP_FAILED });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Verify Driver
export const verifyEmail = async (req, res) => {
    const { token } = req.params;

    try {
        const driver = await findDriverByActToken(token);

        if (driver?.act_token != token) {
            return res.sendFile(path.join(__dirname, "views", "notverify.html"));
        }

        const data = {
            act_token: null,
            email_verified_at: new Date(),
            id: driver.id,
        };

        const result = await verifyDriverEmail(
            data?.act_token,
            data?.email_verified_at,
            data?.id
        );

        if (result.affectedRows > 0) {
            return res.sendFile(path.join(__dirname, "views", "verify.html"));
        } else {
            return res.sendFile(path.join(__dirname, "views", "notverify.html"));
        }
    } catch (error) {
        res.status(500).json({ success: false, message: Msg.INTERNAL_SERVER_ERROR, error: error.message });
    }
};

// Login API
export const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const driver = await findDriverByEmail(email);
        if (!driver) return res.status(400).json({ success: false, message: Msg.USER_NOT_FOUND });

        if (!driver.email_verified_at) return res.status(403).json({ success: false, message: Msg.VERIFY_EMAIL_FIRST });

        const isMatch = await argon2.verify(driver.password, password);
        if (!isMatch) return res.status(400).json({ success: false, message: Msg.INVALID_CREDENTIALS });

        const token = generateToken(driver);
        const { show_password, ...other } = driver

        res.json({
            success: true,
            message: Msg.LOGIN_SUCCESSFULL,
            token,
            user: {
                ...other,
                profile_image: other.profile_image ? `${baseUrl}/uploads/profile_images/${other.profile_image}` : null,
                dl_image: other.dl_image ? `${baseUrl}/uploads/dl_images/${other.dl_image}` : null,
                rc_image: other.rc_image ? `${baseUrl}/uploads/rc_images/${other.rc_image}` : null
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get Profile API
export const getProfile = async (req, res) => {

    try {
        const driver = await getDriverById(req.user.id);
        if (!driver) {
            return res.status(404).json({ success: false, message: Msg.USER_NOT_FOUND });
        }
        const { show_password, ...other } = driver

        res.json({
            success: true,
            user: {
                ...other,
                profile_image: other.profile_image ? `${baseUrl}/uploads/profile_images/${other.profile_image}` : null,
                dl_image: other.dl_image ? `${baseUrl}/uploads/dl_images/${other.dl_image}` : null,
                rc_image: other.rc_image ? `${baseUrl}/uploads/rc_images/${other.rc_image}` : null
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Update Profile API
export const updateProfile = async (req, res) => {
    const { name, phone_number, dl_number, rc_number, country_code } = req.body;
    const driverId = req.user.id;

    try {
        const driver = await getDriverById(driverId);
        if (!driver) {
            return res.status(404).json({ success: false, message: Msg.USER_NOT_FOUND });
        }

        let updateData = {
            name: name || driver.name,
            country_code: country_code || driver.country_code,
            phone_number: phone_number || driver.phone_number,
            dl_number: dl_number || driver.dl_number,
            rc_number: rc_number || driver.rc_number,
            profile_image: driver.profile_image,
            dl_image: driver.dl_image,
            rc_image: driver.rc_image,
        };

        // Handling profile_image upload
        if (req.files?.profile_image) {
            const newProfileImagePath = `${req.files.profile_image[0].filename}`;
            if (driver.profile_image) {
                const oldProfileImagePath = path.join("public", driver.profile_image);
                if (fs.existsSync(oldProfileImagePath)) {
                    fs.unlinkSync(oldProfileImagePath);
                }
            }
            updateData.profile_image = newProfileImagePath;
        }

        // Handling dl_image upload
        if (req.files?.dl_image) {
            const newDlImagePath = `${req.files.dl_image[0].filename}`;
            if (driver.dl_image) {
                const oldDlImagePath = path.join("public", driver.dl_image);
                if (fs.existsSync(oldDlImagePath)) {
                    fs.unlinkSync(oldDlImagePath);
                }
            }
            updateData.dl_image = newDlImagePath;
        }

        // Handling rc_image upload
        if (req.files?.rc_image) {
            const newRcImagePath = `${req.files.rc_image[0].filename}`;
            if (driver.rc_image) {
                const oldRcImagePath = path.join("public", driver.rc_image);
                if (fs.existsSync(oldRcImagePath)) {
                    fs.unlinkSync(oldRcImagePath);
                }
            }
            updateData.rc_image = newRcImagePath;
        }

        const response = await updateDriverProfile(driverId, updateData);

        if (response.affectedRows > 0) {
            return res.status(200).json({
                success: true,
                message: Msg.PROFILE_UPDATED,
            });
        } else {
            return res.status(400).json({ success: false, message: Msg.NO_PROFILE_CHANGES });
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}

// Update Token API
export const updateToken = async (req, res) => {
    const { fcm_token } = req.body;
    const driverId = req.user.id;

    try {
        const driver = await getDriverById(driverId);
        if (!driver) {
            return res.status(404).json({ success: false, message: Msg.DRIVER_NOT_FOUND });
        }

        let updateData = {
            fcm_token: fcm_token || driver.fcm_token
        };

        const response = await updateDriverProfile(driverId, updateData);

        if (response.affectedRows > 0) {
            return res.status(200).json({
                success: true,
                message: Msg.TOKEN_UPDATED,
            });
        } else {
            return res.status(400).json({ success: false, message: Msg.SOMETHING_WENT_WRONG });
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// Update driver location
export const updateLocation = async (req, res) => {
    const { latitude, longitude } = req.body;
    const driverId = req.user.id;

    try {
        const driver = await getDriverById(driverId);
        if (!driver) {
            return res.status(404).json({ success: false, message: Msg.DRIVER_NOT_FOUND });
        }

        let updateData = {
            latitude: latitude || driver.latitude,
            longitude: longitude || driver.longitude,
        };

        const response = await updateDriverProfile(driverId, updateData);

        if (response.affectedRows > 0) {
            return res.status(200).json({
                success: true,
                message: Msg.LOCATION_UPDATED,
            });
        } else {
            return res.status(400).json({ success: false, message: Msg.SOMETHING_WENT_WRONG });
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

// Change Password API
export const changePassword = async (req, res) => {
    try {
        const { old_password, new_password } = req.body;
        const driverId = req.user.id;

        if (!old_password || !new_password) {
            return res.status(400).json({
                success: false,
                message: Msg.PASSWORD_REQUIRED,
            });
        }

        const driver = await fetchDriverPassword(driverId);
        if (!driver || !driver.password) {
            return res.status(404).json({
                success: false,
                message: Msg.USER_NOT_FOUND,
            });
        }

        const isMatch = await argon2.verify(driver.password, old_password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: Msg.INCORRECT_OLD_PASSWORD });
        }

        const hashedNewPassword = await argon2.hash(new_password);

        const response = await updatePassword(hashedNewPassword, new_password, driverId);

        if (response?.affectedRows > 0) {
            return res.json({
                success: true,
                message: Msg.PASSWORD_CHANGED,
            });
        } else {
            return res.status(500).json({
                success: false,
                message: Msg.PASSWORD_CHANGE_FAILED,
            });
        }
    } catch (error) {
        console.error("Error changing password:", error);
        res.status(500).json({ success: false, message: Msg.INTERNAL_SERVER_ERROR });
    }
};

// Forgot Password API
export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const driver = await findDriverByEmail(email);
        if (!driver) return res.status(404).json({ message: Msg.USER_NOT_FOUND });

        const resetToken = jwt.sign({ id: driver.id }, process.env.DRIVER_JWT_SECRET);
        const resetLink = `${baseUrl}/api/driver/reset-password/${resetToken}`;

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
            },
        });

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        const templatePath = path.join(__dirname, "../views/forget-password.ejs");
        let emailHtml = fs.readFileSync(templatePath, "utf8");
        emailHtml = emailHtml.replace("<%= resetLink %>", resetLink);

        await transporter.sendMail({
            from: '"No Reply" <no-reply@gmail.com>',
            to: driver.email,
            subject: "Password Reset Request",
            html: emailHtml,
        });

        res.status(200).json({ success: true, message: Msg.RECOVERY_EMAIL_SENT });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const loadResetPasswordForm = async (req, res) => {
    const { token } = req.params;
    const resetLink = `${baseUrl}/api/driver/`
    res.render("reset-password", { token, resetLink });
};

export const resetPassword = async (req, res) => {
    const { password, token } = req.body;
    try {
        const decoded = jwt.verify(token, process.env.DRIVER_JWT_SECRET);
        const hashedNewPassword = await argon2.hash(password);

        await updatePassword(hashedNewPassword, password, decoded.id);
        return res.json({ success: true, message: Msg.PASSWORD_UPDATED, redirect: "/success" });
    } catch (error) {
        res.status(400).json({ success: false, message: Msg.INTERNAL_SERVER_ERROR + error.message });
    }
};

export const changeDocumentRequest = async (req, res) => {
    const { document_type, reason } = req.body;

    try {
        // Get logged-in driver
        const driver = await getDriverById(req.user.id);
        if (!driver) {
            return res.status(404).json({ success: false, message: Msg.USER_NOT_FOUND });
        }

        const documentRequestData = {
            driver_id: driver.id,
            document_type,
            reason
        };

        const response = await createChangeRequest(documentRequestData);

        if (response.affectedRows > 0) {
            res.status(201).json({ success: true, message: Msg.DRIVER_DOCUMENT_CHANGE_REQUEST_SUCCESSFULL });
        } else {
            res.status(500).json({ success: false, message: Msg.DRIVER_DOCUMENT_CHANGE_REQUEST_FAILED });
        }

    } catch (error) {
        console.error("Error in change document request:", error);
        res.status(500).json({ success: false, message: Msg.INTERNAL_SERVER_ERROR, error: error.message });
    }
}

// delete drivers account
export const deleteDriverAccount = async (req, res) => {
    const { id } = req.user.id;

    try {
        const driver = await getDriverById(id);

        if (!driver) {
            return res.status(404).json({ success: false, message: Msg.DRIVER_NOT_FOUND });
        }

        const deleteImageIfExists = (subfolder, filename) => {
            if (filename) {
                const fullPath = path.join('public', 'uploads', subfolder, filename);
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                }
            }
        };

        deleteImageIfExists('profile_images', driver.profile_image);
        deleteImageIfExists('dl_images', driver.dl_image);
        deleteImageIfExists('rc_images', driver.rc_image);

        const result = await deleteDriver(id);

        if (result.affectedRows > 0) {
            return res.status(200).json({ success: true, message: Msg.DRIVER_ACCOUNT_DELETED });
        } else {
            return res.status(404).json({ success: false, message: Msg.DRIVER_NOT_FOUND });
        }

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// get all driver's notifications
export const getDriverNotifications = async (req, res) => {
    const { id } = req.user;
    try {
        const driver = await getDriverById(id);

        if (!driver) {
            return res.status(404).json({ success: false, message: Msg.DRIVER_NOT_FOUND });
        }

        const result = await driverNotifications(id);

        const userTimezone = req.user?.timezone || "UTC";
        const formatted = result.map(row => ({
            ...row,
            created_at: dayjs(row.created_at).tz(userTimezone).format("YYYY-MM-DD HH:mm:ss")
        }));


        if (formatted.length > 0) {
            return res.status(200).json({
                success: true,
                message: Msg.NOTIFICATION_FETCHED,
                data: formatted
            });
        } else {
            return res.status(404).json({ success: false, message: Msg.NOTIFICATION_NOT_FOUND });
        }

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// accept pacakge by driver
export const acceptPackage = async (req, res) => {
    const { id: driverId } = req.user; // logged-in driver
    const { package_no } = req.body;

    try {
        const existingPackage = await findOrderByPackageNo(package_no);

        if (!existingPackage) {
            return res.status(404).json({ success: false, message: Msg.PACKAGE_NOT_FOUND });
        }

        const packageId = existingPackage.id;

        // Update package with driver assignment + status
        const packageData = {
            driver_id: driverId,
            pickedup_at: new Date(),
            status: 1 // accepted
        };
        await updatePackageDetails(packageId, packageData);

        const notificationData = {
            notification_action: 1
        };
        await updateNotificationDetails(package_no, notificationData);

        // --- Notification to User ---
        const userId = existingPackage.user_id;
        const userData = await getUserById(userId);
        const driverData = await getDriverById(driverId);

        const notificationType = NotificationTypes.PACKAGE_ACCEPTED;
        const notificationSend = "packageAccepted";

        // Use user’s FCM token, not driver’s
        const userFcmToken = userData.fcm_token;

        // Build notification payload
        const message = await createNotificationMessage({
            notificationSend: notificationSend,
            fullName: driverData.name,
            senderId: driverId,
            receiverId: userId,
            senderRole: "driver",
            receiverRole: "user",
            fcmToken: userFcmToken,
            notificationType: NotificationTypes.PACKAGE_ACCEPTED,
            package_no: existingPackage.package_no
        });

        // Save notification in DB
        await saveNotification({
            send_from_id: driverId,
            send_to_id: userId,
            package_no: existingPackage.package_no,
            title: message.notification.title,
            body: message.notification.body,
            notification_type: notificationType,
            is_sender: "driver",
            is_receiver: "user"
        });

        // Send push notification
        await sendNotification(message);

        return res.status(200).json({ success: true, message: Msg.PACKAGE_ACCEPTED });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// reject pacakge by driver
export const rejectPackage = async (req, res) => {
    const { id: driverId } = req.user;
    const { package_no } = req.body;

    try {
        const existingPackage = await findOrderByPackageNo(package_no);
        if (!existingPackage) {
            return res.status(404).json({ success: false, message: Msg.PACKAGE_NOT_FOUND });
        }

        const packageId = existingPackage.id;
        const userId = existingPackage.user_id;

        const userData = await getUserById(userId);

        // Update status (rejected by this driver)
        let packageData = { driver_id: driverId, status: 0 };
        await updatePackageDetails(packageId, packageData);

        const notificationData = {
            notification_action: 3
        };
        await updateNotificationDetails(package_no, notificationData);

        // Get pickup location
        let userPickupDataArr = await getUserPickupAddressById(existingPackage.pickup_address_id);
        let userPickupData = userPickupDataArr[0];
        const lat = parseFloat(userPickupData.latitude);
        const lng = parseFloat(userPickupData.longitude);

        // Get list of nearby drivers
        const nearbyDrivers = await getDriversByCoordinates(lat, lng, 50, 10);

        // Exclude the rejecting driver
        const nextDriver = nearbyDrivers.find(d => d.id !== driverId);

        if (nextDriver) {
            // Build notification for the next driver
            const message = await createNotificationMessage({
                notificationSend: "packageAppearToDriver",
                fullName: userData.name,
                senderId: userId,
                receiverId: nextDriver.id,
                senderRole: "user",
                receiverRole: "driver",
                fcmToken: nextDriver.fcm_token,
                notificationType: NotificationTypes.PACKAGE_APPEAR_TO_DRIVER,
                package_no
            });

            // Save notification for next driver
            await saveNotification({
                send_from_id: userId,
                send_to_id: nextDriver.id,
                package_no,
                title: message.notification.title,
                body: message.notification.body,
                notification_type: NotificationTypes.PACKAGE_APPEAR_TO_DRIVER,
                is_sender: "user",
                is_receiver: "driver"
            });

            // Send FCM
            await sendNotification(message);

            return res.status(200).json({ success: true, message: Msg.PACKAGE_REASSIGNED });
        } else {
            // If no driver available → notify user
            const userData = await getUserById(userId);

            const message = await createNotificationMessage({
                notificationSend: "noDriverAvailable",
                fullName: "Admin",
                senderId: null,
                receiverId: userId,
                senderRole: "admin",
                receiverRole: "user",
                fcmToken: userData.fcm_token,
                notificationType: NotificationTypes.NO_DRIVER_AVAILABLE,
                package_no
            });

            await saveNotification({
                send_from_id: 1,
                send_to_id: userId,
                package_no,
                title: message.notification.title,
                body: message.notification.body,
                notification_type: NotificationTypes.NO_DRIVER_AVAILABLE,
                is_sender: "admin",
                is_receiver: "user"
            });

            await sendNotification(message);

            return res.status(200).json({ success: false, message: Msg.NO_DRIVER_AVAILABLE });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// complete pacakge by driver
export const completePackage = async (req, res) => {
    const { id: driverId } = req.user;
    const { package_no } = req.body;

    try {
        const existingPackage = await findOrderByPackageNo(package_no);
        if (!existingPackage) {
            return res.status(404).json({ success: false, message: Msg.PACKAGE_NOT_FOUND });
        }

        const packageId = existingPackage.id;
        const userId = existingPackage.user_id;

        // Update status (delivered)
        const packageData = {
            driver_id: driverId,
            delivered_at: new Date(),
            status: 2
        };
        await updatePackageDetails(packageId, packageData);

        const notificationData = {
            notification_action: 2
        };
        await updateNotificationDetails(package_no, notificationData);

        // Get user data (to send notification)
        const userData = await getUserById(userId);
        const driverData = await getDriverById(driverId);

        if (userData?.fcm_token) {
            const message = await createNotificationMessage({
                notificationSend: "packageCompleted",
                fullName: driverData.name,
                senderId: driverId,
                receiverId: userId,
                senderRole: "driver",
                receiverRole: "user",
                fcmToken: userData.fcm_token,
                notificationType: NotificationTypes.PACKAGE_COMPLETED,
                package_no
            });

            // Save notification
            await saveNotification({
                send_from_id: driverId,
                send_to_id: userId,
                package_no,
                title: message.notification.title,
                body: message.notification.body,
                notification_type: NotificationTypes.PACKAGE_COMPLETED,
                is_sender: "driver",
                is_receiver: "user"
            });

            // Send FCM push
            await sendNotification(message);
        }

        return res.status(200).json({ success: true, message: Msg.PACKAGE_COMPLETED });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// delete drivers single notification
export const deleteSingleNotification = async (req, res) => {
    const { notification_id } = req.body;

    try {
        const result = await deleteNotification(notification_id);

        if (result.affectedRows > 0) {
            return res.status(200).json({ success: true, message: Msg.NOTIFICATION_DELETED });
        } else {
            return res.status(404).json({ success: false, message: Msg.NOTIFICATION_NOT_FOUND });
        }

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// delete drivers all notification
export const deleteAllNotification = async (req, res) => {
    const driver_id = req.user.id;

    try {
        const result = await deleteAllDriverNotification(driver_id);

        if (result.affectedRows > 0) {
            return res.status(200).json({ success: true, message: Msg.NOTIFICATION_DELETED });
        } else {
            return res.status(404).json({ success: false, message: Msg.NOTIFICATION_NOT_FOUND });
        }

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// get driver's packages
export const getMyPackages = async (req, res) => {
    const driver_id = req.user.id;
    try {
        const packages = await getDriversPackages(driver_id);

        const UserPackages = packages.map(item => ({
            ...item,
            user_profile_image: item.user_profile_image ? `${baseUrl}/uploads/profile_images/${item.user_profile_image}` : null,
        }));

        res.status(200).json({ success: true, message: Msg.DATA_RETRIEVED, packages: UserPackages });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}