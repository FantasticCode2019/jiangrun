package storage

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"jiangrun-server/config"
)

const chunkMetadataFile = "metadata.json"

var uploadIDPattern = regexp.MustCompile(`^[a-f0-9]{64}$`)

type ChunkMetadata struct {
	UploadID   string    `json:"upload_id"`
	Filename   string    `json:"filename"`
	Extension  string    `json:"extension"`
	Subdir     string    `json:"subdir"`
	TotalSize  int64     `json:"total_size"`
	ChunkSize  int64     `json:"chunk_size"`
	ChunkCount int       `json:"chunk_count"`
	OwnerID    uint      `json:"owner_id"`
	CreatedAt  time.Time `json:"created_at"`
}

func InitChunkUpload(filename, subdir string, totalSize int64, ownerID uint) (*ChunkMetadata, error) {
	if !ValidSubdir(subdir) || totalSize <= 0 || totalSize > MaxSizeFor(subdir) {
		return nil, fmt.Errorf("文件类型或大小不合法")
	}
	filename = filepath.Base(filename)
	ext := strings.ToLower(filepath.Ext(filename))
	if !extensionAllowed(ext, subdir) {
		return nil, fmt.Errorf("不支持的文件格式")
	}
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return nil, err
	}
	chunkSize := ChunkSizeBytes()
	meta := &ChunkMetadata{
		UploadID: hex.EncodeToString(buf), Filename: filename, Extension: ext, Subdir: subdir,
		TotalSize: totalSize, ChunkSize: chunkSize,
		ChunkCount: int((totalSize + chunkSize - 1) / chunkSize), OwnerID: ownerID, CreatedAt: time.Now().UTC(),
	}
	dir, err := safeChunkDir(meta.UploadID)
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(dir, 0750); err != nil {
		return nil, err
	}
	if err := writeMetadata(meta); err != nil {
		_ = os.RemoveAll(dir)
		return nil, err
	}
	return meta, nil
}

func ResumeChunkUpload(uploadID, filename, subdir string, totalSize int64, ownerID uint) (*ChunkMetadata, error) {
	meta, err := readMetadata(uploadID)
	if err != nil {
		return nil, err
	}
	if meta.OwnerID != ownerID || meta.Filename != filepath.Base(filename) || meta.Subdir != subdir || meta.TotalSize != totalSize {
		return nil, fmt.Errorf("续传信息不匹配")
	}
	if time.Since(meta.CreatedAt) > 24*time.Hour {
		return nil, fmt.Errorf("续传已过期，请重新上传")
	}
	return meta, nil
}

func SaveChunk(uploadID string, index int, chunkFile *multipart.FileHeader, ownerID uint) error {
	meta, err := readMetadata(uploadID)
	if err != nil {
		return err
	}
	if meta.OwnerID != ownerID || index < 0 || index >= meta.ChunkCount {
		return fmt.Errorf("分片参数不合法")
	}
	expected := meta.ChunkSize
	if index == meta.ChunkCount-1 {
		expected = meta.TotalSize - int64(index)*meta.ChunkSize
	}
	if chunkFile.Size != expected {
		return fmt.Errorf("分片大小不匹配")
	}
	dir, _ := safeChunkDir(uploadID)
	dst := filepath.Join(dir, fmt.Sprintf("chunk_%06d", index))
	return saveMultipartFileExact(dst, chunkFile, expected)
}

func UploadedChunks(uploadID string, ownerID uint) ([]int, error) {
	meta, err := readMetadata(uploadID)
	if err != nil {
		return nil, err
	}
	if meta.OwnerID != ownerID {
		return nil, fmt.Errorf("无权访问该上传任务")
	}
	dir, _ := safeChunkDir(uploadID)
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	var indexes []int
	for _, entry := range entries {
		if !entry.Type().IsRegular() || !strings.HasPrefix(entry.Name(), "chunk_") {
			continue
		}
		index, parseErr := strconv.Atoi(strings.TrimPrefix(entry.Name(), "chunk_"))
		if parseErr == nil && index >= 0 && index < meta.ChunkCount {
			indexes = append(indexes, index)
		}
	}
	sort.Ints(indexes)
	return indexes, nil
}

func CompleteChunk(uploadID string, ownerID uint) (url string, err error) {
	meta, err := readMetadata(uploadID)
	if err != nil {
		return "", err
	}
	if meta.OwnerID != ownerID {
		return "", fmt.Errorf("无权访问该上传任务")
	}
	indexes, err := UploadedChunks(uploadID, ownerID)
	if err != nil || len(indexes) != meta.ChunkCount {
		return "", fmt.Errorf("分片不完整")
	}
	for index, actual := range indexes {
		if index != actual {
			return "", fmt.Errorf("分片序号不连续")
		}
	}
	finalName, err := randomName(meta.Extension)
	if err != nil {
		return "", err
	}
	finalDir := filepath.Join(config.App.Storage.UploadDir, meta.Subdir)
	if err := os.MkdirAll(finalDir, 0750); err != nil {
		return "", err
	}
	localPath := filepath.Join(finalDir, finalName)
	merged, err := os.OpenFile(localPath, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0640)
	if err != nil {
		return "", err
	}
	defer func() {
		_ = merged.Close()
		if err != nil {
			_ = os.Remove(localPath)
		}
	}()
	dir, _ := safeChunkDir(uploadID)
	var total int64
	for index := 0; index < meta.ChunkCount; index++ {
		partPath := filepath.Join(dir, fmt.Sprintf("chunk_%06d", index))
		part, openErr := os.Open(partPath)
		if openErr != nil {
			return "", openErr
		}
		copied, copyErr := io.Copy(merged, io.LimitReader(part, meta.ChunkSize+1))
		_ = part.Close()
		if copyErr != nil {
			return "", copyErr
		}
		total += copied
		if total > meta.TotalSize {
			return "", fmt.Errorf("合并文件超过声明大小")
		}
	}
	if total != meta.TotalSize {
		return "", fmt.Errorf("合并文件大小不匹配")
	}
	if err = merged.Close(); err != nil {
		return "", err
	}
	if err = ValidateFile(localPath, meta.Subdir, meta.Extension); err != nil {
		return "", err
	}
	url, err = StoreFinal(localPath, finalName, meta.Subdir)
	if err != nil {
		return "", err
	}
	_ = os.RemoveAll(dir)
	return url, nil
}

func ChunkSizeBytes() int64 {
	mb := config.App.Storage.ChunkSize
	if mb <= 0 {
		mb = 8
	}
	return mb * 1024 * 1024
}

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

func CleanupExpiredChunks(maxAge time.Duration) error {
	root := filepath.Join(config.App.Storage.UploadDir, "tmp")
	entries, err := os.ReadDir(root)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return err
	}
	for _, entry := range entries {
		if !entry.IsDir() || !uploadIDPattern.MatchString(entry.Name()) {
			continue
		}
		info, statErr := entry.Info()
		if statErr == nil && time.Since(info.ModTime()) > maxAge {
			dir, _ := safeChunkDir(entry.Name())
			_ = os.RemoveAll(dir)
		}
	}
	return nil
}

func safeChunkDir(uploadID string) (string, error) {
	if !uploadIDPattern.MatchString(uploadID) {
		return "", fmt.Errorf("upload_id 不合法")
	}
	return filepath.Join(config.App.Storage.UploadDir, "tmp", uploadID), nil
}

func readMetadata(uploadID string) (*ChunkMetadata, error) {
	dir, err := safeChunkDir(uploadID)
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(filepath.Join(dir, chunkMetadataFile))
	if err != nil {
		return nil, fmt.Errorf("上传任务不存在或已过期")
	}
	var meta ChunkMetadata
	if err := json.Unmarshal(data, &meta); err != nil || meta.UploadID != uploadID {
		return nil, fmt.Errorf("上传任务元数据损坏")
	}
	return &meta, nil
}

func writeMetadata(meta *ChunkMetadata) error {
	dir, err := safeChunkDir(meta.UploadID)
	if err != nil {
		return err
	}
	data, err := json.Marshal(meta)
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(dir, chunkMetadataFile), data, 0600)
}

func saveMultipartFileExact(dst string, header *multipart.FileHeader, expected int64) (err error) {
	src, err := header.Open()
	if err != nil {
		return err
	}
	defer src.Close()
	tmp := dst + ".part"
	out, err := os.OpenFile(tmp, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0600)
	if err != nil {
		return err
	}
	defer func() {
		_ = out.Close()
		if err != nil {
			_ = os.Remove(tmp)
		}
	}()
	written, err := io.Copy(out, io.LimitReader(src, expected+1))
	if err != nil {
		return err
	}
	if written != expected {
		return fmt.Errorf("分片实际大小不匹配")
	}
	if err = out.Close(); err != nil {
		return err
	}
	return os.Rename(tmp, dst)
}
