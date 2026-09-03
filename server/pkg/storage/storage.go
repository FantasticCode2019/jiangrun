package storage

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"jiangrun-server/config"
)

var imageExtensions = map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true}
var videoExtensions = map[string]bool{".mp4": true, ".mov": true, ".webm": true}

func ValidSubdir(subdir string) bool { return subdir == "images" || subdir == "videos" }

// SaveFile 保存上传文件。扩展名、实际字节数和文件签名必须同时通过校验。
func SaveFile(file *multipart.FileHeader, subdir string) (url string, err error) {
	if !ValidSubdir(subdir) {
		return "", fmt.Errorf("非法文件目录")
	}
	ext := strings.ToLower(filepath.Ext(filepath.Base(file.Filename)))
	if !extensionAllowed(ext, subdir) {
		return "", fmt.Errorf("不支持的文件格式")
	}
	maxSize := MaxSizeFor(subdir)
	if file.Size <= 0 || file.Size > maxSize {
		return "", fmt.Errorf("文件大小不合法或超过限制")
	}
	name, err := randomName(ext)
	if err != nil {
		return "", err
	}
	dir := filepath.Join(config.App.Storage.UploadDir, subdir)
	if err := os.MkdirAll(dir, 0750); err != nil {
		return "", err
	}
	dst := filepath.Join(dir, name)
	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()
	out, err := os.OpenFile(dst, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0640)
	if err != nil {
		return "", err
	}
	defer func() {
		_ = out.Close()
		if err != nil {
			_ = os.Remove(dst)
		}
	}()
	written, err := io.Copy(out, io.LimitReader(src, maxSize+1))
	if err != nil {
		return "", err
	}
	if written <= 0 || written > maxSize || written != file.Size {
		return "", fmt.Errorf("文件实际大小不合法")
	}
	if err = out.Close(); err != nil {
		return "", err
	}
	if err = ValidateFile(dst, subdir, ext); err != nil {
		return "", err
	}
	return StoreFinal(dst, name, subdir)
}

func ValidateFile(path, subdir, ext string) error {
	file, err := os.Open(path)
	if err != nil {
		return err
	}
	defer file.Close()
	header := make([]byte, 512)
	n, err := io.ReadFull(file, header)
	if err != nil && err != io.ErrUnexpectedEOF {
		return fmt.Errorf("无法读取文件签名")
	}
	if n == 0 {
		return fmt.Errorf("空文件")
	}
	header = header[:n]
	mimeType := http.DetectContentType(header)
	if subdir == "images" {
		allowed := map[string][]string{
			".jpg": {"image/jpeg"}, ".jpeg": {"image/jpeg"}, ".png": {"image/png"},
			".gif": {"image/gif"}, ".webp": {"image/webp"},
		}
		if !contains(allowed[ext], mimeType) {
			return fmt.Errorf("图片内容与扩展名不匹配")
		}
		return nil
	}
	if ext == ".webm" && len(header) >= 4 && string(header[:4]) == "\x1a\x45\xdf\xa3" {
		return nil
	}
	if (ext == ".mp4" || ext == ".mov") && len(header) >= 12 && string(header[4:8]) == "ftyp" {
		return nil
	}
	return fmt.Errorf("视频内容与扩展名不匹配（仅支持 MP4、MOV、WebM）")
}

func DeleteFile(path string) error {
	clean := strings.TrimPrefix(path, "/uploads/")
	parts := strings.Split(clean, "/")
	if len(parts) != 2 || !ValidSubdir(parts[0]) || parts[1] == "" || filepath.Base(parts[1]) != parts[1] {
		return fmt.Errorf("非法文件路径")
	}
	return os.Remove(filepath.Join(config.App.Storage.UploadDir, parts[0], parts[1]))
}

func IsImageFile(filename string) bool {
	return imageExtensions[strings.ToLower(filepath.Ext(filepath.Base(filename)))]
}

func IsVideoFile(filename string) bool {
	return videoExtensions[strings.ToLower(filepath.Ext(filepath.Base(filename)))]
}

func extensionAllowed(ext, subdir string) bool {
	if subdir == "images" {
		return imageExtensions[ext]
	}
	return videoExtensions[ext]
}

func randomName(ext string) (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf) + ext, nil
}

func contains(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

// StoreFinal 按 provider 决定保留本地文件或上传到 OSS。
func StoreFinal(localPath, filename, subdir string) (string, error) {
	if config.App.Storage.Provider == "oss" {
		key := fmt.Sprintf("%s/%s", subdir, filename)
		if err := ossUploadFile(key, localPath); err != nil {
			return "", err
		}
		if err := os.Remove(localPath); err != nil {
			return "", err
		}
		return ossPublicURL(key), nil
	}
	return fmt.Sprintf("/uploads/%s/%s", subdir, filename), nil
}
