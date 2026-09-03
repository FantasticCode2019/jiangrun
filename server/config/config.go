package config

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/spf13/viper"
)

type AppConfig struct {
	Server   ServerConfig   `mapstructure:"server"`
	Database DatabaseConfig `mapstructure:"database"`
	JWT      JWTConfig      `mapstructure:"jwt"`
	Storage  StorageConfig  `mapstructure:"storage"`
}

type ServerConfig struct {
	Port           int    `mapstructure:"port"`
	Mode           string `mapstructure:"mode"` // debug, release, test
	AllowedOrigins string `mapstructure:"allowed_origins"`
}

type DatabaseConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	User     string `mapstructure:"user"`
	Password string `mapstructure:"password"`
	DBName   string `mapstructure:"dbname"`
	SSLMode  string `mapstructure:"sslmode"`
}

type JWTConfig struct {
	Secret     string `mapstructure:"secret"`
	ExpireHour int    `mapstructure:"expire_hour"`
}

type StorageConfig struct {
	UploadDir    string    `mapstructure:"upload_dir"`
	MaxImageSize int64     `mapstructure:"max_image_size"` // MB
	MaxVideoSize int64     `mapstructure:"max_video_size"` // MB
	ChunkSize    int64     `mapstructure:"chunk_size"`     // MB，分片大小
	Provider     string    `mapstructure:"provider"`       // local | oss
	OSS          OSSConfig `mapstructure:"oss"`
}

// OSSConfig 阿里云对象存储配置（provider=oss 时使用）
type OSSConfig struct {
	Bucket          string `mapstructure:"bucket"`
	Region          string `mapstructure:"region"`
	Endpoint        string `mapstructure:"endpoint"`
	AccessKeyID     string `mapstructure:"access_key_id"`
	AccessKeySecret string `mapstructure:"access_key_secret"`
	PublicURL       string `mapstructure:"public_url"` // 公开访问基址（如 CDN/自定义域名）
}

var App AppConfig

func Load() {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("./config")

	// 设置默认值
	setDefaults()

	// 读取配置文件
	if err := viper.ReadInConfig(); err != nil {
		log.Printf("Warning: config file not found, using defaults and env vars: %v", err)
	}

	// 环境变量覆盖
	viper.SetEnvPrefix("DATABASE")
	viper.BindEnv("database.host", "DATABASE_HOST")
	viper.BindEnv("database.port", "DATABASE_PORT")
	viper.BindEnv("database.user", "DATABASE_USER")
	viper.BindEnv("database.password", "DATABASE_PASSWORD")
	viper.BindEnv("database.dbname", "DATABASE_DBNAME")
	viper.BindEnv("database.sslmode", "DATABASE_SSLMODE")

	viper.SetEnvPrefix("JWT")
	viper.BindEnv("jwt.secret", "JWT_SECRET")
	viper.BindEnv("jwt.expire_hour", "JWT_EXPIRE_HOUR")

	viper.SetEnvPrefix("SERVER")
	viper.BindEnv("server.port", "SERVER_PORT")
	viper.BindEnv("server.mode", "SERVER_MODE")
	viper.BindEnv("server.allowed_origins", "CORS_ALLOWED_ORIGINS")

	viper.AutomaticEnv()

	// 解析配置
	if err := viper.Unmarshal(&App); err != nil {
		log.Fatalf("Failed to unmarshal config: %v", err)
	}

	if err := validate(); err != nil {
		log.Fatalf("Invalid configuration: %v", err)
	}
	if App.JWT.Secret == "jiangrun-secret-key-change-in-production" {
		log.Println("Warning: using default JWT secret, set JWT_SECRET for production")
	}

	// 确保上传目录存在
	uploadDir := App.Storage.UploadDir
	if !filepath.IsAbs(uploadDir) {
		wd, _ := os.Getwd()
		uploadDir = filepath.Join(wd, uploadDir)
		App.Storage.UploadDir = uploadDir
	}
	if err := os.MkdirAll(filepath.Join(uploadDir, "images"), 0750); err != nil {
		log.Fatalf("Failed to create image upload directory: %v", err)
	}
	if err := os.MkdirAll(filepath.Join(uploadDir, "videos"), 0750); err != nil {
		log.Fatalf("Failed to create video upload directory: %v", err)
	}
}

func validate() error {
	if App.Server.Mode != "debug" && App.Server.Mode != "release" && App.Server.Mode != "test" {
		return fmt.Errorf("SERVER_MODE must be debug, release, or test")
	}
	if App.Server.Mode == "release" {
		if App.JWT.Secret == "jiangrun-secret-key-change-in-production" || len(App.JWT.Secret) < 32 {
			return fmt.Errorf("JWT_SECRET must be a random value of at least 32 characters in release mode")
		}
		if App.Database.Password == "" || App.Database.Password == "postgres" {
			return fmt.Errorf("DATABASE_PASSWORD must be changed in release mode")
		}
	}
	if App.JWT.ExpireHour < 1 || App.JWT.ExpireHour > 24 {
		return fmt.Errorf("JWT_EXPIRE_HOUR must be between 1 and 24")
	}
	return nil
}

func setDefaults() {
	// Server defaults
	viper.SetDefault("server.port", 8080)
	viper.SetDefault("server.mode", "debug")
	viper.SetDefault("server.allowed_origins", "http://localhost:3000,http://localhost:3001")

	// Database defaults
	viper.SetDefault("database.host", "localhost")
	viper.SetDefault("database.port", 5432)
	viper.SetDefault("database.user", "postgres")
	viper.SetDefault("database.password", "postgres")
	viper.SetDefault("database.dbname", "jiangrun")
	viper.SetDefault("database.sslmode", "disable")

	// JWT defaults
	viper.SetDefault("jwt.secret", "jiangrun-secret-key-change-in-production")
	viper.SetDefault("jwt.expire_hour", 24)

	// Storage defaults
	viper.SetDefault("storage.upload_dir", "./uploads")
	viper.SetDefault("storage.max_image_size", 10)  // 10MB
	viper.SetDefault("storage.max_video_size", 500) // 500MB
	viper.SetDefault("storage.chunk_size", 8)       // 8MB/分片
	viper.SetDefault("storage.provider", "local")   // local | oss
}
