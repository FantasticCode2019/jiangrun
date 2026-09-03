package handlers

import (
	"fmt"
	"net/url"
	"strings"

	"jiangrun-server/models"

	"github.com/microcosm-cc/bluemonday"
)

var richTextPolicy = bluemonday.UGCPolicy()

func sanitizeRichText(value string) string {
	return strings.TrimSpace(richTextPolicy.Sanitize(value))
}

func validatePublicURL(value string, allowEmpty bool) error {
	value = strings.TrimSpace(value)
	if value == "" && allowEmpty {
		return nil
	}
	if len(value) > 500 {
		return fmt.Errorf("URL 过长")
	}
	parsed, err := url.Parse(value)
	if err != nil || parsed.User != nil || strings.ContainsAny(value, "\r\n\x00") {
		return fmt.Errorf("URL 不合法")
	}
	if parsed.IsAbs() {
		if parsed.Scheme != "https" || parsed.Host == "" {
			return fmt.Errorf("外部 URL 必须使用 HTTPS")
		}
		return nil
	}
	if parsed.Host != "" || !strings.HasPrefix(parsed.Path, "/") || strings.HasPrefix(value, "//") || strings.Contains(parsed.Path, "..") {
		return fmt.Errorf("站内 URL 不合法")
	}
	return nil
}

func sanitizeCaseBlocks(blocks []models.CaseBlock) ([]models.CaseBlock, error) {
	if len(blocks) > 200 {
		return nil, fmt.Errorf("内容块不能超过 200 个")
	}
	for index := range blocks {
		block := &blocks[index]
		block.Caption = strings.TrimSpace(block.Caption)
		if len([]rune(block.Caption)) > 500 {
			return nil, fmt.Errorf("第 %d 个内容块的说明过长", index+1)
		}
		switch block.Type {
		case "text":
			if len(block.Text) > 100000 {
				return nil, fmt.Errorf("第 %d 个文字块过长", index+1)
			}
			block.Text = sanitizeRichText(block.Text)
			block.Src = ""
			if block.Align != "" && block.Align != "left" && block.Align != "center" {
				return nil, fmt.Errorf("第 %d 个文字块对齐方式不合法", index+1)
			}
		case "image", "video":
			if err := validatePublicURL(block.Src, false); err != nil {
				return nil, fmt.Errorf("第 %d 个媒体地址不合法: %v", index+1, err)
			}
			block.Text = ""
		default:
			return nil, fmt.Errorf("第 %d 个内容块类型不合法", index+1)
		}
	}
	return blocks, nil
}

func validPublishStatus(status int) bool { return status == 0 || status == 1 }

func validateCategoryType(categoryID *uint, expectedType string) error {
	if categoryID == nil {
		return nil
	}
	var category models.Category
	if err := models.DB.Select("id", "type").First(&category, *categoryID).Error; err != nil {
		return fmt.Errorf("所选分类不存在")
	}
	if category.Type != expectedType {
		return fmt.Errorf("所选分类类型不匹配")
	}
	return nil
}
