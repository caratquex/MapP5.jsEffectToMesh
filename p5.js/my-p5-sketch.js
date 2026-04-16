// ==========================================
// PHASE 1: p5.js (The Generative Texture)
// ==========================================
let glitchShader;
let lineShader;
let devShader;
let p5Canvas;
let partConfigs = {};
let partBuffers = {};

let viewportPG;

const PALETTE = [
    '#D9E0A6', '#A8CE40', '#72A047', '#2E6130', '#0D4038'
];

let minFungiSlider, maxFungiSlider, spreadSlider, minSizeSlider, maxSizeSlider, layersSlider, gapSlider, glitchSpeedSlider, pixelSlider, typeSelect, meshSelect;
let slCount, slLength, devSpreadSlider, slCurve, slSharp, slVein, slChaos;
let uiGroups = { common: [], glitch: [], solid: [], devils: [] };

function preload() {
    glitchShader = loadShader('p5.js/digitalGlitch/shader.vert', 'p5.js/digitalGlitch/shader.frag');
    lineShader = loadShader('p5.js/digitalGlitch/lineShader.vert', 'p5.js/digitalGlitch/lineShader.frag');
    devShader = loadShader('p5.js/digitalGlitch/devilsShader.vert', 'p5.js/digitalGlitch/devilsShader.frag');
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
            viewportPG = createGraphics(300, 300);
            let pContainer = select('#viewport-preview');
            if (pContainer) {
                pContainer.elt.appendChild(viewportPG.elt);
            }
            // p5 natively applies inline 'display: none' to createGraphics objects.
            viewportPG.elt.style.display = 'block';
        }

        let threeCanvas = window.threeRenderer.domElement;
        let scaleFact = Math.max(300 / threeCanvas.width, 300 / threeCanvas.height);
        let dw = threeCanvas.width * scaleFact;
        let dh = threeCanvas.height * scaleFact;
        let dx = (300 - dw) / 2;
        let dy = (300 - dh) / 2;

        viewportPG.clear();
        viewportPG.drawingContext.drawImage(threeCanvas, dx, dy, dw, dh);

        viewportPG.loadPixels();
        let p = viewportPG.pixels;
        // Manual posterize for 4 levels
        for (let i = 0; i < p.length; i += 4) {
            p[i] = Math.round(p[i] / 255 * 3) * 85;
            p[i + 1] = Math.round(p[i + 1] / 255 * 3) * 85;
            p[i + 2] = Math.round(p[i + 2] / 255 * 3) * 85;
        }
        viewportPG.updatePixels();
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
        if(uiGroups[group]) uiGroups[group].push(p);
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

    createDiv('Drag & Drop a JSON file to load parts!').parent(container)
        .style('font-size', '11px').style('color', '#aaa')
        .style('margin-top', '15px').style('text-align', 'center');
}

function updateGroupVisibility(t) {
    let showGlitch = t.includes('Glitch') || t.includes('Mixed');
    let showSolid = t.includes('Solid') || t.includes('Mixed');
    let showDevils = t.includes('Devils') || t.includes('Mixed');
    
    uiGroups.glitch.forEach(p => p.style('display', showGlitch ? 'block' : 'none'));
    uiGroups.solid.forEach(p => p.style('display', showSolid ? 'block' : 'none'));
    uiGroups.devils.forEach(p => p.style('display', showDevils ? 'block' : 'none'));
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
        let forcedGlitchType = 0;

        if (cfg.typeSel === 'Mixed (All Types)') {
            let r = random();
            if (r < 0.4) spawnGlitch = true;
            else if (r < 0.7) spawnSolid = true;
            else spawnDevils = true;
        } else if (cfg.typeSel === 'Only Solid Fungus (Topo)') {
            spawnSolid = true;
        } else if (cfg.typeSel === 'Only DevilsFingers') {
            spawnDevils = true;
        } else {
            spawnGlitch = true;
            if (cfg.typeSel === 'Glitch Type 1: Lattice') forcedGlitchType = 1;
            else if (cfg.typeSel === 'Glitch Type 2: Pixel Shapes') forcedGlitchType = 2;
            else if (cfg.typeSel === 'Glitch Type 3: Lines') forcedGlitchType = 3;
            else if (cfg.typeSel === 'Glitch Type 4: Stair') forcedGlitchType = 4;
        }

        if (spawnGlitch) {
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
        });
        partConfigs[partName] = {
            config: pData.config,
            fungi: restoredFungi,
            time: 0
        };
        ensureBufferAndTexture(partName);
    }

    updateSlidersForPart(meshSelect.value());
}

class LaceFungus {
    constructor({ x, y, radius, col, seed, glitchType }) {
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
    constructor({ x, y, totalLayers, colorArray, nScale, nSeed, jiggleSpeed, gapMultiplier }) {
        this.x = x; this.y = y; this.totalLayers = totalLayers; this.colorArray = colorArray;
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
    constructor({x, y, count, baseLen, spread, curveAmp, tipSharpness, veinAmp, chaos, seed}) {
        this.x = x; this.y = y;
        this.count = count; this.baseLen = baseLen; this.spread = spread;
        this.curveAmp = curveAmp; this.tipSharpness = tipSharpness; this.veinAmp = veinAmp;
        this.chaos = chaos; this.seed = seed;
    }

    display(idx, time, pScale) {
        push();
        translate(this.x, this.y, idx * 0.5); 
        shader(devShader); 
        
        devShader.setUniform('u_time', time);
        devShader.setUniform('u_seed', this.seed);
        devShader.setUniform('u_count', float(this.count));
        devShader.setUniform('u_length', float(this.baseLen));
        devShader.setUniform('u_spread', float(this.spread));
        devShader.setUniform('u_curve', float(this.curveAmp));
        devShader.setUniform('u_sharp', float(this.tipSharpness));
        devShader.setUniform('u_vein', float(this.veinAmp));
        devShader.setUniform('u_chaos', float(this.chaos));
        
        noStroke();
        rect(-400, -400, 800, 800);
        pop();
    }

    toJSON() {
        return { type: 'DevilsFingers', x: this.x, y: this.y, count: this.count, baseLen: this.baseLen, spread: this.spread, curveAmp: this.curveAmp, tipSharpness: this.tipSharpness, veinAmp: this.veinAmp, chaos: this.chaos, seed: this.seed };
    }
}

