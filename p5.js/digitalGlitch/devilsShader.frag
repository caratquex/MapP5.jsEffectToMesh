#ifdef GL_ES
precision highp float;
#endif

varying vec2 vTexCoord;

uniform float u_time;
uniform float u_seed;
uniform float u_count;
uniform float u_length;
uniform float u_spread;
uniform float u_curve;
uniform float u_sharp;
uniform float u_vein;
uniform float u_chaos;

// Hash and Noise functions
float hash(float n) { return fract(sin(n) * 1e4); }
float hash(vec2 p) { return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); }

float noise(float x) {
    float i = floor(x);
    float f = fract(x);
    float u = f * f * (3.0 - 2.0 * f);
    return mix(hash(i), hash(i + 1.0), u);
}

float noise(vec2 x) {
    vec2 i = floor(x);
    vec2 f = fract(x);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

mat2 rotate(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat2(c, -s, s, c); // Counter-clockwise rotation
}

// Distance to line segment
float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

void main() {
    // Map coords exactly like p5 WEBGL translate bounds, so finger size aligns with screen/pScale
    vec2 uv = (vTexCoord - 0.5) * 800.0; // 800px local bound box. We will draw a rect of size 800 in p5
    vec2 p = uv; 

    float dFleshy = 1e6;
    float dGleba = 1e6;

    vec3 colFleshy = vec3(1.0, 0.23, 0.14); // rgb(255, 59, 35)
    vec3 colGleba = vec3(0.08, 0.04, 0.06); // rgb(20, 10, 15)

    float tFrames = u_time * 30.0;
    int count = int(u_count);

    float endWidth = mix(20.0, 0.0, u_sharp / 100.0);
    
    // We must ensure the loop evaluates statically for compilation, up to max finger count (20)
    for(int i = 0; i < 20; i++) {
        if(i >= count) break;
        float fi = float(i);

        float baseAngle = 0.0;
        if(u_spread >= 6.27) {
            baseAngle = (6.28318 / u_count) * fi;
        } else {
            float startAngle = 1.5708 - (u_spread / 2.0);
            float angleStep = u_count > 1.0 ? u_spread / (u_count - 1.0) : 0.0;
            baseAngle = startAngle + (angleStep * fi);
        }

        float fSeed1 = mod(u_seed * 11.1 + fi * 10.0, 10000.0);
        float fSeed2 = mod(u_seed * 31.4 + fi * 20.0, 10000.0);

        float lenNoise = noise(fSeed1);
        float chaosLenMult = mix(1.0 - u_chaos, 1.0 + u_chaos, lenNoise);
        float angNoise = noise(fSeed2);
        float chaosAngleMod = mix(-u_chaos, u_chaos, angNoise);

        float angle = baseAngle + chaosAngleMod;
        float finalLength = u_length * chaosLenMult;

        // Vector local space bounds mapping
        vec2 lp = p * rotate(angle); // Rotate point to local space

        // Find progress t along the finger
        float t = clamp(lp.x / finalLength, 0.0, 1.0);

        // Approximate widths and wobbles at this t
        float w = mix(30.0, endWidth, t);
        float spineWobble = sin(t * 6.0 - tFrames * 0.05 + angle) * (t * u_curve);
        float centerLineY = spineWobble;

        float edgeNoiseTop = mix(-u_vein, u_vein, noise(vec2(t * 5.0, tFrames * 0.01 + u_seed)));
        float edgeNoiseBot = mix(-u_vein, u_vein, noise(vec2(t * 5.0 + 100.0, tFrames * 0.01 + u_seed)));
        
        // Fleshy distance evaluation (rough bounding SDF around centerline)
        // distance from point to the curve's centerline point:
        vec2 centerPoint = vec2(t * finalLength, centerLineY);
        float dToCenterLine = length(lp - centerPoint);
        
        // Exact distances for cap and width
        float fingerTopDist = (lp.y - centerLineY) - (w + edgeNoiseTop);
        float fingerBotDist = -(lp.y - centerLineY) - (w + edgeNoiseBot);
        float currentDistFleshy = max(dToCenterLine - w - mix(edgeNoiseBot, edgeNoiseTop, 0.5), max(fingerTopDist, fingerBotDist));
        
        // Capping the finger
        float capEnd = lp.x - finalLength;
        float capStart = -lp.x;
        currentDistFleshy = max(currentDistFleshy, max(capStart, capEnd));

        dFleshy = min(dFleshy, currentDistFleshy);

        // Gleba Inner Evaluation
        if (t >= 0.15 && t <= 0.85) {
            float maxW = mix(15.0, 1.0, t);
            float nv = noise(vec2(t * 10.0, tFrames * 0.02 + u_seed));
            float poreScale = mix(4.0, 18.0, nv);
            float yWobble = mix(-maxW, maxW, noise(vec2(t * 8.0, tFrames * 0.01 + 50.0 + u_seed)));
            
            vec2 poreCenter = vec2(t * finalLength, yWobble + spineWobble);
            vec2 dPore = lp - poreCenter;
            
            // ellipse distance formulation
            float dP = length(vec2(dPore.x / (poreScale*0.5), dPore.y / (poreScale*0.6))) - 1.0;
            if(dP < 0.0) {
                dGleba = min(dGleba, dP);
            }
        }
    }

    vec3 finalColor = vec3(0.0);
    float alpha = 0.0;

    // Soft antialiasing transition
    float aaFleshy = smoothstep(1.5, -0.5, dFleshy);
    
    if (aaFleshy > 0.0) {
        alpha = aaFleshy;
        finalColor = colFleshy;
        
        if (dGleba < 0.0) {
            finalColor = colGleba;
        }
    }

    gl_FragColor = vec4(finalColor, alpha);
}
