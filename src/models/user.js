// ! Create the user Schema using the Mongoose
// !Step 1 :  Defining the Schema Creating a Schema.
const mongoose = require("mongoose");
const validator = require("validator");
const JWT = require("jsonwebtoken");
const bcrypt = require("bcrypt");

// Schema
const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      maxLength: 50,
    },
    lastName: {
      type: String,
    },
    emailId: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error("Invalid Email Address" + value);
        }
      },
    },
    password: {
      type: String,
      required: true,
      // select: false,
      validate(value) {
        if (!validator.isStrongPassword(value)) {
          throw new Error("Enter a Strong Password: " + value);
        }
      },
    },
    age: {
      type: Number,
    },
    gender: {
      type: String,
      validate(value) {
        const gender = value.toLowerCase();
        if (!["male", "female", "others"].includes(gender)) {
          throw new Error("Gender is not Valid!");
        }
      },
    },
    isPreminum: {
      type: Boolean,
      default: false,
    },
    membershipType: {
      type: String,
    },
    photoUrl: {
      type: String,
      default:
        "https://res.cloudinary.com/dzwclh36q/image/upload/v1744715220/user_profiles/dlm4ufwwylpns9cx1sqs.png",
      validate(value) {
        if (!validator.isURL(value)) {
          throw new Error("Invalid Photo URL " + value);
        }
      },
    },
    about: {
      type: String,
      default: "This is the Default about of the User",
    },
    skills: {
      type: [String],
    },
  },
  { timestamps: true }
);

userSchema.index({ firstName: 1, lastName: 1 });

userSchema.methods.getJWT = async function () {
  const user = this;

  const token = await JWT.sign({ _id: user._id }, "Prasunkir@21", {
    expiresIn: "7d",
  });

  return token;
};

userSchema.methods.validatePassword = async function (passwordInputByUser) {
  const user = this;
  const HashedPassword = user.password;

  const isPasswordValid = await bcrypt.compare(
    passwordInputByUser,
    HashedPassword
  );

  return isPasswordValid;
};

// ! Step 2 : Create a Mongoose User Models
const UserModel = mongoose.model("User", userSchema);

module.exports = UserModel;

// ! Create the APIS to interact with the database...in the server.js File
