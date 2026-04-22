package middleware

import (
	"context"
	"sync"
	"time"
)

type flowTraceContextKey string

const flowTraceKey flowTraceContextKey = "flow_trace"

type FlowStep struct {
	At      time.Time `json:"at"`
	Layer   string    `json:"layer"`
	Method  string    `json:"method"`
	Status  string    `json:"status"`
	Details string    `json:"details"`
}

type flowTrace struct {
	mu    sync.Mutex
	steps []FlowStep
}

func InitFlowTrace(ctx context.Context) context.Context {
	return context.WithValue(ctx, flowTraceKey, &flowTrace{steps: make([]FlowStep, 0, 16)})
}

func AddFlowStep(ctx context.Context, layer, method, status, details string) {
	trace, ok := ctx.Value(flowTraceKey).(*flowTrace)
	if !ok || trace == nil {
		return
	}
	trace.mu.Lock()
	trace.steps = append(trace.steps, FlowStep{
		At:      time.Now().UTC(),
		Layer:   layer,
		Method:  method,
		Status:  status,
		Details: details,
	})
	trace.mu.Unlock()
}

func SnapshotFlowSteps(ctx context.Context) []FlowStep {
	trace, ok := ctx.Value(flowTraceKey).(*flowTrace)
	if !ok || trace == nil {
		return nil
	}
	trace.mu.Lock()
	defer trace.mu.Unlock()
	out := make([]FlowStep, len(trace.steps))
	copy(out, trace.steps)
	return out
}
