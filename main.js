import * as THREE from 'three';

import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let camera, scene, renderer, controls, stats;

let mesh;
const amount = parseInt(window.location.search.slice(1)) || 10;
const count = Math.pow(amount, 3);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(1, 1);

const color = new THREE.Color();

const settings = {
    simRes: 10,
    visRes: 10,
};

init();

function f(x,y,z) {
    return x *0.1 + y*0.1 + z*0.1
}


function init() {

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(amount, amount, amount);
    camera.lookAt(0, 0, 0);

    scene = new THREE.Scene();

    const light = new THREE.HemisphereLight(0xffffff, 0x888888, 3);
    light.position.set(0, 1, 0);
    scene.add(light);

    const geometry = new THREE.IcosahedronGeometry(0.5, 3);
    const material = new THREE.MeshPhongMaterial({ color: 0xffffff });

    mesh = new THREE.InstancedMesh(geometry, material, count);


    render()
    scene.add(mesh);

    //

    const gui = new GUI();

    gui.add( settings, 'simRes', 0, 10);  // Checkbox
    gui.add( settings, 'visRes', 0, 10, 1)
        .onChange(() => render());  // Checkbox

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    stats = new Stats();
    document.body.appendChild(stats.dom);

    window.addEventListener('resize', onWindowResize);
    document.addEventListener('mousemove', onMouseMove);

}

function render() {
    const matrix = new THREE.Matrix4();

    let i = 0;
    const offset = (amount - 1) / 2;

    for (let x = 0; x < settings.visRes; x++) {

        for (let y = 0; y < settings.visRes; y++) {

            for (let z = 0; z < settings.visRes; z++) {

                const fp = Math.min(Math.max(f(x,y,z),0),1);
                if (fp === 0) {
                    continue;
                }
                matrix.scale(new THREE.Vector3(fp, fp, fp))
                matrix.setPosition(offset - x, offset - y, offset - z);

                mesh.setMatrixAt(i, matrix);
                const color = new THREE.Color().setHex( 0x112233 );
                mesh.setColorAt(i, new THREE.Color().setHSL(-fp, 0.5, 0.5));
                matrix.scale(new THREE.Vector3(1/fp, 1/fp, 1/fp))

                i++;

            }

        }

    }
    console.log("rendering")
}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

function onMouseMove(event) {

    event.preventDefault();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

}

function animate() {

    controls.update();

    renderer.render(scene, camera);

    stats.update();

}