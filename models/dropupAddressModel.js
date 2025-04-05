import db from "../config/db.js";

export const getUserDropupAddressByUser = (userId) => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM user_dropup_addresses WHERE user_id = ? ", [userId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};