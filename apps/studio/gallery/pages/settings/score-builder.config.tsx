/**
 * DCF-0002 · Settings › Brand Setup › Score Builder: page configuration for the Score Builder
 * candidate template. Configuration only (station contract invariant 3). Case file:
 * fynxt-product-experience-engine/design-cases/DCF-0002-scoring-builder/case-file.md
 * Approved Figma: version 2410527021694858974 (prototype v5).
 *
 * Every value marked "PROPOSED (Qn)" is an FDI proposal from the case file, NOT a confirmed product
 * decision. Change it here when the owner answers. The data adapter is the gallery's in-memory DEMO;
 * production supplies the real API (Q24). Nothing here scores a record (Q41, Q52, Q60).
 */
import { createScoreMemoryAdapter, defaultDuplicateName, type ScoreBuilderConfig, type ScoreModel } from "@fynxt/templates";
import type { ConditionObject } from "@fynxt/ui";
import {
  Accessibility,
  BarChart3,
  Briefcase,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  Database,
  FileText,
  Home,
  IdCard,
  Plug,
  Scale,
  Settings,
  ShoppingBag,
  Smile,
  Star,
  Target,
  Ticket,
  TrendingUp,
  User,
  Users,
  Activity,
} from "lucide-react";

// CRM metadata stand-ins (Q4: objects, fields and options come from the CRM). Sample values from I3; fictional.
const schema: ConditionObject[] = [
  {
    id: "contact",
    label: "Contact",
    fields: [
      { id: "user-type", label: "User Type", type: "list", options: [{ value: "contact", label: "Contact" }, { value: "lead", label: "Lead" }] },
      { id: "category", label: "Contact Category", type: "list", options: [{ value: "retail", label: "Retail" }, { value: "professional", label: "Professional" }] },
      { id: "profile", label: "Profile", type: "list", options: [{ value: "trader", label: "Trader" }, { value: "investor", label: "Investor" }] },
      { id: "country", label: "Country", type: "list", options: ["India", "China", "USA", "UK", "Pakistan", "Japan"].map((l) => ({ value: l.toLowerCase(), label: l })) },
      { id: "occupation", label: "Occupation", type: "list", options: ["Salaried", "Self Employee", "Student"].map((l) => ({ value: l.toLowerCase().replace(/\s+/g, "-"), label: l })) },
      { id: "industry", label: "Industry", type: "list", options: ["Manufacturing", "Technology", "Infra Structure"].map((l) => ({ value: l.toLowerCase().replace(/\s+/g, "-"), label: l })) },
      { id: "income", label: "Income", type: "number" },
    ],
  },
  {
    id: "deal",
    label: "Deal",
    fields: [
      { id: "stage", label: "Deal Stage", type: "number" },
      { id: "engagement", label: "Engagement / Activity", type: "list", options: ["Low", "Medium", "High"].map((l) => ({ value: l.toLowerCase(), label: l })) },
      { id: "authority", label: "Decision Authority", type: "list", options: ["User", "Evaluator", "Decision Maker"].map((l) => ({ value: l.toLowerCase().replace(/\s+/g, "-"), label: l })) },
      { id: "value", label: "Deal Value", type: "number" },
      // PROPOSED (Q54): placeholder field for the override example in I9.
      { id: "approval", label: "Approval status", type: "list", options: [{ value: "approved", label: "Approved" }, { value: "pending", label: "Pending" }, { value: "rejected", label: "Rejected" }] },
    ],
  },
];

const row = (id: string, category: string, values: string[], score: string, from = "", to = "") => ({ id, category, values, from, to, score });

// Sample models mirror the approved list (frames 01, 34). Fictional data from I3.
const models: ScoreModel[] = [
  {
    id: "m2001",
    code: "2001",
    name: "Client Risk Score",
    description: "Contact risk for traders",
    status: "active",
    method: "weighted",
    appliesTo: {
      match: "all",
      items: [
        { kind: "rule", id: "ap1", object: "contact", field: "user-type", condition: "is", value: "contact" },
        { kind: "rule", id: "ap2", object: "contact", field: "category", condition: "any_of", value: ["retail", "professional"] },
        { kind: "rule", id: "ap3", object: "contact", field: "profile", condition: "is", value: "trader" },
      ],
    },
    objects: [
      {
        id: "g1",
        object: "contact",
        logic: "and",
        attributes: [
          { id: "a1", field: "country", weight: "40", values: [row("v1", "Low", ["india", "china"], "10"), row("v2", "Medium", ["usa", "uk"], "40"), row("v3", "High", ["pakistan", "japan"], "90")] },
          { id: "a2", field: "occupation", weight: "20", values: [row("v4", "Low", ["salaried"], "10"), row("v5", "Medium", ["self-employee"], "50"), row("v6", "High", ["student"], "90")] },
          { id: "a3", field: "industry", weight: "20", values: [row("v7", "Low", ["manufacturing"], "10"), row("v8", "Medium", ["technology"], "50"), row("v9", "High", ["infra-structure"], "90")] },
          { id: "a4", field: "income", weight: "20", values: [row("v10", "Low", [], "10", "0", "10000"), row("v11", "Medium", [], "20", "10000", "20000"), row("v12", "High", [], "70", "20000", "")] },
        ],
      },
    ],
    connectors: [],
    bands: [
      { id: "b1", upTo: "30", label: "Low Risk", description: "Standard due diligence. Review the client every 3 years." },
      { id: "b2", upTo: "70", label: "Medium Risk", description: "Enhanced checks on source of funds. Review yearly." },
      { id: "b3", upTo: "", label: "High Risk", description: "Senior approval and enhanced due diligence before onboarding." },
    ],
    // Frame 32 / 35: two override rules (I9). Which rule wins is open (Q52).
    overrides: [
      {
        id: "o1",
        objectId: "g1",
        attributeId: "a1",
        conditions: { match: "all", items: [{ kind: "rule", id: "or1", object: "contact", field: "country", condition: "any_of", value: ["pakistan"] }] },
        outcome: { type: "forceBand", value: "b3" },
      },
      {
        id: "o2",
        objectId: "g1",
        conditions: { match: "all", items: [{ kind: "rule", id: "or2", object: "deal", field: "approval", condition: "is_not", value: "approved" }] },
        outcome: { type: "forceBand", value: "b3" },
      },
    ],
    updatedAt: "2026-10-13",
    updatedBy: "A. Bansal",
  },
  {
    id: "m2002",
    code: "2002",
    name: "Deal Score",
    description: "Hot, warm or cold deals",
    status: "active",
    method: "weighted",
    appliesTo: { match: "all", items: [] },
    objects: [
      {
        id: "g2",
        object: "deal",
        logic: "or",
        attributes: [
          { id: "d1", field: "stage", weight: "25", values: [row("w1", "Low", [], "10", "0", "2"), row("w2", "Medium", [], "50", "2", "4"), row("w3", "High", [], "90", "4", "")] },
          { id: "d2", field: "engagement", weight: "25", values: [row("w4", "Low", ["low"], "10"), row("w5", "Medium", ["medium"], "50"), row("w6", "High", ["high"], "90")] },
          { id: "d3", field: "authority", weight: "25", values: [row("w7", "Low", ["user"], "10"), row("w8", "Medium", ["evaluator"], "20"), row("w9", "High", ["decision-maker"], "70")] },
          { id: "d4", field: "value", weight: "25", values: [row("w10", "Low", [], "10", "0", "10000"), row("w11", "Medium", [], "20", "10000", "20000"), row("w12", "High", [], "70", "20000", "")] },
        ],
      },
    ],
    connectors: [],
    bands: [
      { id: "c1", upTo: "30", label: "Cold Deal", description: "" },
      { id: "c2", upTo: "70", label: "Warm Deal", description: "" },
      { id: "c3", upTo: "", label: "Hot Deal", description: "" },
    ],
    overrides: [],
    updatedAt: "2026-10-13",
    updatedBy: "A. Bansal",
  },
];

const mainNav = [
  { id: "dashboard", label: "Dashboard", icon: <Home />, children: [{ id: "exec", label: "Executive Dashboard" }, { id: "sales-dash", label: "Sales Dashboard" }] },
  { id: "sales", label: "Sales", icon: <ClipboardList />, children: ["Lead", "Deal", "Contact", "Company", "Account", "Lead Eligibility Criteria", "Campaigns"].map((l) => ({ id: l.toLowerCase().replace(/\W+/g, "-"), label: l })) },
  { id: "tickets", label: "Tickets & Activities", icon: <Ticket />, children: [{ id: "service", label: "Service Ticket" }, { id: "meeting", label: "Activity Meeting" }, { id: "tasks", label: "Tasks" }] },
  { id: "operations", label: "Operations", icon: <IdCard />, children: [{ id: "trading", label: "Trading Account" }, { id: "cash", label: "Cash Transactions" }, { id: "assess", label: "Assessment Attempts" }] },
  { id: "reports", label: "Reports", icon: <BarChart3 /> },
];

// Settings menu as in I4 / D8 (Brand Setup's other children unknown: Q29).
const settingsNav = [
  { id: "profile-settings", label: "Profile Settings", icon: <User /> },
  { id: "accessibility", label: "Accessibility & Shortcuts", icon: <Accessibility /> },
  { id: "logs", label: "Logs", icon: <FileText /> },
  { id: "user-management", label: "User Management", icon: <Users /> },
  { id: "customizations", label: "Customizations", icon: <Settings /> },
  { id: "brand-setup", label: "Brand Setup", icon: <Star />, children: [{ id: "score-builder", label: "Score Builder" }] },
  { id: "assessment", label: "Assessment", icon: <ClipboardCheck /> },
  { id: "data-admin", label: "Data Administration", icon: <Database /> },
  { id: "tracking", label: "Tracking", icon: <Activity /> },
  { id: "integrations", label: "Integrations", icon: <Plug /> },
  { id: "marketplace", label: "Marketplace", icon: <ShoppingBag /> },
  { id: "lead-config", label: "Lead Configuration", icon: <Target /> },
  { id: "retail-fx", label: "Retail FX", icon: <TrendingUp /> },
  { id: "payments", label: "Payments", icon: <CreditCard /> },
  { id: "client-experience", label: "Client Experience", icon: <Smile /> },
  { id: "legal", label: "Legal & Compliance", icon: <Scale /> },
];

export const scoreBuilderConfig: ScoreBuilderConfig = {
  shell: {
    title: "Settings",
    nav: mainNav,
    activeNavId: "score-builder",
    logo: "Tenant logo",
    logoMark: "T",
    settings: { label: "Settings", icon: <Settings />, items: settingsNav, searchPlaceholder: "Search settings" },
    user: { name: "John Doe", meta: "ID: 100245 · Admin" },
    language: "EN",
    help: { label: "Help", pendingReason: "Help content TBD (Q74)" },
  },
  objectIcons: { contact: <User />, deal: <Briefcase /> },
  pageSizes: [10, 25, 50],
  adapter: createScoreMemoryAdapter({
    models,
    schema,
    currentUser: "A. Bansal",
    // PROPOSED (Q3): a saved model is Active; a duplicate is Draft (Q67).
    savedStatus: "active",
    draftStatus: "draft",
    latency: 300,
  }),
  // PROPOSED (Q15): everyone in the gallery can do everything. Production passes the real permission check.
  can: () => true,
  currentUser: "A. Bansal",
  // PROPOSED (Q3): statuses.
  statuses: [
    { value: "active", label: "Active", tone: "success" },
    { value: "inactive", label: "Inactive", tone: "neutral" },
    { value: "draft", label: "Draft", tone: "warning" },
  ],
  activeStatus: "active",
  inactiveStatus: "inactive",
  draftStatus: "draft",
  // I1: Low / Medium / High (configurability Q17).
  categories: ["Low", "Medium", "High"],
  // PROPOSED (Q5): operators per field type for Applies to and override conditions.
  operatorsByType: {
    list: [
      { id: "is", label: "is", valueShape: "single" },
      { id: "is_not", label: "is not", valueShape: "single" },
      { id: "any_of", label: "is any of", valueShape: "multi" },
      { id: "none_of", label: "is none of", valueShape: "multi" },
    ],
    number: [
      { id: "eq", label: "is equal to", valueShape: "single" },
      { id: "gt", label: "is greater than", valueShape: "single" },
      { id: "lt", label: "is less than", valueShape: "single" },
    ],
    date: [
      { id: "before", label: "is before", valueShape: "single" },
      { id: "after", label: "is after", valueShape: "single" },
    ],
    text: [
      { id: "is", label: "is", valueShape: "single" },
      { id: "contains", label: "contains", valueShape: "single" },
    ],
  },
  // PROPOSED (Q25): limits.
  limits: { rules: 20, groups: 5, rulesPerGroup: 10 },
  // R19, R27 (I9, I10). Precedence between outcomes is Q52.
  outcomeTypes: [
    { value: "forceBand", label: "Force band" },
    { value: "atLeastBand", label: "At least band" },
    { value: "setScore", label: "Set score" },
    { value: "reject", label: "Reject" },
    { value: "refer", label: "Refer to compliance" },
  ],
  // Q63 (Aman Bansal): 250 words.
  descriptionMaxWords: 250,
  // BR1; PROPOSED per object (Q42).
  weightTotal: 100,
  // Q67 (Aman Bansal): "<Name>_copy(n)".
  duplicateName: defaultDuplicateName,
  copy: {
    pageTitle: "Score Builder",
    sectionTitle: "All score models",
    auditLogs: { label: "Audit logs", pendingReason: "Audit log content is not designed yet (Q68)." },
    pageActions: {
      tips: { label: "Tips", pendingReason: "Page action TBD (Q69)" },
      more: { label: "More actions", pendingReason: "Page actions TBD (Q69)" },
    },
    addFilter: { label: "Add filter", pendingReason: "More filters TBD (Q70)" },
    columns: { label: "Choose columns", pendingReason: "Column settings TBD (Q70)" },
    descriptionHelp: "Provide details about this score model. (Q18)",
    descriptionInfo: "Description help TBD (Q18)",
    objectOverrideExample: "Example: if the related Deal is not approved, force High Risk.",
    banner: { title: "Score models rate records automatically", text: "Banner copy TBD (Q20)." },
    breadcrumb: ["Settings", "Brand Setup", "Score Builder"],
    howItWorks: "Add objects and their attributes, score each value, weight each attribute, then set outcome bands. Override rules can force a result.",
  },
};
