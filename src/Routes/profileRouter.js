const express = require("express");
const { userAuth } = require("../Middlewares/authMiddleware");
const { validateEditProfileData } = require("../utils/Validations");
const validator = require("validator");
const bcrypt = require("bcrypt");
const parser = require("../utils/multerCloudinary");

// ! Creating the Express Router
const profileRouter = express.Router();

//! Get the User Profile API Read via the Cookie with Middleware
profileRouter.get("/profile/view", userAuth, async (req, res) => {
  try {
    const user = req.user;
    res.send(user);
  } catch (err) {
    res.status(400).send("ERROR : " + err.message);
  }
});

profileRouter.patch(
  "/profile/edit",
  userAuth,
  parser.single("photo"),
  async (req, res) => {
    try {
      // Check allowed fields
      if (!validateEditProfileData(req)) {
        throw new Error("Invalid Edit Request: Fields not allowed");
      }

      const loggedInUser = req.user;

      // Additional Validations
      const { firstName, lastName, emailId, gender, age, about, skills } =
        req.body;

      if (firstName && (firstName.length < 1 || firstName.length > 50)) {
        throw new Error("First name must be between 4 and 50 characters");
      }
      if (lastName && lastName.length > 50) {
        throw new Error("Last name cannot exceed 50 characters");
      }
      if (emailId && !validator.isEmail(emailId)) {
        throw new Error("Invalid Email Address");
      }
      if (
        gender &&
        !["male", "female", "others"].includes(gender.toLowerCase())
      ) {
        throw new Error("Gender must be male, female, or others");
      }
      if (age && (age < 13 || age > 120)) {
        throw new Error("Age must be between 13 and 120");
      }
      if (about && about.length > 800) {
        throw new Error("About section cannot exceed 800 characters");
      }
      if (skills && (!Array.isArray(skills) || skills.length > 20)) {
        throw new Error("Skills must be an array with at most 20 items");
      }

      // ✅ Handle Photo Upload
      if (req.file) {
        loggedInUser.photoUrl = req.file.path; // Cloudinary URL
      }

      // ✅ Apply other updates
      Object.keys(req.body).forEach((key) => {
        if (key !== "photo") {
          loggedInUser[key] = req.body[key];
        }
      });

      await loggedInUser.save();

      res.json({
        message: `${loggedInUser.firstName}, your profile updated successfully`,
        data: loggedInUser,
      });
    } catch (error) {
      res.status(400).send("ERROR: " + error.message);
    }
  }
);

profileRouter.patch("/profile/reset_password", userAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      throw new Error("Both oldPassword and newPassword are required");
    }

    const user = req.user; // Comes from userAuth middleware

    // ✅ 1. Verify old password
    const isPasswordValid = await user.validatePassword(oldPassword);
    if (!isPasswordValid) {
      throw new Error("Old password is incorrect");
    }

    // ✅ 2. Validate new password strength
    if (!validator.isStrongPassword(newPassword)) {
      throw new Error(
        "New password must be strong (use upper, lower, number, symbol)"
      );
    }

    // ✅ 3. Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // ✅ 4. Update user password
    user.password = hashedPassword;
    await user.save();

    res.send("Password updated successfully ✅");
  } catch (error) {
    res.status(400).send("ERROR: " + error.message);
  }
});

module.exports = profileRouter;
