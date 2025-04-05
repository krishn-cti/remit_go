import db from "../config/db.js";

export const getPackages = () => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM packages", (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

export const getPackageById = (package_id) => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM packages WHERE id = ?",package_id ,(err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

export const sendPackageToDriver = (packageData) => {
    return new Promise((resolve, reject) => {
        db.query("INSERT INTO user_packages SET ?", packageData, (err, result) => {
            if (err) reject(err);
            resolve(result);
        });
    });
};