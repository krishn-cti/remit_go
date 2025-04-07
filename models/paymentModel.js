import db from "../config/db.js";

export const getUserPaymentMethodByUser = (userId) => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM user_payment_methods WHERE user_id = ? ", [userId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};


export const paymentinfo = (user_id) =>{
    return new Promise((resolve, reject) => {
    db.execute(
        "SELECT stripe_customer_id FROM users WHERE id = ?", [user_id],(err,results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}

export const paymentcustomerdetails = ( stripeCustomerId,user_id)=>{
    db.execute("UPDATE users SET stripe_customer_id = ? WHERE id = ?", [stripeCustomerId,user_id]);
}

export const paymentmethod = (paymentMethodId,customerId) =>{
 db.execute("UPDATE users SET stripe_payment_method_id = ? WHERE stripe_customer_id = ?",[paymentMethodId, customerId]);
}


  