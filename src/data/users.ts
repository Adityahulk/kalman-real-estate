import type { Role } from "./types";

export interface Persona {
  id: string;
  name: string;
  role: Role;
  title: string;
  avatar: string;
  ownedPlotIds?: string[];
}

export const PERSONAS: Persona[] = [
  {
    id: "u-admin",
    name: "Amit Kalra",
    role: "super_admin",
    title: "Founder & CEO, Kalman Estate OS",
    avatar: "https://api.dicebear.com/9.x/initials/svg?seed=Amit%20Kalra&backgroundColor=0B1B3B&textColor=C9A227"
  },
  {
    id: "u-engineer",
    name: "Gurpreet Singh",
    role: "site_engineer",
    title: "Lead Site Engineer — Saldha Land Developers",
    avatar: "https://api.dicebear.com/9.x/initials/svg?seed=Gurpreet%20Singh&backgroundColor=0B1B3B&textColor=C9A227"
  },
  {
    id: "u-owner",
    name: "Rajiv Bansal",
    role: "plot_owner",
    title: "Plot Owner — Vrinda Enclave A-12, ALP Greens B-04",
    avatar: "https://api.dicebear.com/9.x/initials/svg?seed=Rajiv%20Bansal&backgroundColor=0B1B3B&textColor=C9A227",
    ownedPlotIds: ["mh-A-12", "pg-B-04"]
  },
  {
    id: "u-marketing",
    name: "Neha Arora",
    role: "marketing_head",
    title: "Head of Marketing",
    avatar: "https://api.dicebear.com/9.x/initials/svg?seed=Neha%20Arora&backgroundColor=0B1B3B&textColor=C9A227"
  },
  {
    id: "u-video",
    name: "Karan Sethi",
    role: "videographer",
    title: "Senior Videographer",
    avatar: "https://api.dicebear.com/9.x/initials/svg?seed=Karan%20Sethi&backgroundColor=0B1B3B&textColor=C9A227"
  },
  {
    id: "u-editor",
    name: "Mehak Sharma",
    role: "editor",
    title: "Video Editor",
    avatar: "https://api.dicebear.com/9.x/initials/svg?seed=Mehak%20Sharma&backgroundColor=0B1B3B&textColor=C9A227"
  }
];

export function findPersona(role: Role) {
  return PERSONAS.find((p) => p.role === role)!;
}
