import { useState } from "react";
import { bookStatusLabels } from "../constants";
import { formatBookStatus } from "../helpers";
import type { BookStatus } from "../types";
import { StatusPill } from "./StatusPill";

export function BookStatusDropdown({
    status,
    onChange,
    disabled = false
}: {
    status: BookStatus;
    onChange: (status: BookStatus) => void;
    disabled?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div
            className="status-dropdown"
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                    setIsOpen(false);
                }
            }}
        >
            <button
                type="button"
                className="status-dropdown-trigger"
                onClick={() => setIsOpen((current) => !current)}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label="Change book status"
            >
                <StatusPill label={formatBookStatus(status)} />
            </button>

            {isOpen && (
                <div className="status-dropdown-menu" role="listbox" aria-label="Book status options">
                    {Object.entries(bookStatusLabels).map(([value, label]) => {
                        const optionStatus = value as BookStatus;

                        return (
                            <button
                                key={value}
                                type="button"
                                className={`status-dropdown-option ${status === optionStatus ? "active" : ""}`}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                    setIsOpen(false);
                                    onChange(optionStatus);
                                }}
                                role="option"
                                aria-selected={status === optionStatus}
                            >
                                <StatusPill label={label} />
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
