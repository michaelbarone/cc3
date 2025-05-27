## 11. Initial Architect Prompt

Based on our discussions and requirements analysis for the **ControlCenter** project, I've compiled the following technical guidance from this PRD to inform your architecture analysis and decisions when you eventually operate in "Architecture Creation Mode":

**Key Technical Pillars (from PRD Sections 5 & 6):**

* **Repository & Service Architecture Decision:** Monorepo with Next.js application handling both frontend and backend (API) functionalities. Architecture is a Monolith, leveraging Next.js full-stack capabilities. Rationale: Simplicity for a personal application.
* **Core Technology Stack:**
    * Frontend: Next.js 15.2.2 (App Router), React 19, TypeScript 5, Material UI v6, Emotion.
    * Backend: Next.js API Routes, Prisma ORM v6.5.0, NextAuth.js v4, JWT.
    * Database: SQLite.
    * State Management (Client): React Context/Hooks.
    * Testing: Vitest, React Testing Library, MSW, Happy DOM, Playwright (E2E).
    * Dev Tooling: ESLint, Prettier, Husky, Conventional Commits, Docker.
* **Starter Project:** Built upon an existing bootstrapped repository.
* **Deployment:** Local home server via Docker container.

**Key Technical Constraints & Considerations (from PRD NFRs & Assumptions):**
* High availability for 24/7 home use.
* Data integrity is crucial (backup/restore is a core feature).
* Performance: Fast initial load, snappy UI. Iframe performance handled gracefully.
* Security: Standard input sanitization, secure session management. Password policies via NextAuth.js defaults are acceptable due to firewalled environment.
* Detailed Application Directory Structure is provided in Section 6.

**Architectural Focus Areas (Implied by Epics):**
* Robust and secure authentication/authorization (Epic 1 & 2).
* Scalable (for features, not users) data models for URLs, Groups, User Access, Settings, Logs (Epic 3 & others).
* Efficient client-side state management for complex UI interactions (Epic 4 - iframes, menu preferences).
* Reliable backend APIs for all CRUD operations and system functions (Admin & User facing).
* Secure and manageable backup/restore mechanisms (Epic 5).
* Consideration for the "Very Technical" workflow chosen, meaning developers will implement directly from detailed stories; architectural patterns should support this clarity.

Please use this PRD as your primary input to design a comprehensive and implementable architecture if a dedicated architecture document is needed beyond the decisions already embedded herein.
[triple-tick]