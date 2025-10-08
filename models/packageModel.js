import db from "../config/db.js";

export const getPackages = () => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM packages ORDER BY id DESC", (err, results) => {
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
                d.driver_uuid,
                d.name AS driver_name,
                d.email AS driver_email,
                d.phone_number AS driver_phone,
                d.profile_image AS driver_profile_image,
                pda.location AS pickup_address,
                uda.location AS dropup_address
            FROM user_packages up
            LEFT JOIN drivers d ON up.driver_id = d.id
            LEFT JOIN user_pickup_addresses pda ON up.pickup_address_id = pda.id
            LEFT JOIN user_dropup_addresses uda ON up.dropup_address_id = uda.id
            WHERE up.user_id = ?
            ORDER BY up.updated_at DESC
        `;

        db.query(query, [userId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

export const getDriversPackages = (driverId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                up.*, 
                u.id AS user_id,
                u.name AS user_name,
                u.email AS user_email,
                u.phone_number AS user_phone,
                u.profile_image AS user_profile_image,
                pda.location AS pickup_address,
                uda.location AS dropup_address
            FROM user_packages up
            LEFT JOIN users u ON up.user_id = u.id
            LEFT JOIN user_pickup_addresses pda ON up.pickup_address_id = pda.id
            LEFT JOIN user_dropup_addresses uda ON up.dropup_address_id = uda.id
            WHERE up.driver_id = ?
            ORDER BY up.updated_at DESC
        `;

        db.query(query, [driverId], (err, results) => {
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

export const updatePackageDetails = (id, packageData) => {
    return new Promise((resolve, reject) => {
        db.query("UPDATE user_packages SET ? WHERE id = ?", [packageData, id], (err, result) => {
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

export const saveNotification = async ({
    send_from_id,
    send_to_id,
    package_no,
    title,
    body,
    notification_type,
    is_sender,
    is_receiver
}) => {
    return new Promise((resolve, reject) => {
        const query = `
        INSERT INTO notifications 
        (send_from_id, send_to_id, package_no, title, body, notification_type, is_sender, is_receiver)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            send_from_id,
            send_to_id,
            package_no,
            title,
            body,
            notification_type,
            is_sender,
            is_receiver
        ];

        db.query(query, values, (err, result) => {
            if (err) return reject(err);
            resolve(result.insertId);
        });
    });
};

export const deleteNotification = (notification_id) => {
    return new Promise((resolve, reject) => {
        db.query("DELETE FROM notifications WHERE id = ?", [notification_id], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
}

export const deleteAllDriverNotification = (driver_id) => {
    return new Promise((resolve, reject) => {
        db.query("DELETE FROM notifications WHERE is_receiver = 'driver' AND notification_action IN (2, 3) AND send_to_id = ?", [driver_id], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
}

export const deleteAllUserNotification = (user_id) => {
    return new Promise((resolve, reject) => {
        db.query("DELETE FROM notifications WHERE is_receiver = 'user' AND send_to_id = ?", [user_id], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
}