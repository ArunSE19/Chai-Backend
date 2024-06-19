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
    if(!isValidObjectId(commentId))
        {
            return new APIError(400,"Invalid comment ID")
        }
    const findUser=await User.findById(req.user._id)
    if(!findUser)
        {
            return new APIError(400,"No User Exist")
        }
    const findComment=await Comment.findById(commentId)
    if(!findComment)
        {
            return new APIError(400,"No comment found")
        }
    try{
        isCommentLiked=await Like.findOne({
            commentId,
            LikedBy:findUser._id
        })
        if(isCommentLiked)
            {
                const unlikeComment=await Like.findByIdAndDelete({
                    commentId,
                    LikedBy:findUser._id
                })
                if(!unlikeComment)
                    {
                        return new APIError(402,"Error while unliking Comment")
                    }
                return res
                .status(200)
                .json(new APIResponse(200,"Comment Unliked Successfully"))
            }
        else{
            const likeComment=await Like.create(
                {
                    commentId,
                    LikedBy:findUser._id
                }
            )
            if(!likeComment)
                {
                    throw new APIError(400,"Error while liking Comment")
                }
        }
   
        return res
        .status(200)
        .json(new APIResponse(200,"Comment Liked Successfully",likeComment))
    }
    catch(error)
    {
        throw new APIError(401,error.message)
    }

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    if(!isValidObjectId(tweetId))
        {
            return new APIError(400,"Invalid Tweet ID")
        }
    const findUser=await User.findById(req.user?._id)

    if(!findUser)
        {
            return new APIError(401,"User not found")
        }
    const findTweet=await Tweet.findById(tweetId)
    if(!findTweet)
        {
            throw new APIError(400,"Tweet not found")
        }
    try{
        const findTweetLike=await Like.findOne({
            tweetId,
            likedBy:findUser._id
        })
        if(findTweetLike)
            {
                const unlikeTweet=await Like.findByIdAndDelete({
                    tweetId,
                    likedBy:findUser._id
                })
                if(!unlikeTweet)
                    {
                        return new APIError(402,"Error while unliking tweet")
                    }
                return res
                .status(200)
                .json(new APIResponse(200,"Tweet unliked Successfully"))
            }
        else{
            const likeTweet=await Like.create({
                tweetId,
                likedBy:findUser._id
            })
            if(!likeTweet)
                {
                    return new APIError(402,"Error when unliking Comment")
                }
            return res
            .status(200)
            .json(new APIResponse(402,"Tweet Liked Successfully"))
        }
    }
    catch(error)
    {
        throw new APIError(402,error.message)
    }
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const videoLiked=await Like.aggregate(
        [
            {
                $match:{
                    likedBy:new mongoose.Types.ObjectId(req.user?._id),
                    video:{
                        $exists:true
                    }
                }
            },
            {
                $lookup:{
                    from:"videos",
                    foreignField:"_id",
                    localField:"video",
                    as:"Videos Likes",
                    pipeline:[
                        {
                            $lookup:{
                                from:"users",
                                foreignField:"_id",
                                localField:"owner",
                                as:"owner",
                                pipeline:[{
                                    $project:{
                                        fullname:1,
                                        username:1,
                                        avatar:1
                                    }
                                }]
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
            },
            {
                $addFields: {
                    likedVideo: {
                        $first: "$likedVideo"
                    }
                }
            }
            
        ]
    )
    if(!videoLiked)
        {
            throw new APIError(400,"No liked Video Found")
        }
    return res
    .status(200)
    .json(new APIResponse(200,"Video Found",videoLiked))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}