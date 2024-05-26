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


export {registerUser}