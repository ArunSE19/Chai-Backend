import mongoose from "mongoose";

const userSchema=new mongoose.Schema(
{
    username:{
        type: String,
        required:true,
        unique: true,
        lowercase: true,
        index:true
    },
    email:{
        type: String,
        required:true,
        unique: true,
        lowercase: true
    },
    fullname:{
        type: String,
        required:true,
        index:true
    },
    avatar:{
        type: String,  //Cloudinary URL
        required:true
    },
    coverImage:{
        type: String,  //Cloudinary URL
        //required:true
    },
    watchHistory:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"video"
    }],
    password:{
        type:String,
        required:[true,"Password Is Required"]
    },
    refreshToken:{
        type:String
    }
},
{timestamp:true})

export const User=mongoose.model("User",userSchema)