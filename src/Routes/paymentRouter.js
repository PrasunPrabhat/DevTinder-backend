const express = require("express");
const { userAuth } = require("../Middlewares/authMiddleware");
const paymentRouter = express.Router();

const razorPayInstance = require("../Config/RazorPayConfig");
const PaymentModel = require("../models/PaymentDB");
const { membershipAmount } = require("../utils/constants");
const {
  validateWebhookSignature,
} = require("razorpay/dist/utils/razorpay-utils");
const UserModel = require("../models/user");

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

paymentRouter.post("/payment/webhook", async (req, res) => {
  try {
    console.log("Web Hooks Called");
    const webhookSignature = req.get("X-Razorpay-Signature");
    console.log("Web Hook Signature : ", webhookSignature);

    const isWebHookValid = validateWebhookSignature(
      req.body.toString(),
      webhookSignature,
      process.env.RAZORPAY_WEBHOOK_SECRET
    );

    if (!isWebHookValid) {
      return res.status(400).json({ msg: "WebHook Signature is Invalid" });
    }

    // Update the Payment Status in DB
    const paymentDetails = JSON.parse(req.body).payload.payment.entity;

    const payment = await PaymentModel.findOne({
      orderId: paymentDetails.order_id,
    });
    if (!payment) {
      return res.status(404).json({ msg: "Payment not found" });
    }

    payment.status = paymentDetails.status;
    await payment.save();
    console.log("Payment saved");

    // Update the User as Preminum
    const user = await UserModel.findById(payment.userId);
    if (user) {
      user.isPreminum = true;
      user.membershipType = payment.notes.membershipType;
      await user.save();
      console.log("User updated");
    }

    // Return success response to razorpay
    return res.status(200).json({ msg: "Webhook processed successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: error.message });
  }
});
module.exports = paymentRouter;
