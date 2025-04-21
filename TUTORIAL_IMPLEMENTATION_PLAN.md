# TigerType First-Time User Tutorial Implementation Plan

## Goal

Create a modular, step-by-step tutorial for new users covering key application features, triggered automatically on first login and replayable via a navbar button.

## Proposed Approach

Utilize a dedicated React library like `react-joyride` to manage the tutorial flow, highlighting elements, and displaying informational tooltips. This approach ensures modularity and simplifies step management.

## Plan Details

### 1. Backend Modifications

*   **Database Schema:** Add a new boolean column `has_completed_tutorial` (defaulting to `false`) to the `users` table in `server/db/schema.sql`.
*   **Database Migration:** Create a migration script (in `server/db/migrations/`) to apply this schema change to existing databases.
*   **User Model (`server/models/user.js`):**
    *   Update model functions (`findById`, `findByNetid`, `create`, `findOrCreate`, etc.) to select and return the `has_completed_tutorial` field.
    *   Add a new function `markTutorialAsCompleted(userId)` to update the `has_completed_tutorial` flag to `true` for a given user.
*   **API Endpoint:** Create a new API route (e.g., `PUT /api/user/tutorial-complete`) in `server/routes/api.js` or `server/routes/profileRoutes.js` that calls `User.markTutorialAsCompleted`. This endpoint will be called when the user finishes or skips the tutorial.

### 2. Frontend Setup

*   **Install Library:** Add `react-joyride` as a project dependency: `npm install react-joyride` in the `client` directory.
*   **State Management (`client/src/context/AuthContext.jsx`):**
    *   Modify the `AuthContext` to fetch and store the `has_completed_tutorial` flag as part of the `user` object upon successful login.
    *   Expose a function (e.g., `markTutorialComplete`) that calls the new backend API endpoint and updates the local user state.
*   **Tutorial Component (`client/src/components/TutorialGuide.jsx`):**
    *   Create a new component to configure and manage the `react-joyride` steps.
    *   Define the tutorial steps as an array of objects, each specifying:
        *   `target`: The CSS selector for the element to highlight (e.g., `#practice-mode-button`, `.navbar-settings-icon`).
        *   `content`: The descriptive text for the tooltip/modal.
        *   `placement`: Position of the tooltip (e.g., 'bottom', 'top').
        *   Other options as needed (e.g., `disableBeacon`).

### 3. Navbar Integration (`client/src/components/Navbar.jsx`)

*   Add a new state variable (e.g., `isTutorialRunning`, default `false`) to manage the tutorial's visibility.
*   Add a "?" or "i" icon button next to the existing "Settings" icon button. This button should only be visible when the user is authenticated.
*   The `onClick` handler for this new button will set `isTutorialRunning` to `true`.

### 4. Tutorial Triggering (`client/src/App.jsx` or Layout Component)

*   Conditionally render the `<TutorialGuide>` component based on application state.
*   Use `useEffect` to check upon login: if `authenticated` is true and `user.has_completed_tutorial` is false, automatically set `isTutorialRunning` to `true`.
*   Pass the `isTutorialRunning` state and a function to set it to `false` (e.g., `handleTutorialEnd`) to the `TutorialGuide` component.
*   The `handleTutorialEnd` function (called by `react-joyride`'s callback) should call the `markTutorialComplete` function from `AuthContext`.

### 5. Tutorial Step Implementation (`client/src/components/TutorialGuide.jsx`)

*   **Home Screen:** Define steps targeting the Practice Mode, Quick Match, and Private Lobby elements, providing descriptions.
*   **Practice Mode:**
    *   Guide click to Practice Mode.
    *   Target the Test Configurator, explain Snippet vs. Timed modes. Explain snippets are course evals.
    *   Guide click to Timed, explain, guide back to Snippet.
*   **Guided Race:**
    *   Target the snippet area/input. Instruct the user to start typing snippet ID 24.
    *   Explain the mistake-correction mechanic (highlighting the red error state).
    *   Guide through finishing the snippet.
*   **Results Screen:** Target elements on the results display, explain stats, and highlight the "View Course" button.
*   **Leaderboard:** Guide navigation/click to the leaderboard link/modal, explain it shows Timed mode results.
*   **Profile Page:** Guide navigation to the profile page, target elements for avatar upload and bio editing, explaining their purpose.

### 6. Styling

*   Customize the appearance of `react-joyride` tooltips/modals to match the TigerType theme using its styling options or custom CSS.

## Modularity

Using a library like `react-joyride` inherently makes the steps modular. The tutorial sequence is defined by the order of objects in the steps array within `TutorialGuide.jsx`, making it easy to add, remove, or reorder steps.

## Visual Plan (Mermaid)

```mermaid
graph TD
    subgraph Backend
        B1[DB Schema: Add has_completed_tutorial]
        B2[DB Migration Script]
        B3[User Model: Update functions, Add markTutorialAsCompleted]
        B4[API Endpoint: PUT /api/user/tutorial-complete]
        B1 --> B2 --> B3 --> B4
    end

    subgraph Frontend
        F1[Install react-joyride]
        F2[AuthContext: Add flag & update function]
        F3[TutorialGuide Component: Define steps]
        F4[Navbar: Add Replay Button & State]
        F5[App.jsx: Add Trigger Logic & Render TutorialGuide]
        F6[Styling: Match theme]
        F1 --> F3
        F2 --> F5
        F4 --> F5
        F3 --> F5
    end

    subgraph User Flow
        U1[User Logs In] --> U2{Fetch User Data (incl. flag)};
        U2 --> U3{Tutorial Completed?};
        U3 -- No --> U4[Auto-Start Tutorial];
        U3 -- Yes --> U5[Normal App View];
        U4 --> U6[Step-by-step Guidance];
        U6 --> U7[Tutorial Finishes/Skipped];
        U7 --> U8[Call API to Update Flag];
        U8 --> U5;
        U9[Navbar Replay Button Click] --> U4;
    end

    Backend --> Frontend
    Frontend --> User Flow