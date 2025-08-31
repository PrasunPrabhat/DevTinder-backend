// ! Actual Code for the Authentications to make our APIs Secure
const JWT = require("jsonwebtoken");
const UserModel = require("../models/user");

const userAuth = async (req, res, next) => {
  try {
    // ! Read the Token from the Req Cookies
    const { token } = req.cookies;
    if (!token) {
      return res.status(401).send("Please Login!")
    }

    // ! Validate the Token
    const decodedMessage = await JWT.verify(token, "Prasunkir@21");
    const { _id } = decodedMessage;

    // ! Find the user is the suer Exists or not
    const user = await UserModel.findById(_id);
    if (!user) {
      throw new Error("User Not Found");
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(400).send("ERROR : " + err.message);
  }
};

module.exports = {
  userAuth,
};
