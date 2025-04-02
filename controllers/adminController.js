
import { findAdminByEmail, getAdminById, updatePassword, updateAdminProfile, fetchAminPassword, getAllUsers, createUser, updateUser, getUserById } from "../models/adminModel.js";
import { generateToken } from "../utils/adminAuth.js";
import argon2 from 'argon2';
import dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import Msg from "../utils/message.js";
import { fileURLToPath } from "url";
import jwt from 'jsonwebtoken';
import nodemailer from "nodemailer";
import fs from 'fs';

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


// Login API
export const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const admin = await findAdminByEmail(email);

        if (!admin) return res.status(400).json({ success: false, message: Msg.USER_NOT_FOUND });

        if (!admin.email_verified_at) return res.status(403).json({ success: false, message: Msg.VERIFY_EMAIL_FIRST });

        const isMatch = await argon2.verify(admin.password, password);
        if (!isMatch) return res.status(400).json({ success: false, message: Msg.INVALID_CREDENTIALS });

        const token = generateToken(admin);
        res.json({ success: true, message: Msg.LOGIN_SUCCESSFULL, token, admin: { ...admin, profile_image: `${baseUrl}/uploads/profile_images/${admin.profile_image}` } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get Profile API
export const getAdminProfile = async (req, res) => {

    try {
        const admin = await getAdminById(req.user.id);
        if (!admin) {
            return res.status(404).json({ success: false, message: Msg.USER_NOT_FOUND });
        }
        const { show_password, ...other } = admin

        res.status(200).json({ success: true, admin: { ...other, profile_image: `${baseUrl}/uploads/profile_images/${other.profile_image}` } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Update Profile API
// export const updateProfile = async (req, res) => {
//     const { name, phone_number } = req.body;
//     const adminId = req.user.id;

//     try {
//         const admin = await getAdmin(adminId);
//         if (!admin) {
//             return res.status(404).json({ message: Msg.USER_NOT_FOUND });
//         }

//         let updateData = {
//             name: name || admin.name,
//             phone_number: phone_number || admin.phone_number,
//             profile_image: admin.profile_image,
//         };

//         if (req.file) {
//             const newImagePath = `${req.file.filename}`;

//             if (admin.profile_image) {
//                 const oldImagePath = path.join("public", admin.profile_image);
//                 if (fs.existsSync(oldImagePath)) {
//                     fs.unlinkSync(oldImagePath);
//                 }
//             }

//             updateData.profile_image = newImagePath;
//         }

//         const response = await updateAdminProfile(adminId, updateData);

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
    const { name, phone_number } = req.body;
    const adminId = req.user.id;

    // Validate required fields
    if (!name || !phone_number) {
        return res.status(400).json({
            success: false,
            message: "Name and phone number are required."
        });
    }

    try {
        const admin = await getAdminById(adminId);
        if (!admin) {
            return res.status(404).json({ message: Msg.USER_NOT_FOUND });
        }

        let updateData = {
            name: name || admin.name,
            phone_number: phone_number || admin.phone_number,
            profile_image: admin.profile_image,
        };

        if (req.file) {
            const newImagePath = `${req.file.filename}`;

            if (admin.profile_image) {
                const oldImagePath = path.join("public", admin.profile_image);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }

            updateData.profile_image = newImagePath;
        }

        const response = await updateAdminProfile(adminId, adminData);

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


// Change Password API
export const changePassword = async (req, res) => {
    try {
        const { old_password, new_password } = req.body;
        const adminId = req.user.id;

        if (!old_password || !new_password) {
            return res.status(400).json({
                success: false,
                message: Msg.PASSWORD_REQUIRED,
            });
        }

        const admin = await fetchAminPassword(adminId);
        if (!admin || !admin.password) {
            return res.status(404).json({
                success: false,
                message: Msg.USER_NOT_FOUND,
            });
        }

        const isMatch = await argon2.verify(admin.password, old_password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: Msg.INCORRECT_OLD_PASSWORD });
        }

        const hashedNewPassword = await argon2.hash(new_password);

        const response = await updatePassword(hashedNewPassword, new_password, adminId);

        if (response?.affectedRows > 0) {
            return res.json({
                success: true,
                message: Msg.PASSWORD_CHANGED,
            });
        } else {
            return res.status(500).json({
                message: Msg.PASSWORD_CHANGE_FAILED,
                success: false,
            });
        }
    } catch (error) {
        console.error("Error changing password:", error);
        res.status(500).json({ success: false, message: Msg.INTERNAL_SERVER_ERROR, success: false });
    }
};

// Forgot Password API
export const forgotPassword = async (req, res) => {

    const { email } = req.body;
    try {
        const admin = await findAdminByEmail(email);

        if (!admin) return res.status(404).json({ success: false, message: Msg.USER_NOT_FOUND });

        const resetToken = jwt.sign({ id: admin.id }, process.env.ADMIN_JWT_SECRET);
        const resetLink = `${baseUrl}/api/admin/reset-password/${resetToken}`;

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
            to: admin.email,
            subject: "Password Reset Request",
            html: emailHtml,
        });

        res.json({ success: true, message: Msg.RECOVERY_EMAIL_SENT });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const loadResetPasswordForm = async (req, res) => {
    const { token } = req.params;
    const resetLink = `${baseUrl}/api/admin/`
    res.render("reset-password", { token, resetLink });
};

export const resetPassword = async (req, res) => {
    const { password, token } = req.body;
    try {
        const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
        const hashedNewPassword = await argon2.hash(password);

        await updatePassword(hashedNewPassword, password, decoded.id);
        return res.json({ success: true, message: Msg.PROFILE_UPDATED, redirect: "/success" });
    } catch (error) {
        res.status(400).json({ success: false, message: Msg.INTERNAL_SERVER_ERROR + error.message });
    }
};

// Get All Users
export const getUsers = async (req, res) => {
    try {
        const users = await getAllUsers();
        res.status(200).json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};




// Create User
export const createNewUser = async (req, res) => {
    const { name, email, phone_number, show_password } = req.body;

    if (!name || !email || !phone_number || !show_password) {
        return res.status(400).json({ success: false, message: "All fields are required." });
    }

    try {
        const newUser = { name, email, phone_number, show_password };
        const result = await createUser(newUser);

        res.status(201).json({ success: true, message: "User created successfully.", userId: result.insertId });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};


export const editUser = async (req, res) => {
    const { id, name, phone_number, show_password } = req.body; // Get id from payload

    if (!id) {
        return res.status(400).json({ success: false, message: "User ID is required in the request body." });
    }

    try {
        const user = await getUserById(id);
        if (!user) return res.status(404).json({ success: false, message: "User not found." });

        const updatedUser = {
            name: name || user.name,
            phone_number: phone_number || user.phone_number,
            show_password: show_password || user.show_password
        };

        await updateUser(id, updatedUser);
        res.status(200).json({ success: true, message: "User updated successfully." });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
