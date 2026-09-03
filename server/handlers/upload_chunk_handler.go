package handlers

import (
	"path/filepath"
	"strconv"
	"strings"

	"jiangrun-server/pkg/response"
	"jiangrun-server/pkg/storage"

	"github.com/gin-gonic/gin"
)

// ChunkInitRequest 初始化分片上传
type ChunkInitRequest struct {
	Filename string `json:"filename" binding:"required"` // 原始文件名（含扩展名）
	Size     int64  `json:"size" binding:"required"`     // 总字节数
	Subdir   string `json:"subdir"`                      // images | videos
	UploadID string `json:"upload_id"`                   // 续传时复用
}

// ChunkInit 初始化分片上传，返回 upload_id
func ChunkInit(c *gin.Context) {
	var req ChunkInitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	subdir := req.Subdir
	if subdir == "" {
		subdir = "images"
	}
	ext := strings.ToLower(filepath.Ext(req.Filename))

	// 校验文件类型与大小
	if subdir == "videos" {
		if !storage.IsVideoFile(req.Filename) {
			response.BadRequest(c, "不支持的视频格式")
			return
		}
	} else {
		if !storage.IsImageFile(req.Filename) {
			response.BadRequest(c, "不支持的图片格式")
			return
		}
	}

	maxSize := storage.MaxSizeFor(subdir)
	if req.Size > maxSize {
		response.BadRequest(c, "文件大小超过限制")
		return
	}

	// 断点续传：若前端提供了 upload_id 且临时目录还存在，则复用
	uploadID := req.UploadID
	if uploadID == "" || storage.ChunkDirExists(uploadID) == false {
		newID, err := storage.ChunkInit()
		if err != nil {
			response.ServerError(c, "初始化失败: "+err.Error())
			return
		}
		uploadID = newID
	}

	response.Success(c, gin.H{
		"upload_id":  uploadID,
		"ext":        ext,
		"chunk_size": storage.ChunkSizeBytes(),
		"total_size": req.Size,
		"subdir":     subdir,
	})
}

// ChunkUpload 上传单个分片
func ChunkUpload(c *gin.Context) {
	uploadID := c.PostForm("upload_id")
	indexStr := c.PostForm("index")
	chunkFile, err := c.FormFile("file")
	if err != nil || uploadID == "" {
		response.BadRequest(c, "缺少分片参数")
		return
	}

	index, err := strconv.Atoi(indexStr)
	if err != nil || index < 0 {
		response.BadRequest(c, "分片序号错误")
		return
	}

	if err := storage.SaveChunk(uploadID, index, chunkFile); err != nil {
		response.ServerError(c, "保存分片失败: "+err.Error())
		return
	}

	response.Success(c, gin.H{"index": index})
}

// ChunkStatus 查询某上传已成功接收哪些分片（用于断点续传）
func ChunkStatus(c *gin.Context) {
	uploadID := c.Query("upload_id")
	if uploadID == "" {
		response.BadRequest(c, "缺少 upload_id")
		return
	}
	idx, err := storage.UploadedChunks(uploadID)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"uploaded": idx})
}

// ChunkComplete 合并分片完成上传，返回最终 URL
func ChunkComplete(c *gin.Context) {
	uploadID := c.PostForm("upload_id")
	ext := c.PostForm("ext")
	subdir := c.PostForm("subdir")
	if uploadID == "" {
		response.BadRequest(c, "缺少 upload_id")
		return
	}
	if subdir == "" {
		subdir = "images"
	}
	if !strings.HasPrefix(ext, ".") {
		ext = "." + ext
	}

	url, err := storage.CompleteChunk(uploadID, ext, subdir)
	if err != nil {
		response.ServerError(c, "合并失败: "+err.Error())
		return
	}

	response.Success(c, gin.H{"url": url})
}