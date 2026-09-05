package handlers

import (
	"fmt"
	"jiangrun-server/models"
	"jiangrun-server/pkg/response"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type CategoryRequest struct {
	Name        string `json:"name" binding:"required,max=100"`
	NameEn      string `json:"name_en" binding:"max=100"`
	Slug        string `json:"slug" binding:"required,max=100"`
	Subtitle    string `json:"subtitle" binding:"max=300"`
	Description string `json:"description" binding:"max=4000"`
	ParentID    *uint  `json:"parent_id"`
	SortOrder   int    `json:"sort_order"`
	Type        string `json:"type" binding:"required"`
	Status      *int   `json:"status"`
}

var categorySlugPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
var categoryTypes = map[string]bool{"case": true, "video": true, "news": true, "service": true}
var reservedTopLevelSlugs = map[string]bool{
	"admin": true, "api": true, "uploads": true, "images": true, "_next": true,
	"about": true, "cases": true, "contact": true, "news": true, "services": true, "videos": true,
}

// GetCategoriesByType 根据类型获取分类树 (公开)
func GetCategoriesByType(c *gin.Context) {
	typeName := c.Param("type")
	if !categoryTypes[typeName] {
		response.BadRequest(c, "分类类型不合法")
		return
	}

	var categories []models.Category
	if err := models.DB.Where("type = ? AND parent_id IS NULL AND status = ?", typeName, 1).
		Order("sort_order ASC, id ASC").
		Preload("Children", func(db *gorm.DB) *gorm.DB {
			return db.Where("status = ?", 1).Order("sort_order ASC, id ASC")
		}).
		Find(&categories).Error; err != nil {
		response.ServerError(c, "读取分类失败")
		return
	}

	response.Success(c, categories)
}

// AdminGetCategories 管理员获取所有分类
func AdminGetCategories(c *gin.Context) {
	typeName := c.Query("type")

	query := models.DB.Model(&models.Category{}).Where("parent_id IS NULL")
	if typeName != "" {
		if !categoryTypes[typeName] {
			response.BadRequest(c, "分类类型不合法")
			return
		}
		query = query.Where("type = ?", typeName)
	}

	var categories []models.Category
	if err := query.Order("type ASC, sort_order ASC, id ASC").
		Preload("Children", func(db *gorm.DB) *gorm.DB { return db.Order("sort_order ASC, id ASC") }).
		Find(&categories).Error; err != nil {
		response.ServerError(c, "读取分类失败")
		return
	}

	response.Success(c, categories)
}

// AdminCreateCategory 创建分类
func AdminCreateCategory(c *gin.Context) {
	var req CategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}
	if err := validateCategoryRequest(req, 0); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	status := 1
	if req.Status != nil {
		status = *req.Status
	}

	category := models.Category{
		Name:        strings.TrimSpace(req.Name),
		NameEn:      strings.TrimSpace(req.NameEn),
		Slug:        strings.ToLower(strings.TrimSpace(req.Slug)),
		Subtitle:    strings.TrimSpace(req.Subtitle),
		Description: strings.TrimSpace(req.Description),
		ParentID:    req.ParentID,
		SortOrder:   req.SortOrder,
		Type:        req.Type,
		Status:      status,
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
	if err := validateCategoryRequest(req, category.ID); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	status := category.Status
	if req.Status != nil {
		status = *req.Status
	}

	updates := map[string]interface{}{
		"name":        strings.TrimSpace(req.Name),
		"name_en":     strings.TrimSpace(req.NameEn),
		"slug":        strings.ToLower(strings.TrimSpace(req.Slug)),
		"subtitle":    strings.TrimSpace(req.Subtitle),
		"description": strings.TrimSpace(req.Description),
		"parent_id":   req.ParentID,
		"sort_order":  req.SortOrder,
		"type":        req.Type,
		"status":      status,
	}

	if err := models.DB.Model(&category).Updates(updates).Error; err != nil {
		response.ServerError(c, "更新失败")
		return
	}
	response.SuccessWithMessage(c, "更新成功", category)
}

// AdminDeleteCategory 删除分类
func AdminDeleteCategory(c *gin.Context) {
	id := c.Param("id")

	// 检查是否有子分类
	var childCount int64
	if err := models.DB.Model(&models.Category{}).Where("parent_id = ?", id).Count(&childCount).Error; err != nil {
		response.ServerError(c, "检查子分类失败")
		return
	}
	if childCount > 0 {
		response.BadRequest(c, "该分类下有子分类，无法删除")
		return
	}
	var referenceCount int64
	for _, model := range []interface{}{&models.Case{}, &models.Video{}, &models.News{}, &models.Service{}} {
		var count int64
		if err := models.DB.Model(model).Where("category_id = ?", id).Count(&count).Error; err != nil {
			response.ServerError(c, "检查分类引用失败")
			return
		}
		referenceCount += count
	}
	if referenceCount > 0 {
		response.BadRequest(c, "该分类仍被内容引用，请先移动相关内容")
		return
	}

	if err := models.DB.Delete(&models.Category{}, id).Error; err != nil {
		response.ServerError(c, "删除失败")
		return
	}

	response.SuccessWithMessage(c, "删除成功", nil)
}

func validateCategoryRequest(req CategoryRequest, currentID uint) error {
	req.Name = strings.TrimSpace(req.Name)
	req.Slug = strings.ToLower(strings.TrimSpace(req.Slug))
	if !categoryTypes[req.Type] {
		return fmt.Errorf("分类类型不合法")
	}
	if !categorySlugPattern.MatchString(req.Slug) {
		return fmt.Errorf("Slug 只能包含小写字母、数字和连字符")
	}
	if req.Type == "case" && req.ParentID == nil && reservedTopLevelSlugs[req.Slug] {
		return fmt.Errorf("该 Slug 与网站固定页面或系统路径冲突")
	}
	if req.SortOrder < 0 || req.SortOrder > 100000 {
		return fmt.Errorf("排序值不合法")
	}
	if req.Status != nil && *req.Status != 0 && *req.Status != 1 {
		return fmt.Errorf("状态值不合法")
	}
	var duplicate int64
	q := models.DB.Model(&models.Category{}).Where("type = ? AND slug = ?", req.Type, req.Slug)
	if currentID != 0 {
		q = q.Where("id <> ?", currentID)
	}
	if err := q.Count(&duplicate).Error; err != nil {
		return fmt.Errorf("无法校验分类")
	}
	if duplicate > 0 {
		return fmt.Errorf("同类型下的 Slug 已存在")
	}
	if req.ParentID != nil {
		if *req.ParentID == currentID {
			return fmt.Errorf("不能将分类设为自己的子分类")
		}
		var parent models.Category
		if err := models.DB.First(&parent, *req.ParentID).Error; err != nil || parent.Type != req.Type || parent.ParentID != nil {
			return fmt.Errorf("父分类不存在、类型不一致或不是顶级分类")
		}
	}
	if currentID != 0 {
		var current models.Category
		if err := models.DB.First(&current, currentID).Error; err != nil {
			return fmt.Errorf("分类不存在")
		}
		var childCount int64
		if err := models.DB.Model(&models.Category{}).Where("parent_id = ?", currentID).Count(&childCount).Error; err != nil {
			return fmt.Errorf("无法校验子分类")
		}
		if childCount > 0 && (req.ParentID != nil || req.Type != current.Type) {
			return fmt.Errorf("包含子分类的顶级分类不能改为子分类或切换类型")
		}
		if req.Type != current.Type {
			for _, model := range []interface{}{&models.Case{}, &models.Video{}, &models.News{}, &models.Service{}} {
				var count int64
				if err := models.DB.Model(model).Where("category_id = ?", currentID).Count(&count).Error; err != nil {
					return fmt.Errorf("无法校验分类引用")
				}
				if count > 0 {
					return fmt.Errorf("该分类仍被内容引用，不能切换类型")
				}
			}
		}
	}
	return nil
}
