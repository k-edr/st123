import * as THREE from 'three';
import { GUI } from 'dat.gui';
import {
    createTestPoints,
    updateSatelliteOrbits,
    updateNeighborDetection,
    checkNetworkStatus,
    deployConstellation,
    selfCorrect,
    updateCoverageVisualization,
} from './simulation.js';

// UI
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
gui.add(params, 'targetNeighborCount', 1, 5);
gui.add(params, 'satelliteCoverageRadius', 1, 100);
gui.add(params, 'minPlacementDistance', 1, 100);
gui.add(params, 'maxPlacementDistance', 1, 100);

// Basic scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Basic lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const pointLight = new THREE.PointLight(0xffffff, 1);
pointLight.position.set(5, 5, 5);
scene.add(pointLight);

// Planet
const planetGeometry = new THREE.SphereGeometry(60, 32, 32);
const planetMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const planet = new THREE.Mesh(planetGeometry, planetMaterial);
scene.add(planet);

// Atmosphere
const atmosphereGeometry = new THREE.SphereGeometry(80, 32, 32);
const atmosphereMaterial = new THREE.MeshStandardMaterial({
    color: 0x0000ff,
    transparent: true,
    opacity: 0.2,
});
const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
scene.add(atmosphere);

// Satellites
const satellites = [];

// Coverage Test Points
const testPoints = [];
createTestPoints(scene, testPoints);

camera.position.z = 200;

deployConstellation(scene, satellites, params);

let simulationRunning = true;

function animate() {
    if (!simulationRunning) {
        return;
    }

    requestAnimationFrame(animate);

    updateSatelliteOrbits(satellites, params);
    updateNeighborDetection(satellites, params);
    checkNetworkStatus(satellites, params);
    selfCorrect(scene, satellites, params);
    if (updateCoverageVisualization(testPoints, satellites, params)) {
        simulationRunning = false;
        console.log("Target coverage reached. Halting simulation.");
    }

    renderer.render(scene, camera);
}
animate();
