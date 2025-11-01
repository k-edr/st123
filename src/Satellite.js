import * as THREE from '../node_modules/three/build/three.module.js';

class Satellite {
    constructor(position, scene, coverageRadius) {
        this.position = position;
        this.scene = scene;
        this.neighbors = [];
        this.status = 'Red'; // Default status

        // Satellite mesh
        const geometry = new THREE.SphereGeometry(2, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.scene.add(this.mesh);

        // Coverage sphere
        const coverageGeometry = new THREE.SphereGeometry(coverageRadius, 32, 32);
        const coverageMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.1,
        });
        this.coverageSphere = new THREE.Mesh(coverageGeometry, coverageMaterial);
        this.coverageSphere.position.copy(position);
        this.scene.add(this.coverageSphere);
    }

    setStatus(status) {
        this.status = status;
        switch (status) {
            case 'Red':
                this.mesh.material.color.setHex(0xff0000);
                break;
            case 'Yellow':
                this.mesh.material.color.setHex(0xffff00);
                break;
            case 'Green':
                this.mesh.material.color.setHex(0x00ff00);
                break;
        }
    }
}

export default Satellite;
