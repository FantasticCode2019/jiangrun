package models

import (
	"time"

	"gorm.io/gorm"
)

type Category struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	Name        string         `json:"name" gorm:"size:100;not null"`
	NameEn      string         `json:"name_en" gorm:"size:100"`
	Slug        string         `json:"slug" gorm:"size:100;not null"`
	Subtitle    string         `json:"subtitle" gorm:"size:300"`
	Description string         `json:"description" gorm:"type:text"`
	ParentID    *uint          `json:"parent_id"`
	SortOrder   int            `json:"sort_order" gorm:"default:0"`
	Status      int            `json:"status" gorm:"default:1"`
	Type        string         `json:"type" gorm:"size:20;not null"` // case, video, news, service
	CreatedAt   time.Time      `json:"created_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`

	// 关联
	Parent   *Category  `json:"parent,omitempty" gorm:"foreignKey:ParentID"`
	Children []Category `json:"children,omitempty" gorm:"foreignKey:ParentID"`
}
