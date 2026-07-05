import type { Key, ReactNode } from "react";
import "../../styles/admin/datatable.scss";

export interface DatatableColumn<T> {
    key: string;
    header: ReactNode;
    render: (row: T) => ReactNode;
    title?: (row: T) => string;
    className?: string;
    headerClassName?: string;
    width?: number | string;
}

interface DatatableProps<T> {
    title?: ReactNode;
    columns: DatatableColumn<T>[];
    rows: T[];
    getRowKey: (row: T) => Key;
    emptyMessage?: ReactNode;
    className?: string;
}

export default function Datatable<T>({
    title,
    columns,
    rows,
    getRowKey,
    emptyMessage = "No records found.",
    className,
}: DatatableProps<T>) {
    const wrapperClassName = ["datatable-wrapper", className].filter(Boolean).join(" ");

    return (
        <div className={wrapperClassName}>
            {title && (
                <div className="datatable-header">
                    <div className="datatable-title">{title}</div>
                </div>
            )}

            {rows.length === 0 ? (
                <div className="datatable-empty-state">{emptyMessage}</div>
            ) : (
                <table className="datatable">
                    <colgroup>
                        {columns.map((column) => (
                            <col
                                key={column.key}
                                style={column.width ? { width: column.width } : undefined}
                            />
                        ))}
                    </colgroup>
                    <thead>
                        <tr>
                            {columns.map((column) => (
                                <th key={column.key} className={column.headerClassName}>
                                    {column.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={getRowKey(row)}>
                                {columns.map((column) => (
                                    <td key={column.key} className={column.className} title={column.title?.(row)}>
                                        {column.render(row)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
