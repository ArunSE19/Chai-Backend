import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {APIError, ApiError} from "../utils/ApiError.js"
import {APIResponse, ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    //TODO: create playlist
    if(!name || !description)
        {
            throw new APIError(400,"Name And Description For Playlist Required")
        }
    const playListVideo=await Playlist.create({
        name,
        description,
        owner:req?.user._id
    })

    if(!playListVideo)
        {
            throw new APIError(401,"Error In Creating Playlist object")
        }

        return res
        .status(200)
        .json(new APIResponse(200,"Playlist created successfully",playListVideo))

})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
    if(!isValidObjectId(userId))
        {
            throw new APIError(400,"Invalid userId")
        }
    const playListitems=await Playlist.aggregate(
        [
            {
                $match:{
                    _id:new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $lookup:{
                    from:"videos",
                    localField:"videos",
                    foreignField:"_id",
                    as:"videos"
                }
            },
            {
                $addFiels:{
                    videoCount:{
                        $size:"$videos"
                    },
                    videos:{
                        $first:"$videos"
                    }
                }
            },
            {
                $project:{
                    _id:1,
                    name:1,
                    description:1,
                    videos:{
                        _id:1,
                        thumbnail:1,
                    },
                    videoCount:1
                }
            }
        ]
    )

    if(!playListitems)
        {
            throw new APIError(401,"No playlists found")
        }
    
        return res
        .status(200)
        .json(new APIResponse(200,"Playlists Found",playListitems))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    if(!isValidObjectId(playlistId))
        {
            throw new APIError(400,playlistId)
        }
    const playListById=await Playlist.aggregate(
        [
            {
                $match:new mongoose.Types.ObjectId(playlistId)
            },
            {
                $lookup:{
                    from:"users",
                    localField:"owner",
                    foreignField:"_id",
                    as:"owner",
                }
            },
            {
                $lookup:{
                    from:"videos",
                    localField:"videos",
                    foreignField:"_id",
                    as:"videos"
                }
            },
            {
                $addFields:{
                    videoCount:{
                        $size:"$videos"
                    },
                    viewsCount:{
                        $sum:"$videos.views"
                    },
                    owner:{
                        $first:"$owner"
                    }
                }
            },
            {
                $project:{
                    _id:1,
                    name:1,
                    description:1,
                    videos:{
                        _id:1,
                        title:1,
                        description:1,
                        thumbnail:1
                    },
                    owner:{
                        _id:1,
                        usename:1,
                        fullname:1
                    }
                }
            }
        ]
    )

    if(!playListById)
        {
            throw new APIError(402,"Error in getting playlist")
        }

    return res
    .status(200)
    .json(new APIResponse(200,"Playlist Fetched",playListById))

})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if(!isValidObjectId(playListById) || !isValidObjectId(videoId))
        {
            throw new APIError(401,"Invalid playlist or videoID")
        }
    const findVideo=await Video.findById(videoId)
    if(!findVideo)
        {
            throw new APIError(401,"No Such Video Available")
        }
    const addVideo=await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet:{
                $videos:videoId
            }     
        },
        {
            new:true
        }
    )
    if(!addVideo)
        {
            throw new APIError(402,"Either no such video available or playlist")
        }
    
    return res
    .status(200)
    .json(new APIResponse(200,addVideo,"Video Added Successfully"))    
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist
    if(!isValidObjectId(playlistId) || !isValidObjectId(!videoId))
        {
            throw new APIError(402,"Invalid video or playlist ID")
        }
    const findVideo=await Video.findById(videoId)
    if(!findVideo)
        {
            throw new APIError(401,"No such Video Available")
        }
    const removeVideo=await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull:{
                videos:videoId
            }
        },
        {
            new:true
        }
    )

    if(!removeVideo)
        {
            throw new APIError(401,"Error while removing video from Playlist")
        }
    
    return res
    .status(200,removeVideo,"Video Removed Successfully")
    
    

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
    if(!isValidObjectId(playlistId))
        {
            throw new APIError(400,"Invalid Object ID:Delete Playlist")
        }
    
        const findPlaylist=await Playlist.findByIdAndDelete(
            playlistId
        )

        if(!findPlaylist)
            {
                throw new APIError(401,findPlaylist,"Either playlist not found or error while deleteing playlist")
            }
        
        return res
        .status(200)
        .json(200,findPlaylist,"Playlist deleted Successfully")
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist

    if(!isValidObjectId(playlistId))
        {
            throw new APIError(400,"Invalid Playlist ID")
        }
    if(!name || !description)
        {
            throw new APIError(401,"Both name and Description required")
        }

    const updatePlaylist=await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set:{
                name,
                description
            }
        },
        {
            new:true
        }
    )
    if(!updatePlaylist)
        {
            throw new APIError(402,"Error while updating playlist")
        }
    
    return res
    .status(200)
    .json(200,updatePlaylist,"Playlist Updated Successfully")
    
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}