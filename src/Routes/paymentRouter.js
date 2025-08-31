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
      JSON.stringify(req.body),
      webhookSignature,
      process.env.RAZORPAY_WEBHOOK_SECRET
    );

    if (!isWebHookValid) {
      return res.status(400).json({ msg: "WebHook Signature is Invalid" });
    }

    // Update the Payment Status in DB
    const paymentDetails = req.body.payload.payment.entity;

    const payment = await PaymentModel.findOne({
      orderId: paymentDetails.order_id,
    });
    payment.status = paymentDetails.status;
    await payment.save();
    console.log("payment saved");

    // Update the User as Preminum
    const user = await UserModel.findOne({ _id: payment.userId });
    user.isPreminum = true;
    user.membershipType = payment.notes.membershipType;

    await user.save();
    console.log("User Saved");

    // payment.captured
    // if (req.body.event == "payment.captured") {
    // }
    // // payment.failed
    // if (req.body.event == "payment.failed") {
    // }

    // Return success response to razorpay
    return res.status(200).json({ msg: "WebHook received successfully" });
  } catch (error) {
    return res.status(500).json({ msg: error.message });
  }
});

paymentRouter.get("/premium/verify", userAuth, async (req, res) => {
  try {
    const user = req.user;

    if (user.isPreminum) {
      return res.json({
        isPreminum: true,
        membershipType: user.membershipType,
      });
    }

    return res.json({ isPreminum: false });
  } catch (error) {
    console.error("Error verifying premium status:", error);
    return res
      .status(500)
      .json({ error: "Server error while verifying premium status" });
  }
});

module.exports = paymentRouter;
