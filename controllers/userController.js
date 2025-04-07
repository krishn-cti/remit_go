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
    getPickup,
    getDropup,
    getPackagesModel,
    getPaymentModel
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
    const { name, email, password, phone_number, country_code } = req.body;

    try {
        const existingUser = await findUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: Msg.EMAIL_ALREADY_REGISTERED
            })
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
    console.log(userId)

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

export const pickupAdress = async(req, res) =>{
    try {
        const { id } = req.user;
        console.log(id);
        const rows = await getPickup(id);
        if (!rows) {
            return res.status(404).json({ success: false, message: Msg.USER_NOT_FOUND });
        }
        return res.status(200).json( {success: true, message:'User pickup found' , data: rows[0]})
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export const dropAddress = async(req, res)=>{
    try {
        const {id} = req.user;
        console.log(id)
        const user = await getDropup(id);
        console.log(user)
        if(!user){
           return res.status(404).json({ success: false, message: Msg.USER_NOT_FOUND })
        }
        return res.status(200).json({sucess:true, message:'User droupup found', data:user})
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export const getPackages = async(req,res)=>{
   try {
    const data = await getPackagesModel();      
    if(!data){
        return res.status(404).json({ success: false, message: Msg.USER_NOT_FOUND })
     }
     return res.status(200).json({sucess:true, message:'User package found', data:data})
   } catch (error) {
    res.status(500).json({ success: false, error: error.message });
   }
}

export const getPaymentMethode = async(req,res) =>{
    try {
        const {id} = req.user;
        console.log(id);
        
        const user = await getPaymentModel(id);
        if(!user){
            return res.status(404).json({ success: false, message: Msg.USER_NOT_FOUND })
         }
         return res.status(200).json({sucess:true, message:'User payment found', data:user})
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}