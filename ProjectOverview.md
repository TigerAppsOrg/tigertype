## Section 1: Identification

**Project name**

* TigerType

**Project Leader:**

* Ammaar Alam \- ammaar@princeton.edu

**Team Members:**

* Ryan Chen \- rc6542@princeton.edu  
* William Guan \- wg6872@princeton.edu

**GitHub Repository URL:** [https://github.com/ammaar-alam/tigertype](https://github.com/ammaar-alam/tigertype)

## *We confirm that the lead instructor and our TA adviser have access to our source code repository*

---

Section 2: Elevator Speech

TigerType is a real-time typing competition platform, employing synchronous and asynchronous matchmaking to allow Princeton students to improve their typing skills through solo-practice or races against friends in customizable typing challenges. Where platforms like MonkeyType or TypeRacer offer general typing practice, TigerType distinguishes itself through Princeton-themed snippets, real-time progress tracking, and detailed performance analytics. TigerType combines skill development with competitive fun to create a typing experience that’s both productive and engaging.

In gamifying the process of learning, we’ve implemented a comprehensive collectible system where users can unlock badges, avatar customizations, and profile flair through milestones and challenges. This progression system transforms what would have been seen as mere procrastination into productive skill development with tangible rewards and recognition. Students don’t just improve their typing speed – they build a portfolio that showcases their growth through visually appealing statistics, earned achievements, and competitive rankings. 

TigerType isn’t just another brain-rot outlet; it’s a purposeful tool that turns space minutes between classes into opportunities for measurable self improvement in a critical digital skill.

## Section 3: Overview

TigerType is a web-based typing competition platform designed specifically for the Princeton community. Inspired by platforms like MonkeyType and TypeRacer, TigerType allows users to practice typing on their own or compete against others in real-time (or offline) races. The application features a sleek, modern interface with Princeton-themed design elements, text excerpts, and references.

Users can engage with the platform in multiple ways:

1. **Practice Mode:** Users can improve their typing skills by practicing with various text snippets, receiving detailed feedback on their speed, accuracy, and areas for improvement.  
2. **Quick Match:** Users can join a queue to be matched with other queued up users for a real-time typing race.  
3. **Private Lobbies:** Users can create private lobbies with shareable invite codes, allowable to join specific races without using the general matchmaking system – done directly through the Princeton CAS authentication service using netIDs.

TigerType tracks key performance metrics including words per minute (WPM), accuracy, error rate, keystroke-specific statistics, offering users insight into their typing performance and progression over time.

The application is built on a modern stack consisting of a responsive frontend, a realtime backend server, and a persistent database system, ensuring a seamless and interactive user experience. Specifically, the techstack includes:

* **Frontend**: React  
* **Backend/Server**: Node.js (Express)  
* **Database**: PostgreSQL

## Section 4: Requirements

TigerType addresses the need for an engaging tool to help Princeton students improve their typing skills, which are crucial in today's digital academic environment. While many typing practice tools exist, TigerType uniquely caters to the Princeton community with university-themed content and a social competitive element.

### **Primary User Personas:**

1. **Solo Practitioners**: Students looking to improve their typing speed and accuracy through consistent practice with immediate feedback.  
   * Current Solution: Generic typing websites without personalized analytics or Princeton connections  
   * TigerType Benefit: Princeton-themed content and comprehensive performance tracking.  
2. **Competitive Typists**: Students who enjoy friendly competition and want to race against friends to determine typing supremacy  
   * Current Solution: Existing platforms like TypeRacer that lack private lobby functionality or Princeton customization  
   * TigerType Benefit: Easy-to-share private lobbies with Princeton-specific text excerpts  
3. **Casual Users**: Students seeking a quick, fun break from academic work while still developing a practical skill  
   * Current Solution: Games that provide entertainment but limited educational value  
   * TigerType Benefit: Combines entertainment with skill development in short, engaging sessions

TigerType offers significant advantages over general typing platforms by providing:

* Princeton-themed text snippets that resonate with the university community  
* Real-time competition with fellow Princeton students  
* Easy-to-use private lobbies for friend group competitions  
* Comprehensive analytics that help users identify specific areas for improvement

These features create a more engaging, relevant, and effective typing practice experience specifically tailored to Princeton students.

## Section 5: Functionality

### Scenario 1: Solo Practice Mode (User: Alice)

Alice is a Princeton freshman who wants to improve her typing speed for taking notes in lecture. She visits TigerType and selects "Practice Mode."

She chooses the "Princeton" category for text snippets and sets the difficulty to "Medium." A text about Princeton University's history appears on her screen. Alice begins typing, and the interface highlights correctly typed characters in green and errors in red. The current character position is highlighted with a pulsing cursor.

As she types, real-time analytics display her current WPM (words per minute) and accuracy percentage. When she makes an error, a subtle sound effect plays, and the text display gently shakes to provide feedback. Alice notices her speed decreases when typing numbers and special characters.

Upon completing the passage, a detailed results screen shows her final WPM (65), accuracy (92%), problem characters (numbers and special symbols), and other statistics. The system suggests focusing on number keys for practice and recommends trying the "Code" category to improve with special characters.

Alice clicks "Practice Again" to try another snippet, determined to reach 75 WPM by the end of the month.

### Scenario 2: Creating a Private Lobby (User: Bob)

Bob is a Princeton sophomore looking to challenge his roommates to a typing competition. He logs into TigerType and clicks "Create Lobby" from the main menu.

A new screen appears where Bob can configure race settings. He selects "Medium" length, "Princeton" text category, sets minimum players to 3, and keeps the default 5-second countdown. The system generates a unique six-character lobby code (AX7B2P).

Bob shares this code with his roommates through their group chat. As they join using the code, Bob sees their usernames appear in the lobby player list. Each player's status shows as "Not Ready" initially.

Bob explains the rules through the chat feature, then clicks "Ready Up." His status changes to "Ready," and the system waits for all players to indicate readiness. Once everyone is ready, a 5-second countdown begins, followed by the appearance of the selected text snippet.

All players begin typing simultaneously, with real-time progress bars showing each person's position in the race. Bob struggles with a few complex words but manages to finish second. The final results screen shows each player's WPM, accuracy, and finish time, with congratulations to the winner.

### Scenario 3: Quick Match (User: Charlie)

Charlie has a 15-minute break between classes and wants to challenge himself against other typists. He opens TigerType and selects "Quick Match."

The system places Charlie in a queue, displaying his position and estimated wait time. Within seconds, the system finds enough players for a match and creates a lobby with Charlie and three other random Princeton students.

A notification shows "Match Found\!" and Charlie is automatically taken to the race lobby. The interface shows the other participants' usernames and a timer indicating that the race will automatically start in 30 seconds unless everyone indicates readiness sooner.

Charlie clicks "Ready" and waits as the other players do the same. Once all players are ready, the countdown begins, followed by the appearance of a text snippet about computer science at Princeton.

During the race, Charlie can see his progress along with the other racers through progress bars at the bottom of the screen. He notices one player pulling ahead quickly and pushes himself to type faster while maintaining accuracy.

After finishing, Charlie sees the final standings, with himself in third place. The results screen shows everyone's statistics, and a "Race Again" button appears, allowing Charlie to quickly join another queue if he wishes.

### Scenario 4: Reviewing Personal Statistics (User: Diana)

Diana has been using TigerType regularly for several weeks and wants to check her progress. She logs in and navigates to the "Statistics" section of the application.

The statistics dashboard displays several key metrics:

* Average WPM over time (shown as a line graph with an upward trend)  
* Average accuracy (shown as a percentage with daily fluctuations)  
* Total characters typed (currently 58,463)  
* Total races completed (37)  
* Personal best WPM (89)

Diana notices that her WPM has been steadily increasing, from an average of 55 WPM in her first week to 72 WPM currently. Her accuracy has remained relatively constant at around 94-96%.

The system also shows her "problem characters" – the keys where she makes the most errors. Diana sees that she frequently mistyped 'b', 'n', and 'm', suggesting she might need to work on her right-hand positioning.

A "Recommendations" section suggests practicing with code snippets to improve her speed with special characters, based on her error patterns. Diana decides to follow this advice and clicks on a link to begin a focused practice session targeting her weak areas.

## Section 6\. Design

### 6.1 | User Interface Tier

For our user interface tier, we will be using a web-based approach with HTML5, CSS3, and JavaScript. This approach provides several advantages:

1. Accessibility: Users can access the application from any computer device with a modern web browser without installation

2. Responsiveness: The interface will adapt to various screen sizes, from small 9” ChromeBooks to large 27” desktop monitors

3. Immediate Updates: Changes deploy ‘instantly’ to all users without requiring app updates

Our UI will use React for the static pages and structure of the application, with vanilla JS for the core typing logic and performance-critical features. We have chosen this hybrid approach because:

1. **Reduced Complexity**: For a typing application focused on real-time performance, a lighter solution with fewer dependencies offers better control over rendering optimizations  
2. **Learning Opportunity**: The team will gain experience in fundamental web technologies such as React which are standard  
3. **Structured Development**: React makes building the interface efficient while custom JS ensures the typing experience remains responsive and can be customized/modified later down the pipeline

The UI includes several key components:

* Text display area with character highlighting  
* Virtual cursor for tracking typing position  
* Real-time statistics display (WPM, accuracy, etc.)  
* Lobby management interface  
* Results and analytics dashboard

### 6.2 | Processing Tier

For our processing tier, we are using Node.js with Express as the web server. This decision was made for several reasons:

1. **JavaScript Throughout**: Using JavaScript for both frontend and backend allows code sharing and consistent data handling  
2. **Good** **WebSocket** **Support**: Socket.IO on Node.js provides robust real-time communication capabilities essential for multiplayer racing *(and more importantly: it is what I am most familiar with)*  
3. **Asynchronous** **Processing**: Node’s event-driven, non-blocking I/O model is well-suited for handling multiple concurrent race sessions

The server handles critical functionality including:

* User session management  
* Race and lobby coordination  
* Text snippet selection and distribution  
* Performance calculation and validation  
* Real-time progress updates via WebSockets

The processing tier is organized into a model-view-controller (MVC) architecture:

* Controllers handle socket events and HTTP endpoints  
* Models manage data structure and database interactions  
* Utilities provide helper functions for tasks like WPM calculation

### 6.3 | Data Management Tier

For our data management tier, we will be using PostgreSQL. This choice reflects our need for:

1. Relational Data Structure: The relationships between users, races, achievements, etc.  
2. Data Integrity: PostgreSQL has strong enforcement of constraints and ensures consistency across race results, user statistics, etc. (is also what we’re familiar with)  
3. Robust Performance: PostgreSQL is well suited for the scale of our query patterns involving statistics, race histories, etc.  
4. Deployment Compatibility: PostgreSQL is integrated directly with Heroku as an addon one can add to any Heroku application

Our database schema will include the following main tables (may have additional ones or modified tables later):

* Users Table  
  * CREATE TABLE users (  
    id SERIAL PRIMARY KEY,  
    username VARCHAR(50) NOT NULL UNIQUE,  
    join\_date TIMESTAMP NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    avg\_wpm NUMERIC (5,2) DEFAULT 0,  
    avg\_accuracy NUMERIC (5,2) DEFAULT 0,  
    races\_completed INTEGER DEFAULT 0,  
    best\_wpm INTEGER DEFAULT 0,  
    total\_words\_typed INTEGER DEFAULT 0  
    )  
* Lobbies Table  
  * CREATE TABLE lobbies (  
    id SERIAL PRIMARY KEY,  
    host\_id VARCHAR(6) NOT NULL UNIQUE,  
    created\_at TIMESTAMP NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    text\_length VARCHAR(20) NOT NULL,  
    text\_category VARCHAR(20) NOT NULL,  
    min\_players INTEGER NOT NULL,  
    countdown\_time INTEGER NOT NULL,  
    privacy VARCHAR(10) NOT NULL,  
    Status VARCHAR(10) NOT NULL  
    )  
* Lobby\_Players Table  
  * CREATE TABLE lobby\_players (  
    lobby\_id INTEGER REFERENCES lobbies(id),  
    user\_id INTEGER REFERENCES users(id)  
    is\_ready BOOLEAN DEFAULT FALSE,  
    join\_time TIMESTAMP NOT NULL DEFAULT CURRENT\_TIMESTAMP,  
    PRIMARY KEY (lobby\_id, user\_id)  
    )  
* Race\_Results Table  
  * TBD  
* Participants\_Results Table  
  * TBD  
* Text\_Snippets Table  
  * TBD

And will we deploy through Heroku.

## Section 7: Milestones

### 7.1 | Minimum Viable Product (MVP)

The MVP will include:

* Basic practice mode with WPM and accuracy tracking  
* Simple lobby system for multiplayer races  
* Real-time progress tracking during races  
* Basic text snippets (with categories?)  
* Core statistics display (WPM, accuracy, errors)

### 7.2 | Stretch Goals

1. Enhanced user statistics and analytics dashboard   
2. Expanded text snippet categories (course reviews, literature, etc.)  
3. Customizable race settings (text length, category selection, etc.)  
4. User profiles with persistent statistics  
5. Achievement System  
6. Keyboard heatmap accuracy by key  
7. Advanced matchmaking based on skill-level

### 7.3 | Weekly Schedule

**Week 1 (February 17 \- 23\)** 

* Set up project repository and team drive  
* Establish weekly project meeting and advisor schedule  
* Finalize general scope of the project (implementation goals, technologies, etc.)

**Week 2 (February 24 \- March 2\)**

* Create UI wireframe prototype  
* Create Project Overview and Timeline documents in team drive

**Week 3 (March 3 \- 9\)**

* Finalize UI wireframe  
* Meeting with UI specialist  
* Meeting with TA Adviser  
* Update Timeline document  
* Gather text snippets from finalized list of sources

**Week 4 (March 10 \- 16\) \- Spring Break**

**Week 5 (March 17 \- 23\)**

* Meeting with TA Adviser  
* Update Timeline document  
* Ethical impact awareness meeting (this week or the next)  
* Completed solo practice mode  
* Completed basic user statistics for solo practice mode (WPM, accuracy, errors)

**Week 6 (March 24 \- 30\)**

* Meeting with TA Adviser  
* Update Timeline document  
* Demonstration of prototype (during the weekly status meeting)  
* Simple lobby system using invite-link  
* Customizable race settings

**Week 7 (March 31 \- April 6\)**

* Meeting with TA Adviser  
* Update Timeline document  
* User profiles with persistent statistics and basic customization (biography, username, etc.)

**Week 8 (April 7 \- 13\)**

* Meeting with TA Adviser  
* Update Timeline document  
* Demonstration of alpha version  
* Basic matchmaking system (not skill-based, using public lobbies)  
* The ability to filter through text snippet categories in matchmaking  
* Achievement system (profile pictures, titles, badges, etc.)

**Week 9 (April 14 \-  20\)**

* Meeting with TA Adviser  
* Update Timeline document  
* Small-scale tournament bracket-formation algorithm  
* Advanced user-specific keyboard heatmap

**Week 10 (April 21 \- 27\)**

* Meeting with TA Adviser  
* Update Timeline document  
* Demonstration of beta version (during the weekly status meeting)  
* Skill-level based matchmaking algorithm (Elo)  
* Full-scale tournament algorithm

**Week 11 (April 27 \- May 3\)**

* Update Timeline document  
* Presentation  
* Presentation Slides

**Week 12 (May 3 \- 9\)**

* Update Timeline document  
* Grader’s guide document  
* Project evaluation document  
* Product evaluation document  
* Source code  
* Application

## Section 8: Risks

### 8.1 | Technical Risks

1. **Usage of React**: We want to use React library to create the front-end of our web application.   
   1. **Problem**: We have been warned that React has a steep learning curve, and that there may not be enough time to become familiar enough with the library to use it effectively.  
   2. **Work-around**: If we feel that we do not have enough time to be more comfortable with React, we can switch to using vanilla JS instead.  
2. **Socket.IO Limitations**:  
   1. Risk: As user numbers grow, Socket.IO connections may cause server performance issues.  
   2. Mitigation: Implement proper connection pooling, room management, and consider using Redis adapter for horizontal scaling if needed.  
   3. Fallback: Limit the number of concurrent races and implement queuing for peak usage periods.  
3. **Creating an intuitive and responsive user experience/UI**: Our application should be nice to look at and feel good to play. Because of this, we are inclined to spend a lot more time on computer graphics and overviewing our design choices.  
   1. Problem: The time spent on enhancing user experience will come at the cost of development time. For example, designing collectible sprites or the appearance of the text box may go through many iterations.  
   2. Work-around: There may not be a straightforward way of addressing all possible design concerns efficiently. We plan to go through multiple iterations of user testing, which will streamline the design pipeline.

### 8.2 | Database and User Risks

There are some risks that we have thought about that involves databases and implementation risks:

1. **Text Snippet Quality and Quantity**  
   1. Risk: Having insufficient or low-quality text snippets could lead to repetitive racing experiences.	  
   2. Mitigation: Develop a robust content management system for text snippets with multiple categories and difficulty levels.  
   3. Fallback: Implement an algorithmic text generator as a supplement to handcrafted snippets.  
2. **User Retention**  
   1. Risk: Users may lose interest if the competitive experience isn't engaging enough.  
   2. Mitigation: Implement achievement systems, regular statistics, and varied gameplay modes to maintain engagement.  
   3. Fallback: Focus on the educational and skill development aspects if the competitive elements don't gain traction.snippets. We can also check APIs to see if they contain the data in available JSON format, or academic databases to pull the data in.

### 8.3 | Project Management Risks

While the implementation schedule of the core functionality of TigerType lies within the scope of a semester-long project, there are several mid-range and long-term stretch goals that provide a degree of risk (scope creep):

1. **Keystroke-Specific Analytics** (Mid-range): We hope to implement system-to-user feedback in the form of personalized statistics relating to user-specific typing patterns. For example, the system would aim to provide the user with information about commonly misspelled words or keys that are commonly misinput given the correct key.  
   1. **Problem:** The scope of the task appears to be outside of the typical mid-range goal. To elaborate, the design and development of an efficient algorithm to calculate and store these key-relational statistics is not trivial. This may require a proactive early-development approach or the reassessment of the extent in which we want to develop this feature.  
   2. **Work-around:** Rather than key-relational statistics, we would opt for user-specific statistics that are confined within commonly missed words. “Word-static” statistics would not require an algorithm to calculate, but only an efficient way of storing information.  
2. **Typing Tournaments (Stretch):** We aim to expand the primary functionality of our gameplay system beyond a standard match-making lobby and host events in bracket-formatted tournaments. For example, hosting a tournament with special in-game prizes during the stretch of Dean’s Date would be a fun event for users.  
   1. Problem: The design of an algorithm that produces a bracket-style chart may warrant a project in its own right. Specifically, we would have to consider many edge cases and design a system that provides users with fair matches in terms of skill.   
   2. Work-around: While the implementation of this feature would be ideal in the final product, it is reasonable to scale the size of the tournaments down (i.e. restrict tournaments to 4-6 players). By doing this, we would only have to make several separate match-making lobbies.  
3. Skill-based Matchmaking (Stretch): For a complex match-making system, we would have to assign each user a unique “elo” value.  
   1. Problem: There may not be enough users to support a feature like this and have efficient or frequent matchmaking. Additionally, this would require us to “restrict” some websockets to allow for certain connections.  
   2. Work-around: There may not be a good way to implement a skill-based matchmaking system without a large enough playerbase. In that case, we would have to scrap this milestone. However, websocket concern can be addressed by creating limited access lobbies, rather than restricted-connectability live matchmaking.  
4. Extent of Collectibles (Stretch): While titles may be easy to implement, there is significant design and efficiency risk when it comes to creating collectible profile pictures and badges. Specifically, we would like to have badges and icons that are custom to our application.  
   1. Problem: It is a significant undertaking to draw and iterate through collectible designs as well as create an inventory system for each unique collectible.  
   2. Work-around: The trade-off between efficiency and creativity is important to consider for this stretch goal. In the case we want to be more efficient, we can create templates for which we base our icons and badges off of. This would streamline the process of creating collectibles.