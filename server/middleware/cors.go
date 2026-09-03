package middleware

import (
	"jiangrun-server/config"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func Cors() gin.HandlerFunc {
	origins := strings.Split(config.App.Server.AllowedOrigins, ",")
	allowed := origins[:0]
	for _, origin := range origins {
		if value := strings.TrimSpace(origin); value != "" && value != "*" {
			allowed = append(allowed, value)
		}
	}
	return cors.New(cors.Config{
		AllowOrigins:     allowed,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "Accept", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length", "Content-Type"},
		AllowCredentials: false,
		MaxAge:           12 * time.Hour,
	})
}
