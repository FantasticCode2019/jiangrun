package storage

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"jiangrun-server/config"
)

// SaveFile 保存上传文件，返回相对路径
func SaveFile(file *multipart.FileHeader, subdir string) (string, error) {
	// 检查文件大小
	ext := strings.ToLower(filepath.Ext(file.Filename))
	maxSize := config.App.Storage.MaxImageSize * 1024 * 1024

	if subdir == "videos" {
		maxSize = config.App.Storage.MaxVideoSize * 1024 * 1024
	}

	if file.Size > maxSize {
		return "", fmt.Errorf("文件大小超过限制")
	}

	// 生成文件名: 时间戳 + 随机数 + 扩展名
	filename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)

	// 创建目录
	uploadDir := filepath.Join(config.App.Storage.UploadDir, subdir)
	os.MkdirAll(uploadDir, 0755)

	// 目标路径
	dst := filepath.Join(uploadDir, filename)

	// 打开源文件
	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	// 创建目标文件
	out, err := os.Create(dst)
	if err != nil {
		return "", err
	}
	defer out.Close()

	// 复制文件内容
	if _, err = io.Copy(out, src); err != nil {
		return "", err
	}

	// 返回相对URL路径
	return fmt.Sprintf("/uploads/%s/%s", subdir, filename), nil
}

// DeleteFile 删除文件
func DeleteFile(path string) error {
	if path == "" {
		return nil
	}
	// 转换为本地路径
	fullPath := filepath.Join(config.App.Storage.UploadDir, strings.TrimPrefix(path, "/uploads/"))
	return os.Remove(fullPath)
}

// IsImageFile 检查是否为图片文件
func IsImageFile(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	allowed := map[string]bool{
		".jpg": true, ".jpeg": true, ".png": true,
		".gif": true, ".webp": true, ".bmp": true,
	}
	return allowed[ext]
}

// IsVideoFile 检查是否为视频文件
func IsVideoFile(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	allowed := map[string]bool{
		".mp4": true, ".mov": true, ".avi": true,
		".mkv": true, ".webm": true,
	}
	return allowed[ext]
}
