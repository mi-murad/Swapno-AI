import { z } from "zod";

const httpOrBlank = z.string().trim().max(2048).refine((value) => {
  if (value === "") return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}, "Use a valid http or https URL.");

export const businessBrainBody = z.object({
  expectedRevision: z.number().int().positive().nullable(),
  business_name: z.string().trim().min(1).max(160),
  industry: z.string().trim().max(120).default(""),
  website: httpOrBlank.default(""),
  market_country: z.string().trim().min(2).max(80).default("BD"),
  currency: z.string().trim().length(3).default("BDT"),
  timezone: z.string().trim().min(1).max(80).default("Asia/Dhaka"),
  default_language: z.enum(["en", "bn"]).default("bn"),
  description: z.string().trim().max(4000).default(""),
  target_customer: z.string().trim().max(2000).default(""),
  value_proposition: z.string().trim().max(2000).default(""),
  products_services: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
  brand_voice: z.string().trim().max(2000).default(""),
  source_kind: z.enum(["manual_entry", "external_url", "imported_document", "user_correction", "user_confirmation"]).default("manual_entry"),
  source_label: z.string().trim().max(300).default(""),
  source_url: httpOrBlank.default(""),
  verification_status: z.enum(["unverified", "confirmed", "corrected"]).default("unverified"),
  change_note: z.string().trim().max(500).default(""),
}).strict();

export type BusinessBrainInput = z.infer<typeof businessBrainBody>;

export function profileFields(input: BusinessBrainInput) {
  const { expectedRevision: _expectedRevision, ...fields } = input;
  return fields;
}
