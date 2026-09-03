package handlers

import (
	"jiangrun-server/models"
	"jiangrun-server/pkg/response"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type CategoryRequest struct {
	Name      string `json:"name" binding:"required"`
	NameEn    string `json:"name_en"`
	Slug      string `json:"slug" binding:"required"`
	ParentID  *uint  `json:"parent_id"`
	SortOrder int    `json:"sort_order"`
	Type      string `json:"type" binding:"required"`
}

// GetCategoriesByType 根据类型获取分类树 (公开)
func GetCategoriesByType(c *gin.Context) {
	typeName := c.Param("type")

	var categories []models.Category
	models.DB.Where("type = ? AND parent_id IS NULL", typeName).
		Order("sort_order ASC, id ASC").
		Preload("Children", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order ASC, id ASC")
		}).
		Find(&categories)

	response.Success(c, categories)
}

// AdminGetCategories 管理员获取所有分类
func AdminGetCategories(c *gin.Context) {
	typeName := c.Query("type")

	query := models.DB.Model(&models.Category{})
	if typeName != "" {
		query = query.Where("type = ?", typeName)
	}

	var categories []models.Category
	query.Order("type ASC, sort_order ASC, id ASC").
		Preload("Children").
		Find(&categories)

	response.Success(c, categories)
}

// AdminCreateCategory 创建分类
func AdminCreateCategory(c *gin.Context) {
	var req CategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	category := models.Category{
		Name:      req.Name,
		NameEn:    req.NameEn,
		Slug:      req.Slug,
		ParentID:  req.ParentID,
		SortOrder: req.SortOrder,
		Type:      req.Type,
	}

	if err := models.DB.Create(&category).Error; err != nil {
		response.ServerError(c, "创建失败")
		return
	}

	response.SuccessWithMessage(c, "创建成功", category)
}

// AdminUpdateCategory 更新分类
func AdminUpdateCategory(c *gin.Context) {
	id := c.Param("id")

	var category models.Category
	if err := models.DB.First(&category, id).Error; err != nil {
		response.NotFound(c, "分类不存在")
		return
	}

	var req CategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}

	updates := map[string]interface{}{
		"name":       req.Name,
		"name_en":    req.NameEn,
		"slug":       req.Slug,
		"parent_id":  req.ParentID,
		"sort_order": req.SortOrder,
		"type":       req.Type,
	}

	models.DB.Model(&category).Updates(updates)
	response.SuccessWithMessage(c, "更新成功", category)
}

// AdminDeleteCategory 删除分类
func AdminDeleteCategory(c *gin.Context) {
	id := c.Param("id")

	// 检查是否有子分类
	var childCount int64
	models.DB.Model(&models.Category{}).Where("parent_id = ?", id).Count(&childCount)
	if childCount > 0 {
		response.BadRequest(c, "该分类下有子分类，无法删除")
		return
	}

	if err := models.DB.Delete(&models.Category{}, id).Error; err != nil {
		response.ServerError(c, "删除失败")
		return
	}

	response.SuccessWithMessage(c, "删除成功", nil)
}
