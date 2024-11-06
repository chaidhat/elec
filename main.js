import * as THREE from 'three';

import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let camera, scene, renderer, controls, stats;

let mesh;
let oldMesh;
let lines = [];
const amount = parseInt(window.location.search.slice(1)) || 10;
const count = Math.pow(amount, 3);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(1, 1);

const color = new THREE.Color();

const settings = {
    simRes: 1.5,
    fieldRes: 10,
    viewportXmin: -10,
    viewportXmax: 10,
    viewportYmin: -10,
    viewportYmax: 10,
    viewportZmin: -10,
    viewportZmax: 10,
    scale: false,
};

init();

function f(x,y,z) {
    return hemisphere(x,y,z)
}
function coaxial(x,y,z) {
    x = (z) * 2
    y = (y) * 2
    z = (x) * 2
    if (80 < x**2 + y**2 && x**2 + y**2 < 100) {
        return 1
    }
    if (x**2 + y**2 < 20) {
        return -1
    }
    return 0
}

function hemisphere(x,y,z) {
    if (x > 0) {
        return 0;
    }
    if (x**2 + y**2 + z**2 > 100) {
        return 0
    }
    if (x**2 + y**2 + z**2 < 50) {
        return 0
    }
    return ((x) * 0.5)**2 + ((y) * 0.5)**2 + ((z) * 0.5) ** 2
}


function init() {

    camera = new THREE.OrthographicCamera(  window.innerWidth / -20,  window.innerWidth / 20,  window.innerHeight / 20,  window.innerHeight / - 20, 1, 1000 );
    camera.position.set(amount, amount, amount);
    camera.lookAt(0, 0, 0);

    scene = new THREE.Scene();

    const light = new THREE.HemisphereLight(0xffffff, 0x888888, 3);
    light.position.set(0, 1, 0);
    scene.add(light);


    const sim = simulate();
    render(sim);
    renderFieldLines(sim);

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

    gui.add( settings, 'fieldRes', 0, 10, 1)
        .onChange(() => {
            const sim = simulate();
            render(sim);
        }); 
    gui.add( settings, 'simRes', 0, 3)
        .onChange(() => {
            const sim = simulate();
            render(sim);
        }); 
    gui.add( settings, 'scale')
        .onChange(() => {
            const sim = simulate();
            render(sim);
        }); 
    gui.add( settings, 'viewportXmin', -10, 1, 1)
        .onChange(() => {
            const sim = simulate();
            render(sim);
        }); 

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

function simulate() {
    const physicalScale = 1 / settings.simRes;

    // simulate
    let sim = {}
    let fpMax = -9999999
    let fpMin = 9999999
    for (let x = settings.viewportXmin / physicalScale; x < settings.viewportXmax / physicalScale; x++) {
        sim[x] = {}
        for (let y = settings.viewportYmin / physicalScale; y < settings.viewportYmax / physicalScale; y++){
            sim[x][y] = {}
            for (let z = settings.viewportZmin / physicalScale; z < settings.viewportZmax / physicalScale; z++){

                const fp = f(x * physicalScale, y * physicalScale, z * physicalScale);
                sim[x][y][z] = fp
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
    const metaSim = {
        sim: sim,
        fpNormalizeOffset: fpNormalizeOffset,
        fpNormalizeMultiplier: fpNormalizeMultiplier
    }
    return metaSim;
}

function render(metaSim) {
    const sim = metaSim.sim;
    const fpNormalizeOffset = metaSim.fpNormalizeOffset;
    const fpNormalizeMultiplier = metaSim.fpNormalizeMultiplier;

    const physicalScale = 1 / settings.simRes;

    const matrix = new THREE.Matrix4();
    let geometry;
    if (settings.scale) {
        geometry = new THREE.IcosahedronGeometry(0.5 * physicalScale, 2);
    } else {
        geometry = new THREE.BoxGeometry(1 * physicalScale, 1 * physicalScale, 1 * physicalScale);
    }
    const material = new THREE.MeshPhongMaterial({ color: 0x00ffffff });
    mesh = new THREE.InstancedMesh(geometry, material, ((settings.viewportXmax *2) / physicalScale) ** 3);

    let i = 0;


    // visualize
    for (let x = settings.viewportXmin / physicalScale; x < settings.viewportXmax / physicalScale; x++) {
        for (let y = settings.viewportYmin / physicalScale; y < settings.viewportYmax / physicalScale; y++){
            for (let z = settings.viewportZmin / physicalScale; z < settings.viewportZmax / physicalScale; z++){

                const fp = (sim[x][y][z] - fpNormalizeOffset) * fpNormalizeMultiplier;
                if (sim[x][y][z] === 0) {
                    continue;
                }
                if (settings.scale) {
                    matrix.scale(new THREE.Vector3(fp, fp, fp))
                }
                matrix.setPosition(x * physicalScale, y * physicalScale, z * physicalScale);

                mesh.setMatrixAt(i, matrix);
                mesh.setColorAt(i, new THREE.Color().setHSL(-fp, 0.8, 0.2));
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

function renderFieldLines(metaSim) {
    const sim = metaSim.sim;

    const physicalScale = 1 / settings.simRes;

    for (let i = 0; i < lines.length; i++) {
        scene.remove(lines.pop())
    }
    const dfx = 8
    const dfy = 8
    const dfz = 8

    const dfMicro = 0.5

    const fieldSize = 4;
    const microThreshold = 5;

    let r = 20
    let x, y, z;
    let isMicro = false;
    for (x = settings.viewportXmin * fieldSize / physicalScale; x < settings.viewportXmax * fieldSize / physicalScale; x += dfx) {
        for (y = settings.viewportYmin * fieldSize / physicalScale; y < settings.viewportYmax * fieldSize / physicalScale; y += dfy) {
            for (z = settings.viewportZmin * fieldSize / physicalScale; z < settings.viewportZmax * fieldSize / physicalScale; z += dfz) {
                const lineMaterial = new THREE.LineBasicMaterial( { color: 0xffffff } );

                const points = drawLine(sim, x, y, z);

                const lineGeometry = new THREE.BufferGeometry().setFromPoints( points );
                const line = new THREE.Line( lineGeometry, lineMaterial );
                scene.add( line );
                lines.push(line)
            }
        }
    }

    for (y = -microThreshold / physicalScale; y < microThreshold / physicalScale; y += dfMicro) {
        for (z = -microThreshold / physicalScale; z < microThreshold / physicalScale; z += dfMicro) {
            const lineMaterial = new THREE.LineBasicMaterial( { color: 0xffffff } );

            const points = drawLine(sim, 0, y, z);

            const lineGeometry = new THREE.BufferGeometry().setFromPoints( points );
            const line = new THREE.Line( lineGeometry, lineMaterial );
            scene.add( line );
            lines.push(line)
        }
    }
}

function drawLine(sim, x, y, z) {
    const physicalScale = 1 / settings.simRes;
    const k = 0.01

    let Ex = 0;
    let Ey = 0;
    let Ez = 0;
    for (let px = settings.viewportXmin / physicalScale; px < settings.viewportXmax / physicalScale; px++) {
        for (let py = settings.viewportYmin / physicalScale; py < settings.viewportYmax / physicalScale; py++){
            for (let pz = settings.viewportZmin / physicalScale; pz < settings.viewportZmax / physicalScale; pz++){
                // E = (k*q) / r^2
                const dx = (x - px) * physicalScale
                const dy = (y - py) * physicalScale
                const dz = (z - pz) * physicalScale
                // q = sim[x][y][z]
                const r = Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2)
                if (r !== 0) {
                    const q = sim[px][py][pz]
                    Ex += dx * k * q / (r**3)
                    Ey += dy * k * q / (r**3)
                    Ez += dz * k * q / (r**3)
                }
            }
        }
    }

    const points = [];
    points.push( new THREE.Vector3( x, y, z ) );
    points.push( new THREE.Vector3( x - Ex, y - Ey, z - Ez) );
    return points;
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