import Link from "next/link";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Tooltip } from "../tooltip";
import { Badge } from "./Badge";

export const CreditsBadge = function CreditsBadge({
  teamId,
  isOrganization = false,
}: {
  teamId?: number;
  isOrganization?: boolean;
}) {
  const { t } = useLocale();

  const billingPath = teamId && !isOrganization ? `/settings/teams/${teamId}/billing` : null;

  const badge = (
    <Badge variant="gray" className="whitespace-nowrap">
      {t("requires_credits")}
    </Badge>
  );

  return (
    <Tooltip content={t("requires_credits_tooltip")}>
      {billingPath ? <Link href={billingPath}>{badge}</Link> : badge}
    </Tooltip>
  );
};
