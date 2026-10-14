/**
 * DCF-0003 · CRM › Operations › Incentive Programs: page configuration for the Incentive Programs
 * candidate template. Configuration only (station contract invariant 3). Case file:
 * fynxt-product-experience-engine/design-cases/DCF-0003-object-enrolment/case-file.md
 *
 * Every value marked "PROPOSED (Qn)" is an FDI industry-practice proposal from case file §10.1,
 * NOT a confirmed product decision (D4: "configurable placeholders"). Change it here when the
 * owner answers. The data adapter is the gallery's in-memory DEMO; production supplies the real API (Q19).
 */
import { createProgramsMemoryAdapter, type IncentiveProgramsConfig, type Participant, type ProgramRecord } from "@fynxt/templates";
import type { ConditionObject } from "@fynxt/ui";
import { BarChart3, ClipboardList, Home, IdCard, Ticket } from "lucide-react";

// CRM metadata stand-ins (I1 B1: objects, fields and values come from the CRM). Sample values only.
const account: ConditionObject = {
  id: "account",
  label: "Account",
  fields: [
    { id: "country", label: "Country", type: "list", options: [{ value: "GB", label: "United Kingdom" }, { value: "DE", label: "Germany" }, { value: "IN", label: "India" }, { value: "AE", label: "UAE" }] },
    { id: "status", label: "Account Status", type: "list", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }, { value: "pending", label: "Pending" }] },
    { id: "type", label: "Account Type", type: "list", options: [{ value: "standard", label: "Standard" }, { value: "vip", label: "VIP" }, { value: "ecn", label: "ECN" }] },
    { id: "created", label: "Created on", type: "date" },
  ],
};
const tradingAccount: ConditionObject = {
  id: "trading-account",
  // PROPOSED (Q6): one-to-many objects match if ANY related record matches.
  label: "Trading Account (any)",
  fields: [
    { id: "balance", label: "Balance", type: "number" },
    { id: "leverage", label: "Leverage", type: "number" },
    { id: "platform", label: "Platform", type: "list", options: [{ value: "mt4", label: "MT4" }, { value: "mt5", label: "MT5" }, { value: "ctrader", label: "cTrader" }] },
  ],
};
const contact: ConditionObject = {
  id: "contact",
  label: "Contact",
  fields: [
    { id: "kyc", label: "KYC Status", type: "list", options: [{ value: "approved", label: "Approved" }, { value: "pending", label: "Pending" }, { value: "rejected", label: "Rejected" }] },
    { id: "email", label: "Email", type: "text" },
  ],
};
const ibObject: ConditionObject = {
  id: "ib",
  label: "IB",
  fields: [{ id: "tier", label: "Tier", type: "list", options: [{ value: "silver", label: "Silver" }, { value: "gold", label: "Gold" }] }],
};

const participants: Participant[] = [
  { id: "c1", name: "Aisha Khan", ref: "CL-10482 · aisha.khan@example.com", type: "client" },
  { id: "c2", name: "Marco Rossi", ref: "CL-20931 · marco.r@example.com", type: "client" },
  { id: "c3", name: "Imran Khan", ref: "CL-30117 · imran.k@example.com", type: "client" },
  { id: "c4", name: "Leila Khoury", ref: "CL-30552 · l.khoury@example.com", type: "client" },
  { id: "c5", name: "Giulia Rossi", ref: "CL-33410 · g.rossi@example.com", type: "client" },
  { id: "i1", name: "Northstar Partners", ref: "IB-2201 · ops@northstar.example.com", type: "ib" },
];

// Sample programs mirror the approved frames (version 2410117832155798624, P0 L1). Fictional data.
const programs: ProgramRecord[] = [
  {
    id: "p1024",
    code: "IP-1024",
    name: "UK VIP Rebate 2026",
    description: "Rebate for UK VIP clients with an active account.",
    participantType: "client",
    // I1 Examples setup (R1–R4).
    criteria: {
      match: "all",
      items: [
        { kind: "rule", id: "r1", object: "account", field: "country", condition: "is", value: "GB" },
        { kind: "rule", id: "r2", object: "account", field: "status", condition: "is", value: "active" },
        {
          kind: "group",
          id: "g1",
          match: "any",
          rules: [
            { kind: "rule", id: "r3", object: "account", field: "type", condition: "is", value: "vip" },
            { kind: "rule", id: "r4", object: "trading-account", field: "balance", condition: "gt", value: "1000" },
          ],
        },
      ],
    },
    manual: [{ participant: participants[0]!, addedBy: "A. Bansal", addedAt: "2026-10-14" }],
    blocked: [],
    status: "active",
    enrolledCount: 1284,
    updatedAt: "2026-10-14",
    updatedBy: "A. Bansal",
  },
  {
    id: "p1023",
    code: "IP-1023",
    name: "IB Volume Booster Q4",
    participantType: "ib",
    criteria: { match: "all", items: [{ kind: "rule", id: "r5", object: "ib", field: "tier", condition: "is", value: "gold" }] },
    manual: [],
    blocked: [],
    status: "active",
    enrolledCount: 214,
    updatedAt: "2026-10-10",
    updatedBy: "R. Mehta",
  },
  {
    id: "p1019",
    code: "IP-1019",
    name: "EMEA Active Trader Cashback",
    participantType: "client",
    // A rule on a CRM field that no longer exists (approved frame S2l, Q9).
    criteria: { match: "all", items: [{ kind: "rule", id: "r6", object: "account", field: "region", fieldLabel: "Region", condition: "is", value: "EMEA" }] },
    manual: [],
    blocked: [],
    status: "draft",
    enrolledCount: null,
    updatedAt: "2026-09-28",
    updatedBy: "A. Bansal",
  },
];

export const incentiveProgramsConfig: IncentiveProgramsConfig = {
  shell: {
    title: "Operations",
    nav: [
      { id: "dashboard", label: "Dashboard", icon: <Home />, children: [{ id: "exec", label: "Executive Dashboard" }, { id: "sales-dash", label: "Sales Dashboard" }] },
      {
        id: "sales",
        label: "Sales",
        icon: <ClipboardList />,
        children: ["Lead", "Deal", "Contact", "Company", "Account", "Lead Eligibility Criteria", "Campaigns"].map((l) => ({ id: l.toLowerCase().replace(/\W+/g, "-"), label: l })),
      },
      { id: "tickets", label: "Tickets & Activities", icon: <Ticket />, children: [{ id: "service", label: "Service Ticket" }, { id: "meeting", label: "Activity Meeting" }, { id: "tasks", label: "Tasks" }] },
      {
        id: "operations",
        label: "Operations",
        icon: <IdCard />,
        // PROPOSED (Q20 / Q41): Incentive Programs under Operations. Placement not confirmed.
        children: [{ id: "trading", label: "Trading Account" }, { id: "cash", label: "Cash Transactions" }, { id: "assess", label: "Assessment Attempts" }, { id: "incentive-programs", label: "Incentive Programs" }],
      },
      { id: "reports", label: "Reports", icon: <BarChart3 /> },
    ],
    activeNavId: "incentive-programs",
    logo: "Tenant logo",
    logoMark: "T",
  },
  adapter: createProgramsMemoryAdapter({
    programs,
    schemas: { client: [contact, account, tradingAccount], ib: [ibObject, account, tradingAccount] },
    participants,
    currentUser: "A. Bansal",
    draftStatus: "draft",
    // PROPOSED (Q42): Create program makes the program Active.
    submittedStatus: "active",
    latency: 300,
  }),
  // PROPOSED (Q16): everyone in the gallery can do everything. Production passes the real permission check.
  can: () => true,
  currentUser: "A. Bansal",
  // PROPOSED (Q7): participant types and the CRM objects their rules may use.
  participantTypes: [
    { value: "client", label: "Client", description: "Clients with a CRM account. Rules can use Contact, Account and Trading Account.", objects: ["contact", "account", "trading-account"] },
    { value: "ib", label: "IB", description: "Introducing brokers and partners. Rules can use IB, Account and Trading Account.", objects: ["ib", "account", "trading-account"] },
  ],
  // PROPOSED (Q4, Q5): operators per field type.
  operatorsByType: {
    list: [
      { id: "is", label: "is", valueShape: "single" },
      { id: "is_not", label: "is not", valueShape: "single" },
      { id: "any_of", label: "is any of", valueShape: "multi" },
      { id: "none_of", label: "is none of", valueShape: "multi" },
      { id: "empty", label: "is empty", valueShape: "none" },
      { id: "not_empty", label: "is not empty", valueShape: "none" },
    ],
    number: [
      { id: "eq", label: "is equal to", valueShape: "single" },
      { id: "neq", label: "is not equal to", valueShape: "single" },
      { id: "gt", label: "is greater than", valueShape: "single" },
      { id: "gte", label: "is greater than or equal to", valueShape: "single" },
      { id: "lt", label: "is less than", valueShape: "single" },
      { id: "lte", label: "is less than or equal to", valueShape: "single" },
      { id: "empty", label: "is empty", valueShape: "none" },
    ],
    date: [
      { id: "on", label: "is on", valueShape: "single" },
      { id: "before", label: "is before", valueShape: "single" },
      { id: "after", label: "is after", valueShape: "single" },
      { id: "empty", label: "is empty", valueShape: "none" },
    ],
    text: [
      { id: "is", label: "is", valueShape: "single" },
      { id: "is_not", label: "is not", valueShape: "single" },
      { id: "contains", label: "contains", valueShape: "single" },
      { id: "not_contains", label: "doesn’t contain", valueShape: "single" },
      { id: "starts", label: "starts with", valueShape: "single" },
      { id: "empty", label: "is empty", valueShape: "none" },
      { id: "not_empty", label: "is not empty", valueShape: "none" },
    ],
  },
  // PROPOSED (Q15): limits.
  limits: { rules: 20, groups: 5, rulesPerGroup: 10 },
  // PROPOSED (Q12): a new group starts as Any (as I2).
  newGroupMatch: "any",
  // PROPOSED (Q37): program statuses.
  statuses: [
    { value: "draft", label: "Draft", tone: "warning" },
    { value: "active", label: "Active", tone: "success" },
    { value: "inactive", label: "Inactive", tone: "neutral" },
  ],
  draftStatus: "draft",
  liveStatuses: ["active"],
  deactivatedStatus: "inactive",
  // PROPOSED (Q10): Next / Create need at least one rule or manual participant.
  requireCriteria: true,
  // PROPOSED (Q9): saving is blocked while a rule uses a deleted CRM field.
  blockSaveOnStaleRules: true,
  copy: {
    pageTitle: "Incentive Programs",
    sectionTitle: "All incentive programs",
    sectionDescription: "Programs that reward clients and IBs. Enrollment criteria decide who joins each program.",
    // PROPOSED (Q3): how rules, manual enrollment and blocking combine.
    enrollmentExplainer: "Participants who match the rules, plus anyone added manually. Blocked participants (Step 3) are never enrolled.",
    // PROPOSED (Q16, Q29)
    liveBanner: "Changes apply to participants who enrol after you save. Participants already enrolled stay enrolled.",
  },
};
