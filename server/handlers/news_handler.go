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

type NewsRequest struct {
	Title      string `json:"title" binding:"required,max=200"`
	Slug       string `json:"slug" binding:"max=200"`
	CoverImage string `json:"cover_image" binding:"max=500"`
	Summary    string `json:"summary" binding:"max=1000"`
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
	if size < 1 || size > 50 {
		size = 10
	}

	query := models.DB.Model(&models.News{}).Where("status = ?", 1)
	if categoryID != "" {
		query = query.Where("category_id = ?", categoryID)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		response.ServerError(c, "读取新闻失败")
		return
	}

	var news []models.News
	if err := query.Order("id DESC").
		Offset((page - 1) * size).
		Limit(size).
		Preload("Category").
		Find(&news).Error; err != nil {
		response.ServerError(c, "读取新闻失败")
		return
	}

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
	news.Content = sanitizeRichText(news.Content)

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
	if size < 1 || size > 100 {
		size = 20
	}
	if len([]rune(keyword)) > 100 {
		response.BadRequest(c, "搜索词过长")
		return
	}

	query := models.DB.Model(&models.News{})
	if keyword != "" {
		query = query.Where("title LIKE ?", "%"+keyword+"%")
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		response.ServerError(c, "读取新闻失败")
		return
	}

	var news []models.News
	if err := query.Order("id DESC").
		Offset((page - 1) * size).
		Limit(size).
		Preload("Category").
		Find(&news).Error; err != nil {
		response.ServerError(c, "读取新闻失败")
		return
	}

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
	if err := prepareNewsRequest(&req); err != nil {
		response.BadRequest(c, err.Error())
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

	slugBase := req.Slug
	if slugBase == "" {
		slugBase = req.Title
	}
	news.Slug = models.GenerateUniqueSlug(models.DB, slugBase, "news", &models.News{}, 0)

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
	if err := prepareNewsRequest(&req); err != nil {
		response.BadRequest(c, err.Error())
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

	if err := models.DB.Model(&news).Updates(updates).Error; err != nil {
		response.ServerError(c, "更新失败")
		return
	}
	response.SuccessWithMessage(c, "更新成功", news)
}

func prepareNewsRequest(req *NewsRequest) error {
	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" || !validPublishStatus(req.Status) {
		return fmt.Errorf("标题或发布状态不合法")
	}
	if err := validateCategoryType(req.CategoryID, "news"); err != nil {
		return err
	}
	if err := validatePublicURL(req.CoverImage, true); err != nil {
		return fmt.Errorf("封面地址不合法: %v", err)
	}
	req.Content = sanitizeRichText(req.Content)
	if len(req.Content) > 500000 {
		return fmt.Errorf("新闻内容过长")
	}
	return nil
}

// AdminDeleteNews 删除新闻
func AdminDeleteNews(c *gin.Context) {
	id := c.Param("id")

	result := models.DB.Delete(&models.News{}, id)
	if result.Error != nil || result.RowsAffected == 0 {
		response.ServerError(c, "删除失败")
		return
	}

	response.SuccessWithMessage(c, "删除成功", nil)
}
