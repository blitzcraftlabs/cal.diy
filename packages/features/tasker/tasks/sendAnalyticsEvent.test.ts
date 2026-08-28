import { describe, expect, it, vi } from "vitest";

import { sendAnalyticsEvent } from "./sendAnalyticsEvent";
import tasksMap from "./index";

const legacyPayload = JSON.stringify({
  credentialId: 1,
  info: {
    name: "Legacy Lead",
    email: "legacy@example.com",
    id: "booking-uid",
    eventName: "lead.created",
    externalId: "ext-1",
  },
});

describe("sendAnalyticsEvent legacy tombstone", () => {
  it("should resolve successfully without calling deleted analytics integrations", async () => {
    await expect(sendAnalyticsEvent(legacyPayload)).resolves.toBeUndefined();
    await expect(sendAnalyticsEvent("malformed-but-ignored")).resolves.toBeUndefined();
  });

  it("should be registered in the task handler map", async () => {
    const handler = await tasksMap.sendAnalyticsEvent();
    expect(handler).toBe(sendAnalyticsEvent);
  });
});

describe("TaskProcessor legacy sendAnalyticsEvent drain", () => {
  it("should mark a persisted sendAnalyticsEvent task as succeeded instead of failing permanently", async () => {
    const succeed = vi.fn().mockResolvedValue(undefined);
    const retry = vi.fn().mockResolvedValue(undefined);

    vi.doMock("../repository", () => ({
      Task: {
        getNextBatch: vi.fn().mockResolvedValue([
          {
            id: "legacy-task-1",
            type: "sendAnalyticsEvent",
            payload: legacyPayload,
            attempts: 0,
            maxAttempts: 3,
            lastFailedAttemptAt: null,
          },
        ]),
        succeed,
        retry,
      },
    }));

    const { TaskProcessor: Processor } = await import("../task-processor");
    const processor = new Processor();
    await processor.processQueue();

    expect(succeed).toHaveBeenCalledWith("legacy-task-1");
    expect(retry).not.toHaveBeenCalled();
  });
});
