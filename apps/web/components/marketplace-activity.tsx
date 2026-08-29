import type { MarketplaceActivityItem } from "@draftpay/shared";
import Link from "next/link";
import { relativeTime } from "@/lib/format";

interface MarketplaceActivityProps {
  items: MarketplaceActivityItem[];
  compact?: boolean;
  label?: string;
}

export function MarketplaceActivity({
  items,
  compact = false,
  label = "Marketplace activity",
}: MarketplaceActivityProps) {
  return (
    <div className={`market-activity${compact ? " market-activity--compact" : ""}`}>
      <div className="market-activity__list" aria-label={label}>
        {items.map((item) => (
          <Link
            className={`market-activity__item market-activity__item--${item.status}`}
            href={`/contests/${item.contestId}`}
            key={item.id}
          >
            <span className="market-activity__signal" aria-hidden="true" />
            <span className="market-activity__body">
              <span className="market-activity__headline">
                <strong>{item.actor}</strong> {item.action}
              </span>
              <span className="market-activity__detail">{item.detail}</span>
            </span>
            <span className="market-activity__aside">
              {item.value && <strong>{item.value}</strong>}
              <time dateTime={item.occurredAt}>{relativeTime(item.occurredAt)}</time>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
