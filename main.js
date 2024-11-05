import * as THREE from 'three';

import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let camera, scene, renderer, controls, stats;

let mesh;
let oldMesh;
const amount = parseInt(window.location.search.slice(1)) || 10;
const count = Math.pow(amount, 3);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(1, 1);

const color = new THREE.Color();

const settings = {
    simResMul: 2,
    visRes: 20,
    viewportX: 10,
    viewportY: 10,
    viewportZ: 10,
    scale: true,
};

init();

function f(x,y,z) {
    x = (x - 5) * 2
    y = (y - 5) * 2
    z = (z - 5) * 2
    if (x**2 + y**2 > 80) {
        return 0
    }
    if (x**2 + y**2 < 50 && x**2 + y**2 > 20) {
        return 0
    }
    if (x**2 + y**2 < 10) {
        return 0
    }
    return ((x) * 0.5)**2 + ((y) * 0.5)**2 
}

function hemisphere(x,y,z) {
    if (x**2 + y**2 + z**2 > 100) {
        return 0
    }
    if (x**2 + y**2 + z**2 < 50) {
        return 0
    }
    return ((x) * 0.5)**2 + ((y) * 0.5)**2 + ((z) * 0.5) ** 2
}


function init() {

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(amount, amount, amount);
    camera.lookAt(0, 0, 0);

    scene = new THREE.Scene();

    const light = new THREE.HemisphereLight(0xffffff, 0x888888, 3);
    light.position.set(0, 1, 0);
    scene.add(light);


    render()

    // Rendering 3D axis
    const createAxisLine = (color, start, end) => {
        const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
        const material = new THREE.LineBasicMaterial({ color: color });
        return new THREE.Line(geometry, material);
    };
    const xAxis = createAxisLine(0xff0000, new THREE.Vector3(0, 0, 0), new THREE.Vector3(3, 0, 0)); // Red
    const yAxis = createAxisLine(0x00ff00, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 3, 0)); // Green
    const zAxis = createAxisLine(0x0000ff, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 3)); // Blue
    scene.add(xAxis);
    scene.add(yAxis);
    scene.add(zAxis);

    const gui = new GUI();

    gui.add( settings, 'simResMul', 0, 2, 1)
        .onChange(() => render()); 
    gui.add( settings, 'visRes', 0, 40, 10)
        .onChange(() => render());
    gui.add( settings, 'scale')
        .onChange(() => render());

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

}

function render() {
    const matrix = new THREE.Matrix4();
    let geometry;
    if (settings.scale) {
        geometry = new THREE.IcosahedronGeometry(0.25, 3);
    } else {
        geometry = new THREE.BoxGeometry( 10 / settings.visRes, 10 / settings.visRes, 10 / settings.visRes);
    }
    const material = new THREE.MeshPhongMaterial({ color: 0x00ffffff });
    mesh = new THREE.InstancedMesh(geometry, material, settings.visRes ** 3 - 1);

    let i = 0;
    const offset = settings.viewportX / 2;

    let sim = {}
    let fpMax = -9999999
    let fpMin = 9999999
    const dsx = settings.viewportX / (settings.simResMul * settings.visRes)
    const dsy = settings.viewportY / (settings.simResMul * settings.visRes)
    const dsz = settings.viewportZ / (settings.simResMul * settings.visRes)
    for (let x = 0; x < settings.viewportX ; x += dsx) {
        for (let y = 0; y < settings.viewportY; y += dsy){
            for (let z = 0; z < settings.viewportZ; z += dsz){

                const fp = f(x,y,z);
                sim[`${x} ${y} ${z}`] = fp;
                if (fp > fpMax) {
                    fpMax = fp;
                }
                if (fp < fpMin ) {
                    fpMin = fp;
                }

            }
        }
    }
    const fpNormalizeOffset = -fpMin
    const fpNormalizeMultiplier = 1 / (fpMax - fpMin)
    console.log(sim)

    const dvx = settings.viewportX / settings.visRes
    const dvy = settings.viewportY / settings.visRes
    const dvz = settings.viewportZ / settings.visRes
    for (let x = 0; x < settings.viewportX ; x += dvx) {
        for (let y = 0; y < settings.viewportY; y += dvy){
            for (let z = 0; z < settings.viewportZ; z += dvz){

                console.log(`${x} ${y} ${z}`)
                const fp = (sim[`${x} ${y} ${z}`] - fpNormalizeOffset) * fpNormalizeMultiplier;
                if (fp === 0) {
                    continue;
                }
                if (settings.scale) {
                    matrix.scale(new THREE.Vector3(fp, fp, fp))
                }
                matrix.setPosition(x, y, z);

                mesh.setMatrixAt(i, matrix);
                mesh.setColorAt(i, new THREE.Color().setHSL(-fp, 0.8, 0.5));
                if (settings.scale) {
                    matrix.scale(new THREE.Vector3(1/fp, 1/fp, 1/fp))
                }

                i++;

            }
        }
    }
    scene.remove(oldMesh)
    scene.add(mesh)
    oldMesh = mesh
}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

function animate() {

    controls.update();

    renderer.render(scene, camera);

    stats.update();

}