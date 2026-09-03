package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// BodyLimit 在 JSON 解析前限制请求体，避免小型接口被超大请求拖垮。
func BodyLimit(bytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Body != nil {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, bytes)
		}
		c.Next()
	}
}

func AdminJSONBodyLimit(bytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !strings.Contains(c.Request.URL.Path, "/admin/upload/") && c.Request.Body != nil {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, bytes)
		}
		c.Next()
	}
}
