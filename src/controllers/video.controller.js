import mongoose, { isValidObjectId } from "mongoose"
import {APIError} from "../utils/ApiError.js"
import {APIResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { Video } from "../models/video.models.js"
import { User } from "../models/user.models.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    
    if([title,description].some((field)=>field?.trim()===""))
        {
            throw new APIError(400,"All fields are required")
        }
   // console.log(req)
    //console.log(req.files)
    const videoLocalPath=req.files?.videoFile[0].path
    const thumbnailLocalPath=req.files?.thumbnail[0].path
    if(!videoLocalPath)
        {
            throw new APIError(400,"Video File Path Missing")
        }
    
    if(!thumbnailLocalPath)
        {
            throw new APIError(400,"Thumbnail File Path Missing")
        }
        
    
    const video=await uploadOnCloudinary(videoLocalPath)
    const thumbnail=await uploadOnCloudinary(thumbnailLocalPath)
    console.log(video)
    if(!video.url)
        {
            throw new APIError(400,"Error While Uploading Video File")
        }
    if(!thumbnail.url)
        {
            throw new APIError(400,"Error While Uploading  Thumbnail File")
        }
    const videoObject=await Video.create({
        title,
        description,
        videoFile:video.url,
        thumbnail:thumbnail.url,
        duration:video.duration,
        owner:req.user?._id 
    })

    const createdVideo= await Video.findById(videoObject._id)

    if(!createdVideo)
        {
            throw new APIError(401,"Something Went Wrong While Uploading The Video")
        }
    
    return res.status(200).json(new APIResponse(200,"Video Published Successfully",createdVideo))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    //const videoObject=await Video.findById(videoId)
    if(!isValidObjectId(videoId))
        {
            throw new APIError(400,"Invalid Video ID")
        }
    const videoObject=await Video.aggregate(
        [
            {
                $match:{
                    _id: new mongoose.Types.ObjectId(videoId) 
                }
            },
            {
                $lookup:{
                    from:"likes",
                    localField:"_id",
                    foreignField:"video",
                    as:"likes"
                }
            },
            {
                $lookup:{
                    from:"users",
                    localField:"owner",
                    foreignField:"_id",
                    as:"owner",
                    pipeline:[
                        {
                            $lookup:{
                                from:"subscriptions",
                                localField:"_id",
                                foreignField:"channel",
                                as:"subscribers"
                            }
                        },
                        {
                            $addFields:{
                                subscriberCount:{
                                    $size:{"$ifNull":["$subscribers",[] ] }
                                },
                                isSubscribed:{
                                    $cond:{
                                        if:{ $in:[req.user?._id,"$subscribers.subscriber"]
                                        },
                                        then:true,
                                        else:false
                                    }
                                }
                            }
                        },
                        {
                            $project:{
                                username:1,
                                avatar:1,
                                subscriberCount:1,
                                isSubscribed:1
                            }
                        }
                    ]
                }
            },
            {
                $addFields:{
                    likesCount:{
                        $size:{"$ifNull":["$likes",[]]}
                    },
                    owner:{
                        $first:"$owner"
                    },
                    isLiked:{
                        $cond:{
                            if:{
                                $in:[
                                    req.user?._id,
                                    "$likes.likedBy"
                                ]
                            },
                            then:true,
                            else:false
                        }
                    }
                }
            },
            {
                $project: {
                    videoFile: 1,
                    title: 1,
                    description: 1,
                    views: 1,
                    createdAt: 1,
                    isPublished: 1,
                    duration: 1,
                    comments: 1,
                    owner: 1,
                    likesCount: 1,
                    isLiked: 1
                }
            },
            {
                $lookup:{
                    from:"comments",
                    localField:"_id",
                    foreignField:"video",
                    as:"comment"
                }

            },
            {
                $addFields:{
                    commentCount:{
                        $size:{"$ifNull":["$comments",[]]}
                    }
                }
            },
            {
                $project:{
                    subscribers:0
                }
            }
        ]
    )
    if(!videoObject.length)
        {
            return new APIError(404,"Video Doesnot Exist")
        }
    console.log(videoObject)
    await Video.findByIdAndDelete(
        videoId,
        {
            $inc:{
                views:1
            }
        },
        {
            new:true
        }
    )

    const user=await User.findById(req.user?._id).select("watchHistory")
    user.watchHistory.push(videoId)
    await user.save()


    const updatedVideo = {
        videoObject,
        watchHistory: user.watchHistory
    }
    return res.
    status(200)
    .json(new APIResponse(200,updatedVideo,"Video Found Successfully"));
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}