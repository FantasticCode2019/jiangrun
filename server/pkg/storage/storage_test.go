package storage

import (
	"os"
	"path/filepath"
	"testing"

	"jiangrun-server/config"
)

func TestChunkUploadRejectsTraversalAndMismatchedResume(t *testing.T) {
	config.App.Storage.UploadDir = t.TempDir()
	config.App.Storage.MaxImageSize = 10
	config.App.Storage.ChunkSize = 1

	if _, err := safeChunkDir("../../etc"); err == nil {
		t.Fatal("path traversal upload ID should be rejected")
	}
	meta, err := InitChunkUpload("garden.jpg", "images", 1024, 7)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := ResumeChunkUpload(meta.UploadID, "other.jpg", "images", 1024, 7); err == nil {
		t.Fatal("resume with different metadata should fail")
	}
	if _, err := ResumeChunkUpload(meta.UploadID, "garden.jpg", "images", 1024, 8); err == nil {
		t.Fatal("resume by a different user should fail")
	}
}

func TestValidateFileChecksMagicBytes(t *testing.T) {
	dir := t.TempDir()
	fake := filepath.Join(dir, "fake.jpg")
	if err := os.WriteFile(fake, []byte("not an image"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := ValidateFile(fake, "images", ".jpg"); err == nil {
		t.Fatal("fake JPEG should be rejected")
	}

	png := filepath.Join(dir, "real.png")
	data := []byte{0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0x49, 0x48, 0x44, 0x52}
	if err := os.WriteFile(png, data, 0600); err != nil {
		t.Fatal(err)
	}
	if err := ValidateFile(png, "images", ".png"); err != nil {
		t.Fatalf("PNG signature should be accepted: %v", err)
	}
}
