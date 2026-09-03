package handlers

import (
	"jiangrun-server/middleware"
	"jiangrun-server/models"
	"jiangrun-server/pkg/response"
	"strings"
	"time"
	"unicode"

	"github.com/gin-gonic/gin"
)

type LoginRequest struct {
	Username string `json:"username" binding:"required,max=50"`
	Password string `json:"password" binding:"required,max=72"`
}

var loginAccountLimiter = middleware.NewRateLimiter(10, 15*time.Minute)
var dummyPasswordHash = models.HashPassword("invalid-password-for-timing-check")

// Login 管理员登录
func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请输入用户名和密码")
		return
	}
	username := strings.ToLower(strings.TrimSpace(req.Username))
	if !loginAccountLimiter.Allow(username) {
		response.TooManyRequests(c, "登录尝试过于频繁，请稍后再试")
		return
	}

	var user models.User
	if err := models.DB.Where("LOWER(username) = ?", username).First(&user).Error; err != nil {
		_ = models.CheckPassword(req.Password, dummyPasswordHash)
		response.Unauthorized(c, "用户名或密码错误")
		return
	}

	if !models.CheckPassword(req.Password, user.Password) {
		response.Unauthorized(c, "用户名或密码错误")
		return
	}

	if user.Role != "admin" {
		response.Unauthorized(c, "该账号无管理权限")
		return
	}
	token, err := middleware.GenerateToken(user.ID, user.Username, user.Role, user.TokenVersion)
	if err != nil {
		response.ServerError(c, "生成令牌失败")
		return
	}

	response.Success(c, gin.H{
		"token": token,
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
		NewPassword string `json:"new_password" binding:"required,min=12,max=72"`
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
	if !strongPassword(req.NewPassword) {
		response.BadRequest(c, "新密码须为12-72位，并同时包含字母和数字")
		return
	}

	if err := models.DB.Model(&user).Updates(map[string]interface{}{
		"password":      models.HashPassword(req.NewPassword),
		"token_version": user.TokenVersion + 1,
	}).Error; err != nil {
		response.ServerError(c, "密码修改失败")
		return
	}
	response.SuccessWithMessage(c, "密码修改成功", nil)
}

func strongPassword(password string) bool {
	var hasLetter, hasNumber bool
	for _, r := range password {
		hasLetter = hasLetter || unicode.IsLetter(r)
		hasNumber = hasNumber || unicode.IsNumber(r)
	}
	return hasLetter && hasNumber
}
