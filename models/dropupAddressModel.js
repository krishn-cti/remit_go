import db from "../config/db.js";

export const getUserDropupAddressByUser = (userId) => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM user_dropup_addresses WHERE user_id = ? ", [userId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

export const getUserDropupAddressById = (dropupId) => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM user_dropup_addresses WHERE id = ? ", [dropupId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

export const createUserDropupAddress = (dropupAddressData) => {
    return new Promise((resolve, reject) => {
        db.query("INSERT INTO user_dropup_addresses SET ?", dropupAddressData, (err, result) => {
            if (err) reject(err);
            resolve(result);
        });
    });
};

export const updateUserDropupAddress = (dropup_id, dropupAddressData) => {
    return new Promise((resolve, reject) => {
        db.query("UPDATE user_dropup_addresses SET ? WHERE id = ?", [dropupAddressData, dropup_id], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

export const deleteUserDropupAddress = (dropup_id, user_id) => {
    return new Promise((resolve, reject) => {
        db.query("DELETE FROM user_dropup_addresses WHERE id = ? AND user_id = ?", [dropup_id, user_id], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
}