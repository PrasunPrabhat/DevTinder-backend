// ! 1. Connect the Database to the Applications using the Mongoose....!
const mongoose = require("mongoose");

//! 2. Connect with the Cluster.../ but this is not a good way to connect the database.
const connectDB = async () => {
  await mongoose.connect(process.env.URI);
};

module.exports = connectDB;
