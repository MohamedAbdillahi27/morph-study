'use strict';

const MorphBlackHoleOptics = (() => {
  const PI = Math.PI;
  const RAYS = 960;
  const STEPS = 768;
  const MIN_B = .7;
  const MAX_B = 28;
  const MAX_ANGLE = PI * 2.9;
  const TILT = -.068;
  const INCLINATION = 1.425;
  const CRITICAL = Math.sqrt(27);
  const INNER = 5.95;
  const OUTER = 22;
  let lookup;
  let gpu;

  function table() {
    if (lookup) return lookup;
    lookup = new Float32Array(RAYS * STEPS);
    const delta = MAX_ANGLE / (STEPS - 1);
    // Schwarzschild null orbit in its ray plane, in units with G = c = M = 1.
    // u = 1/r, u'' = 3u² − u. From infinity u = 0 and u' = 1/b.
    for (let i = 0; i < RAYS; i++) {
      const b = MIN_B + (MAX_B - MIN_B) * i / (RAYS - 1);
      let u = 0;
      let v = 1 / b;
      for (let j = 1; j < STEPS; j++) {
        if (u >= .5) {
          lookup[j * RAYS + i] = .5;
          continue;
        }
        v += .5 * delta * (3 * u * u - u);
        u += v * delta;
        v += .5 * delta * (3 * u * u - u);
        if (u <= 0) break;
        lookup[j * RAYS + i] = Math.min(u,.5);
      }
    }
    return lookup;
  }

  function geometry(width, height) {
    const unit = Math.min(width / 46.8, height / 20);
    return { x: width * .5, y: height * .49, unit, radius: unit * 19.5, shadowRadius: CRITICAL / 19.5, shadowY: 0, tilt: TILT };
  }

  function inverseRadius(b, angle) {
    const x = (b - MIN_B) / (MAX_B - MIN_B) * (RAYS - 1);
    const y = angle / MAX_ANGLE * (STEPS - 1);
    if (x < 0 || x >= RAYS - 1 || y < 0 || y >= STEPS - 1) return 0;
    const ix = Math.floor(x), iy = Math.floor(y);
    const sx = x - ix, sy = y - iy;
    const data = table();
    const p = ix + iy * RAYS;
    const a = data[p] * (1 - sx) + data[p + 1] * sx;
    const c = data[p + RAYS] * (1 - sx) + data[p + RAYS + 1] * sx;
    return a * (1 - sy) + c * sy;
  }

  function hit(g, x, y) {
    const px = (x - g.x) / g.unit, py = (y - g.y) / g.unit;
    x = px * Math.cos(TILT) + py * Math.sin(TILT);
    y = px * Math.sin(TILT) - py * Math.cos(TILT);
    const b = Math.hypot(x, y);
    const angle = PI / 2 + Math.atan(Math.tan(INCLINATION) * y / Math.max(.001, b));
    const r = 1 / inverseRadius(b, angle);
    const secondary = 1 / inverseRadius(b, angle + PI);
    if (y < -.24 && r > INNER && r < OUTER) return x < -6 && r < 16 ? 'beam' : 'disk';
    if (Math.abs(b - CRITICAL) < .38) return 'ring';
    if (b < CRITICAL) return 'shadow';
    if ((y > 0 && r > INNER && r < OUTER) || (secondary > INNER && secondary < OUTER)) return 'lens';
    if (r > INNER && r < OUTER) return x < -6 && r < 16 ? 'beam' : 'disk';
    return null;
  }

  const vertex = `#version 300 es
    void main() {
      vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
      gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
    }`;

  const fragment = `#version 300 es
    precision highp float;
    uniform sampler2D paths, searchInk;
    uniform vec2 logicalSize, rasterSize, centre, searchCentre, searchHalf;
    uniform float unit, progress, ambient, transition;
    uniform int selected;
    out vec4 colour;

    const float PI = 3.14159265;
    const float B = ${CRITICAL.toFixed(7)};
    const float EDGE = ${OUTER.toFixed(1)};
    const float INCLINE = ${INCLINATION.toFixed(3)};
    const float TILT = ${TILT.toFixed(3)};

    mat2 rotate(float a) { return mat2(cos(a), sin(a), -sin(a), cos(a)); }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f*f*(3.0-2.0*f);
      vec4 n = vec4(dot(i,vec2(127.1,311.7))) + vec4(0.,127.1,311.7,438.8);
      n = fract(sin(n) * 43758.5453);
      return mix(mix(n.x,n.y,f.x),mix(n.z,n.w,f.x),f.y);
    }

    float inverseRadius(float b, float angle) {
      vec2 p = vec2((b - ${MIN_B}) / ${MAX_B - MIN_B}, angle / ${MAX_ANGLE})
        * vec2(${RAYS - 1}.0, ${STEPS - 1}.0);
      if (any(lessThan(p,vec2(0))) || any(greaterThanEqual(p,vec2(${RAYS - 1}.0,${STEPS - 1}.0)))) return 0.;
      ivec2 i = ivec2(p);
      vec2 f = fract(p);
      return mix(mix(texelFetch(paths,i,0).r,texelFetch(paths,i+ivec2(1,0),0).r,f.x),
                 mix(texelFetch(paths,i+ivec2(0,1),0).r,texelFetch(paths,i+ivec2(1,1),0).r,f.x),f.y);
    }

    // The same emissivity field is sampled on every disk-plane crossing.
    vec4 emission(float u, vec2 direction, float order) {
      if (u < 1./(EDGE+1.) || u > .181) return vec4(0.);
      float r = 1./u;
      float phi = atan(direction.y,direction.x);
      float flow = (progress * 6.2831853 + ambient) * (1.08 + .64 * pow(9./r,1.35));
      float azimuth = phi + flow + 1.18 * log(r);
      vec2 axis = vec2(cos(azimuth),sin(azimuth));
      float broad = noise(axis*3.6 + vec2(r*.49,-r*.68));
      float medium = noise(axis*8. + vec2(r*1.7,-r*2.));
      float fine = noise(axis*17. + vec2(r*5.2,-r*3.3));
      float gas = .31 + .83 * broad + .25 * medium + .12 * fine;
      float inner = smoothstep(5.55,6.6,r);
      float ragged = (broad-.5)*1.75 + (medium-.5)*.78;
      float outer = 1. - smoothstep(15.8,EDGE,r+ragged);
      float opacity = inner * outer;
      float approaching = -direction.x * .36 * sqrt(7./r);
      float boost = pow(1./(1.-approaching),3.1);
      float heat = pow(6.9/max(6.9,r),2.44);
      float brightness = 2.45*heat*gas*boost*opacity;
      vec3 hot = mix(vec3(.92,.27,.095),vec3(1.,.83,.66),smoothstep(.51,1.5,heat*boost*gas));
      return vec4(hot * brightness * order, opacity);
    }

    vec3 light(vec2 p, float bend, out int feature) {
      float b = length(p);
      feature = 0;
      if (b>25.) return vec3(0.);
      vec2 axis = p/max(b,.001);
      float node = PI*.5 + atan(tan(INCLINE)*axis.y);
      // Unbend the first disk image for the earliest lensing frames. Once the
      // lens is established, both intersections come from the same orbit table.
      float straight = max(0.,sin(node)) / max(b,.001);
      float u0 = mix(straight,inverseRadius(b,node),bend);
      float u1 = inverseRadius(b,node+PI);
      float u2 = inverseRadius(b,node+2.*PI);
      vec2 diskDirection = normalize(vec2(axis.x,axis.y/max(cos(INCLINE),.14))+vec2(1e-7));
      vec4 direct = emission(u0,diskDirection,1.);
      vec4 lensed = emission(u1,-diskDirection,.32);
      vec4 finer = emission(u2,diskDirection,.085);
      float escape = smoothstep(B-.035,B+.045,b);
      vec3 gas = direct.rgb + (1.-direct.a)*(lensed.rgb+finer.rgb*(1.-lensed.a))*bend*escape;
      float rim = exp(-abs(b-B-.048)*19.) * .081 * bend * (1.-direct.a)*escape;
      gas += rim*vec3(.9,.53,.31)*(1.05-axis.x*.41);
      if (p.y<-.24 && direct.a>.22) feature = p.x<-6. && u0>1./16. ? 4 : 2;
      else if (abs(b-B)<.36) feature=5;
      else if (b<B) feature=1;
      else if ((direct.a>.12 && p.y>0.) || lensed.a>.22) feature=3;
      else if(direct.a>.2) feature=2;
      return gas;
    }

    float capsule(vec2 p, vec2 halfSize) {
      p.x -= clamp(p.x, -max(0.,halfSize.x-halfSize.y), max(0.,halfSize.x-halfSize.y));
      return length(p)-halfSize.y;
    }

    float deflection(float b) {
      return 15.0*b/(b*b+4.2);
    }

    void main() {
      vec2 pixel = logicalSize * vec2(gl_FragCoord.x/rasterSize.x,1.-gl_FragCoord.y/rasterSize.y);
      float t = transition;
      float optical = smoothstep(.04,.92,t);
      vec2 anchor = mix(searchCentre,centre,smoothstep(.08,.86,t));
      vec2 p = rotate(-TILT*optical)*(pixel-anchor)/unit;
      vec2 sky = vec2(p.x,-p.y);
      float b = length(sky);
      float capture = B*smoothstep(.15,.80,t);
      float shadow = 1.-smoothstep(capture-.035,capture+.092,b);
      int feature;
      vec3 rayLight = light(sky,optical,feature);
      // Inverse lens map of the measured pill, its fill, and its ink. A local
      // gradient separates the two sides of the field before its centre opens.
      vec2 field = pixel-anchor;
      float shear = smoothstep(.025,.61,t);
      float shift = shear * deflection(b) * unit;
      vec2 mapped = rotate(-TILT*optical)*vec2(field.x*(1.+.18*optical),field.y)
        - field/max(length(field),1.)*shift;
      mapped.y -= tanh(field.y/(unit*.62))*unit*2.7*smoothstep(.12,.65,t)
        *exp(-field.x*field.x/(unit*unit*58.));
      float sd = capsule(mapped,searchHalf);
      float outline = 1.-smoothstep(.30,1.58,abs(sd));
      float paper = 1.-smoothstep(-.32,.63,sd);
      float pigment = 1.-smoothstep(.16,.81,t);
      vec2 inkMap = mapped;
      float travel = smoothstep(.12,.64,t);
      inkMap.x -= searchHalf.x * .73 * travel;
      inkMap.y -= unit * 1.65 * travel * sin(inkMap.x/max(1.,searchHalf.x)*2.5);
      vec2 inkUV = (inkMap+searchHalf)/(2.*searchHalf);
      vec4 ink = vec4(0.);
      if (all(greaterThanEqual(inkUV,vec2(0.))) && all(lessThanEqual(inkUV,vec2(1.)))) {
        ink = texture(searchInk,vec2(inkUV.x,1.-inkUV.y));
      }
      float inkVisibility = ink.a * max(paper,.25) * (1.-smoothstep(.44,.77,t))*(1.-shadow);

      // The warped field lends its footprint to the emission. Its influence
      // spreads from the luminous boundary outward as the lens opens.
      float reach = mix(unit*.18,unit*35.,smoothstep(.27,.94,t));
      float fromField = 1.-smoothstep(reach*.55,reach,max(sd,0.));
      float disk = mix(fromField,1.,smoothstep(.79,.98,t)) * smoothstep(.24,.88,t);
      vec3 tone = pow(1.-exp(-rayLight*1.19),vec3(.76));
      float energy = max(tone.r,max(tone.g,tone.b));
      vec3 amber = vec3(.99,.56,.29);
      float hotPaper = smoothstep(.17,.78,t);
      vec3 colourOnPill = mix(vec3(.937,.933,.925),mix(vec3(.24,.09,.047),tone/max(.18,energy),.65),hotPaper);
      vec3 edge = mix(vec3(.875,.871,.855),amber,smoothstep(.12,.56,t));
      float edgeSurvival = 1.-smoothstep(.51,.96,t);
      float density = paper*pigment*(1.-shadow);
      float gasAlpha = clamp(energy*disk*1.22,0.,1.);
      vec3 premul = tone*disk;
      premul += vec3(.14,.052,.024)*exp(-dot(sky*vec2(.095,.26),sky*vec2(.095,.26)))*disk*.35*(1.-shadow);
      float hazeAlpha = .12*exp(-dot(sky*vec2(.095,.26),sky*vec2(.095,.26)))*disk*(1.-shadow);
      float alpha = max(shadow*smoothstep(.12,.49,t)*.88,max(max(gasAlpha,hazeAlpha),max(density,outline*edgeSurvival)));
      premul = mix(premul,colourOnPill,density);
      premul = mix(premul,edge,outline*edgeSurvival*(1.-shadow));
      premul = mix(premul,ink.rgb,inkVisibility);
      if (selected>0 && selected==feature) {
        float shine = selected==1 || selected==5 ? exp(-abs(b-B)*6.)*.19 : energy*.13;
        premul += shine*vec3(1.,.84,.61);
        alpha=max(alpha,shine);
      }
      colour = vec4(clamp(premul/max(alpha,.001),0.,1.),alpha);
    }
  `;

  function create() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false, antialias: false });
    if (!gl) return null;
    const program = gl.createProgram();
    for (const [type, source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      gl.attachShader(program,shader);
      gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const uniforms = Object.fromEntries(['paths','searchInk','logicalSize','rasterSize','centre','searchCentre','searchHalf','unit','progress','ambient','transition','selected']
      .map(name => [name,gl.getUniformLocation(program,name)]));
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.R32F,RAYS,STEPS,0,gl.RED,gl.FLOAT,table());
    gl.uniform1i(uniforms.paths,0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.uniform1i(uniforms.searchInk,1);
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      window.dispatchEvent(new Event('morphopticschange'));
    });
    canvas.addEventListener('webglcontextrestored', () => {
      gpu = undefined;
      window.dispatchEvent(new Event('morphopticschange'));
    });
    return { canvas, gl, uniforms, ink: null };
  }

  function inkFor(s) {
    const image = document.createElement('canvas');
    image.width = Math.ceil(s.width*2);
    image.height = Math.ceil(s.height*2);
    const ctx = image.getContext('2d');
    ctx.scale(image.width/s.width,image.height/s.height);
    ctx.textBaseline = 'middle';
    ctx.font = s.font;
    ctx.fillStyle = s.color;
    ctx.fillText(s.text,s.input-s.left,s.height/2+1);
    const icon = s.icon-s.left;
    ctx.strokeStyle = '#716b61';
    ctx.lineWidth = 1.45;
    ctx.beginPath();
    ctx.arc(icon+8.75,s.height/2-1.25,5.35,0,PI*2);
    ctx.moveTo(icon+13.3,s.height/2+3.3);
    ctx.lineTo(icon+16.7,s.height/2+6.7);
    ctx.stroke();
    ctx.translate(s.submit.left-s.left,s.submit.top-s.top);
    ctx.scale(s.submit.width/24,s.submit.height/24);
    ctx.strokeStyle = '#292827';
    ctx.lineWidth = 1.65;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(new Path2D('M4 12h15m-7-7 7 7-7 7'));
    return image;
  }

  function available() {
    if (gpu === undefined) {
      try { gpu = create(); }
      catch (error) {
        console.warn('Black-hole optics unavailable',error.message);
        gpu = null;
      }
    }
    return Boolean(gpu && !gpu.gl.isContextLost());
  }

  function paint(ctx,width,height,g,progress,selection,source,t=1,ambient=0) {
    if (!available()) return false;
    const {canvas,gl,uniforms:u} = gpu;
    const ratio = Math.min(ctx.getTransform().a,Math.sqrt((source ? 780000 : 950000)/(width*height)));
    const w = Math.max(1,Math.round(width*ratio)), h = Math.max(1,Math.round(height*ratio));
    if(canvas.width!==w || canvas.height!==h) {
      canvas.width=w;
      canvas.height=h;
    }
    if(source && gpu.ink!==source) {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,inkFor(source));
      gpu.ink=source;
    }
    if (!source && gpu.ink) {
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
      gpu.ink=null;
    }
    gl.viewport(0,0,w,h);
    gl.uniform2f(u.logicalSize,width,height);
    gl.uniform2f(u.rasterSize,w,h);
    gl.uniform2f(u.centre,g.x,g.y);
    gl.uniform2f(u.searchCentre,source ? source.left+source.width/2 : g.x,source ? source.top+source.height/2 : g.y);
    gl.uniform2f(u.searchHalf,source ? source.width/2 : 1,source ? source.height/2 : 1);
    gl.uniform1f(u.unit,g.unit);
    gl.uniform1f(u.progress,progress);
    gl.uniform1f(u.ambient,ambient);
    gl.uniform1f(u.transition,t);
    gl.uniform1i(u.selected,['','shadow','disk','lens','beam','ring'].indexOf(selection));
    gl.drawArrays(gl.TRIANGLES,0,3);
    ctx.drawImage(canvas,0,0,width,height);
    return true;
  }

  return {geometry,hit,paint,available};
})();
