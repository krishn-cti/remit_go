import db from "../config/db.js";

export const getUserPaymentMethodByUser = (userId) => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM user_payment_methods WHERE user_id = ? ", [userId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};