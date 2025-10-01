import argon2 from 'argon2';
import fs from 'fs';
import os from 'os';
import path from 'path';
import nodemailer from "nodemailer";
import { fileURLToPath } from "url";
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { sendVerificationEmail } from "../config/mailer.js";
import admin from "../config/firebase.js";
import { generateToken } from "../utils/auth.js";
import Msg from "../utils/message.js"
import {
    findUserByEmail,
    createUser,
    findUserByActToken,
    verifyUserEmail,
    getUserById,
    updateUserProfile,
    fetchUserPassword,
    updatePassword,
    deleteUser,
    createReport,
    userReports,
    userNotifications,
    updateUserLogin
} from "../models/userModel.js";
import { findDriverByEmail } from '../models/driverModel.js';
import { findAdminByEmail } from '../models/adminModel.js';
import { deleteAllUserNotification, deleteNotification } from '../models/packageModel.js';

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

export const googleLoginUser = async (req, res) => {
    try {
        const { idToken, email, socialId, userName, fcmToken } = req.body;

        if (!idToken) return res.status(400).json({ success: false, message: "Firebase ID token is required" });

        // Verify Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(idToken);

        if (decodedToken.uid !== socialId) return res.status(401).json({ success: false, message: "Token mismatch" });

        // Check if user exists
        let user = await findUserByEmail(email);

        if (!user) {
            const newUser = {
                name: userName,
                email,
                social_id: socialId,
                social_provider: "google",
                fcm_token: fcmToken,
                login_type: "social",
            };
            await createUser(newUser);
            user = newUser;
        } else {
            await updateUserLogin(email, { fcm_token: fcmToken, login_type: "social" });
        }

        const token = jwt.sign({ email: user.email, id: user.id }, process.env.USER_JWT_SECRET, { expiresIn: "7d" });

        res.json({ success: true, message: "Google login successful", token, user });
    } catch (err) {
        console.error("Google Login (User) Error:", err);
        res.status(500).json({ success: false, message: "Google login failed" });
    }
};

// Signup API
export const signup = async (req, res) => {
    const { name, email, password, phone_number, country_code } = req.body;

    try {
        const existingDriver = await findDriverByEmail(email);
        const existingUser = await findUserByEmail(email);
        const existingAdmin = await findAdminByEmail(email);

        if (existingDriver || existingUser || existingAdmin) {
            return res.status(400).json({ success: false, message: Msg.EMAIL_ALREADY_REGISTERED });
        }

        const hashedPassword = await argon2.hash(password);

        const token = jwt.sign({ email }, process.env.USER_JWT_SECRET, {
            expiresIn: "1h",
        });

        await sendVerificationEmail(req, email, token);

        const userData = {
            name,
            email,
            country_code,
            phone_number,
            password: hashedPassword,
            show_password: password,
            act_token: token,
        };

        const response = await createUser(userData);

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

// Verify User
export const verifyEmail = async (req, res) => {
    const { token } = req.params;

    try {
        const user = await findUserByActToken(token);

        if (user?.act_token != token) {
            return res.sendFile(path.join(__dirname, "views", "notverify.html"));
        }

        const data = {
            act_token: null,
            email_verified_at: new Date(),
            id: user.id,
        };

        const result = await verifyUserEmail(
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
        const user = await findUserByEmail(email);
        if (!user) return res.status(400).json({ success: false, message: Msg.USER_NOT_FOUND });

        if (!user.email_verified_at) return res.status(403).json({ success: false, message: Msg.VERIFY_EMAIL_FIRST });

        const isMatch = await argon2.verify(user.password, password);
        if (!isMatch) return res.status(400).json({ success: false, message: Msg.INVALID_CREDENTIALS });

        const token = generateToken(user);
        res.json({ success: true, message: Msg.LOGIN_SUCCESSFULL, token, user: { ...user, profile_image: `${baseUrl}/uploads/profile_images/${user.profile_image}` } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get Profile API
export const getProfile = async (req, res) => {

    try {
        const user = await getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: Msg.USER_NOT_FOUND });
        }
        const { show_password, ...other } = user

        res.json({ success: true, user: { ...other, profile_image: other.profile_image ? `${baseUrl}/uploads/profile_images/${other.profile_image}` : null, } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Update Profile API
export const updateProfile = async (req, res) => {
    const { name, phone_number, country_code } = req.body;
    const userId = req.user.id;

    try {
        const user = await getUserById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: Msg.USER_NOT_FOUND });
        }

        let updateData = {
            name: name || user.name,
            country_code: country_code || user.country_code,
            phone_number: phone_number || user.phone_number,
            profile_image: user.profile_image,
        };

        if (req.files?.profile_image) {
            const newImagePath = `${req.files.profile_image[0].filename}`;

            if (user.profile_image) {
                const oldImagePath = path.join("public", user.profile_image);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }

            updateData.profile_image = newImagePath;
        }

        const response = await updateUserProfile(userId, updateData);

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
};

// Update Token API
export const updateToken = async (req, res) => {
    const { fcm_token } = req.body;
    const userId = req.user.id;

    try {
        const user = await getUserById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: Msg.USER_NOT_FOUND });
        }

        let updateData = {
            fcm_token: fcm_token || user.fcm_token
        };

        const response = await updateUserProfile(userId, updateData);

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

// Change Password API
export const changePassword = async (req, res) => {
    try {
        const { old_password, new_password } = req.body;
        const userId = req.user.id;

        if (!old_password || !new_password) {
            return res.status(400).json({
                success: false,
                message: Msg.PASSWORD_REQUIRED,
            });
        }

        const user = await fetchUserPassword(userId);
        if (!user || !user.password) {
            return res.status(404).json({
                success: false,
                message: Msg.USER_NOT_FOUND,
            });
        }

        const isMatch = await argon2.verify(user.password, old_password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: Msg.INCORRECT_OLD_PASSWORD });
        }

        const hashedNewPassword = await argon2.hash(new_password);

        const response = await updatePassword(hashedNewPassword, new_password, userId);

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
        const user = await findUserByEmail(email);
        if (!user) return res.status(404).json({ message: Msg.USER_NOT_FOUND });

        const resetToken = jwt.sign({ id: user.id }, process.env.USER_JWT_SECRET);
        const resetLink = `${baseUrl}/api/user/reset-password/${resetToken}`;

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
            to: user.email,
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
    const resetLink = `${baseUrl}/api/user/`
    res.render("reset-password", { token, resetLink });
};

export const resetPassword = async (req, res) => {
    const { password, token } = req.body;
    try {
        const decoded = jwt.verify(token, process.env.USER_JWT_SECRET);
        const hashedNewPassword = await argon2.hash(password);

        await updatePassword(hashedNewPassword, password, decoded.id);
        return res.json({ success: true, message: Msg.PROFILE_UPDATED, redirect: "/success" });
    } catch (error) {
        res.status(400).json({ success: false, message: Msg.INTERNAL_SERVER_ERROR + error.message });
    }
};

// delete users account
export const deleteUserAccount = async (req, res) => {
    const { id } = req.user;

    try {
        const user = await getUserById(id);

        if (!user) {
            return res.status(404).json({ success: false, message: Msg.USER_NOT_FOUND });
        }

        const deleteImageIfExists = (subfolder, filename) => {
            if (filename) {
                const fullPath = path.join('public', 'uploads', subfolder, filename);
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                }
            }
        };

        deleteImageIfExists('profile_images', user.profile_image);

        const result = await deleteUser(id);

        if (result.affectedRows > 0) {
            return res.status(200).json({ success: true, message: Msg.USER_ACCOUNT_DELETED });
        } else {
            return res.status(404).json({ success: false, message: Msg.USER_NOT_FOUND });
        }

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Create User Report
export const createUserReport = async (req, res) => {
    const { title, description } = req.body;

    try {
        const user_id = req.user.id;
        let report_image = null;

        if (req.files && req.files.report_image && req.files.report_image.length > 0) {
            report_image = path.basename(req.files.report_image[0].path);
        }

        const reportData = {
            user_id: user_id,
            title: title || null,
            description: description || null,
            report_image
        };

        const response = await createReport(reportData);

        if (response.affectedRows > 0) {
            res.status(201).json({
                success: true,
                message: Msg.REPORT_SUBMITTED,
            });
        } else {
            res.status(500).json({ success: false, message: Msg.SOMETHING_WENT_WRONG });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// get user reports
export const getUserReports = async (req, res) => {
    const user_id = req.user.id;

    try {
        const response = await userReports(user_id);

        if (response && response.length > 0) {
            const updatedResponse = response.map(report => ({
                ...report,
                report_image: report.report_image
                    ? `${baseUrl}/uploads/reports/${report.report_image}`
                    : null
            }));

            res.status(200).json({
                success: true,
                message: Msg.REPORT_RETRIEVED,
                data: updatedResponse
            });
        } else {
            res.status(404).json({ success: false, message: Msg.SOMETHING_WENT_WRONG });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// get all user's notifications
export const getUserNotifications = async (req, res) => {
    const { id } = req.user;
    try {
        const driver = await getUserById(id);

        if (!driver) {
            return res.status(404).json({ success: false, message: Msg.USER_NOT_FOUND });
        }

        const result = await userNotifications(id);

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
}

// delete users single notification
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

// delete users all notification
export const deleteAllNotification = async (req, res) => {
    const user_id = req.user.id;

    try {
        const result = await deleteAllUserNotification(user_id);

        if (result.affectedRows > 0) {
            return res.status(200).json({ success: true, message: Msg.NOTIFICATION_DELETED });
        } else {
            return res.status(404).json({ success: false, message: Msg.NOTIFICATION_NOT_FOUND });
        }

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};