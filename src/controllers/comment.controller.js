import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.model.js"
import {APIError, ApiError} from "../utils/ApiError.js"
import {APIResponse, ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {content}=req.body
    const {videoID}=req.params
    if(!content)
        {
            throw new APIError(400,"content Field Required")
        }
    if(!isValidObjectId(videoID))
        {
            throw new APIError(400,"Invalid Video ID")
        }
    const findVideo=await Video.findById(videoID)
    if(!findVideo)
        {
            throw new APIError(400,"Video Not Found")
        }
    const createComment=new Comment.create(
        {
            content,
            owner:req?.user._id,
            video:videoID
        }
    ) 
    if(!createComment)
        {
            throw new APIError(401,"Error while creating comment")
        }
    return res
    .status(200)
    .json(new APIResponse(200,"Comment Added Successfully",createComment))
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const {CommentID}=req.params
    if(!isValidObjectId(CommentID))
        {
            return new APIError(400,"comment ID Invalid")
        }
    const findComment=await Comment.findById(CommentID)
    if(req.user._id != findComment.owner.toString())
        {
            throw new APIError(402,"Only owner can update comment")
        }
    const {content}=req.body
    if(!content)
        {
            return new APIError(402,"Content Field Required")
        }
    const changeComment=await Comment.findByIdAndUpdate(
        CommentID,
        {
            $set:{
                content
            }
        },
        {
            new:true
        }
    )
    if(!changeComment)
        {
            throw new APIError(400,"Error while updateing Comment")
        }
    return res
    .status(200)
    .json(new APIError(200,"Comment Updated Successfully",changeComment))
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {CommentID}=req.params
    if(!isValidObjectId(CommentID))
        {
            return new APIError(400,"comment ID Invalid")
        }
    const findComment=await Comment.findById(CommentID)
    if(req.user._id != findComment.owner.toString())
        {
            throw new APIError(402,"Only owner can delete comment")
        }
    const changeComment=await Comment.findByIdAndDelete(CommentID)
    if(!changeComment)
        {
            throw new APIError(400,"Error while Deleting Comment")
        }
    return res
    .status(200)
    .json(new APIError(200,"Comment Deleted Successfully",changeComment))

})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }