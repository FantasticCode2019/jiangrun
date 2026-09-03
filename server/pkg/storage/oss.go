package storage

import (
	"fmt"
	"strings"
	"sync"

	"github.com/aliyun/aliyun-oss-go-sdk/oss"
	"jiangrun-server/config"
)

var (
	ossOnce   sync.Once
	ossClient *oss.Client
	ossBucket *oss.Bucket
)

// ossSetup 惰性初始化 OSS 客户端。未配置 AccessKey 时返回 (false, nil)。
func ossSetup() (bool, error) {
	cfg := config.App.Storage.OSS
	if cfg.AccessKeyID == "" || cfg.AccessKeySecret == "" || cfg.Bucket == "" {
		return false, nil
	}
	var initErr error
	ossOnce.Do(func() {
		endpoint := cfg.Endpoint
		if endpoint == "" {
			endpoint = fmt.Sprintf("%s.aliyuncs.com", cfg.Region)
		}
		client, err := oss.New(endpoint, cfg.AccessKeyID, cfg.AccessKeySecret)
		if err != nil {
			initErr = err
			return
		}
		bucket, err := client.Bucket(cfg.Bucket)
		if err != nil {
			initErr = err
			return
		}
		ossClient = client
		ossBucket = bucket
	})
	return ossBucket != nil, initErr
}

// ossUploadFile 把本地文件上传到 OSS 指定 key
func ossUploadFile(key string, localPath string) error {
	ok, err := ossSetup()
	if err != nil {
		return err
	}
	if !ok {
		return fmt.Errorf("OSS 未配置或未启用（请填写 storage.oss.access_key_id/secret/bucket）")
	}
	return ossBucket.PutObjectFromFile(strings.TrimPrefix(key, "/"), localPath)
}

// ossPublicURL 生成 OSS 公开访问 URL
func ossPublicURL(key string) string {
	cfg := config.App.Storage.OSS
	key = strings.TrimPrefix(key, "/")
	if cfg.PublicURL != "" {
		return strings.TrimRight(cfg.PublicURL, "/") + "/" + key
	}
	endpoint := cfg.Endpoint
	if cfg.Region != "" && endpoint == "" {
		endpoint = fmt.Sprintf("%s.aliyuncs.com", cfg.Region)
	}
	return fmt.Sprintf("https://%s.%s/%s", cfg.Bucket, strings.TrimPrefix(endpoint, "https://"), key)
}
