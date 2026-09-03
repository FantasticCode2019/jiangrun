package models

import (
	"time"

	"gorm.io/gorm"
)

type Setting struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	Key       string         `json:"key" gorm:"uniqueIndex;size:100;not null"`
	Value     string         `json:"value" gorm:"type:text"`
	GroupName string         `json:"group_name" gorm:"size:50"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

// Contact 联系留言
type Contact struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name" gorm:"size:50;not null"`
	Phone     string    `json:"phone" gorm:"size:20"`
	Email     string    `json:"email" gorm:"size:100"`
	Content   string    `json:"content" gorm:"type:text;not null"`
	IsRead    bool      `json:"is_read" gorm:"default:false"`
	CreatedAt time.Time `json:"created_at"`
}
