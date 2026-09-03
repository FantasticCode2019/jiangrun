package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// RateLimiter 基于内存的固定窗口限流器
type RateLimiter struct {
	mu       sync.Mutex
	limit    int
	window   time.Duration
	requests map[string]rateWindow
}

type rateWindow struct {
	startedAt time.Time
	count     int
}

const maxRateLimitKeys = 10000

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		limit:    limit,
		window:   window,
		requests: make(map[string]rateWindow),
	}
}

// Allow 判断 key 是否放行，并记录本次请求
func (rl *RateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	entry, exists := rl.requests[key]
	if exists && now.Sub(entry.startedAt) < rl.window {
		if entry.count >= rl.limit {
			return false
		}
		entry.count++
		rl.requests[key] = entry
		return true
	}

	// 攻击者可能不断伪造新 key。先回收过期窗口；容量仍满时拒绝新 key，
	// 避免限流器自身成为内存耗尽入口。
	if !exists && len(rl.requests) >= maxRateLimitKeys {
		rl.gc(now)
		if len(rl.requests) >= maxRateLimitKeys {
			return false
		}
	}

	rl.requests[key] = rateWindow{startedAt: now, count: 1}
	return true
}

func (rl *RateLimiter) gc(now time.Time) {
	for key, entry := range rl.requests {
		if now.Sub(entry.startedAt) >= rl.window {
			delete(rl.requests, key)
		}
	}
}

// RateLimit 返回基于 IP 的限流中间件
func RateLimit(limiter *RateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		if !limiter.Allow(c.ClientIP()) {
			c.JSON(http.StatusTooManyRequests, gin.H{"code": 429, "message": "请求过于频繁，请稍后再试"})
			c.Abort()
			return
		}
		c.Next()
	}
}
