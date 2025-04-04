import { body, validationResult } from 'express-validator';
import { vallidationErrorHandle } from '../utils/responseHandler.js';


 const validateDriverSignup = [
    body('name')
        .notEmpty().withMessage('The name field cannot be empty. Please provide your full name.')
        .isLength({ min: 3, max: 50 }).withMessage('Name must be between 3 and 50 characters.'),

    body('email')
        .notEmpty().withMessage('The email field cannot be empty. Please provide your email address.')
        .isEmail().withMessage('Please enter a valid email address (e.g., example@example.com).'),

    body('password')
        .notEmpty().withMessage('The password field cannot be empty. Please provide a password.')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
        .matches(/\d/).withMessage('Password must contain at least one digit.')
        .matches(/[!@#$%^&*]/).withMessage('Password must include at least one special character (e.g., !@#$%^&*).')
        .matches(/[A-Z]/).withMessage('Password must include at least one uppercase letter.'),

    body('phone_number')
        .notEmpty().withMessage('The phone number field cannot be empty. Please provide your phone number.')
        .isMobilePhone().withMessage('Please enter a valid phone number.'),

    body('country_code')
        .notEmpty().withMessage('The country code field cannot be empty. Please provide a valid country code.')
        .matches(/^\+\d{1,4}$/).withMessage('Country code must start with "+" followed by 1 to 4 digits (e.g., +1, +91).'),

    body('dl_number')
        .notEmpty().withMessage('The driving license number field cannot be empty. Please provide your DL number.')
        .isLength({ min: 6, max: 20 }).withMessage('Driving license number must be between 6 and 20 characters.')
        .matches(/^[A-Za-z0-9]+$/).withMessage('Driving license number can only contain letters and numbers.'),

    body('rc_number')
        .notEmpty().withMessage('The RC number field cannot be empty. Please provide your RC number.')
        .isLength({ min: 6, max: 20 }).withMessage('RC number must be between 6 and 20 characters.')
        .matches(/^[A-Za-z0-9]+$/).withMessage('RC number can only contain letters and numbers.'),

];

 const validateLogin = [
    body('email')
        .notEmpty().withMessage('The email field cannot be empty. Please provide your email address.')
        .isEmail().withMessage('Please enter a valid email address (e.g., example@example.com).'),

    body('password')
        .notEmpty().withMessage('The password field cannot be empty. Please enter your password.')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.'),

];

 const validateDriverUpdateProfile = [
    body('name')
        .optional()
        .isLength({ min: 3, max: 50 }).withMessage('Name must be between 3 and 50 characters long.')
        .matches(/^[a-zA-Z\s]+$/).withMessage('Name can only contain letters and spaces.'),

    body('phone_number')
        .optional()
        .isMobilePhone().withMessage('Please enter a valid phone number.'),

    body('country_code')
        .optional()
        .isLength({ min: 1, max: 5 }).withMessage('Country code must be between 1 and 5 characters.'),

    body('dl_number')
        .optional()
        .isAlphanumeric().withMessage('Driving license number must be alphanumeric.'),

    body('rc_number')
        .optional()
        .isAlphanumeric().withMessage('RC number must be alphanumeric.'),

];

 const validateChangePassword = [
    body('old_password')
        .notEmpty().withMessage('Old password is required.'),

    body('new_password')
        .notEmpty().withMessage('New password is required.')
        .isLength({ min: 8 }).withMessage('New password must be at least 8 characters long.')
        .matches(/\d/).withMessage('New password must contain at least one digit.')
        .matches(/[!@#$%^&*]/).withMessage('New password must include at least one special character (e.g., !@#$%^&*).')
        .matches(/[A-Z]/).withMessage('New password must include at least one uppercase letter.'),

];

 const validateForgotPassword = [
    body('email')
        .notEmpty().withMessage('Email is required.')
        .isEmail().withMessage('Please enter a valid email address.'),

];

 const validateDriverChangeDocumentRequest = [
    body('document_type')
        .notEmpty().withMessage('Document type is required.')
        .isIn(['dl', 'rc', 'insurance']).withMessage('Invalid document type. Allowed values: dl, rc, insurance.'),

    body('reason')
        .notEmpty().withMessage('Reason for change is required.')
        .isLength({ min: 10, max: 500 }).withMessage('Reason must be between 10 and 500 characters.'),

];


const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return vallidationErrorHandle(res, errors);
    }
    next();
};


export {
    validateDriverSignup,
    validateLogin,
    validateDriverUpdateProfile,
    validateChangePassword,
    validateForgotPassword,
    validateDriverChangeDocumentRequest,

    handleValidationErrors
};



