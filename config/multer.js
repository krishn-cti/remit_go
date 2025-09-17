import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure upload directories exist
const uploadDirs = {
    profile: "public/uploads/profile_images/",
    dl: "public/uploads/dl_images/",
    rc: "public/uploads/rc_images/",
    packageImage: "public/uploads/packages/",
    reportImage: "public/uploads/reports/",
};

Object.values(uploadDirs).forEach((dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === "profile_image") cb(null, uploadDirs.profile);
        else if (file.fieldname === "dl_image") cb(null, uploadDirs.dl);
        else if (file.fieldname === "rc_image") cb(null, uploadDirs.rc);
        else if (file.fieldname === "image") cb(null, uploadDirs.packageImage);
        else if (file.fieldname === "report_image") cb(null, uploadDirs.reportImage);
        else cb(new Error("Unexpected field"), false);
    },
    filename: (req, file, cb) => {
        cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    },
});


// Export multer configuration for multiple file uploads
export const upload = multer({
    storage,
}).fields([
    { name: "profile_image", maxCount: 1 },
    { name: "dl_image", maxCount: 1 },
    { name: "rc_image", maxCount: 1 },
    { name: "image", maxCount: 1 },
    { name: "report_image", maxCount: 1 },
]);
