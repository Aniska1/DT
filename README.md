# ElderEase

**Technology made simpler, safer, and easier for everyone.**

ElderEase is a front-end design-thinking prototype exploring how a simplified, voice-guided, and trilingual smartphone interface can eliminate common usability barriers experienced by older adults, individuals with visual or motor challenges, and their caregivers.

---

##  What's New in this Version (Based on Teacher & User Feedback)

As requested by our teachers during design reviews, this version incorporates real user feedback and introduces key new features:

1. **Trilingual Login & Account Creation Pages with Enlarged Native Script:**
   - Prominent language selection right at login and signup: **English**, **हिन्दी (Hindi)**, and **ಕನ್ನಡ (Kannada)**.
   - Each option is presented in **enlarged, bold native text** (25px+ font size) so seniors can identify their preferred language without needing reading glasses.
2. **Universal Voice Guidance & Text Size Controls on Every Single Page:**
   - **Text Size Adjustment (`A- / Normal / A+`)** is now embedded directly in the header of the Login page, the Create Account page, and the universal Dashboard topbar across all views.
   - **Voice Guidance (`🔊`)** is accessible on every screen, including field-level audio prompts, page-level read-aloud buttons, and a floating audio control bar with a live animated soundwave and stop button.
   - Uses an advanced 3-tier speech engine supporting authentic native audio streaming and browser speech synthesis in English, Hindi, and Kannada.
3. **Senior-Friendly Authentication & Account Creation:**
   - Simple **4-Digit Security PIN** instead of complex passwords with special characters.
   - **Quick 1-Tap Demo Access** for:
     -  **Ramesh Kumar** (Senior Citizen · 74y)
     -  **Anita** (Daughter & Caregiver)
     -  **Teacher / Evaluator Demo** (instant grading and exploration without typing)
   - Seamless transition from **Login → Create Account → Dashboard**.
   - Profile switching and logout option from the top bar.
4. **Daily Pills & Medicine Tracker:**
   - Morning (Telmisartan 40mg), Afternoon (Multivitamin), and Night (Metformin) schedule.
   - One-tap **"Mark as Taken"** with visual status tags and audio confirmation.
   - **🔊 Read Medicine Schedule** button speaks dosage timings aloud.
5. **Daily Wellness & Mood Check-in:**
   - One-click mood sharing on the home screen: Feeling Good , Doing Okay , Need Care .
6. **Live Teacher & User Feedback Portal:**
   - Developed specifically to meet the evaluation requirement of gathering user feedback.
   - Teachers and testers can submit 5-star ratings, select tested features, and propose new ideas.
   - Feedback is saved to `localStorage` and displayed in the live design-thinking iteration log.

---

##  How to Run Locally

1. Open the project folder (`DT`).
2. Double-click `index.html` to open it in any modern web browser (Google Chrome, Microsoft Edge, or Safari).
3. Allow audio/speech permissions if prompted by your browser.

> [!NOTE]
> No build tools, NodeJS, or external package installations are required. Everything runs natively using clean HTML5, CSS3, and JavaScript.

---

##  Publish with GitHub Pages

1. Create a public repository on GitHub named `ElderEase`.
2. Push or upload all files:
   - `index.html`
   - `style.css`
   - `script.js`
   - `translations.js`
   - `README.md`
   - `documentation/design-thinking-process.md`
3. In GitHub, go to **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select branch `main` and folder `/(root)`, then click **Save**.
6. GitHub Pages will generate your live URL in a few minutes.

---

##  Accessibility & Technical Features

- **Adjustable Text Size:** 5 levels (Small, Normal, Large, Larger, Largest) with automatic roomier grid reflow.
- **High-Contrast Mode:** Enhanced contrast conforming to WCAG 2.1 AAA.
- **Extra Spacing:** Expands button padding and gaps for unsteady touch input.
- **Screen Reader & Keyboard Friendly:** Skip link, visible focus outlines (`#f0a500`), modal focus trap, and Escape key handling.
- **Persistent Preferences:** Text size, contrast, language, user session, medicine status, and submitted feedback persist across reloads using `localStorage`.

---

##  Design-Thinking Documentation
For full details on the 5-stage Design Thinking process (Empathize, Define, Ideate, Prototype, Test), user personas, and the feedback-driven iteration matrix, see:
[`documentation/design-thinking-process.md`](documentation/design-thinking-process.md).

---

##  Prototype Limitations
- Contacts and calls are interactive demonstrations and do not place real telephone calls.
- The SOS emergency screen is an illustrative prototype and does not contact emergency services.
- Speech output relies on browser and operating system Text-to-Speech (TTS) engine support.
