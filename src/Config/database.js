// ! 1. Connect the Database to the Applications using the Mongoose....!
const mongoose = require("mongoose");
const { URI } = require("../Constants/links");

//! 2. Connect with the Cluster.../ but this is not a good way to connect the database.
const connectDB = async () => {
  await mongoose.connect(URI);
};

module.exports = connectDB;
