// ==========================================
// PHASE 2: Three.js (The 3D World)
// ==========================================
let scene, camera, renderer, orbitControls;
let characterModel;
let meshes = {};
let originalMaterials = {};
window.partTextures = {};

function initThreeJS() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 2.5;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    window.threeRenderer = renderer;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    // Orbit Controls
    orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    // Load Character Model
    const loader = new THREE.GLTFLoader();
    loader.load('character_template_4.glb', function (gltf) {
        characterModel = gltf.scene;
        scene.add(characterModel);

        let meshNames = [];
        characterModel.traverse((child) => {
            if (child.isMesh) {
                meshes[child.name] = child;
                // Clone original materials so we don't mutate shared ones accidently
                originalMaterials[child.name] = child.material.clone ? child.material.clone() : child.material;
                meshNames.push(child.name);
            }
        });

        // Center and scale camera to fit model
        const box = new THREE.Box3().setFromObject(characterModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        camera.position.z = center.z + cameraZ * 1.5;
        camera.position.y = center.y;
        orbitControls.target.copy(center);
        orbitControls.update();

        // Inform p5.js sketch about the meshes
        if (typeof populateMeshDropdown === 'function') {
            populateMeshDropdown(meshNames);
        }
    });

    animateThreeJS();
}

window.assignTextureToPart = function (name, canvasElt) {
    if (!meshes[name]) return;

    // Dispose old texture if exists to avoid memory leak
    if (window.partTextures[name]) {
        window.partTextures[name].dispose();
    }

    let tex = new THREE.CanvasTexture(canvasElt);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.encoding = typeof THREE.sRGBEncoding !== 'undefined' ? THREE.sRGBEncoding : 3001; // Handle older r128 property
    window.partTextures[name] = tex;

    let mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.3,
        metalness: 0.1,
        transparent: true,
        alphaTest: 0.01,
        side: THREE.DoubleSide
    });
    meshes[name].material = mat;
};

window.resetPartMaterial = function (name) {
    if (meshes[name] && originalMaterials[name]) {
        meshes[name].material = originalMaterials[name];
    }
    if (window.partTextures[name]) {
        window.partTextures[name].dispose();
        delete window.partTextures[name];
    }
};

function animateThreeJS() {
    requestAnimationFrame(animateThreeJS);
    if (orbitControls) orbitControls.update();
    renderer.render(scene, camera);
}

function windowResized() {
    if (renderer) {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    }
}
window.addEventListener('resize', windowResized);
