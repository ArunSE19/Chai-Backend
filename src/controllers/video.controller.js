import mongoose, { isValidObjectId } from "mongoose"
import {APIError} from "../utils/ApiError.js"
import {APIResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {deleteFromCloudinary, uploadOnCloudinary} from "../utils/cloudinary.js"
import { Video } from "../models/video.models.js"
import { User } from "../models/user.models.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    const Page = parseInt(page);
    const Limit = parseInt(limit);

    const result = await Video.aggregate([
        {
            $match: {
                isPublished: true
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerOfVideo",
                pipeline: [{
                    $project: {
                        fullname: 1,
                        username: 1,
                        avatar: 1
                    }
                }]
            },
        },
        {
            $addFields: {
                ownerOfVideo: { $first: "$ownerOfVideo" },
            }
        },
        {
            $facet: {
                videos: [
                    { $skip: (Page - 1) * Limit },
                    { $limit: Limit },
                    {
                        $sort: { [sortBy]: sortType === "asc" ? 1 : -1 }
                    }
                ],
                totalVideos: [
                    { $count: "count" }
                ]
            }
        },
    ]).option({ maxTimeMS: 60000})

    try {
        const videos = result[0].videos;
        const videosOnPage = videos.length
        const totalVideos = result[0].totalVideos[0]?.count || 0;

        if (videos.length === 0) {
            return res.status(200).json(new ApiResponse(200, {}, "No videos to show"));
        } else {
            return res.status(200).json(new ApiResponse(200, { videos, videosOnPage, totalVideos }, "Videos list fetched successfully"));
        }
    } catch (error) {
        throw new ApiError(400, error.message || "Something went wrong");
    }
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
    await Video.findByIdAndUpdate(
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
    if(!isValidObjectId(videoId))
        {
            return new APIError(400,"Invalid Video ID")
        }

    const currentVideo=await Video.findById(videoId)
    if(currentVideo?.owner.toString()!= req.user?._id)
        {
            console.log(currentVideo.owner)
            console.log(req.user?._id)
            throw new APIError(400,"You are not the owner of the video, you cannot update the video")
        }

    const {title,description}=req.body
    const thumbnailLocalPath=req.files?.thumbnail[0].path
        console.log(thumbnailLocalPath)

    if(!title && !description && !thumbnailLocalPath)
        {
            throw new APIError(400, "Atleast one field required to update")
        }
    
    if(thumbnailLocalPath)
        {
            let oldVideo=currentVideo.thumbnail.url
            let videoUpload=await uploadOnCloudinary(thumbnailLocalPath)
            if(!videoUpload)
                {
                    throw new APIError(400, "Error While uploading file on cloudinary")
                }
            await deleteFromCloudinary(oldVideo)
        }
        else
        {
         //   thumbnailLocalPath=currentVideo.thumbnail.url
        }
    
    
    const videoupdate=await Video.findByIdAndUpdate(
        videoId,
        {
            $set:{
                title,
                description,
                thumbnail:thumbnailLocalPath.url
            }
        },
        {
            new:true
        }
    )

    return res
    .status(200)
    .json(200,"Video Updated Successfully",videoupdate)

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    if(!isValidObjectId(videoId))
        {
            throw new APIError(400,"Invalid video ID")
        }
    
    const ownerVideo=await Video.findById(videoId)

            if(!ownerVideo)
                {
                    throw new APIError(401,"No such Video Found")
                }
            else if(ownerVideo.owner.toString() != req.user?._id)
                {
                    throw new APIError(401,"You don't have right to delete the video")
                }
    const deleteVideo=await deleteFromCloudinary(ownerVideo.videoFile.url,"video")
    const delteThumbnail=await deleteFromCloudinary(ownerVideo.thumbnail.url)
    if(!deleteVideo || !delteThumbnail)
        {
            throw new APIError(402,"Error while deleting video from cloudinary")
        }
    const videoDeleteFromDB=await Video.findByIdAndDelete(videoId)


    if(!videoDeleteFromDB)
        {
            throw new APIError(403,"Error while deleting file from DB")
        }
    
    return res
    .status(200)
    .json(200,"Video Deleted Successfully",videoDeleteFromDB)
        
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!videoId)
        {
            throw new APIError(400,"Invalid Video ID")
        }
    
    const videoCheck=await Video.findById(videoId)
    if(!videoCheck)
        {
            return new APIError(401,"Unable to Find Video")
        }

    if(videoCheck.owner.toString()!=req?.user._id)
        {
            throw new APIError(400,"You are not authorised to change toggle status")
        }
    
    const updateVideoStatus=await Video.findByIdAndUpdate(
        videoId,
        {
            $set:{
                isPublished:!videoCheck?.isPublished
            }
        },
        {
            new:true
        }
    )
    return res
    .status(200)
    .json(new APIResponse(200,"Video publish status updated",{isPublished:updateVideoStatus.isPublished}))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}


