import { addUserPickupAddressByUser, getUserPickupAddressByUser } from "../models/pickupAddressModel.js";
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

export const addPickupAddress = async(req,res)=>{
    try {   
        const{location_name	, house_number,status, address_line,country, state, zip_code,location, latitude, longitude} = req.body
        console.log("req.body: ", req.body)
    const data = {
        location_name, 
        house_number, 
        address_line,
        country,   
        state, 
        zip_code,
        location, 
        latitude, 
        longitude,
        status,
        user_id:req.user.id
    }
    console.log("data: ", data)
     const savedInfo = await addUserPickupAddressByUser(data);
     console.log("savedInfo:", savedInfo)
     res.status(200).json({ success: true, message: Msg.DATA_RETRIEVED, data: savedInfo });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}






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