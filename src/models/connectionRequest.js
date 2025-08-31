const mongoose = require("mongoose");

const connectionRequestSchema = new mongoose.Schema(
  {
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // ! Reference to the user Collections
      required: true,
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ["ignored", "interested", "accepted", "rejected"],
        message: `{VALUE} is incorrect status type`,
      },
    },
  },
  { timestamps: true }
);

connectionRequestSchema.index({ fromUserId: 1, toUserId: 1 });

connectionRequestSchema.pre("save", function (next) {
  const connectionsRequest = this;
  if (connectionsRequest.fromUserId.equals(connectionsRequest.toUserId)) {
    throw new Error("Cannot send connections Request to yourself !");
  }
  next();
});

const ConnectionRequestModel = mongoose.model(
  "ConnectionsRequest",
  connectionRequestSchema
);

module.exports = ConnectionRequestModel;
