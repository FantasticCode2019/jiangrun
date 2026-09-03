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
	requests map[string][]time.Time
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		limit:    limit,
		window:   window,
		requests: make(map[string][]time.Time),
	}
}

// Allow 判断 key 是否放行，并记录本次请求
func (rl *RateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-rl.window)

	times := rl.requests[key]
	kept := 0
	for _, t := range times {
		if t.After(cutoff) {
			times[kept] = t
			kept++
		}
	}
	times = times[:kept]

	if kept >= rl.limit {
		rl.requests[key] = times
		return false
	}

	rl.requests[key] = append(times, now)

	// 防止 map 无限增长
	if len(rl.requests) > 10000 {
		rl.gc(cutoff)
	}

	return true
}

func (rl *RateLimiter) gc(cutoff time.Time) {
	for k, times := range rl.requests {
		kept := 0
		for _, t := range times {
			if t.After(cutoff) {
				times[kept] = t
				kept++
			}
		}
		if kept == 0 {
			delete(rl.requests, k)
		} else {
			rl.requests[k] = times[:kept]
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
