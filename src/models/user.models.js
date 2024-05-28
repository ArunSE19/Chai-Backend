import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

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
{timestamps:true})

userSchema.pre("save",async function(next){
    if(!this.isModified("password")) return next();
    this.password=await bcrypt.hash(this.password,10)
    next()
})//not using arrow function because arrow function don't have this reference

userSchema.methods.isPasswordCorrect=async function(password){
    return await bcrypt.compare(password,this.password)
}

//Access token is not stored in db while refresh token, why and how will be discussed later
userSchema.methods.generateAccessToken=function(){
    return jwt.sign({
            _id:this._id,
            email:this.email,
            fullname:this.fullname,
            username:this.username
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn:process.env.ACCESS_TOKEN_EXPIRY
    }
)

}
userSchema.methods.generateRefreshToken=function(){
    return jwt.sign({
        _id:this._id,
       
},
process.env.REFRESH_TOKEN_SECRET,
{
    expiresIn:process.env.REFRESH_TOKEN_EXPIRY
}
)

}
export const User=mongoose.model("User",userSchema)