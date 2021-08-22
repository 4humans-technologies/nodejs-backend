const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const app = express()
app.use(express.json())


// ROUTERS--->
const authRouter = require("./routes/auth")
const permissionRouter = require("./routes/rbac/permissionRoutes")
const roleRouter = require("./routes/rbac/roleRoutes")

// CONNECT-URL--->
let CONNECT_URL;
if (process.env.HOSTED_DB === "true") {
    CONNECT_URL = `mongodb+srv://${process.env.NODE_TODO_MONGO_ATLAS_ROHIT_USER}:${process.env.NODE_TODO_MONGO_ATLAS_ROHIT_PASS}@dreamgirl-cluster-0.65bjj.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`
} else {
    CONNECT_URL = `mongodb://127.0.0.1:27017/${process.env.DB_NAME}`
}


// ALL HTTP ROUTES--->
app.use("/auth", authRouter);
app.use("/permissions", permissionRouter);
app.use("/role",roleRouter);


// EXPRESS ERROR HANDLER--->
app.use((err, req, res, next) => {
    console.log(err.statusCode, err.status,err.data)
    if (!err.statusCode) {
        res.status(500).json({
            message: err.message || "error",
            data: err.data || ""
        })
    } else {
        res.status(err.statusCode).json({
            message: err.message || "error",
            data: err.data || ""
        })
    }
    next()
})


// MONGODB CONNECTION SETUP--->
mongoose.connect(
    CONNECT_URL,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
    },
    () => {
        console.log('==============CONNECTED TO ATLAS=============');
        app.listen(process.env.PORT, () => console.log('Listening on : ' + process.env.PORT))
    }
)
