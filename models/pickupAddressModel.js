import db from "../config/db.js";

export const getUserPickupAddressByUser = (userId) => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM user_pickup_addresses WHERE user_id = ? ", [userId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

export const getUserPickupAddressById = (pickupId) => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM user_pickup_addresses WHERE id = ? ", [pickupId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

export const createUserPickupAddress = (pickupAddressData) => {
    return new Promise((resolve, reject) => {
        db.query("INSERT INTO user_pickup_addresses SET ?", pickupAddressData, (err, result) => {
            if (err) reject(err);
            resolve(result);
        });
    });
};

export const updateUserPickupAddress = (pickup_id, pickupAddressData) => {
    return new Promise((resolve, reject) => {
        db.query("UPDATE user_pickup_addresses SET ? WHERE id = ?", [pickupAddressData, pickup_id], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

export const deleteUserPickupAddress = (pickup_id, user_id) => {
    return new Promise((resolve, reject) => {
        db.query("DELETE FROM user_pickup_addresses WHERE id = ? AND user_id = ?", [pickup_id, user_id], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
}