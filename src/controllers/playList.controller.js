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
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
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