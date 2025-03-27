import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = "public/uploads/profile_images/";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `profile_${Date.now()}${path.extname(file.originalname)}`);
    },
});


export const upload = multer({ storage });