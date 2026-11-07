import { business } from "@/config/business";
import { ContentProtectionIsland } from "./content-protection.client";

// Mounted once in the root layout. The tdm-reservation meta (EU text-and-data-mining opt-out, plan §11.10
// layer 2) is hoisted into <head> by React; /.well-known/tdmrep.json carries the same reservation.
export function ContentProtection() {
  return (
    <>
      <meta name="tdm-reservation" content="1" />
      <ContentProtectionIsland brand={business.BRAND} />
    </>
  );
}
