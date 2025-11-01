# 3D Satellite Constellation Simulator

This project is a high-performance, 3D web-based simulation using Three.js to model and optimize satellite constellation coverage for a non-rotating planet.

## Features

*   **3D Visualization:** A fully interactive 3D scene with a planet, atmosphere, and satellites.
*   **Satellite Physics:** Satellites orbit the planet at a constant, calculated speed.
*   **Network Model:** Satellites are connected in a graph, and the simulation checks for a valid path from each satellite back to an anchor satellite.
*   **"Traffic Light" Status:** Satellites are color-coded in real-time based on their network status (Red, Yellow, Green).
*   **Constellation Deployment:** A multi-phase algorithm for deploying the satellite constellation.
*   **Self-Correction:** The simulation identifies and removes failed satellites and fills in the gaps.
*   **UI Controls:** A UI panel for controlling simulation parameters.
*   **Coverage Visualization:** Test points on the planet's surface change color based on their real-time coverage status.

## Setup

1.  Clone the repository.
2.  Install the dependencies:
    ```
    npm install
    ```
3.  Start a local web server:
    ```
    python -m http.server
    ```
4.  Open your browser and navigate to `http://localhost:8000`.

## Usage

Use the UI panel on the left side of the screen to adjust the simulation parameters. The simulation will run until the target coverage percentage is reached.
