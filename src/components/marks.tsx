import type { Entry } from "@/lib/vault/entries";

const STATUS_LABELS = { confirmed: "Confirmed", draft: "Draft", rejected: "Rejected" };

export function StatusMark({ status }: { status: Entry["status"] }) {
  return <span className={`mark mark-${status}`}>{STATUS_LABELS[status]}</span>;
}

export function VisibilityMark({ visibility }: { visibility: Entry["visibility"] }) {
  return <span className={`mark mark-${visibility}`}>{visibility === "private" ? "Private" : "Public"}</span>;
}
