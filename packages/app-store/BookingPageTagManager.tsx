import { sdkActionManager } from "@calcom/lib/sdk-event";

export function handleEvent(event: { detail: Record<string, unknown> & { type: string } }) {
  const { type: name, ...data } = event.detail;
  // Don't forward internal events — they are for embed internals only.
  if (name.startsWith("__")) {
    return false;
  }

  // Support sending all events to opener, used by ReroutingDialog to detect successful reschedules.
  if (window.opener) {
    window.opener.postMessage(
      {
        type: `CAL:${name}`,
        ...data,
      },
      "*"
    );
  }
  return true;
}

export default function BookingPageTagManager() {
  return null;
}

if (typeof window !== "undefined") {
  sdkActionManager?.on("*", handleEvent);
}
