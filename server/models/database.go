package models

import (
	"fmt"
	"log"
	"os"
	"time"
	"unicode"

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
	logLevel := logger.Warn
	if config.App.Server.Mode == "debug" {
		logLevel = logger.Info
	}
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logLevel),
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	sqlDB, _ := DB.DB()
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(50)
	sqlDB.SetConnMaxLifetime(time.Hour)
	sqlDB.SetConnMaxIdleTime(10 * time.Minute)

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
	var adminCount int64
	if err := DB.Model(&User{}).Where("role = ?", "admin").Count(&adminCount).Error; err != nil {
		log.Fatalf("Failed to check administrator account: %v", err)
	}
	if adminCount == 0 {
		initialPassword := os.Getenv("ADMIN_INITIAL_PASSWORD")
		if initialPassword == "" {
			if config.App.Server.Mode == "release" {
				log.Fatal("ADMIN_INITIAL_PASSWORD is required when creating the first administrator in release mode")
			}
			initialPassword = "admin123"
			log.Println("Warning: using default admin password 'admin123', set ADMIN_INITIAL_PASSWORD to override")
		}
		if config.App.Server.Mode == "release" && !validInitialPassword(initialPassword) {
			log.Fatal("ADMIN_INITIAL_PASSWORD must be 12-72 characters and contain letters and numbers in release mode")
		}
		defaultAdmin := User{
			Username:     "admin",
			Password:     HashPassword(initialPassword),
			Role:         "admin",
			TokenVersion: 1,
		}
		DB.Create(&defaultAdmin)
		log.Println("Default admin 'admin' created")
	}

	// 创建缺失的默认设置。FirstOrCreate 只补缺项，不覆盖后台已保存的内容。
	defaults := []Setting{
		{Key: "site_name", Value: "北京江润风景园林景观设计有限公司", GroupName: "basic"},
		{Key: "site_slogan", Value: "专注别墅花园·屋顶花园·露台花园设计施工", GroupName: "basic"},
		{Key: "site_description", Value: "专注别墅花园、屋顶花园、露台花园设计与施工维护，以匠心营造每一寸庭院雅境。", GroupName: "basic"},
		{Key: "phone", Value: "010-8175-8744", GroupName: "contact"},
		{Key: "mobile", Value: "13701024192", GroupName: "contact"},
		{Key: "address", Value: "北京顺义区南法信马可汇三号楼一单元901", GroupName: "contact"},
		{Key: "design_address", Value: "北京顺义区南法信马可汇三号楼一单元901", GroupName: "contact"},
		{Key: "factory_address", Value: "北京顺义区西马各庄农业生态园 B911 栋", GroupName: "contact"},
		{Key: "business_hours", Value: "周一至周六 9:00 - 18:00", GroupName: "contact"},
		{Key: "icp", Value: "京ICP备19052372号-1", GroupName: "basic"},
		{Key: "email", Value: "", GroupName: "contact"},
		{Key: "wechat_qr", Value: "", GroupName: "social"},
		{Key: "home_about_title", Value: "用设计，让自然回到日常生活", GroupName: "content"},
		{Key: "home_about_text", Value: "北京江润风景园林景观设计有限公司成立于2005年，已成长为集园林苗木培育、庭院景观设计、别墅花园设计、屋顶花园设计、露台花园设计、商业空间绿化等为一体的专业化设计、施工及养护的园林绿化品牌企业。\n我们注重功能设计，功能决定形式。每一寸土地都值得细细推敲，为每一处庭院提供贴合生活的设计方案。", GroupName: "content"},
		{Key: "about_intro", Value: "北京江润风景园林景观设计有限公司成立于2005年，经过多年发展，已成长为集园林苗木培育、庭院景观设计、别墅花园设计、屋顶花园设计、露台花园设计、工厂园林规划、商业地产景观设计、家居花木陈设设计、商业空间绿化等为一体的专业化设计、施工及养护的园林绿化品牌企业。", GroupName: "content"},
	}
	for i := range defaults {
		if err := DB.Where("key = ?", defaults[i].Key).FirstOrCreate(&defaults[i]).Error; err != nil {
			log.Printf("Failed to seed setting %s: %v", defaults[i].Key, err)
		}
	}

	// 创建默认分类（幂等：缺失才插入；父分类=导航 tab，子分类=下拉子菜单，对齐 www.jiangrun.net）
	createdCats := make(map[uint]bool)
	upsertCat := func(name, nameEn, slug, typ string, sort int) uint {
		var c Category
		if err := DB.Where("type = ? AND slug = ?", typ, slug).First(&c).Error; err == nil {
			return c.ID
		}
		c = Category{Name: name, NameEn: nameEn, Slug: slug, Type: typ, SortOrder: sort, Status: 1}
		DB.Create(&c)
		createdCats[c.ID] = true
		return c.ID
	}
	linkChild := func(parentID uint, childIDs ...uint) {
		for _, id := range childIDs {
			if createdCats[id] {
				DB.Model(&Category{}).Where("id = ?", id).Update("parent_id", parentID)
			}
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

	// 仅执行一次的内容迁移：为升级前已存在的顶级栏目补齐新字段，之后不再覆盖后台编辑。
	var marker Setting
	if err := DB.Where("key = ?", "internal_category_copy_v1").First(&marker).Error; err != nil {
		copyDefaults := map[uint][2]string{
			landscapeID: {"别墅项目 · 屋顶项目 · 景观工程", "景观设计涵盖居住区环境景观、城市公共空间、公园旅游区及商业空间绿化等领域。\n依托建筑风格与空间特征，将生态、功能与形式有效融合，打造可持续的人居环境。"},
			villaID:     {"现代 · 中式 · 日式 · 欧式", "别墅花园设计是江润的核心业务。我们依据建筑风格与空间特征，将功能与形式融合。\n从功能布局、动线规划到植被、水景与灯光，为每一座别墅打造独特的私家花园。"},
			rooftopID:   {"屋顶花园 · 露台花园 · 室内花园", "从防水、排水、承重到植物配置与小品点缀，系统打造兼具生态价值与生活品质的空中花园。"},
			rockeryID:   {"鱼池过滤 · 泳池假山 · 喷泉水景", "提供鱼池过滤系统、泳池假山、喷泉水景及自动灌溉的设计与施工服务，让山水意趣融入庭院。"},
			factoryID:   {"铝艺凉亭 · 户外地板 · 栏杆护栏 · 雨棚", "依托线下工厂与专业制作团队，从下料、焊接、表面处理到现场安装，全流程把控户外设施品质。"},
		}
		for id, content := range copyDefaults {
			DB.Model(&Category{}).Where("id = ? AND (subtitle IS NULL OR subtitle = '')", id).Update("subtitle", content[0])
			DB.Model(&Category{}).Where("id = ? AND (description IS NULL OR description = '')", id).Update("description", content[1])
		}
		DB.Create(&Setting{Key: "internal_category_copy_v1", Value: "done", GroupName: "system"})
	}
}

func validInitialPassword(password string) bool {
	if len(password) < 12 || len(password) > 72 {
		return false
	}
	var hasLetter, hasNumber bool
	for _, char := range password {
		hasLetter = hasLetter || unicode.IsLetter(char)
		hasNumber = hasNumber || unicode.IsNumber(char)
	}
	return hasLetter && hasNumber
}
