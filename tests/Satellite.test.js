import { jest } from '@jest/globals';
import * as THREE from 'three';
import Satellite from '../src/Satellite.js';

describe('Satellite', () => {
    let scene;

    beforeEach(() => {
        scene = new THREE.Scene();
    });

    test('constructor', () => {
        const position = new THREE.Vector3(0, 0, 0);
        const satellite = new Satellite(position, scene, 50);
        expect(satellite.position).toBe(position);
        expect(satellite.scene).toBe(scene);
        expect(satellite.neighbors).toEqual([]);
        expect(satellite.status).toBe('Red');
        expect(satellite.mesh).toBeDefined();
        expect(satellite.coverageSphere).toBeDefined();
    });

    test('setStatus', () => {
        const satellite = new Satellite(new THREE.Vector3(), scene, 50);
        satellite.setStatus('Green');
        expect(satellite.status).toBe('Green');
        expect(satellite.mesh.material.color.getHex()).toBe(0x00ff00);
        satellite.setStatus('Yellow');
        expect(satellite.status).toBe('Yellow');
        expect(satellite.mesh.material.color.getHex()).toBe(0xffff00);
        satellite.setStatus('Red');
        expect(satellite.status).toBe('Red');
        expect(satellite.mesh.material.color.getHex()).toBe(0xff0000);
    });
});
