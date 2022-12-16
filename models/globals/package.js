const mongoose = require("mongoose")

const currencySchema= new mongoose.Schema({
  actualAmount:{
    type: Number
  },
  discountedAmount:{
    type: Number
  },
  currencyUrl: {
    type: String,
    default: "",
}
})
const packageSchema = new mongoose.Schema({
    status: {
      type: String,
      required: true,
      enum: ["INACTIVE","ACTIVE"],
    },
    INR: currencySchema,
    packageUrl: {
        type: String,
        default: "",
    }, 
    coin: {
      type: Number,
      required: true
  },  
  description: {
    type: String,
    required: false
},   
  },
  { timestamps: true }
);


const package = mongoose.model("package", packageSchema)

module.exports = package
