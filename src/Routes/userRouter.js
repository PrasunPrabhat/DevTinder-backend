const express = require("express");
const { userAuth } = require("../Middlewares/authMiddleware");
const userRouter = express.Router();
const ConnectionRequest = require("../models/connectionRequest");
const UserModel = require("../models/user");

const safeDataString = [
  "firstName",
  "lastName",
  "age",
  "gender",
  "photoUrl",
  "about",
  "skills",
];

// ! Get all the Pending Connections request for the loggedIn user
userRouter.get("/user/requests/received", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    const connectionsRequest = await ConnectionRequest.find({
      toUserId: loggedInUser._id,
      status: "interested",
    }).populate("fromUserId", safeDataString);

    //! loop and fetch each fromUser
    /*     let result = [];
        for (let reqItem of connectionsRequest) {
        const fromUser = await UserModel.findById(reqItem.fromUserId).lean(); // full user doc
        result.push({
            ...reqItem.toObject(),
            fromUser: fromUser, // attach full user data
        });
        } */

    res.json({
      message: "Data fetched Successfully!",
      data: connectionsRequest,
    });
  } catch (error) {
    res.status(400).send("ERROR: " + error.message);
  }
});

userRouter.get("/user/connections", userAuth, async (req, res) => {
  try {
    // #region 1. Get Logged-in User
    const loggedInUser = req.user; // (already verified by userAuth middleware)
    if (!loggedInUser || !loggedInUser._id) {
      return res
        .status(401)
        .json({ error: "Unauthorized: Invalid user session" });
    }
    // #endregion

    // #region 2. Fetch Connection Requests
    // We find requests where:
    // (a) loggedInUser is the receiver (toUserId) and status is accepted
    // (b) loggedInUser is the sender (fromUserId) and status is accepted
    const connectionsRequests = await ConnectionRequest.find({
      $or: [
        { toUserId: loggedInUser._id, status: "accepted" },
        { fromUserId: loggedInUser._id, status: "accepted" },
      ],
    })
      // Populate only SAFE fields from User model (never password/email directly)
      .populate("fromUserId", safeDataString)
      .populate("toUserId", safeDataString);
    // #endregion

    // #region 3. Transform Data
    // Handle empty case
    if (!connectionsRequests || connectionsRequests.length === 0) {
      return res
        .status(200)
        .json({ message: "No connections found", data: [] });
    }

    // Build connections list (return other user, not self)
    const connections = connectionsRequests.map((row) => {
      // If I'm the sender → return receiver
      if (row.fromUserId._id.toString() === loggedInUser._id.toString()) {
        return row.toUserId;
      }
      // If I'm the receiver → return sender
      return row.fromUserId;
    });
    // #endregion

    // #region 4. Send Response
    res.status(200).json({
      message: "Connections fetched successfully",
      count: connections.length,
      data: connections,
    });
    // #endregion
  } catch (error) {
    // #region 5. Error Handling
    console.error("Error in /user/connections API:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
    // #endregion
  }
});

// !API By the Teacher
// userRouter.get("/user/feed", userAuth, async (req, res) => {
//   try {
//     /*
//       ! User will see All the cards except :
//         1. User Not see this Own Cards
//         2. User can't see the Cards of his connections
//         3. User can't see the ignored People cards
//         4. Also user already sent the connections request

//     */
//     const loggedInUser = req.user;
//     const page = parseInt(req.query.page) || 1;
//     let limit = parseInt(req.query.limit) || 10;
//     limit = limit > 50 ? 50 : limit;
//     const skip = (page - 1) * limit;

//     // ! Find all the connections request (send + received)
//     const connectionsRequests = await ConnectionRequest.find({
//       $or: [{ fromUserId: loggedInUser._id }, { toUserId: loggedInUser._id }],
//     }).select(["fromUserId", "toUserId"]);

//     const hideUsersFromFeed = new Set();
//     connectionsRequests.forEach((req) => {
//       hideUsersFromFeed.add(req.fromUserId.toString());
//       hideUsersFromFeed.add(req.toUserId.toString());
//     });

//     const feedUsers = await UserModel.find({
//       $and: [
//         { _id: { $nin: Array.from(hideUsersFromFeed) } },
//         { _id: { $ne: loggedInUser._id } },
//       ],
//     })
//       .select(safeDataString)
//       .skip(skip)
//       .limit(limit);

//     res.status(200).json({
//       success: true,
//       count: feedUsers.length,
//       users: feedUsers,
//     });
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// });

//! API by GPT

userRouter.get("/user/feed", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    // ✅ Pagination with validation
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 10;
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;
    if (limit > 50) limit = 50;
    const skip = (page - 1) * limit;

    // ✅ Get all connection requests involving loggedInUser
    const connectionsRequests = await ConnectionRequest.find({
      $or: [{ fromUserId: loggedInUser._id }, { toUserId: loggedInUser._id }],
    }).select(["fromUserId", "toUserId", "status"]);

    const hideUsersFromFeed = new Set();

    connectionsRequests.forEach((req) => {
      hideUsersFromFeed.add(req.fromUserId.toString());
      hideUsersFromFeed.add(req.toUserId.toString());
    });

    // ✅ Add loggedInUser themselves (they must not see own profile)
    hideUsersFromFeed.add(loggedInUser._id.toString());

    // ✅ Query for feed users
    const feedUsers = await UserModel.find({
      _id: { $nin: Array.from(hideUsersFromFeed) },
    })
      .select(safeDataString)
      .skip(skip)
      .limit(limit)
      .lean();

    // ✅ Get total count (for pagination info)
    const totalFeedCount = await UserModel.countDocuments({
      _id: { $nin: Array.from(hideUsersFromFeed) },
    });

    res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalFeedCount / limit),
        totalFeedCount,
      },
      count: feedUsers.length,
      users: feedUsers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ! API based on the Skills set feed
/* 
userRouter.get("/user/feed", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    // ✅ Pagination with validation
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 10;
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;
    if (limit > 50) limit = 50;
    const skip = (page - 1) * limit;

    // ✅ Collect logged-in user’s skills (normalize to lowercase)
    const userSkills = (loggedInUser.skills || []).map((s) => s.toLowerCase());

    // ✅ Find all connection requests involving loggedInUser
    const connectionsRequests = await ConnectionRequest.find({
      $or: [{ fromUserId: loggedInUser._id }, { toUserId: loggedInUser._id }],
    }).select(["fromUserId", "toUserId", "status"]);

    const hideUsersFromFeed = new Set();
    connectionsRequests.forEach((req) => {
      hideUsersFromFeed.add(req.fromUserId.toString());
      hideUsersFromFeed.add(req.toUserId.toString());
    });
    hideUsersFromFeed.add(loggedInUser._id.toString()); // exclude self

    // ✅ Skill-based aggregation
    const feedUsers = await UserModel.aggregate([
      {
        $match: {
          _id: {
            $nin: Array.from(hideUsersFromFeed).map(
              (id) => new mongoose.Types.ObjectId(id)
            ),
          },
          skills: { $exists: true, $ne: [] },
        },
      },
      {
        // Create a field "matchedSkillsCount"
        $addFields: {
          matchedSkills: {
            $setIntersection: [
              { $map: { input: "$skills", as: "s", in: { $toLower: "$$s" } } },
              userSkills,
            ],
          },
        },
      },
      {
        $addFields: {
          matchedSkillsCount: { $size: "$matchedSkills" },
        },
      },
      {
        $sort: { matchedSkillsCount: -1, createdAt: -1 }, // sort by best match, then recency
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
      {
        $project: {
          password: 0,
          emailId: 0,
          __v: 0,
        },
      },
    ]);

    // ✅ Get total count for pagination
    const totalFeedCount = await UserModel.countDocuments({
      _id: { $nin: Array.from(hideUsersFromFeed) },
      skills: { $exists: true, $ne: [] },
    });

    res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalFeedCount / limit),
        totalFeedCount,
      },
      count: feedUsers.length,
      users: feedUsers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
 */

module.exports = userRouter;
