#ifdef GL_ES
precision highp float;
#endif

varying vec2 vPos;

uniform vec3 u_colorCenter;
uniform vec3 u_colorEdge;
uniform float u_radius;

void main() {
  float dist = length(vPos);
  float t = clamp(dist / u_radius, 0.0, 1.0);
  vec3 col = mix(u_colorCenter, u_colorEdge, t);
  gl_FragColor = vec4(col, 1.0);
}
