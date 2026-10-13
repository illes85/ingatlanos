// Ideiglenes típusgenerátor: amíg a helyi Supabase nem fut, ebből készül a src/types/database.ts.
// A valódi forrás a `npm run db:types` (supabase gen types) — az felülírja ezt a kimenetet.
// Jelölés: "type" = kötelező, "type?" = nullable, "type=" = van alapértéke, "type?=" = mindkettő.
import { writeFileSync } from "node:fs";

const E = (name) => `Database["public"]["Enums"]["${name}"]`;
const T = {
  uuid: "string", text: "string", int: "number", num: "number", bool: "boolean", ts: "string", date: "string",
  json: "Json", geo: "unknown", texts: "string[]", ints: "number[]",
};

const tables = {
  organizations: {
    cols: { id: "uuid=", name: "text", type: "@org_type", slug: "text", plan: "@plan_tier=", trial_plan: "@plan_tier?", trial_ends_at: "ts?",
      ai_credit_balance: "int=", ai_credit_monthly: "int=", brand_color: "text?", logo_path: "text?", property_seq: "int=", settings: "json=",
      is_demo: "bool=", created_at: "ts=", updated_at: "ts=" },
    rels: [],
  },
  profiles: {
    cols: { id: "uuid", full_name: "text=", email: "text?", phone: "text?", avatar_path: "text?", license_number: "text?",
      monthly_commission_goal: "num?", active_organization_id: "uuid?", created_at: "ts=", updated_at: "ts=" },
    rels: [["active_organization_id", "organizations"]],
  },
  memberships: {
    cols: { id: "uuid=", organization_id: "uuid", user_id: "uuid", role: "@member_role=", status: "@member_status=", created_at: "ts=", updated_at: "ts=" },
    rels: [["organization_id", "organizations"], ["user_id", "profiles"]],
  },
  properties: {
    cols: { id: "uuid=", organization_id: "uuid", code: "text=", title: "text", transaction_type: "@transaction_type=", property_type: "@property_type",
      subtype: "text?", status: "@property_status=", visibility: "@record_visibility=", responsible_agent_id: "uuid?", seller_contact_id: "uuid?",
      price: "num", currency: "text=", area_sqm: "num?", price_per_sqm: "num?=", lot_sqm: "num?", rooms: "int?", half_rooms: "int=", bathrooms: "int?",
      floor: "int?", building_floors: "int?", has_elevator: "bool?", heating: "text?", building_material: "text?", condition: "text?", year_built: "int?",
      energy_rating: "@energy_rating?", balcony_sqm: "num?", has_terrace: "bool=", garden_connected: "bool=", parking: "text?", utilities_monthly: "num?",
      common_cost_monthly: "num?", description: "text?", highlights: "texts=", postal_code: "text?", city: "text", district: "int?", street: "text?",
      house_number: "text?", floor_door: "text?", lat: "num?", lng: "num?", location: "geo?", address_visibility: "@address_visibility=",
      mandate_type: "@mandate_type?", mandate_start: "date?", mandate_expires_at: "date?", listed_at: "ts?", status_changed_at: "ts=",
      public_slug: "text?", public_enabled: "bool=", view_count: "int=", search_text: "text?=", created_by: "uuid?=", created_at: "ts=", updated_at: "ts=" },
    rels: [["organization_id", "organizations"], ["responsible_agent_id", "profiles"], ["seller_contact_id", "contacts"]],
  },
  property_commission_terms: {
    cols: { property_id: "uuid", organization_id: "uuid", commission_pct: "num?", commission_fixed: "num?", notes: "text?", updated_at: "ts=" },
    rels: [["property_id", "properties"]],
  },
  property_media: {
    cols: { id: "uuid=", organization_id: "uuid", property_id: "uuid", kind: "@media_kind=", storage_path: "text?", external_url: "text?", sort_order: "int=",
      is_cover: "bool=", is_public: "bool=", is_virtually_staged: "bool=", caption: "text?", width: "int?", height: "int?", created_at: "ts=" },
    rels: [["property_id", "properties"]],
  },
  contacts: {
    cols: { id: "uuid=", organization_id: "uuid", owner_agent_id: "uuid?", last_name: "text=", first_name: "text=", full_name: "text?=", company: "text?",
      email: "text?", phone: "text?", phone_normalized: "text?", roles: "@contact_role[]=", source: "@lead_source?", source_detail: "text?", tags: "texts=",
      notes: "text?", postal_address: "text?", gdpr_consent_at: "ts?", gdpr_consent_scope: "texts=", gdpr_notice_version: "text?", pmt_status: "@pmt_status=",
      pmt_risk_level: "@risk_level?", pmt_checked_at: "ts?", pmt_next_review_at: "date?", last_contacted_at: "ts?", anonymized_at: "ts?", deleted_at: "ts?",
      created_by: "uuid?=", created_at: "ts=", updated_at: "ts=" },
    rels: [["owner_agent_id", "profiles"]],
  },
  search_profiles: {
    cols: { id: "uuid=", organization_id: "uuid", contact_id: "uuid", name: "text?", transaction_type: "@transaction_type=", property_types: "@property_type[]=",
      cities: "texts=", districts: "ints=", area: "geo?", price_min: "num?", price_max: "num?", area_min: "num?", area_max: "num?", rooms_min: "int?",
      must_have: "texts=", nice_to_have: "texts=", financing: "texts=", mortgage_approved: "bool=", urgency: "@urgency=", active: "bool=", notes: "text?",
      created_at: "ts=", updated_at: "ts=" },
    rels: [["contact_id", "contacts"]],
  },
  property_recommendations: {
    cols: { id: "uuid=", organization_id: "uuid", contact_id: "uuid", property_id: "uuid", channel: "text=", sent_by: "uuid?=", sent_at: "ts=", reaction: "text?" },
    rels: [["contact_id", "contacts"], ["property_id", "properties"]],
  },
  leads: {
    cols: { id: "uuid=", organization_id: "uuid", source: "@lead_source=", source_detail: "text?", raw_message: "text?", full_name: "text?", email: "text?",
      phone: "text?", phone_normalized: "text?", property_id: "uuid?", contact_id: "uuid?", assigned_to: "uuid?", status: "@lead_status=", urgent: "bool=",
      ai_score: "int?", ai_score_reason: "text?", received_at: "ts=", read_at: "ts?", converted_at: "ts?", created_at: "ts=", updated_at: "ts=" },
    rels: [["property_id", "properties"], ["contact_id", "contacts"], ["assigned_to", "profiles"]],
  },
  lookup_values: {
    cols: { id: "uuid=", organization_id: "uuid?", category: "text", key: "text", label: "text", sort_order: "int=", active: "bool=" },
    rels: [],
  },
  deals: {
    cols: { id: "uuid=", organization_id: "uuid", side: "@deal_side", stage: "@deal_stage", status: "@deal_status=", title: "text?", property_id: "uuid?",
      contact_id: "uuid?", agent_id: "uuid?", expected_value: "num?", probability: "int?", expected_close_date: "date?", stage_entered_at: "ts=",
      closed_at: "ts?", lost_reason: "text?", notes: "text?", created_by: "uuid?=", created_at: "ts=", updated_at: "ts=" },
    rels: [["property_id", "properties"], ["contact_id", "contacts"], ["agent_id", "profiles"]],
  },
  deal_stage_history: {
    cols: { id: "uuid=", organization_id: "uuid", deal_id: "uuid", from_stage: "@deal_stage?", to_stage: "@deal_stage", changed_by: "uuid?=", changed_at: "ts=" },
    rels: [["deal_id", "deals"]],
  },
  showings: {
    cols: { id: "uuid=", organization_id: "uuid", property_id: "uuid", buyer_contact_id: "uuid?", deal_id: "uuid?", agent_id: "uuid?", starts_at: "ts",
      ends_at: "ts?", status: "@showing_status=", feedback_rating: "int?", feedback_text: "text?", feedback_requested_at: "ts?", notes: "text?",
      created_by: "uuid?=", created_at: "ts=", updated_at: "ts=" },
    rels: [["property_id", "properties"], ["buyer_contact_id", "contacts"], ["deal_id", "deals"], ["agent_id", "profiles"]],
  },
  offers: {
    cols: { id: "uuid=", organization_id: "uuid", deal_id: "uuid?", property_id: "uuid", buyer_contact_id: "uuid?", parent_offer_id: "uuid?",
      kind: "@offer_kind=", status: "@offer_status=", amount: "num", deposit_amount: "num?", deposit_deadline: "date?", valid_until: "date?", notes: "text?",
      created_by: "uuid?=", created_at: "ts=", updated_at: "ts=" },
    rels: [["deal_id", "deals"], ["property_id", "properties"], ["buyer_contact_id", "contacts"]],
  },
  tasks: {
    cols: { id: "uuid=", organization_id: "uuid", title: "text", description: "text?", due_at: "ts?", assignee_id: "uuid?", contact_id: "uuid?",
      property_id: "uuid?", deal_id: "uuid?", priority: "@task_priority=", status: "@task_status=", recurrence_rule: "text?", completed_at: "ts?",
      created_by: "uuid?=", created_at: "ts=", updated_at: "ts=" },
    rels: [["assignee_id", "profiles"], ["contact_id", "contacts"], ["property_id", "properties"], ["deal_id", "deals"]],
  },
  calendar_events: {
    cols: { id: "uuid=", organization_id: "uuid", kind: "@event_kind=", title: "text", starts_at: "ts", ends_at: "ts?", all_day: "bool=", location: "text?",
      owner_id: "uuid?", showing_id: "uuid?", contact_id: "uuid?", property_id: "uuid?", deal_id: "uuid?", external_provider: "text?", external_id: "text?",
      created_at: "ts=", updated_at: "ts=" },
    rels: [["owner_id", "profiles"], ["showing_id", "showings"]],
  },
  document_templates: {
    cols: { id: "uuid=", organization_id: "uuid?", kind: "@document_kind", name: "text", body: "text=", version: "int=", active: "bool=", created_at: "ts=", updated_at: "ts=" },
    rels: [],
  },
  documents: {
    cols: { id: "uuid=", organization_id: "uuid", template_id: "uuid?", kind: "@document_kind", title: "text", property_id: "uuid?", contact_id: "uuid?",
      deal_id: "uuid?", storage_path: "text?", status: "@document_status=", data: "json=", created_by: "uuid?=", created_at: "ts=", updated_at: "ts=" },
    rels: [["property_id", "properties"], ["contact_id", "contacts"], ["deal_id", "deals"]],
  },
  commissions: {
    cols: { id: "uuid=", organization_id: "uuid", deal_id: "uuid?", property_id: "uuid?", gross_amount: "num", currency: "text=", status: "@commission_status=",
      office_share_pct: "num=", expected_date: "date?", earned_at: "ts?", paid_at: "ts?", notes: "text?", created_at: "ts=", updated_at: "ts=" },
    rels: [["deal_id", "deals"], ["property_id", "properties"]],
  },
  commission_splits: {
    cols: { id: "uuid=", organization_id: "uuid", commission_id: "uuid", agent_id: "uuid", role: "@split_role", pct: "num", amount: "num", created_at: "ts=" },
    rels: [["commission_id", "commissions"], ["agent_id", "profiles"]],
  },
  activities: {
    cols: { id: "uuid=", organization_id: "uuid", type: "@activity_type", actor_id: "uuid?=", contact_id: "uuid?", property_id: "uuid?", deal_id: "uuid?",
      title: "text", body: "text?", payload: "json=", occurred_at: "ts=", created_at: "ts=" },
    rels: [["actor_id", "profiles"], ["contact_id", "contacts"], ["property_id", "properties"], ["deal_id", "deals"]],
  },
  notifications: {
    cols: { id: "uuid=", organization_id: "uuid", user_id: "uuid", type: "text", title: "text", body: "text?", link: "text?", read_at: "ts?", created_at: "ts=" },
    rels: [],
  },
  ai_usage: {
    cols: { id: "uuid=", organization_id: "uuid", user_id: "uuid?", feature: "text", model: "text?", input_tokens: "int=", output_tokens: "int=", credits: "int=",
      cost_usd: "num=", is_mock: "bool=", created_at: "ts=" },
    rels: [],
  },
  credit_ledger: {
    cols: { id: "uuid=", organization_id: "uuid", delta: "int", reason: "text", ref_id: "uuid?", created_by: "uuid?", created_at: "ts=" },
    rels: [],
  },
  audit_log: {
    cols: { id: "uuid=", organization_id: "uuid?", actor_id: "uuid?", action: "text", entity_type: "text?", entity_id: "uuid?", metadata: "json=", created_at: "ts=" },
    rels: [],
  },
  market_snapshots: {
    cols: { id: "uuid=", city: "text", district: "int?", property_type: "@property_type", period: "date", avg_price_per_sqm: "num", median_price_per_sqm: "num?",
      sample_size: "int=", source: "text=" },
    rels: [],
  },
};

const enums = {
  org_type: ["individual", "office"], plan_tier: ["start", "pro", "pro_ai", "office"], member_role: ["owner", "agent", "assistant"],
  member_status: ["active", "invited", "disabled"], transaction_type: ["sale", "rent"],
  property_type: ["flat", "house", "plot", "office", "retail", "holiday_home"],
  property_status: ["draft", "active", "under_offer", "reserved", "sold", "rented", "withdrawn", "expired"],
  mandate_type: ["exclusive", "non_exclusive"], address_visibility: ["exact", "street", "area"], record_visibility: ["office", "private"],
  energy_rating: ["AA++", "AA+", "AA", "BB", "CC", "DD", "EE", "FF", "GG", "HH", "II", "JJ"], media_kind: ["photo", "floorplan", "video", "tour360"],
  contact_role: ["seller", "buyer", "tenant", "landlord", "investor", "lawyer", "mortgage_broker", "other"],
  pmt_status: ["not_started", "in_progress", "completed", "expired"], risk_level: ["low", "medium", "high"], urgency: ["low", "medium", "high"],
  lead_source: ["portal", "website", "facebook", "phone", "referral", "manual", "public_page"],
  lead_status: ["new", "read", "contacted", "converted", "archived", "spam"], deal_side: ["seller", "buyer"],
  deal_stage: ["acquisition", "assessment", "mandate_signed", "listed", "new", "needs_assessment", "showings", "offer", "financing", "deposit", "contract", "closed"],
  deal_status: ["open", "won", "lost"], showing_status: ["scheduled", "completed", "cancelled", "no_show"], offer_kind: ["offer", "counter"],
  offer_status: ["pending", "accepted", "rejected", "withdrawn", "expired"], task_status: ["open", "done"], task_priority: ["low", "normal", "high"],
  event_kind: ["showing", "meeting", "signing", "call", "other"],
  document_kind: ["mandate_agreement", "showing_sheet", "reservation_precontract", "pmt_form", "handover_protocol", "other"],
  document_status: ["draft", "final", "signed"], commission_status: ["expected", "earned", "invoiced", "paid"], split_role: ["listing", "selling", "referral"],
  activity_type: ["call", "email", "sms", "note", "showing", "price_change", "status_change", "document", "offer", "lead", "recommendation", "task", "listing"],
};

function tsType(spec) {
  const base = spec.replace(/[?=]/g, "");
  if (base.startsWith("@")) {
    const isArray = base.endsWith("[]");
    const name = base.slice(1).replace("[]", "");
    return isArray ? `${E(name)}[]` : E(name);
  }
  return T[base];
}

let out = `// IDEIGLENES, generált fájl (scripts/dev/build-db-types.mjs). A \`npm run db:types\` felülírja.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
`;
for (const [name, { cols, rels }] of Object.entries(tables)) {
  const row = [], ins = [], upd = [];
  for (const [col, spec] of Object.entries(cols)) {
    const nullable = spec.includes("?");
    const hasDefault = spec.includes("=");
    const ty = tsType(spec) + (nullable ? " | null" : "");
    row.push(`          ${col}: ${ty};`);
    ins.push(`          ${col}${nullable || hasDefault ? "?" : ""}: ${ty};`);
    upd.push(`          ${col}?: ${ty};`);
  }
  const relLines = rels.map(([col, ref]) =>
    `          { foreignKeyName: "${name}_${col}_fkey"; columns: ["${col}"]; isOneToOne: false; referencedRelation: "${ref}"; referencedColumns: ["id"] },`);
  out += `      ${name}: {
        Row: {
${row.join("\n")}
        };
        Insert: {
${ins.join("\n")}
        };
        Update: {
${upd.join("\n")}
        };
        Relationships: [
${relLines.join("\n")}
        ];
      };
`;
}
out += `    };
    Views: { [_ in never]: never };
    Functions: {
      create_organization: { Args: { p_name: string; p_type: ${E("org_type")} }; Returns: string };
      contact_directory: {
        Args: { p_org: string; p_query?: string; p_limit?: number };
        Returns: { id: string; full_name: string; roles: ${E("contact_role")}[]; owner_agent_id: string; owner_name: string; is_mine: boolean }[];
      };
      find_duplicate_contacts: {
        Args: { p_org: string; p_phone: string; p_email: string };
        Returns: { id: string; full_name: string; owner_agent_id: string; owner_name: string; match: string }[];
      };
      write_audit: {
        Args: { p_org: string; p_action: string; p_entity_type: string; p_entity_id: string; p_metadata?: Json };
        Returns: undefined;
      };
    };
    Enums: {
${Object.entries(enums).map(([k, v]) => `      ${k}: ${v.map((x) => JSON.stringify(x)).join(" | ")};`).join("\n")}
    };
    CompositeTypes: { [_ in never]: never };
  };
};
`;
writeFileSync(new URL("../../src/types/database.ts", import.meta.url), out);
console.log("src/types/database.ts kész (ideiglenes).");
