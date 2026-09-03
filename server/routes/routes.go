package routes

import (
	"time"

	"jiangrun-server/handlers"
	"jiangrun-server/middleware"

	"github.com/gin-gonic/gin"
)

var (
	loginLimiter   = middleware.NewRateLimiter(5, time.Minute)
	contactLimiter = middleware.NewRateLimiter(5, time.Minute)
	viewLimiter    = middleware.NewRateLimiter(60, time.Minute)
	publicLimiter  = middleware.NewRateLimiter(300, time.Minute)
	adminLimiter   = middleware.NewRateLimiter(600, time.Minute)
)

func Register(r *gin.Engine) {
	// API v1
	api := r.Group("/api/v1")
	{
		// 公开接口 - 不需要认证
		public := api.Group("")
		public.Use(middleware.RateLimit(publicLimiter))
		{
			// 认证
			public.POST("/login", middleware.BodyLimit(16<<10), middleware.RateLimit(loginLimiter), handlers.Login)

			// 轮播图
			public.GET("/banners", handlers.GetBanners)

			// 案例
			public.GET("/cases", handlers.GetCases)
			public.GET("/cases/featured", handlers.GetFeaturedCases)
			public.GET("/cases/:id", handlers.GetCase)

			// 视频
			public.GET("/videos", handlers.GetVideos)
			public.GET("/videos/featured", handlers.GetFeaturedVideos)
			public.GET("/videos/:id", handlers.GetVideo)
			public.POST("/videos/:id/view", middleware.RateLimit(viewLimiter), handlers.IncrementViewCount)

			// 新闻
			public.GET("/news", handlers.GetNewsList)
			public.GET("/news/:id", handlers.GetNewsDetail)

			// 服务
			public.GET("/services", handlers.GetServices)
			public.GET("/services/:slug", handlers.GetServiceBySlug)

			// 分类
			public.GET("/categories/:type", handlers.GetCategoriesByType)

			// 网站设置
			public.GET("/settings", handlers.GetPublicSettings)

			// 联系留言
			public.POST("/contact", middleware.BodyLimit(16<<10), middleware.RateLimit(contactLimiter), handlers.SubmitContact)
		}

		// 管理接口 - 需要认证
		admin := api.Group("/admin")
		admin.Use(middleware.RateLimit(adminLimiter), middleware.AuthRequired(), middleware.AdminJSONBodyLimit(2<<20))
		{
			// 仪表盘
			admin.GET("/dashboard", handlers.GetDashboard)

			// 管理员信息
			admin.GET("/profile", handlers.GetProfile)
			admin.PUT("/password", handlers.ChangePassword)

			// 案例管理
			admin.GET("/cases", handlers.AdminGetCases)
			admin.GET("/cases/:id", handlers.AdminGetCase)
			admin.POST("/cases", handlers.AdminCreateCase)
			admin.PUT("/cases/:id", handlers.AdminUpdateCase)
			admin.DELETE("/cases/:id", handlers.AdminDeleteCase)

			// 视频管理
			admin.GET("/videos", handlers.AdminGetVideos)
			admin.GET("/videos/:id", handlers.AdminGetVideo)
			admin.POST("/videos", handlers.AdminCreateVideo)
			admin.PUT("/videos/:id", handlers.AdminUpdateVideo)
			admin.DELETE("/videos/:id", handlers.AdminDeleteVideo)

			// 新闻管理
			admin.GET("/news", handlers.AdminGetNews)
			admin.GET("/news/:id", handlers.AdminGetNewsDetail)
			admin.POST("/news", handlers.AdminCreateNews)
			admin.PUT("/news/:id", handlers.AdminUpdateNews)
			admin.DELETE("/news/:id", handlers.AdminDeleteNews)

			// 服务管理
			admin.GET("/services", handlers.AdminGetServices)
			admin.GET("/services/:id", handlers.AdminGetService)
			admin.POST("/services", handlers.AdminCreateService)
			admin.PUT("/services/:id", handlers.AdminUpdateService)
			admin.DELETE("/services/:id", handlers.AdminDeleteService)

			// 分类管理
			admin.GET("/categories", handlers.AdminGetCategories)
			admin.POST("/categories", handlers.AdminCreateCategory)
			admin.PUT("/categories/:id", handlers.AdminUpdateCategory)
			admin.DELETE("/categories/:id", handlers.AdminDeleteCategory)

			// 轮播图管理
			admin.GET("/banners", handlers.AdminGetBanners)
			admin.POST("/banners", handlers.AdminCreateBanner)
			admin.PUT("/banners/:id", handlers.AdminUpdateBanner)
			admin.DELETE("/banners/:id", handlers.AdminDeleteBanner)

			// 设置管理
			admin.GET("/settings", handlers.AdminGetSettings)
			admin.PUT("/settings", handlers.AdminUpdateSettings)

			// 留言管理
			admin.GET("/contacts", handlers.AdminGetContacts)
			admin.PUT("/contacts/:id/read", handlers.AdminMarkContactRead)
			admin.DELETE("/contacts/:id", handlers.AdminDeleteContact)

			// 文件上传
			admin.POST("/upload/image", handlers.UploadImage)
			// 大文件分片上传（断点续传）
			admin.POST("/upload/chunk/init", handlers.ChunkInit)
			admin.POST("/upload/chunk", handlers.ChunkUpload)
			admin.GET("/upload/chunk/status", handlers.ChunkStatus)
			admin.POST("/upload/chunk/complete", handlers.ChunkComplete)
		}
	}
}
