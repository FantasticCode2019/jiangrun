package models

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"gorm.io/gorm"
)

var slugRe = regexp.MustCompile(`[^a-z0-9]+`)

// Slugify 将字符串转换为 URL slug（保留小写字母、数字，其余转为连字符）
func Slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = slugRe.ReplaceAllString(s, "-")
	return strings.Trim(s, "-")
}

// GenerateUniqueSlug 生成唯一 slug。
// base 为空时使用 prefix + 时间戳；与现有记录冲突时追加序号。
// excludeID 用于更新场景排除自身记录（创建时传 0）。
func GenerateUniqueSlug(db *gorm.DB, base, prefix string, model interface{}, excludeID uint) string {
	slug := Slugify(base)
	if slug == "" {
		slug = fmt.Sprintf("%s-%d", prefix, time.Now().UnixNano())
	}

	candidate := slug
	for i := 2; ; i++ {
		var count int64
		if err := db.Model(model).Where("slug = ? AND id <> ?", candidate, excludeID).Count(&count).Error; err != nil {
			return candidate
		}
		if count == 0 {
			return candidate
		}
		candidate = fmt.Sprintf("%s-%d", slug, i)
	}
}
