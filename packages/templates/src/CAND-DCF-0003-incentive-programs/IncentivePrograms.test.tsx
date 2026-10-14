import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ConditionObject } from "@fynxt/ui";
import { IncentivePrograms } from "./IncentivePrograms";
import { createProgramsMemoryAdapter } from "./memoryAdapter";
import type { IncentiveProgramsConfig, Participant, ProgramRecord, ProgramsAdapter } from "./types";

beforeEach(() => {
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    cb(0);
    return 0;
  });
});

const account: ConditionObject = {
  id: "account",
  label: "Account",
  fields: [
    { id: "country", label: "Country", type: "list", options: [{ value: "GB", label: "United Kingdom" }] },
    { id: "status", label: "Account Status", type: "list", options: [{ value: "active", label: "Active" }] },
  ],
};
const contact: ConditionObject = { id: "contact", label: "Contact", fields: [{ id: "kyc", label: "KYC Status", type: "list", options: [{ value: "ok", label: "Approved" }] }] };
const ib: ConditionObject = { id: "ib", label: "IB", fields: [{ id: "tier", label: "Tier", type: "list", options: [{ value: "gold", label: "Gold" }] }] };

const people: Participant[] = [
  { id: "c1", name: "Aisha Khan", ref: "CL-10482", type: "client" },
  { id: "c2", name: "Imran Khan", ref: "CL-30117", type: "client" },
  { id: "i1", name: "Northstar Partners", ref: "IB-2201", type: "ib" },
];

const program = (over: Partial<ProgramRecord> & Pick<ProgramRecord, "id" | "name">): ProgramRecord => ({
  code: "IP-1",
  participantType: "client",
  criteria: { match: "all", items: [] },
  manual: [],
  blocked: [],
  status: "active",
  enrolledCount: 10,
  updatedAt: "2026-10-14",
  updatedBy: "A. Bansal",
  ...over,
});

function setup(opts: { programs?: ProgramRecord[]; can?: IncentiveProgramsConfig["can"]; adapter?: Partial<ProgramsAdapter>; failSchema?: boolean } = {}) {
  const base = createProgramsMemoryAdapter({
    programs: opts.programs ?? [
      program({
        id: "p1",
        name: "UK VIP Rebate 2026",
        code: "IP-1024",
        criteria: { match: "all", items: [{ kind: "rule", id: "r1", object: "account", field: "country", condition: "is", value: "GB" }] },
      }),
    ],
    schemas: { client: [contact, account], ib: [ib, account] },
    participants: people,
    currentUser: "A. Bansal",
    draftStatus: "draft",
    submittedStatus: "active",
    failSchema: opts.failSchema,
  });
  const config: IncentiveProgramsConfig = {
    adapter: { ...base, ...opts.adapter },
    can: opts.can ?? (() => true),
    currentUser: "A. Bansal",
    participantTypes: [
      { value: "client", label: "Client", description: "Clients with a CRM account.", objects: ["contact", "account"] },
      { value: "ib", label: "IB", description: "Introducing brokers and partners.", objects: ["ib", "account"] },
    ],
    operatorsByType: { list: [{ id: "is", label: "is", valueShape: "single" }], number: [], date: [], text: [] },
    statuses: [
      { value: "draft", label: "Draft", tone: "warning" },
      { value: "active", label: "Active", tone: "success" },
      { value: "inactive", label: "Inactive", tone: "neutral" },
    ],
    draftStatus: "draft",
    liveStatuses: ["active"],
    deactivatedStatus: "inactive",
    requireCriteria: true,
    blockSaveOnStaleRules: true,
    copy: {
      pageTitle: "Incentive Programs",
      sectionTitle: "All incentive programs",
      sectionDescription: "Programs that reward clients and IBs.",
      enrollmentExplainer: "Participants who match the rules, plus anyone added manually. Blocked participants are never enrolled.",
      liveBanner: "Changes apply to participants who enrol after you save.",
    },
  };
  render(<IncentivePrograms config={config} />);
  return config;
}

const table = () => screen.findByRole("table", { name: "All incentive programs" });

describe("Incentive Programs list (P0)", () => {
  it("lists programs with criteria summary and status", async () => {
    setup();
    const t = await table();
    const row = within(t).getByRole("row", { name: /UK VIP Rebate 2026/ });
    expect(row).toHaveTextContent("IP-1024");
    expect(row).toHaveTextContent("1 rule");
    expect(row).toHaveTextContent("Active");
  });

  it("hides Create program without permission", async () => {
    setup({ can: (a) => a !== "create" });
    await table();
    expect(screen.queryByRole("button", { name: "Create program" })).not.toBeInTheDocument();
  });

  it("shows an error with Try again when the list fails", async () => {
    const list = vi.fn().mockRejectedValueOnce(new Error("x")).mockResolvedValue([]);
    setup({ adapter: { list } });
    await userEvent.click(await screen.findByRole("button", { name: "Try again" }));
    expect(await screen.findByText("No incentive programs yet")).toBeInTheDocument();
  });
});

describe("Create program (P1, full screen)", () => {
  it("walks the three steps, validates each, and returns to the list with a toast", async () => {
    setup();
    await table();
    await userEvent.click(screen.getAllByRole("button", { name: "Create program" })[0]!);
    expect(screen.getByRole("list", { name: "Progress" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();

    // Step 1: name is required.
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Enter a program name")).toBeInTheDocument();
    await userEvent.type(screen.getByRole("textbox", { name: /Program name/ }), "Welcome Bonus");
    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    // Step 2: nothing to enrol yet.
    expect(await screen.findByRole("heading", { name: "Enrollment criteria" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Add at least one rule or participant")).toBeInTheDocument();

    // Add a participant manually.
    await userEvent.click(screen.getByRole("button", { name: "Add participants" }));
    const picker = await screen.findByRole("dialog", { name: "Add participants" });
    await userEvent.click(await within(picker).findByRole("checkbox", { name: /Aisha Khan/ }));
    await userEvent.click(within(picker).getByRole("button", { name: "Add 1 participant" }));
    expect(within(screen.getByRole("table", { name: "Manual enrollment" })).getByText("Aisha Khan")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    // Step 3: block the same participant; blocking wins.
    expect(await screen.findByRole("heading", { name: "Participant blocking" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Add blocked participant" }));
    const block = await screen.findByRole("dialog", { name: "Add blocked participant" });
    await userEvent.click(await within(block).findByRole("checkbox", { name: /Aisha Khan/ }));
    await userEvent.type(within(block).getByRole("textbox", { name: "Reason (optional)" }), "Bonus abuse");
    await userEvent.click(within(block).getByRole("button", { name: "Block 1 participant" }));
    expect(screen.getByRole("table", { name: "Blocked participants" })).toHaveTextContent("Bonus abuse");
    expect(screen.getByText("Aisha Khan is also in Manual enrollment")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Create program" }));
    expect(await screen.findByText("“Welcome Bonus” created.")).toBeInTheDocument();
    expect(within(await table()).getByRole("row", { name: /Welcome Bonus/ })).toHaveTextContent("1 manual only");
  });

  it("warns and removes rules when the participant type changes", async () => {
    setup({ programs: [program({ id: "d1", name: "Draft one", status: "draft", criteria: { match: "all", items: [{ kind: "rule", id: "r", object: "contact", field: "kyc", condition: "is", value: "ok" }] } })] });
    await userEvent.click(await screen.findByRole("button", { name: "Draft one" }));
    await userEvent.click(await screen.findByRole("radio", { name: "IB" }));
    const dialog = screen.getByRole("alertdialog", { name: "Change participant type to IB?" });
    expect(dialog).toHaveTextContent("1 rule uses objects this type doesn’t have.");
    await userEvent.click(within(dialog).getByRole("button", { name: "Change and remove" }));
    expect(screen.getByRole("radio", { name: "IB" })).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("No rules yet", { selector: "h3" })).toBeInTheDocument();
  });

  it("flags a live program and a rule on a deleted CRM field, and blocks saving", async () => {
    setup({
      programs: [program({ id: "p9", name: "Live one", criteria: { match: "all", items: [{ kind: "rule", id: "s", object: "account", field: "region", fieldLabel: "Region", condition: "is", value: "EMEA" }] } })],
    });
    await userEvent.click(await screen.findByRole("button", { name: "Live one" }));
    expect(await screen.findByText("This program is live")).toBeInTheDocument();
    await userEvent.type(screen.getByRole("textbox", { name: /Program name/ }), " 2");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("heading", { name: "Enrollment criteria" })).toBeInTheDocument();
    expect(screen.getAllByText("A rule uses a CRM field that no longer exists").length).toBeGreaterThan(0);
    expect(screen.getByText("Field no longer exists in the CRM")).toBeInTheDocument();
  });

  it("asks before leaving with unsaved changes", async () => {
    setup();
    await table();
    await userEvent.click(screen.getAllByRole("button", { name: "Create program" })[0]!);
    await userEvent.type(screen.getByRole("textbox", { name: /Program name/ }), "Temp");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    const dialog = screen.getByRole("alertdialog", { name: "Leave without saving?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Discard and leave" }));
    expect(await table()).toBeInTheDocument();
  });

  it("shows the CRM error state with retry on step 2", async () => {
    setup({ failSchema: true });
    await table();
    await userEvent.click(screen.getAllByRole("button", { name: "Create program" })[0]!);
    await userEvent.type(screen.getByRole("textbox", { name: /Program name/ }), "X");
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Couldn't load CRM fields")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});

it("saves a draft without leaving the editor", async () => {
  setup();
  await table();
  await userEvent.click(screen.getAllByRole("button", { name: "Create program" })[0]!);
  await userEvent.type(screen.getByRole("textbox", { name: /Program name/ }), "Saved draft");
  await userEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() => expect(screen.getByText("All changes saved")).toBeInTheDocument());
  expect(screen.getByRole("list", { name: "Progress" })).toBeInTheDocument();
});
