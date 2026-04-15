# ECS506U-Software-Engineering-Project Group 18

## Quick Info

- [QMPlus Page](https://qmplus.qmul.ac.uk/course/view.php?id=15588)
- Lab Time: 10:15

## Project Description

#### PawKeeper

PawKeeper is a web application connecting pet owners with pet minders. Owners can discover minders by service type, location, and availability; minders can manage their schedule, accept bookings, and build a reputation through reviews.

**Implemented features:**
- Dual-role accounts — users can register as an owner, a minder, or both
- Minder profiles with service types, pricing, availability schedules, and a bio
- Pet profiles (owners can register multiple pets with species, breed, and care notes)
- Search and discovery — filter minders by service type and location
- Full booking lifecycle: request → accept/decline → confirmed session → cancellation → completion
- Booking lead-time rules and automatic rejection of stale pending requests
- Dispute system — either party can raise a dispute on a completed booking; admin resolves it; each booking can only be disputed once
- Review and rating system — owners leave reviews after completed bookings
- Admin panel — manage users, view platform statistics, moderate disputes
- Dark/light mode

**Out of scope (future work):**
- Live activity tracking during sessions (e.g. GPS walk tracking, real-time owner view) — deprioritised in favour of completing the full booking and dispute lifecycle; the session data model is in place and Supabase Realtime would provide the subscription layer for a future iteration.

## Running the App

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm (comes with Node.js)

### Steps

1. **Clone the repository** (if you haven't already):

   ```bash
   git clone https://github.com/RayyanPC/ECS506U-Software-Engineering-Project.git
   cd ECS506U-Software-Engineering-Project
   ```

2. **Navigate to the app directory:**

   ```bash
   cd pet-minder
   ```

3. **Install dependencies:**

   ```bash
   npm install
   ```

4. **Set up environment variables:**

   Create a `.env` file inside `pet-minder/` with the following contents:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
   ```

   > The app uses a shared hosted Supabase project — no local database setup is required.

5. **Start the development server:**

   ```bash
   npm run dev
   ```

   The app will be available at [http://localhost:3000](http://localhost:3000).


---

## Module Description
Brief description about this module:

Available on the module descriptor [here](https://intranet.eecs.qmul.ac.uk/courses/descriptor/eecsismodule/mod/ECS506U)

## Learning Aims and Outcomes
The primary learning outcome in this module is that you will think about learning as a mindset and a process - it has no end point.

By the end of the module the student will be able to:

- Acquire technical knowledge: Understand difference between programming in the small and software system construction; Understand and use object oriented design techniques and software quality assurance methods; Produce a range of documentation necessary for software systems. Understand how to deliver systems incrementally;
- Acquire practical & managerial knowledge: Work in a team environment to produce a high quality software system within budget & time while dealing with complexity and change; Understand the principles of risk management in software engineering and relevant ethical, professional and legal issues;
- Acquire highly marketable skills: become proficient in UML - the most widely used method for object oriented system design (and a case tool to support it); be able to build 'real- world' Java programs using a widely used programming environment;

## Timetable for Deliverables 

| Phase                     | Item          | Weight | Deadline            | Duration |
|---------------------------|---------------|--------|---------------------|----------|
| Domain Analysis           | Report        | 15%    | Monday 9th Feb      | 3 weeks  |
| Domain Analysis           | Presentation  | 10%    | Thursday 12th Feb    | 3 weeks  |
| Requirements Elicitation  | Report        | 15%    | Monday 23rd Feb     | 2 weeks  |
| Requirements Elicitation  | Presentation  | 10%    | Thursday 26th Feb   | 2 weeks  |
| Design                    | Report        | 15%    | Monday 9th Mar        | 11 days  |
| Prototype                 | Presentation  | 35%    | Thursday 16th April | 6 weeks  |

## Assessment Summary

There are weekly submissions in this module however there is no exam. Here is the list of submissions and their weightings.

| Phase           | Submission    | Weight |
|-----------------|---------------|--------|
| Domain Analysis | Report        | 15%    |
| Domain Analysis | Presentation  | 10%    |
| RQ Elicitation  | Report        | 15%    |
| RQ Elicitation  | Presentation  | 10%    |
| Design          | Report        | 15%    |
| Prototype       | Presentation  | 35%    |
