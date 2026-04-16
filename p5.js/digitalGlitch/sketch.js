let myShader;
let fungiCluster = [];

// Base color palette derived from the reference image
const PALETTE = [
  '#D9E0A6', // cream/ivory
  '#A8CE40', // bright lime green
  '#72A047', // olive green
  '#2E6130', // forest green
  '#0D4038'  // deep teal
];

// UI Slider Variables
let minFungiSlider, maxFungiSlider, spreadSlider, minSizeSlider, maxSizeSlider, layersSlider, gapSlider, glitchSpeedSlider, pixelSlider, typeSelect;
let glitchTime = 0;

function preload() {
  myShader = loadShader('shader/shader.vert', 'shader/shader.frag');
}

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  noStroke();
  setupUI();
  generateCluster();
}

function draw() {
  background(250, 250, 248);

  // Progress glitch time by slider speed multiplier
  glitchTime += glitchSpeedSlider.value() * 0.01;

  for (let i = 0; i < fungiCluster.length; i++) {
    fungiCluster[i].display(i);
  }
}

// Removes standard mouseClicked on the canvas since the button will handle it
// Also stops canvas clicks from overlapping with sliding actions

function setupUI() {
  let uiContainer = createDiv()
    .position(10, 10)
    .style('color', '#333')
    .style('background', 'rgba(255,255,255,0.9)')
    .style('padding', '10px')
    .style('border-radius', '8px')
    .style('font-family', 'sans-serif')
    .style('box-shadow', '0 4px 6px rgba(0,0,0,0.1)')
    .style('width', '200px')
    .style('max-height', '80vh')
    .style('overflow-y', 'auto')
    .style('font-size', '12px');

  createDiv('<b>Fungus Debug Variables</b>').parent(uiContainer).style('margin-bottom', '10px');

  createSpan('Fungus Generation Type: ').parent(uiContainer);
  typeSelect = createSelect().parent(uiContainer).style('width', '100%').style('margin-bottom', '10px');
  typeSelect.option('Mixed (All Types)');
  typeSelect.option('Only Glitch Fungus (Types 1-4)');
  typeSelect.option('Glitch Type 1: Lattice');
  typeSelect.option('Glitch Type 2: Pixel Shapes');
  typeSelect.option('Glitch Type 3: Lines');
  typeSelect.option('Glitch Type 4: Stair');
  typeSelect.option('Only Solid Fungus (Topo)');

  // Sliders map: createSlider(min, max, defaultVal, step)
  createSpan('Min Fungi Count: ').parent(uiContainer);
  minFungiSlider = createSlider(1, 50, 15).parent(uiContainer).style('width', '100%');
  createDiv().parent(uiContainer);

  createSpan('Max Fungi Count: ').parent(uiContainer);
  maxFungiSlider = createSlider(1, 100, 30).parent(uiContainer).style('width', '100%');
  createDiv().parent(uiContainer);

  createSpan('Cluster Spread Radius: ').parent(uiContainer);
  spreadSlider = createSlider(0, 400, 200).parent(uiContainer).style('width', '100%');
  createDiv().parent(uiContainer);

  createSpan('Min Size: ').parent(uiContainer);
  minSizeSlider = createSlider(20, 200, 80).parent(uiContainer).style('width', '100%');
  createDiv().parent(uiContainer);

  createSpan('Max Size: ').parent(uiContainer);
  maxSizeSlider = createSlider(50, 400, 220).parent(uiContainer).style('width', '100%');
  createDiv().parent(uiContainer);

  createSpan('Solid Layers (Type 2): ').parent(uiContainer);
  layersSlider = createSlider(5, 50, 20).parent(uiContainer).style('width', '100%');
  createDiv().parent(uiContainer);

  createSpan('Layer Gap Scale (Type 2): ').parent(uiContainer);
  gapSlider = createSlider(1, 10, 3.5, 0.1).parent(uiContainer).style('width', '100%');
  createDiv().parent(uiContainer);

  createSpan('Glitch Speed (Type 1): ').parent(uiContainer);
  glitchSpeedSlider = createSlider(0, 50, 15).parent(uiContainer).style('width', '100%');
  createDiv().parent(uiContainer);

  createSpan('Glitch Pixel Scale (Type 1): ').parent(uiContainer);
  pixelSlider = createSlider(4, 100, 20).parent(uiContainer).style('width', '100%');
  createDiv().parent(uiContainer);

  let btn = createButton('Generate New Cluster').parent(uiContainer).style('margin-top', '15px').style('padding', '8px').style('width', '100%').style('cursor', 'pointer');
  btn.mousePressed(generateCluster);
}

function generateCluster() {
  fungiCluster = [];

  // Connect the local generation variables to dynamic slider inputs
  let minF = minFungiSlider.value();
  let maxF = maxFungiSlider.value();
  let numFungi = floor(random(minF, maxF));

  let spread = spreadSlider.value();
  let minS = minSizeSlider.value();
  let maxS = maxSizeSlider.value();

  let maxLayers = layersSlider.value();
  let gapMult = gapSlider.value();

  for (let i = 0; i < numFungi; i++) {
    let angle = random(TWO_PI);
    let dist = random(0, spread);
    let x = cos(angle) * dist;
    let y = sin(angle) * dist;

    let sel = typeSelect.value();
    let spawnSolid = false;
    let spawnGlitch = false;
    let forcedGlitchType = 0; // 0 defaults to random glitch type

    // Interpret dropdown option
    if (sel === 'Mixed (All Types)') {
      spawnSolid = random() > 0.5;
      spawnGlitch = !spawnSolid;
    } else if (sel === 'Only Solid Fungus (Topo)') {
      spawnSolid = true;
    } else {
      spawnGlitch = true;
      if (sel === 'Glitch Type 1: Lattice') forcedGlitchType = 1;
      else if (sel === 'Glitch Type 2: Pixel Shapes') forcedGlitchType = 2;
      else if (sel === 'Glitch Type 3: Lines') forcedGlitchType = 3;
      else if (sel === 'Glitch Type 4: Stair') forcedGlitchType = 4;
    }

    if (spawnGlitch) {
      let baseRadius = random(minS, maxS);
      let col = random(PALETTE);
      let seed = random(100.0);
      let gType = forcedGlitchType > 0 ? forcedGlitchType : floor(random(1, 5));
      fungiCluster.push(new LaceFungus(x, y, baseRadius, col, seed, gType));
    } else if (spawnSolid) {
      let seed = random(1000.0);
      let layers = floor(random(maxLayers * 0.5, maxLayers));
      fungiCluster.push(new LineFungus(x, y, layers, PALETTE, 3, seed, 0.05, gapMult));
    }
  }
}

// Type 1: Shader-based intricate lace cutout
class LaceFungus {
  constructor(x, y, radius, col, seed, glitchType) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.col = col;
    this.seed = seed;
    this.glitchType = glitchType;
  }

  display(index) {
    push();
    translate(this.x, this.y, index * 0.5);

    // Enable shader specifically for this
    shader(myShader);

    // Convert hex string to normalized array for GLSL uniforms
    let c = color(this.col);
    let shaderCol = [red(c) / 255.0, green(c) / 255.0, blue(c) / 255.0];

    myShader.setUniform('u_color', shaderCol);
    myShader.setUniform('u_seed', this.seed);
    myShader.setUniform('u_time', glitchTime);
    myShader.setUniform('u_glitchType', float(this.glitchType));
    myShader.setUniform('u_gridScale', float(pixelSlider.value()));

    noStroke();
    rect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
    pop();
  }
}

// Type 2: Provided ShelfFungi (Generative jiggling noise solid layers)
class LineFungus {
  constructor(x, y, totalLayers, colorArray, nScale, nSeed, jiggleSpeed, gapMultiplier) {
    this.x = x;
    this.y = y;
    this.totalLayers = totalLayers;
    this.colorArray = colorArray;
    this.nScale = nScale;
    this.nSeed = nSeed;
    this.jiggleSpeed = jiggleSpeed;
    this.gapMultiplier = gapMultiplier; // New dynamic variable controlling layer radius size scaling
  }

  display(index) {
    push();
    translate(this.x, this.y, index * 0.5);

    // Turn OFF the custom webgl material so p5 shape commands render automatically
    resetShader();

    // Time-based offset for the jiggle animation
    let zoff = frameCount * this.jiggleSpeed;

    for (let i = this.totalLayers - 1; i >= 0; i--) {
      let colorIndex = floor(map(i, 0, this.totalLayers, 0, this.colorArray.length - 0.01));

      let fillCol = color(this.colorArray[colorIndex]);
      fillCol.setAlpha(255);

      fill(fillCol);
      noStroke();

      beginShape();
      for (let a = 0; a < TWO_PI; a += 0.15) {
        let xoff = map(cos(a), -1, 1, 0, this.nScale) + this.nSeed;
        let yoff = map(sin(a), -1, 1, 0, this.nScale) + this.nSeed;

        let n = noise(xoff + i * 0.01, yoff + i * 0.01, zoff);

        let innerGapScale = this.gapMultiplier * 0.43; // maintains correct internal proportions on scaling
        let r = map(n, 0, 1, i * innerGapScale, i * this.gapMultiplier);

        let vx = r * cos(a);
        let vy = r * sin(a);

        vertex(vx, vy, -i * 0.1);
      }
      endShape(CLOSE);
    }
    pop();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
