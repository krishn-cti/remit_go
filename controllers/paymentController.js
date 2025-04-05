import { getUserPaymentMethodByUser } from "../models/paymentModel.js";
import dotenv from 'dotenv';
import os from "os";
import Msg from "../utils/message.js";

dotenv.config();

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

// Get All users payment methods
export const getPaymentMethods = async (req, res) => {
    try {
        const userId = req.user.id;
        const paymentMethods = await getUserPaymentMethodByUser(userId);

        res.status(200).json({ success: true, message: Msg.DATA_RETRIEVED, data: paymentMethods });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
import "dotenv/config";
import express from "express";
import cors from "cors";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(express.json());
app.use(cors());

// Create Checkout Session
export const createCheckoutSession = async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: "Your Product",
                        },
                        unit_amount: 5000,
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `http://localhost:8000/api/payment/success`,
            // cancel_url: `${YOUR_DOMAIN}/api/payment-failed`,
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error("Error creating checkout session:", error);
        res.status(500).json({ error: "Failed to create checkout session" });
    }
};      

// Success API
export const successPayment = async (req, res) => {
    
    // const session = await stripe.checkout.sessions.retrieve(req.query.session_id);
    // if (session.payment_status === "paid") {
    //     return res.json({ message: "Payment Successful", session });
    // }
    // res.status(400).json({ error: "Payment not completed" });
};

// Failure API
app.get("/api/payment-failed", (req, res) => {
    res.json({ error: "Payment Failed or Cancelled" });
});
