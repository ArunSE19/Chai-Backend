import { APIError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {User} from "../models/user.models.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { APIResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const registerUser= asyncHandler(async (req,res) => {
    //Get data from frontend
    //perform validation: password is not empty etc
    //handle images: uplaod on cloudinary
    //Create user in DB
    //remove password and refresh token from response
    //check user creation in DB
    //return res

    const {fullname,email,username,password}=req.body;
    console.log("email",email)
    /*
    if(fullname==='')
        {
            throw new APIError(400,"FullName is required")
        }
    */
   if([fullname,email,username,password].some((field)=>field?.trim()===""))
    {
        throw new APIError(400,"All Fields Are Required")
    }

    const existedUser=await User.findOne({
        $or:[{username}, {email}]
    })
    
    if(existedUser)
        {
            throw new APIError(409,"User Already Existed")
        }
    //req.files is using the functionality of the middleware
    const avatarLocalPath=req.files?.avatar[0]?.path;
    /*cover Image Previous
    const coverImageLocalPath=req.files?.coverImage[0]?.path;
        */
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0)
        {
            coverImageLocalPath=req.files.coverImage[0].path
        }
    if(!avatarLocalPath)
        {
            throw new APIError(400,"Avatar File is Required")
        }
    
    const avatar=await uploadOnCloudinary(avatarLocalPath)

    const coverImage=await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar)
        {
            throw new APIError(400,"Avatar File is Required")
        }
    
    const user=await User.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()

    })

    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser)
        {
            throw new APIError(500,"Something Went Wrong While Registering The User")
        }
    
    return res.status(201).json(
        new APIResponse(200,createdUser,"User Registered Successfully")
    )
})


const generateAccessAndRefreshToken= async(userId)=>{
    try {
        const user=await User.findById(userId)
        const accessToken=await user.generateAccessToken()
        const refreshToken=await user.generateRefreshToken()

        user.refreshToken=refreshToken

        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}
    } catch (error) {
        throw new APIError(500,"Something Went Wrong While Generating Access And Refresh Token")
    }
}

const loginUser= asyncHandler(async (req,res) => {
    //Login Credentials From User
    //Check username/email against database
    //Password Check
    //Generate Refresh And Access Tokens
    //Send cookies

    const {email,password}=req.body;
    console.log("email",email)
    console.log("Password",password)
    
    if(!email)
        {
            throw new APIError(400,"Username or Email Required")
        }
    
    const user=await User.findOne({
        //$or: [{email},{username}]
        email
    })

    if(!user)
        {
            throw new APIError(404,"User Doesnot Exist")
        }
    
    const isPasswordValid= await user.isPasswordCorrect(password)

    if(!isPasswordValid)
        {
            throw new APIError(401,"Invalid User Credentials")
        }

    const {accessToken,refreshToken}= await generateAccessAndRefreshToken(user._id)

    const loggedInUser=await User.findById(user._id).select("-password -refreshToken")

    const options={
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new APIResponse(200,
            {
                user:accessToken,refreshToken,loggedInUser
            },
            "User Logged In Successfully"
        )
    )


}) 

const logoutUser=asyncHandler(async (req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset:{
                refreshToken: 1//This works by changing
            }
        },
        {
            //return after updating the value
            new:true
        }

    )

    const options={
        httpOnly:true,
        secure:true
    }   

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new APIResponse(200,{},"User Logged out")
    )

        

})

const verifyRefreshToken= asyncHandler(async (req,res) =>
    {
        const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken
        
        if(!incomingRefreshToken)
            {
                throw new APIError(401,"unauthorised Request")
            }
        
       try {
         const decodedToken=jwt.verify(incomingRefreshToken,
             process.env.REFRESH_TOKEN_SECRET
         )
 
         const user=await User.findById(decodedToken?._id)
 
         if(!user)
             {
                 throw new APIError(401,"Invalid Refresh Token")
             }
         
         if(incomingRefreshToken !== user?.refreshToken)
             {
                 throw new APIError(401,"Refresh token is expired or used")
             }
         
         const options = {
             httpOnly:true,
             secure:true
         }
 
         const {accessToken,newrefreshToken}= await generateAccessAndRefreshToken(user._id)
 
         return res
         .status(200)
         .cookie("accessToken",accessToken, options)
         .cookie("refreshToken",newrefreshToken, options)
         .json(
             new APIResponse(
                 200,
                 {accessToken,refreshToken: newrefreshToken},
                 "Access Token Successfully Refreshed"
             )
         )
 
       } catch (error) {
            throw new APIError(401,error?.message || "Invalid refresh token")
       }
    }

)

const changeCurrentPassword=asyncHandler(async (req, res) => {
    const {oldPassword,newPassword} = req.body
    
    const user = await User.findById(req.user?._id)

    const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect)
        {
            throw new APIError(400,"Invalid Old Password")
        }
    
    user.password=password

    await user.save({validateBeforeSave:false})
        
    return res
    .status(200)
    .json(new APIResponse(200,{},"Password Changed Successfully"))

} )

const getCurrentUser=asyncHandler(async (req,res)=>{
    return res
    .status(200)
    .json(new APIResponse(200,req.user,"current user fetched successfully"))
})


const updateAccountDetails= asyncHandler(async (req,res)=>{

    const {fullname, email}=req.body

    if(!fullname || !email)
        {
            throw new APIError(400,"All fields are required")
        }
    
        const user=await User.findByIdAndUpdate(
            req.user?._id,
        {
            $set:{
                fullname,
                email:email    
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(new APIResponse(200,user,"Account Details updated Successfully"))
})

const updateUserAvatar=asyncHandler(async (req,res)=>{
    const avatarLocalPath=req.file?.path

    if(!avatarLocalPath)
        {
            throw new APIError(400,"Avatar File Is Missing")
        }
    
    const avatar=await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url)
        {
            throw new APIError(400,"Error While Uploading File")
        }
    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {
            new:true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new APIResponse(200,user, "Avatar updated Successfully"))
    
    
})


const updateUserCoverImage=asyncHandler(async (req,res)=>{
    const coverImageLocalPath=req.file?.path

    if(!coverImageLocalPath)
        {
            throw new APIError(400,"Avatar File Is Missing")
        }
    
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url)
        {
            throw new APIError(400,"Error While Uploading File")
        }
    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {
            new:true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new APIResponse(200,user, "Cover Image updated Successfully"))
    
})

const getUserProfile=asyncHandler(async (req,res)=>{
    const {username}=req.params

    if(!username?.trim())
        {
            throw new APIError(400,"Username Is Required")
        }
    
    const channel=await User.aggregate(
        [
        {
            $match:{
                username: username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscriber"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelsSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in: [req.user?._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:
            {
                fullname:1,
                username:1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }
    ]
    )

    if(!channel?.length)
        {
            throw new APIError(404,"Channel Doesnot Exist")
        }

    return res
    .status(200)
    .json(
        new APIResponse(200,channel[0],"User Channel Fetched Successfully")
    )
})


const getWatchHistory= asyncHandler(async (req,res)=>{
        const user=await User.aggregate([
            {
                $match:{
                    _id:new mongoose.Types.ObjectId(req.user._id)
                }
            },
            {
                $lookup:{
                    from:"videos",
                    localField:"watchHistory",
                    foreignField:"_id",
                    as:"watchHistory",
                    pipeline:[
                        {
                            $lookup:{
                                from:"users",
                                localField:"owner",
                                foreignField:"_id",
                                as:"owner",
                                pipeline:[
                                    {
                                        $project:{
                                            fullname:1,
                                            username:1,
                                            avatar:1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields:{
                                owner:{
                                    $first:"$owner"
                                }
                            }
                        }
                    ]
                }
            }
        ])

        return res.status(200)
        .json(new APIResponse(200,user[0].watchHistory,"Watch History Fetched Successfully"))

})




export {
registerUser
,loginUser,
logoutUser,
verifyRefreshToken,
changeCurrentPassword,
getCurrentUser,
updateAccountDetails,
updateUserAvatar,
updateUserCoverImage,
getUserProfile,
getWatchHistory}