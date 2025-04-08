
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
import { findAdminByEmail, getAdminById, updatePassword, updateAdminProfile, fetchAminPassword, getAllUsers, getAllDrivers } from "../models/adminModel.js";
import { findUserByEmail, getUserById, createUser, updateUserProfile } from "../models/userModel.js";
import { createDriver, findDriverByEmail, findDriverByUuid, getDriverById, updateDriverProfile } from "../models/driverModel.js"
import { sendWelcomeEmail } from "../config/mailer.js";

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
export const updateProfile = async (req, res) => {
    const { name, phone_number } = req.body;
    const adminId = req.user.id;

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

        if (req.files?.profile_image) {
            const newImagePath = `${req.files.profile_image[0].filename}`;

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

        const formattedUsers = users.map(user => ({
            ...user,
            profile_image: user.profile_image ? `${baseUrl}/uploads/profile_images/${user.profile_image}` : null,
        }));

        res.status(200).json({ success: true, users: formattedUsers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};


// Create User
export const createNewUser = async (req, res) => {
    const { name, email, country_code, phone_number } = req.body;

    try {
        const existingUser = await findUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: Msg.EMAIL_ALREADY_REGISTERED
            });
        }

        const password = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedPassword = await argon2.hash(password);

        const profileImage = req.files?.profile_image?.[0]?.filename || "";

        // Create user in database
        const userData = {
            name,
            email,
            country_code,
            phone_number,
            password: hashedPassword,
            profile_image: profileImage,
            email_verified_at: new Date()
        };

        const result = await createUser(userData);

        if (result.insertId) {
            await sendWelcomeEmail(req, name, email, password);
        }

        res.status(201).json({ success: true, message: Msg.USER_CREATED });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};


export const editUserProfile = async (req, res) => {
    const { id, name, country_code, phone_number } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: "User ID is required." });
    }

    try {
        const user = await getUserById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: Msg.USER_NOT_FOUND });
        }

        let updatedUser = {
            name: name || user.name,
            country_code: country_code || user.country_code,
            phone_number: phone_number || user.phone_number,
            profile_image: user.profile_image
        };

        const uploadedImage = req.files?.profile_image?.[0]?.filename;

        if (uploadedImage) {
            if (user.profile_image) {
                const oldImagePath = path.resolve("public", "uploads", "profile_images", user.profile_image);
                if (fs.existsSync(oldImagePath) && fs.lstatSync(oldImagePath).isFile()) {
                    fs.unlinkSync(oldImagePath);
                }
            }

            updatedUser.profile_image = uploadedImage;
        }

        await updateUserProfile(id, updatedUser);

        res.status(200).json({ success: true, message: Msg.PROFILE_UPDATED });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

//getAllDrivers
export const getDrivers = async (req, res) => {
    try {
        const drivers = await getAllDrivers();
        const formattedDrivers = drivers.map(driver => ({
            ...driver,
            profile_image: driver.profile_image ? `${baseUrl}/uploads/profile_images/${driver.profile_image}` : null,
            dl_image: driver.dl_image ? `${baseUrl}/uploads/dl_images/${driver.dl_image}` : null,
            rc_image: driver.rc_image ? `${baseUrl}/uploads/rc_images/${driver.rc_image}` : null
        }));
        res.status(200).json({ success: true, drivers: formattedDrivers })
    } catch (error) {
        res.status(500).json({ success: false, error: error.message })
    }
}

//create Drivers
export const createNewDriver = async (req, res) => {
    const { name, email, country_code, phone_number } = req.body;
    try {

        const existingDriver = await findDriverByEmail(email);
        if (existingDriver) {
            return res.status(400).json({ success: false, message: Msg.EMAIL_ALREADY_REGISTERED });
        }

        const password = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedPassword = await argon2.hash(password);
        const profileImage = req.files?.profile_image?.[0].filename || "";

        const driverData = {
            driver_uuid: await generateUniqueId(),
            name,
            email,
            country_code,
            phone_number,
            password: hashedPassword,
            profile_image: profileImage,
            email_verified_at: new Date()
        }

        const product = await createDriver(driverData)

        if (product.insertId) {
            await sendWelcomeEmail(req, name, email, password);
        }

        res.status(201).json({ success: true, message: Msg.DRIVER_CREATED });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export const editDriverProfile = async (req, res) => {
    const { id, name, country_code, phone_number } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: "Driver's ID is required" });
    }

    try {
        const driver = await getDriverById(id);

        if (!driver) {
            return res.status(404).json({ success: false, message: Msg.DRIVER_NOT_FOUND });
        }

        let updateDriver = {
            name: name || driver.name,
            country_code: country_code || driver.country_code,
            phone_number: phone_number || driver.phone_number,
            profile_image: driver.profile_image
        };

        const uploadedImage = req.files?.profile_image?.[0]?.filename;
        if (uploadedImage) {
            if (driver.profile_image) {
                const oldImagePath = path.resolve("public", "uploads", "profile_images", driver.profile_image);

                if (fs.existsSync(oldImagePath) && fs.lstatSync(oldImagePath).isFile()) {
                    fs.unlinkSync(oldImagePath);
                }
            }

            updateDriver.profile_image = uploadedImage;
        }

        await updateDriverProfile(id, updateDriver);
        return res.status(200).json({ success: true, message: Msg.PROFILE_UPDATED });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
