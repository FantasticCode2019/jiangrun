package models

import (
	"time"

	"gorm.io/gorm"
)

type Banner struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	Title     string         `json:"title" gorm:"size:200"`
	ImageURL  string         `json:"image_url" gorm:"size:500;not null"`
	LinkURL   string         `json:"link_url" gorm:"size:500"`
	Position  string         `json:"position" gorm:"size:50;default:home"` // home, case, video
	SortOrder int            `json:"sort_order" gorm:"default:0"`
	Status    int            `json:"status" gorm:"default:1"`
	CreatedAt time.Time      `json:"created_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}
