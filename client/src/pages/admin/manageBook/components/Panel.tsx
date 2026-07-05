import type { ReactNode } from "react";

export function Panel({
    step,
    title,
    description,
    children
}: {
    step?: string;
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <section className="admin-panel">
            <div className="admin-panel-header">
                {step && <span className="step-badge">{step}</span>}
                <div>
                    <h2>{title}</h2>
                    {description && <p>{description}</p>}
                </div>
            </div>
            <div className="admin-panel-body">{children}</div>
        </section>
    );
}
