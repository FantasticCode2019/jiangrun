package handlers

import (
	"net/http"
	"strconv"
	"time"

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
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 16<<10)
	var req ChunkInitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	userID, _ := c.Get("user_id")
	ownerID, ok := userID.(uint)
	if !ok {
		response.Unauthorized(c, "认证信息无效")
		return
	}
	_ = storage.CleanupExpiredChunks(24 * time.Hour)
	var meta *storage.ChunkMetadata
	var initErr error
	if req.UploadID != "" {
		meta, initErr = storage.ResumeChunkUpload(req.UploadID, req.Filename, req.Subdir, req.Size, ownerID)
	} else {
		meta, initErr = storage.InitChunkUpload(req.Filename, req.Subdir, req.Size, ownerID)
	}
	if initErr != nil {
		response.BadRequest(c, initErr.Error())
		return
	}

	response.Success(c, gin.H{
		"upload_id":   meta.UploadID,
		"ext":         meta.Extension,
		"chunk_size":  meta.ChunkSize,
		"chunk_count": meta.ChunkCount,
		"total_size":  meta.TotalSize,
		"subdir":      meta.Subdir,
	})
}

// ChunkUpload 上传单个分片
func ChunkUpload(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, storage.ChunkSizeBytes()+(1<<20))
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

	userID, _ := c.Get("user_id")
	ownerID, ok := userID.(uint)
	if !ok {
		response.Unauthorized(c, "认证信息无效")
		return
	}
	if err := storage.SaveChunk(uploadID, index, chunkFile, ownerID); err != nil {
		response.BadRequest(c, "保存分片失败: "+err.Error())
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
	userID, _ := c.Get("user_id")
	ownerID, ok := userID.(uint)
	if !ok {
		response.Unauthorized(c, "认证信息无效")
		return
	}
	idx, err := storage.UploadedChunks(uploadID, ownerID)
	if err != nil {
		response.ServerError(c, err.Error())
		return
	}
	response.Success(c, gin.H{"uploaded": idx})
}

// ChunkComplete 合并分片完成上传，返回最终 URL
func ChunkComplete(c *gin.Context) {
	uploadID := c.PostForm("upload_id")
	if uploadID == "" {
		response.BadRequest(c, "缺少 upload_id")
		return
	}
	userID, _ := c.Get("user_id")
	ownerID, ok := userID.(uint)
	if !ok {
		response.Unauthorized(c, "认证信息无效")
		return
	}
	url, err := storage.CompleteChunk(uploadID, ownerID)
	if err != nil {
		response.BadRequest(c, "上传任务无法完成，请检查分片完整性和文件格式")
		return
	}

	response.Success(c, gin.H{"url": url})
}
