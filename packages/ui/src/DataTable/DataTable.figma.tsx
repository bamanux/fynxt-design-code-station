import figma from "@figma/code-connect";
import { DataTable } from "./DataTable";

// DCF-0003: maps to FDS-101 Data Table Header (D12). Cells are composed per column.
figma.connect(DataTable, "https://www.figma.com/design/3c44QQCA8h7GTZYH2EWn8H/FDS-101?node-id=522-11885", {
  example: () => <DataTable caption="Table" columns={[]} rows={[]} getRowId={() => ""} />,
});
