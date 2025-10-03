import { getPaymentHistory, getUserCards, resetDefaultCard, savePaymentHistory, savePaymentMethod, setDefaultCard, updateStripeCustomerId } from "../models/paymentModel.js";
import dotenv from 'dotenv';
import os from "os";
import Msg from "../utils/message.js";
import stripe from "../utils/stripe.js";
import { getUserById } from "../models/userModel.js";

dotenv.config();

const getLocalIp = () => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
            if (net.family === "IPv4" && !net.internal) {
                return net.address;
            }
        }
    }
    return "localhost";
};

let localIp = getLocalIp();
let baseUrl = `http://${localIp}:${process.env.PORT}`;

// Get All users payment methods
export const getPaymentMethods = async (req, res) => {
    try {
        const userId = req.user.id;
        const paymentMethods = await getUserPaymentMethodByUser(userId);

        res.status(200).json({ success: true, message: Msg.DATA_RETRIEVED, data: paymentMethods });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// save card details
export const saveCard = async (req, res) => {
    try {
        const { userId, paymentMethodId, billingName } = req.body;

        // Get user & check Stripe customer
        const userInfo = await getUserById(userId);
        let customerId = userInfo.stripe_customer_id;

        if (!customerId) {
            const customer = await stripe.customers.create({ name: billingName, email: userInfo.email });
            customerId = customer.id;

            let updateData = {
                stripe_customer_id: customerId
            };
            await updateUserProfile(userId, updateData);
        }

        // Attach card to Stripe customer
        await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });

        // Set as default
        await stripe.customers.update(customerId, {
            invoice_settings: { default_payment_method: paymentMethodId },
        });

        // Get card details
        const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
        const card = paymentMethod.card;

        // Save in DB
        await saveCardDetails({
            user_id: userId,
            stripe_payment_method_id: paymentMethodId,
            payment_type: card.funding === "credit" ? "credit_card" : "debit_card",
            card_last4: card.last4,
            card_brand: card.brand,
            expiry_month: card.exp_month,
            expiry_year: card.exp_year,
            billing_name: billingName,
            is_default: 1,
        });

        res.json({ success: true, message: "Card saved successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// export const saveCard = async (req, res) => {
//     try {
//         const { userId, paymentMethodId, billingName } = req.body;

//         // 1. Get user
//         const user = await getUserById(userId);
//         if (!user) {
//             return res.status(404).json({ success: false, message: "User not found" });
//         }

//         // 2. Ensure Stripe customer
//         let customerId = user.stripe_customer_id;
//         if (!customerId) {
//             const customer = await stripe.customers.create({
//                 name: billingName,
//                 email: user.email,
//             });
//             customerId = customer.id;

//             // Update DB
//             await updateStripeCustomerId(userId, customerId);

//             // Update local user object to avoid undefined later
//             user.stripe_customer_id = customerId;
//         }

//         // 3. Retrieve payment method from Stripe
//         const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
//         const card = paymentMethod.card;

//         // 4. Check if the card belongs to another customer
//         if (paymentMethod.customer && paymentMethod.customer !== customerId) {
//             return res.status(400).json({
//                 success: false,
//                 message: "This card is already linked to another account.",
//             });
//         }

//         // 5. Attach card only if not already attached
//         if (!paymentMethod.customer) {
//             await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
//         }

//         // 6. Set as default in Stripe
//         await stripe.customers.update(customerId, {
//             invoice_settings: { default_payment_method: paymentMethodId },
//         });

//         // 7. Reset default card in DB
//         await resetDefaultCard(userId);

//         // 8. Check if card already exists in DB
//         const existingCards = await getUserCards(userId);
//         const alreadySaved = existingCards.find(
//             (c) => c.stripe_payment_method_id === paymentMethodId
//         );

//         // 9. Save card in DB if not already saved
//         if (!alreadySaved) {
//             await savePaymentMethod({
//                 user_id: userId,
//                 stripe_payment_method_id: paymentMethodId,
//                 payment_type: card.funding === "credit" ? "credit_card" : "debit_card",
//                 card_last4: card.last4,
//                 card_brand: card.brand,
//                 expiry_month: card.exp_month,
//                 expiry_year: card.exp_year,
//                 billing_name: billingName,
//                 is_default: 1,
//             });
//         }

//         return res.json({ success: true, message: "Card saved successfully" });
//     } catch (err) {
//         console.error("saveCard error:", err);
//         return res.status(500).json({ success: false, message: err.message });
//     }
// };

// ─────────── Get Cards ───────────
export const getCards = async (req, res) => {
    try {
        const { userId } = req.params;
        const cards = await getUserCards(userId);
        res.json({ success: true, cards });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────── Set Default Card ───────────
export const updateDefaultCard = async (req, res) => {
    try {
        const { userId, cardId } = req.body;

        await resetDefaultCard(userId);
        await setDefaultCard(cardId, userId);

        res.json({ success: true, message: "Default card updated" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─────────── Make Payment ───────────
export const createPayment = async (req, res) => {
    try {
        const { user_id, amount, currency } = req.body;
        const stripeAmount = Math.round(parseFloat(amount) * 100);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: stripeAmount,
            currency,
            payment_method_types: ["card"]
        });

        await savePaymentHistory({
            user_id,
            amount,
            currency,
            stripe_payment_id: paymentIntent.id,
            payment_method_type: paymentIntent.payment_method_types[0],
            status: paymentIntent.status,
        });

        res.json({ success: true, paymentIntent });
    } catch (err) {
        console.error("Payment error:", err);
        res.status(400).json({ success: false, message: err.message });
    }
};

// ─────────── Get Payment History ───────────
export const paymentHistory = async (req, res) => {
    try {
        const userId = req.params.userId;

        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }

        const payments = await getPaymentHistory(userId);

        res.json({ success: true, payments });
    } catch (err) {
        console.error("Payment History Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch payment history" });
    }
};

// make payment


// get payment history
