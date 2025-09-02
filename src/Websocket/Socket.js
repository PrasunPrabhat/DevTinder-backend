const socket = require("socket.io");
const jwt = require("jsonwebtoken");
const cookie = require("cookie"); // to parse cookie header

const crypto = require("crypto");
const ChatModel = require("../models/ChatDB");
const ConnectionRequestModel = require("../models/connectionRequest");

const getSecretRoomId = (senderId, targetUserId) => {
  return crypto
    .createHash("sha256")
    .update([senderId, targetUserId].sort().join("_"))
    .digest("hex");
};

const initializeSocket = (httpServer) => {
  const io = socket(httpServer, {
    cors: {
      origin: [
        "https://dev-tider-frontend.vercel.app", // Deployed frontend
        "http://localhost:5173", // Local dev frontend
      ],
      credentials: true, // ✅ allow cookies
    },
  });

  // Middleware to check auth before connection
  io.use((socket, next) => {
    try {
      // Parse cookies from headers
      const cookies = cookie.parse(socket.handshake.headers.cookie || "");
      const token = cookies?.token; // 👈 assuming your JWT is stored in "token"

      if (!token) {
        return next(new Error("Authentication error: No token"));
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user info to socket
      socket.user = decoded;

      next();
    } catch (err) {
      console.error("Socket auth failed:", err.message);
      next(new Error("Authentication error"));
    }
  });

  const onlineUsers = {}; // key: userId, value: socket.id
  const lastSeen = {}; // { userId: timestamp }

  io.on("connection", (socket) => {
    // Handle Events to handle the user to server

    const userId = socket.user?._id;

    if (userId) {
      onlineUsers[userId] = socket.id;

      // Emit online users + last seen info to all clients
      io.emit("updateOnlineUsers", {
        online: Object.keys(onlineUsers),
        lastSeen, // last seen timestamps of offline users
      });
    }

    socket.on("joinChat", ({ firstName, senderId, targetUserId }) => {
      // whenever there is a Socket connections there is a room it has the RoomId and there can be a Multiple Participent in that room
      //   Create the Seperate Room for individual Person
      const MainRoomId = getSecretRoomId(senderId, targetUserId); // ! Unique room id for the Sender and receiver Ok
      console.log(firstName + " Joining Room: " + MainRoomId);
      socket.join(MainRoomId);
    });

    socket.on(
      "sendMessage",
      async ({ firstName, senderId, targetUserId, text }) => {
        try {
          // 1️⃣ Check if sender and target are friends
          const connection = await ConnectionRequestModel.findOne({
            $or: [
              { fromUserId: senderId, toUserId: targetUserId },
              { fromUserId: targetUserId, toUserId: senderId },
            ],
            status: "accepted", // only accepted connections
          });

          if (!connection) {
            return socket.emit("errorMessage", {
              message: "You can only message your friends!",
            });
          }
          //  Now here the Backend insure that whatever the message we get  from the sender we have to sent back to the targetUser
          const MainRoomId = getSecretRoomId(senderId, targetUserId);
          let chat = await ChatModel.findOne({
            participants: { $all: [senderId, targetUserId] },
          });

          if (!chat) {
            chat = await ChatModel({
              participants: [senderId, targetUserId],
              messages: [],
            });
          }

          chat.messages.push({
            senderId,
            text,
          });

          await chat.save();
          io.to(MainRoomId).emit("messageReceived", { firstName, text });
        } catch (error) {
          console.log(error);
        }
      }
    );

    // When user disconnects
    socket.on("disconnect", () => {
      if (userId) { 
        delete onlineUsers[userId];
        lastSeen[userId] = new Date().toISOString(); // store last seen
        io.emit("updateOnlineUsers", {
          online: Object.keys(onlineUsers),
          lastSeen,
        });
      }
    });
  });
};

module.exports = initializeSocket;
