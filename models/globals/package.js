const mongoose = require("mongoose")

const packageSchema = new mongoose.Schema({
  status: {   
    //status to manage the state
    type: String,
    required: true,
    enum: ["INACTIVE", "ACTIVE"],
  },
  packageUrl: {
    //url of tnc or other purpose 
    type: String,
    default: "",
  },
  coin: {
    //Number of coin
    type: Number,
    required: true
  },
  description: {
    //Number of description
    type: String,
    required: false
  },
  actualAmountINR: {
    //Amount to show user in INR
    type: Number,
    required: true
  },
  discountedAmountINR: {
    //Amount to charge user in INR
    type: Number,
    required: true
  },
},
  { timestamps: true }
);


const package = mongoose.model("package", packageSchema)

module.exports = package
