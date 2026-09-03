package handlers

import (
	"fmt"
	"strconv"
	"strings"

	"jiangrun-server/models"
	"jiangrun-server/pkg/response"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type VideoRequest struct {
	Title         string `json:"title" binding:"required,max=200"`
	Slug          string `json:"slug" binding:"max=200"`
	CoverImage    string `json:"cover_image" binding:"max=500"`
	VideoURL      string `json:"video_url" binding:"required,max=500"`
	VideoType     string `json:"video_type" binding:"max=20"`
	Duration      int    `json:"duration"`
	Description   string `json:"description" binding:"max=4000"`
	Content       string `json:"content"`
	CategoryID    *uint  `json:"category_id"`
	RelatedCaseID *uint  `json:"related_case_id"`
	IsFeatured    bool   `json:"is_featured"`
	SortOrder     int    `json:"sort_order"`
	Status        int    `json:"status"`
}

// GetVideos 获取视频列表 (公开)
func GetVideos(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "12"))
	categoryID := c.Query("category_id")
	featured := c.Query("featured")

	if page < 1 {
		page = 1
	}
	if size < 1 || size > 50 {
		size = 12
	}

	query := models.DB.Model(&models.Video{}).Where("status = ?", 1)

	if categoryID != "" {
		query = query.Where("category_id = ?", categoryID)
	}
	if featured == "true" {
		query = query.Where("is_featured = ?", true)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		response.ServerError(c, "读取视频失败")
		return
	}

	var videos []models.Video
	if err := query.Order("sort_order ASC, id DESC").
		Offset((page - 1) * size).
		Limit(size).
		Preload("Category").
		Preload("RelatedCase").
		Find(&videos).Error; err != nil {
		response.ServerError(c, "读取视频失败")
		return
	}

	response.Page(c, videos, total, page, size)
}

// GetVideo 获取视频详情
func GetVideo(c *gin.Context) {
	id := c.Param("id")

	var video models.Video
	if err := models.DB.Where("status = ?", 1).Preload("Category").Preload("RelatedCase").First(&video, id).Error; err != nil {
		response.NotFound(c, "视频不存在")
		return
	}
	video.Content = sanitizeRichText(video.Content)

	response.Success(c, video)
}

// IncrementViewCount 增加视频播放量
func IncrementViewCount(c *gin.Context) {
	id := c.Param("id")

	var count int64
	if err := models.DB.Model(&models.Video{}).Where("id = ? AND status = ?", id, 1).Count(&count).Error; err != nil {
		response.ServerError(c, "更新播放量失败")
		return
	}
	if count == 0 {
		response.NotFound(c, "视频不存在")
		return
	}

	if err := models.DB.Model(&models.Video{}).Where("id = ?", id).
		UpdateColumn("view_count", gorm.Expr("view_count + 1")).Error; err != nil {
		response.ServerError(c, "更新播放量失败")
		return
	}
	response.Success(c, nil)
}

// GetFeaturedVideos 获取推荐视频
func GetFeaturedVideos(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "6"))
	if limit < 1 || limit > 20 {
		limit = 6
	}

	var videos []models.Video
	if err := models.DB.Where("is_featured = ? AND status = ?", true, 1).
		Order("sort_order ASC, id DESC").
		Limit(limit).
		Preload("Category").
		Find(&videos).Error; err != nil {
		response.ServerError(c, "读取视频失败")
		return
	}

	response.Success(c, videos)
}

// AdminGetVideos 管理员获取所有视频
func AdminGetVideos(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))
	keyword := c.Query("keyword")
	categoryID := c.Query("category_id")

	if page < 1 {
		page = 1
	}
	if size < 1 || size > 100 {
		size = 20
	}
	if len([]rune(keyword)) > 100 {
		response.BadRequest(c, "搜索词过长")
		return
	}

	query := models.DB.Model(&models.Video{})

	if keyword != "" {
		query = query.Where("title LIKE ?", "%"+keyword+"%")
	}
	if categoryID != "" {
		query = query.Where("category_id = ?", categoryID)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		response.ServerError(c, "读取视频失败")
		return
	}

	var videos []models.Video
	if err := query.Order("sort_order ASC, id DESC").
		Offset((page - 1) * size).
		Limit(size).
		Preload("Category").
		Preload("RelatedCase").
		Find(&videos).Error; err != nil {
		response.ServerError(c, "读取视频失败")
		return
	}

	response.Page(c, videos, total, page, size)
}

// AdminGetVideo 管理员获取视频详情
func AdminGetVideo(c *gin.Context) {
	id := c.Param("id")

	var video models.Video
	if err := models.DB.Preload("Category").Preload("RelatedCase").First(&video, id).Error; err != nil {
		response.NotFound(c, "视频不存在")
		return
	}

	response.Success(c, video)
}

// AdminCreateVideo 创建视频
func AdminCreateVideo(c *gin.Context) {
	var req VideoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}
	if err := prepareVideoRequest(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	video := models.Video{
		Title:         req.Title,
		Slug:          req.Slug,
		CoverImage:    req.CoverImage,
		VideoURL:      req.VideoURL,
		VideoType:     req.VideoType,
		Duration:      req.Duration,
		Description:   req.Description,
		Content:       req.Content,
		CategoryID:    req.CategoryID,
		RelatedCaseID: req.RelatedCaseID,
		IsFeatured:    req.IsFeatured,
		SortOrder:     req.SortOrder,
		Status:        req.Status,
	}

	if video.VideoType == "" {
		video.VideoType = "local"
	}
	slugBase := req.Slug
	if slugBase == "" {
		slugBase = req.Title
	}
	video.Slug = models.GenerateUniqueSlug(models.DB, slugBase, "video", &models.Video{}, 0)

	if err := models.DB.Create(&video).Error; err != nil {
		response.ServerError(c, "创建失败")
		return
	}

	response.SuccessWithMessage(c, "创建成功", video)
}

// AdminUpdateVideo 更新视频
func AdminUpdateVideo(c *gin.Context) {
	id := c.Param("id")

	var video models.Video
	if err := models.DB.First(&video, id).Error; err != nil {
		response.NotFound(c, "视频不存在")
		return
	}

	var req VideoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}
	if err := prepareVideoRequest(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	updates := map[string]interface{}{
		"title":           req.Title,
		"cover_image":     req.CoverImage,
		"video_url":       req.VideoURL,
		"video_type":      req.VideoType,
		"duration":        req.Duration,
		"description":     req.Description,
		"content":         req.Content,
		"category_id":     req.CategoryID,
		"related_case_id": req.RelatedCaseID,
		"is_featured":     req.IsFeatured,
		"sort_order":      req.SortOrder,
		"status":          req.Status,
	}
	if req.Slug != "" {
		updates["slug"] = models.GenerateUniqueSlug(models.DB, req.Slug, "video", &models.Video{}, video.ID)
	}

	if err := models.DB.Model(&video).Updates(updates).Error; err != nil {
		response.ServerError(c, "更新失败")
		return
	}
	response.SuccessWithMessage(c, "更新成功", video)
}

func prepareVideoRequest(req *VideoRequest) error {
	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" || !validPublishStatus(req.Status) || req.Duration < 0 || req.SortOrder < 0 || req.SortOrder > 100000 {
		return fmt.Errorf("标题、时长、状态或排序值不合法")
	}
	if err := validateCategoryType(req.CategoryID, "video"); err != nil {
		return err
	}
	if err := validatePublicURL(req.CoverImage, true); err != nil {
		return fmt.Errorf("封面地址不合法: %v", err)
	}
	if err := validatePublicURL(req.VideoURL, false); err != nil {
		return fmt.Errorf("视频地址不合法: %v", err)
	}
	req.Content = sanitizeRichText(req.Content)
	if len(req.Content) > 500000 {
		return fmt.Errorf("视频详情过长")
	}
	return nil
}

// AdminDeleteVideo 删除视频
func AdminDeleteVideo(c *gin.Context) {
	id := c.Param("id")

	result := models.DB.Delete(&models.Video{}, id)
	if result.Error != nil || result.RowsAffected == 0 {
		response.ServerError(c, "删除失败")
		return
	}

	response.SuccessWithMessage(c, "删除成功", nil)
}
