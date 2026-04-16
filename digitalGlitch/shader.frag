#version 300 es
precision highp float;

in vec2 vTexCoord;
out vec4 fragColor;

uniform vec3 u_color;
uniform float u_seed;
uniform float u_time;
uniform float u_glitchType; // 1.0 to 4.0
uniform float u_gridScale; // Dynamic pixelation scale

// Simple pseudo-random function
float random (vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

// 2D Noise based on Morgan McGuire @morgan3d
float noise (vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
    // Map UVs from [0.0 to 1.0] to [-1.0 to 1.0]
    vec2 uv = vTexCoord * 2.0 - 1.0;

    // Discrete ticking time for snappy random glitches
    float t = floor(u_time * 2.0);
    
    // --- GLITCH LOGIC: Tearing rows ---
    float sliceSize = floor(u_gridScale * 0.5 + mix(-2.0, 2.0, random(vec2(u_seed))));
    if (sliceSize < 2.0) sliceSize = 2.0;
    float rowBlocks = floor(uv.y * sliceSize);
    
    // Chance to shift an entire horizontal slice representing video artifact tearing
    float shiftSeed = random(vec2(rowBlocks, u_seed + t * 0.5));
    float shift = 0.0;
    if (shiftSeed > 0.70) {
        shift = (random(vec2(rowBlocks, u_seed + 1.0 + t * 0.5)) - 0.5) * 1.0; 
    }
    vec2 gUv = uv + vec2(shift, 0.0);
    
    // --- GLITCH LOGIC: Macroblock subdivision (8-bit NES tile effect) ---
    float gridScale = floor(u_gridScale + mix(-3.0, 3.0, random(vec2(u_seed + 2.0)))); 
    if (gridScale < 2.0) gridScale = 2.0;
    
    vec2 cellUv = floor(gUv * gridScale);
    vec2 pUv = cellUv / gridScale; // Pixelated/Grid UV for shape logic
    vec2 localUv = fract(gUv * gridScale); // 0-1 within the individual macro block
    
    // --- Base Shape Boundary ---
    // Use the pixelated coordinates so the edges of the fungus look blocky
    float dist = length(pUv);
    float angle = atan(pUv.y, pUv.x);
    
    // Organic boundary wrapped around the pixel grid
    float edgeDeform = noise(vec2(angle * 3.0, u_seed)) * 0.15; 
    float maxRadius = 0.8 + edgeDeform;
    
    if (dist > maxRadius) {
        discard;
    }

    // --- Glitch Color Palettes ---
    vec3 altPink = vec3(1.0, 0.65, 0.65);
    vec3 altBlue = vec3(0.5, 0.75, 1.0);
    vec3 black   = vec3(0.05, 0.05, 0.05);
    vec3 white   = vec3(0.95, 0.95, 0.95);
    vec3 olive   = vec3(0.5, 0.6, 0.1);

    vec3 col1 = u_color;
    vec3 col2 = black;
    
    // Dynamically pick a corrupt secondary color per block
    float colRand = random(cellUv + vec2(u_seed + t * 0.5));
    if (colRand > 0.8) col2 = altPink;
    else if (colRand > 0.6) col2 = altBlue;
    else if (colRand > 0.4) col2 = white;
    else if (colRand > 0.2) col2 = olive;
    
    // Occasionally invert local tile palette
    if (random(cellUv + vec2(u_seed + 2.0)) > 0.5) {
        vec3 temp = col1;
        col1 = col2;
        col2 = temp;
    }

    vec3 blockColor = col1;

    // --- Glitch Patterns Separated by Assigned Object Type ---
    
    // Type 1: Lattice (1 light & 1 dark color)
    if (u_glitchType < 1.5) {
        vec3 cLight = vec3(0.95);
        vec3 cDark = vec3(0.05);
        if (random(vec2(u_seed)) > 0.5) {
            cLight = clamp(u_color + 0.3, 0.0, 1.0);
            cDark = u_color * 0.2;
        } else {
            cLight = vec3(0.95);
            cDark = clamp(u_color * 0.4, 0.0, 1.0);
        }
        
        float latticeDim = floor(mix(2.0, 8.0, random(cellUv)));
        vec2 subUv = fract(localUv * latticeDim);
        float checker = step(0.5, subUv.x) + step(0.5, subUv.y);
        
        blockColor = (checker == 1.0) ? cDark : cLight;
        
        // Glitch invert internally
        if (random(cellUv + vec2(t)) > 0.8) {
            blockColor = (checker == 1.0) ? cLight : cDark;
        }
    }
    
    // Type 2: Pixel Shapes (few pixels forming random clumps)
    else if (u_glitchType < 2.5) {
        float subDim = floor(mix(3.0, 6.0, random(cellUv)));
        vec2 subGrid = floor(localUv * subDim);
        float shapeRand = random(cellUv + subGrid + vec2(u_seed + t));
        
        blockColor = shapeRand > 0.4 ? col1 : col2;
        
        // Randomly drop specific internal pixels entirely to reveal background
        if (shapeRand > 0.85) discard;
    }
    
    // Type 3: Lines
    else if (u_glitchType < 3.5) {
        float lineDir = random(cellUv + vec2(u_seed));
        float lineDensity = floor(mix(2.0, 8.0, random(cellUv)));
        float lineVal;
        
        if (lineDir > 0.5) {
            lineVal = step(0.5, fract(localUv.y * lineDensity)); 
        } else {
            lineVal = step(0.5, fract(localUv.x * lineDensity)); 
        }
        
        // Flickering line inversion over time
        if (random(cellUv + vec2(t)) > 0.7) lineVal = 1.0 - lineVal;
        
        blockColor = lineVal > 0.5 ? col1 : col2;
    }
    
    // Type 4: Stairs (pixels forming random diagonal steps)
    else {
        float stairDim = floor(mix(3.0, 8.0, random(cellUv)));
        vec2 subUv = floor(localUv * stairDim) / stairDim; 
        
        float dir = random(cellUv + vec2(u_seed));
        float stairVal;
        
        if (dir > 0.75) stairVal = step(subUv.x, subUv.y); // Up right
        else if (dir > 0.5) stairVal = step(subUv.x, 1.0 - subUv.y); // Down right
        else if (dir > 0.25) stairVal = step(1.0 - subUv.x, subUv.y); // Up left
        else stairVal = step(1.0 - subUv.x, 1.0 - subUv.y); // Down left
        
        // Toggling stairs over time
        if (random(cellUv + vec2(t)) > 0.8) stairVal = 1.0 - stairVal;
        
        blockColor = stairVal > 0.5 ? col1 : col2;
    }

    // Still punch occasional memory garbage holes unconditionally matching glitch aesthetic
    if (random(cellUv + vec2(10.0 + t)) > 0.9) discard;

    fragColor = vec4(blockColor, 1.0);
}
