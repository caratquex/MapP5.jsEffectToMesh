let allDots = [];

// UI Slider Variables
let slCount, slLength, slSpread, slCurve, slSharp, slVein, slChaos;

function setup() {
  createCanvas(600, 600);
  noStroke();
  
  // Build the Control Panel Interface
  createControlPanel();
}

function draw() {
  background(225);
  translate(width / 2, height / 2);

  // Stabilize random generation per frame so geometry doesn't flicker
  randomSeed(12345);
  allDots = []; 

  // --- Read Slider Values ---
  let count = slCount.value();
  let baseLen = slLength.value();
  let spread = slSpread.value();
  let curveAmp = slCurve.value();
  let tipSharpness = slSharp.value(); // 0 (rounded) to 20 (pointed)
  let veinAmp = slVein.value();
  let chaos = slChaos.value();

  // --- Draw the Fingers ---
  for (let f = 0; f < count; f++) {
    let baseAngle;
    
    // Calculate spread angle distribution
    if (spread >= TWO_PI - 0.01) {
      // Full circle radial spread
      baseAngle = (TWO_PI / count) * f;
    } else {
      // Clustered fan spread (pointing downwards)
      let startAngle = HALF_PI - (spread / 2);
      let angleStep = (count > 1) ? spread / (count - 1) : 0;
      baseAngle = startAngle + (angleStep * f);
    }

    // Apply "Growth Chaos" to length and angle
    // Using noise seeded by the finger index 'f' so it stays consistent per finger
    let chaosLenMult = map(noise(f * 10), 0, 1, 1 - chaos, 1 + chaos);
    let chaosAngleMod = map(noise(f * 20), 0, 1, -chaos, chaos);

    let finalAngle = baseAngle + chaosAngleMod;
    let finalLength = baseLen * chaosLenMult;

    drawFinger2D(finalAngle, finalLength, curveAmp, tipSharpness, veinAmp);
  }

  // --- Draw the Interactive Connectome ---
  drawGlebaWeb2D();
}

function drawFinger2D(angle, fingerLength, curveAmp, tipSharpness, veinAmp) {
  let redBody = color(255, 59, 35);
  let blackPore = color(20, 10, 15);

  // Map the sharpness slider (0-100) to an actual end-width pixel value (20 to 0)
  let endWidth = map(tipSharpness, 0, 100, 20, 0);

  push();
  rotate(angle); 

  // 1. Draw the Fleshy Red Silhouette
  fill(redBody);
  noStroke();
  beginShape();
  
  // Top edge
  for (let t = 0; t <= 1; t += 0.05) {
    let x = t * fingerLength;
    let w = map(t, 0, 1, 30, endWidth); 
    
    // spineWobble amplitude is now controlled by curveAmp
    let spineWobble = sin(t * 6 - frameCount * 0.05 + angle) * (t * curveAmp);
    // edgeNoise amplitude is now controlled by veinAmp
    let edgeNoise = map(noise(t * 5, frameCount * 0.01), 0, 1, -veinAmp, veinAmp);
    
    vertex(x, w + edgeNoise + spineWobble);
  }
  
  // Bottom edge 
  for (let t = 1; t >= 0; t -= 0.05) {
    let x = t * fingerLength;
    let w = map(t, 0, 1, 30, endWidth);
    
    let spineWobble = sin(t * 6 - frameCount * 0.05 + angle) * (t * curveAmp);
    let edgeNoise = map(noise(t * 5 + 100, frameCount * 0.01), 0, 1, -veinAmp, veinAmp);
    
    vertex(x, -w + edgeNoise + spineWobble);
  }
  endShape(CLOSE);

  // 2. Draw the Dark, Textured "Gleba" (Inner Area)
  for (let t = 0.15; t <= 0.85; t += 0.015) {
    let x = t * fingerLength;
    let maxW = map(t, 0, 1, 15, 1); 

    let spineWobble = sin(t * 6 - frameCount * 0.05 + angle) * (t * curveAmp);
    let noiseVal = noise(t * 10, frameCount * 0.02);
    let poreSize = map(noiseVal, 0, 1, 4, 18);
    let poreColor = lerpColor(redBody, blackPore, map(noiseVal, 0, 1, 0.2, 1));

    fill(poreColor);
    
    let yWobble = map(noise(t * 8, frameCount * 0.01 + 50), 0, 1, -maxW, maxW);
    let finalY = yWobble + spineWobble;
    
    ellipse(x, finalY, poreSize, poreSize * 1.2);

    // --- DOT SPAWNING LOGIC ---
    if (random() < 0.08) { 
      let globalX = (x * cos(angle)) - (finalY * sin(angle));
      let globalY = (x * sin(angle)) + (finalY * cos(angle));
      allDots.push(createVector(globalX, globalY));
    }
  }
  pop();
}

function drawGlebaWeb2D() {
  fill(10); 
  noStroke();
  for (let pt of allDots) {
    circle(pt.x, pt.y, 6); 
  }

  let adjustedMouseX = mouseX - width / 2;
  let adjustedMouseY = mouseY - height / 2;
  let interactionRadius = 150; 

  for (let i = 0; i < allDots.length; i++) {
    let d1 = allDots[i];
    let mouseDist = dist(d1.x, d1.y, adjustedMouseX, adjustedMouseY);

    if (mouseDist < interactionRadius) {
      let connections = 0;
      let lineAlpha = map(mouseDist, 0, interactionRadius, 255, 0);
      
      stroke(10, 10, 15, lineAlpha);
      strokeWeight(0.8);
      
      for (let j = i + 1; j < allDots.length; j++) {
        let d2 = allDots[j];
        let dotDist = p5.Vector.dist(d1, d2);
        if (dotDist < 70 && connections < 3) {
          line(d1.x, d1.y, d2.x, d2.y);
          connections++;
        }
      }
    }
  }
  noStroke(); 
}

// --- UI SETUP FUNCTION ---
function createControlPanel() {
  let panel = createDiv();
  panel.style('display', 'grid');
  panel.style('grid-template-columns', '1fr 1fr');
  panel.style('gap', '10px');
  panel.style('width', '600px');
  panel.style('margin-top', '10px');
  panel.style('font-family', 'sans-serif');
  panel.style('font-size', '14px');

  // Helper to create a labeled slider
  function makeSlider(labelTxt, min, max, val, step) {
    let container = createDiv();
    let label = createSpan(labelTxt);
    label.style('display', 'block');
    label.style('margin-bottom', '4px');
    let slider = createSlider(min, max, val, step);
    slider.style('width', '100%');
    container.child(label);
    container.child(slider);
    panel.child(container);
    return slider;
  }

  slCount = makeSlider('Finger Count (3 - 20)', 3, 20, 10, 1);
  slLength = makeSlider('Length (Stubs to Long)', 50, 400, 250, 5);
  slSpread = makeSlider('Spread Angle (Clustered to Radial)', PI/3, TWO_PI, TWO_PI, 0.1);
  slCurve = makeSlider('Curvature (Straight to Twisted)', 0, 100, 30, 1);
  slSharp = makeSlider('Tip Sharpness (Rounded to Pointed)', 0, 100, 80, 1);
  slVein = makeSlider('Surface Veins (Smooth to Organic)', 0, 15, 4, 0.5);
  slChaos = makeSlider('Growth Chaos (Symmetrical to Unpredictable)', 0, 0.8, 0, 0.05);
}
