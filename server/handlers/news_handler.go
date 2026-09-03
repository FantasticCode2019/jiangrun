package handlers

import (
	"strconv"

	"jiangrun-server/models"
	"jiangrun-server/pkg/response"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type NewsRequest struct {
	Title      string `json:"title" binding:"required"`
	Slug       string `json:"slug"`
	CoverImage string `json:"cover_image"`
	Summary    string `json:"summary"`
	Content    string `json:"content"`
	CategoryID *uint  `json:"category_id"`
	Status     int    `json:"status"`
}

// GetNewsList 获取新闻列表 (公开)
func GetNewsList(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "10"))
	categoryID := c.Query("category_id")

	if page < 1 {
		page = 1
	}

	query := models.DB.Model(&models.News{}).Where("status = ?", 1)
	if categoryID != "" {
		query = query.Where("category_id = ?", categoryID)
	}

	var total int64
	query.Count(&total)

	var news []models.News
	query.Order("id DESC").
		Offset((page - 1) * size).
		Limit(size).
		Preload("Category").
		Find(&news)

	response.Page(c, news, total, page, size)
}

// GetNewsDetail 获取新闻详情
func GetNewsDetail(c *gin.Context) {
	id := c.Param("id")

	var news models.News
	if err := models.DB.Where("status = ?", 1).Preload("Category").First(&news, id).Error; err != nil {
		response.NotFound(c, "新闻不存在")
		return
	}

	// 增加浏览量
	models.DB.Model(&news).UpdateColumn("view_count", gorm.Expr("view_count + 1"))

	response.Success(c, news)
}

// AdminGetNews 管理员获取新闻列表
func AdminGetNews(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))
	keyword := c.Query("keyword")

	if page < 1 {
		page = 1
	}

	query := models.DB.Model(&models.News{})
	if keyword != "" {
		query = query.Where("title LIKE ?", "%"+keyword+"%")
	}

	var total int64
	query.Count(&total)

	var news []models.News
	query.Order("id DESC").
		Offset((page - 1) * size).
		Limit(size).
		Preload("Category").
		Find(&news)

	response.Page(c, news, total, page, size)
}

// AdminGetNewsDetail 管理员获取新闻详情
func AdminGetNewsDetail(c *gin.Context) {
	id := c.Param("id")

	var news models.News
	if err := models.DB.Preload("Category").First(&news, id).Error; err != nil {
		response.NotFound(c, "新闻不存在")
		return
	}

	response.Success(c, news)
}

// AdminCreateNews 创建新闻
func AdminCreateNews(c *gin.Context) {
	var req NewsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	news := models.News{
		Title:      req.Title,
		Slug:       req.Slug,
		CoverImage: req.CoverImage,
		Summary:    req.Summary,
		Content:    req.Content,
		CategoryID: req.CategoryID,
		Status:     req.Status,
	}

	if news.Slug == "" {
		news.Slug = models.GenerateUniqueSlug(models.DB, req.Title, "news", &models.News{}, 0)
	}

	if err := models.DB.Create(&news).Error; err != nil {
		response.ServerError(c, "创建失败")
		return
	}

	response.SuccessWithMessage(c, "创建成功", news)
}

// AdminUpdateNews 更新新闻
func AdminUpdateNews(c *gin.Context) {
	id := c.Param("id")

	var news models.News
	if err := models.DB.First(&news, id).Error; err != nil {
		response.NotFound(c, "新闻不存在")
		return
	}

	var req NewsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	updates := map[string]interface{}{
		"title":       req.Title,
		"cover_image": req.CoverImage,
		"summary":     req.Summary,
		"content":     req.Content,
		"category_id": req.CategoryID,
		"status":      req.Status,
	}
	if req.Slug != "" {
		updates["slug"] = models.GenerateUniqueSlug(models.DB, req.Slug, "news", &models.News{}, news.ID)
	}

	models.DB.Model(&news).Updates(updates)
	response.SuccessWithMessage(c, "更新成功", news)
}

// AdminDeleteNews 删除新闻
func AdminDeleteNews(c *gin.Context) {
	id := c.Param("id")

	if err := models.DB.Delete(&models.News{}, id).Error; err != nil {
		response.ServerError(c, "删除失败")
		return
	}

	response.SuccessWithMessage(c, "删除成功", nil)
}
