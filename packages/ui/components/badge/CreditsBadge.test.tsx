/* eslint-disable playwright/missing-playwright-await */
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { vi } from "vitest";

import { CreditsBadge } from "./CreditsBadge";

vi.mock("@calcom/lib/hooks/useLocale", () => ({
  useLocale: () => ({
    t: (key: string) => key,
  }),
}));

const renderCreditsBadge = (props: ComponentProps<typeof CreditsBadge>) =>
  render(
    <TooltipProvider>
      <CreditsBadge {...props} />
    </TooltipProvider>
  );

describe("CreditsBadge", () => {
  test("links to team billing when teamId is provided for a non-organization team", () => {
    renderCreditsBadge({ teamId: 42, isOrganization: false });

    const link = screen.getByRole("link", { name: "requires_credits" });
    expect(link).toHaveAttribute("href", "/settings/teams/42/billing");
  });

  test("does not link when billing destination is unavailable", () => {
    const { rerender } = renderCreditsBadge({});
    expect(screen.queryByRole("link", { name: "requires_credits" })).not.toBeInTheDocument();
    expect(screen.getByText("requires_credits")).toBeInTheDocument();

    rerender(
      <TooltipProvider>
        <CreditsBadge teamId={42} isOrganization />
      </TooltipProvider>
    );
    expect(screen.queryByRole("link", { name: "requires_credits" })).not.toBeInTheDocument();
    expect(screen.getByText("requires_credits")).toBeInTheDocument();
  });
});
