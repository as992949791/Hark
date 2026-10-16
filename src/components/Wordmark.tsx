import Link from "next/link";
import { AudioLines } from "lucide-react";
import { PRODUCT_NAME } from "@/lib/brand";
import { AnyapiLink } from "./AnyapiLink";

type WordmarkProps = { homeHref?: string };

/**
 * "[mark] <Product> by [mark] AnyAPI" - the only place the product is named in chrome.
 * The product half goes home and the AnyAPI half goes out, as two links side by
 * side, because one link cannot hold another.
 */
export function Wordmark({ homeHref }: WordmarkProps) {
  return (
    <span className="wordmark flex items-center gap-1.5 text-fg" style={{ fontWeight: 500 }}>
      {homeHref ? (
        <Link href={homeHref} aria-label={`${PRODUCT_NAME} home`} className="flex items-center gap-1.5">
          <AudioLines aria-hidden="true" className="hark-mark size-6 shrink-0 text-primary" />
          {PRODUCT_NAME}
        </Link>
      ) : (
        <>
          <AudioLines aria-hidden="true" className="hark-mark size-6 shrink-0 text-primary" />
          {PRODUCT_NAME}
        </>
      )}
      <span className="text-fg-muted">by</span>
      <AnyapiLink />
    </span>
  );
}
