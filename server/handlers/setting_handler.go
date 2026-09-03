package handlers

import (
	"jiangrun-server/models"
	"jiangrun-server/pkg/response"

	"github.com/gin-gonic/gin"
)

// GetPublicSettings 获取公开设置
func GetPublicSettings(c *gin.Context) {
	var settings []models.Setting
	models.DB.Find(&settings)

	result := make(map[string]string)
	for _, s := range settings {
		result[s.Key] = s.Value
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
	query.Order("group_name ASC, id ASC").Find(&settings)

	// 按 group 分组
	grouped := make(map[string][]models.Setting)
	for _, s := range settings {
		grouped[s.GroupName] = append(grouped[s.GroupName], s)
	}

	response.Success(c, grouped)
}

// AdminUpdateSettings 批量更新设置
func AdminUpdateSettings(c *gin.Context) {
	var req map[string]string
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误")
		return
	}

	for key, value := range req {
		var setting models.Setting
		if err := models.DB.Where("key = ?", key).First(&setting).Error; err != nil {
			// 不存在则创建，按 key 推断分组
			models.DB.Create(&models.Setting{
				Key:       key,
				Value:     value,
				GroupName: inferSettingGroup(key),
			})
		} else {
			models.DB.Model(&setting).Update("value", value)
		}
	}

	response.SuccessWithMessage(c, "更新成功", nil)
}

// inferSettingGroup 根据 key 推断设置分组
func inferSettingGroup(key string) string {
	switch key {
	case "phone", "mobile", "address", "email":
		return "contact"
	case "wechat_qr":
		return "social"
	default:
		return "basic"
	}
}

// SubmitContact 提交联系留言 (公开)
func SubmitContact(c *gin.Context) {
	var req struct {
		Name    string `json:"name" binding:"required"`
		Phone   string `json:"phone"`
		Email   string `json:"email"`
		Content string `json:"content" binding:"required"`
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
	models.DB.Order("id DESC").Find(&contacts)
	response.Success(c, contacts)
}

// AdminMarkContactRead 标记留言已读
func AdminMarkContactRead(c *gin.Context) {
	id := c.Param("id")
	models.DB.Model(&models.Contact{}).Where("id = ?", id).Update("is_read", true)
	response.SuccessWithMessage(c, "已标记为已读", nil)
}

// AdminDeleteContact 删除留言
func AdminDeleteContact(c *gin.Context) {
	id := c.Param("id")
	models.DB.Delete(&models.Contact{}, id)
	response.SuccessWithMessage(c, "删除成功", nil)
}
