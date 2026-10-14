// Native sync quotas. Layout/UI limits are derived from this single definition;
// per-item enforcement still applies even when the banner measures total usage.
export const SYNC_STORAGE_LIMITS = {
  totalBytes: 102_400,
  perItemBytes: 8_192,
  maxItems: 512,
} as const
