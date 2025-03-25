import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const auth = async(req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(403).json({ error: "Access Denied" });

    try {
        const verified = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
        
        // console.log({ verified })
        req.user = verified;
        next();
    } catch (error) {
        res.status(401).json({ error: "Invalid Token" });
    }
};