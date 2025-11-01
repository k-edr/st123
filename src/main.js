import * as THREE from '../node_modules/three/build/three.module.js';
import { GUI } from '../node_modules/dat.gui/build/dat.gui.module.js';
import {
    createTestPoints,
    updateSatelliteOrbits,
    updateNeighborDetection,
    checkNetworkStatus,
    seedAnchor,
    buildRing,
    expandConstellation,
    selfCorrect,
    updateCoverageVisualization,
} from './simulation.js';

// --- UI Controls ---
const gui = new GUI();
const params = {
    targetCoverage: 95,
    timeScale: 1,
    targetNeighborCount: 2,
    satelliteCoverageRadius: 50,
    minPlacementDistance: 45,
    maxPlacementDistance: 49.5,
};
gui.add(params, 'targetCoverage', 1, 100);
gui.add(params, 'timeScale', 0.1, 10);
gui.add(params, 'targetNeighborCount', 1, 5).step(1);
gui.add(params, 'satelliteCoverageRadius', 1, 100).onChange(value => {
    satellites.forEach(satellite => {
        const newGeometry = new THREE.SphereGeometry(value, 32, 32);
        satellite.coverageSphere.geometry.dispose();
        satellite.coverageSphere.geometry = newGeometry;
    });
});
gui.add(params, 'minPlacementDistance', 1, 100);
gui.add(params, 'maxPlacementDistance', 1, 100);

// --- Basic Scene Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Lighting & Objects ---
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const pointLight = new THREE.PointLight(0xffffff, 1);
pointLight.position.set(5, 5, 5);
scene.add(pointLight);

const planetGeometry = new THREE.SphereGeometry(60, 32, 32);
const planetMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const planet = new THREE.Mesh(planetGeometry, planetMaterial);
scene.add(planet);

const atmosphereGeometry = new THREE.SphereGeometry(80, 32, 32);
const atmosphereMaterial = new THREE.MeshStandardMaterial({
    color: 0x0000ff,
    transparent: true,
    opacity: 0.2,
});
const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
scene.add(atmosphere);

// --- Simulation State ---
let satellites = [];
const testPoints = [];
const clock = new THREE.Clock();
createTestPoints(scene, testPoints);
camera.position.z = 200;

let simulationRunning = true;
const SimulationPhase = {
    SEEDING: 'SEEDING',
    RING_BUILDING: 'RING_BUILDING',
    EXPANSION: 'EXPANSION',
    STABLE: 'STABLE',
};
let simulationPhase = SimulationPhase.SEEDING;

// --- Main Animation Loop ---
function animate() {
    if (!simulationRunning) return;
    requestAnimationFrame(animate);

    // State-driven deployment
    switch (simulationPhase) {
        case SimulationPhase.SEEDING:
            seedAnchor(scene, satellites, params);
            simulationPhase = SimulationPhase.RING_BUILDING;
            break;
        case SimulationPhase.RING_BUILDING:
            buildRing(scene, satellites, params);
            simulationPhase = SimulationPhase.EXPANSION;
            break;
        case SimulationPhase.EXPANSION:
            const satellitesAdded = expandConstellation(scene, satellites, params);
            if (!satellitesAdded) { // If no more satellites can be added
                simulationPhase = SimulationPhase.STABLE;
            }
            break;
        case SimulationPhase.STABLE:
            // Do nothing, the constellation is stable
            break;
    }

    const delta = clock.getDelta();

    // Core simulation logic
    updateSatelliteOrbits(satellites, params, delta);
    updateNeighborDetection(satellites, params);
    checkNetworkStatus(satellites, params);

    const correctionResult = selfCorrect(scene, satellites);
    satellites = correctionResult.updatedSatellites;
    if (correctionResult.wasCorrected) {
        simulationPhase = SimulationPhase.EXPANSION; // Go back to expansion if satellites were removed
    }

    if (updateCoverageVisualization(testPoints, satellites, params)) {
        simulationRunning = false;
        console.log("Target coverage reached. Halting simulation.");
    }

    renderer.render(scene, camera);
}

animate();
