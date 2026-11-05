export type Kind = "facts" | "projects" | "stories" | "answers";

export const KIND_LABELS: Record<Kind, string> = {
  facts: "Achievements and history",
  projects: "Things I built",
  stories: "Interview stories",
  answers: "Form answers",
};
