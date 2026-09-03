package models

import (
	"time"

	"gorm.io/gorm"
)

type Case struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Title       string         `json:"title" gorm:"size:200;not null"`
	Slug        string         `json:"slug" gorm:"size:200;uniqueIndex"`
	CoverImage  string         `json:"cover_image" gorm:"size:500"` // 保留：由 blocks 首图自动生成，供列表/封面用
	Blocks      JSON           `json:"blocks" gorm:"type:jsonb"`    // 内容块数组：[{type,src?,caption?,text?}]
	Images      JSON           `json:"images" gorm:"type:jsonb"`    // 兼容旧数据，[]
	Description string         `json:"description" gorm:"type:text"`
	Content     string         `json:"content" gorm:"type:text"`
	CategoryID  *uint          `json:"category_id"`
	Style       string         `json:"style" gorm:"size:50"` // modern, chinese, japanese, european
	Location    string         `json:"location" gorm:"size:200"`
	Area        string         `json:"area" gorm:"size:50"`
	IsFeatured  bool           `json:"is_featured" gorm:"default:false"`
	SortOrder   int            `json:"sort_order" gorm:"default:0"`
	Status      int            `json:"status" gorm:"default:1"` // 1=发布, 0=草稿
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`

	// 关联
	Category *Category `json:"category,omitempty" gorm:"foreignKey:CategoryID"`
}

// CaseBlock 案例内容块：type 为 image|video|text
// image: src=图片url, caption?=可选说明
// video: src=视频url, caption?=可选说明
// text : text=段落文字, 可选 align=left|center
type CaseBlock struct {
	Type    string `json:"type"`              // image | video | text
	Src     string `json:"src,omitempty"`     // 图片或视频地址
	Caption string `json:"caption,omitempty"` // 图/视频说明
	Text    string `json:"text,omitempty"`    // 文字内容
	Align   string `json:"align,omitempty"`   // left | center
}

// FirstImageCover 取 blocks 中第一张图片作为列表封面
func FirstImageCover(blocks []CaseBlock) string {
	for _, b := range blocks {
		if b.Type == "image" && b.Src != "" {
			return b.Src
		}
	}
	return ""
}
