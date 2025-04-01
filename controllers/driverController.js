import db from '../config/db.js';
import argon2 from 'argon2';
import fs from 'fs';
import os from 'os';
import path from 'path';
import nodemailer from "nodemailer";
import { fileURLToPath } from "url";
import jwt from 'jsonwebtoken';
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
    findDriverByUuid
} from "../models/driverModel.js";

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

// Signup API
export const signup = async (req, res) => {
    const { name, email, password, phone_number, country_code, dl_number, rc_number } = req.body;

    try {
        const existingDriver = await findDriverByEmail(email);
        if (existingDriver) {
            return res.status(400).json({ success: false, message: Msg.EMAIL_ALREADY_REGISTERED });
        }

        const hashedPassword = await argon2.hash(password);
        const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "1h" });

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

        const resetToken = jwt.sign({ id: driver.id }, process.env.JWT_SECRET);
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
    const resetLink = `${baseUrl}/api/driver/`
    res.render("reset-password", { token, resetLink });
};

export const resetPassword = async (req, res) => {
    const { password, token } = req.body;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
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