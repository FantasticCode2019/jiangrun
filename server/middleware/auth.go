package middleware

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"jiangrun-server/config"
	"jiangrun-server/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID       uint   `json:"user_id"`
	Username     string `json:"username"`
	Role         string `json:"role"`
	TokenVersion int    `json:"token_version"`
	jwt.RegisteredClaims
}

// GenerateToken 生成 JWT Token
func GenerateToken(userID uint, username, role string, tokenVersion int) (string, error) {
	claims := Claims{
		UserID:       userID,
		Username:     username,
		Role:         role,
		TokenVersion: tokenVersion,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(config.App.JWT.ExpireHour) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "jiangrun",
			Subject:   strconv.FormatUint(uint64(userID), 10),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(config.App.JWT.Secret))
}

// AuthRequired JWT 认证中间件
func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"code": 401, "message": "未提供认证令牌"})
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{"code": 401, "message": "认证格式错误"})
			c.Abort()
			return
		}

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return []byte(config.App.JWT.Secret), nil
		}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}), jwt.WithIssuer("jiangrun"), jwt.WithLeeway(30*time.Second))

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"code": 401, "message": "认证令牌无效或已过期"})
			c.Abort()
			return
		}

		var user models.User
		if err := models.DB.Select("id", "username", "role", "token_version").First(&user, claims.UserID).Error; err != nil ||
			user.Username != claims.Username || user.Role != "admin" || claims.Role != "admin" || user.TokenVersion != claims.TokenVersion {
			c.JSON(http.StatusUnauthorized, gin.H{"code": 401, "message": "认证令牌已失效"})
			c.Abort()
			return
		}

		// 将用户信息存入上下文
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("role", user.Role)
		c.Next()
	}
}
