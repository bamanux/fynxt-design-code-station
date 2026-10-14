import { render, screen, within } from "@testing-library/react";
import { DataTable } from "./DataTable";

type Row = { id: string; name: string; type: string };
const columns = [
  { id: "name", header: "Participant", cell: (r: Row) => r.name },
  { id: "type", header: "Type", cell: (r: Row) => r.type },
];

describe("DataTable", () => {
  it("renders a named table with column headers and rows", () => {
    render(<DataTable caption="Blocked participants" columns={columns} rows={[{ id: "1", name: "Marco Rossi", type: "Client" }]} getRowId={(r) => r.id} />);
    const table = screen.getByRole("table", { name: "Blocked participants" });
    expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Participant", "Type"]);
    expect(within(table).getByRole("cell", { name: "Marco Rossi" })).toBeInTheDocument();
  });
  it("shows the empty slot when there are no rows", () => {
    render(<DataTable caption="Blocked participants" columns={columns} rows={[]} getRowId={(r) => r.id} empty="No blocked participants" />);
    expect(screen.getByRole("cell", { name: "No blocked participants" })).toHaveAttribute("colspan", "2");
  });
});
