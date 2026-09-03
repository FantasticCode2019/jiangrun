package middleware

import (
	"io"
	"log"
	"os"
	"time"

	"github.com/gin-gonic/gin"
)

func Logger() gin.HandlerFunc {
	// 日志文件路径（Docker 挂载用），失败时仅输出到控制台，避免本地启动崩溃
	logFile := "/app/logs/server.log"
	_ = os.MkdirAll("/app/logs", 0755)

	if f, err := os.OpenFile(logFile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644); err == nil {
		log.SetOutput(io.MultiWriter(os.Stdout, f))
	} else {
		log.Printf("Warning: cannot open log file %s (%v), logging to stdout only", logFile, err)
	}
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
		userAgent := c.Request.UserAgent()

		log.Printf("[INFO] %s %s - Completed | Status: %d | Latency: %v | IP: %s | UA: %s",
			method, path, status, latency, ip, userAgent)
	}
}
