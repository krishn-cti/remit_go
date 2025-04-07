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