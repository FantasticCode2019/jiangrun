package models

import (
	"time"

	"gorm.io/gorm"
)

type News struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Title       string         `json:"title" gorm:"size:200;not null"`
	Slug        string         `json:"slug" gorm:"size:200;uniqueIndex"`
	CoverImage  string         `json:"cover_image" gorm:"size:500"`
	Summary     string         `json:"summary" gorm:"size:500"`
	Content     string         `json:"content" gorm:"type:text"`
	CategoryID  *uint          `json:"category_id"`
	ViewCount   int            `json:"view_count" gorm:"default:0"`
	Status      int            `json:"status" gorm:"default:1"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`

	// 关联
	Category *Category `json:"category,omitempty" gorm:"foreignKey:CategoryID"`
}
