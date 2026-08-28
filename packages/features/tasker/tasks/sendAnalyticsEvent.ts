/**
 * Temporary upgrade compatibility for persisted pre-Phase-3 `sendAnalyticsEvent` tasks.
 * Phase 3 removed analytics integrations; this handler drains legacy queue rows as a no-op.
 * Do not add new producers for this task type.
 */
export async function sendAnalyticsEvent(_payload: string): Promise<void> {
  return;
}
