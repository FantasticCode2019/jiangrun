package handlers

import (
	"strconv"

	"jiangrun-server/models"
	"jiangrun-server/pkg/response"

	"github.com/gin-gonic/gin"
)

type ServiceRequest struct {
	Title       string `json:"title" binding:"required"`
	Slug        string `json:"slug"`
	Icon        string `json:"icon"`
	CoverImage  string `json:"cover_image"`
	Description string `json:"description"`
	Content     string `json:"content"`
	CategoryID  *uint  `json:"category_id"`
	SortOrder   int    `json:"sort_order"`
	Status      int    `json:"status"`
}

// GetServices 获取服务列表 (公开)
func GetServices(c *gin.Context) {
	var services []models.Service
	models.DB.Where("status = ?", 1).
		Order("sort_order ASC, id ASC").
		Preload("Category").
		Find(&services)

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

	response.Success(c, service)
}

// AdminGetServices 管理员获取服务列表
func AdminGetServices(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))

	query := models.DB.Model(&models.Service{})

	var total int64
	query.Count(&total)

	var services []models.Service
	query.Order("sort_order ASC, id ASC").
		Offset((page - 1) * size).
		Limit(size).
		Preload("Category").
		Find(&services)

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

	if service.Slug == "" {
		service.Slug = models.GenerateUniqueSlug(models.DB, req.Title, "service", &models.Service{}, 0)
	}

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

	models.DB.Model(&service).Updates(updates)
	response.SuccessWithMessage(c, "更新成功", service)
}

// AdminDeleteService 删除服务
func AdminDeleteService(c *gin.Context) {
	id := c.Param("id")

	if err := models.DB.Delete(&models.Service{}, id).Error; err != nil {
		response.ServerError(c, "删除失败")
		return
	}

	response.SuccessWithMessage(c, "删除成功", nil)
}
