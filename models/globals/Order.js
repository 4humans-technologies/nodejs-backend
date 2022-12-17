const mongoose = require("mongoose")

const orderSchema = new mongoose.Schema({
  status: {   
    //status to manage the state
    type: String,
    required: true,
    enum: ["CREATED", "PENDING", "CANCELLED", "APPROVED"],
  },
  deposit_external_id: { 
    // id at astropay
    type: String,
  },
  relatedUser: {   
    //user id
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  paymentUrl: { 
    //payment url 
    type: String,
    default: "",
  },
  packageId: {  
    //package id
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "package",
  },
  amount: {   
    //amount paid by user
    //passed by FE validate by BE
    type: Number,
    required: true,
  },
  currency: { 
    //currency in which amount paid by user
    //passed by FE
    type: String,
    required: true,
  },
  country: {
    //country from which order is created
    //passed by FE
    type: String,
    required: true,
  },
  packageAmountINR: {
    //package amount in INR
    type: Number,
    require: true,
  },
  paymentGateway:{
    //paymentGateway name
    type: String,
    required: true,
    default: "ASTROPAY",
    enum: ["ASTROPAY"]
  }
},
  { timestamps: true }
)

// userSchema.post("save", function(doc){
//     // do stuff
//     console.log("After saving user");
// })

const Order = mongoose.model("Order", orderSchema)

module.exports = Order
