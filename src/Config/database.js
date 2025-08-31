// ! Type 1 : First way to connect the database to the Application which is not the Good way...
/* 
// ! 1. Connect the Database to the Applications using the Mongoose....!
const mongoose = require("mongoose");

//! 2. Connect with the Cluster.../ but this is not a good way to connect the database.
mongoose.connect(
  "mongodb+srv://LearningNodeJS:IKOC116vSUnlV7cR@learningnodejs.qkagr53.mongodb.net/"
); */

// ! Type 2 : Second way to Wrap the code into the "Async and await" ...
/* 
!   1. As the mongoose.connect() Return the Promise thats why we use the Async and await so we use
       async and wait function method to connect the database.
    2. But if we do this then application is connected to the database the answer the NO.
        because we create the database in the sperate file and we run our own server with nodemon app.js
    3. I just have to require this file in the server (app.js to connect and whenever the sever 
       runs this require runs as we know)
    4. Now as we require the data in the sever our cluster is connected to our Applications.. 
       means cluster ----> Inside the cluster we have database.
    5. As you can see that URI it basically represents the Whole Cluster but if you wrote the 
       "mongodb+srv:// ***** mongodb.net/databaseName then it will connected to the particular 
       database."
    6. Now we have a valid strong database connection established to the library.

! This is also not the Good Type to Connect to the database 
    --> Suppose as we see in the console that Server is connected first then the database is connected.
    --> But there is a Scenerio where we have to first need data from the database so that data 
        will be visible to the user when it hit the Request to our Applications...
    --> See the Type 3
*/

/* // ! 1. Connect the Database to the Applications using the Mongoose....!
const mongoose = require("mongoose");

//! 2. Connect with the Cluster.../ but this is not a good way to connect the database.
const connectDB = async () => {
  await mongoose.connect(
    "mongodb+srv://LearningNodeJS:IKOC116vSUnlV7cR@learningnodejs.qkagr53.mongodb.net/"
  );
};

connectDB()
  .then(() => {
    console.log("Database connection established...");
  })
  .catch((err) => {
    console.error("Database cannot be connected!!..");
  }); */

// ! Type 3 : Third way we just export the ConnectDB functions and just read that promise into the Server itself.
/*  
    ! We first have to connect with the Database then after we listen to the Incoming Request
    ! To do this i basically Export the connectDB promise and use this in the server
*/
// ! 1. Connect the Database to the Applications using the Mongoose....!
const mongoose = require("mongoose");
const { URI } = require("../Constants/links");

//! 2. Connect with the Cluster.../ but this is not a good way to connect the database.
const connectDB = async () => {
  await mongoose.connect(
    URI
  );
};

module.exports = connectDB;
