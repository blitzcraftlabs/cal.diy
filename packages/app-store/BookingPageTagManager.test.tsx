import { vi } from "vitest";

import { handleEvent } from "./BookingPageTagManager";
import { appStoreMetadata } from "./apps.metadata.generated";

const REMOVED_ANALYTICS_APPS = [
  "ga4",
  "gtm",
  "fathom",
  "plausible",
  "posthog",
  "metapixel",
  "matomo",
  "umami",
  "databuddy",
  "insihts",
  "twipla",
  "dub",
] as const;

describe("BookingPageTagManager", () => {
  it("should not include removed analytics integrations in app store metadata", () => {
    for (const slug of REMOVED_ANALYTICS_APPS) {
      expect(appStoreMetadata).not.toHaveProperty(slug);
    }
  });
});

describe("handleEvent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "opener", {
      configurable: true,
      value: null,
      writable: true,
    });
  });

  it("should not forward internal SDK events", () => {
    const postMessage = vi.fn();
    Object.defineProperty(window, "opener", {
      configurable: true,
      value: { postMessage },
      writable: true,
    });

    expect(
      handleEvent({
        detail: {
          type: "__abc",
        },
      })
    ).toBe(false);

    expect(postMessage).not.toHaveBeenCalled();
  });

  it("should forward normal SDK events to window.opener", () => {
    const postMessage = vi.fn();
    Object.defineProperty(window, "opener", {
      configurable: true,
      value: { postMessage },
      writable: true,
    });

    expect(
      handleEvent({
        detail: {
          type: "bookingSuccessful",
          uid: "123",
        },
      })
    ).toBe(true);

    expect(postMessage).toHaveBeenCalledWith(
      {
        type: "CAL:bookingSuccessful",
        uid: "123",
      },
      "*"
    );
  });

  it("should not throw when window.opener is absent", () => {
    Object.defineProperty(window, "opener", {
      configurable: true,
      value: null,
      writable: true,
    });

    expect(() =>
      handleEvent({
        detail: {
          type: "bookingSuccessful",
          uid: "123",
        },
      })
    ).not.toThrow();

    expect(
      handleEvent({
        detail: {
          type: "bookingSuccessful",
          uid: "123",
        },
      })
    ).toBe(true);
  });
});
