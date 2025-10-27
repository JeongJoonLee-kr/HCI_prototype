# HCI Prototype Screens

This repository contains a web-based walkthrough of the hand-washing conservation prototype.
It demonstrates the on-device UI across the full session flow: waving to start, the colour-shifting timer, and rotating summary cards with QR hand-off.

## Getting started

1. (Optional) Add your QR asset as `assets/session-qr.png` so the hand-off card displays the code. A placeholder message appears if the file is missing.
2. Open `index.html` in any modern desktop browser. No build step is required.
3. Click anywhere on the page or press the space bar to simulate waving at the IR sensor.
4. Wave once to start the 30 second timer, and wave again to end the session early. After the timer finishes, explore the rotating summary screens.

The summary carousel automatically advances every 5 seconds and returns to the start screen after a short period of inactivity. The rotation covers six focused cards: session stats with QR hand-off, weekly usage, alerts, behaviour insights, habit follow-ups, and an eco impact snapshot.
