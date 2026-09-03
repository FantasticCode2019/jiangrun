package handlers

import (
	"jiangrun-server/models"
	"jiangrun-server/pkg/response"

	"github.com/gin-gonic/gin"
)

type BannerRequest struct {
	Title     string `json:"title"`
	ImageURL  string `json:"image_url" binding:"required"`
	LinkURL   string `json:"link_url"`
	Position  string `json:"position"`
	SortOrder int    `json:"sort_order"`
	Status    int    `json:"status"`
}

// GetBanners 获取轮播图 (公开)
func GetBanners(c *gin.Context) {
	position := c.DefaultQuery("position", "home")

	var banners []models.Banner
	models.DB.Where("position = ? AND status = ?", position, 1).
		Order("sort_order ASC, id ASC").
		Find(&banners)

	response.Success(c, banners)
}

// AdminGetBanners 管理员获取所有轮播图
func AdminGetBanners(c *gin.Context) {
	var banners []models.Banner
	models.DB.Order("position ASC, sort_order ASC, id ASC").Find(&banners)
	response.Success(c, banners)
}

// AdminCreateBanner 创建轮播图
func AdminCreateBanner(c *gin.Context) {
	var req BannerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	banner := models.Banner{
		Title:     req.Title,
		ImageURL:  req.ImageURL,
		LinkURL:   req.LinkURL,
		Position:  req.Position,
		SortOrder: req.SortOrder,
		Status:    req.Status,
	}

	if banner.Position == "" {
		banner.Position = "home"
	}

	if err := models.DB.Create(&banner).Error; err != nil {
		response.ServerError(c, "创建失败")
		return
	}

	response.SuccessWithMessage(c, "创建成功", banner)
}

// AdminUpdateBanner 更新轮播图
func AdminUpdateBanner(c *gin.Context) {
	id := c.Param("id")

	var banner models.Banner
	if err := models.DB.First(&banner, id).Error; err != nil {
		response.NotFound(c, "轮播图不存在")
		return
	}

	var req BannerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	updates := map[string]interface{}{
		"title":      req.Title,
		"image_url":  req.ImageURL,
		"link_url":   req.LinkURL,
		"position":   req.Position,
		"sort_order": req.SortOrder,
		"status":     req.Status,
	}

	models.DB.Model(&banner).Updates(updates)
	response.SuccessWithMessage(c, "更新成功", banner)
}

// AdminDeleteBanner 删除轮播图
func AdminDeleteBanner(c *gin.Context) {
	id := c.Param("id")

	if err := models.DB.Delete(&models.Banner{}, id).Error; err != nil {
		response.ServerError(c, "删除失败")
		return
	}

	response.SuccessWithMessage(c, "删除成功", nil)
}
