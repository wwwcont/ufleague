package repository

import "testing"

func TestActionRouteCommentDeepLink(t *testing.T) {
	route := actionRoute("comment", "55", map[string]any{"entity_type": "team", "entity_id": float64(7)})
	if route != "/comments/team/7#comment-55" {
		t.Fatalf("unexpected route: %s", route)
	}
}

func TestActionRouteFallback(t *testing.T) {
	if route := actionRoute("unknown", "1", map[string]any{}); route != "/" {
		t.Fatalf("unexpected route: %s", route)
	}
}
