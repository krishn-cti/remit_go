import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// console.log({
//     auth: {
//         smtp_user: process.env.SMTP_USER,
//         smtp_password: process.env.SMTP_PASSWORD,
//     },
// });

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // True for 465, false for 587
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    }
});

export const sendVerificationEmail = (email, token) => {
    const verificationLink = `http://192.168.29.76:8000/api/user/verify/${token}`;

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


export const sendDriverVerificationEmail = (email, token) => {
    const verificationLink = `http://192.168.1.10:8000/api/driver/verify/${token}`;

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