#version 300 es
precision highp float;

in vec2 vTexCoord;
out vec4 fragColor;

uniform float u_time;
uniform float u_seed;
uniform float u_scale;
uniform float u_gap;
uniform float u_layers;
uniform vec3 u_colors[5];

// Morgan McGuire's 2D Noise
float random (vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

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
    vec2 uv = (vTexCoord - 0.5) * 2.0; 
    
    // quadRadius mimics maximum expanded radius of LineFungus
    float quadRadius = u_layers * u_gap * 1.5;
    float dist = length(uv) * quadRadius;
    float angle = atan(uv.y, uv.x);
    
    // Instead of cos(a) from -1 to 1 stretching over nScale, 
    // map it exactly like CPU: map(cos(a), -1, 1, 0, nScale)
    float xoff = (cos(angle) * 0.5 + 0.5) * u_scale + u_seed;
    float yoff = (sin(angle) * 0.5 + 0.5) * u_scale + u_seed;
    float zoff = u_time * 0.05;
    
    float layerFound = -1.0;
    
    // Evaluate starting from the topmost layer downwards (i = 0 to u_layers)
    // The CPU rendered from layer u_layers down to 0, which means 0 was rendered last (on top).
    // In fragment shader, checking closest to camera (on top) first is better.
    for (float i = 0.0; i < 60.0; i += 1.0) {
        if (i >= u_layers) break;
        
        float n = noise(vec2(xoff + i * 0.01 + zoff, yoff + i * 0.01 + zoff));
        float innerGapScale = u_gap * 0.43;
        float r = mix(i * innerGapScale, i * u_gap, n);
        
        if (dist <= r) {
            layerFound = i;
            break;  // Stop at the first (topmost) layer we hit
        }
    }
    
    if (layerFound < 0.0) {
        discard;
    }
    
    float t_col = layerFound / u_layers;
    int colIdx = int(floor(t_col * 4.99));
    if (colIdx > 4) colIdx = 4;
    
    fragColor = vec4(u_colors[colIdx], 1.0);
}
