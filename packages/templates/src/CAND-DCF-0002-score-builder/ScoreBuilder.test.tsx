import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScoreBuilder } from "./ScoreBuilder";
import { ScoreEditor } from "./ScoreEditor";
import { createScoreMemoryAdapter, defaultDuplicateName } from "./memoryAdapter";
import { completeModel, operatorsByType, schema } from "./fixtures.test-data";
import type { ScoreBuilderConfig, ScoreModel } from "./types";

beforeEach(() => {
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    cb(0);
    return 0;
  });
});

function config(models: ScoreModel[] = [completeModel()], over: Partial<ScoreBuilderConfig> & { failNextSave?: boolean } = {}): ScoreBuilderConfig {
  const { failNextSave, ...rest } = over;
  return {
    adapter: createScoreMemoryAdapter({ models, schema, currentUser: "A. Bansal", savedStatus: "active", draftStatus: "draft", failNextSave }),
    can: () => true,
    currentUser: "A. Bansal",
    statuses: [
      { value: "active", label: "Active", tone: "success" },
      { value: "inactive", label: "Inactive", tone: "neutral" },
      { value: "draft", label: "Draft", tone: "warning" },
    ],
    activeStatus: "active",
    inactiveStatus: "inactive",
    draftStatus: "draft",
    categories: ["Low", "Medium", "High"],
    operatorsByType,
    outcomeTypes: [
      { value: "forceBand", label: "Force band" },
      { value: "atLeastBand", label: "At least band" },
      { value: "setScore", label: "Set score" },
      { value: "reject", label: "Reject" },
      { value: "refer", label: "Refer to compliance" },
    ],
    descriptionMaxWords: 250,
    weightTotal: 100,
    duplicateName: defaultDuplicateName,
    copy: { pageTitle: "Score Builder", sectionTitle: "All score models", sectionDescription: "Weighted scores for CRM objects", breadcrumb: ["Settings", "Brand Setup", "Score Builder"], howItWorks: "Add objects and their attributes." },
    ...rest,
  };
}

const table = () => screen.findByRole("table", { name: "All score models" });

describe("Score Builder list (DCF-0002 P2)", () => {
  it("shows models with band descriptions as tooltips", async () => {
    render(<ScoreBuilder config={config()} />);
    const t = await table();
    const row = within(t).getByRole("row", { name: /Client Risk Score/ });
    expect(row).toHaveTextContent("Contact");
    expect(row).toHaveTextContent("Contact › User Type is Contact");
    expect(within(row).getByRole("switch", { name: "Client Risk Score active" })).toHaveAttribute("aria-checked", "true");
    (within(row).getByText("Low Risk").closest("span[tabindex]") as HTMLElement).focus();
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Standard due diligence.");
  });

  it("duplicates as <Name>_copy(n) Draft (Q67)", async () => {
    render(<ScoreBuilder config={config()} />);
    await userEvent.click(within(await table()).getByRole("button", { name: "Actions for Client Risk Score" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Duplicate" }));
    expect(await screen.findByText("Copy created as Draft: Client Risk Score_copy(1)")).toBeInTheDocument();
    const copy = await within(await table()).findByRole("row", { name: /Client Risk Score_copy\(1\)/ });
    expect(copy).toHaveTextContent("Draft");
  });

  it("deletes after confirming", async () => {
    render(<ScoreBuilder config={config([completeModel(), completeModel({ id: "m2002", code: "2002", name: "Deal Score" })])} />);
    await userEvent.click(within(await table()).getByRole("button", { name: "Actions for Deal Score" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    const dialog = screen.getByRole("alertdialog", { name: "Delete Deal Score?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(await screen.findByText("Score model deleted")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("row", { name: /Deal Score/ })).not.toBeInTheDocument());
  });

  it("asks before turning a model off", async () => {
    render(<ScoreBuilder config={config()} />);
    const sw = within(await table()).getByRole("switch", { name: "Client Risk Score active" });
    await userEvent.click(sw);
    const dialog = screen.getByRole("alertdialog", { name: "Turn off Client Risk Score?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Turn off" }));
    await waitFor(() => expect(screen.getByRole("switch", { name: "Client Risk Score active" })).toHaveAttribute("aria-checked", "false"));
  });

  it("filters by object and shows a no-results state for search", async () => {
    render(<ScoreBuilder config={config()} />);
    await table();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Object" }), "deal");
    expect(await screen.findByText("No score models match these filters")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear all" }));
    await userEvent.type(screen.getByRole("searchbox", { name: "Search score models" }), "credit");
    expect(await screen.findByText("No score models match “credit”")).toBeInTheDocument();
  });
});

describe("Score Builder editor (DCF-0002 P1)", () => {
  it("creates a model step by step and returns to the list", async () => {
    render(<ScoreBuilder config={config([])} />);
    await userEvent.click(await screen.findByRole("button", { name: "Create score model" }));

    // Full screen: no app shell, Save disabled while there are issues.
    expect(screen.getByRole("navigation", { name: "Model outline" })).toBeInTheDocument();
    const save = screen.getByRole("button", { name: "Save score model" });
    expect(save).toBeDisabled();
    await userEvent.type(screen.getByRole("textbox", { name: /Score model name/ }), "Client & Deal Score");

    // Add Contact, choose AND.
    await userEvent.click(await screen.findByRole("button", { name: "Add object" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Contact" }));
    expect(screen.getByRole("heading", { name: "Contact" })).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole("main", { name: "Editor" })).getByRole("radio", { name: "AND" }));

    // Add two attributes at once.
    await userEvent.click(screen.getByRole("button", { name: "Add attribute" }));
    const dialog = screen.getByRole("dialog", { name: "Add Contact attributes" });
    await userEvent.click(within(dialog).getByRole("checkbox", { name: "Country" }));
    await userEvent.click(within(dialog).getByRole("checkbox", { name: "Occupation" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Add 2 attributes" }));

    // Country editor: Low / Medium / High preset, fill one row, remove the others.
    expect(screen.getByRole("heading", { name: "Country" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Add Low / Medium / High rows" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove row 3" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove row 2" }));
    await userEvent.click(screen.getByRole("combobox", { name: "Values, row 1" }));
    await userEvent.click(screen.getByRole("option", { name: "India" }));
    await userEvent.type(screen.getByRole("spinbutton", { name: "Score, row 1" }), "10");

    // Distribute evenly sets 50 / 50 and the contribution updates live (R10).
    await userEvent.click(screen.getAllByRole("button", { name: "Distribute evenly" })[0]!);
    expect(screen.getByRole("spinbutton", { name: "Weight %" })).toHaveValue(50);
    expect(within(screen.getByRole("table", { name: "Country values" })).getByText("5.0")).toBeInTheDocument();

    // Occupation.
    await userEvent.click(screen.getByRole("button", { name: /^Occupation/ }));
    await userEvent.click(screen.getByRole("button", { name: "Add value" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Category, row 1" }), "High");
    await userEvent.click(screen.getByRole("combobox", { name: "Values, row 1" }));
    await userEvent.click(screen.getByRole("option", { name: "Student" }));
    await userEvent.type(screen.getByRole("spinbutton", { name: "Score, row 1" }), "90");

    // Outcome bands with label + description (D28).
    await userEvent.click(screen.getByRole("button", { name: "Outcome bands" }));
    await userEvent.click(screen.getByRole("button", { name: "Add band" }));
    await userEvent.click(screen.getByRole("button", { name: "Add band" }));
    await userEvent.type(screen.getByRole("spinbutton", { name: "Band 1 upper limit" }), "55");
    await userEvent.type(screen.getByRole("textbox", { name: "Band 1 label" }), "Low Risk");
    await userEvent.type(screen.getByRole("textbox", { name: "Band 1 description" }), "Standard due diligence");
    expect(screen.getByText("3 / 250 words")).toBeInTheDocument();
    await userEvent.type(screen.getByRole("textbox", { name: "Band 2 label" }), "High Risk");

    expect(save).toBeEnabled();
    await userEvent.click(save);
    expect(await screen.findByText("Score model “Client & Deal Score” saved")).toBeInTheDocument();
    expect(await within(await table()).findByRole("row", { name: /Client & Deal Score/ })).toBeInTheDocument();
  });

  it("lists issues, jumps to them, and asks before discarding", async () => {
    const onClose = vi.fn();
    render(<ScoreEditor config={config()} onClose={onClose} />);
    await userEvent.type(screen.getByRole("textbox", { name: /Score model name/ }), "Draft model");
    await userEvent.click(await screen.findByRole("button", { name: /issues?$/ }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Add at least one object to score" }));
    expect(screen.getByRole("heading", { name: "Model details" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Back to Score Builder" }));
    const dialog = screen.getByRole("alertdialog", { name: "Discard unsaved changes?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Keep editing" }));
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Discard" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("hides the summary into a floating button with the issue count and shows it again (D31)", async () => {
    render(<ScoreEditor config={config()} onClose={() => {}} />);
    expect(screen.getByRole("complementary", { name: "Summary" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Hide summary" }));
    expect(screen.queryByRole("complementary", { name: "Summary" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^Show summary, \d+ issues?$/ }));
    expect(screen.getByRole("complementary", { name: "Summary" })).toBeInTheDocument();
  });

  it("keeps changes after a failed save and retries", async () => {
    const onClose = vi.fn();
    render(<ScoreEditor config={config([completeModel()], { failNextSave: true })} modelId="m2001" onClose={onClose} />);
    await userEvent.type(await screen.findByRole("textbox", { name: /Score model name/ }), " v2");
    await userEvent.click(screen.getByRole("button", { name: "Save score model" }));
    expect(await screen.findByText("Couldn't save the score model")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Score model name/ })).toHaveValue("Client Risk Score v2");
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledWith("Score model “Client Risk Score v2” saved"));
  });

  it("shows a not-found state for a missing model", async () => {
    render(<ScoreEditor config={config([])} modelId="missing" onClose={() => {}} />);
    expect(await screen.findByText("This score model no longer exists")).toBeInTheDocument();
  });

  it("warns when removing an object an override depends on", async () => {
    const m = completeModel({ overrides: [{ id: "o1", objectId: "g1", conditions: { match: "all", items: [{ kind: "rule", id: "c1", object: "contact", field: "country", condition: "is", value: "in" }] }, outcome: { type: "reject", value: "" } }] });
    render(<ScoreEditor config={config([m])} modelId="m2001" onClose={() => {}} />);
    await userEvent.click(await screen.findByRole("button", { name: "Contact actions" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Remove object" }));
    expect(screen.getByRole("alertdialog", { name: "Remove Contact from this model?" })).toHaveTextContent("1 override rule uses it and will be removed too.");
  });
});
