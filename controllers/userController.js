import db from '../config/db.js';
import argon2 from 'argon2';
import fs from 'fs';
import os from 'os';
import path from 'path';
import nodemailer from "nodemailer";
import { fileURLToPath } from "url";
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { sendVerificationEmail } from "../config/mailer.js";
import { generateToken } from "../utils/auth.js";
import {
    findUserByEmail,
    createUser,
    findUserByActToken,
    verifyUserEmail,
    getUserById,
    updateUserProfile,
    fetchUserPassword,
    updatePassword
} from "../models/userModel.js";

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
    const { name, email, password, phone_number } = req.body;

    try {
        const existingUser = await findUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: "Email already registered" });
        }

        // Corrected hashing without salt rounds
        const hashedPassword = await argon2.hash(password);

        const token = jwt.sign({ email }, process.env.JWT_SECRET, {
            expiresIn: "1h",
        });

        await sendVerificationEmail(email, token);

        const userData = {
            name,
            email,
            phone_number,
            password: hashedPassword,
            show_password: password,
            act_token: token,
        };

        const response = await createUser(userData);

        if (response.affectedRows > 0) {
            res.status(201).json({
                message: `Signup successful! Please check your email (${email}) to verify your account.`,
            });
        } else {
            res.status(500).json({ message: "Signup failed. Please try again." });
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
        res.status(500).json({ message: "Internal server error.", error: error.message });
    }
};

// Login API
export const login = async (req, res) => {

    const localIp = getLocalIp(); // Get the server's local IP address
    const baseUrl = `http://${localIp}:${process.env.PORT}`;

    const { email, password } = req.body;

    try {
        const user = await findUserByEmail(email);
        if (!user) return res.status(400).json({ message: "User not found" });

        if (!user.email_verified_at) return res.status(403).json({ message: "Please verify your email first." });

        // Compare password using argon2
        const isMatch = await argon2.verify(user.password, password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = generateToken(user);
        res.json({ message: "Login successful!", token, user: { ...user, profile_image: `${baseUrl}/uploads/profile_images/${user.profile_image}` } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get Profile API
export const getProfile = async (req, res) => {

    try {
        const localIp = getLocalIp(); // Get the server's local IP address
        const baseUrl = `http://${localIp}:${process.env.PORT}`;

        const user = await getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const { show_password, ...other } = user



        res.json({ success: true, user: { ...other, profile_image: `${baseUrl}/uploads/profile_images/${other.profile_image}` } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Update Profile API
export const updateProfile = async (req, res) => {
    const { name, phone_number } = req.body;
    const userId = req.user.id;

    try {
        const user = await getUserById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        let updateData = {
            name: name || user.name,
            phone_number: phone_number || user.phone_number,
            profile_image: user.profile_image,
        };

        if (req.file) {
            const newImagePath = `${req.file.filename}`;

            // Remove old image if it exists
            if (user.profile_image) {
                const oldImagePath = path.join("public", user.profile_image);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath); // Delete old file
                }
            }

            updateData.profile_image = newImagePath;
        }

        const response = await updateUserProfile(userId, updateData);

        if (response.affectedRows > 0) {
            return res.status(200).json({
                message: "Profile updated successfully!",
            });
        } else {
            return res.status(400).json({ message: "No changes made to the profile." });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Change Password API
export const changePassword = async (req, res) => {
    try {
        const { old_password, new_password } = req.body;
        const userId = req.user.id;

        if (!old_password || !new_password) {
            return res.status(400).json({
                message: "Both old and new passwords are required",
                success: false,
            });
        }

        // Fetch user's current password
        const user = await fetchUserPassword(userId);
        if (!user || !user.password) {
            return res.status(404).json({
                message: "User not found",
                success: false,
            });
        }

        // Verify old password
        const isMatch = await argon2.verify(user.password, old_password);
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect old password", success: false });
        }

        // Hash the new password
        const hashedNewPassword = await argon2.hash(new_password);

        // Update password in database
        const response = await updatePassword(hashedNewPassword, new_password, userId);

        if (response?.affectedRows > 0) {
            return res.json({
                message: "Password changed successfully",
                success: true,
            });
        } else {
            return res.status(500).json({
                message: "Unable to change password",
                success: false,
            });
        }
    } catch (error) {
        console.error("Error changing password:", error);
        res.status(500).json({ message: "Internal server error", success: false });
    }
};

// Forgot Password API
export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await findUserByEmail(email);
        if (!user) return res.status(404).json({ message: "User not found" });

        const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
        const resetLink = `http://${localIp}:${process.env.PORT}/api/user/reset-password/${resetToken}`;

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

        res.json({ message: "A recovery email has been sent to your email address to reset your password" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const loadResetPasswordForm = async (req, res) => {
    const { token } = req.params;
    const resetLink = `http://${localIp}:${process.env.PORT}/api/user/`
    res.render("reset-password", { token, resetLink });
};

export const resetPassword = async (req, res) => {
    const { password, token } = req.body;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const hashedNewPassword = await argon2.hash(password);

        await updatePassword(hashedNewPassword, password, decoded.id);
        return res.json({ success: true, message: "Password updated successfully!", redirect: "/success" });
    } catch (error) {
        res.status(400).json({ message: "Internal servber error " + error.message });
    }
};