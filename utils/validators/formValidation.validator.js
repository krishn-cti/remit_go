import Joi from "joi";

export const sendPackageSchema = Joi.object({
    pickup_address_id: Joi.number()
        .required()
        .messages({ 'any.required': 'Pickup address ID is required' }),

    dropup_address_id: Joi.number()
        .required()
        .messages({ 'any.required': 'Dropup address ID is required' }),

    package_id: Joi.string()
        .pattern(/^(\d+,)*\d+$/)
        .required()
        .messages({
            'string.pattern.base': 'Package ID must be a comma-separated list of numbers',
            'any.required': 'Package ID is required'
        }),

    package_qty: Joi.string()
        .pattern(/^(\d+,)*\d+$/)
        .required()
        .messages({
            'string.pattern.base': 'Package quantity must be a comma-separated list of numbers',
            'any.required': 'Package quantity is required'
        }),

    amount: Joi.number()
        .required()
        .messages({ 'any.required': 'Amount is required' }),

    payment_method_id: Joi.number()
        .required()
        .messages({ 'any.required': 'Payment method ID is required' }),

    status: Joi.number()
        .valid(0, 1, 2)
        .required()
        .messages({
            "any.required": "Status is required",
            "any.only": "Status must be either 0, 1, or 2",
            "number.base": "Status must be a number"
        })
}).custom((value, helpers) => {
    const ids = value.package_id.split(",");
    const qtys = value.package_qty.split(",");

    if (ids.length !== qtys.length) {
        return helpers.message("Package ID and Package quantity must have the same length");
    }
    return value;
});

export const createPickupAndDropupSchema = Joi.object({
    location_name: Joi.string().required().messages({
        "any.required": "Location name is required",
        "string.empty": "Location name cannot be empty"
    }),
    house_number: Joi.string().required().messages({
        "any.required": "House number is required",
        "string.empty": "House number cannot be empty"
    }),
    address_line: Joi.string().required().messages({
        "any.required": "Address line is required",
        "string.empty": "Address line cannot be empty"
    }),
    country: Joi.string().required().messages({
        "any.required": "Country is required",
        "string.empty": "Country cannot be empty"
    }),
    state: Joi.string().required().messages({
        "any.required": "State is required",
        "string.empty": "State cannot be empty"
    }),
    zip_code: Joi.string().required().messages({
        "any.required": "Zip code is required",
        "string.empty": "Zip code cannot be empty"
    }),
    location: Joi.string().required().messages({
        "any.required": "Location is required",
        "string.empty": "Location cannot be empty"
    }),
    latitude: Joi.number().messages({
        "number.base": "Latitude must be a number"
    }),
    longitude: Joi.number().messages({
        "number.base": "Longitude must be a number"
    }),
    status: Joi.number().valid(0, 1).optional().messages({
        "any.only": "Status must be 0 or 1"
    })
});

export const updatePickupAndDropupSchema = Joi.object({
    id: Joi.number().required().messages({
        "any.required": "ID is required",
        "number.base": "ID must be a number"
    }),
    location_name: Joi.string().optional().messages({
        "string.empty": "Location name cannot be empty"
    }),
    house_number: Joi.string().optional().messages({
        "string.empty": "House number cannot be empty"
    }),
    address_line: Joi.string().optional().messages({
        "string.empty": "Address line cannot be empty"
    }),
    country: Joi.string().optional().messages({
        "string.empty": "Country cannot be empty"
    }),
    state: Joi.string().optional().messages({
        "string.empty": "State cannot be empty"
    }),
    zip_code: Joi.string().optional().messages({
        "string.empty": "Zip code cannot be empty"
    }),
    location: Joi.string().optional().messages({
        "string.empty": "Location cannot be empty"
    }),
    latitude: Joi.number().optional().messages({
        "number.base": "Latitude must be a number"
    }),
    longitude: Joi.number().optional().messages({
        "number.base": "Longitude must be a number"
    }),
    status: Joi.number().valid(0, 1).optional().messages({
        "any.only": "Status must be 0 or 1"
    })
});

export const deletePickupAndDropupSchema = Joi.object({
    id: Joi.number().required().messages({
        'any.required': 'ID is required',
        'number.base': 'ID must be a number'
    })
});

export const changeStatusSchema = Joi.object({
    id: Joi.number().required().messages({
        'any.required': 'ID is required',
        'number.base': 'ID must be a number'
    }),
    status: Joi.number().valid(0, 1).required().messages({
        "any.required": "Status is required",
        "any.only": "Status must be 0 or 1"
    })
});

export const createPackageSchema = Joi.object({
    package_name: Joi.string().required().messages({
        "any.required": "Package name is required",
        "string.empty": "Package name cannot be empty"
    }),
    length: Joi.number().required().messages({
        "any.required": "Length is required",
        "number.base": "Length must be a number"
    }),
    width: Joi.number().required().messages({
        "any.required": "Width is required",
        "number.base": "Width must be a number"
    }),
    height: Joi.number().optional().messages({
        "number.base": "Width must be a number"
    }),
    weight: Joi.number().required().messages({
        "any.required": "Weight is required",
        "number.base": "Weight must be a number"
    }),
    base_fare: Joi.number().required().messages({
        "any.required": "Base fare is required",
        "number.base": "Base fare must be a number"
    }),
    per_minute_fare: Joi.number().required().messages({
        "any.required": "Per minute fare is required",
        "number.base": "Per minute fare must be a number"
    }),
    per_kilometer_fare: Joi.number().required().messages({
        "any.required": "Per kilometer fare is required",
        "number.base": "Per kilometer fare must be a number"
    }),
    cancellation_fee: Joi.number().required().messages({
        "any.required": "Cancellation fee is required",
        "number.base": "Cancellation fee must be a number"
    }),
    description: Joi.string().required().messages({
        "any.required": "Description is required",
        "string.empty": "Description cannot be empty"
    }),
    status: Joi.number().valid(0, 1).optional().messages({
        "any.only": "Status must be 0 or 1"
    })
});

export const updatePackageSchema = Joi.object({
    id: Joi.number().required().messages({
        "any.required": "ID is required",
        "number.base": "ID must be a number"
    }),
    package_name: Joi.string().messages({
        "string.empty": "Package name cannot be empty"
    }),
    length: Joi.number().messages({
        "number.base": "Length must be a number"
    }),
    width: Joi.number().messages({
        "number.base": "Width must be a number"
    }),
    height: Joi.number().messages({
        "number.base": "Height must be a number"
    }),
    weight: Joi.number().messages({
        "number.base": "Weight must be a number"
    }),
    base_fare: Joi.number().messages({
        "number.base": "Base fare must be a number"
    }),
    per_minute_fare: Joi.number().messages({
        "number.base": "Per minute fare must be a number"
    }),
    per_kilometer_fare: Joi.number().messages({
        "number.base": "Per kilometer fare must be a number"
    }),
    cancellation_fee: Joi.number().messages({
        "number.base": "Cancellation fee must be a number"
    }),
    description: Joi.string().messages({
        "string.empty": "Description cannot be empty"
    }),
    status: Joi.number().valid(0, 1).messages({
        "any.only": "Status must be 0 or 1"
    })
});
