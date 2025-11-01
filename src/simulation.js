import * as THREE from '../node_modules/three/build/three.module.js';
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

export function updateSatelliteOrbits(satellites, params, delta) {
    // Use a consistent, simulation-scaled gravitational parameter (mu = G * M)
    // This value is chosen for stable and visually appealing orbits in the simulation's scale.
    const mu = 200000;
    const r = 145; // Orbital radius in scene units

    const orbitalSpeed = Math.sqrt(mu / r);

    satellites.forEach(satellite => {
        const angle = (orbitalSpeed / r) * delta * params.timeScale;
        const axis = new THREE.Vector3(0, 1, 0); // Orbit around the Y-axis
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
    if (satellites.length === 0) return;

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
    const visited = new Set([start]);
    while (queue.length > 0) {
        const current = queue.shift();
        if (current === end) return true;
        for (const neighbor of current.neighbors) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
            }
        }
    }
    return false;
}

export function seedAnchor(scene, satellites, params) {
    const anchorPosition = new THREE.Vector3(0, 145, 0);
    const anchor = new Satellite(anchorPosition, scene, params.satelliteCoverageRadius);
    satellites.push(anchor);
}

export function buildRing(scene, satellites, params) {
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

export function expandConstellation(scene, satellites, params) {
    let satellitesAdded = false;
    const satellitesToAdd = [];
    const orbitalRadius = 145;

    satellites.forEach(satellite => {
        if (satellite.status === 'Green' || satellite.status === 'Yellow') {
            const currentPos = satellite.mesh.position;

            // 1. Get satellite's velocity vector (tangent to the orbit)
            const up = new THREE.Vector3(0, 1, 0); // Assuming orbit is around Y-axis
            const velocity = new THREE.Vector3().crossVectors(up, currentPos).normalize();

            // 2. Get the "right" and "left" vectors in the orbital plane
            const right = velocity.clone();
            const left = velocity.clone().negate();

            // 3. Create potential new positions
            const potentialPositions = [
                currentPos.clone().add(right.multiplyScalar(params.maxPlacementDistance - 0.5)),
                currentPos.clone().add(left.multiplyScalar(params.maxPlacementDistance - 0.5))
            ];

            potentialPositions.forEach(newPosition => {
                newPosition.normalize().multiplyScalar(orbitalRadius);

                // Check placement rules
                let validPlacement = true;
                if (currentPos.distanceTo(newPosition) < params.minPlacementDistance || currentPos.distanceTo(newPosition) > params.maxPlacementDistance) {
                    validPlacement = false;
                }
                for (const otherSatellite of satellites) {
                    if (otherSatellite.mesh.position.distanceTo(newPosition) < params.minPlacementDistance) {
                        validPlacement = false;
                        break;
                    }
                }

                if (validPlacement) {
                    const newSatellite = new Satellite(newPosition, scene, params.satelliteCoverageRadius);
                    satellitesToAdd.push(newSatellite);
                    satellitesAdded = true;
                }
            });
        }
    });

    satellites.push(...satellitesToAdd);
    return satellitesAdded;
}

export function selfCorrect(scene, satellites) {
    const redSatellites = satellites.filter(s => s.status === 'Red');
    if (redSatellites.length > 0) {
        redSatellites.forEach(s => {
            scene.remove(s.mesh);
            scene.remove(s.coverageSphere);
        });
        // This function now returns a new array, it must be reassigned in the caller.
        return { updatedSatellites: satellites.filter(s => s.status !== 'Red'), wasCorrected: true };
    }
    return { updatedSatellites: satellites, wasCorrected: false };
}

export function updateCoverageVisualization(testPoints, satellites, params) {
    let coveredPoints = 0;
    testPoints.forEach(point => {
        let isCovered = false;
        for (const satellite of satellites) {
            if (point.position.distanceTo(satellite.mesh.position) <= params.satelliteCoverageRadius) {
                isCovered = true;
                break;
            }
        }

        if (isCovered) {
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
    return coveragePercentage >= params.targetCoverage;
}
