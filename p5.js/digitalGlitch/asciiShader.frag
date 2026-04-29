#version 300 es
precision mediump float;

in vec2 vTexCoord;

uniform sampler2D u_image;
uniform sampler2D u_charmap;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_gridScale;
uniform float u_animSpeed;
uniform vec3 u_tint;

out vec4 fragColor;

void main() {
    // Number of cells based on resolution and grid scale
    vec2 cells = u_resolution / u_gridScale;
    
    // Calculate the grid cell UV (center)
    vec2 gridUV = floor(vTexCoord * cells) / cells;
    vec2 centerUV = gridUV + (0.5 / cells);
    
    // Calculate UV within the cell
    vec2 cellUV = fract(vTexCoord * cells);
    // Invert Y for correct font rendering
    cellUV.y = 1.0 - cellUV.y;
    
    // Sample the image color
    vec4 baseColor = texture(u_image, centerUV);
    
    // Calculate brightness
    float brightness = dot(baseColor.rgb, vec3(0.299, 0.587, 0.114));
    
    // Add animation noise based on time
    float noise = sin(gridUV.x * 13.0 + gridUV.y * 27.0 + u_time * u_animSpeed) * 0.15;
    brightness = clamp(brightness + noise, 0.0, 0.999);
    
    // Character lookup
    float numChars = 10.0;
    float charIndex = floor(brightness * numChars);
    vec2 charUV = vec2((cellUV.x + charIndex) / numChars, cellUV.y);
    
    vec4 charColor = texture(u_charmap, charUV);
    
    // Charmap is white text on black background
    vec3 finalColor = u_tint * charColor.r;
    
    fragColor = vec4(finalColor, 1.0);
}
