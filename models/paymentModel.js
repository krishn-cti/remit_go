// models/paymentModel.js
import db from "../config/db.js";

export const updateStripeCustomerId = async (userId, customerId) => {
    return new Promise((resolve, reject) => {
        db.query(
            "UPDATE users SET stripe_customer_id = ? WHERE id = ?",
            [customerId, userId],
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );
    });
};

// ─────────── Payment Methods ───────────
export const savePaymentMethod = async (data) => {
    return new Promise((resolve, reject) => {
        db.query("INSERT INTO user_payment_methods SET ?", data, (err, result) => {
            if (err) reject(err);
            resolve(result);
        });
    });
};

export const getUserCards = async (userId) => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM user_payment_methods WHERE user_id = ?", [userId], (err, result) => {
            if (err) reject(err);
            resolve(result);
        });
    });
};

export const resetDefaultCard = async (userId) => {
    return new Promise((resolve, reject) => {
        db.query(
            "UPDATE user_payment_methods SET is_default = 0 WHERE id = ?",
            [userId],
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );
    });
};

export const setDefaultCard = async (cardId, userId) => {
    await db.query("UPDATE user_payment_methods SET is_default = 1 WHERE id = ? AND user_id = ?", [cardId, userId]);
};

// ─────────── Payment History ───────────
export const savePaymentHistory = async (data) => {
    const sql = `
        INSERT INTO payment_history
        (user_id, amount, currency, stripe_payment_id, payment_method_type, status)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    return new Promise((resolve, reject) => {
        db.query(
            sql,
            [
                data.user_id,
                data.amount, // should be decimal(10,2), keep it like 208.00 (not in cents)
                data.currency,
                data.stripe_payment_id,
                data.payment_method_type,
                data.status,
            ],
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );
    });
};

export const getPaymentHistory = (userId) => {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT id, amount, currency, stripe_payment_id, status, created_at 
            FROM payment_history 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        `;
        db.query(sql, [userId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};