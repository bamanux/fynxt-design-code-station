import type { ReactNode } from "react";

export interface DataTableColumn<Row> {
  id: string;
  header: ReactNode;
  cell: (row: Row) => ReactNode;
  /** CSS width, e.g. "var(--fx-spacing-12)" or "30%". */
  width?: string;
  align?: "start" | "end" | "center";
}

export interface DataTableProps<Row> {
  /** Accessible table name (rendered as a visually hidden caption). */
  caption: string;
  columns: DataTableColumn<Row>[];
  rows: Row[];
  getRowId: (row: Row) => string;
  /** Shown in a full-width cell when there are no rows. */
  empty?: ReactNode;
}

/**
 * DataTable — semantic table styled after FDS-101 Data Table Header / Cell (DCF-0002 D12): 44px rows,
 * uppercase header labels, column dividers. Sorting, selection and column menus are out of scope (DCF-0003).
 */
export function DataTable<Row>({ caption, columns, rows, getRowId, empty }: DataTableProps<Row>) {
  return (
    <div className="fx-table">
      <table className="fx-table__table">
        <caption className="fx-visually-hidden">{caption}</caption>
        <colgroup>
          {columns.map((c) => (
            <col key={c.id} style={c.width ? { inlineSize: c.width, width: c.width } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.id} scope="col" className="fx-table__th" data-align={c.align}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="fx-table__td fx-table__empty" colSpan={columns.length}>
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={getRowId(row)}>
                {columns.map((c) => (
                  <td key={c.id} className="fx-table__td" data-align={c.align}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
