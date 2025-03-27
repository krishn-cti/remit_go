import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, 
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    }
});

export const sendVerificationEmail = (req,email, token) => {
    const verificationLink = `${req.protocol}://${req.get('host')}/api/user/verify/${token}`;

    const mailOptions = {
        from: process.env.SMTP_USER,
        to: email,
        subject: "Verify Your Account",
        html: `
            <h2><h2>Welcome to Our Platform!</h2>
            <p>Click the button below to verify your account:</p>
            <a href="${verificationLink}" style="background-color:blue; color:white; padding:10px; text-decoration:none; border-radius:5px;">Verify Email</a>
            <p>If you didn't request this, please ignore this email.</p>
        `,
    };
    return transporter.sendMail(mailOptions);
};


export const sendDriverVerificationEmail = (req,email, token) => {
    const verificationLink = `${req.protocol}://${req.get('host')}/api/driver/verify/${token}`;

    const mailOptions = {
        from: process.env.SMTP_USER,
        to: email,
        subject: "Verify Your Account",
        html: `
            <h2><h2>Welcome to Our Platform!</h2>
            <p>Click the button below to verify your account:</p>
            <a href="${verificationLink}" style="background-color:blue; color:white; padding:10px; text-decoration:none; border-radius:5px;">Verify Email</a>
            <p>If you didn't request this, please ignore this email.</p>
        `,
    };
    return transporter.sendMail(mailOptions);
};