import { getPackages, sendPackageToDriver } from "../models/packageModel.js";
import dotenv from 'dotenv';
import os from "os";
import Msg from "../utils/message.js";
import { sendPackageSchema } from "../utils/validators/sendPackage.validator.js";

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

// Get All Packages
export const getAllPackages = async (req, res) => {
    try {
        const packages = await getPackages();

        const formattedPackages = packages.map(item => ({
            ...item,
            image: item.image ? `${baseUrl}/uploads/packages/${item.image}` : null,
        }));

        res.status(200).json({ success: true, message: Msg.DATA_RETRIEVED, packages: formattedPackages });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const sendPackage = async (req, res) => {
    try {
        const { error } = sendPackageSchema.validate(req.body);
        if (error) {
            return res.status(403).json({ success: false, message: error.details[0].message });
        }

        const user_id = req.user.id;
        const {
            pickup_address_id,
            dropup_address_id,
            package_id,
            package_qty,
            amount,
            payment_method_id,
            status
        } = req.body;

        const packageData = {
            user_id,
            pickup_address_id,
            dropup_address_id,
            package_id,
            package_qty,
            amount,
            payment_method_id,
            status
        };


        const result = await sendPackageToDriver(packageData);

        if (result?.insertId) {
            return res.status(201).json({ success: true, message: Msg.PACKAGE_SENT });
        } else {
            return res.status(500).json({ success: false, message: Msg.SOMETHING_WENT_WRONG });
        }

    } catch (error) {
        console.error("Send Package Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
