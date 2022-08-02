import { ShaderMaterial, Vector2, Vector3, Vector4 } from "./three.module.js";



export const opalShader = {
    vertexShader:([
        'varying vec3 vNormal;',
        'varying vec2 vUv;',
        'void main()',
        '{',
        ' vNormal = normal;',
        ' gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
        '}',
    ]).join('\n'),
    fragmentShader : ([
        //this is based on https://www.shadertoy.com/view/4tcGDr

'#define rot(spin) mat2(cos(spin),sin(spin),-sin(spin),cos(spin))',
'uniform vec3      iResolution;',           // viewport resolution (in pixels)
'uniform float     iTime;',
'uniform vec4      iMouse;',               // shader playback time (in seconds)
'uniform vec3      eye;',               // Camera position
'uniform vec3      center;',               // Camera target
'uniform float     fov;',               // Camera target
'uniform vec2     mouse;',               // Camera target

'const int MAX_MARCHING_STEPS = 1000;',
'const float MIN_DIST = 0.0;',
'const float MAX_DIST = 100.0;',
'const float EPSILON = 0.000001;',

'const float scale = EPSILON*10.0;',
'varying vec3 vNormal;',
'varying vec2 vUv;',
'vec3 animate(vec3 p){',
'    vec3 p1 = p;',
    //p1 /= 1.1;
'    float d = 200.0;',
'    return p+(sin(p1.zxy/d)+cos(p1.zxy/d))*d;',
'}',

/**
 * Signed distance function describing the scene.
 * 
 * Absolute value of the return value indicates the distance to the surface.
 * Sign indicates whether the point is inside or outside the surface,
 * negative indicating inside.
 */
'float sceneSDF(vec3 p) {',
'    p /= scale*2.0;',
'    float to_return = 4.5 +sin(length(p*10.0)/10.0) + sin(p.x/5.0)+cos(p.y/5.0)+cos(p.z/5.0);',
'    for(int i = 1; i < 3; i++){',
    	//p += sin(iTime);
'        p += animate(p*2.0-to_return)/3.0;',
'        p /= 2.0;',
'        to_return -= .5;',
'        to_return = min(to_return,4.5 +sin(length(p*10.0)/10.0) + sin(p.x/5.0)+cos(p.y/5.0)+cos(p.z/5.0));',
        //to_return -= 1.5;
'    }',
    
'    return (to_return-.4) * scale/1.0;',
'}',

'vec3 surface_color(in vec3 uv)',
'{',
'   uv *= 10.0;',
'   return vec3(1.0,.0,0.0);',
// '   return sin(vec3(sceneSDF(uv/2.0),sceneSDF(uv/3.0),sceneSDF(uv/5.0))/5.0);',
'}',

/**
 * Return the shortest distance from the eyepoint to the scene surface along
 * the marching direction. If no part of the surface is found between start and end,
 * return end.
 * 
 * eye: the eye point, acting as the origin of the ray
 * marchingDirection: the normalized direction to march in
 * start: the starting distance away from the eye
 * end: the max distance away from the ey to march before giving up
 */
'float shortestDistanceToSurface(vec3 eye, vec3 marchingDirection, float start, float end) {',
'    float depth = start;',
'    for (int i = 0; i < MAX_MARCHING_STEPS; i++) {',
'        float dist = sceneSDF(eye + depth * marchingDirection);',
'        if (dist < EPSILON*(1.0+depth)) {',
'			return depth;',
'        }',
'        depth += dist;',
'        if (depth >= end) {',
'            return end;',
'        }',
'    }',
'    return end;',
'}',
            

/**
 * Return the normalized direction to march in from the eye point for a single pixel.
 * 
 * fieldOfView: vertical field of view in degrees
 * size: resolution of the output image
 * fragCoord: the x,y coordinate of the pixel in the output image
 */
'vec3 rayDirection(float fieldOfView, vec2 size, vec2 fragCoord) {',
'    vec2 xy = fragCoord - size / 2.0;',
'    float z = size.y / tan(radians(fieldOfView) / 2.0);',
'    return normalize(vec3(xy, -z));',
'}',

/**
 * Using the gradient of the SDF, estimate the normal on the surface at point p.
 */
'vec3 estimateNormal(vec3 p) {',
'    return normalize(vec3(',
'        sceneSDF(vec3(p.x + EPSILON, p.y, p.z)) - sceneSDF(vec3(p.x - EPSILON, p.y, p.z)),',
'        sceneSDF(vec3(p.x, p.y + EPSILON, p.z)) - sceneSDF(vec3(p.x, p.y - EPSILON, p.z)),',
'        sceneSDF(vec3(p.x, p.y, p.z  + EPSILON)) - sceneSDF(vec3(p.x, p.y, p.z - EPSILON))',
'    ));',
'}',

/**
 * Lighting contribution of a single point light source via Phong illumination.
 * 
 * The vec3 returned is the RGB color of the light's contribution.
 *
 * k_a: Ambient color
 * k_d: Diffuse color
 * k_s: Specular color
 * alpha: Shininess coefficient
 * p: position of point being lit
 * eye: the position of the camera
 * lightPos: the position of the light
 * lightIntensity: color/intensity of the light
 *
 * See https://en.wikipedia.org/wiki/Phong_reflection_model#Description
 */
'vec3 phongContribForLight(vec3 k_d, vec3 k_s, float alpha, vec3 p, vec3 eye,',
'                          vec3 lightPos, vec3 lightIntensity) {',
'    vec3 N = normalize(vNormal);',
'    vec3 L = normalize(lightPos - p);',
'    vec3 V = normalize(eye - p);',
'    vec3 R = normalize(reflect(-L, N));',
    
'    float dotLN = dot(L, N);',
'    float dotRV = dot(R, V);',
    
'    if (dotLN < 0.0) {',
        // Light not visible from this point on the surface
'        return vec3(0.0, 0.0, 0.0);',
'    } ',
    
'    if (dotRV < 0.0) {',
        // Light reflection in opposite direction as viewer, apply only diffuse
        // component
'        return lightIntensity * (k_d * dotLN);',
'    }',
'    return lightIntensity * (k_d * dotLN + k_s * pow(dotRV, alpha));',
'}',

/**
 * Lighting via Phong illumination.
 * 
 * The vec3 returned is the RGB color of that point after lighting is applied.
 * k_a: Ambient color
 * k_d: Diffuse color
 * k_s: Specular color
 * alpha: Shininess coefficient
 * p: position of point being lit
 * eye: the position of the camera
 *
 * See https://en.wikipedia.org/wiki/Phong_reflection_model#Description
 */
'vec3 phongIllumination(vec3 c, vec3 k_a, vec3 k_d, vec3 k_s, float alpha, vec3 p, vec3 eye) {',
'    const vec3 ambientLight = 0.2 * vec3(1.0, 1.0, 1.0);',
'    k_a=vec3(0.20);',
'    vec3 color = 0.75*c+0.25*ambientLight * k_a;',
'    vec3 light1Pos = vec3(0.0,-.00,-0.90);',
'    vec3 light1Intensity = vec3(0.8, 0.8, 0.8);',
'    vec3 tmp = phongContribForLight(k_d, k_s, alpha, p, eye,',
'                                  light1Pos,',
'                                  light1Intensity);',
'       if(tmp.x == 0.){',
'           color =color/1.5 + 0.7*tmp;',
'       }',
'       else  ',
'           color += 0.7*tmp;',
    
'    return color;',
'}',

/**
 * Return a transform matrix that will transform a ray from view space
 * to world coordinates, given the eye point, the camera target, and an up vector.
 *
 * This assumes that the center of the camera is aligned with the negative z axis in
 * view space when calculating the ray marching direction. See rayDirection.
 */
'mat3 viewTransform(vec3 eye, vec3 center, vec3 up) {',
    // Based on gluLookAt man page
'    vec3 f = normalize(center - eye);',
'    vec3 s = normalize(cross(f, up));',
'    vec3 u = cross(s, f);',
'    return mat3(s, u, -f);',
'}',
'vec2 cinv( vec2 z)  { float d = dot(z,z); return vec2( z.x, -z.y ) / d; }',
'',
'float rand(vec2 co){',
'    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);',
'}',
'void mainImage( out vec4 fragColor, in vec2 fragCoord )',
'{',
// '	vec2 p =0.01*(-1.2*iResolution.xx-fragCoord.xx);',
// '    if(mouse.x > 0.0) xx = mouse.x;',
// '    else',
// '       xx = mouse.x/10.0 * vNormal.y;',
// '       xx = mouse.x/10.0 * vNormal.y;',
// '	vec2 p =0.000051*10.0*(vNormal.xy*iResolution.xy+1.875*fragCoord.xy);',
'   float xx = (30.0)*(vNormal.x)+mouse.y*20.5;',
'   float yy = (50.0)*vNormal.y+mouse.x*30.5;',
'	vec2 p =0.000051*(xx+yy)*(-iResolution.xy+1.875*fragCoord.xy);',
'    //vec3 col, col1;',
'	',
'    ',
'    vec2 c= p;',
'',
'	vec2 z = p;',
'	float f = 3.2;',
'	float g = 3.3;',
'    ',
'    vec2 cc= p;',
'',
'	vec2 zz = p;',
'	float ff = 3.3;',
'	float gg = 3.5;',
// '	/*if(p.x>.3){',
// '		c = (iMouse.z>0.)?1.2*(-iResolution.xy+2.0*iMouse.xy)/iResolution.y:vec2(-1.14,0.533);',
// '		z.x-= 1.5;',
// '		z*=1.5;',
// '	}*/',
//'	c = (iMouse.z>0.)?1.2*(-iResolution.xy+2.0*iMouse.xy)/iResolution.y:vec2(-1.14,0.533);',
'    c = vec2(-0.,-1);',
'	z.x-= 0.5;',
'    z.y-= 1.0;',
'	z*=0.8;',
'	for( int i=0; i<50; i++ ) ',
'	{',
'		z.x=abs(z.x);',
'		z=(cinv(z))+c;',
'		',
'		f = min( f, abs(dot(z-c,z-c) ));',
'		g = min( g, dot(z+c,z+c));',
'	}',
'	',
'	f = 1.0+log(f)/5.0 + log(f)/5.0;',
'	g = 1.0+log(g)/6.0 + log(g)/6.0;',
'    ',
'    /********************************/',
'    ',
'    cc = vec2(-0.45,-0.245);',
'	zz.x= zz.x - 20.0*mouse.x - 0.20;',
'    zz.y= zz.y - mouse.y -.22;',
'	zz= zz*1.1 ;',
'	for( int i=0; i<10; i++ ) ',
'	{',
'		zz.x=abs(zz.x);',
'		zz=(cinv(zz))+cc;',
'		',
'		ff = min( ff, abs(dot(zz-cc,zz-cc) ));',
'		gg = min( gg, dot(zz+cc,zz+cc));',

'	}',
'	',
'	ff = (rand(20.0*vec2(mouse.x,mouse.y))+0.5)+log(ff)/(3.0+mouse.y) + log(ff)/3.0;',
'	gg = (0.8)+log(gg)/(3.0+mouse.x) + log(gg)/5.0;',
'    ',
'    ',
'    /**********************************/',
'	',
'	vec3 col = 1.-g*abs(vec3(g*0.8,f*0.2*g*0.3,f*f*0.5)); // فيروزي',
'	vec3 col1 = 1.-gg*abs(vec3(gg*0.8,ff*0.3*gg*0.5,ff*ff*0.2)); ',
'    //col = 1.-g*abs(vec3(g*0.4,f*0.3*g*0.3,f*0.5)); ',
'	',
'	/*col = mix(col, vec3(1.),PrintValue((p-vec2(0.3,1.))/.07, c.x,5.,3.));',
'	col = mix(col, vec3(1.),PrintValue((p-vec2(0.9,1.))/.07, c.y,5.,3.));',
'    ',
'    col = mix(col, vec3(1.),PrintValue((p-vec2(0.3,1.09))/.07, g,5.,2.));',
'    col = mix(col, vec3(1.),PrintValue((p-vec2(0.9,1.09))/.07, f,5.,2.));*/',
'    ',
'',
'	//col = mix(col, vec3(1.),PrintValue((p-vec2(0.9,1.))/.07, c.y,5.,3.));',
'    col = mix(col, col1,0.5);',
'',
//'    fragColor = vec4(col,1.0);',
//'    return;',
'    ',
'   ',
'',
'    ',
'    ',
'	vec3 viewDir = rayDirection(120.0, iResolution.xy, fragCoord);',
'    if (length(iMouse.xy) > 80.0) {',
'        viewDir.yz *= rot(3.14*0.5-iMouse.y/iResolution.y*3.14);',
'        viewDir.xz *= rot(3.14-iMouse.x/iResolution.x*3.14*2.0);',
'    }',
    
'    vec3 eye = scale*vec3(sin(-5./10.0), cos(-0.5/10.0), -iTime)*10.0; ',
'    mat3 viewToWorld = viewTransform(eye, vec3(0.0, 0.0, 0.0), vec3(1.0, 0.0, .0));',
    
'    vec3 worldDir = viewToWorld *viewDir;',
    
'    float dist = shortestDistanceToSurface(eye, worldDir, MIN_DIST, MAX_DIST);',
    
'    if (dist > MAX_DIST - EPSILON) {',
        // Didn't hit anything
'        fragColor = vec4(0.0, 0.0, 0.0, 0.0);',
'		return;',
'    }',
    
    // The closest point on the surface to the eyepoint along the view ray+surface_color(p+viewDir*50.0)*.6
'    vec3 pp;',
/* '    p.x = vUv.x',
'    p.z = vUv.y', */
    
'    vec3 K_a = 0.80*surface_color(vec3(vUv, .80));',
'    vec3 K_d = K_a;',
'    vec3 K_s = vec3(.80, 1.0,1.0);', // color of the circle light on surfacre
'    float shininess = 50.;',
'    vec3 color = phongIllumination(col ,K_a, K_d, K_s, shininess, pp, eye);',
// '    vec3 orginal = mix(col, K_a*color, 0.12);',
'    //vec3 color = mix(col1, col1, 0.5 );',
'    ',
'    fragColor = vec4(color,1.0);',
// '    fragColor = vec4(orginal,1.0);',
'}',
// 'void mainImage( out vec4 fragColor, in vec2 fragCoord )',
// '{',
// '	vec3 viewDir = rayDirection(45.0, iResolution.xy, fragCoord);',
// '    if (length(iMouse.xy) > 20.0) {',
// '        viewDir.yz *= rot(3.14*0.5-iMouse.y/iResolution.y*3.14);',
// '        viewDir.xz *= rot(3.14-iMouse.x/iResolution.x*3.14*2.0);',
// '    }',
    
// '    vec3 eye = scale*vec3(sin(iTime/5.0), cos(iTime/5.0), -iTime)*10.0; ',
// '    mat3 viewToWorld = viewTransform(eye, vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0));',
    
// '    vec3 worldDir = viewToWorld * -viewDir;',
    
// '    float dist = shortestDistanceToSurface(eye, worldDir, MIN_DIST, MAX_DIST);',
    
// '    if (dist > MAX_DIST - EPSILON) {',
//         // Didn't hit anything
// '        fragColor = vec4(0.0, 0.0, 0.0, 0.0);',
// '		return;',
// '    }',
    
//     // The closest point on the surface to the eyepoint along the view ray+surface_color(p+viewDir*50.0)*.6
// '    vec3 p;',
// /* '    p.x = vUv.x',
// '    p.z = vUv.y', */
    
// '    vec3 K_a = surface_color(vec3(vUv, 0.0));',
// '    vec3 K_d = K_a;',
// '    vec3 K_s = vec3(1.0, 1.0, 1.0);', // color of the circle light on surfacre
// '    float shininess = 20.0;',
// '    vec3 color = phongIllumination(K_a, K_d, K_s, shininess, p, eye);',
    
// '    fragColor = vec4(color, 1.0);',

// '}',
'void main() {',
'    vec4 color;// = vec4(1.0,0.0,0.0,1.0);',
'    mainImage(color, gl_FragCoord.xy);',
'    gl_FragColor.xyz = color.xyz;',
'}',
    ]).join('\n'),
    uniforms : {
        iResolution : {value : new Vector3()},
        iTime : {value : 0.0},
        fov : {value : 75},
        iMouse : {value : new Vector4()},
        eye : {value : new Vector3()},
        center : {value : new Vector3()},
        mouse : {value: new Vector2()},
    }
}

export const M_opal = new ShaderMaterial({
    vertexShader: opalShader.vertexShader,
    fragmentShader:opalShader.fragmentShader,
    uniforms:opalShader.uniforms,
});

