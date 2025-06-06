import db from "../config/db.js";

export const findDriverByEmail = (email) => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM drivers WHERE email = ?", [email], (err, result) => {
            if (err) return reject(err);
            if (result.length === 0) return resolve(null);
            resolve(result[0]);
        });
    });
};

export const createDriver = (driverData) => {
    return new Promise((resolve, reject) => {
        db.query("INSERT INTO drivers SET ?", driverData, (err, result) => {
            if (err) reject(err);
            resolve(result);
        });
    });
};

export const findDriverByUuid = async (uuid) => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM drivers WHERE driver_uuid = ?", [uuid], (err, result) => {
            if (err) reject(err);
            resolve(result[0]);
        });
    });
};

export const findDriverByActToken = (act_token) => {
    return new Promise((resolve, reject) => {
        db.query(
            "SELECT * FROM drivers WHERE act_token = ?",
            [act_token],
            (err, result) => {
                if (err) reject(err);
                if (result.length === 0) return resolve(null);
                resolve(result[0]);
            }
        );
    });
};

export const verifyDriverEmail = (act_token, email_verified_at, id) => {
    return new Promise((resolve, reject) => {
        db.query(
            "Update drivers set act_token = ?, email_verified_at = ? where id = ? ",
            [act_token, email_verified_at, id],
            (err, result) => {
                if (err) reject(err);
                resolve(result);
            }
        );
    });
};

export const getDriverById = (id) => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM drivers WHERE id = ?", [id], (err, result) => {
            if (err) reject(err);
            resolve(result[0]);
        });
    });
};

export const updateDriverProfile = async (id, driverData) => {
    const fields = Object.keys(driverData).map(key => `${key} = ?`).join(", ");
    const values = [...Object.values(driverData), id];

    try {
        const result = await db.promise().execute(`UPDATE drivers SET ${fields} WHERE id = ?`, values);
        return result[0];
    } catch (error) {
        throw error;
    }
};

export const fetchDriverPassword = (id) => {
    return new Promise((resolve, reject) => {
        db.query("SELECT password FROM drivers WHERE id = ?", [id], (err, result) => {
            if (err) return reject(err);
            if (result.length === 0) return resolve(null); 
            resolve(result[0]); 
        });
    });
};

export const updatePassword = (newPassword, show_password, id) => {
    return new Promise((resolve, reject) => {
        db.query(
            "UPDATE drivers SET password = ? , show_password = ? WHERE id = ?",
            [newPassword, show_password, id],
            (err, result) => {
                if (err) return reject(err);
                resolve(result); 
            }
        );
    });
};

export const createChangeRequest = (driverRequestData) => {
    return new Promise((resolve, reject) => {
        db.query("INSERT INTO driver_requests SET ?", driverRequestData, (err, result) => {
            if (err) reject(err);
            resolve(result);
        });
    });
};