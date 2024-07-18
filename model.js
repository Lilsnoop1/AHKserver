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
    mobileNumber:{
        type:Number,
        required:true
    },
    mrnumber:{
        type:String,
        required:true
    }
})



const Employee = new mongoose.model("Employee",employeeSchema);
const User = new mongoose.model("User",userSchema);

export {Employee,User};