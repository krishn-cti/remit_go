import { findOrderByPackageNo, getPackages, getUsersPackageDetails, getUsersPackages, sendPackageToDriver } from "../models/packageModel.js";
import dotenv from 'dotenv';
import os from "os";
import Msg from "../utils/message.js";
import { sendPackageSchema } from "../utils/validators/formValidation.validator.js";

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

const generateUniqueId = async () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let packageNo;
    let isUnique = false;

    while (!isUnique) {
        packageNo = Array.from({ length: 6 }, () => characters[Math.floor(Math.random() * characters.length)]).join("");

        // Check if ID already exists in the database
        const existingOrder = await findOrderByPackageNo(packageNo);
        if (!existingOrder) {
            isUnique = true;
        }
    }

    return packageNo;
};

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

//  send package to driver
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
            package_no: await generateUniqueId(),
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
        return res.status(500).json({ success: false, message: error.message });
    }
};

// get user's packages
export const getMyPackages = async (req, res) => {
    const user_id = req.user.id;
    try {
        const packages = await getUsersPackages(user_id);

        const UserPackages = packages.map(item => ({
            ...item,
            driver_profile_image: item.driver_profile_image ? `${baseUrl}/uploads/profile_images/${item.driver_profile_image}` : null,
        }));

        res.status(200).json({ success: true, message: Msg.DATA_RETRIEVED, packages: UserPackages });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// get user's package details
export const getMyPackageDetails = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const packageData = await getUsersPackageDetails(id, userId);

        if (!packageData) {
            return res.status(404).json({ success: false, message: Msg.PACKAGE_NOT_FOUND });
        }

        packageData.driver_profile_image = packageData.driver_profile_image
            ? `${baseUrl}/uploads/profile_images/${packageData.driver_profile_image}`
            : null;

        res.status(200).json({ success: true, message: Msg.DATA_RETRIEVED, package: packageData });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

