package db

import (
	"fmt"

	"github.com/glebarez/sqlite"
	"github.com/tabularasa/gomailproxy/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Open(dsn string) (*gorm.DB, error) {
	gdb, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	if err := gdb.AutoMigrate(&models.MailAccount{}); err != nil {
		return nil, fmt.Errorf("automigrate: %w", err)
	}
	return gdb, nil
}
