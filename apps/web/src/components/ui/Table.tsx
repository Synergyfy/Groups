import type { ReactNode } from "react";

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  align?: "left" | "right" | "center";
  render: (row: T) => ReactNode;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  renderCard?: (row: T) => ReactNode;
}

const ALIGN_CLASS = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const;

export default function Table<T>({
  columns,
  rows,
  rowKey,
  emptyMessage,
  renderCard,
}: TableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-ink-900/50 p-8 text-center text-sm text-slate-500">
        {emptyMessage ?? "No records found."}
      </div>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-2 md:hidden">
        {rows.map((row) => (
          <li
            key={rowKey(row)}
            className="rounded-2xl border border-white/10 bg-ink-900/70 p-4"
          >
            {renderCard ? (
              renderCard(row)
            ) : (
              <DefaultCard columns={columns} row={row} />
            )}
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-2xl border border-white/10 bg-ink-900/70 md:block">
        <table className="w-full min-w-[40rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-ink-850">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 ${ALIGN_CLASS[column.align ?? "left"]}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.03]"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3 text-slate-300 ${ALIGN_CLASS[column.align ?? "left"]}`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function DefaultCard<T>({ columns, row }: { columns: TableColumn<T>[]; row: T }) {
  const [lead, ...rest] = columns;
  return (
    <div>
      <div className="text-sm font-semibold leading-snug text-white">
        {lead.render(row)}
      </div>
      <dl className="mt-2.5 space-y-1.5">
        {rest.map((column) => (
          <div key={column.key} className="flex items-start justify-between gap-3">
            <dt className="shrink-0 text-[11px] uppercase tracking-wide text-slate-500">
              {column.header}
            </dt>
            <dd className="min-w-0 text-right text-xs text-slate-300">
              {column.render(row)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
