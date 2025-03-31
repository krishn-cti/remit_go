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
import { generateToken } from "../utils/driverauth.js";
import Msg from "../utils/message.js"

import {
    findUserByEmail,
    createUser,
    findUserByActToken,
    verifyUserEmail,
    getUserById,
    updateUserProfile,
    fetchUserPassword,
    updatePassword
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

// Signup API
export const signup = async (req, res) => {
    const { name, email, password, phone_number, dl_number, rc_number } = req.body;

    try {
        const existingUser = await findUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: Msg.EMAIL_ALREADY_REGISTERED });
        }

        const hashedPassword = await argon2.hash(password);

        const token = jwt.sign({ email }, process.env.JWT_SECRET, {
            expiresIn: "1h",
        });

        // Access files correctly using req.files
        const dlImage = req.files?.dl_image ? req.files.dl_image[0].filename : "";
        const rcImage = req.files?.rc_image ? req.files.rc_image[0].filename : "";


        await sendDriverVerificationEmail(req, email, token);

        const userData = {
            name,
            email,
            phone_number,
            dl_number,
            rc_number,
            dl_image: dlImage,
            rc_image: rcImage,
            password: hashedPassword,
            show_password: password,
            act_token: token,
        };

        const response = await createUser(userData);

        if (response.affectedRows > 0) {
            res.status(201).json({
                message: `${Msg.SIGNUP_SUCCESSFULL} (${email}) to verify your account.`,
            });
        } else {
            res.status(500).json({ message: Msg.SIGNUP_FAILED });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
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
        res.status(500).json({ message: Msg.INTERNAL_SERVER_ERROR, error: error.message });
    }
};

// Login API
export const login = async (req, res) => {

    const localIp = getLocalIp();
    const baseUrl = `http://${localIp}:${process.env.PORT}`;

    const { email, password } = req.body;

    try {
        const user = await findUserByEmail(email);
        if (!user) return res.status(400).json({ message: Msg.USER_NOT_FOUND });

        if (!user.email_verified_at) return res.status(403).json({ message: Msg.VERIFY_EMAIL_FIRST });

        const isMatch = await argon2.verify(user.password, password);
        if (!isMatch) return res.status(400).json({ message: Msg.INVALID_CREDENTIALS });

        const token = generateToken(user);
        res.json({ message: Msg.LOGIN_SUCCESSFULL, token, user: { ...user, profile_image: `${baseUrl}/uploads/profile_images/${user.profile_image}` } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get Profile API
export const getProfile = async (req, res) => {

    try {
        const localIp = getLocalIp();
        const baseUrl = `http://${localIp}:${process.env.PORT}`;

        const user = await getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: Msg.USER_NOT_FOUND });
        }
        const { show_password, ...other } = user

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
        res.status(500).json({ error: error.message });
    }
};

// Update Profile API
// export const updateProfile = async (req, res) => {
//     const { name, phone_number, dl_number, rc_number } = req.body;
//     const userId = req.user.id;

//     try {
//         const user = await getUserById(userId);
//         if (!user) {
//             return res.status(404).json({ message: Msg.USER_NOT_FOUND });
//         }

//         let updateData = {
//             name: name || user.name,
//             phone_number: phone_number || user.phone_number,
//             dl_number: dl_number || user.dl_number,
//             rc_number: rc_number || user.rc_number,
//             profile_image: user.profile_image,
//             dl_image: user.dl_image,
//             rc_image: user.rc_image,
//         };

//         if (req.file) {
//             const newImagePath = `${req.file.filename}`;

//             if (user.profile_image) {
//                 const oldImagePath = path.join("public", user.profile_image);
//                 if (fs.existsSync(oldImagePath)) {
//                     fs.unlinkSync(oldImagePath);
//                 }
//             }
//             updateData.profile_image = newImagePath;
//         }

//         const response = await updateUserProfile(userId, updateData);

//         if (response.affectedRows > 0) {
//             return res.status(200).json({
//                 message: Msg.PROFILE_UPDATED,
//             });
//         } else {
//             return res.status(400).json({ message: Msg.NO_PROFILE_CHANGES });
//         }
//     } catch (error) {
//         return res.status(500).json({ error: error.message });
//     }
// };

export const updateProfile = async (req, res) => {
    const { name, phone_number, dl_number, rc_number } = req.body;
    const userId = req.user.id;

    try {
        const user = await getUserById(userId);
        if (!user) {
            return res.status(404).json({ message: Msg.USER_NOT_FOUND });
        }

        let updateData = {
            name: name || user.name,
            phone_number: phone_number || user.phone_number,
            dl_number: dl_number || user.dl_number,
            rc_number: rc_number || user.rc_number,
            profile_image: user.profile_image,
            dl_image: user.dl_image,
            rc_image: user.rc_image,
        };

        // Handling profile_image upload
        if (req.files?.profile_image) {
            const newProfileImagePath = `${req.files.profile_image[0].filename}`;
            if (user.profile_image) {
                const oldProfileImagePath = path.join("public", user.profile_image);
                if (fs.existsSync(oldProfileImagePath)) {
                    fs.unlinkSync(oldProfileImagePath);
                }
            }
            updateData.profile_image = newProfileImagePath;
        }

        // Handling dl_image upload
        if (req.files?.dl_image) {
            const newDlImagePath = `${req.files.dl_image[0].filename}`;
            if (user.dl_image) {
                const oldDlImagePath = path.join("public", user.dl_image);
                if (fs.existsSync(oldDlImagePath)) {
                    fs.unlinkSync(oldDlImagePath);
                }
            }
            updateData.dl_image = newDlImagePath;
        }

        // Handling rc_image upload
        if (req.files?.rc_image) {
            const newRcImagePath = `${req.files.rc_image[0].filename}`;
            if (user.rc_image) {
                const oldRcImagePath = path.join("public", user.rc_image);
                if (fs.existsSync(oldRcImagePath)) {
                    fs.unlinkSync(oldRcImagePath);
                }
            }
            updateData.rc_image = newRcImagePath;
        }

        const response = await updateUserProfile(userId, updateData);

        if (response.affectedRows > 0) {
            return res.status(200).json({
                message: Msg.PROFILE_UPDATED,
            });
        } else {
            return res.status(400).json({ message: Msg.NO_PROFILE_CHANGES });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

// Change Password API
export const changePassword = async (req, res) => {
    try {
        const { old_password, new_password } = req.body;
        const userId = req.user.id;

        if (!old_password || !new_password) {
            return res.status(400).json({
                message: Msg.PASSWORD_REQUIRED,
                success: false,
            });
        }

        const user = await fetchUserPassword(userId);
        if (!user || !user.password) {
            return res.status(404).json({
                message: Msg.USER_NOT_FOUND,
                success: false,
            });
        }

        const isMatch = await argon2.verify(user.password, old_password);
        if (!isMatch) {
            return res.status(400).json({ message: Msg.INCORRECT_OLD_PASSWORD, success: false });
        }

        const hashedNewPassword = await argon2.hash(new_password);

        const response = await updatePassword(hashedNewPassword, new_password, userId);

        if (response?.affectedRows > 0) {
            return res.json({
                message: Msg.PASSWORD_CHANGED,
                success: true,
            });
        } else {
            return res.status(500).json({
                message: Msg.PASSWORD_CHANGE_FAILED,
                success: false,
            });
        }
    } catch (error) {
        console.error("Error changing password:", error);
        res.status(500).json({ message: Msg.INTERNAL_SERVER_ERROR, success: false });
    }
};

// Forgot Password API
export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await findUserByEmail(email);
        if (!user) return res.status(404).json({ message: Msg.USER_NOT_FOUND });

        const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
        const resetLink = `http://${localIp}:${process.env.PORT}/api/driver/reset-password/${resetToken}`;

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

        res.json({ message: Msg.RECOVERY_EMAIL_SENT });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const loadResetPasswordForm = async (req, res) => {
    const { token } = req.params;
    const resetLink = `http://${localIp}:${process.env.PORT}/api/driver/`
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
        res.status(400).json({ message: Msg.INTERNAL_SERVER_ERROR + error.message });
    }
};