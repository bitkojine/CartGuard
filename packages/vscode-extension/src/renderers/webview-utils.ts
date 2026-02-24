export const escapeHtml = (value: unknown): string => {
    if (value === null || value === undefined) {
        return "";
    }
    if (typeof value === "string") {
        return value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    return String(value as string | number | boolean)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

export const statusClass = (status: string): string => {
    const s = status.toLowerCase();
    if (s === "present" || s === "ready" || s === "pass") return "ok";
    if (s === "missing" || s === "blocked" || s === "fail") return "bad";
    if (s === "not_applicable") return "na";
    return "unknown";
};

export const evidenceTypeClass = (type: string): string => {
    if (type === "legal") return "evidence-legal";
    if (type === "marketplace") return "evidence-marketplace";
    return "evidence-best-practice";
};
