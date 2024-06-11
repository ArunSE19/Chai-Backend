import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {APIError, ApiError} from "../utils/ApiError.js"
import {APIResponse, ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    if(!isValidObjectId(channelId))
        {
            throw new APIError(400,"Invalid Channel ID")
        }
    
    const changeToggle=await Subscription.findById({
            subscriber:req.user?._id,
            channelId:channelId
        }
    )
    if(changeToggle)
        {
            await Subscription.findByIdAndDelete(changeToggle._id)

            return res
            .status(200)
            .json(new APIResponse(200,"Channel Unsubscribed Successfully",{subscribed:false}))
        }
    
    await Subscription.create({
        subscriber:req.user?._id,
        channel:channelId
    })

    return res
    .status(200)
    .json(new APIResponse(200,"Channel Subscribed Successfully",{subscribed:true}))
    
    })

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if(!isValidObjectId(channelId))
        {
            throw new APIError(400,"Invalid Channel ID")
        }
    
    const channelCheck=await Subscription.aggregate(
        [
            {
                $match:new mongoose.Types.ObjectId(channelId)
            },
            {
                $lookup:{
                    from:"users",
                    localField:"subscriber",
                    foreignField:"_id",
                    as:"subscribers"
                }
            },
            {
                $unwind:"subscribers"
            },
            {
                $project:{
                    _id:1,
                    subscriber:{
                        _id:"$subscribers._id",
                        username:"$subscribers.username",
                        avatar:"$subscribers.avatar"
                    }
                }
            }
        ]
    )

    if(!channelCheck)
        {
            throw new APIError(400,"No Such Channel Exists")
        }
        
        return res
        .status(200)
        .json(new APIResponse(200,"Subscribers List Fetched",channelCheck))
        
    
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if(!isValidObjectId(subscriberId))
        {
            throw new APIError(400,"Invalid Object ID")
        }
    
    const channelsList=await Subscription.aggregate(
        [
            {
                $match:new mongoose.Types.ObjectId(subscriberId)
            },
            {
                $lookup:{
                    from:"users",
                    localField:"channel",
                    foreignField:"_id",
                    as:"subscribers"
                }
            },
            {
                $unwind:"$channels"
            },
            {
                $project:{
                    _id:1,
                    channel:{
                        _id:1,
                        username:1,
                        avatar:1
                    }
                }
            }

        ]
    )

    if(!channelsList)
        {
            throw new APIError("No such Channel Exists")
        }

    return res
    .status(200)
    .json(200,"Subscribers Found",channelsList)


})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}