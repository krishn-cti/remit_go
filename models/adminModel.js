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

// Get all users
export const getAllUsers = async () => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM users", (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

// export const getAllUsersBySearch = async(search) => {
//     return new Promise((resolve, reject) => {
//         db.query(`SELECT * FROM users WHERE name LIKE '%${search}%';`, (err, results) => {
//             if (err) return reject(err);
//             resolve(results);
//         });
//     });
// };

export const getAllUsersBySearch = async (search) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM users WHERE name LIKE ? OR email LIKE ?`;
        const searchPattern = `%${search}%`;

        db.query(query, [searchPattern, searchPattern], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};


// Update user by ID
export const updateUser = (id, userData) => {
    return new Promise((resolve, reject) => {
        db.query("UPDATE users SET ? WHERE id = ?", [userData, id], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

export const deleteUser = (id) => {
    return new Promise((resolve, reject) => {
        db.query("DELETE FROM users WHERE id=?", [id], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        })
    })
}

export const getAllDrivers = () => {
    return new Promise((resolve, reject) => {
        db.query("SELECT * FROM drivers", (err, result) => {
            if (err) return reject(err);
            resolve(result.reverse());
        });
    });
}


export const deleteDriver = (id) => {
    return new Promise((resolve, reject) => {
        db.query("DELETE FROM drivers WHERE id=?", [id], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        })
    })
}

export const updateUserStatus = async (userId, status) => {
    return new Promise((resolve, reject) => {
        db.query('UPDATE users SET status = ? WHERE id = ?', [status, userId], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    })
};

export const updateDriverStatus = async (driverId, status) => {
    return new Promise((resolve, reject) => {
        db.query('UPDATE drivers SET status = ? WHERE id = ?', [status, driverId], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    })
};