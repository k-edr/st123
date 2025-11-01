import { jest } from '@jest/globals';
import {
    updateSatelliteOrbits,
    expandConstellation,
    // ... other imports
} from '../src/simulation.js';
import Satellite from '../src/Satellite.js';

// Define the mock class first
class MockVector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    clone() { return new MockVector3(this.x, this.y, this.z); }
    add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
    negate() { this.x = -this.x; this.y = -this.y; this.z = -this.z; return this; }
    normalize() {
        const len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        if (len > 0) { this.x /= len; this.y /= len; this.z /= len; }
        return this;
    }
    multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
    distanceTo(v) {
        const dx = this.x - v.x; const dy = this.y - v.y; const dz = this.z - v.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    applyAxisAngle(axis, angle) {
        const cos = Math.cos(angle); const sin = Math.sin(angle);
        const x = this.x; const z = this.z;
        this.x = x * cos - z * sin;
        this.z = x * sin + z * cos;
        return this;
    }
    crossVectors(a, b) {
        this.x = a.y * b.z - a.z * b.y;
        this.y = a.z * b.x - a.x * b.z;
        this.z = a.x * b.y - a.y * b.x;
        return this;
    }
}

// Now, mock the module and use the defined class
jest.mock('three', () => ({
    ...jest.requireActual('three'),
    Vector3: MockVector3,
}));


jest.mock('../src/Satellite.js', () => {
    return jest.fn().mockImplementation((position, scene, coverageRadius) => ({
        position,
        scene,
        coverageSphere: {
            geometry: { dispose: jest.fn() },
            position: { copy: jest.fn() },
        },
        mesh: {
            position,
            material: { color: { setHex: jest.fn() } },
        },
        setStatus: jest.fn(),
        neighbors: [],
    }));
});

describe('simulation enhanced tests', () => {
    let satellites;
    let params;
    let scene;

    beforeEach(() => {
        satellites = [];
        params = {
            timeScale: 1,
            satelliteCoverageRadius: 50,
            minPlacementDistance: 45,
            maxPlacementDistance: 50,
        };
        scene = { add: jest.fn(), remove: jest.fn() };
        Satellite.mockClear();
    });

    describe('updateSatelliteOrbits', () => {
        test('should update satellite position based on physics', () => {
            const initialPosition = new MockVector3(145, 0, 0);
            const satellite = {
                mesh: { position: initialPosition.clone() },
                coverageSphere: { position: { copy: jest.fn() } }
            };
            satellites.push(satellite);
            updateSatelliteOrbits(satellites, params, 0.1);
            expect(satellite.mesh.position.x).not.toBe(145);
            expect(satellite.coverageSphere.position.copy).toHaveBeenCalledWith(satellite.mesh.position);
        });
    });

    describe('expandConstellation', () => {
        test('should place new satellites deterministically within the valid range', () => {
            const initialSat = {
                status: 'Green',
                mesh: { position: new MockVector3(145, 0, 0) },
            };
            satellites.push(initialSat);
            expandConstellation(scene, satellites, params);
            expect(satellites.length).toBe(3);
            const distance = initialSat.mesh.position.distanceTo(satellites[1].position);
            expect(distance).toBeGreaterThanOrEqual(params.minPlacementDistance);
            expect(distance).toBeLessThanOrEqual(params.maxPlacementDistance);
        });
    });
});
