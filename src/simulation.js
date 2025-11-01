import * as THREE from 'three';
import Satellite from './Satellite.js';

export function createTestPoints(scene, testPoints) {
    const samples = 5000;
    const radius = 60;
    const offset = 2 / samples;
    const increment = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < samples; i++) {
        const y = ((i * offset) - 1) + (offset / 2);
        const r = Math.sqrt(1 - Math.pow(y, 2));
        const phi = ((i + 1) % samples) * increment;
        const x = Math.cos(phi) * r;
        const z = Math.sin(phi) * r;

        const point = new THREE.Vector3(x, y, z).multiplyScalar(radius);
        const pointGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const pointMesh = new THREE.Mesh(pointGeometry, pointMaterial);
        pointMesh.position.copy(point);
        scene.add(pointMesh);
        testPoints.push({ mesh: pointMesh, position: point, status: 'Red', uncoveredTime: 0 });
    }
}

export function updateSatelliteOrbits(satellites, params) {
    const G = 6.67430e-11; // Gravitational constant
    const M = 5.972e24; // Mass of the Earth (or planet)
    const r = 145000; // Orbital radius in meters (60km + 85km)
    const orbitalSpeed = Math.sqrt((G * M) / r);

    satellites.forEach(satellite => {
        // Orbit around the planet's y-axis
        const angle = (orbitalSpeed / r) * 0.016 * params.timeScale; // Time step of 16ms for 60fps
        const axis = new THREE.Vector3(0, 1, 0);
        satellite.mesh.position.applyAxisAngle(axis, angle);
        satellite.coverageSphere.position.copy(satellite.mesh.position);
    });
}

export function updateNeighborDetection(satellites, params) {
    satellites.forEach(satellite => {
        satellite.neighbors = [];
        satellites.forEach(otherSatellite => {
            if (satellite !== otherSatellite) {
                const distance = satellite.mesh.position.distanceTo(otherSatellite.mesh.position);
                if (distance <= params.satelliteCoverageRadius * 2) {
                    satellite.neighbors.push(otherSatellite);
                }
            }
        });
    });
}

export function checkNetworkStatus(satellites, params) {
    if (satellites.length === 0) {
        return;
    }

    const anchor = satellites[0];
    anchor.setStatus('Green');

    for (let i = 1; i < satellites.length; i++) {
        const satellite = satellites[i];
        const hasPath = bfs(satellite, anchor);
        if (satellite.neighbors.length === 0 || !hasPath) {
            satellite.setStatus('Red');
        } else if (satellite.neighbors.length >= params.targetNeighborCount) {
            satellite.setStatus('Green');
        } else {
            satellite.setStatus('Yellow');
        }
    }
}

export function bfs(start, end) {
    const queue = [start];
    const visited = new Set();
    visited.add(start);

    while (queue.length > 0) {
        const current = queue.shift();
        if (current === end) {
            return true;
        }
        for (const neighbor of current.neighbors) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
            }
        }
    }
    return false;
}

export function deployConstellation(scene, satellites, params) {
    // Phase 1: Place anchor satellite
    if (satellites.length === 0) {
        const anchorPosition = new THREE.Vector3(0, 145, 0);
        const anchor = new Satellite(anchorPosition, scene, params.satelliteCoverageRadius);
        satellites.push(anchor);
    }

    // Phase 2: Build a stable ring around the anchor
    if (satellites.length === 1) {
        const anchor = satellites[0];
        const ringRadius = 90;
        const numSatellitesInRing = 6;
        for (let i = 0; i < numSatellitesInRing; i++) {
            const angle = (i / numSatellitesInRing) * Math.PI * 2;
            const x = Math.cos(angle) * ringRadius;
            const z = Math.sin(angle) * ringRadius;
            const y = Math.sqrt(145 * 145 - ringRadius * ringRadius);
            const position = new THREE.Vector3(x, y, z);
            const satellite = new Satellite(position, scene, params.satelliteCoverageRadius);
            satellites.push(satellite);
        }
    }

    // Phase 3: Expansion
    const satellitesToAdd = [];
    satellites.forEach(satellite => {
        if (satellite.status === 'Green' || satellite.status === 'Yellow') {
            // Attempt to place two new neighbors
            for (let i = 0; i < 2; i++) {
                const newPosition = satellite.mesh.position.clone().add(new THREE.Vector3(Math.random() * 100 - 50, Math.random() * 100 - 50, Math.random() * 100 - 50));
                newPosition.normalize().multiplyScalar(145);

                // Check placement rules
                let validPlacement = true;
                if (satellite.mesh.position.distanceTo(newPosition) < params.minPlacementDistance || satellite.mesh.position.distanceTo(newPosition) > params.maxPlacementDistance) {
                    validPlacement = false;
                }
                satellites.forEach(otherSatellite => {
                    if (otherSatellite.mesh.position.distanceTo(newPosition) < params.minPlacementDistance) {
                        validPlacement = false;
                    }
                });

                if (validPlacement) {
                    const newSatellite = new Satellite(newPosition, scene, params.satelliteCoverageRadius);
                    satellitesToAdd.push(newSatellite);
                }
            }
        }
    });
    satellites.push(...satellitesToAdd);
}

export function selfCorrect(scene, satellites, params) {
    const redSatellites = satellites.filter(s => s.status === 'Red');
    if (redSatellites.length > 0) {
        redSatellites.forEach(s => {
            scene.remove(s.mesh);
            scene.remove(s.coverageSphere);
        });
        satellites = satellites.filter(s => s.status !== 'Red');
    }
}

export function updateCoverageVisualization(testPoints, satellites, params) {
    let coveredPoints = 0;
    testPoints.forEach(point => {
        let covered = false;
        satellites.forEach(satellite => {
            if (point.position.distanceTo(satellite.mesh.position) <= params.satelliteCoverageRadius) {
                covered = true;
            }
        });

        if (covered) {
            point.mesh.material.color.setHex(0x808080); // Grey
            point.status = 'Grey';
            point.uncoveredTime = 0;
            coveredPoints++;
        } else {
            point.uncoveredTime += 0.016 * params.timeScale;
            if (point.uncoveredTime > 300) { // 5 minutes
                point.mesh.material.color.setHex(0x800080); // Purple
                point.status = 'Purple';
            } else {
                point.mesh.material.color.setHex(0xff0000); // Red
                point.status = 'Red';
            }
        }
    });

    const coveragePercentage = (coveredPoints / testPoints.length) * 100;
    if (coveragePercentage >= params.targetCoverage) {
        // Stop the simulation
        return true;
    }
    return false;
}
