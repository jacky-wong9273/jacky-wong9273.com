/**
 * Centralized profile content.
 * Edit this single file to update Education, Experience, Certifications,
 * and social links across the entire site.
 */

import type {
  TimelineEntry,
  TimelineHighlight,
} from "../components/Timeline.astro";
import type { Qualification } from "../components/Qualifications.astro";

// ─── Skill category type ─────────────────────────────────────────────
export interface SkillCategory {
  label: string;
  color: "blue" | "purple" | "emerald" | "pink" | "amber";
  items: string[];
}

// ─── Social / Contact ────────────────────────────────────────────────
export const social = {
  email: "mailto:obwong.jacky@outlook.com",
  github: "https://github.com/jacky-wong9273",
  linkedin: "https://www.linkedin.com/in/jacky-wong-725143193/",
} as const;

// ─── Education ───────────────────────────────────────────────────────
export const education: TimelineEntry[] = [
  {
    date: "Sep 2025 — Jul 2027",
    title: "Master of Science in Computer Science",
    organization: "The University of Hong Kong",
    description: "CGPA: 3.77/4.3. Received FTSS scholarship (HKD 100,000).",
    tags: [
      "Cybersecurity",
      "Deep Learning",
      "Advanced Database Systems",
      "Copyright Law",
    ],
  },
  {
    date: "Sep 2019 — Jul 2024",
    title: "Bachelor of Arts and Sciences in Financial Technology",
    organization: "The University of Hong Kong",
    description:
      "Second class upper division (2:1). Second major in Computer Science.",
    highlights: [
      {
        date: "Jun 2023 — May 2024",
        title: "IT Intern — China International Capital Corporation (HK)",
        details: [
          "Communicated requirements with senior management and built 40+ scheduled data pipelines across 5 MySQL environments in for post-trade analysis.",
          "Automated 10+ SITs with Excel VBA for projects including WIND/Bloomberg data integration, complying OTCR/HKIDR standards and settlement calendars.",
          "Received part-time extension offer (Sep 2023).",
        ],
      },
      {
        date: "Aug 2022 — May 2023",
        title: "Placement Analyst Programmer — Hong Kong Monetary Authority",
        details: [
          "Managed functional enhancements of the banking survey system; liaised requirements with users & vendors and drafted 6+ RFPs/RFQs.",
          "Performed 50+ UATs/SITs and coordinated 10+ production deployments across application teams.",
        ],
      },
      {
        date: "Jul 2022 — Aug 2022",
        title: "FinTech Intern — Standard Chartered Bank (HK)",
        details: [
          "Developed an Excel VBA dashboard highlighting wealth management KPIs (AUM, new sales) across retail & private banking.",
          "Conducted competitor analysis on customer journeys & affluent client products to identify expansion opportunities.",
        ],
      },
      {
        date: "Jun 2021 — Aug 2021",
        title: "IT Development Trainee — Buddy-Co Limited",
        details: [
          "Co-developed a full-stack mobile & web app with React Native, Next.js, and AWS for user-generated blog content.",
          "Designed client digital on-boarding UI/UX and performed SEO optimisation on Google Search.",
        ],
      },
    ],
    tags: [
      "Software Engineering",
      "Machine Learning",
      "Data Mining",
      "Regulation of Financial Markets",
      "WWW Technologies",
      "Blockchain",
    ],
  },
];

// ─── Experience ──────────────────────────────────────────────────────
export const experience: TimelineEntry[] = [
  {
    date: "2024 — Present",
    title: "IT Officer",
    organization: "Golden Leaf International (HK) Limited",
    details: [
      "Leads the IT team to cover a full-range of IT services to 100+ users across offices in HK and Mainland China, including software project management, incident management, system and network administration, application support and helpdesk operations.",
      "Liaises with vendors and internal stakeholders to ensure timely delivery of IT services and initiaitives within budget.",
      "Conducts periodic IT risk assessment and implements security controls, reducing security incidents by 30%+ and ensuring compliance with data protection regulations.",
      "Promotes AI adoption in the organization by identifying 20+ use cases, developing AI solutions with the mainland China team, and providing training to staff.",
      "Introduces best practices and performs quality assurance in low-code automation, reducing 80%+ of application support tickets and improving user satisfaction.",
    ],
    tags: [
      "Project Delivery",
      "IT Operations",
      "Vendor Management",
      "IT Security",
      "AI Adoption",
    ],
  },
];

// ─── Certifications ──────────────────────────────────────────────────
export const certifications: Qualification[] = [
  {
    title: "Alibaba Cloud Certified Professional - Cloud Computing",
    institution: "Alibaba Cloud",
    year: "2023",
  },
];
