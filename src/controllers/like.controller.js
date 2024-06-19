import mongoose, {isValidObjectId} from "mongoose"
import {Like, LikedBy} from "../models/like.model.js"
import {APIError, ApiError} from "../utils/ApiError.js"
import {APIResponse, ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params

    if(!isValidObjectId(videoId))
        {
            throw new APIError(400,"Invalid Video ID")
        }
    const findUser=await User.findById(req.user._id)
    if(!findUser)
        {
            throw new APIError(400,"No User Found")
        }
    const findVideo=await Video.findById(videoId)
    if(!findVideo)
        {
            throw new APIError(400,"No Video Exist")
        }
    try{
        isVideoLiked=await Like.findOne({
            videoId,
            LikedBy:findUser._id
        })
        if(isVideoLiked)
            {
                const like=await Like.findByIdAndDelete({
                    videoId,
                    LikedBy:findUser._id
                })
                if(!like)
                    {
                        throw new APIError(400,"Error while unliking video")
                    }
                
                return res
                .status(200)
                .json(new APIResponse(200,"Video Unliked Successfully",like))
            }
        else{
            const likeVideo=await Like.create({
                video:videoId,
                LikedBy:findUser._id
            })
            if(!likeVideo)
                {
                    throw new APIError(401,"Error while liking video")
                }
             return res.status(200).json(new ApiResponse(200, "video liked successfully",likeVideo))
        }
    }catch(error)
    {
        throw new APIError(401,error.message)
    }
    
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}