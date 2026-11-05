export const ACTIVE_STAGES = ["saved", "packet_ready", "submitted", "screening", "interview", "offer"] as const;
export const END_STAGES = ["rejected", "withdrawn", "ghosted"] as const;
export const STAGES = [...ACTIVE_STAGES, ...END_STAGES] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  saved: "Saved",
  packet_ready: "Packet ready",
  submitted: "Submitted",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  ghosted: "Ghosted",
};

export function isEndStage(stage: Stage): boolean {
  return (END_STAGES as readonly string[]).includes(stage);
}

export function canMove(from: Stage, to: Stage): boolean {
  if (from === to) return false;
  if (isEndStage(to)) return true;
  if (isEndStage(from)) return from === "ghosted";
  return ACTIVE_STAGES.indexOf(to as (typeof ACTIVE_STAGES)[number]) > ACTIVE_STAGES.indexOf(from as (typeof ACTIVE_STAGES)[number]);
}

export function hasBeenSent(stage: Stage): boolean {
  return (ACTIVE_STAGES as readonly string[]).indexOf(stage) >= ACTIVE_STAGES.indexOf("submitted");
}

const NEXT_STAGE: Partial<Record<Stage, Stage>> = {
  saved: "submitted",
  packet_ready: "submitted",
  submitted: "screening",
  screening: "interview",
  interview: "offer",
};

export function nextStage(stage: Stage): Stage | undefined {
  return NEXT_STAGE[stage];
}

export function movesFrom(stage: Stage): Stage[] {
  return STAGES.filter((to) => canMove(stage, to));
}
