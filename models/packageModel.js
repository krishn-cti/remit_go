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

export const getUsersPackages = (userId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                up.*, 
                d.id AS driver_id,
                d.name AS driver_name,
                d.email AS driver_email,
                d.phone_number AS driver_phone,
                d.profile_image AS driver_profile_image
            FROM user_packages up
            LEFT JOIN drivers d ON up.driver_id = d.id
            WHERE up.user_id = ?
        `;

        db.query(query, [userId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

export const getUsersPackageDetails = (packageId, userId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                up.*, 
                d.id AS driver_id,
                d.name AS driver_name,
                d.email AS driver_email,
                d.phone_number AS driver_phone,
                d.profile_image AS driver_profile_image
            FROM user_packages up
            LEFT JOIN drivers d ON up.driver_id = d.id
            WHERE up.id = ? AND up.user_id = ?
        `;

        db.query(query, [packageId, userId], (err, results) => {
            if (err) return reject(err);
            resolve(results[0]);
        });
    });
};

export const findOrderByPackageNo = async (packageNo) => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM user_packages WHERE package_no = ?", [packageNo], (err, result) => {
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