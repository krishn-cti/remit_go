import db from "../config/db.js";

export const findAdminByEmail = (email) => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM admins WHERE email = ?", [email], (err, result) => {
            if (err) return reject(err);
            if (result.length === 0) return resolve(null);
            resolve(result[0]);
        });
    });
};

export const getAdminById = (id) => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM admins WHERE id = ?", [id], (err, result) => {
            if (err) reject(err);
            resolve(result[0]);
        });
    });
};

export const updatePassword = (newPassword, show_password, id) => {
    return new Promise((resolve, reject) => {
        db.query(
            "UPDATE admins SET password = ? , show_password = ? WHERE id = ?",
            [newPassword, show_password, id],
            (err, result) => {
                if (err) return reject(err);
                resolve(result); 
            }
        );
    });
};

export const updateAdminProfile = async (id, adminData) => {
    const fields = Object.keys(adminData).map(key => `${key} = ?`).join(", ");
    const values = [...Object.values(adminData), id];

    try {
        const result = await db.promise().execute(`UPDATE admins SET ${fields} WHERE id = ?`, values);
        return result[0];
    } catch (error) {
        throw error;
    }
};

export const fetchAminPassword = (id) => {
    return new Promise((resolve, reject) => {
        db.query("SELECT password FROM admins WHERE id = ?", [id], (err, result) => {
            if (err) return reject(err);
            if (result.length === 0) return resolve(null);
            resolve(result[0]); 
        });
    });
};