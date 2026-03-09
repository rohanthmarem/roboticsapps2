# Figma Make Prompt — Club Application Portal

## The Concept

Design a full web application portal for student club and executive position applications at a university. Think CommonApp meets Lettuce Meet meets a playful student org brand. The portal should feel polished and institutional enough to be taken seriously, but with enough personality and warmth that students actually enjoy using it. Two distinct experiences live under one roof: an **applicant-facing portal** and an **admin/reviewer portal**.

---

## Applicant Portal

### Dashboard & Home

The first thing an applicant sees after logging in. A personalized dashboard that shows their name, a progress overview of all applications they've started or submitted, and a timeline/calendar widget displaying upcoming deadlines — interview windows, decision release dates, and any live events. The dashboard should feel like a workspace, not a form. Think progress rings or bars, status chips (Draft, Submitted, Under Review, Interview Scheduled, Decision Released), and a warm greeting that changes based on time of day.

### Program Selection

A page where the applicant browses and selects which clubs and positions they're applying to. Each club should have a card with its logo, a short tagline, and the roles available (President, VP Events, Director of Marketing, etc.). Applicants can check off multiple positions across multiple clubs. Once selected, these populate into their application flow. The UI should make it easy to add or remove selections without losing any work already done on a partial application.

### Profile & Prior Details Section

A section where applicants fill in their background relevant to the clubs they're applying to. Fields like: which team/club they were previously part of, what role they held, what they accomplished or won, how long they were involved. This should feel structured but not rigid — dropdown selectors for club names and roles, with freeform text for accomplishments. If the applicant has prior involvement with the club they're applying to, this section should feel like a natural place to surface that history.

### Activity List (CommonApp Style)

This is a core feature. Applicants can add up to 10 activities, each with constrained fields:

- **Activity type** — dropdown (Athletics, Arts, Community Service, Club, Work, Research, Other, etc.)
- **Position/Role** — 50 character limit
- **Organization name** — 100 character limit
- **Description of role, accomplishments, and honors** — 150 character limit
- **Duration** — which years they participated (checkboxes for Year 1, Year 2, Year 3, Year 4)
- **Time commitment** — hours per week, weeks per year
- **Continue in the future?** — yes/no toggle

The add/remove UI should be clean and satisfying. Drag-to-reorder so applicants can prioritize their most important activities at the top. Live character counters that change color as the limit approaches. An empty state that feels inviting rather than intimidating when no activities have been added yet.

### Written Responses

Short-answer and essay prompts, configurable per club. Each prompt has a visible word or character limit with a live counter. Auto-save indicator so students never worry about losing progress. Clean, distraction-free text input areas — generous line height, comfortable font size.

### Honors & Awards

A compact section (up to 5 entries) where applicants list recognitions. Each entry has a title field (100 characters), grade level selector, and recognition level dropdown (School, Regional, National, International).

### Interview Booking (Lettuce Meet Style)

Once an application is submitted and the applicant is moved to the interview stage, they gain access to a scheduling interface. A calendar view shows available time slots set by the admin team. Applicants pick a slot, confirm, and receive a confirmation with details. The calendar should also passively show key dates — when decisions come out, when the next application cycle opens, etc. Think of it as both a booking tool and a timeline reference.

### Decisions & Letters

A dedicated section for receiving outcomes. When decisions are released, applicants see status updates on their dashboard that link to a full decision letter page. Support for:

- **Likely letters** — early positive signals before the official decision
- **Admission emails** — the full acceptance with next steps
- **Update emails** — status changes, waitlist movement, additional info requests
- **Rejection / not selected** — handled with warmth and encouragement

Each letter type should have its own visual treatment. Acceptances should feel celebratory (this is where the **confetti button** lives — a button the applicant can smash to trigger a confetti animation when they get good news). Rejections should feel respectful and never cold.

### Easter Egg

Hide something delightful somewhere in the application that rewards curious students. This could be a Konami code interaction, a hidden message in a tooltip, a clickable element that triggers an unexpected animation, or something tied to the club's inside culture. Keep it subtle and fun.

### Application Checklist & Status Tracker

A persistent sidebar or collapsible panel that tracks the applicant's completion across all required sections — profile, activities, essays, honors, submission status. Check marks, progress bars, or a visual stepper that makes it obvious what's done and what's left. Section-level indicators (Complete, In Progress, Not Started).

---

## Admin / Reviewer Portal

### Application Review Dashboard

A table or card-based view where admins see all submitted applications. Filterable by club, position, status (New, In Review, Interview Scheduled, Decision Made), and sortable by date submitted or applicant name. Each row or card links to a full application view.

### Individual Application View

The full read-only view of a single applicant's submission. All their profile info, activities, essays, honors, and prior involvement laid out cleanly for a reviewer. Inline scoring or rating tools — a rubric panel alongside the application content so reviewers can grade sections without switching contexts. Space for reviewer notes and comments.

### Application Management

Admins can edit application settings: open/close application windows, modify prompts and character limits, add or remove club/position options, set interview availability windows, and configure decision release dates. A settings panel that feels like a CMS — structured but flexible.

### Decision & Communication Tools

Tools for admins to draft and send likely letters, acceptance emails, rejection emails, and status updates. Template system with merge fields (applicant name, club name, position). Batch send capability. Preview before sending.

### Interview Slot Management

Admins set available time blocks for interviews. Calendar interface for creating and managing slots. View of who has booked what. Ability to reschedule or cancel slots.

---

## Design Direction

- Clean, modern, and slightly playful — somewhere between a polished SaaS product and a student-facing app. Avoid looking too corporate or too toy-like.
- Strong use of whitespace and clear visual hierarchy.
- A cohesive color system that can be themed per club or kept universal.
- Micro-interactions and transitions that make the portal feel alive — hover states, smooth page transitions, satisfying toggle and checkbox animations.
- Responsive across desktop and mobile.
- Accessibility-first — proper contrast, focus states, screen reader considerations.
- Typography should feel approachable but credible. Think Inter, Satoshi, or General Sans.

---

## Key Screens to Design

1. Applicant Dashboard (home/overview)
2. Program/Club Selection
3. Profile & Prior Details
4. Activity List (with add/edit/reorder interactions)
5. Written Response / Essay page
6. Interview Booking Calendar
7. Decision Letter page (acceptance with confetti, rejection, likely letter)
8. Application Checklist sidebar
9. Admin Review Dashboard (table view)
10. Admin Individual Application Review (with scoring rubric)
11. Admin Settings / Application Configuration
12. Admin Interview Slot Management