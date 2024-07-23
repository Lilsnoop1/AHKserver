import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    role:{
        type: String,
        required:true
    }
})
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    name:{
        type:String,
        required:true
    },
    age:{
        type:Number,
        required:true
    },
    cnic:{
        type:Number,
    },
    gender:{
        type:String,
    },
    dob:{
        type:String,
    },
    mobileNumber:{
        type:Number,
        required:true,
        unique:true
    },
    tests:[{
        name:String,
    }],
    testPrices:[{
        price:Number,
    }],
    discount:{
        type:Number,
    },
    received:{
        type:Number,
    },
    mrnumber:{
        type:String,
    },
    infotest:{
        type:String
    }
})



const Employee = new mongoose.model("Employee",employeeSchema);
const User = new mongoose.model("User",userSchema);

export {Employee,User};