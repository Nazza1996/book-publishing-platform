export function StatusPill({ label }: { label: string }) {
    const normalized = label.toLowerCase().replace(/\s+/g, "-");
    return <span className={`status-pill ${normalized}`}>{label}</span>;
}
