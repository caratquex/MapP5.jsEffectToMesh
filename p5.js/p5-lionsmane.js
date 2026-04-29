let strandData = [];
// UI Slider Variables
let slLength, slDensity, slCluster, slCurl, slThick, slTipThick, slNoise;

function setup() {
    createCanvas(600, 600, WEBGL);

    // Pre-generate a massive pool of strands so we can sort them by depth
    for (let i = 0; i < 1500; i++) {
        let angle = random(TWO_PI);
        // Use square root for more even distribution across the circle area
        let r = sqrt(random()) * 150;
        strandData.push({
            angle: angle,
            r: r,
            id: i // unique ID for noise seeding
        });
    }

    // Sort descending by radius so outer strands draw first (stacking underneath)
    strandData.sort((a, b) => b.r - a.r);

    createControlPanel();
}

function draw() {
    background(225);
    translate(width / 2, height / 2);

    let strandLength = slLength.value();
    let density = slDensity.value();
    let clusterSize = slCluster.value();
    let curlAmount = slCurl.value();
    let strandThick = slThick.value(); // Base width
    let tipThick = slTipThick.value(); // Tip width
    let flowNoise = slNoise.value();

    // --- Draw the Solid White Egg Base ---
    let baseGrad = drawingContext.createRadialGradient(0, 0, 0, 0, 0, clusterSize);
    baseGrad.addColorStop(0, 'rgb(150, 150, 150)');
    baseGrad.addColorStop(1, 'rgb(255, 255, 255)');
    drawingContext.fillStyle = baseGrad;

    stroke(200);
    strokeWeight(0.5);
    ellipse(0, 0, clusterSize * 2, clusterSize * 2);

    let adjustedMouseX = mouseX - width / 2;
    let adjustedMouseY = mouseY - height / 2;

    // --- Draw the Solid Radial Strands ---
    let strandsDrawn = 0;

    for (let i = 0; i < strandData.length; i++) {
        let data = strandData[i];

        if (data.r > clusterSize) continue;
        if (strandsDrawn >= density) break;
        strandsDrawn++;

        let rootX = cos(data.angle) * data.r;
        let rootY = sin(data.angle) * data.r;

        let dirX = cos(data.angle);
        let dirY = sin(data.angle);

        let perpX = -sin(data.angle);
        let perpY = cos(data.angle);

        // 1. Calculate the left and right corners of the strand's base
        let p1x = rootX + perpX * (strandThick / 2);
        let p1y = rootY + perpY * (strandThick / 2);
        let p2x = rootX - perpX * (strandThick / 2);
        let p2y = rootY - perpY * (strandThick / 2);

        let currentLen = strandLength + map(noise(data.id), 0, 1, -20, 20);

        // 2. Calculate the center Tip position
        let tipX = rootX + (dirX * currentLen);
        let tipY = rootY + (dirY * currentLen);

        let nX = map(noise(data.id * 0.1, frameCount * 0.01), 0, 1, -flowNoise * 5, flowNoise * 5);
        let nY = map(noise(data.id * 0.1 + 100, frameCount * 0.01), 0, 1, -flowNoise * 5, flowNoise * 5);
        tipX += nX;
        tipY += nY;

        // 3. Offset the center tip into a left and right tip corner based on slTipThick
        let tip1x = tipX + perpX * (tipThick / 2);
        let tip1y = tipY + perpY * (tipThick / 2);
        let tip2x = tipX - perpX * (tipThick / 2);
        let tip2y = tipY - perpY * (tipThick / 2);

        // 4. Calculate the center Control Point
        let curlMag = sin(frameCount * 0.05 + data.id) * curlAmount * 2;
        let cx = rootX + (dirX * currentLen * 0.5) + (perpX * curlMag);
        let cy = rootY + (dirY * currentLen * 0.5) + (perpY * curlMag);

        // 5. Offset the Control Point so the width transitions smoothly from base to tip
        let midThick = (strandThick + tipThick) / 2;
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

        // --- GRADIENT AND STROKE LOGIC ---
        let grad = drawingContext.createLinearGradient(rootX, rootY, tipX, tipY);
        grad.addColorStop(0, 'rgb(226,226,226)');
        grad.addColorStop(1, 'rgb(255, 255, 255)');

        drawingContext.fillStyle = grad;

        stroke(200);
        strokeWeight(0.5);
        strokeCap(ROUND);
        strokeJoin(ROUND);

        // Draw the expanded shape
        beginShape();
        vertex(p1x, p1y); // Base left
        quadraticVertex(cx1, cy1, tip1x, tip1y); // Left side curve
        vertex(tip2x, tip2y); // Flat line across the tip
        quadraticVertex(cx2, cy2, p2x, p2y); // Right side curve
        endShape(CLOSE);
    }
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

    slLength = makeSlider('Strand Length (Stubs to Long)', 20, 250, 100, 5);
    slDensity = makeSlider('Strand Density (Sparse to Full)', 50, 1500, 600, 10);
    slCluster = makeSlider('Cluster Size (Small Orb to Large Base)', 10, 150, 60, 5);
    slCurl = makeSlider('Curl Amount (Straight to Wavy)', 0, 40, 15, 1);
    slThick = makeSlider('Base Width (Needles to Trunks)', 1, 20, 6, 0.5);
    slTipThick = makeSlider('Tip Width (Pointed to Blunt)', 0, 20, 0, 0.5);
    slNoise = makeSlider('Flow Noise (Still to Writhing)', 0, 10, 3, 0.5);
}
