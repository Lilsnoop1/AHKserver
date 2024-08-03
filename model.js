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
    name:{
        type: String,
        required: true,
    },
    role:{
        type: String,
        required:true
    }
})
const contactSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    fname: {
        type: String,
        required: true,
    },
    lname:{
        type: String,
        required:true
    },
    message:{
        type:String,
        required:false
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
    infotest:[{
        tests:String,
    }]
})



const Employee = new mongoose.model("Employee",employeeSchema);
const User = new mongoose.model("User",userSchema);
const Contacts = new mongoose.model("Contact",contactSchema);

export {Employee,User,Contacts};