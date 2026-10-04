# PiecePerfect — Custom Image Puzzle Game

A responsive client-side image puzzle game built with **HTML, CSS and vanilla JavaScript**.

## Features

- Upload common image types like JPG, PNG, WEBP, GIF and BMP
- Take a photo using the device camera
- Local browser-side image processing
- 3×3 Easy, 4×4 Medium, 5×5 Hard, 6×6 Expert
- Drag & drop for desktop
- Pointer/touch interaction for mobile
- Difficulty-based countdown timer (30s / 45s / 60s / 90s) and move counter
- Hint system
- Original-image preview
- Shuffle and restart
- Pause/resume
- Score calculation
- Completion animation and automatic Time Up screen
- Local username login with saved browser profile and logout
- Top-five leaderboard with player names, scores, difficulty, moves and time
- Responsive dark/glassmorphism UI
- No database and no image upload to a server

## Run

Camera access generally requires a secure context. The easiest method is VS Code Live Server.

### Option 1 — VS Code Live Server

1. Open this folder in VS Code.
2. Install the **Live Server** extension.
3. Right-click `index.html`.
4. Choose **Open with Live Server**.
5. Allow camera permission when prompted.

### Option 2 — Python local server

If Python is installed:

```bash
python -m http.server 8000
```

Then open:

`http://localhost:8000`

## Important camera note

Browsers restrict camera APIs on ordinary `file://` pages. Use `localhost` or HTTPS for camera mode.

## Project structure

```text
custom-image-puzzle-game/
├── index.html
├── style.css
├── script.js
├── README.md
└── assets/
    ├── icons/
    └── sounds/
```

## Privacy

Images, the saved username and leaderboard scores are stored or processed in the browser. The project does not include a backend and does not automatically upload the user's photos.

## Future enhancements

- Online leaderboards
- Daily challenge
- More puzzle shapes
- Image filters
- Multiplayer challenge
- PWA/offline installation
