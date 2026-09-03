package handlers

import (
	"jiangrun-server/models"
	"jiangrun-server/pkg/response"
	"net/mail"
	"strings"

	"github.com/gin-gonic/gin"
)

// GetPublicSettings 获取公开设置
func GetPublicSettings(c *gin.Context) {
	var settings []models.Setting
	if err := models.DB.Find(&settings).Error; err != nil {
		response.ServerError(c, "读取设置失败")
		return
	}

	result := make(map[string]string)
	for _, s := range settings {
		if allowedSettingKeys[s.Key] {
			result[s.Key] = s.Value
		}
	}

	response.Success(c, result)
}

// AdminGetSettings 管理员获取所有设置
func AdminGetSettings(c *gin.Context) {
	groupName := c.Query("group")

	query := models.DB.Model(&models.Setting{})
	if groupName != "" {
		query = query.Where("group_name = ?", groupName)
	}

	var settings []models.Setting
	if err := query.Order("group_name ASC, id ASC").Find(&settings).Error; err != nil {
		response.ServerError(c, "读取设置失败")
		return
	}

	// 与公开接口保持同一份扁平数据契约，后台表单可精准回显。
	result := make(map[string]string)
	for _, s := range settings {
		result[s.Key] = s.Value
	}
	response.Success(c, result)
}

// AdminUpdateSettings 批量更新设置
func AdminUpdateSettings(c *gin.Context) {
	var req map[string]string
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误")
		return
	}
	if len(req) == 0 || len(req) > 30 {
		response.BadRequest(c, "设置项数量不合法")
		return
	}

	tx := models.DB.Begin()
	for key, rawValue := range req {
		if !allowedSettingKeys[key] {
			tx.Rollback()
			response.BadRequest(c, "不支持的设置项: "+key)
			return
		}
		value := strings.TrimSpace(rawValue)
		if len([]rune(value)) > 4000 {
			tx.Rollback()
			response.BadRequest(c, "设置内容过长: "+key)
			return
		}
		if key == "email" && value != "" {
			if _, err := mail.ParseAddress(value); err != nil {
				tx.Rollback()
				response.BadRequest(c, "邮箱格式不正确")
				return
			}
		}
		if key == "wechat_qr" && value != "" {
			if err := validatePublicURL(value, true); err != nil {
				tx.Rollback()
				response.BadRequest(c, "微信二维码地址不合法")
				return
			}
		}
		var setting models.Setting
		if err := tx.Where("key = ?", key).First(&setting).Error; err != nil {
			// 不存在则创建，按 key 推断分组
			if err := tx.Create(&models.Setting{
				Key:       key,
				Value:     value,
				GroupName: inferSettingGroup(key),
			}).Error; err != nil {
				tx.Rollback()
				response.ServerError(c, "保存失败")
				return
			}
		} else {
			if err := tx.Model(&setting).Update("value", value).Error; err != nil {
				tx.Rollback()
				response.ServerError(c, "保存失败")
				return
			}
		}
	}
	if err := tx.Commit().Error; err != nil {
		response.ServerError(c, "保存失败")
		return
	}

	response.SuccessWithMessage(c, "更新成功", nil)
}

// inferSettingGroup 根据 key 推断设置分组
func inferSettingGroup(key string) string {
	switch key {
	case "phone", "mobile", "address", "design_address", "factory_address", "business_hours", "email":
		return "contact"
	case "wechat_qr":
		return "social"
	case "home_about_title", "home_about_text", "about_intro":
		return "content"
	default:
		return "basic"
	}
}

var allowedSettingKeys = map[string]bool{
	"site_name": true, "site_slogan": true, "site_description": true, "icp": true,
	"phone": true, "mobile": true, "email": true, "address": true,
	"design_address": true, "factory_address": true, "business_hours": true,
	"wechat_qr": true, "home_about_title": true, "home_about_text": true, "about_intro": true,
}

// SubmitContact 提交联系留言 (公开)
func SubmitContact(c *gin.Context) {
	var req struct {
		Name    string `json:"name" binding:"required,max=50"`
		Phone   string `json:"phone" binding:"max=20"`
		Email   string `json:"email" binding:"omitempty,email,max=100"`
		Content string `json:"content" binding:"required,max=2000"`
	}
	req.Name = strings.TrimSpace(req.Name)
	req.Phone = strings.TrimSpace(req.Phone)
	req.Email = strings.TrimSpace(req.Email)
	req.Content = strings.TrimSpace(req.Content)
	if req.Name == "" || req.Content == "" || (req.Phone == "" && req.Email == "") {
		response.BadRequest(c, "请填写姓名、留言内容，并至少提供一种联系方式")
		return
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请输入姓名和留言内容")
		return
	}

	contact := models.Contact{
		Name:    req.Name,
		Phone:   req.Phone,
		Email:   req.Email,
		Content: req.Content,
	}

	if err := models.DB.Create(&contact).Error; err != nil {
		response.ServerError(c, "提交失败")
		return
	}

	response.SuccessWithMessage(c, "留言提交成功，我们会尽快联系您", nil)
}

// AdminGetContacts 管理员获取留言列表
func AdminGetContacts(c *gin.Context) {
	var contacts []models.Contact
	if err := models.DB.Order("id DESC").Limit(1000).Find(&contacts).Error; err != nil {
		response.ServerError(c, "读取留言失败")
		return
	}
	response.Success(c, contacts)
}

// AdminMarkContactRead 标记留言已读
func AdminMarkContactRead(c *gin.Context) {
	id := c.Param("id")
	result := models.DB.Model(&models.Contact{}).Where("id = ?", id).Update("is_read", true)
	if result.Error != nil || result.RowsAffected == 0 {
		response.NotFound(c, "留言不存在")
		return
	}
	response.SuccessWithMessage(c, "已标记为已读", nil)
}

// AdminDeleteContact 删除留言
func AdminDeleteContact(c *gin.Context) {
	id := c.Param("id")
	result := models.DB.Delete(&models.Contact{}, id)
	if result.Error != nil || result.RowsAffected == 0 {
		response.NotFound(c, "留言不存在或删除失败")
		return
	}
	response.SuccessWithMessage(c, "删除成功", nil)
}
