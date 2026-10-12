import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { SearchField } from "./SearchField";

function Harness({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return <SearchField label="Search tasks" value={value} onChange={setValue} />;
}

describe("SearchField", () => {
  it("is a named searchbox", () => {
    render(<Harness />);
    expect(screen.getByRole("searchbox", { name: "Search tasks" })).toBeInTheDocument();
  });

  it("types and clears", async () => {
    render(<Harness />);
    await userEvent.type(screen.getByRole("searchbox"), "pricing");
    expect(screen.getByRole("searchbox")).toHaveValue("pricing");
    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
  });
});
