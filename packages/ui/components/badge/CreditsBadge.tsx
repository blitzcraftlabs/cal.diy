import Link from "next/link";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Tooltip } from "../tooltip";
import { Badge } from "./Badge";

export const CreditsBadge = function CreditsBadge({
  teamId,
  isOrganization: _isOrganization = false,
}: {
  teamId?: number;
  isOrganization?: boolean;
}) {
  const { t } = useLocale();

  const getBillingPath = () => {
    if (!teamId) return "/settings/my-account/profile";
    return `/settings/teams/${teamId}/billing`;
  };

  return (
    <Tooltip content={t("requires_credits_tooltip")}>
      <Link href={getBillingPath()}>
        <Badge variant="gray" className="whitespace-nowrap">
          {t("requires_credits")}
        </Badge>
      </Link>
    </Tooltip>
  );
};
