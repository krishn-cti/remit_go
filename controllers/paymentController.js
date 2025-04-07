import {
  getUserPaymentMethodByUser,
  paymentcustomerdetails,
  paymentinfo,
  paymentmethod,
} from "../models/paymentModel.js";
import dotenv from "dotenv";
import os from "os";
import Msg from "../utils/message.js";

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

    res.status(200).json({
      success: true,
      message: Msg.DATA_RETRIEVED,
      data: paymentMethods,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
import "dotenv/config";
import express from "express";
import cors from "cors";
import Stripe from "stripe";
import { updateUserProfile } from "../models/userModel.js";
import { updateUser } from "../models/adminModel.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(express.json());
app.use(cors());

// Create Checkout Session
// export const createCheckoutSession = async (req, res) => {
//   try {
//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ["card"],
//       line_items: [
//         {
//           price_data: {
//             currency: "usd",
//             product_data: {
//               name: "Your Product",
//             },
//             unit_amount: 5000,
//           },
//           quantity: 1,
//         },
//       ],
//       mode: "payment",
//       success_url: `http://localhost:8000/api/payment/success`,
//       // cancel_url: `${YOUR_DOMAIN}/api/payment-failed`,
//     });

//     res.json({ url: session.url });
//   } catch (error) {
//     console.error("Error creating checkout session:", error);
//     res.status(500).json({ error: "Failed to create checkout session" });
//   }
// };

export const createCheckoutSession = async (req, res) => {
    try {
      const { user_id, email, amount } = req.body;
      if (!user_id || !email || !amount) {
        return res.status(400).json({ error: "Missing required fields" });
      }
  
      const user = await paymentinfo(user_id);
      console.log("paymentinfo response:", user);
  
      // Get or create Stripe customer
      let stripeCustomerId = user?.stripe_customer_id;
      if (!stripeCustomerId || stripeCustomerId === 0) {
        const customer = await stripe.customers.create({ email });
        stripeCustomerId = customer.id;
  
        // Update user in DB
        await updateUser(user_id, {
          stripe_customer_id: stripeCustomerId,
        });
      }
  
      // Now that stripeCustomerId is safely declared and set, use it
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        customer: stripeCustomerId,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Your Product",
              },
              unit_amount: amount * 100,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `http://localhost:8000/api/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `http://localhost:8000/api/payment-failed`,
      });
  
      console.log(session);
      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  };
  
  

// Success API
export const successPayment = async (req, res) => {
  try {
    const session_id = req.query.session_id;
    if (!session_id) {
      return res.status(400).json({ error: "Missing session_id" });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);

    const response = {
      success: true,
      message: "Payment Successful",
      paymentDetails: {
        sessionId: session.id,
        amount: session.amount_total / 100,
        currency: session.currency.toUpperCase(),
        customerName: session.customer_details?.name || "N/A",
        customerEmail: session.customer_details?.email || "N/A",
        address: session.customer_details?.address || {},
        paymentStatus: session.payment_status,
        paymentIntentId: session.payment_intent,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error processing payment success:", error);
    res.status(500).json({ error: "Failed to process payment success" });
  }
};

// // Failure API
// app.get("/api/payment-failed", (req, res) => {
//     res.json({ error: "Payment Failed or Cancelled" });
// });
