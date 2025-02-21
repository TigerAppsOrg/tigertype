# TigerType: Comprehensive Project Document

## 1. Project Concept and Core Features

### TigerType Core Concept
TigerType is a Princeton-themed typing platform, inspired by tools like TypeRacer or Monkeytype but tailored for the Princeton community. Users can:

- **Practice alone** to improve typing speed and accuracy on selected or random text snippets.  
- **Create private lobbies** by generating an invite code to race against friends in real time.  
- **Join an open queue** to compete with any user currently searching for a public match.

Ultimately, TigerType will provide a fun, campus-themed environment with potential for departmental leaderboards, achievements, and social features.

### Major Features

1. **User Management & Leaderboards**  
   - CAS authentication for netid-based sign-up/login.  
   - Global leaderboards that rank users by WPM, accuracy, or total races.  
   - (Optional) Departmental or class-year leaderboards using ActiveDirectory or user-provided data.

2. **Typing Mechanics**  
   - **Practice/Single-Player** mode for personal improvement.  
   - **Private Lobby** mode: generate an invite code for friends to join; all participants race simultaneously.  
   - **Global Matchmaking**: random pairing in a public queue.

3. **Real-Time Racing**  
   - WebSocket-based communication for broadcasting typed progress live.  
   - Visual progress bars or snippet highlighting to show each racer's position.

4. **Achievements & Analytics (Optional)**  
   - Milestone achievements: “100 WPM Club,” “Flawless Accuracy,” etc.  
   - Track improvement over time, display graphs of WPM or accuracy progression.

### Far Stretch Goals (Puzzle Mode, Tournaments)
- **Puzzle Mode**: Users type to unlock clues or partial text reveals tied to Princeton-themed riddles.  
- **Tournament System**: Bracket-style multi-round competitions.  

These are beyond the primary or mid-range scope and would only be considered after core development is complete.

---

## 2. General Implementation Tips

### Three-Tier Structure
- **UI Tier**  
  - Web-based front end (React, Angular, etc.).  
  - Displays typing interface, race creation/join, leaderboards, user stats.

- **Processing Tier**  
  - Python (Flask/Django) or Node.js (Express) for business logic.  
  - CAS authentication handling.  
  - Race session management (especially real-time WebSockets).  
  - Leaderboard updates and queries.

- **Data Tier**  
  - PostgreSQL or MongoDB for persistent storage of user profiles, snippets, race results, achievements.  

### Princeton Data Integration
- **ActiveDirectory**: for class-year or department info if you implement specialized leaderboards.  
- **PrincetonInfo** or **Art Museum** data (optional) for theming text snippets.  
- Must request a **service account** and CAS whitelisting for any non-localhost domain.

### Possible “Hook” for Grading
- Non-trivial concurrency or real-time features.  
- Substantial database schema (users, race results, achievements).  
- Weekly demos showing iterative progress.  
- Defined MVP so you have a working product early on.

---

## 3. Potential Names (Historical Brainstorm)

> **Note:** The project name is ultimately **TigerType**, but the following ideas are retained for completeness.

### Long Thematic Name List (Princeton Puns)
- Clack & Bicker  
- Precept Prowl  
- Dean’s Date Dash  
- Firestone Frenzy  
- Orange Bubble Bash  
- Street Speed Showdown  
- Late Meal Lunge  
- Cannon Clack  
- Tiger Transit Typers  
- Claw to the Top  
- Wawa Warriors  
- P-Set Panic  
- Tap & Toast  
- Roaring Revision  
- The Paw-suit of Speed  
- Keyed Up on The Street  
- Tiger Taps  
- Precept Pulse  
- McCosh Mash  
- PawBoard Prowess  
- Late Meal Lightning  
- Stripes & Hypes  
- Pounce & Precept  
- Type & TigerInn  
- Nassau Knockout  

### Additional Name List (Shorter Concepts)
- TigerKeys  
- Roaring Typist  
- Stripes & Keys  
- Paws ‘n’ Claws Typing  
- Clack & Roar  
- TigerDash  
- OrangeLightning  
- Speedy Stripes  
- Princetypers  
- Paw to the Metal  
- IvyKeys  
- Clawed to the Top  
- TigerClack  
- RapidRoar  
- Prowl & Type  
- Quill & Paw  
- Type ’n’ Stripe  
- TigerHype  
- PawBoard  
- FlashFur  
- KeyGrowl  
- Type of the Tiger  
- PawPulse  
- IvyType  

---

## 4. Detailed COS 333 Roadmap

### Project Overview

**Elevator Speech**  
TigerType is a Princeton-themed typing race application where users can practice alone or create lobbies (with invite codes) to race against friends. They can also queue up for a public match to race against random Princeton netid holders. Potential departmental or class-year leaderboards and achievements enhance friendly competition.

**What the System Will Do**  
1. **Single-Player Practice** to boost speed/accuracy.  
2. **Private Lobbies** where a race code is shared with friends for a real-time race.  
3. **Global Matchmaking** to find open races with random participants.  
4. **Leaderboards & Stats** showing WPM, accuracy, achievements, and possibly departmental ranking.

**Architecture**  
- **UI**: A single-page application (React, etc.).  
- **Server**: Flask or Node.js with real-time (WebSocket) capabilities.  
- **Database**: PostgreSQL or MongoDB for storing user data, race info, snippet text, etc.

### Deliverables Roadmap

1. **Row in the ProjectFinder**  
   - Each team member adds a row with project name “TigerType” and a short description.

2. **Project Approval Meeting**  
   - Bring this roadmap, possibly a minimal proof-of-concept.

3. **Version Control Repository**  
   - Create a private GitHub repo named “TigerType,” grant instructors read access.

4. **Team Directory**  
   - A private Google Drive folder named “TigerType” containing docs like ProjectOverview, Timeline, wireframes, etc.

5. **Project Overview Document**  
   - ~3–7 pages detailing identification, elevator speech, overview, requirements, functionality, design, milestones, risks.

6. **Wireframes**  
   - Sketches for login flow, race UI, scoreboard, etc.

7. **Prototype**  
   - Basic end-to-end skeleton with minimal front end, CAS login, and simple race logic (storing user data in DB).

8. **Alpha Version**  
   - Real-time racing for at least two users in a private lobby.  
   - CAS integration and a rudimentary leaderboard.

9. **Beta Version**  
   - All core features stable: practice mode, private lobbies, global matchmaking, potentially some achievements.

10. **Presentation & Slides**  
    - 20-minute public demonstration during reading period, plus Q&A on architecture and lessons learned.

11. **Grader’s Guide**  
    - Step-by-step instructions for each use case: logging in, creating/joining a race, viewing leaderboards, etc.

12. **Product Evaluation**  
    - Testing strategy (white-box, black-box, stress), user feedback, heuristic evaluation, known bugs.

13. **Project Evaluation**  
    - Reflection on planning, technical issues, what worked well, acknowledgments.

14. **Source Code**  
    - Final code snapshot stored in a `src/` directory in the team’s Google Drive, ignoring compiled artifacts.

15. **Final Product**  
    - Deployed “TigerType” site, live for ~two weeks post Dean’s Date.

### MVP Breakdown (Lowest-Level Steps)

1. **CAS Login**  
   - Whitelist the domain and verify netid creation in the DB upon login.

2. **Single Snippet Race (Basic)**  
   - A single snippet in practice mode.  
   - Calculate WPM, accuracy, store results in `race_results`.

3. **Result & Leaderboard**  
   - Show final stats to user.  
   - Possibly a top-5 WPM listing for MVP.

4. **Database Essentials**  
   - `users`: netid, creation timestamps.  
   - `snippets`: text for typing.  
   - `race_results`: user_id, snippet_id, wpm, accuracy, timestamp.

5. **Deployment & Testing**  
   - Heroku/Render deployment, confirm CAS flow.  
   - Simple smoke test (login → type → see results).


All members share responsibility for documentation, weekly TA meetings, and consistent commits.

---

## 5. Mid-Range Stretch Goals

Below are mid-range goals to enhance TigerType before exploring puzzle modes or tournament brackets:

1. **Snippet Categories & User-Submitted Snippets**  
   - Store multiple snippet categories (literature, campus-themed, random).  
   - Potential user submissions (admin-reviewed).

2. **Departmental/Class-Year Leaderboards**  
   - Use ActiveDirectory or user-submitted profile data to segment boards.  
   - Let users filter between “Global,” “My Department,” and “My Class Year.”

3. **Async Challenges & Friend Invites**  
   - “Challenge a friend by netid” to beat your score in a snippet.  
   - Store “challenge” in the DB; friend sees “Pending Challenge” on next login.

4. **Achievements & Basic Analytics**  
   - Badges for hitting milestones: “10 Races,” “100 WPM,” “1,000 typed words.”  
   - Track WPM or accuracy over time in simple data visualizations.

5. **Small Real-Time Quick Race (Lobby)**  
   - Create a short code or link for up to N participants.  
   - WebSockets broadcast typed progress.  
   - Finishing order displayed once everyone completes or times out.

*(Further expansions like puzzle modes or multi-round tournaments can be revisited after these core goals.)*
