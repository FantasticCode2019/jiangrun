package handlers

import (
	"jiangrun-server/models"
	"jiangrun-server/pkg/response"

	"github.com/gin-gonic/gin"
)

// GetDashboard 获取仪表盘统计数据
func GetDashboard(c *gin.Context) {
	var caseCount, videoCount, newsCount, serviceCount, contactCount int64

	models.DB.Model(&models.Case{}).Count(&caseCount)
	models.DB.Model(&models.Video{}).Count(&videoCount)
	models.DB.Model(&models.News{}).Count(&newsCount)
	models.DB.Model(&models.Service{}).Count(&serviceCount)
	models.DB.Model(&models.Contact{}).Count(&contactCount)

	var unreadContacts int64
	models.DB.Model(&models.Contact{}).Where("is_read = ?", false).Count(&unreadContacts)

	// 最新留言
	var latestContacts []models.Contact
	models.DB.Order("id DESC").Limit(5).Find(&latestContacts)

	// 最新案例
	var latestCases []models.Case
	models.DB.Order("id DESC").Limit(5).Find(&latestCases)

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
