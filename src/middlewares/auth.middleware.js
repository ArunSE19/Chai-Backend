import { APIError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken"
import { User } from "../models/user.models";
//res is replaced by "_" because it is not being used
export const verifyJWT=asyncHandler(async (req,_,next)=>{
    
try {
        const token=req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer","")
    
        if(!token)
            {
                throw new APIError(401,"Unauthorised request")
            }
        
        const decodedToken=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
        const user=await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if(!user)
            {
                throw new APIError(401,"Invalid Access Token")
            }
        
            req.user=user;
            next()
} catch (error) {
    throw new APIError(401,"Invalid Access Token")
}
})