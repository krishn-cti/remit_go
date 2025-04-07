import Joi from 'joi';

export const sendPackageSchema = Joi.object({
    pickup_address_id: Joi.number()
        .required()
        .messages({ 'any.required': 'pickup_address_id is required' }),

    dropup_address_id: Joi.number()
        .required()
        .messages({ 'any.required': 'dropup_address_id is required' }),

    package_id: Joi.string()
        .pattern(/^(\d+,)*\d+$/)
        .required()
        .messages({
            'string.pattern.base': 'package_id must be a comma-separated list of numbers',
            'any.required': 'package_id is required'
        }),

    package_qty: Joi.string()
        .pattern(/^(\d+,)*\d+$/)
        .required()
        .messages({
            'string.pattern.base': 'package_qty must be a comma-separated list of numbers',
            'any.required': 'package_qty is required'
        }),

    amount: Joi.number()
        .required()
        .messages({ 'any.required': 'amount is required' }),

    payment_method_id: Joi.number()
        .required()
        .messages({ 'any.required': 'payment_method_id is required' }),

    status: Joi.number()
        .valid(0, 1)
        .required()
        .messages({
            'any.required': 'status is required',
            'any.only': 'status must be either 0 or 1'
        })
}).custom((value, helpers) => {
    if (value.package_id.length !== value.package_qty.length) {
        return helpers.message("package_id and package_qty must have the same length");
    }
    return value;
});
