// ==========================================
// PHASE 1: p5.js (The Generative Texture)
// ==========================================
let glitchShader;
let lineShader;
let lionsShader;
let asciiShader;
let p5Canvas;
let partConfigs = {};
let partBuffers = {};
let stockImages = [];

let viewportPG;

const PALETTE = [
    '#D9E0A6', '#A8CE40', '#72A047', '#2E6130', '#0D4038'
];

let minFungiSlider, maxFungiSlider, spreadSlider, minSizeSlider, maxSizeSlider, layersSlider, gapSlider, glitchSpeedSlider, pixelSlider, typeSelect, meshSelect;
let slCount, slLength, devSpreadSlider, slCurve, slSharp, slVein, slChaos, devCoreSlider;
let lmLengthSlider, lmDensitySlider, lmClusterSlider, lmCurlSlider, lmThickSlider, lmTipThickSlider, lmNoiseSlider, lmSpeedSlider;
let vpBlurSlider, vpPosterizeSlider, vpThresholdSlider;
let asciiResSlider, asciiAnimSpeedSlider, asciiImgSelectSlider;
let uiGroups = { common: [], glitch: [], solid: [], devils: [], lions: [], ascii: [] };

function preload() {
    glitchShader = loadShader('p5.js/digitalGlitch/shader.vert', 'p5.js/digitalGlitch/shader.frag');
    lineShader = loadShader('p5.js/digitalGlitch/lineShader.vert', 'p5.js/digitalGlitch/lineShader.frag');
    lionsShader = loadShader('p5.js/digitalGlitch/lionsShader.vert', 'p5.js/digitalGlitch/lionsShader.frag');
    asciiShader = loadShader('p5.js/digitalGlitch/asciiShader.vert', 'p5.js/digitalGlitch/asciiShader.frag');
    
    stockImages.push(loadImage('p5.js/stockImage_1.jpg'));
    stockImages.push(loadImage('p5.js/stockImages/stockImages_2.jpg'));
    stockImages.push(loadImage('p5.js/stockImages/stockImage_3.jpg'));
}

function setup() {
    setAttributes('preserveDrawingBuffer', true);
    p5Canvas = createCanvas(1024, 1024, WEBGL);

    setupUI();

    // Drag and drop config loader
    window.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
    window.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        let file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.json')) {
            let reader = new FileReader();
            reader.onload = (event) => {
                try {
                    let data = JSON.parse(event.target.result);
                    loadConfig(data);
                    console.log('Config loaded from drag & drop!');
                } catch (err) {
                    console.error('Failed to parse config.json:', err);
                }
            };
            reader.readAsText(file);
        }
    });

    if (typeof initThreeJS === 'function') {
        initThreeJS();
    }
}

function draw() {
    // We only render active configurations sequentially onto the single invisible WebGL canvas
    for (let partName in partConfigs) {
        let cfg = partConfigs[partName];
        cfg.time += cfg.config.glitchSpeed * 0.01;

        clear(); // Clears WebGL p5 canvas
        // background(20, 20, 22); // Removed so canvas is transparent!

        for (let i = 0; i < cfg.fungi.length; i++) {
            cfg.fungi[i].display(i, cfg.time, cfg.config.pixelScale);
        }

        // Copy to this part's permanent 2D buffer
        if (partBuffers[partName]) {
            let ctx = partBuffers[partName].getContext('2d');
            ctx.clearRect(0, 0, 1024, 1024); // clear the 2D buffer first!
            ctx.drawImage(p5Canvas.elt, 0, 0);
        }

        // Notify Three.js to pull the latest 2D buffer
        if (window.partTextures && window.partTextures[partName]) {
            window.partTextures[partName].needsUpdate = true;
        }
    }

    // Process live updating 2D Preview Display
    if (window.threeRenderer && window.threeRenderer.domElement) {
        if (!viewportPG) {
            viewportPG = createGraphics(500, 500);
            let pContainer = select('#viewport-preview');
            if (pContainer) {
                pContainer.elt.appendChild(viewportPG.elt);
            }
            // p5 natively applies inline 'display: none' to createGraphics objects.
            viewportPG.elt.style.display = 'block';
        }

        let threeCanvas = window.threeRenderer.domElement;
        let scaleFact = Math.max(500 / threeCanvas.width, 500 / threeCanvas.height);
        let dw = threeCanvas.width * scaleFact;
        let dh = threeCanvas.height * scaleFact;
        let dx = (500 - dw) / 2;
        let dy = (500 - dh) / 2;

        viewportPG.background('#bfbfbf');
        viewportPG.drawingContext.drawImage(threeCanvas, dx, dy, dw, dh);

        let blurLevel = vpBlurSlider ? vpBlurSlider.value() : 1;
        let posterizeLevel = vpPosterizeSlider ? vpPosterizeSlider.value() : 5;
        let threshold = vpThresholdSlider ? vpThresholdSlider.value() : 30;

        applyViewportFilters(viewportPG, blurLevel, posterizeLevel, threshold);
    }
}

function setupUI() {
    let container = createDiv().addClass('ui-container');
    createDiv('<h2>DIGITAL GLITCH FUNGUS</h2>').parent(container);

    let previewContainer = createDiv().addClass('preview-container').parent(select('body'));
    previewContainer.id('viewport-preview');

    const addControl = (label, el, group = 'common') => {
        let p = createDiv().addClass('ui-group').parent(container);
        createSpan('<label>' + label + '</label>').parent(p);
        el.parent(p);
        if (uiGroups[group]) uiGroups[group].push(p);
        return el;
    };

    typeSelect = createSelect();
    typeSelect.option('Mixed (All Types)');
    typeSelect.option('Only Glitch Fungus (Types 1-4)');
    typeSelect.option('Glitch Type 1: Lattice');
    typeSelect.option('Glitch Type 2: Pixel Shapes');
    typeSelect.option('Glitch Type 3: Lines');
    typeSelect.option('Glitch Type 4: Stair');
    typeSelect.option('Only Solid Fungus (Topo)');
    typeSelect.option('Only DevilsFingers');
    typeSelect.option('Only LionsMane');
    typeSelect.option('Only ASCII Fungus');
    addControl('Generation Type', typeSelect);
    typeSelect.changed(() => {
        updateGroupVisibility(typeSelect.value());
    });
    minFungiSlider = createSlider(1, 50, 15);
    addControl('Min Fungi Count', minFungiSlider, 'common');

    maxFungiSlider = createSlider(1, 100, 30);
    addControl('Max Fungi Count', maxFungiSlider, 'common');

    spreadSlider = createSlider(0, 500, 300);
    addControl('Cluster Spread', spreadSlider, 'common');

    minSizeSlider = createSlider(20, 200, 80);
    addControl('Min Size', minSizeSlider, 'common');

    maxSizeSlider = createSlider(50, 600, 350);
    addControl('Max Size', maxSizeSlider, 'common');

    layersSlider = createSlider(5, 50, 20);
    addControl('Topo Layers', layersSlider, 'solid');

    gapSlider = createSlider(1, 10, 3.5, 0.1);
    addControl('Layer Gap', gapSlider, 'solid');

    glitchSpeedSlider = createSlider(0, 50, 15);
    addControl('Glitch Speed', glitchSpeedSlider, 'glitch');

    pixelSlider = createSlider(4, 100, 25);
    addControl('Pixel Scale', pixelSlider, 'glitch');

    slCount = createSlider(3, 20, 10, 1);
    addControl('Finger Count', slCount, 'devils');
    slLength = createSlider(50, 400, 250, 5);
    addControl('Length', slLength, 'devils');
    devSpreadSlider = createSlider(1.04, 6.28, 6.28, 0.1);
    addControl('Spread Angle', devSpreadSlider, 'devils');
    slCurve = createSlider(0, 100, 30, 1);
    addControl('Curvature', slCurve, 'devils');
    slSharp = createSlider(0, 100, 80, 1);
    addControl('Tip Sharpness', slSharp, 'devils');
    slVein = createSlider(0, 15, 4, 0.5);
    addControl('Surface Veins', slVein, 'devils');
    slChaos = createSlider(0, 0.8, 0, 0.05);
    addControl('Growth Chaos', slChaos, 'devils');
    devCoreSlider = createSlider(0, 100, 30, 1);
    addControl('Core Size', devCoreSlider, 'devils');

    lmLengthSlider = createSlider(20, 250, 100, 5);
    addControl('Strand Length', lmLengthSlider, 'lions');
    lmDensitySlider = createSlider(50, 1500, 600, 10);
    addControl('Strand Density', lmDensitySlider, 'lions');
    lmClusterSlider = createSlider(10, 150, 60, 5);
    addControl('Cluster Size', lmClusterSlider, 'lions');
    lmCurlSlider = createSlider(0, 40, 15, 1);
    addControl('Curl Amount', lmCurlSlider, 'lions');
    lmThickSlider = createSlider(1, 20, 6, 0.5);
    addControl('Base Width', lmThickSlider, 'lions');
    lmTipThickSlider = createSlider(0, 20, 0, 0.5);
    addControl('Tip Width', lmTipThickSlider, 'lions');
    lmNoiseSlider = createSlider(0, 10, 3, 0.5);
    addControl('Flow Noise', lmNoiseSlider, 'lions');
    lmSpeedSlider = createSlider(0, 5, 1.0, 0.1);
    addControl('Moving Speed', lmSpeedSlider, 'lions');

    asciiResSlider = createSlider(2, 50, 15, 1);
    addControl('ASCII Grid Scale', asciiResSlider, 'ascii');
    asciiAnimSpeedSlider = createSlider(0, 5, 1, 0.1);
    addControl('ASCII Anim Speed', asciiAnimSpeedSlider, 'ascii');
    asciiImgSelectSlider = createSlider(0, 2, 0, 1);
    addControl('ASCII Image Select', asciiImgSelectSlider, 'ascii');

    vpBlurSlider = createSlider(0, 10, 1, 1);
    addControl('Preview Blur', vpBlurSlider, 'common');

    vpPosterizeSlider = createSlider(2, 20, 5, 1);
    addControl('Preview Posterize', vpPosterizeSlider, 'common');

    vpThresholdSlider = createSlider(5, 100, 30, 1);
    addControl('Preview Edge Threshold', vpThresholdSlider, 'common');

    updateGroupVisibility(typeSelect.value());

    let meshGroup = createDiv().addClass('ui-group').parent(container);
    createSpan('<label>Target Mesh Part</label>').parent(meshGroup);
    meshSelect = createSelect().parent(meshGroup);
    meshSelect.option('Loading in Three.js...');

    meshSelect.changed(() => {
        let val = meshSelect.value();
        updateSlidersForPart(val);
    });

    let btn = createButton('GENERATE NEW').parent(container);
    btn.mousePressed(generateCluster);

    let btnExport = createButton('SAVE JSON').parent(container).style('background', '#3b82f6').style('color', '#fff');
    btnExport.mousePressed(exportConfig);

    let btnSaveImg = createButton('SAVE PREVIEW (PNG)').parent(container).style('background', '#eab308');
    btnSaveImg.mousePressed(() => {
        if (viewportPG) save(viewportPG, 'filtered_preview.png');
    });

    createDiv('Drag & Drop a JSON file to load parts!').parent(container)
        .style('font-size', '11px').style('color', '#aaa')
        .style('margin-top', '15px').style('text-align', 'center');
}

function updateGroupVisibility(t) {
    let showGlitch = t.includes('Glitch') || t.includes('Mixed');
    let showSolid = t.includes('Solid') || t.includes('Mixed');
    let showDevils = t.includes('Devils') || t.includes('Mixed');
    let showLions = t.includes('Lions') || t.includes('Mixed');
    let showAscii = t.includes('ASCII');

    uiGroups.glitch.forEach(p => p.style('display', showGlitch ? 'block' : 'none'));
    uiGroups.solid.forEach(p => p.style('display', showSolid ? 'block' : 'none'));
    uiGroups.devils.forEach(p => p.style('display', showDevils ? 'block' : 'none'));
    uiGroups.lions.forEach(p => p.style('display', showLions ? 'block' : 'none'));
    uiGroups.ascii.forEach(p => p.style('display', showAscii ? 'block' : 'none'));
}

function updateSlidersForPart(val) {
    if (partConfigs[val]) {
        let cfg = partConfigs[val].config;
        minFungiSlider.value(cfg.minF);
        maxFungiSlider.value(cfg.maxF);
        spreadSlider.value(cfg.spread);
        minSizeSlider.value(cfg.minS);
        maxSizeSlider.value(cfg.maxS);
        layersSlider.value(cfg.layers);
        gapSlider.value(cfg.gapMult);
        glitchSpeedSlider.value(cfg.glitchSpeed);
        pixelSlider.value(cfg.pixelScale);
        slCount.value(cfg.devCount || 10);
        slLength.value(cfg.devLen || 250);
        devSpreadSlider.value(cfg.devSpread || 6.28);
        slCurve.value(cfg.devCurve || 30);
        slSharp.value(cfg.devSharp || 80);
        slVein.value(cfg.devVein || 4);
        slChaos.value(cfg.devChaos || 0);
        devCoreSlider.value(cfg.devCore !== undefined ? cfg.devCore : 30);

        lmLengthSlider.value(cfg.lmLength || 100);
        lmDensitySlider.value(cfg.lmDensity || 600);
        lmClusterSlider.value(cfg.lmCluster || 60);
        lmCurlSlider.value(cfg.lmCurl || 15);
        lmThickSlider.value(cfg.lmThick || 6);
        lmTipThickSlider.value(cfg.lmTipThick || 0);
        lmNoiseSlider.value(cfg.lmNoise || 3);
        lmSpeedSlider.value(cfg.lmSpeed !== undefined ? cfg.lmSpeed : 1.0);

        if (asciiResSlider) asciiResSlider.value(cfg.ascRes || 15);
        if (asciiAnimSpeedSlider) asciiAnimSpeedSlider.value(cfg.ascAnim || 1.0);
        if (asciiImgSelectSlider) asciiImgSelectSlider.value(cfg.ascImg || 0);

        typeSelect.value(cfg.typeSel);
        updateGroupVisibility(cfg.typeSel);
    }
}

function populateMeshDropdown(names) {
    if (meshSelect) {
        meshSelect.elt.innerHTML = '';
        names.forEach(name => meshSelect.option(name));
    }
}

function generateCluster() {
    let activePart = meshSelect.value();
    if (!activePart || activePart.startsWith('Loading')) return;

    let cfg = {
        minF: minFungiSlider.value(),
        maxF: maxFungiSlider.value(),
        spread: spreadSlider.value(),
        minS: minSizeSlider.value(),
        maxS: maxSizeSlider.value(),
        layers: layersSlider.value(),
        gapMult: gapSlider.value(),
        glitchSpeed: glitchSpeedSlider.value(),
        pixelScale: pixelSlider.value(),
        devCount: slCount.value(),
        devLen: slLength.value(),
        devSpread: devSpreadSlider.value(),
        devCurve: slCurve.value(),
        devSharp: slSharp.value(),
        devVein: slVein.value(),
        devChaos: slChaos.value(),
        devCore: devCoreSlider.value(),

        lmLength: lmLengthSlider.value(),
        lmDensity: lmDensitySlider.value(),
        lmCluster: lmClusterSlider.value(),
        lmCurl: lmCurlSlider.value(),
        lmThick: lmThickSlider.value(),
        lmTipThick: lmTipThickSlider.value(),
        lmNoise: lmNoiseSlider.value(),
        lmSpeed: lmSpeedSlider.value(),

        ascRes: asciiResSlider ? asciiResSlider.value() : 15,
        ascAnim: asciiAnimSpeedSlider ? asciiAnimSpeedSlider.value() : 1.0,
        ascImg: asciiImgSelectSlider ? asciiImgSelectSlider.value() : 0,

        typeSel: typeSelect.value()
    };

    let fungiList = [];
    let numFungi = floor(random(cfg.minF, cfg.maxF));

    for (let i = 0; i < numFungi; i++) {
        let angle = random(TWO_PI);
        let dist = random(0, cfg.spread);
        let x = cos(angle) * dist;
        let y = sin(angle) * dist;

        let spawnSolid = false;
        let spawnGlitch = false;
        let spawnDevils = false;
        let spawnLions = false;
        let spawnAscii = false;
        let forcedGlitchType = 0;

        if (cfg.typeSel === 'Mixed (All Types)') {
            let r = random();
            if (r < 0.25) spawnGlitch = true;
            else if (r < 0.5) spawnSolid = true;
            else if (r < 0.75) spawnDevils = true;
            else spawnLions = true;
        } else if (cfg.typeSel === 'Only Solid Fungus (Topo)') {
            spawnSolid = true;
        } else if (cfg.typeSel === 'Only DevilsFingers') {
            spawnDevils = true;
        } else if (cfg.typeSel === 'Only LionsMane') {
            spawnLions = true;
        } else if (cfg.typeSel === 'Only ASCII Fungus') {
            spawnAscii = true;
        } else {
            spawnGlitch = true;
            if (cfg.typeSel === 'Glitch Type 1: Lattice') forcedGlitchType = 1;
            else if (cfg.typeSel === 'Glitch Type 2: Pixel Shapes') forcedGlitchType = 2;
            else if (cfg.typeSel === 'Glitch Type 3: Lines') forcedGlitchType = 3;
            else if (cfg.typeSel === 'Glitch Type 4: Stair') forcedGlitchType = 4;
        }

        if (spawnAscii) {
            let baseRadius = random(cfg.minS, cfg.maxS);
            fungiList.push(new ASCIIFungus({
                x, y, 
                size: baseRadius, 
                imgIndex: cfg.ascImg, 
                gridScale: cfg.ascRes, 
                animSpeed: cfg.ascAnim, 
                tintHex: random(PALETTE)
            }));
        } else if (spawnGlitch) {
            let baseRadius = random(cfg.minS, cfg.maxS);
            let col = random(PALETTE);
            let seed = random(100.0);
            let gType = forcedGlitchType > 0 ? forcedGlitchType : floor(random(1, 5));
            fungiList.push(new LaceFungus({ x, y, radius: baseRadius, col, seed, glitchType: gType }));
        } else if (spawnSolid) {
            let seed = random(1000.0);
            let layers = floor(random(cfg.layers * 0.5, cfg.layers));
            fungiList.push(new LineFungus({ x, y, totalLayers: layers, colorArray: PALETTE, nScale: 3, nSeed: seed, jiggleSpeed: 0.05, gapMultiplier: cfg.gapMult }));
        } else if (spawnDevils) {
            let seed = random(10000.0);
            fungiList.push(new DevilsFingersFungus({
                x, y,
                count: cfg.devCount,
                baseLen: cfg.devLen,
                spread: cfg.devSpread,
                curveAmp: cfg.devCurve,
                tipSharpness: cfg.devSharp,
                veinAmp: cfg.devVein,
                chaos: cfg.devChaos,
                coreSize: cfg.devCore,
                seed
            }));
        } else if (spawnLions) {
            let seed = random(10000.0);
            fungiList.push(new LionsManeFungus({
                x, y,
                lengthVal: cfg.lmLength,
                density: cfg.lmDensity,
                clusterSize: cfg.lmCluster,
                curlAmp: cfg.lmCurl,
                strandThick: cfg.lmThick,
                tipThick: cfg.lmTipThick,
                noiseAmt: cfg.lmNoise,
                speedMult: cfg.lmSpeed,
                seed
            }));
        }
    }

    partConfigs[activePart] = {
        config: cfg,
        fungi: fungiList,
        time: 0
    };

    ensureBufferAndTexture(activePart);
}

function ensureBufferAndTexture(partName) {
    if (!partBuffers[partName]) {
        partBuffers[partName] = document.createElement('canvas');
        partBuffers[partName].width = 1024;
        partBuffers[partName].height = 1024;
        if (window.assignTextureToPart) {
            window.assignTextureToPart(partName, partBuffers[partName]);
        }
    }
}

function exportConfig() {
    let exportData = {};
    for (let part in partConfigs) {
        exportData[part] = {
            config: partConfigs[part].config,
            fungi: partConfigs[part].fungi.map(f => f.toJSON())
        };
    }
    saveJSON(exportData, 'character_glitch_config.json');
}

function loadConfig(data) {
    // Reset missing parts
    for (let p in partBuffers) {
        if (!data[p]) {
            if (window.resetPartMaterial) window.resetPartMaterial(p);
            delete partBuffers[p];
        }
    }
    partConfigs = {};

    for (let partName in data) {
        let pData = data[partName];
        let restoredFungi = pData.fungi.map(f => {
            if (f.type === 'Lace') return new LaceFungus(f);
            if (f.type === 'Line') return new LineFungus(f);
            if (f.type === 'DevilsFingers') return new DevilsFingersFungus(f);
            if (f.type === 'LionsMane') return new LionsManeFungus(f);
            if (f.type === 'ASCIIFungus') return new ASCIIFungus(f);
        });
        let defaultConfig = {
            minF: 15, maxF: 30, spread: 300, minS: 80, maxS: 350, layers: 20, gapMult: 3.5, glitchSpeed: 15, pixelScale: 25,
            devCount: 10, devLen: 250, devSpread: 6.28, devCurve: 30, devSharp: 80, devVein: 4, devChaos: 0, devCore: 30,
            lmLength: 100, lmDensity: 600, lmCluster: 60, lmCurl: 15, lmThick: 6, lmTipThick: 0, lmNoise: 3, lmSpeed: 1.0,
            ascRes: 15, ascAnim: 1.0, ascImg: 0,
            typeSel: 'Mixed (All Types)'
        };
        partConfigs[partName] = {
            config: Object.assign({}, defaultConfig, pData.config),
            fungi: restoredFungi,
            time: 0
        };
        ensureBufferAndTexture(partName);
    }

    updateSlidersForPart(meshSelect.value());
}

class LaceFungus {
    constructor({ x = 0, y = 0, radius = 50, col = '#A8CE40', seed = 0, glitchType = 1 }) {
        this.x = x; this.y = y; this.radius = radius; this.col = col; this.seed = seed; this.glitchType = glitchType;
    }
    display(idx, time, pScale) {
        push();
        translate(this.x, this.y, idx * 0.5);
        shader(glitchShader);
        let c = color(this.col);
        let shaderCol = [red(c) / 255.0, green(c) / 255.0, blue(c) / 255.0];
        glitchShader.setUniform('u_color', shaderCol);
        glitchShader.setUniform('u_seed', this.seed);
        glitchShader.setUniform('u_time', time);
        glitchShader.setUniform('u_glitchType', float(this.glitchType));
        glitchShader.setUniform('u_gridScale', float(pScale));
        noStroke();
        rect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
        pop();
    }
    toJSON() {
        return { type: 'Lace', x: this.x, y: this.y, radius: this.radius, col: this.col, seed: this.seed, glitchType: this.glitchType };
    }
}

class LineFungus {
    constructor({ x = 0, y = 0, totalLayers = 20, colorArray = [], nScale = 3, nSeed = 0, jiggleSpeed = 0.05, gapMultiplier = 3.5 }) {
        this.x = x; this.y = y; this.totalLayers = totalLayers; this.colorArray = (colorArray && colorArray.length > 0) ? colorArray : ['#D9E0A6', '#A8CE40', '#72A047', '#2E6130', '#0D4038'];
        this.nScale = nScale; this.nSeed = nSeed; this.jiggleSpeed = jiggleSpeed; this.gapMultiplier = gapMultiplier;
    }
    display(idx, time, pScale) {
        push();
        translate(this.x, this.y, idx * 0.5);
        shader(lineShader);

        lineShader.setUniform('u_time', time * 30.0 * this.jiggleSpeed);
        lineShader.setUniform('u_seed', this.nSeed);
        lineShader.setUniform('u_scale', this.nScale);
        lineShader.setUniform('u_gap', this.gapMultiplier);
        lineShader.setUniform('u_layers', float(this.totalLayers));

        let cArray = [];
        for (let i = 0; i < 5; i++) {
            let colIndex = floor(map(i, 0, 4, 0, this.colorArray.length - 0.01));
            let c = color(this.colorArray[colIndex]);
            cArray.push(red(c) / 255.0, green(c) / 255.0, blue(c) / 255.0);
        }
        lineShader.setUniform('u_colors', cArray);

        noStroke();
        let quadRadius = this.totalLayers * this.gapMultiplier * 1.5;
        rect(-quadRadius, -quadRadius, quadRadius * 2.0, quadRadius * 2.0);

        pop();
    }
    toJSON() {
        return { type: 'Line', x: this.x, y: this.y, totalLayers: this.totalLayers, colorArray: this.colorArray, nScale: this.nScale, nSeed: this.nSeed, jiggleSpeed: this.jiggleSpeed, gapMultiplier: this.gapMultiplier };
    }
}

class DevilsFingersFungus {
    constructor({ x = 0, y = 0, count = 10, baseLen = 250, spread = 6.28, curveAmp = 30, tipSharpness = 80, veinAmp = 4, chaos = 0, coreSize = 30, seed = 0 }) {
        this.x = x; this.y = y;
        this.count = count; this.baseLen = baseLen; this.spread = spread;
        this.curveAmp = curveAmp; this.tipSharpness = tipSharpness; this.veinAmp = veinAmp;
        this.chaos = chaos; this.coreSize = coreSize; this.seed = seed;
    }

    display(idx, time, pScale) {
        push();
        translate(this.x, this.y, idx * 0.5);
        resetShader();

        let tFrames = time * 30.0;

        randomSeed(this.seed);
        let redBody = color(255, 59, 35);
        let blackPore = color(20, 10, 15);
        let endWidth = map(this.tipSharpness, 0, 100, 20, 0);

        for (let f = 0; f < this.count; f++) {
            let baseAngle;
            if (this.spread >= TWO_PI - 0.01) {
                baseAngle = (TWO_PI / this.count) * f;
            } else {
                let startAngle = HALF_PI - (this.spread / 2);
                let angleStep = (this.count > 1) ? this.spread / (this.count - 1) : 0;
                baseAngle = startAngle + (angleStep * f);
            }

            let chaosLenMult = map(noise(f * 10), 0, 1, 1 - this.chaos, 1 + this.chaos);
            let chaosAngleMod = map(noise(f * 20), 0, 1, -this.chaos, this.chaos);

            let finalAngle = baseAngle + chaosAngleMod;
            let finalLength = this.baseLen * chaosLenMult;

            push();
            rotate(finalAngle);

            fill(redBody);
            noStroke();
            beginShape();
            for (let t = 0; t <= 1; t += 0.05) {
                let x = t * finalLength;
                let w = map(t, 0, 1, 30, endWidth);
                let spineWobble = sin(t * 6 - tFrames * 0.05 + finalAngle) * (t * this.curveAmp);
                let edgeNoise = map(noise(t * 5, tFrames * 0.01), 0, 1, -this.veinAmp, this.veinAmp);
                vertex(x, w + edgeNoise + spineWobble);
            }
            for (let t = 1; t >= 0; t -= 0.05) {
                let x = t * finalLength;
                let w = map(t, 0, 1, 30, endWidth);
                let spineWobble = sin(t * 6 - tFrames * 0.05 + finalAngle) * (t * this.curveAmp);
                let edgeNoise = map(noise(t * 5 + 100, tFrames * 0.01), 0, 1, -this.veinAmp, this.veinAmp);
                vertex(x, -w + edgeNoise + spineWobble);
            }
            endShape(CLOSE);

            for (let t = 0.15; t <= 0.85; t += 0.015) {
                let x = t * finalLength;
                let maxW = map(t, 0, 1, 15, 1);
                let spineWobble = sin(t * 6 - tFrames * 0.05 + finalAngle) * (t * this.curveAmp);
                let noiseVal = noise(t * 10, tFrames * 0.02);
                let poreSize = map(noiseVal, 0, 1, 4, 18);
                let poreColor = lerpColor(redBody, blackPore, map(noiseVal, 0, 1, 0.2, 1));
                fill(poreColor);
                let yWobble = map(noise(t * 8, tFrames * 0.01 + 50), 0, 1, -maxW, maxW);
                let finalY = yWobble + spineWobble;
                ellipse(x, finalY, poreSize, poreSize * 1.2);
            }
            pop();
        }

        if (this.coreSize > 0) {
            push();
            rotate(time * 0.5);
            
            fill(230);
            noStroke();
            beginShape();
            let numPoints = 24;
            let r1 = this.coreSize;
            let r2 = this.coreSize * 1.3;
            for (let i = 0; i < numPoints * 2; i++) {
                let a = map(i, 0, numPoints * 2, 0, TWO_PI);
                let r = (i % 2 === 0) ? r2 : r1;
                vertex(cos(a) * r, sin(a) * r);
            }
            endShape(CLOSE);

            fill(20, 10, 15);
            beginShape();
            let starPoints = 8;
            let sr1 = this.coreSize * 0.3;
            let sr2 = this.coreSize * 0.7;
            for (let i = 0; i < starPoints * 2; i++) {
                let a = map(i, 0, starPoints * 2, 0, TWO_PI);
                let r = (i % 2 === 0) ? sr2 : sr1;
                vertex(cos(a) * r, sin(a) * r);
            }
            endShape(CLOSE);
            
            pop();
        }

        pop();
    }

    toJSON() {
        return { type: 'DevilsFingers', x: this.x, y: this.y, count: this.count, baseLen: this.baseLen, spread: this.spread, curveAmp: this.curveAmp, tipSharpness: this.tipSharpness, veinAmp: this.veinAmp, chaos: this.chaos, coreSize: this.coreSize, seed: this.seed };
    }
}

class LionsManeFungus {
    constructor({ x = 0, y = 0, lengthVal = 100, density = 600, clusterSize = 60, curlAmp = 15, strandThick = 6, tipThick = 0, noiseAmt = 3, speedMult = 1.0, seed = 0 }) {
        this.x = x; this.y = y;
        this.lengthVal = lengthVal; this.density = density; this.clusterSize = clusterSize;
        this.curlAmp = curlAmp; this.strandThick = strandThick; this.tipThick = tipThick;
        this.noiseAmt = noiseAmt; this.speedMult = speedMult;
        this.seed = seed;
        this.strandData = [];
        randomSeed(this.seed);
        for (let i = 0; i < this.density; i++) {
            let angle = random(TWO_PI);
            let r = sqrt(random()) * this.clusterSize;
            this.strandData.push({ angle, r, id: i + this.seed });
        }
        this.strandData.sort((a, b) => b.r - a.r);
    }

    display(idx, time, pScale) {
        push();
        translate(this.x, this.y, idx * 0.5);
        resetShader(); // Native shader so we can mix gradients and strokes!

        let tFrames = time * 60.0 * this.speedMult;

        // --- Draw the Solid Radial White Egg Base ---
        stroke(200);
        strokeWeight(0.5);
        beginShape(TRIANGLE_FAN);
        fill(150);
        vertex(0, 0);
        for (let a = 0; a <= TWO_PI + 0.1; a += 0.2) {
            fill(255);
            vertex(cos(a) * this.clusterSize, sin(a) * this.clusterSize);
        }
        endShape(CLOSE);

        strokeJoin(ROUND);
        strokeCap(ROUND);

        let adjustedMouseX = mouseX - this.x;
        let adjustedMouseY = mouseY - this.y;

        const getBezierPt = (p0, p1, p2, t) => {
            let mt = 1 - t;
            return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
        };

        // --- Stream precise Geometry directly to GPU buffer ---
        for (let i = 0; i < this.strandData.length; i++) {
            let data = this.strandData[i];

            let rootX = cos(data.angle) * data.r;
            let rootY = sin(data.angle) * data.r;

            let dirX = cos(data.angle);
            let dirY = sin(data.angle);
            let perpX = -sin(data.angle);
            let perpY = cos(data.angle);

            let p1x = rootX + perpX * (this.strandThick / 2);
            let p1y = rootY + perpY * (this.strandThick / 2);
            let p2x = rootX - perpX * (this.strandThick / 2);
            let p2y = rootY - perpY * (this.strandThick / 2);

            let currentLen = this.lengthVal + map(noise(data.id), 0, 1, -20, 20);

            let tipX = rootX + (dirX * currentLen);
            let tipY = rootY + (dirY * currentLen);

            let nX = map(noise(data.id * 0.1, tFrames * 0.01), 0, 1, -this.noiseAmt * 5, this.noiseAmt * 5);
            let nY = map(noise(data.id * 0.1 + 100, tFrames * 0.01), 0, 1, -this.noiseAmt * 5, this.noiseAmt * 5);
            tipX += nX;
            tipY += nY;

            let tip1x = tipX + perpX * (this.tipThick / 2);
            let tip1y = tipY + perpY * (this.tipThick / 2);
            let tip2x = tipX - perpX * (this.tipThick / 2);
            let tip2y = tipY - perpY * (this.tipThick / 2);

            let curlMag = sin(tFrames * 0.05 + data.id) * this.curlAmp * 2;
            let cx = rootX + (dirX * currentLen * 0.5) + (perpX * curlMag);
            let cy = rootY + (dirY * currentLen * 0.5) + (perpY * curlMag);

            let midThick = (this.strandThick + this.tipThick) / 2;
            let cx1 = cx + perpX * (midThick / 2);
            let cy1 = cy + perpY * (midThick / 2);
            let cx2 = cx - perpX * (midThick / 2);
            let cy2 = cy - perpY * (midThick / 2);

            // Interactive Combing applies to the center points to drag the whole shape
            let dTip = dist(adjustedMouseX, adjustedMouseY, tipX, tipY);
            if (dTip < 80) {
                let pushForce = map(dTip, 0, 80, 20, 0);
                let pushX = ((tipX - adjustedMouseX) / dTip) * pushForce;
                let pushY = ((tipY - adjustedMouseY) / dTip) * pushForce;
                tip1x += pushX; tip1y += pushY;
                tip2x += pushX; tip2y += pushY;
            }

            let dCtrl = dist(adjustedMouseX, adjustedMouseY, cx, cy);
            if (dCtrl < 80) {
                let pushForce = map(dCtrl, 0, 80, 20, 0);
                let pushX = ((cx - adjustedMouseX) / dCtrl) * pushForce;
                let pushY = ((cy - adjustedMouseY) / dCtrl) * pushForce;
                cx1 += pushX; cy1 += pushY;
                cx2 += pushX; cy2 += pushY;
            }

            // High performance manual GPU curve tessellation
            beginShape();

            // Left curve traveling up to tip
            for (let t = 0; t <= 1.0; t += 0.15) {
                fill(226 + 29 * t); // Gradual color shifting Base->Tip
                let bx = getBezierPt(p1x, cx1, tip1x, t);
                let by = getBezierPt(p1y, cy1, tip1y, t);
                vertex(bx, by);
            }

            // Fasten Flat Tip Edge
            fill(255);
            vertex(tip2x, tip2y);

            // Right curve traveling back down to base
            for (let t = 0.85; t >= 0.0; t -= 0.15) {
                fill(226 + 29 * t);
                let bx = getBezierPt(p2x, cx2, tip2x, t);
                let by = getBezierPt(p2y, cy2, tip2y, t);
                vertex(bx, by);
            }

            endShape(CLOSE);
        }

        pop();
    }

    toJSON() {
        return { type: 'LionsMane', x: this.x, y: this.y, lengthVal: this.lengthVal, density: this.density, clusterSize: this.clusterSize, curlAmp: this.curlAmp, strandThick: this.strandThick, tipThick: this.tipThick, noiseAmt: this.noiseAmt, speedMult: this.speedMult, seed: this.seed };
    }
}

