'use strict';

window.MorphBlackHole = (() => {
  const TAU = Math.PI * 2;
  const SOLAR_RADIUS_KM = 2 * 6.67430e-11 * 1.98847e30 / 299792458 ** 2 / 1000;

  function seeded(seed) {
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  const random = seeded(383);
  const stars = Array.from({ length: 650 }, () => ({
    x: random(), y: random(), size: random() ** 4, tint: random(), depth: random()
  }));
  const dust = Array.from({ length: 1650 }, () => ({
    angle: random() * TAU, orbit: 1.16 + random() ** 1.45 * 2.85,
    glow: 0.16 + random() * 0.75, size: random(), height: (random() - 0.5) * 0.19
  }));

  function line(ctx, x, y, endX, endY) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }

  function render(ctx, w, h, { time = 0, progress = 0, mass = 18, distance = 8, poster = false, photons = [] } = {}) {
    const x = w * (poster ? 0.53 : 0.5);
    const y = h * (poster ? 0.47 : 0.51);
    const short = Math.min(w, h);
    const radius = short * (poster ? 0.157 : 0.105 + progress * 0.052 + (mass - 5) * 0.00095 + (20 - distance) * 0.001);
    const sky = ctx.createRadialGradient(x, y, 0, x, y, Math.max(w, h) * 0.68);
    sky.addColorStop(0, poster ? '#492722' : '#272022');
    sky.addColorStop(0.5, poster ? '#1c151b' : '#100e18');
    sky.addColorStop(1, '#05060a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    for (const star of stars) {
      const dx = star.x * w - x;
      const dy = star.y * h - y;
      const length = Math.hypot(dx, dy) || 1;
      const lens = radius ** 2 * (0.31 + progress * 0.44) / (length ** 2 + radius ** 2 * 0.3);
      const px = x + dx * (1 + lens);
      const py = y + dy * (1 + lens);
      const alpha = 0.11 + star.depth * 0.45;
      ctx.fillStyle = star.tint > 0.8 ? 'rgba(157,203,239,' + alpha + ')' : 'rgba(255,231,208,' + alpha + ')';
      ctx.fillRect(px, py, 0.5 + star.size * 1.6, 0.5 + star.size * 1.6);
      if (lens > 0.09 && star.size > 0.55) {
        ctx.strokeStyle = 'rgba(243,212,192,0.25)';
        line(ctx, px - dy * lens * 0.1, py + dx * lens * 0.1, px + dy * lens * 0.1, py - dx * lens * 0.1);
      }
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.22);
    const jet = ctx.createLinearGradient(0, -h * 0.47, 0, h * 0.47);
    jet.addColorStop(0, '#38bdf800');
    jet.addColorStop(0.5, poster ? '#c1aec33a' : '#38bdf861');
    jet.addColorStop(1, '#38bdf800');
    ctx.fillStyle = jet;
    const jetLength = h * 0.47;
    for (const direction of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-radius * 0.15, 0);
      ctx.quadraticCurveTo(-radius * 0.03, direction * jetLength * 0.55, -radius * 0.46, direction * jetLength);
      ctx.lineTo(radius * 0.46, direction * jetLength);
      ctx.quadraticCurveTo(radius * 0.03, direction * jetLength * 0.55, radius * 0.15, 0);
      ctx.fill();
    }

    function disk(front) {
      ctx.globalCompositeOperation = 'screen';
      for (const grain of dust) {
        const phase = grain.angle + time * 0.63 / grain.orbit ** 1.5;
        const depth = Math.sin(phase);
        if ((depth > 0) !== front) continue;
        const px = Math.cos(phase) * grain.orbit * radius;
        const py = depth * grain.orbit * radius * 0.31 + grain.height * radius;
        const beam = 0.39 + 0.61 * (1 - Math.cos(phase)) / 2;
        const alpha = grain.glow * beam * (1.16 - grain.orbit * 0.17);
        const red = 244;
        const green = Math.round(79 + beam * 125);
        const blue = Math.round(24 + beam * 98);
        ctx.strokeStyle = 'rgba(' + red + ',' + green + ',' + blue + ',' + alpha + ')';
        ctx.lineWidth = 0.45 + grain.size * 1.35;
        const trail = 0.028 + grain.size * 0.1;
        line(ctx, px, py, Math.cos(phase + trail) * grain.orbit * radius,
          Math.sin(phase + trail) * grain.orbit * radius * 0.31 + grain.height * radius);
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    const halo = ctx.createRadialGradient(0, 0, radius * 0.73, 0, 0, radius * 2.7);
    halo.addColorStop(0, '#ffb45900');
    halo.addColorStop(0.17, '#f5a65848');
    halo.addColorStop(0.41, '#e8772415');
    halo.addColorStop(1, '#ec783000');
    ctx.fillStyle = halo;
    ctx.fillRect(-radius * 3, -radius * 3, radius * 6, radius * 6);

    disk(false);
    for (let index = 8; index >= 0; index--) {
      ctx.strokeStyle = 'rgba(255,144,61,' + (0.046 + (8 - index) * 0.017) + ')';
      ctx.lineWidth = 1.35 + index * 0.65;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * (1.025 + index * 0.017), radius * (0.98 + index * 0.017), 0, 0, TAU);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, radius, radius * 0.96, 0, 0, TAU);
    ctx.fillStyle = '#030306';
    ctx.fill();
    ctx.strokeStyle = '#ffca8a';
    ctx.lineWidth = Math.max(1, radius * 0.019);
    ctx.stroke();
    disk(true);
    ctx.restore();

    if (poster && w > 250) {
      ctx.strokeStyle = '#e9c8a15f';
      ctx.lineWidth = 0.7;
      ctx.setLineDash([2, 5]);
      line(ctx, x, 17, x, y - radius * 1.33);
      line(ctx, 15, y, x - radius * 1.5, y);
      ctx.setLineDash([]);
      ctx.fillStyle = '#e2c2aa';
      ctx.font = '10px Consolas, monospace';
      if (w > 450 && h > 250) {
        ctx.fillText('PHOTON RING', w * 0.67, h * 0.23);
        line(ctx, w * 0.66, h * 0.24, x + radius * 0.58, y - radius * 0.77);
      }
    }

    for (const photon of photons) {
      ctx.strokeStyle = photon.capture ? '#fbbf24c9' : '#7edaffce';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      photon.trail.forEach(([px, py], index) => {
        if (index === 0) ctx.moveTo(x + px * radius, y + py * radius);
        else ctx.lineTo(x + px * radius, y + py * radius);
      });
      ctx.stroke();
      ctx.fillStyle = '#fff3d6';
      ctx.beginPath();
      ctx.arc(x + photon.x * radius, y + photon.y * radius, 2.6, 0, TAU);
      ctx.fill();
    }
    return { x, y, radius };
  }

  function mount(ui) {
    const mass = ui.range('Black hole mass', 5, 50, 0.1, 18, value => value.toFixed(1) + ' M☉');
    const distance = ui.range('Observer distance', 1.5, 20, 0.1, 8, value => value.toFixed(1) + ' Rₛ');
    ui.row(mass.element, distance.element);
    const launch = ui.button('Launch photon', () => emit(geometry.x - geometry.radius * 2.4, geometry.y + geometry.radius * 1.5));
    const radius = ui.readout('Schwarzschild radius');
    const escape = ui.readout('Escape velocity');
    const earth = ui.readout('Earth clock · 1.00×');
    const observer = ui.readout('Observer clock');
    ui.readouts(radius, escape, earth, observer);
    ui.row(launch);
    const photons = [];
    let geometry = { x: 1, y: 1, radius: 1 };
    let currentMass = mass.value;
    let currentDistance = distance.value;
    let earthTime = 0;
    let observerTime = 0;
    let elapsed = 0;
    let lastAudio = -1;

    function emit(px, py) {
      let x = (px - geometry.x) / geometry.radius;
      let y = (py - geometry.y) / geometry.radius;
      const length = Math.hypot(x, y);
      if (length < 1.12) {
        const angle = length ? Math.atan2(y, x) : 0;
        x = 1.13 * Math.cos(angle);
        y = 1.13 * Math.sin(angle);
      }
      const capture = length < 2.15;
      photons.push({ x, y, angle: Math.atan2(y, x), orbit: Math.hypot(x, y), capture, age: 0, trail: [[x, y]] });
      if (photons.length > 14) photons.shift();
      MorphAudio.playSelect();
    }

    ui.on(ui.canvas, 'click', event => {
      const { x, y } = ui.point(event);
      emit(x, y);
    });

    return {
      frame(dt, progress) {
        currentMass = ui.ease(currentMass, mass.value, dt);
        currentDistance = ui.ease(currentDistance, distance.value, dt);
        const dilation = Math.sqrt(1 - 1 / currentDistance);
        earthTime += dt;
        observerTime += dt * dilation;
        elapsed += dt;
        radius.set((SOLAR_RADIUS_KM * currentMass).toFixed(1) + ' km');
        escape.set((100 / Math.sqrt(currentDistance)).toFixed(1) + '% c');
        earth.set(earthTime.toFixed(1) + ' s');
        observer.set(observerTime.toFixed(1) + ' s · ' + dilation.toFixed(2) + '×');
        for (let index = photons.length - 1; index >= 0; index--) {
          const photon = photons[index];
          photon.age += dt;
          photon.orbit += dt * (photon.capture ? -0.52 : 0.23 + photon.age * 0.17);
          if (photon.orbit < 0.98 || photon.age > 4.8) {
            photons.splice(index, 1);
            continue;
          }
          photon.angle += dt * 5.2 / photon.orbit;
          photon.x = Math.cos(photon.angle) * photon.orbit;
          photon.y = Math.sin(photon.angle) * photon.orbit;
          photon.trail.push([photon.x, photon.y]);
          if (photon.trail.length > 28) photon.trail.shift();
        }
        if (elapsed - lastAudio >= 0.1) {
          MorphAudio.playBlackHoleTone((progress + (20 - currentDistance) / 18.5) / 2);
          lastAudio = elapsed;
        }
        const { ctx, width, height } = ui.size();
        geometry = render(ctx, width, height, {
          time: ui.reduced() ? 0 : elapsed, progress, mass: currentMass, distance: currentDistance, photons
        });
      },
      dispose: MorphAudio.stopBlackHole
    };
  }

  return { render, mount };
})();
