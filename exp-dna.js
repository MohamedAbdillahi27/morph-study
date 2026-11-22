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
    const helicase = { x: padding + span * opening, y: mid, visible: progress > 0.25 && progress < 0.55 };
    if (!thumbnail && helicase.visible) {
      const { x } = helicase;
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
    const activePair = pairs[Math.round(synthesis * (pairs.length - 1))];
    const polymerase = { upper: activePair.newA, lower: activePair.newB, visible: progress > 0.55 && progress < 0.85 };
    if (!thumbnail && polymerase.visible) {
      ctx.strokeStyle = '#174d55';
      ctx.lineWidth = 1.6;
      for (const point of [polymerase.upper, polymerase.lower]) {
        ctx.beginPath();
        ctx.ellipse(point.x, point.y, 11, 8, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    return { hit, helicase, polymerase };
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
    let resume = false;
    let previousBond = 0;
    let fromScroll = true;
    let scrub;
    const stages = ['Intact double helix', 'Helicase unzips', 'Polymerase adds bases', 'Two identical helices'];

    function updatePlay(value) {
      playing = value;
      play.textContent = playing ? 'Pause' : resume ? 'Resume playthrough' :
        target >= 1 ? 'Replay replication' : 'Watch Replication Playthrough';
      play.setAttribute('aria-pressed', String(playing));
    }

    const play = ui.button('Watch Replication Playthrough', () => {
      if (playing) {
        resume = true;
        updatePlay(false);
        return;
      }
      ui.reset();
      if (!resume) target = progress = 0;
      resume = false;
      fromScroll = false;
      updatePlay(true);
    });
    play.setAttribute('aria-pressed', 'false');
    scrub = ui.range('Replication scrub', 0, 100, 1, 0, value => Math.round(value) + '%', value => {
      fromScroll = false;
      resume = false;
      target = value / 100;
      updatePlay(false);
    });
    const current = ui.readout('Replication stage');
    ui.row(scrub.element);
    ui.primary(play);
    ui.readouts(current);

    function inspectEnzyme(at, min, max) {
      const alreadyVisible = progress > min && progress < max;
      if (alreadyVisible && !playing) return;
      fromScroll = false;
      resume = false;
      target = alreadyVisible ? progress : at;
      updatePlay(false);
    }

    function anatomy({ hit, helicase, polymerase }) {
      const middle = hit[Math.floor(hit.length / 2)];
      const backbone = {
        id: 'backbone', title: 'Sugar–phosphate backbone', x: middle.a.x, y: middle.a.y, zoom: 2.6, focusAt: true,
        description: 'Alternating sugars and phosphates form the outer rail of each strand. Strong covalent bonds keep each rail intact when helicase separates the weaker base-pair connections.',
        hit(px, py) {
          let closest = Infinity;
          for (let i = 1; i < hit.length; i++) {
            const a = hit[i - 1];
            const b = hit[i];
            const distance = Math.min(segmentDistance(px, py, a.a, b.a), segmentDistance(px, py, a.b, b.b),
              b.built > 0.5 ? segmentDistance(px, py, a.newA, b.newA) : Infinity,
              b.built > 0.5 ? segmentDistance(px, py, a.newB, b.newB) : Infinity);
            if (distance < closest) closest = distance;
          }
          return closest <= 9 ? closest / 9 + 0.38 : Infinity;
        }
      };
      ui.parts([
        backbone,
        {
          id: 'helicase', title: 'Helicase enzyme', ...helicase, zoom: 2.35,
          description: 'Helicase uses energy from ATP to separate the two template strands. It disrupts the hydrogen bonds between bases as it moves forward, leaving exposed bases for the copying machinery.',
          hit: helicase.visible ? ui.circle(helicase.x, helicase.y, 16) : null,
          onPick() { inspectEnzyme(0.4, 0.28, 0.52); }
        },
        {
          id: 'polymerase', title: 'DNA polymerase', x: polymerase.upper.x, y: polymerase.upper.y, zoom: 2.55, focusAt: true,
          description: 'DNA polymerase adds a complementary nucleotide to the growing strand’s 3′ end. Each correct pairing provides the next letter of the DNA copy.',
          hit(px, py) {
            const distance = Math.min(Math.hypot(px - polymerase.upper.x, py - polymerase.upper.y),
              Math.hypot(px - polymerase.lower.x, py - polymerase.lower.y));
            return polymerase.visible && distance <= 11 ? distance / 13 : Infinity;
          },
          onPick() { inspectEnzyme(0.7, 0.58, 0.82); }
        },
        ...hit.map((pair, index) => {
          const a = pair.a;
          const b = pair.separated < 0.5 ? pair.b : pair.built > 0.15 ? pair.newA : pair.a;
          const base = SEQUENCE[index];
          const complement = COMPLEMENT[base];
          const count = base === 'A' || base === 'T' ? 2 : 3;
          return {
            id: 'pair-' + index, title: base + '–' + complement + ' base pair', option: 'Pair ' + (index + 1) + ' · ' + base + '–' + complement,
            tip: pairLabel(index), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, zoom: 3.1, focusAt: true,
            description: NAME[base] + ' pairs with ' + NAME[complement].toLowerCase() +
              ' through ' + count + ' hydrogen bonds. This preference lets each exposed base guide which nucleotide is added to the new strand.',
            hit(px, py) {
              if (helicase.visible && Math.hypot(px - helicase.x, py - helicase.y) < 13) return Infinity;
              const other = pair.separated >= 0.5 ? segmentDistance(px, py, pair.b, pair.built > 0.15 ? pair.newB : pair.b) : Infinity;
              const distance = Math.min(segmentDistance(px, py, a, b), other);
              return distance <= 8 ? distance / 8 : Infinity;
            }
          };
        })
      ]);
    }

    return {
      onScroll() {
        if (playing) return;
        fromScroll = true;
        resume = false;
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
        ui.draw((ctx, width, height) => {
          const selected = ui.selected().startsWith('pair-') ? Number(ui.selected().slice(5)) : -1;
          anatomy(render(ctx, width, height, { progress, time, selected }));
        });
      }
    };
  }

  return { render, mount };
})();
