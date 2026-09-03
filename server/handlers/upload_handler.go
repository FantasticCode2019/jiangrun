package handlers

import (
	"jiangrun-server/pkg/response"
	"jiangrun-server/pkg/storage"

	"github.com/gin-gonic/gin"
)

// UploadImage 上传图片
func UploadImage(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		response.BadRequest(c, "请选择文件")
		return
	}

	if !storage.IsImageFile(file.Filename) {
		response.BadRequest(c, "不支持的图片格式，仅支持 jpg/jpeg/png/gif/webp")
		return
	}

	path, err := storage.SaveFile(file, "images")
	if err != nil {
		response.ServerError(c, "上传失败: "+err.Error())
		return
	}

	response.Success(c, gin.H{
		"url":      path,
		"filename": file.Filename,
	})
}

// UploadVideo 上传视频
func UploadVideo(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		response.BadRequest(c, "请选择文件")
		return
	}

	if !storage.IsVideoFile(file.Filename) {
		response.BadRequest(c, "不支持的视频格式，仅支持 mp4/mov/avi/mkv/webm")
		return
	}

	path, err := storage.SaveFile(file, "videos")
	if err != nil {
		response.ServerError(c, "上传失败: "+err.Error())
		return
	}

	response.Success(c, gin.H{
		"url":      path,
		"filename": file.Filename,
		"size":     file.Size,
	})
}
