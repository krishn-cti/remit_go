import { getUserPickupAddressByUser, createUserPickupAddress, updateUserPickupAddress, getUserPickupAddressById, deleteUserPickupAddress } from "../models/pickupAddressModel.js";
import dotenv from 'dotenv';
import os from "os";
import Msg from "../utils/message.js";
import { createPickupAndDropupSchema, deletePickupAndDropupSchema, updatePickupAndDropupSchema } from "../utils/validators/formValidation.validator.js";

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

// Get All users pickup address
export const getPickupAddresses = async (req, res) => {
    try {
        const userId = req.user.id;
        const pickups = await getUserPickupAddressByUser(userId);

        res.status(200).json({ success: true, message: Msg.DATA_RETRIEVED, data: pickups });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// create users pickup address
export const createPickupAddress = async (req, res) => {
    try {
        const { error } = createPickupAndDropupSchema.validate(req.body);
        if (error) {
            return res.status(403).json({ success: false, message: error.details[0].message });
        }

        const userId = req.user.id;
        const {
            location_name,
            house_number,
            address_line,
            country,
            state,
            zip_code,
            location,
            latitude,
            longitude,
            status
        } = req.body;

        const pickupAddressData = {
            user_id: userId,
            location_name,
            house_number,
            address_line,
            country,
            state,
            zip_code,
            location,
            latitude,
            longitude,
            status
        };

        const result = await createUserPickupAddress(pickupAddressData);

        if (result?.insertId) {
            return res.status(201).json({ success: true, message: Msg.PICKUP_ADDRESS_CREATED });
        } else {
            return res.status(500).json({ success: false, message: Msg.SOMETHING_WENT_WRONG });
        }

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// create users pickup address
export const updatePickupAddress = async (req, res) => {
    try {
        const { error } = updatePickupAndDropupSchema.validate(req.body);
        if (error) {
            return res.status(403).json({ success: false, message: error.details[0].message });
        }

        const userId = req.user.id;
        const {
            id,
            location_name,
            house_number,
            address_line,
            country,
            state,
            zip_code,
            location,
            latitude,
            longitude,
            status
        } = req.body;

        const pickupAddress = await getUserPickupAddressById(id);
        if (!pickupAddress) {
            return res.status(404).json({ success: false, message: Msg.PICKUP_ADDRESS_NOT_FOUND });
        }

        const pickupAddressData = {
            user_id: userId,
            location_name,
            house_number,
            address_line,
            country,
            state,
            zip_code,
            location,
            latitude,
            longitude,
            status
        };

        const result = await updateUserPickupAddress(id, pickupAddressData);

        if (result?.affectedRows > 0) {
            return res.status(200).json({ success: true, message: Msg.PICKUP_ADDRESS_UPDATED });
        } else {
            return res.status(500).json({ success: false, message: Msg.SOMETHING_WENT_WRONG });
        }

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// delete users pickup address
export const deletePickupAddress = async (req, res) => {
    try {
        const { error } = deletePickupAndDropupSchema.validate(req.body);
        if (error) {
            return res.status(403).json({ success: false, message: error.details[0].message });
        }

        const userId = req.user.id;
        const { id } = req.body;

        const result = await deleteUserPickupAddress(id, userId);

        if (result.affectedRows > 0) {
            return res.status(200).json({ success: true, message: Msg.PICKUP_ADDRESS_DELETED });
        } else {
            return res.status(404).json({ success: false, message: Msg.PICKUP_ADDRESS_NOT_FOUND });
        }

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
