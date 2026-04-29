let posterizeSlider, blurSlider, thresholdSlider;
let viewportPG;

function setup() {
    createCanvas(windowWidth, windowHeight);
    pixelDensity(1);

    let internalW = windowWidth;
    let internalH = windowHeight;
    // Cap resolution for the pixel processing performance
    if (windowWidth > 800) {
        internalW = 800;
        internalH = (windowHeight / windowWidth) * 800;
    }

    viewportPG = createGraphics(Math.floor(internalW), Math.floor(internalH));

    // --- CREATE UI in the ui-container ---
    let container = select('.ui-container');
    if (!container) {
        container = createDiv().addClass('ui-container');
    }
    createDiv('<h2>FILTER MODE</h2>').parent(container);

    const addControl = (label, el) => {
        let p = createDiv().addClass('ui-group').parent(container);
        createSpan('<label>' + label + '</label>').parent(p);
        el.parent(p);
    };

    posterizeSlider = createSlider(2, 20, 5, 1);
    addControl('Posterize Level', posterizeSlider);

    blurSlider = createSlider(0, 10, 1, 1);
    addControl('Blur Amount', blurSlider);

    thresholdSlider = createSlider(5, 100, 30, 1);
    addControl('Line Threshold', thresholdSlider);

    let btnSaveImg = createButton('SAVE IMAGE (PNG)').parent(container).style('background', '#A8CE40').style('color', '#000');
    btnSaveImg.style('width', '100%').style('padding', '10px').style('border', 'none').style('border-radius', '6px').style('margin-top', '15px').style('font-weight', '600').style('cursor', 'pointer');
    btnSaveImg.mousePressed(() => {
        if (viewportPG) save(viewportPG, 'filter_mode_viewport.png');
    });

    if (typeof initThreeJS === 'function') {
        initThreeJS();
    }
}

function draw() {
    clear();

    background(10, 10, 10);

    if (window.threeRenderer && window.threeRenderer.domElement) {
        let threeCanvas = window.threeRenderer.domElement;

        viewportPG.background('#bfbfbf');
        viewportPG.drawingContext.drawImage(threeCanvas, 0, 0, viewportPG.width, viewportPG.height);

        let blurLevel = blurSlider.value();
        let posterizeLevel = posterizeSlider.value();
        let threshold = thresholdSlider.value();

        if (typeof applyViewportFilters === 'function') {
            applyViewportFilters(viewportPG, blurLevel, posterizeLevel, threshold);
        }

        image(viewportPG, 0, 0, windowWidth, windowHeight);
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);

    let internalW = windowWidth;
    let internalH = windowHeight;
    if (windowWidth > 800) {
        internalW = 800;
        internalH = (windowHeight / windowWidth) * 800;
    }

    viewportPG.resizeCanvas(Math.floor(internalW), Math.floor(internalH));
}
