const express = require("express");
const passport = require("passport");
const mongoose = require("mongoose");
const authRouter = require("./routes/auth")
require("dotenv").config();

let CONNECT_URL;
if (process.env.HOSTED_DB === "true"){
    CONNECT_URL = `mongodb+srv://${process.env.NODE_TODO_MONGO_ATLAS_ROHIT_USER}:${process.env.NODE_TODO_MONGO_ATLAS_ROHIT_PASS}@dreamgirl-cluster-0.65bjj.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`
}else{
    CONNECT_URL = `mongodb://127.0.0.1:27017/${process.env.DB_NAME}`
}

const app = express()
app.use(express.json())

app.use("/check",(req,res,next) => {
    res.json({
        "active":true
    })
});
app.use("/auth",authRouter);

mongoose.connect(
    CONNECT_URL,
    {
        useNewUrlParser:true,
        useUnifiedTopology:true,
    },
    () => {
        console.log('==============CONNECTED TO ATLAS=============');
        app.listen(process.env.PORT, () => console.log('Listening on : '+process.env.PORT))
    }
)
