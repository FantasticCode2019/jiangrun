package handlers

import (
	"jiangrun-server/pkg/response"
	"jiangrun-server/pkg/storage"
	"net/http"

	"github.com/gin-gonic/gin"
)

// UploadImage 上传图片
func UploadImage(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, storage.MaxSizeFor("images")+(1<<20))
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
		response.BadRequest(c, "上传失败：文件内容、大小或格式不符合要求")
		return
	}

	response.Success(c, gin.H{
		"url":      path,
		"filename": file.Filename,
	})
}

// UploadVideo 上传视频
func UploadVideo(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, storage.MaxSizeFor("videos")+(1<<20))
	file, err := c.FormFile("file")
	if err != nil {
		response.BadRequest(c, "请选择文件")
		return
	}

	if !storage.IsVideoFile(file.Filename) {
		response.BadRequest(c, "不支持的视频格式，仅支持 mp4/mov/webm")
		return
	}

	path, err := storage.SaveFile(file, "videos")
	if err != nil {
		response.BadRequest(c, "上传失败：文件内容、大小或格式不符合要求")
		return
	}

	response.Success(c, gin.H{
		"url":      path,
		"filename": file.Filename,
		"size":     file.Size,
	})
}
