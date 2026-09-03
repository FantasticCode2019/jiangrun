package handlers

import (
	"fmt"
	"strconv"
	"strings"

	"jiangrun-server/models"
	"jiangrun-server/pkg/response"

	"github.com/gin-gonic/gin"
)

type ServiceRequest struct {
	Title       string `json:"title" binding:"required,max=200"`
	Slug        string `json:"slug" binding:"max=200"`
	Icon        string `json:"icon" binding:"max=100"`
	CoverImage  string `json:"cover_image" binding:"max=500"`
	Description string `json:"description" binding:"max=4000"`
	Content     string `json:"content"`
	CategoryID  *uint  `json:"category_id"`
	SortOrder   int    `json:"sort_order"`
	Status      int    `json:"status"`
}

// GetServices 获取服务列表 (公开)
func GetServices(c *gin.Context) {
	var services []models.Service
	if err := models.DB.Where("status = ?", 1).
		Order("sort_order ASC, id ASC").
		Preload("Category").
		Find(&services).Error; err != nil {
		response.ServerError(c, "读取服务失败")
		return
	}

	response.Success(c, services)
}

// GetServiceBySlug 根据 slug 获取服务详情
func GetServiceBySlug(c *gin.Context) {
	slug := c.Param("slug")

	var service models.Service
	if err := models.DB.Where("slug = ? AND status = ?", slug, 1).Preload("Category").First(&service).Error; err != nil {
		response.NotFound(c, "服务不存在")
		return
	}
	service.Content = sanitizeRichText(service.Content)

	response.Success(c, service)
}

// AdminGetServices 管理员获取服务列表
func AdminGetServices(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))
	if page < 1 {
		page = 1
	}
	if size < 1 || size > 100 {
		size = 20
	}

	query := models.DB.Model(&models.Service{})

	var total int64
	if err := query.Count(&total).Error; err != nil {
		response.ServerError(c, "读取服务失败")
		return
	}

	var services []models.Service
	if err := query.Order("sort_order ASC, id ASC").
		Offset((page - 1) * size).
		Limit(size).
		Preload("Category").
		Find(&services).Error; err != nil {
		response.ServerError(c, "读取服务失败")
		return
	}

	response.Page(c, services, total, page, size)
}

// AdminGetService 管理员获取服务详情
func AdminGetService(c *gin.Context) {
	id := c.Param("id")

	var service models.Service
	if err := models.DB.Preload("Category").First(&service, id).Error; err != nil {
		response.NotFound(c, "服务不存在")
		return
	}

	response.Success(c, service)
}

// AdminCreateService 创建服务
func AdminCreateService(c *gin.Context) {
	var req ServiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}
	if err := prepareServiceRequest(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	service := models.Service{
		Title:       req.Title,
		Slug:        req.Slug,
		Icon:        req.Icon,
		CoverImage:  req.CoverImage,
		Description: req.Description,
		Content:     req.Content,
		CategoryID:  req.CategoryID,
		SortOrder:   req.SortOrder,
		Status:      req.Status,
	}

	slugBase := req.Slug
	if slugBase == "" {
		slugBase = req.Title
	}
	service.Slug = models.GenerateUniqueSlug(models.DB, slugBase, "service", &models.Service{}, 0)

	if err := models.DB.Create(&service).Error; err != nil {
		response.ServerError(c, "创建失败")
		return
	}

	response.SuccessWithMessage(c, "创建成功", service)
}

// AdminUpdateService 更新服务
func AdminUpdateService(c *gin.Context) {
	id := c.Param("id")

	var service models.Service
	if err := models.DB.First(&service, id).Error; err != nil {
		response.NotFound(c, "服务不存在")
		return
	}

	var req ServiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}
	if err := prepareServiceRequest(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	updates := map[string]interface{}{
		"title":       req.Title,
		"icon":        req.Icon,
		"cover_image": req.CoverImage,
		"description": req.Description,
		"content":     req.Content,
		"category_id": req.CategoryID,
		"sort_order":  req.SortOrder,
		"status":      req.Status,
	}
	if req.Slug != "" {
		updates["slug"] = models.GenerateUniqueSlug(models.DB, req.Slug, "service", &models.Service{}, service.ID)
	}

	if err := models.DB.Model(&service).Updates(updates).Error; err != nil {
		response.ServerError(c, "更新失败")
		return
	}
	response.SuccessWithMessage(c, "更新成功", service)
}

func prepareServiceRequest(req *ServiceRequest) error {
	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" || !validPublishStatus(req.Status) || req.SortOrder < 0 || req.SortOrder > 100000 {
		return fmt.Errorf("标题、状态或排序值不合法")
	}
	if err := validateCategoryType(req.CategoryID, "service"); err != nil {
		return err
	}
	if err := validatePublicURL(req.CoverImage, true); err != nil {
		return fmt.Errorf("封面地址不合法: %v", err)
	}
	req.Content = sanitizeRichText(req.Content)
	if len(req.Content) > 500000 {
		return fmt.Errorf("服务详情过长")
	}
	return nil
}

// AdminDeleteService 删除服务
func AdminDeleteService(c *gin.Context) {
	id := c.Param("id")

	result := models.DB.Delete(&models.Service{}, id)
	if result.Error != nil || result.RowsAffected == 0 {
		response.ServerError(c, "删除失败")
		return
	}

	response.SuccessWithMessage(c, "删除成功", nil)
}
