package handlers

import (
	"strings"
	"testing"

	"jiangrun-server/models"
)

func TestSanitizeRichTextRemovesExecutableContent(t *testing.T) {
	input := `<p>安全内容</p><script>alert(1)</script><img src=x onerror=alert(2)>`
	output := sanitizeRichText(input)
	if strings.Contains(output, "script") || strings.Contains(output, "onerror") {
		t.Fatalf("executable HTML was not removed: %s", output)
	}
	if !strings.Contains(output, "安全内容") {
		t.Fatalf("safe content was unexpectedly removed: %s", output)
	}
}

func TestValidatePublicURL(t *testing.T) {
	valid := []string{"/uploads/images/a.jpg", "/cases/1", "https://cdn.example.com/a.jpg"}
	for _, value := range valid {
		if err := validatePublicURL(value, false); err != nil {
			t.Errorf("expected valid URL %q: %v", value, err)
		}
	}
	invalid := []string{"javascript:alert(1)", "http://example.com/a.jpg", "//evil.example/a", "/uploads/../secret"}
	for _, value := range invalid {
		if err := validatePublicURL(value, false); err == nil {
			t.Errorf("expected invalid URL %q", value)
		}
	}
}

func TestSanitizeCaseBlocksValidatesShape(t *testing.T) {
	blocks := []models.CaseBlock{{Type: "text", Text: `<b>文字</b><script>alert(1)</script>`, Align: "center"}}
	cleaned, err := sanitizeCaseBlocks(blocks)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(cleaned[0].Text, "script") {
		t.Fatalf("script survived sanitization: %s", cleaned[0].Text)
	}
	if _, err := sanitizeCaseBlocks([]models.CaseBlock{{Type: "iframe", Src: "/x"}}); err == nil {
		t.Fatal("unsupported block type should be rejected")
	}
}
