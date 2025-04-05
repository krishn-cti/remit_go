import db from "../config/db.js";

export const addUserPickupAddressByUser = (data) => {
    return new Promise((resolve, reject) => {
        db.query("INSERT INTO user_pickup_addresses SET ? ", data, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};


export const getUserPickupAddressByUser = (userId) => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM user_pickup_addresses WHERE user_id = ? ", [userId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};