const mongoose = require("mongoose");

// TODO:category model count update hook setup 
const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User"
    },
    description: {
        type: String,
        // required: true
    },
    modelCount: {
        type: Number,
        default: 0
    },
    level: {
        type: Number,
        required: true
    },
    ancestors: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        index: true
    }],
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        index: true
    }
}, { timestamps: true })

// under the a tree same category cannot exist
categorySchema.pre("save", function (next) {
    mongoose.model("Category").findOne({
        parent: this.parent._id,
        name: this.name
    })
        .then(category => {
            if (category) {
                const error = new Error("Dublicate category name!, categories with same name can not exist under one parent category. Please rename this category and try again.")
                error.statusCode = 401
                throw error
            }
        }).catch(err => next(err))
})

categorySchema.methods.findParent = function () {
    return mongoose.model("Category").find({ _id: this.parent._id })
}

categorySchema.methods.findAncestor = function () {
    return mongoose.model("Category").find({ _id: { $in: this.ancestors } })
}

categorySchema.methods.findChildren = function () {
    return mongoose.model("Category").find({ parent: this._id })
}

categorySchema.statics.generateAboveTreeForNode = function (id) {
    mongoose.model("Category").findById(id)
        .then(category => {

        }).catch(err => next(err))
}

categorySchema.statics.generateTreeForRootNode = function (rootNodeId) {

}

const Category = mongoose.model("Category", categorySchema)

module.exports = Category