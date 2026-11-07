import { describe, expect, it } from "vitest";
import { formatMoney, planForProduct, priceTierFor, productIdFor } from "./plans";

const env = { DODO_PRODUCT_PRO_MONTHLY: "pdt_m", DODO_PRODUCT_PRO_YEARLY: "pdt_y" };

describe("plans", () => {
  it("maps plans to provider products and back", () => {
    expect(productIdFor("pro_monthly", env)).toBe("pdt_m");
    expect(productIdFor("pro_yearly", env)).toBe("pdt_y");
    expect(planForProduct("pdt_y", env)).toBe("pro_yearly");
    expect(planForProduct("pdt_m", env)).toBe("pro_monthly");
    expect(planForProduct("pdt_other", env)).toBeNull();
    expect(planForProduct(null, env)).toBeNull();
  });

  it("assigns the regional price tier by billing country", () => {
    expect(priceTierFor("US")).toBe("A");
    expect(priceTierFor("PL")).toBe("B");
    expect(priceTierFor("IN")).toBe("C");
    expect(priceTierFor(null)).toBeNull();
  });

  it("formats minor units in the paid currency", () => {
    expect(formatMoney(900, "USD")).toBe("$9.00");
    expect(formatMoney(299900, "INR")).toBe("₹2,999.00");
    expect(formatMoney(1500, "JPY")).toBe("¥1,500");
  });
});
