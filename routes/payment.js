import express from 'express';
import { createCheckoutSession, successPayment } from '../controllers/paymentController.js';

const router = express.Router();

router.post('/create-checkout-session', createCheckoutSession);

router.get("/success", successPayment);

// router.post()



export default router;
