const Razorpay = require("razorpay");

// THis will initialize the Razor Pay and create the Instance.
var instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

module.exports = instance;
