package handlers

import (
	"jiangrun-server/middleware"
	"jiangrun-server/models"
	"jiangrun-server/pkg/response"

	"github.com/gin-gonic/gin"
)

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// Login 管理员登录
func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请输入用户名和密码")
		return
	}

	var user models.User
	if err := models.DB.Where("username = ?", req.Username).First(&user).Error; err != nil {
		response.Unauthorized(c, "用户名或密码错误")
		return
	}

	if !models.CheckPassword(req.Password, user.Password) {
		response.Unauthorized(c, "用户名或密码错误")
		return
	}

	token, err := middleware.GenerateToken(user.ID, user.Username, user.Role)
	if err != nil {
		response.ServerError(c, "生成令牌失败")
		return
	}

	response.Success(c, gin.H{
		"token":    token,
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"role":     user.Role,
		},
	})
}

// GetProfile 获取当前用户信息
func GetProfile(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var user models.User
	if err := models.DB.First(&user, userID).Error; err != nil {
		response.NotFound(c, "用户不存在")
		return
	}

	response.Success(c, gin.H{
		"id":       user.ID,
		"username": user.Username,
		"role":     user.Role,
	})
}

// ChangePassword 修改密码
func ChangePassword(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var req struct {
		OldPassword string `json:"old_password" binding:"required"`
		NewPassword string `json:"new_password" binding:"required,min=6"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请输入旧密码和新密码")
		return
	}

	var user models.User
	if err := models.DB.First(&user, userID).Error; err != nil {
		response.NotFound(c, "用户不存在")
		return
	}

	if !models.CheckPassword(req.OldPassword, user.Password) {
		response.BadRequest(c, "旧密码错误")
		return
	}

	models.DB.Model(&user).Update("password", models.HashPassword(req.NewPassword))
	response.SuccessWithMessage(c, "密码修改成功", nil)
}
