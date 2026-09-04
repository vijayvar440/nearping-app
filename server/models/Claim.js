const mongoose = require("mongoose");


const ClaimSchema =  new mongoose.Schema({

    pingId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"ping",
        required:true
    },
    finderAnswer:{
        type:String,
        required:true
    },
    finderContact:{
        type:String,
        required:true
    },

   status: { 
    type: String, 
    enum: ["PENDING", "ACCEPTED", "REJECTED"], 
    default: "PENDING" 
  },
  createdAt: { type: Date,
     default: Date.now }
})

module.exports = mongoose.model("Claim",ClaimSchema);