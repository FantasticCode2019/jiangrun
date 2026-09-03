package models

import (
	"fmt"
	"log"
	"os"

	"jiangrun-server/config"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitDB() {
	cfg := config.App.Database
	dsn := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName, cfg.SSLMode,
	)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	sqlDB, _ := DB.DB()
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)

	log.Println("Database connected successfully")
}

func AutoMigrate() {
	err := DB.AutoMigrate(
		&User{},
		&Category{},
		&Case{},
		&Video{},
		&News{},
		&Service{},
		&Banner{},
		&Setting{},
		&Contact{},
	)
	if err != nil {
		log.Fatalf("Failed to auto migrate: %v", err)
	}
	log.Println("Database migrated successfully")
}

func SeedDefaults() {
	// 创建默认管理员
	var userCount int64
	DB.Model(&User{}).Count(&userCount)
	if userCount == 0 {
		initialPassword := os.Getenv("ADMIN_INITIAL_PASSWORD")
		if initialPassword == "" {
			initialPassword = "admin123"
			log.Println("Warning: using default admin password 'admin123', set ADMIN_INITIAL_PASSWORD to override")
		}
		defaultAdmin := User{
			Username: "admin",
			Password: HashPassword(initialPassword),
			Role:     "admin",
		}
		DB.Create(&defaultAdmin)
		log.Println("Default admin 'admin' created")
	}

	// 创建默认设置
	var settingCount int64
	DB.Model(&Setting{}).Count(&settingCount)
	if settingCount == 0 {
		defaults := []Setting{
			{Key: "site_name", Value: "北京江润风景园林景观设计有限公司", GroupName: "basic"},
			{Key: "site_slogan", Value: "专注别墅花园·屋顶花园·露台花园设计施工", GroupName: "basic"},
			{Key: "phone", Value: "010-8175-8744", GroupName: "contact"},
			{Key: "mobile", Value: "13701024192", GroupName: "contact"},
			{Key: "address", Value: "北京顺义区南法信马可汇三号楼一单元901", GroupName: "contact"},
			{Key: "icp", Value: "京ICP备19052372号-1", GroupName: "basic"},
			{Key: "email", Value: "", GroupName: "contact"},
			{Key: "wechat_qr", Value: "", GroupName: "social"},
		}
		DB.Create(&defaults)
		log.Println("Default settings seeded")
	}

	// 创建默认分类（幂等：缺失才插入；父分类=导航 tab，子分类=下拉子菜单，对齐 www.jiangrun.net）
	upsertCat := func(name, nameEn, slug, typ string, sort int) uint {
		var c Category
		if err := DB.Where("type = ? AND slug = ?", typ, slug).First(&c).Error; err == nil {
			// 已存在：收敛为规范定义（更新名称/排序，不覆盖用户只是引用）
			DB.Model(&Category{}).Where("id = ?", c.ID).
				Updates(map[string]interface{}{"name": name, "name_en": nameEn, "sort_order": sort})
			return c.ID
		}
		c = Category{Name: name, NameEn: nameEn, Slug: slug, Type: typ, SortOrder: sort}
		DB.Create(&c)
		return c.ID
	}
	linkChild := func(parentID uint, childIDs ...uint) {
		for _, id := range childIDs {
			DB.Model(&Category{}).Where("id = ?", id).Update("parent_id", parentID)
		}
	}

	// —— 案例栏目父分类（导航 tab）
	landscapeID := upsertCat("景观设计", "Landscape", "landscape", "case", 1)
	villaID := upsertCat("别墅花园设计", "Villa Garden", "villa-garden", "case", 2)
	rooftopID := upsertCat("屋顶花园设计", "Rooftop Garden", "rooftop-garden", "case", 3)
	rockeryID := upsertCat("假山假水", "Waterscape", "rockery", "case", 4)
	factoryID := upsertCat("工厂制作", "Factory", "factory", "case", 5)

	// —— 案例栏目子分类（下拉子菜单）
	linkChild(landscapeID,
		upsertCat("别墅项目", "Villa Project", "landscape-villa", "case", 1),
		upsertCat("屋顶项目", "Rooftop Project", "landscape-rooftop", "case", 2),
		upsertCat("景观工程", "Landscape Works", "landscape-works", "case", 3),
	)
	linkChild(villaID,
		upsertCat("现代风格", "Modern", "villa-modern", "case", 1),
		upsertCat("中式风格", "Chinese", "villa-chinese", "case", 2),
		upsertCat("日式风格", "Japanese", "villa-japanese", "case", 3),
		upsertCat("欧式风格", "European", "villa-european", "case", 4),
	)
	linkChild(rooftopID,
		upsertCat("屋顶花园", "Rooftop", "roof-roof", "case", 1),
		upsertCat("露台花园", "Terrace", "rooftop-terrace", "case", 2),
		upsertCat("室内花园", "Indoor", "rooftop-indoor", "case", 3),
		upsertCat("花园养护", "Maintenance", "rooftop-maintenance", "case", 4),
	)
	linkChild(rockeryID,
		upsertCat("鱼池过滤", "Fish Pond", "rockery-pond", "case", 1),
		upsertCat("泳池假山", "Pool&Rockery", "rockery-pool", "case", 2),
		upsertCat("喷泉水景", "Fountain", "rockery-fountain", "case", 3),
		upsertCat("自动灌溉", "Irrigation", "rockery-irrigation", "case", 4),
	)
	linkChild(factoryID,
		upsertCat("铝艺凉亭", "Alu Pavilion", "factory-pavilion", "case", 1),
		upsertCat("户外地板", "Outdoor Deck", "factory-deck", "case", 2),
		upsertCat("栏杆护栏", "Railings", "factory-railing", "case", 3),
		upsertCat("雨棚停车棚", "Canopy", "factory-canopy", "case", 4),
	)

	// —— 其它类型分类（视频 / 新闻 / 服务）
	upsertCat("别墅花园", "Villa Garden", "villa-garden", "video", 1)
	upsertCat("屋顶花园", "Rooftop Garden", "rooftop-garden", "video", 2)
	upsertCat("施工过程", "Construction", "construction", "video", 3)
	upsertCat("设计理念", "Design Concept", "design-concept", "video", 4)
	upsertCat("公司动态", "Company News", "company-news", "news", 1)
	upsertCat("行业资讯", "Industry", "industry", "news", 2)
	upsertCat("花园设计", "Garden Design", "garden-design", "service", 1)
	upsertCat("工程施工", "Construction", "construction-works", "service", 2)
	upsertCat("花园养护", "Maintenance", "maintenance", "service", 3)
}
