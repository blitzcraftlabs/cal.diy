import { render, screen, cleanup } from "@testing-library/react";
import { vi } from "vitest";

import BookingPageTagManager, { handleEvent } from "./BookingPageTagManager";
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

// NOTE:  We don't intentionally mock appStoreMetadata as that also tests config.json and generated files for us for no cost. If it becomes a pain in future, we could just start mocking it.

vi.mock("next/script", () => {
  return {
    default: ({ ...props }) => {
      return <div {...props} />;
    },
  };
});

const windowProps: string[] = [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setOnWindow(prop: any, value: any) {
  window[prop] = value;
  windowProps.push(prop);
}

afterEach(() => {
  windowProps.forEach((prop) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    delete window[prop];
  });
  windowProps.splice(0);
  cleanup();
});

describe("BookingPageTagManager", () => {
  it("should not include removed analytics integrations in app store metadata", () => {
    for (const slug of REMOVED_ANALYTICS_APPS) {
      expect(appStoreMetadata).not.toHaveProperty(slug);
    }
  });

  it("should not inject analytics scripts when event type has no analytics apps configured", () => {
    render(
      <BookingPageTagManager
        eventType={{
          metadata: {
            apps: {},
          },
          price: 0,
          currency: "USD",
        }}
      />
    );
    const scripts = screen.queryAllByTestId(/^cal-analytics-app-/);
    expect(scripts.length).toBe(0);
  });

  it("should not add scripts for an app that doesnt have tag defined(i.e. non-analytics app)", () => {
    render(
      <BookingPageTagManager
        eventType={{
          metadata: {
            apps: {
              zoomvideo: {
                enabled: true,
              },
            },
          },
          price: 0,
          currency: "USD",
        }}
      />
    );
    const scripts = screen.queryAllByTestId("cal-analytics-app-zoomvideo");
    expect(scripts.length).toBe(0);
  });

  it("should not crash for stale analytics app config after integration removal", () => {
    render(
      <BookingPageTagManager
        eventType={{
          metadata: {
            apps: {
              //@ts-expect-error Testing stale removed analytics app config
              gtm: {
                enabled: true,
                trackingId: "GTM-123",
              },
            },
          },
          price: 0,
          currency: "USD",
        }}
      />
    );
    const scripts = screen.queryAllByTestId("cal-analytics-app-gtm");
    expect(scripts.length).toBe(0);
  });

  it("should not crash for an app that doesnt exist", () => {
    render(
      <BookingPageTagManager
        eventType={{
          metadata: {
            apps: {
              //@ts-expect-error Testing for non-existent app
              nonexistentapp: {
                enabled: true,
              },
            },
          },
          price: 0,
          currency: "USD",
        }}
      />
    );
    const scripts = screen.queryAllByTestId("cal-analytics-app-zoomvideo");
    expect(scripts.length).toBe(0);
  });
});

describe("handleEvent", () => {
  it("should not push internal events to analytics apps", () => {
    expect(
      handleEvent({
        detail: {
          // Internal event
          type: "__abc",
        },
      })
    ).toBe(false);

    expect(
      handleEvent({
        detail: {
          // Not an internal event
          type: "_abc",
        },
      })
    ).toBe(true);
  });

  it("should call the function on window with the event name and data", () => {
    const pushEventXyz = vi.fn();
    const pushEventAnything = vi.fn();
    const pushEventRandom = vi.fn();
    const pushEventNotme = vi.fn();

    setOnWindow("cal_analytics_app__xyz", pushEventXyz);
    setOnWindow("cal_analytics_app__anything", pushEventAnything);
    setOnWindow("cal_analytics_app_random", pushEventRandom);
    setOnWindow("cal_analytics_notme", pushEventNotme);

    handleEvent({
      detail: {
        type: "abc",
        key: "value",
      },
    });

    expect(pushEventXyz).toHaveBeenCalledWith({
      name: "abc",
      data: {
        key: "value",
      },
    });

    expect(pushEventAnything).toHaveBeenCalledWith({
      name: "abc",
      data: {
        key: "value",
      },
    });

    expect(pushEventRandom).toHaveBeenCalledWith({
      name: "abc",
      data: {
        key: "value",
      },
    });

    expect(pushEventNotme).not.toHaveBeenCalled();
  });

  it("should not error if accidentally the value is not a function", () => {
    const pushEventNotAfunction = "abc";
    const pushEventAnything = vi.fn();
    setOnWindow("cal_analytics_app__notafun", pushEventNotAfunction);
    setOnWindow("cal_analytics_app__anything", pushEventAnything);

    handleEvent({
      detail: {
        type: "abc",
        key: "value",
      },
    });

    // No error for cal_analytics_app__notafun and pushEventAnything is called
    expect(pushEventAnything).toHaveBeenCalledWith({
      name: "abc",
      data: {
        key: "value",
      },
    });
  });
});
