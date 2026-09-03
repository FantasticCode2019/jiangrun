package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"jiangrun-server/config"
	"jiangrun-server/middleware"
	"jiangrun-server/models"
	"jiangrun-server/pkg/storage"
	"jiangrun-server/routes"

	"github.com/gin-gonic/gin"
)

func main() {
	// 加载配置
	config.Load()

	// 初始化数据库
	models.InitDB()

	// 自动迁移数据库表
	models.AutoMigrate()

	// 初始化默认数据
	models.SeedDefaults()
	if err := storage.CleanupExpiredChunks(24 * time.Hour); err != nil {
		log.Printf("Warning: failed to clean expired upload chunks: %v", err)
	}
	go func() {
		ticker := time.NewTicker(time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			if err := storage.CleanupExpiredChunks(24 * time.Hour); err != nil {
				log.Printf("Warning: failed to clean expired upload chunks: %v", err)
			}
		}
	}()

	// 设置 Gin 模式
	gin.SetMode(config.App.Server.Mode)

	// 创建路由引擎
	r := gin.New()
	r.Use(gin.Recovery())
	if err := r.SetTrustedProxies([]string{"127.0.0.1", "::1", "172.16.0.0/12"}); err != nil {
		log.Fatalf("Failed to configure trusted proxies: %v", err)
	}

	// 中间件
	r.Use(middleware.Cors())
	r.Use(middleware.Logger())

	// 静态文件服务 (上传文件)
	r.Static("/uploads", config.App.Storage.UploadDir)

	// 注册路由
	routes.Register(r)

	// 启动服务器
	addr := fmt.Sprintf(":%d", config.App.Server.Port)
	log.Printf("Server starting on %s", addr)
	server := &http.Server{
		Addr:              addr,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
		// 视频固定为小分片上传；前置 Nginx 还会限制慢连接和单片大小。
		ReadTimeout:    2 * time.Minute,
		WriteTimeout:   2 * time.Minute,
		IdleTimeout:    120 * time.Second,
		MaxHeaderBytes: 1 << 20,
	}
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Failed to start server: %v", err)
	}
}
