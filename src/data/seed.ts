import { Project, ExperienceEntry } from "../types";

// Used only to seed data/db.json the first time the server ever runs.
// After that, admin edits go straight into data/db.json — this file is not read again.
// (You can still edit it before the first run if you want different starting content.)
export const projects: Project[] = [
  {
    id: "project-one",
    name: "Project One",
    description:
      "Placeholder description — one or two sentences on the problem this project solved and the impact it had.",
    tags: ["Node.js", "Postgres", "Redis"],
    liveUrl: "#",
    sourceUrl: "#",
  },
  {
    id: "project-two",
    name: "Project Two",
    description: "Placeholder description — what you built, for whom, and why it mattered.",
    tags: ["React", "TypeScript"],
    liveUrl: "#",
    sourceUrl: "#",
  },
  {
    id: "project-three",
    name: "Project Three",
    description: "Placeholder description — highlight a technical challenge and how you solved it.",
    tags: ["Python", "AWS"],
    liveUrl: "#",
    sourceUrl: "#",
  },
  {
    id: "project-four",
    name: "Project Four",
    description:
      "Placeholder description — a side project or open-source contribution worth showing off.",
    tags: ["Go", "Docker"],
    liveUrl: "#",
    sourceUrl: "#",
  },
];

export const experience: ExperienceEntry[] = [
  {
    id: "exp-1",
    dateRange: "2024 — Present",
    role: "Senior Software Engineer",
    org: "Company Name",
    description: "Placeholder — describe scope, a key project, and a measurable outcome.",
  },
  {
    id: "exp-2",
    dateRange: "2022 — 2024",
    role: "Software Engineer",
    org: "Company Name",
    description: "Placeholder — describe scope, a key project, and a measurable outcome.",
  },
  {
    id: "exp-3",
    dateRange: "2020 — 2022",
    role: "Junior Developer",
    org: "Company Name",
    description: "Placeholder — describe scope, a key project, and a measurable outcome.",
  },
];
