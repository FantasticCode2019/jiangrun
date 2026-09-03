package main

import (
	"fmt"
	"log"

	"jiangrun-server/config"
	"jiangrun-server/middleware"
	"jiangrun-server/models"
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

	// 设置 Gin 模式
	gin.SetMode(config.App.Server.Mode)

	// 创建路由引擎
	r := gin.Default()

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
	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
