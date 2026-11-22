'use strict';

window.MorphDna = (() => {
  const SEQUENCE = 'ATGCCATGCTATCGGAAT';
  const COMPLEMENT = { A: 'T', T: 'A', C: 'G', G: 'C' };
  const NAME = { A: 'Adenine', T: 'Thymine', C: 'Cytosine', G: 'Guanine' };
  const COLOR = { A: '#e05a47', T: '#3b82f6', C: '#10b981', G: '#f59e0b' };
  const clamp = value => Math.max(0, Math.min(1, value));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = value => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  };

  function pairLabel(index) {
    const a = SEQUENCE[index];
    const b = COMPLEMENT[a];
    return NAME[a] + ' (' + a + ') · ' + NAME[b] + ' (' + b + ') · ' + (a === 'A' || a === 'T' ? '2' : '3') + ' hydrogen bonds';
  }

  function render(ctx, w, h, { progress = 0, time = 0, selected = -1, thumbnail = false } = {}) {
    ctx.fillStyle = '#e7f0ea';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#507b702c';
    for (let x = 11; x < w; x += 17) {
      for (let y = 11; y < h; y += 17) ctx.fillRect(x, y, 1, 1);
    }
    const mid = h * 0.5;
    const padding = Math.max(21, w * 0.087);
    const span = w - padding * 2;
    const size = Math.min(h * 0.19, w * 0.115);
    const opening = clamp((progress - 0.25) / 0.30);
    const synthesis = clamp((progress - 0.55) / 0.30);
    const finish = smooth((progress - 0.85) / 0.15);
    const rotation = time * 0.74 * (1 - smooth(opening) * 0.84);
    const hit = [];
    const pairs = Array.from(SEQUENCE, (base, index) => {
      const portion = index / (SEQUENCE.length - 1);
      const separated = smooth((opening - portion * 0.91) / 0.09);
      const built = smooth((synthesis - portion * 0.91) / 0.09);
      const angle = portion * Math.PI * 5.4 + rotation;
      const wave = Math.sin(angle);
      const depth = Math.cos(angle);
      const separation = separated * h * mix(0.23, 0.275, finish);
      const amp = size * mix(1, mix(0.3, 0.56, finish), separated);
      const x = padding + portion * span;
      const topY = mid - separation + wave * amp;
      const bottomY = mid + separation - wave * amp;
      return {
        index, base, complement: COMPLEMENT[base], separated, built,
        a: { x: x + depth * 5, y: topY, z: depth },
        b: { x: x - depth * 5, y: bottomY, z: -depth },
        newA: { x: x - depth * 5, y: mid - separation - wave * amp, z: -depth },
        newB: { x: x + depth * 5, y: mid + separation + wave * amp, z: depth }
      };
    });

    function backbone(key, color, isNew = false) {
      ctx.strokeStyle = color;
      ctx.lineCap = 'round';
      for (let index = 1; index < pairs.length; index++) {
        const previous = pairs[index - 1];
        const current = pairs[index];
        if (isNew && !current.built) continue;
        const a = previous[key];
        const b = current[key];
        ctx.globalAlpha = (isNew ? current.built : 1) * (0.49 + 0.51 * ((a.z + b.z + 2) / 4));
        ctx.lineWidth = 2 + (a.z + b.z + 2) * 0.75;
        ctx.beginPath();
        const before = pairs[Math.max(0, index - 2)][key];
        const after = pairs[Math.min(pairs.length - 1, index + 1)][key];
        ctx.moveTo(a.x, a.y);
        ctx.bezierCurveTo(a.x + (b.x - before.x) / 6, a.y + (b.y - before.y) / 6,
          b.x - (after.x - a.x) / 6, b.y - (after.y - a.y) / 6, b.x, b.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    function dots(a, b, count, alpha, emphasized) {
      if (alpha <= 0.01) return;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = emphasized ? '#15474e' : '#68867c';
      ctx.lineWidth = emphasized ? 2.5 : 1;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.fillStyle = '#f8fff9';
      for (let index = 1; index <= count; index++) {
        const t = 0.28 + index * 0.44 / (count + 1);
        ctx.beginPath();
        ctx.arc(mix(a.x, b.x, t), mix(a.y, b.y, t), emphasized ? 2 : 1.35, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function nucleotide(point, base, alpha, emphasized) {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = COLOR[base];
      ctx.strokeStyle = '#173b40';
      ctx.lineWidth = emphasized ? 1.8 : 0.6;
      const radius = (emphasized ? 6.5 : 2.8) + (point.z + 1) * 1.2;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (emphasized) {
        ctx.fillStyle = '#102b31';
        ctx.font = 'bold 10px Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(base, point.x, point.y);
      }
      ctx.globalAlpha = 1;
    }

    backbone('a', '#124d58');
    backbone('b', '#124d58');
    backbone('newA', '#498d7f', true);
    backbone('newB', '#498d7f', true);
    for (const pair of [...pairs].sort((a, b) => Math.abs(a.a.z) - Math.abs(b.a.z))) {
      const { a, b, newA, newB, base, complement, built, separated, index } = pair;
      const count = base === 'A' || base === 'T' ? 2 : 3;
      const emphasized = index === selected;
      dots(a, b, count, 1 - separated, emphasized);
      dots(a, newA, count, built, emphasized);
      dots(b, newB, count, built, emphasized);
      nucleotide(a, base, 1, emphasized);
      nucleotide(b, complement, 1, emphasized);
      if (built) {
        nucleotide(newA, complement, built, emphasized);
        nucleotide(newB, base, built, emphasized);
      }
      if (progress > 0.55 && progress < 0.85 && !built && index % 2 === 0) {
        const drift = Math.sin(index * 2.1 + time * 1.2);
        nucleotide({ x: newA.x, y: h * 0.11 + drift * 5, z: 0 }, complement, 0.55, false);
        nucleotide({ x: newB.x, y: h * 0.89 - drift * 5, z: 0 }, base, 0.55, false);
      }
      if (progress > 0.55 && built > 0 && built < 1) {
        nucleotide({ x: newA.x, y: mix(h * 0.11, newA.y, built), z: 0 }, complement, 0.92, false);
        nucleotide({ x: newB.x, y: mix(h * 0.89, newB.y, built), z: 0 }, base, 0.92, false);
      }
      hit[index] = { a, b, newA, newB, built, separated };
    }
    if (!thumbnail && progress > 0.25 && progress < 0.55) {
      const x = padding + span * opening;
      ctx.fillStyle = '#85c7af';
      ctx.strokeStyle = '#174d55';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 13, mid);
      ctx.lineTo(x - 9, mid - 12);
      ctx.lineTo(x - 9, mid + 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#16464d';
      ctx.font = '12px Consolas, monospace';
      ctx.textAlign = x > w - 85 ? 'right' : 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('HELICASE', x, mid - 15);
    }
    if (!thumbnail && progress > 0.55 && progress < 0.85) {
      const pair = pairs[Math.round(synthesis * (pairs.length - 1))];
      ctx.strokeStyle = '#174d55';
      ctx.lineWidth = 1.6;
      for (const point of [pair.newA, pair.newB]) {
        ctx.beginPath();
        ctx.ellipse(point.x, point.y, 11, 8, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    return hit;
  }

  function segmentDistance(x, y, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const fraction = clamp(((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1));
    return Math.hypot(x - a.x - dx * fraction, y - a.y - dy * fraction);
  }

  function mount(ui) {
    let target = 0;
    let progress = 0;
    let playing = false;
    let time = 0;
    let selected = -1;
    let hit = [];
    let previousBond = 0;
    let fromScroll = true;
    let scrub;
    const stages = ['Intact double helix', 'Helicase unzips', 'Polymerase adds bases', 'Two identical helices'];

    function updatePlay(value) {
      playing = value;
      play.textContent = playing ? 'Pause' : 'Play';
      play.setAttribute('aria-pressed', String(playing));
    }

    const play = ui.button('Play', () => {
      if (playing) {
        updatePlay(false);
        return;
      }
      if (target >= 1) target = progress = 0;
      fromScroll = false;
      updatePlay(true);
    });
    play.setAttribute('aria-pressed', 'false');
    scrub = ui.range('Replication scrub', 0, 100, 1, 0, value => Math.round(value) + '%', value => {
      fromScroll = false;
      updatePlay(false);
      target = value / 100;
    });
    const inspect = ui.select('Inspect a base pair', [
      ['-1', 'Inspect a base pair'],
      ...Array.from(SEQUENCE, (base, index) => [String(index), (index + 1) + ' · ' + base + '–' + COMPLEMENT[base]])
    ], value => {
      selected = Number(value);
      ui.tip(selected >= 0 ? pairLabel(selected) : '');
    });
    const current = ui.readout('Replication stage');
    ui.row(scrub.element);
    ui.compact(play, inspect);
    ui.readouts(current);

    function inspectAt(event) {
      if (!hit.length) return;
      const { x, y } = ui.point(event);
      let closest = 15;
      let match = -1;
      hit.forEach((pair, index) => {
        const proximity = pair.separated < 0.5
          ? segmentDistance(x, y, pair.a, pair.b)
          : Math.min(segmentDistance(x, y, pair.a, pair.built ? pair.newA : pair.a),
            segmentDistance(x, y, pair.b, pair.built ? pair.newB : pair.b));
        if (proximity < closest) {
          closest = proximity;
          match = index;
        }
      });
      selected = match;
      ui.tip(match >= 0 ? pairLabel(match) : '');
    }
    ui.on(ui.canvas, 'pointermove', inspectAt);
    ui.on(ui.canvas, 'click', inspectAt);
    ui.on(ui.canvas, 'pointerleave', () => {
      selected = Number(inspect.value);
      ui.tip(selected >= 0 ? pairLabel(selected) : '');
    });

    return {
      onScroll() {
        fromScroll = true;
        updatePlay(false);
      },
      frame(dt, scroll) {
        if (fromScroll) target = scroll;
        if (playing) {
          target = clamp(target + dt / 13);
          if (target >= 1) updatePlay(false);
        }
        progress = ui.ease(progress, target, dt);
        if (Math.abs(progress - target) < 0.00015) progress = target;
        if (document.activeElement !== scrub.input || fromScroll || playing) scrub.set(target * 100);
        const stage = progress < 0.25 ? 0 : progress < 0.55 ? 1 : progress < 0.85 ? 2 : 3;
        current.set(stages[stage]);
        ui.setStage(stage);
        const bond = Math.floor(clamp((progress - 0.55) / 0.30) * SEQUENCE.length + 1e-8);
        if (bond > previousBond) MorphAudio.playDnaBond();
        previousBond = bond;
        if (!ui.reduced()) time += dt;
        const { ctx, width, height } = ui.size();
        hit = render(ctx, width, height, { progress, time, selected });
      }
    };
  }

  return { render, mount };
})();
