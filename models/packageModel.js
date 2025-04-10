import db from "../config/db.js";

export const getPackages = () => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM packages", (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

export const getPackageById = (id) => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM packages WHERE id = ?", [id], (err, result) => {
            if (err) reject(err);
            resolve(result[0]);
        });
    });
};

export const sendPackageToDriver = (packageData) => {
    return new Promise((resolve, reject) => {
        db.query("INSERT INTO user_packages SET ?", packageData, (err, result) => {
            if (err) reject(err);
            resolve(result);
        });
    });
};

export const createPackage = async (packageData) => {
    return new Promise((resolve, reject) => {
        db.query('INSERT INTO packages SET ?', packageData, (err, result) => {
            if (err) reject(err);
            resolve(result);
        })
    })
}

export const updatePackage = (id, packageData) => {
    return new Promise((resolve, reject) => {
        db.query("UPDATE packages SET ? WHERE id = ?", [packageData, id], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

export const deletePackageData = (id) => {
    return new Promise((resolve, reject) => {
        db.query("DELETE FROM packages WHERE id=?", [id], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        })
    })
};