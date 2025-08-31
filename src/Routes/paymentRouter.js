const express = require("express");
const { userAuth } = require("../Middlewares/authMiddleware");
const paymentRouter = express.Router();

const razorPayInstance = require("../Config/RazorPayConfig");
const PaymentModel = require("../models/PaymentDB");
const { membershipAmount } = require("../utils/constants");

paymentRouter.post("/payment/create", userAuth, async (req, res) => {
  try {
    const { membershipType } = req.body;
    const { firstName, lastName, emailId } = req.user;

    const order = await razorPayInstance.orders.create({
      amount: membershipAmount[membershipType] * 100,
      currency: "INR",
      receipt: "receipt#1",
      notes: {
        firstName,
        lastName,
        emailId,
        membershipType,
      },
    });

    // save in the My Database
    console.log(order);

    const payment = new PaymentModel({ 
      userId: req.user._id,
      orderId: order.id,
      status: order.status,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      notes: order.notes,
    });

    const savePayment = await payment.save();

    // Return back my order details to frontend
    res.json({ ...savePayment.toJSON(), keyId: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Payment creation failed" });
  }
});

module.exports = paymentRouter;
