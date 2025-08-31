require("dotenv").config();

const express = require("express"); // Import the Express
const connectDB = require("./Config/database");
const app = express(); // Instance of the ExpressJS Application
const cookieParser = require("cookie-parser");
const CORS = require("cors");

app.use(
  CORS({
    origin: [
      "http://localhost:5173", // Local frontend
      "https://dev-tider-frontend.vercel.app", // Deployed frontend
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser()); // ! For JWT

// ! Router
const authRouter = require("./Routes/authRouter");
const profileRouter = require("./Routes/profileRouter");
const requestRouter = require("./Routes/requestRouter");
const userRouter = require("./Routes/userRouter");
const paymentRouter = require("./Routes/paymentRouter");

app.use("/", authRouter);
app.use("/", profileRouter);
app.use("/", requestRouter);
app.use("/", userRouter);
app.use("/", paymentRouter);

const PORT = 3000;
connectDB()
  .then(() => {
    console.log("Database connection established...");
    app.listen(PORT, () => {
      console.log("Server is Running On to the Port ", PORT, ".....");
    });
  })
  .catch((err) => {
    console.error("Database cannot be connected!!..");
  });
