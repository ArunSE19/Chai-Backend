import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {APIError, ApiError} from "../utils/ApiError.js"
import {APIResponse, ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const {content}=req.body
    console.log(content)
    if(!content)
        {
            throw new APIError(400,"tweet Content Required")
        }
    const tweetCreate=await Tweet.create(
        {
            content,
            owner: req.user?._id
        }
    
    )
    if(!tweetCreate)
        {
            throw new APIError(401,"Error while creating Tweet")
        }
    
    return res
    .status(200)
    .json(new APIResponse(200,tweetCreate,"Tweet Created Successfully"))
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {userId}=req.params
    if(!isValidObjectId(userId))
        {
            throw new APIError(400,"UserID is not Valid")
        }
    const getTweets=await Tweet.aggregate(
        [
            {
                $match: new mongoose.Types.ObjectId(userId)
            },
            {
                $lookup:{
                    from:"users",
                    foreignField:"_id",
                    localField:"owner",
                    as:"owner",
                    pipeline:[
                        {
                            $project:{
                                username: 1,
                                avatar: 1
                            }
                        }
                    ]
                }
            },
            {
                $lookup:{
                    from:"likes",
                    foreignField:"tweet",
                    localField:"_id",
                    as:"likes",
                    pipeline:[
                        {
                            $project:{
                                likedBy:1
                            }
                        }
                    ]
                }
            },
            {
                $addFields:{
                    totalLikes:{
                        $size:"$likedBy"
                    },
                    ownerDetails:{
                        $first:"$owner"
                    }
                }
            },
            {
                $project:{
                    content: 1,
                    ownerDetails: 1,
                    totalLikes: 1,
                    createdAt: 1
                }
            }
            
        ]
    )
    if(!getTweets)
        {
            return new APIError(400,"No Tweets Found")
        }
    return res.
    status(200)
    .json(new APIResponse( 200,getTweets,"Tweets Fetched Successfully"))
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {tweerID}=req.params
    if(!isValidObjectId(tweerID))
        {
            throw new APIError(400,"Invalid Tweet ID")
        }
    
    const findTweet=await Tweet.findById(tweerID)
    if(req?.user._id != findTweet?.owner.toString())
        {
            throw new APIError(402,"You are not authorized to delete tweet")
        }
    const findAndDeleteTweet=await Tweet.findByIdAndDelete(tweerID)
    if(!findAndDeleteTweet)
        {
            throw new APIError(403,"Error while Deleting Tweet")
        }
    
    return res.
    status(200)
    .json(new APIResponse(200,"Tweet Deleted Successfully",findAndDeleteTweet))
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweerID}=req.params
    const {content}=req.body
    if(!isValidObjectId(tweerID))
        {
            throw new APIError(400,"Invalid Tweet ID")
        }
    if(!content)
        {
            throw new APIError(401,"Content Field Required")
        }
    const findTweet=await Tweet.findById(tweerID)
    if(req?.user._id != findTweet?.owner.toString())
        {
            throw new APIError(402,"You are not authorized to update tweet")
        }
    const findAndUpdateTweet=await Tweet.findByIdAndUpdate(
        tweerID,
        {
            $set:{
                content
            }
        },
        {
            new:true
        }
    )
    if(!findAndUpdateTweet)
        {
            throw new APIError(403,"Error while updating Tweet")
        }
    
    return res.
    status(200)
    .json(new APIResponse(200,"Tweet Updated Successfully",findAndUpdateTweet))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}