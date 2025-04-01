import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import Msg from "../utils/message.js"

dotenv.config();

export const driverAuth = async(req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(403).json({ error: Msg.ACCESS_DENIED });

    try {
        const verified = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
                req.user= verified;
        next();
    } catch (error) {
        res.status(401).json({ error: Msg.INVALID_TOKEN});
    }
};