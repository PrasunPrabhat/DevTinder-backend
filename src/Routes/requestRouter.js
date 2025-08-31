const express = require("express");
const { userAuth } = require("../Middlewares/authMiddleware");
const ConnectionRequest = require("../models/connectionRequest");
const UserModel = require("../models/user");
const mongoose = require("mongoose");

// ! Creating the Express Router
const requestRouter = express.Router();

// ! Api to sent the Connection Request
requestRouter.post(
  "/request/send/:status/:toUserId",
  userAuth,
  async (req, res) => {
    try {
      const fromUserId = req.user._id;
      const { toUserId, status } = req.params;

      // 1. Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(toUserId)) {
        return res.status(400).json({ message: "Invalid User ID" });
      }

      // 2. Prevent self-request
      if (fromUserId.toString() === toUserId) {
        return res
          .status(400)
          .json({ message: "You cannot send a request to yourself" });
      }

      // 3. Validate status
      const allowedStatus = ["ignored", "interested"];
      if (!allowedStatus.includes(status)) {
        return res
          .status(400)
          .json({ message: `Invalid status type: ${status}` });
      }

      // 4. Ensure "toUserId" exists in UserModel
      const toUserExists = await UserModel.findById(toUserId);
      if (!toUserExists) {
        return res.status(404).json({ message: "User Not Found !" });
      }

      // 5. Prevent duplicate requests
      const existingRequest = await ConnectionRequest.findOne({
        fromUserId,
        toUserId,
      });
      if (existingRequest) {
        return res
          .status(400)
          .json({ message: "Request already sent to this user" });
      }

      // 6. Prevent reverse duplicate (if target user already sent request to you)
      /*       const reverseRequest = await ConnectionRequest.findOne({
        fromUserId: toUserId,
        toUserId: fromUserId,
      });
      if (reverseRequest) {
        return res.status(400).json({
          message:
            "This user has already sent you a request, check your requests",
        });
      } */

      const existingOrReverseRequest = await ConnectionRequest.findOne({
        $or: [
          { fromUserId, toUserId }, // you → them
          { fromUserId: toUserId, toUserId: fromUserId }, // them → you
        ],
      });

      if (existingOrReverseRequest) {
        return res.status(400).json({
          message:
            "A connection request already exists between you and this user",
        });
      }

      // 7. Create new request
      const connectionRequest = new ConnectionRequest({
        fromUserId,
        toUserId,
        status,
      });

      const data = await connectionRequest.save();

      return res.status(201).json({
        message: "Connection request sent successfully ✅",
        data,
      });
    } catch (error) {
      return res.status(500).json({ message: "ERROR: " + error.message });
    }
  }
);

requestRouter.post(
  "/request/review/:status/:requestId",
  userAuth,
  async (req, res) => {
    try {
      const { status, requestId } = req.params;
      const loggedInUser = req.user;

      // 1. Validate requestId
      if (!mongoose.Types.ObjectId.isValid(requestId)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid Request ID" });
      }

      // 2. Validate status
      const allowedStatus = ["accepted", "rejected"];
      if (!allowedStatus.includes(status)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid status type" });
      }

      // 3. Find request in DB
      const connectionRequest = await ConnectionRequest.findOne({
        _id: requestId,
        toUserId: loggedInUser._id,
        status: "interested",
      });
      if (!connectionRequest) {
        return res
          .status(404)
          .json({ success: false, message: "Request not found" });
      }

      // 4. Check if logged-in user is the receiver
      if (!connectionRequest.toUserId.equals(loggedInUser._id)) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to review this request",
        });
      }

      // 5. Prevent reviewing own request
      if (connectionRequest.fromUserId.equals(loggedInUser._id)) {
        return res
          .status(400)
          .json({ success: false, message: "Cannot review your own request" });
      }

      // 6. Prevent changing already finalized requests
      if (["accepted", "rejected"].includes(connectionRequest.status)) {
        return res
          .status(400)
          .json({ success: false, message: "Request already finalized" });
      }

      // 7. Update request
      connectionRequest.status = status;
      await connectionRequest.save();

      return res.status(200).json({
        success: true,
        message: `Request ${status} successfully`,
        data: connectionRequest,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ success: false, message: "ERROR: " + error.message });
    }
  }
);

module.exports = requestRouter;
