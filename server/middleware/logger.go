package middleware

import (
	"log"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func Logger() gin.HandlerFunc {
	// 仅写 stdout，由容器运行时负责轮转，避免本地日志无限增长耗尽磁盘。
	log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)

	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		log.Printf("[INFO] %s %s - Started", method, path)

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()
		ip := c.ClientIP()
		userAgent := strings.NewReplacer("\r", "", "\n", "").Replace(c.Request.UserAgent())
		if len(userAgent) > 300 {
			userAgent = userAgent[:300]
		}

		log.Printf("[INFO] %s %s - Completed | Status: %d | Latency: %v | IP: %s | UA: %s",
			method, path, status, latency, ip, userAgent)
	}
}
