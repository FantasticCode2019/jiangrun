package handlers

import (
	"fmt"
	"jiangrun-server/models"
	"jiangrun-server/pkg/response"
	"strings"

	"github.com/gin-gonic/gin"
)

type BannerRequest struct {
	Title     string `json:"title" binding:"max=200"`
	Subtitle  string `json:"subtitle" binding:"max=500"`
	ImageURL  string `json:"image_url" binding:"required,max=500"`
	LinkURL   string `json:"link_url"`
	Position  string `json:"position"`
	SortOrder int    `json:"sort_order"`
	Status    int    `json:"status"`
}

// GetBanners 获取轮播图 (公开)
func GetBanners(c *gin.Context) {
	position := c.DefaultQuery("position", "home")

	var banners []models.Banner
	if position != "home" {
		response.BadRequest(c, "轮播位置不合法")
		return
	}
	if err := models.DB.Where("position = ? AND status = ?", position, 1).
		Order("sort_order ASC, id ASC").
		Find(&banners).Error; err != nil {
		response.ServerError(c, "读取轮播图失败")
		return
	}
	safe := banners[:0]
	for _, banner := range banners {
		if validatePublicURL(banner.ImageURL, false) == nil && validatePublicURL(banner.LinkURL, true) == nil {
			safe = append(safe, banner)
		}
	}

	response.Success(c, safe)
}

// AdminGetBanners 管理员获取所有轮播图
func AdminGetBanners(c *gin.Context) {
	var banners []models.Banner
	if err := models.DB.Order("position ASC, sort_order ASC, id ASC").Find(&banners).Error; err != nil {
		response.ServerError(c, "读取轮播图失败")
		return
	}
	response.Success(c, banners)
}

// AdminCreateBanner 创建轮播图
func AdminCreateBanner(c *gin.Context) {
	var req BannerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}
	if err := prepareBannerRequest(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	banner := models.Banner{
		Title:     req.Title,
		Subtitle:  req.Subtitle,
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
	if err := prepareBannerRequest(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	updates := map[string]interface{}{
		"title":      req.Title,
		"subtitle":   req.Subtitle,
		"image_url":  req.ImageURL,
		"link_url":   req.LinkURL,
		"position":   req.Position,
		"sort_order": req.SortOrder,
		"status":     req.Status,
	}

	if err := models.DB.Model(&banner).Updates(updates).Error; err != nil {
		response.ServerError(c, "更新失败")
		return
	}
	response.SuccessWithMessage(c, "更新成功", banner)
}

func prepareBannerRequest(req *BannerRequest) error {
	req.Title = strings.TrimSpace(req.Title)
	req.Subtitle = strings.TrimSpace(req.Subtitle)
	req.ImageURL = strings.TrimSpace(req.ImageURL)
	req.LinkURL = strings.TrimSpace(req.LinkURL)
	if req.Position == "" {
		req.Position = "home"
	}
	if req.Position != "home" || !validPublishStatus(req.Status) || req.SortOrder < 0 || req.SortOrder > 100000 {
		return fmt.Errorf("轮播位置、状态或排序值不合法")
	}
	if err := validatePublicURL(req.ImageURL, false); err != nil {
		return fmt.Errorf("图片地址不合法: %v", err)
	}
	if err := validatePublicURL(req.LinkURL, true); err != nil {
		return fmt.Errorf("跳转地址不合法: %v", err)
	}
	return nil
}

// AdminDeleteBanner 删除轮播图
func AdminDeleteBanner(c *gin.Context) {
	id := c.Param("id")

	result := models.DB.Delete(&models.Banner{}, id)
	if result.Error != nil || result.RowsAffected == 0 {
		response.ServerError(c, "删除失败")
		return
	}

	response.SuccessWithMessage(c, "删除成功", nil)
}
