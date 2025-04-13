# Landing Page Redesign Plan

This document outlines the plan for redesigning the TigerType landing page based on the provided wireframe and user requirements.

## Requirements Summary

1.  **Layout:** Follow the structure shown in the wireframe.
2.  **Styling:** Use the existing application color scheme (CSS variables).
3.  **Buttons:** Remove "Sign Up", keep "Log In" as the primary action.
4.  **Links:** Replace "Terms of Service" with "About Us" and "Features" links (pointing to `#`).
5.  **Animation:** Implement a two-stage animated typing effect:
    *   Stage 1: Display the Honor Code pledge ("I pledge my honour that I have not violated the honour code during this examination").
    *   Stage 2: After a pause, display a random snippet fetched from the database.
6.  **Logo:** Use the simpler `client/src/assets/tiger-icon.png`.
7.  **Consistency:** Align with existing component patterns.

## Implementation Plan

**Phase 1: Backend Modification**

1.  **Create New API Endpoint:**
    *   Define a new route in `server/routes/api.js`: `GET /api/landing-snippet`.
    *   This route will **not** use the `requireAuth` middleware.
    *   The route handler will call `SnippetModel.getRandom()`.
    *   It will return a JSON response containing the `text` field of a random snippet.

**Phase 2: Frontend Redesign**

1.  **Update `client/src/pages/Landing.jsx`:**
    *   **Structure:** Reorganize JSX to match the wireframe (Logo, Title, Animated Text Area, Description, Login Button, Footer Links).
    *   **Logo:** Use `client/src/assets/tiger-icon.png`.
    *   **Animated Text (Two-Stage):**
        *   Use `useState` to manage the text being displayed, the next snippet to display, and the current animation stage (e.g., 'honorCode', 'fetchingSnippet', 'displayingSnippet').
        *   **Stage 1 (Honor Code):** On component mount, start animating the display of "I pledge my honour that I have not violated the honour code during this examination" character by character (using `useEffect` and `setInterval`/`setTimeout`).
        *   **Transition:** When the Honor Code animation completes, change the stage to 'fetchingSnippet'.
        *   **Stage 2 (Fetch Snippet):** In a `useEffect` triggered by the stage change, fetch data from the new `/api/landing-snippet` endpoint. Store the fetched text. Change stage to 'displayingSnippet'.
        *   **Stage 3 (Display Snippet):** After a short delay (e.g., 1-2 seconds using `setTimeout`), clear the displayed text and start animating the fetched snippet character by character.
    *   **Description:** Update the descriptive text as per the wireframe.
    *   **Button:** Keep the existing "Log In with Princeton CAS" button logic.
    *   **Links:** Add "About Us" and "Features" links pointing to `#`.
2.  **Update `client/src/pages/Landing.css`:**
    *   Remove existing styles.
    *   Add new CSS rules to style the elements according to the wireframe, using CSS variables for consistency.
    *   Style the logo, title, animated text container, description, login button, and footer links.

## Diagrammatic Plan (Mermaid)

```mermaid
graph TD
    A[Start Redesign] --> B{Backend: New Endpoint};
    B --> B1[Define GET /api/landing-snippet in api.js];
    B1 --> B2[No requireAuth middleware];
    B2 --> B3[Call SnippetModel.getRandom()];
    B3 --> B4[Return snippet text as JSON];

    A --> C{Frontend: Landing.jsx};
    C --> C1[Update JSX Structure (Wireframe)];
    C1 --> C2[Use tiger-icon.png];
    C1 --> C3[Implement Two-Stage Animated Text];
        C3 --> C3a[useState for displayedText, nextSnippet, animationStage];
        C3 --> C3b[Stage 1: Animate Honor Code];
        C3b --> C3c[Stage 2: Fetch /api/landing-snippet];
        C3c --> C3d[Stage 3: Animate Fetched Snippet (after delay)];
    C1 --> C4[Update Description Text];
    C1 --> C5[Keep Login Button Logic];
    C1 --> C6[Add 'About Us' & 'Features' links to '#'];

    A --> D{Frontend: Landing.css};
    D --> D1[Clear existing styles];
    D1 --> D2[Add new styles for wireframe layout];
    D2 --> D3[Use CSS variables from index.css];
    D3 --> D4[Style all elements];

    B4 --> C3c;
    C --> D;

    D4 --> E[Review & Test];
    E --> F[End Redesign];