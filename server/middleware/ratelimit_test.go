package middleware

import (
	"fmt"
	"testing"
	"time"
)

func TestRateLimiterEnforcesWindowLimit(t *testing.T) {
	limiter := NewRateLimiter(2, time.Minute)
	if !limiter.Allow("client") || !limiter.Allow("client") {
		t.Fatal("requests within the configured limit should be allowed")
	}
	if limiter.Allow("client") {
		t.Fatal("request above the configured limit should be rejected")
	}
}

func TestRateLimiterBoundsDistinctKeys(t *testing.T) {
	limiter := NewRateLimiter(1, time.Hour)
	for index := 0; index < maxRateLimitKeys; index++ {
		if !limiter.Allow(fmt.Sprintf("client-%d", index)) {
			t.Fatalf("key %d should fit within the limiter capacity", index)
		}
	}
	if limiter.Allow("one-key-too-many") {
		t.Fatal("a new key must be rejected when the bounded map is full")
	}
	if got := len(limiter.requests); got != maxRateLimitKeys {
		t.Fatalf("limiter map grew beyond its cap: got %d", got)
	}
}
