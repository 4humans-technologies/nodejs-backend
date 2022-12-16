const mongoose = require("mongoose")

const orderSchema = new mongoose.Schema({
    status: {
      type: String,
      required: true,
      enum: ["CREATED", "PENDING", "CANCELLED","APPROVED"],
    },
    deposit_external_id:{
        type: String,
    },
    relatedUser: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User",
    },
    paymentUrl: {
        type: String,
        default: "",
    },
    packageId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "package",
    },
  },
  { timestamps: true }
)

// userSchema.post("save", function(doc){
//     // do stuff
//     console.log("After saving user");
// })

const Order = mongoose.model("Order", orderSchema)

module.exports = Order
