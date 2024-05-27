import { APIError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {User} from "../models/user.models.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { APIResponse } from "../utils/ApiResponse.js";

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
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken

        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}
    } catch (error) {
        throw new APIError(500,"Something Went Wrong While Generating Access And Refresh Token")
    }
}

const loginUser= asyncHandler(async (req,res)=>{
    //Login Credentials From User
    //Check username/email against database
    //Password Check
    //Generate Refresh And Access Tokens
    //Send cookies

    const {email,username,password}=req.body

    if(!username && !email)
        {
            throw new APIError(400,"Username or Email Required")
        }
    
    const user=await User.findOne({
        $or: [{email},{username}]
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
            $set:{
                refreshToken: undefined
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


export {registerUser
    ,loginUser,
logoutUser}