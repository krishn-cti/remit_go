import db from "../config/db.js";

export const findUserByEmail = (email) => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM users WHERE email = ?", [email], (err, result) => {
            if (err) return reject(err);
            if (result.length === 0) return resolve(null);
            resolve(result[0]);
        });
    });
};

export const createUser = (userData) => {
    return new Promise((resolve, reject) => {
        db.query("INSERT INTO users SET ?", userData, (err, result) => {
            if (err) reject(err);
            resolve(result);
        });
    });
};

export const findUserByActToken = (act_token) => {
    return new Promise((resolve, reject) => {
        db.query(
            "SELECT * FROM users WHERE act_token = ?",
            [act_token],
            (err, result) => {
                if (err) reject(err);
                if (result.length === 0) return resolve(null);
                resolve(result[0]);
            }
        );
    });
};

export const verifyUserEmail = (act_token, email_verified_at, id) => {
    return new Promise((resolve, reject) => {
        db.query(
            "Update users set act_token = ?, email_verified_at = ? where id = ? ",
            [act_token, email_verified_at, id],
            (err, result) => {
                if (err) reject(err);
                resolve(result);
            }
        );
    });
};

export const getUserById = (id) => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM users WHERE id = ?", [id], (err, result) => {
            if (err) reject(err);
            resolve(result[0]);
        });
    });
};

export const updateUserProfile = async (id, userData) => {
    const fields = Object.keys(userData).map(key => `${key} = ?`).join(", ");
    const values = [...Object.values(userData), id];

    try {
        const result = await db.promise().execute(`UPDATE users SET ${fields} WHERE id = ?`, values);
        return result[0];
    } catch (error) {
        throw error;
    }
};

export const fetchUserPassword = (id) => {
    return new Promise((resolve, reject) => {
        db.query("SELECT password FROM users WHERE id = ?", [id], (err, result) => {
            if (err) return reject(err);
            if (result.length === 0) return resolve(null);
            resolve(result[0]); 
        });
    });
};

export const updatePassword = (newPassword, show_password, id) => {
    return new Promise((resolve, reject) => {
        db.query(
            "UPDATE users SET password = ? , show_password = ? WHERE id = ?",
            [newPassword, show_password, id],
            (err, result) => {
                if (err) return reject(err);
                resolve(result); 
            }
        );
    });
};

export const getPickup = (id) => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM user_pickup_addresses WHERE user_id = ?", [id], (err, result) => {
            if (err) reject(err);
            resolve(result);
        });
    });
}


export const getDropup = (id) =>{
    return new Promise((resolve, reject)=>{
        db.query("SELECT * FROM user_dropup_addresses WHERE user_id = ?",[id],(err,result) =>{
            if(err) reject(err);
            resolve (result);
        })
    })
}

export const getPackagesModel = ()=>{
    return new Promise((resolve, reject)=>{
        db.query("SELECT * FROM packages",(err,result)=>{
            if(err) reject(err);
            resolve (result);
        }) 
    })
}

export const getPaymentModel = (id) =>{
    return new Promise((resolve,reject)=>{
        db.query("SELECT * FROM user_payment_methods WHERE user_id = ?",[id],(err,result) =>{
            if(err) reject(err);
            resolve (result);
        })
    })
}