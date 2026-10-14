import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Radio, RadioGroup } from "./Radio";

const OPTIONS = [
  { value: "client", label: "Client", description: "Clients with a CRM account." },
  { value: "ib", label: "IB", description: "Introducing brokers and partners." },
];

describe("Radio", () => {
  it("is a labelled radio with an accessible description", () => {
    render(<Radio name="t" value="client" label="Client" description="Clients with a CRM account." />);
    const radio = screen.getByRole("radio", { name: "Client" });
    expect(radio).toHaveAccessibleDescription("Clients with a CRM account.");
  });
  it("supports checked and disabled states", () => {
    render(<Radio name="t" value="ib" label="IB" defaultChecked disabled />);
    const radio = screen.getByRole("radio", { name: "IB" });
    expect(radio).toBeChecked();
    expect(radio).toBeDisabled();
  });
});

describe("RadioGroup", () => {
  it("groups options under a legend", () => {
    render(<RadioGroup legend="Participant type" name="ptype" options={OPTIONS} defaultValue="client" required />);
    const group = screen.getByRole("group", { name: /Participant type/ });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Client" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "IB" })).toBeRequired();
  });
  it("reports the chosen value", async () => {
    const onChange = vi.fn();
    render(<RadioGroup legend="Participant type" name="ptype" options={OPTIONS} defaultValue="client" onChange={onChange} />);
    await userEvent.click(screen.getByRole("radio", { name: "IB" }));
    expect(onChange).toHaveBeenCalledWith("ib");
    expect(screen.getByRole("radio", { name: "IB" })).toBeChecked();
  });
  it("works as a controlled group", async () => {
    function Controlled() {
      const [v, setV] = useState("client");
      return <RadioGroup legend="Participant type" name="ptype" options={OPTIONS} value={v} onChange={setV} />;
    }
    render(<Controlled />);
    await userEvent.click(screen.getByText("IB"));
    expect(screen.getByRole("radio", { name: "IB" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Client" })).not.toBeChecked();
  });
  it("moves selection with arrow keys from a single tab stop", async () => {
    render(<RadioGroup legend="Participant type" name="ptype" options={OPTIONS} defaultValue="client" />);
    await userEvent.tab();
    expect(screen.getByRole("radio", { name: "Client" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: "IB" })).toBeChecked();
  });
  it("renders the card appearance", () => {
    render(<RadioGroup legend="Participant type" name="ptype" options={OPTIONS} appearance="card" orientation="horizontal" />);
    expect(screen.getByRole("group", { name: /Participant type/ })).toHaveAttribute("data-appearance", "card");
  });
  it("disables every option when the group is disabled", () => {
    render(<RadioGroup legend="Participant type" name="ptype" options={OPTIONS} disabled />);
    for (const r of screen.getAllByRole("radio")) expect(r).toBeDisabled();
  });
});
