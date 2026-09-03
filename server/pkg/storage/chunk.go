package storage

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"jiangrun-server/config"
)

// ChunkInit 分片上传初始化：返回本次上传的 upload_id
func ChunkInit() (string, error) {
	uploadID := fmt.Sprintf("%d", time.Now().UnixNano())
	if err := os.MkdirAll(ChunkDir(uploadID), 0755); err != nil {
		return "", err
	}
	return uploadID, nil
}

// ChunkDir 某个上传 ID 的分片临时目录
func ChunkDir(uploadID string) string {
	return filepath.Join(config.App.Storage.UploadDir, "tmp", uploadID)
}

// ChunkDirExists 判断某上传的临时目录是否存在（续传复用）
func ChunkDirExists(uploadID string) bool {
	if uploadID == "" {
		return false
	}
	info, err := os.Stat(ChunkDir(uploadID))
	return err == nil && info.IsDir()
}

// SaveChunk 保存一个分片；返回该 upload 已上传的分片数量（用于并发计数/校验）
func SaveChunk(uploadID string, index int, chunkFile *multipart.FileHeader) error {
	dir := ChunkDir(uploadID)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	dst := filepath.Join(dir, fmt.Sprintf("chunk_%06d", index))

	// 如果分片已存在则直接覆盖（保证幂等）
	if err := saveMultipartFile(dst, chunkFile); err != nil {
		return err
	}
	return nil
}

// UploadedChunks 返回某 upload 已成功上传的分片序号（用于断点续传）
func UploadedChunks(uploadID string) ([]int, error) {
	dir := ChunkDir(uploadID)
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return []int{}, nil
		}
		return nil, err
	}
	var idx []int
	for _, e := range entries {
		if strings.HasPrefix(e.Name(), "chunk_") {
			n, e2 := strconv.Atoi(strings.TrimPrefix(e.Name(), "chunk_"))
			if e2 == nil {
				idx = append(idx, n)
			}
		}
	}
	sort.Ints(idx)
	return idx, nil
}

// CompleteChunk 合并分片为最终文件，并按 provider 存储。
// 返回最终可访问 URL 与文件名。
func CompleteChunk(uploadID string, ext string, subdir string) (string, error) {
	idx, err := UploadedChunks(uploadID)
	if err != nil {
		return "", err
	}
	if len(idx) == 0 {
		return "", fmt.Errorf("没有可合并的分片")
	}

	finalName := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	uploadDir := config.App.Storage.UploadDir

	// 合并且存为最终目标（本地先写好）
	finalDir := filepath.Join(uploadDir, subdir)
	if err := os.MkdirAll(finalDir, 0755); err != nil {
		return "", err
	}
	localPath := filepath.Join(finalDir, finalName)
	merged, err := os.Create(localPath)
	if err != nil {
		return "", err
	}

	for _, i := range idx {
		cp, err := os.Open(filepath.Join(ChunkDir(uploadID), fmt.Sprintf("chunk_%06d", i)))
		if err != nil {
			merged.Close()
			os.Remove(localPath)
			return "", err
		}
		if _, err := io.Copy(merged, cp); err != nil {
			cp.Close()
			merged.Close()
			os.Remove(localPath)
			return "", err
		}
		cp.Close()
	}
	merged.Close()

	// 若配置了 OSS，则上传到 OSS（此时代码路径留 SDK 调用）
	url, err := StoreFinal(localPath, finalName, subdir)
	if err != nil {
		return "", err
	}

	// 清理分片临时目录
	os.RemoveAll(ChunkDir(uploadID))
	return url, nil
}

// StoreFinal 按 provider 决定复用本地文件 or 上传到 OSS。
// provider=local：返回本地 URL，文件保留在 uploadDir 中。
func StoreFinal(localPath, filename, subdir string) (string, error) {
	provider := config.App.Storage.Provider
	if provider == "oss" {
		// 交给 OSS provider 上传；上传成功后可选删除本地缓存
		key := fmt.Sprintf("%s/%s", normalizeKey(subdir), filename)
		if err := ossUploadFile(key, localPath); err != nil {
			return "", err
		}
		// 本地不再保留（避免双份占用）
		os.Remove(localPath)
		return ossPublicURL(key), nil
	}
	// local：直接使用本地相对路径
	return fmt.Sprintf("/uploads/%s/%s", subdir, filename), nil
}

func normalizeKey(subdir string) string {
	return strings.Trim(subdir, "/")
}

func ChunkSizeBytes() int64 {
	mb := config.App.Storage.ChunkSize
	if mb <= 0 {
		mb = 8
	}
	return mb * 1024 * 1024
}

// MaxSizeFor 返回某类型(subdir)允许的最大字节数
func MaxSizeFor(subdir string) int64 {
	mb := config.App.Storage.MaxImageSize
	if subdir == "videos" {
		mb = config.App.Storage.MaxVideoSize
	}
	if mb <= 0 {
		mb = 10
	}
	return mb * 1024 * 1024
}

// 大文件支持：把 multipart.FileHeader 写入目标路径
func saveMultipartFile(dst string, fh *multipart.FileHeader) error {
	src, err := fh.Open()
	if err != nil {
		return err
	}
	defer src.Close()
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, src)
	return err
}