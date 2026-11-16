import { describe, expect, it } from "vitest";
import { businessBrainBody } from "./schema.js";

const validInput = {
  expectedRevision: null,
  business_name: "Swapno Boutique",
  website: "https://example.test",
  products_services: ["Handmade clothing"],
};

describe("Business Brain API validation", () => {
  it("applies Bangladesh-friendly defaults and accepts valid profile data", () => {
    const parsed = businessBrainBody.parse(validInput);
    expect(parsed.market_country).toBe("BD");
    expect(parsed.currency).toBe("BDT");
    expect(parsed.timezone).toBe("Asia/Dhaka");
    expect(parsed.default_language).toBe("bn");
    expect(parsed.source_kind).toBe("manual_entry");
  });

  it("rejects non-HTTP source URLs and unexpected fields", () => {
    expect(businessBrainBody.safeParse({ ...validInput, source_url: "javascript:alert(1)" }).success).toBe(false);
    expect(businessBrainBody.safeParse({ ...validInput, isOwner: true }).success).toBe(false);
  });
});
