function applyViewportFilters(viewportPG, blurLevel, posterizeLevel, threshold) {
    // 1. FILTER: Apply the blur based on the slider
    if (blurLevel > 0) {
        viewportPG.filter(BLUR, blurLevel);
    }

    // 2. FILTER: Apply the posterize level based on the slider
    viewportPG.filter(POSTERIZE, posterizeLevel);

    // 3. EDGE DETECTION & PIXEL SHADING
    viewportPG.loadPixels();
    let pixels = viewportPG.pixels;
    let w = viewportPG.width;
    let h = viewportPG.height;
    
    for (let y = 0; y < h - 1; y++) {
        for (let x = 0; x < w - 1; x++) {
            let index = (x + y * w) * 4;
            let rightIndex = ((x + 1) + y * w) * 4;
            let bottomIndex = (x + (y + 1) * w) * 4;
            
            let diffRight = Math.abs(pixels[index] - pixels[rightIndex]) +
                            Math.abs(pixels[index+1] - pixels[rightIndex+1]) +
                            Math.abs(pixels[index+2] - pixels[rightIndex+2]);
                            
            let diffBottom = Math.abs(pixels[index] - pixels[bottomIndex]) +
                             Math.abs(pixels[index+1] - pixels[bottomIndex+1]) +
                             Math.abs(pixels[index+2] - pixels[bottomIndex+2]);

            if (diffRight > threshold || diffBottom > threshold) {
                pixels[index]     = 0; 
                pixels[index + 1] = 0; 
                pixels[index + 2] = 0; 
            }
        }
    }
    viewportPG.updatePixels();
}
