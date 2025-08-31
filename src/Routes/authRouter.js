const express = require("express");
const { validateSignUpData } = require("../utils/Validations");
const UserModel = require("../models/user");
const validator = require("validator");
const bcrypt = require("bcrypt");
const parser = require("../utils/multerCloudinary");

// ! Creating the Express Router
const authRouter = express.Router();

// ! API For Inserting the Data to the Database....
authRouter.post("/signup", parser.single("photo"), async (req, res) => {
  try {
    // ! Before Put into the database we have to do Validations of data do it in sperate folder
    validateSignUpData(req);

    const {
      firstName,
      lastName,
      emailId,
      password,
      age,
      gender,
      about,
      skills,
    } = req.body;

    // ! After the Validations then Encrypt the Password and then Store it into the Database
    const passwordHash = await bcrypt.hash(password, 10);

    // Cloudinary file URL
    const photoUrl = req.file ? req.file.path : undefined; // req.file.path contains Cloudinary URL

    // ! Creating the User Instance of the User Model
    // ✅ Convert skills string to array
    const skillsArray = skills
      ? skills.split(",").map((skill) => skill.trim())
      : [];

    const user = new UserModel({
      firstName,
      lastName,
      emailId,
      password: passwordHash,
      age,
      gender,
      about,
      skills: skillsArray,
      photoUrl,
    });

    await user.save();
    res.status(201).json({ message: "User Added Successfully!" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// ! API For Login
authRouter.post("/login", async (req, res) => {
  try {
    const { emailId, password } = req.body;

    // ! Validations
    if (!validator.isEmail(emailId)) {
      throw new Error("Email is not Valid!");
    }

    // ! Database check for the user to see emailId Present or not.
    const user = await UserModel.findOne({ emailId: emailId });
    if (!user) {
      throw new Error("Invalid Credentials!");
    }

    const isPasswordValid = await user.validatePassword(password);

    if (isPasswordValid) {
      // ! Create a JWT TOKEN
      const token = await user.getJWT();

      // ! Add the Token into the Cookie and sent the Response back to the User.
      res.cookie("token", token, {
        expires: new Date(Date.now() + 8 * 3600000),
        httpOnly: true, // prevents JS access to token
        secure: true, // only send over HTTPS
        sameSite: "none", // allow cross-site cookie
      });
      res.send(user);
    } else {
      throw new Error("Invalid Credentials!");
    }
  } catch (err) {
    res.status(400).json({ message: "Invalid email or password" });
  }
});

authRouter.post("/logout", async (req, res) => {
  /*   res.cookie("token", null, {
    expires: new Date(Date.now()),
  });

  res.send(); */

  // Chaining response
  res
    .cookie("token", null, {
      expires: new Date(Date.now()),
    })
    .send("Logout SuccessFully");
});

module.exports = authRouter;
