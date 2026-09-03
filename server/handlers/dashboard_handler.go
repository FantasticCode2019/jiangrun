package handlers

import (
	"jiangrun-server/models"
	"jiangrun-server/pkg/response"

	"github.com/gin-gonic/gin"
)

// GetDashboard 获取仪表盘统计数据
func GetDashboard(c *gin.Context) {
	var caseCount, videoCount, newsCount, serviceCount, contactCount int64

	counts := []struct {
		model interface{}
		value *int64
	}{
		{&models.Case{}, &caseCount}, {&models.Video{}, &videoCount}, {&models.News{}, &newsCount},
		{&models.Service{}, &serviceCount}, {&models.Contact{}, &contactCount},
	}
	for _, item := range counts {
		if err := models.DB.Model(item.model).Count(item.value).Error; err != nil {
			response.ServerError(c, "读取统计数据失败")
			return
		}
	}

	var unreadContacts int64
	if err := models.DB.Model(&models.Contact{}).Where("is_read = ?", false).Count(&unreadContacts).Error; err != nil {
		response.ServerError(c, "读取统计数据失败")
		return
	}

	// 最新留言
	var latestContacts []models.Contact
	if err := models.DB.Order("id DESC").Limit(5).Find(&latestContacts).Error; err != nil {
		response.ServerError(c, "读取最新留言失败")
		return
	}

	// 最新案例
	var latestCases []models.Case
	if err := models.DB.Order("id DESC").Limit(5).Find(&latestCases).Error; err != nil {
		response.ServerError(c, "读取最新案例失败")
		return
	}

	response.Success(c, gin.H{
		"stats": gin.H{
			"cases":    caseCount,
			"videos":   videoCount,
			"news":     newsCount,
			"services": serviceCount,
			"contacts": contactCount,
			"unread":   unreadContacts,
		},
		"latest_contacts": latestContacts,
		"latest_cases":    latestCases,
	})
}
