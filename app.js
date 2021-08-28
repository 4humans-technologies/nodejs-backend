const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const app = express()
app.use(express.json())


// ROUTERS--->
const permissionRouter = require("./routes/rbac/permissionRoutes")
const roleRouter = require("./routes/rbac/roleRoutes")
const viewerRouter = require("./routes/register/viewerRoutes")
const modelRouter = require("./routes/register/modelRoutes")
const superAdminRouter = require("./routes/register/superadminRoutes")
const globalLoginRoutes = require("./routes/login/globalLoginRoutes")
// category is Depreciated, will now use Tag-group and tags
// const categoryRoutes = require("./routes/management/categoryRoutes")
const tagRouter = require("./routes/management/tagRoutes")

// CONNECT-URL--->
let CONNECT_URL;
if (process.env.HOSTED_DB === "true") {
    CONNECT_URL = `mongodb+srv://${process.env.NODE_TODO_MONGO_ATLAS_ROHIT_USER}:${process.env.NODE_TODO_MONGO_ATLAS_ROHIT_PASS}@dreamgirl-cluster-0.65bjj.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`
} else {
    CONNECT_URL = `mongodb://127.0.0.1:27017/${process.env.DB_NAME}`
}

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    next()
})


// ALL HTTP ROUTES--->
app.use("/api/website/permissions", permissionRouter);
app.use("/api/website/role", roleRouter);
app.use("/api/website/register/viewer", viewerRouter);
app.use("/api/website/register/model", modelRouter);
app.use("/api/website/register/superadmin", superAdminRouter);
app.use("/api/website/login", globalLoginRoutes)
// category is Depreciated, will now use Tag-group and tags
// app.use("/api/website/management/category", categoryRoutes)
app.use("/api/website/management/tags", tagRouter)


// EXPRESS ERROR HANDLER--->
app.use((err, req, res, next) => {
    console.log(err, err.statusCode, err.status, err.data)
    if (!err.statusCode) {
        res.status(500).json({
            message: err.message || "error",
            actionStaus:err.actionStaus || "failed",
            data: err.data || ""
        })
    } else {
        res.status(err.statusCode).json({
            message: err.message || "error",
            actionStaus:err.actionStaus || "failed",
            data: err.data || ""
        })
    }
    next()
})


// MONGODB CONNECTION SETUP--->
// mongoose.set("debug",true)
mongoose.connect(
    CONNECT_URL,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false
    },
    () => {
        console.log('==============CONNECTED TO ATLAS=============');
        app.listen(process.env.PORT || 8080, () => console.log('Listening on : ' + process.env.PORT))
    }
)

