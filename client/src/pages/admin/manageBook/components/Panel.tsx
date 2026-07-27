import type { ReactNode } from "react";

export function Panel({
    step,
    title,
    description,
    children,
    style
}: {
    step?: string;
    title: string;
    description?: string;
    children: ReactNode;
    style?: React.CSSProperties
}) {
    return (
        <section className="admin-panel" style={style}>
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
