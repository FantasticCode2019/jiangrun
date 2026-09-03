package handlers

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"jiangrun-server/models"
	"jiangrun-server/pkg/response"

	"github.com/gin-gonic/gin"
)

type CaseRequest struct {
	Title       string             `json:"title" binding:"required,max=200"`
	Slug        string             `json:"slug" binding:"max=200"`
	CoverImage  string             `json:"cover_image" binding:"max=500"`
	Blocks      []models.CaseBlock `json:"blocks"`
	Images      []string           `json:"images"`
	Description string             `json:"description" binding:"max=4000"`
	Content     string             `json:"content"`
	CategoryID  *uint              `json:"category_id"`
	Style       string             `json:"style" binding:"max=50"`
	Location    string             `json:"location" binding:"max=200"`
	Area        string             `json:"area" binding:"max=50"`
	IsFeatured  bool               `json:"is_featured"`
	SortOrder   int                `json:"sort_order"`
	Status      int                `json:"status"`
}

// GetCases 获取案例列表 (公开)
func GetCases(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "12"))
	categoryID := c.Query("category_id")
	style := c.Query("style")
	featured := c.Query("featured")

	if page < 1 {
		page = 1
	}
	if size < 1 || size > 50 {
		size = 12
	}

	query := models.DB.Model(&models.Case{}).Where("status = ?", 1)

	if categoryID != "" {
		query = query.Where("category_id = ?", categoryID)
	}
	if style != "" {
		query = query.Where("style = ?", style)
	}
	if featured == "true" {
		query = query.Where("is_featured = ?", true)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		response.ServerError(c, "读取案例失败")
		return
	}

	var cases []models.Case
	if err := query.Order("sort_order ASC, id DESC").
		Offset((page - 1) * size).
		Limit(size).
		Preload("Category").
		Find(&cases).Error; err != nil {
		response.ServerError(c, "读取案例失败")
		return
	}

	response.Page(c, cases, total, page, size)
}

// GetCase 获取案例详情
func GetCase(c *gin.Context) {
	id := c.Param("id")

	var caseItem models.Case
	if err := models.DB.Where("status = ?", 1).Preload("Category").First(&caseItem, id).Error; err != nil {
		response.NotFound(c, "案例不存在")
		return
	}
	sanitizeCaseOutput(&caseItem)

	response.Success(c, caseItem)
}

// GetFeaturedCases 获取推荐案例
func GetFeaturedCases(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "6"))
	if limit < 1 || limit > 20 {
		limit = 6
	}

	var cases []models.Case
	if err := models.DB.Where("is_featured = ? AND status = ?", true, 1).
		Order("sort_order ASC, id DESC").
		Limit(limit).
		Preload("Category").
		Find(&cases).Error; err != nil {
		response.ServerError(c, "读取案例失败")
		return
	}

	response.Success(c, cases)
}

// Admin: 获取所有案例 (含草稿)
func AdminGetCases(c *gin.Context) {
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

	query := models.DB.Model(&models.Case{})

	if keyword != "" {
		query = query.Where("title LIKE ?", "%"+keyword+"%")
	}
	if categoryID != "" {
		query = query.Where("category_id = ?", categoryID)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		response.ServerError(c, "读取案例失败")
		return
	}

	var cases []models.Case
	if err := query.Order("sort_order ASC, id DESC").
		Offset((page - 1) * size).
		Limit(size).
		Preload("Category").
		Find(&cases).Error; err != nil {
		response.ServerError(c, "读取案例失败")
		return
	}

	response.Page(c, cases, total, page, size)
}

// AdminGetCase 管理员获取案例详情
func AdminGetCase(c *gin.Context) {
	id := c.Param("id")

	var caseItem models.Case
	if err := models.DB.Preload("Category").First(&caseItem, id).Error; err != nil {
		response.NotFound(c, "案例不存在")
		return
	}

	response.Success(c, caseItem)
}

// AdminCreateCase 创建案例
func AdminCreateCase(c *gin.Context) {
	var req CaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}
	if err := prepareCaseRequest(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	imagesJSON := models.JSON([]byte("[]"))
	if len(req.Images) > 0 {
		imgBytes, _ := json.Marshal(req.Images)
		imagesJSON = models.JSON(imgBytes)
	}

	blocksJSON := models.JSON([]byte("[]"))
	if len(req.Blocks) > 0 {
		blockBytes, _ := json.Marshal(req.Blocks)
		blocksJSON = models.JSON(blockBytes)
	}

	// 封面未指定时，自动取 blocks 中第一张图片
	cover := req.CoverImage
	if cover == "" {
		cover = models.FirstImageCover(req.Blocks)
	}

	caseItem := models.Case{
		Title:       req.Title,
		Slug:        req.Slug,
		CoverImage:  cover,
		Blocks:      blocksJSON,
		Images:      imagesJSON,
		Description: req.Description,
		Content:     req.Content,
		CategoryID:  req.CategoryID,
		Style:       req.Style,
		Location:    req.Location,
		Area:        req.Area,
		IsFeatured:  req.IsFeatured,
		SortOrder:   req.SortOrder,
		Status:      req.Status,
	}

	slugBase := req.Slug
	if slugBase == "" {
		slugBase = req.Title
	}
	caseItem.Slug = models.GenerateUniqueSlug(models.DB, slugBase, "case", &models.Case{}, 0)

	if err := models.DB.Create(&caseItem).Error; err != nil {
		response.ServerError(c, "创建失败")
		return
	}

	response.SuccessWithMessage(c, "创建成功", caseItem)
}

// AdminUpdateCase 更新案例
func AdminUpdateCase(c *gin.Context) {
	id := c.Param("id")

	var caseItem models.Case
	if err := models.DB.First(&caseItem, id).Error; err != nil {
		response.NotFound(c, "案例不存在")
		return
	}

	var req CaseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误: "+err.Error())
		return
	}
	if err := prepareCaseRequest(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	imagesJSON := caseItem.Images
	if len(req.Images) > 0 {
		imgBytes, _ := json.Marshal(req.Images)
		imagesJSON = models.JSON(imgBytes)
	}

	blocksJSON := caseItem.Blocks
	if len(req.Blocks) > 0 {
		blockBytes, _ := json.Marshal(req.Blocks)
		blocksJSON = models.JSON(blockBytes)
	} else {
		// 前端清空内容块时，落库为空数组
		blocksJSON = models.JSON([]byte("[]"))
	}

	// 封面未指定时，取 blocks 首图
	cover := req.CoverImage
	if cover == "" {
		cover = models.FirstImageCover(req.Blocks)
	}

	updates := map[string]interface{}{
		"title":       req.Title,
		"cover_image": cover,
		"blocks":      blocksJSON,
		"images":      imagesJSON,
		"description": req.Description,
		"content":     req.Content,
		"category_id": req.CategoryID,
		"style":       req.Style,
		"location":    req.Location,
		"area":        req.Area,
		"is_featured": req.IsFeatured,
		"sort_order":  req.SortOrder,
		"status":      req.Status,
	}
	if req.Slug != "" {
		updates["slug"] = models.GenerateUniqueSlug(models.DB, req.Slug, "case", &models.Case{}, caseItem.ID)
	}

	if err := models.DB.Model(&caseItem).Updates(updates).Error; err != nil {
		response.ServerError(c, "更新失败")
		return
	}
	response.SuccessWithMessage(c, "更新成功", caseItem)
}

func prepareCaseRequest(req *CaseRequest) error {
	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" || !validPublishStatus(req.Status) || req.SortOrder < 0 || req.SortOrder > 100000 {
		return fmt.Errorf("标题、状态或排序值不合法")
	}
	if err := validateCategoryType(req.CategoryID, "case"); err != nil {
		return err
	}
	if err := validatePublicURL(req.CoverImage, true); err != nil {
		return fmt.Errorf("封面地址不合法: %v", err)
	}
	if len(req.Images) > 200 {
		return fmt.Errorf("图片数量不能超过 200 张")
	}
	for _, image := range req.Images {
		if err := validatePublicURL(image, false); err != nil {
			return fmt.Errorf("图片地址不合法: %v", err)
		}
	}
	blocks, err := sanitizeCaseBlocks(req.Blocks)
	if err != nil {
		return err
	}
	req.Blocks = blocks
	req.Content = sanitizeRichText(req.Content)
	if len(req.Content) > 500000 {
		return fmt.Errorf("详情内容过长")
	}
	return nil
}

func sanitizeCaseOutput(item *models.Case) {
	item.Content = sanitizeRichText(item.Content)
	var blocks []models.CaseBlock
	if err := json.Unmarshal(item.Blocks, &blocks); err == nil {
		if cleaned, cleanErr := sanitizeCaseBlocks(blocks); cleanErr == nil {
			if data, marshalErr := json.Marshal(cleaned); marshalErr == nil {
				item.Blocks = models.JSON(data)
			}
		}
	}
}

// AdminDeleteCase 删除案例
func AdminDeleteCase(c *gin.Context) {
	id := c.Param("id")

	result := models.DB.Delete(&models.Case{}, id)
	if result.Error != nil || result.RowsAffected == 0 {
		response.ServerError(c, "删除失败")
		return
	}

	response.SuccessWithMessage(c, "删除成功", nil)
}
