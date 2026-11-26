'use strict';

window.MorphDna = (() => {
  const BASES = 'ATGCCATGCTATCGGAAT';
  const other = { A: 'T', T: 'A', C: 'G', G: 'C' };
  const names = { A: 'Adenine', T: 'Thymine', C: 'Cytosine', G: 'Guanine' };
  const colors = { A: '#e05a47', T: '#3b82f6', C: '#10b981', G: '#f59e0b', U: '#ca9ddd' };
  const parent = '#124d58';
  const daughter = '#498d7f';
  const rna = '#946b9d';
  const size = BASES.length - 1;
  const ends = [3, 7, 11, 14, size];
  const clamp = n => Math.max(0, Math.min(1, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = x => { const t = clamp(x); return t * t * (3 - 2 * t); };
  const between = (x, from, to) => clamp((x - from) / (to - from));
  const pointBetween = (a, b, t) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) });

  function geometry(width, height, progress, orbit = 0) {
    const p = clamp(progress);
    // Turn the original projection a quarter turn so the fork travels down.
    const mid = width * 0.5;
    const padding = Math.max(21, height * 0.087);
    const span = height - padding * 2;
    const radius = Math.min(width * 0.19, height * 0.115);
    const opening = between(p, 0.105, 0.805);
    const openingStep = 0.09;
    const forkPosition = clamp((opening - openingStep / 2) / (1 - openingStep)) * size;
    const fork = size * lerp(-0.12, 1.12, opening);
    const finish = smooth(between(p, 0.85, 1));
    // Let the intact helix react to the first scroll before the fork opens.
    const initialTurn = p < 0.20 ? 0.52 * Math.sin(Math.PI * p / 0.20) : 0;
    const axisY = index => padding + (index / size) * span;
    const primerStart = end => 0.24 + 0.53 * end / size;
    const fragments = ends.map((end, i) => {
      const start = i === 0 ? 0 : ends[i - 1] + 1;
      const primedAt = primerStart(end);
      const extension = between(p, primedAt + 0.039, primedAt + 0.102);
      const tip = lerp(end, start - 0.41, extension);
      // The following fragment exposes the upstream 3′ end needed for nick translation.
      const nextEnd = ends[i + 1];
      const matureAt = nextEnd === undefined ? 0.923 : primerStart(nextEnd) + 0.103;
      const replacedAt = matureAt + 0.028;
      return { start, end, primedAt, tip, extension, matureAt, replacedAt, ligatesAt: replacedAt + 0.035 };
    });
    const leadingTip = Math.min(size + 0.5, fork - 0.85) * smooth(between(p, 0.245, 0.31));
    const pairs = Array.from(BASES, (base, i) => {
      const portion = i / size;
      const opened = smooth((opening - portion * (1 - openingStep)) / openingStep);
      const angle = portion * Math.PI * 5.4 + orbit + initialTurn;
      const wave = Math.sin(angle);
      const depth = Math.cos(angle);
      const separation = opened * width * lerp(0.23, 0.275, finish);
      const amp = radius * (1 - 0.7 * opened * (1 - finish));
      const y = axisY(i);
      const fragment = fragments.find(f => i <= f.end);
      const lagPrimer = i >= fragment.end - 1;
      const lagAlpha = i === fragment.end ? smooth(between(p, fragment.primedAt, fragment.primedAt + 0.018))
        : i === fragment.end - 1 ? smooth(between(p, fragment.primedAt + 0.015, fragment.primedAt + 0.036))
        : smooth((i - fragment.tip + 0.4) / 0.8);
      const leadingPrimer = i < 2;
      const across = wave * amp;
      const top = { x: mid + separation - across, y: y + depth * 5, z: depth };
      const bottom = { x: mid - separation + across, y: y - depth * 5, z: -depth };
      return {
        i, base, opened, fragment, top, bottom,
        lead: { x: mid + separation + across, y: y - depth * 5, z: -depth },
        lag: { x: mid - separation - across, y: y + depth * 5, z: depth },
        leadAlpha: i === 0 ? smooth(between(p, 0.205, 0.226)) : i === 1
          ? smooth(between(p, 0.228, 0.245)) : smooth((leadingTip - i + 0.44) / 0.88),
        lagAlpha,
        leadRNA: leadingPrimer && p < 0.974,
        lagRNA: lagPrimer && p < fragment.replacedAt
      };
    });
    return { pairs, fragments, width, height, p, fork, leadingTip, axisY, forkPosition, mid };
  }

  function numberOfBonds(base) { return base === 'A' || base === 'T' ? 2 : 3; }

  function segmentDistance(x, y, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = clamp(((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1));
    return Math.hypot(x - a.x - t * dx, y - a.y - t * dy);
  }

  function structures(g) {
    const { pairs, p, forkPosition, leadingTip, fragments } = g;
    const at = (index, key) => {
      const i = Math.max(0, Math.min(size, index));
      const j = Math.floor(i);
      return pointBetween(pairs[j][key], pairs[Math.min(size, j + 1)][key], i - j);
    };
    const forkPoint = { x: g.mid, y: g.axisY(forkPosition) };
    const ahead = { x: g.mid + 17, y: g.axisY(Math.min(size + 0.6, forkPosition + 1.7)) };
    const lead = at(leadingTip, 'lead');
    const active = fragments.findLast(f => p >= f.primedAt && f.extension < 1);
    const last = fragments.findLast(f => p >= f.primedAt) || fragments[0];
    const resolving = fragments.find(f => p >= f.matureAt && p < f.replacedAt);
    const sealing = fragments.find(f => p >= f.replacedAt && p < f.ligatesAt);
    const replacingSite = at((resolving || last).end, 'lag');
    const ligationSite = at((sealing || last).end, 'lag');
    const enzyme = (id, x, y, alpha, color, short) => ({ id, x, y, alpha: clamp(alpha), color, short });
    const helicaseAlpha = smooth(between(p, 0.105, 0.175)) * (1 - smooth(between(p, 0.805, 0.86)));
    const forkAlpha = smooth(between(p, 0.13, 0.24)) * (1 - smooth(between(p, 0.84, 0.95)));
    const synthAlpha = smooth(between(p, 0.30, 0.39)) * (1 - smooth(between(p, 0.93, 0.98)));
    const firstPrimer = smooth(between(p, 0.198, 0.215)) * (1 - smooth(between(p, 0.242, 0.266)));
    const primerAlpha = active ? smooth(between(p, active.primedAt, active.primedAt + 0.025)) *
      (1 - smooth(between(active.extension, 0.1, 0.5))) : firstPrimer;
    const primerSite = active ? at(active.end, 'lag') : at(0.75, 'lead');
    return [
      enzyme('gyrase', ahead.x, ahead.y, forkAlpha * (1 - smooth(between(p, 0.72, 0.87))), '#bca6d6', 'Gyrase'),
      enzyme('helicase', forkPoint.x, forkPoint.y, helicaseAlpha, '#85c7af', 'Helicase'),
      enzyme('ssb', at(Math.max(0, forkPosition - 2.0), 'bottom').x + 9, at(Math.max(0, forkPosition - 2.0), 'bottom').y, forkAlpha, '#a5b9c6', 'SSB'),
      enzyme('primase', primerSite.x - 11, primerSite.y + 12, primerAlpha, '#c9a6d4', 'DnaG'),
      enzyme('polymerase', lead.x + 6, lead.y, synthAlpha, '#94cdb8', 'Pol III'),
      enzyme('lag-pol', at(last.tip, 'lag').x - 6, at(last.tip, 'lag').y, active ? synthAlpha * smooth(active.extension * 5) * smooth((1 - active.extension) * 7) : 0, '#94cdb8', 'Pol III'),
      enzyme('pol-i', replacingSite.x + 9, replacingSite.y, resolving ? Math.sin(Math.PI * between(p, resolving.matureAt, resolving.replacedAt)) : 0, '#d7b4e1', 'Pol I'),
      enzyme('ligase', ligationSite.x - 8, ligationSite.y, sealing ? Math.sin(Math.PI * between(p, sealing.replacedAt, sealing.ligatesAt)) : 0, '#e5bd83', 'LigA')
    ];
  }

  function strandCurve(pairs, index, key) {
    const a = pairs[index - 1][key];
    const b = pairs[index][key];
    const before = pairs[Math.max(0, index - 2)][key];
    const after = pairs[Math.min(size, index + 1)][key];
    return [a,
      { x: a.x + (b.x - before.x) / 6, y: a.y + (b.y - before.y) / 6 },
      { x: b.x - (after.x - a.x) / 6, y: b.y - (after.y - a.y) / 6 },
      b];
  }

  function traceCurve(ctx, [, c, d, b]) {
    ctx.bezierCurveTo(c.x, c.y, d.x, d.y, b.x, b.y);
  }

  function curveDistance(x, y, [a, c, d, b]) {
    let previous = a;
    let distance = Infinity;
    for (let i = 1; i <= 8; i++) {
      const t = i / 8;
      const s = 1 - t;
      const point = {
        x: s ** 3 * a.x + 3 * s ** 2 * t * c.x + 3 * s * t ** 2 * d.x + t ** 3 * b.x,
        y: s ** 3 * a.y + 3 * s ** 2 * t * c.y + 3 * s * t ** 2 * d.y + t ** 3 * b.y
      };
      distance = Math.min(distance, segmentDistance(x, y, previous, point));
      previous = point;
    }
    return distance;
  }

  function strandAlpha(pair, key) {
    if (key === 'lead') return pair.leadAlpha * pair.opened;
    if (key === 'lag') return pair.lagAlpha * pair.opened;
    return 1;
  }

  function strandSegmentAlpha(previous, current, key, progress) {
    if (key === 'lag' && previous.fragment !== current.fragment && progress < previous.fragment.ligatesAt) return 0;
    return Math.min(strandAlpha(previous, key), strandAlpha(current, key));
  }

  function paintMolecule(ctx, g, selected = '', emphasis = '', fold = null) {
    const { pairs, p } = g;
    const amount = fold?.amount ?? 1;
    const outline = [202, 193, 177];
    const ink = color => fold ? 'rgb(' + outline.map((channel, i) =>
      Math.round(lerp(channel, parseInt(color.slice(1 + i * 2, 3 + i * 2), 16), amount))).join(' ') + ')' : color;
    const opacity = kind => emphasis && emphasis !== kind ? 0.33 : 1;

    function backbone(key, isNew = false) {
      const kind = isNew ? 'new' : 'parental';
      const chosen = selected === { top: 'backbone', bottom: 'opposite-backbone', lead: 'new-leading', lag: 'new-lagging' }[key];
      const primerKey = key === 'lead' ? 'leadRNA' : 'lagRNA';
      ctx.lineCap = 'round';
      for (let index = 1; index < pairs.length; index++) {
        const previous = pairs[index - 1];
        const current = pairs[index];
        const alpha = strandSegmentAlpha(previous, current, key, p);
        if (!alpha) continue;
        const curve = strandCurve(pairs, index, key);
        const path = fold ? fold.curve(index, key, curve) : curve;
        const [a, , , b] = path;
        const depth = a.z + b.z + 2;
        const color = !isNew ? parent : previous[primerKey] || current[primerKey] ? rna : daughter;
        ctx.strokeStyle = ink(chosen ? '#15474e' : color);
        ctx.globalAlpha = alpha * lerp(1, (chosen ? 1 : opacity(kind)) * (0.49 + 0.51 * depth / 4), amount);
        ctx.lineWidth = lerp(1, 2 + depth * 0.75 + (chosen ? 1.4 : 0), amount);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        traceCurve(ctx, path);
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
        ctx.arc(lerp(a.x, b.x, t), lerp(a.y, b.y, t), emphasized ? 2 : 1.35, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function nucleotide(point, base, alpha, emphasized) {
      if (alpha <= 0.001) return;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = colors[base];
      ctx.strokeStyle = '#173b40';
      ctx.lineWidth = emphasized ? 1.8 : 0.6;
      const radius = (emphasized ? 6.5 : 2.8) + (point.z + 1) * 1.2;
      ctx.beginPath();
      ctx.arc(point.x, point.y, lerp(0.5, radius, amount), 0, Math.PI * 2);
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

    backbone('top');
    backbone('bottom');
    backbone('lead', true);
    backbone('lag', true);
    const project = (pair, key, side) => fold ? fold.project(pair.i / size, side, pair[key]) : pair[key];
    const reveal = smooth(between(amount, 0.12, 1));
    const ordered = [...pairs].sort((a, b) => Math.abs(a.top.z) - Math.abs(b.top.z));
    for (const pair of ordered) {
      const a = project(pair, 'top', -1);
      const b = project(pair, 'bottom', 1);
      const { base, opened, leadRNA, lagRNA } = pair;
      const complement = other[base];
      const leadingBase = leadRNA && base === 'A' ? 'U' : complement;
      const laggingBase = lagRNA && base === 'T' ? 'U' : base;
      const count = numberOfBonds(base);
      const emphasized = selected === 'pair-' + pair.i;
      const parentalOpacity = emphasized ? 1 : opacity('parental');
      const newOpacity = emphasized ? 1 : opacity('new');
      const leading = strandAlpha(pair, 'lead') * newOpacity;
      const lagging = strandAlpha(pair, 'lag') * newOpacity;

      dots(a, b, count, (1 - opened) * parentalOpacity * reveal, emphasized);
      dots(a, pair.lead, count, leading, emphasized);
      dots(b, pair.lag, count, lagging, emphasized);
      nucleotide(a, base, parentalOpacity * reveal, emphasized);
      nucleotide(b, complement, parentalOpacity * reveal, emphasized);
      nucleotide(pair.lead, leadingBase, leading, emphasized);
      nucleotide(pair.lag, laggingBase, lagging, emphasized);
    }
  }

  function annotations(ctx, g, selected) {
    const { enzymes, p, width: w, axisY } = g;
    if (!selected && p > 0.32 && p < 0.94) {
      ctx.fillStyle = parent;
      ctx.font = '600 ' + (w < 390 ? 10 : 12) + 'px Geist, system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText('Lagging ↑', w * 0.225, axisY(0) - 12);
      ctx.fillText('Leading ↓', w * 0.775, axisY(0) - 12);
    }
    for (const enzyme of enzymes) {
      if (enzyme.alpha < 0.005) continue;
      const marked = selected === enzyme.id;
      const isPolymerase = enzyme.id === 'polymerase' || enzyme.id === 'lag-pol';
      const radius = isPolymerase ? 11 : 5.8;
      ctx.globalAlpha = enzyme.alpha;
      ctx.beginPath();
      if (enzyme.id === 'helicase') {
        ctx.moveTo(enzyme.x, enzyme.y + 13);
        ctx.lineTo(enzyme.x + 12, enzyme.y - 9);
        ctx.lineTo(enzyme.x - 12, enzyme.y - 9);
        ctx.closePath();
      } else {
        ctx.ellipse(enzyme.x, enzyme.y, radius, isPolymerase ? 8 : radius, 0, 0, Math.PI * 2);
      }
      ctx.fillStyle = enzyme.color;
      if (!isPolymerase || marked) ctx.fill();
      ctx.lineWidth = marked ? 2.3 : 1.5;
      ctx.strokeStyle = '#174d55';
      ctx.stroke();
      if (!selected && enzyme.alpha > 0.58) {
        ctx.fillStyle = '#16464d';
        ctx.font = (w < 390 ? 10 : 12) + 'px Consolas, monospace';
        const isHelicase = enzyme.id === 'helicase';
        ctx.textAlign = !isHelicase && enzyme.x > w - 54 ? 'right' : 'left';
        ctx.textBaseline = isHelicase ? 'middle' : 'bottom';
        ctx.fillText(enzyme.short, enzyme.x + (isHelicase ? 24 : 0), enzyme.y - (isHelicase ? 14 : 9));
      }
    }
    ctx.globalAlpha = 1;
  }

  function model(width, height, progress = 0, orbit = 0) {
    const g = geometry(width, height, progress, orbit);
    return { ...g, enzymes: structures(g) };
  }

  function render(ctx, w, h, { progress = 0, selected = '', orbit = 0, thumbnail = false, emphasis = '' } = {}) {
    const g = model(w, h, progress, orbit);
    paintMolecule(ctx, g, selected, emphasis);
    if (!thumbnail) annotations(ctx, g, selected);
    return g;
  }

  function transitionShade(t) {
    return smooth(between(t, 0.13, 0.82));
  }

  function transition(ctx, w, h, source, stage, text, t, orbit = 0) {
    ctx.clearRect(0, 0, w, h);
    const unfold = smooth(t);
    const center = source.y + source.height / 2;
    const radius = Math.max(0.5, (source.height - 1) / 2);
    const fieldWidth = source.width - 1;
    const start = { x: source.x - stage.x + 0.5, y: source.y - stage.y + 0.5 };
    ctx.save();
    ctx.translate(stage.x, stage.y);
    if (t === 1) {
      const specimen = render(ctx, stage.width, stage.height, { orbit });
      ctx.restore();
      return specimen;
    }
    const g = model(stage.width, stage.height, 0, orbit);
    // Unfold successive pairs from the top of the vertical helix down.
    const sweep = u => smooth(between(t, u * 0.16, 0.84 + u * 0.16));

    // Parameterise the upper and lower capsule contours by arc length. Corresponding
    // samples become the two backbone tracks, preserving their order through the morph.
    function capsule(u, side) {
      const arc = Math.PI * radius / 2, straight = fieldWidth - 2 * radius;
      const travel = u * (2 * arc + straight);
      let x, y, dx, dy;
      if (travel < arc) {
        const angle = travel / radius;
        dx = Math.sin(angle);
        dy = Math.cos(angle);
        x = radius * (1 - dy);
        y = radius * dx;
      } else if (travel > arc + straight) {
        const angle = (2 * arc + straight - travel) / radius;
        dx = Math.sin(angle);
        dy = -Math.cos(angle);
        x = fieldWidth - radius * (1 + dy);
        y = radius * dx;
      } else {
        x = travel - arc + radius;
        y = radius;
        dx = 1;
        dy = 0;
      }
      const length = (2 * arc + straight) / size;
      return { x: start.x + x, y: center - stage.y + y * side, z: 0, dx: dx * length, dy: dy * side * length };
    }
    function foldCurve(index, key, end) {
      const side = key === 'top' ? -1 : 1;
      const a = capsule((index - 1) / size, side);
      const b = capsule(index / size, side);
      const start = [a, { x: a.x + a.dx / 3, y: a.y + a.dy / 3, z: 0 },
        { x: b.x - b.dx / 3, y: b.y - b.dy / 3, z: 0 }, b];
      return start.map((point, i) => pointBetween(point, { z: 0, ...end[i] }, sweep((index - 1 + i / 3) / size)));
    }

    const fold = {
      amount: unfold,
      project: (u, side, end) => pointBetween(capsule(u, side), end, sweep(u)),
      curve: foldCurve
    };

    if (t < 0.42) {
      ctx.beginPath();
      for (const key of ['top', 'bottom']) {
        const forward = key === 'top';
        for (let step = 1; step <= size; step++) {
          const index = forward ? step : size - step + 1;
          const curve = foldCurve(index, key, strandCurve(g.pairs, index, key));
          if (!forward) curve.reverse();
          if (forward && step === 1) ctx.moveTo(curve[0].x, curve[0].y);
          traceCurve(ctx, curve);
        }
      }
      ctx.closePath();
      ctx.globalAlpha = 1 - smooth(between(t, 0.015, 0.42));
      ctx.fillStyle = '#efeeec';
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    paintMolecule(ctx, g, '', '', fold);

    if (t < 0.91) {
      const font = source.fontSize || 16;
      ctx.font = '400 ' + font + 'px Geist, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      let x = source.x - stage.x + (source.textOffset || 48);
      const glyphs = Array.from(text);
      const left = x;
      glyphs.forEach((glyph, index) => {
        x = left + ctx.measureText(glyphs.slice(0, index).join('')).width;
        if (x + ctx.measureText(glyph).width > source.textRight - stage.x) return;
        const pair = g.pairs[Math.round(index / Math.max(1, glyphs.length - 1) * size)];
        const side = index % 2 ? 1 : -1;
        const target = fold.project(pair.i / size, side, side === 1 ? pair.bottom : pair.top);
        const phase = smooth(between(t, 0.1 + (index % 7) * 0.016, 0.80));
        ctx.fillStyle = source.textColor;
        ctx.globalAlpha = 1 - smooth(between(t, 0.31, 0.90));
        ctx.fillText(glyph, lerp(x, target.x, phase), lerp(center - stage.y, target.y, phase));
      });

      const affordance = (box, draw) => {
        if (!box?.width) return;
        ctx.globalAlpha = 1 - smooth(between(t, 0.07, 0.32));
        ctx.save();
        ctx.translate(box.x + box.width / 2 - stage.x, box.y + box.height / 2 - stage.y);
        draw(box);
        ctx.restore();
      };
      affordance(source.icon, box => {
        const s = box.width / 24;
        ctx.beginPath();
        ctx.arc(-1.5 * s, -1.5 * s, 6.5 * s, 0, 2 * Math.PI);
        ctx.moveTo(4 * s, 4 * s);
        ctx.lineTo(8 * s, 8 * s);
        ctx.strokeStyle = '#716b61';
        ctx.lineWidth = 1.55 * s;
        ctx.stroke();
      });
      affordance(source.submit, box => {
        const s = box.width / 24;
        ctx.beginPath();
        ctx.moveTo(-8 * s, 0);
        ctx.lineTo(7 * s, 0);
        ctx.moveTo(0, -7 * s);
        ctx.lineTo(7 * s, 0);
        ctx.lineTo(0, 7 * s);
        ctx.strokeStyle = '#292827';
        ctx.lineWidth = 1.65 * s;
        ctx.stroke();
      });
    }
    ctx.restore();
    return g;
  }

  const anatomyText = {
    gyrase: ['DNA gyrase', 'This bacterial type II topoisomerase removes positive supercoils ahead of the fork. That relieves torsional strain before DnaB reaches the duplex.', 0.40],
    helicase: ['DnaB helicase', 'DnaB travels 5′ to 3′ along the lagging-strand template and separates the parental strands. The parental sugar–phosphate backbones remain intact.', 0.40],
    ssb: ['SSB proteins', 'Single-stranded DNA-binding proteins coat exposed template DNA, helping prevent reannealing and secondary structures.', 0.45],
    primase: ['DnaG primase', 'DnaG makes short RNA primers. The leading strand starts from one primer. Each lagging fragment starts from a new primer near the advancing fork.', 0.48],
    polymerase: ['DNA polymerase III · leading', 'Pol III extends a primer’s 3′ end. New DNA on the leading strand grows downward toward the fork.', 0.73],
    'lag-pol': ['DNA polymerase III · lagging', 'Pol III extends each lagging primer 5′ to 3′, away from the fork. This flat projection straightens the template loop found in the replisome.', 0.70],
    'pol-i': ['DNA polymerase I', 'Pol I extends adjacent DNA while removing the RNA primer in front of it. An all-DNA nick remains after the primer is replaced.', 0.875],
    ligase: ['DNA ligase · LigA', 'LigA seals a nick in the DNA backbone after primer replacement. It joins adjacent DNA ends without adding base pairs.', 0.894]
  };

  function mount(ui) {
    let progress = 0;
    let rotation = 0;
    let rotationTarget = 0;
    let idleAngle = 0;
    let previousBonds = 0;
    let emphasis = '';
    const scrub = ui.range('Replication progress', 0, 100, 0.1, 0, n => Math.round(n) + '%', value => ui.seek(value / 100));
    function rotate(value) { rotationTarget = Math.max(-180, Math.min(180, value)); }
    const angle = ui.range('Rotate molecule', -180, 180, 1, 0, value => Math.round(value) + '°', rotate);
    const zoom = ui.range('Zoom molecule', 100, 145, 1, 100, value => Math.round(value) + '%', value => ui.zoom(value / 100));
    const resetCamera = ui.button('Reset view', () => {
      ui.reset();
      rotate(0);
      angle.set(0);
      zoom.set(100);
      ui.zoom(1);
    });
    ui.row(scrub.element);
    ui.row(angle.element, zoom.element);
    ui.row(ui.select('Strand emphasis', [['', 'All strands'], ['parental', 'Emphasize parental strands'],
      ['new', 'Emphasize new strands']], value => { emphasis = value; }),
      ui.button('Go to first primer', () => ui.seek(0.23)));
    ui.row(resetCamera);

    function anatomy(g) {
      const { pairs, enzymes, fragments, p } = g;
      const parts = [];
      const edgeRadius = 8;
      for (const [key, id, title, description] of [
        ['top', 'backbone', 'Leading-strand template', 'This template is read 3′ to 5′ toward the moving fork. Its new partner can therefore grow continuously.'],
        ['bottom', 'opposite-backbone', 'Lagging-strand template', 'This template runs the other way. Its new partner must be assembled from fragments growing away from the fork.'],
        ['lead', 'new-leading', 'New leading strand', 'The lighter teal strand grows continuously 5′ to 3′ in the direction the fork travels.'],
        ['lag', 'new-lagging', 'New lagging strand', 'Each new segment grows 5′ to 3′ away from the fork. Ligase ultimately seals the nicks between segments.']
      ]) {
        const segments = pairs.slice(1).flatMap((b, i) =>
          strandSegmentAlpha(pairs[i], b, key, p) > 0.36 ? [strandCurve(pairs, i + 1, key)] : []);
        const anchor = segments[Math.floor(segments.length / 2)]?.[0] || pairs[0][key];
        parts.push({
          id, title, ...anchor, description, focusAt: true, zoom: 1.38, available: segments.length > 0,
          hit(x, y) {
            const distance = Math.min(...segments.map(curve => curveDistance(x, y, curve)));
            return distance <= edgeRadius ? 0.12 + distance / (edgeRadius * 1.25) : Infinity;
          }
        });
      }
      enzymes.forEach(enzyme => {
        const [title, description] = anatomyText[enzyme.id];
        const hitRadius = Math.max(11, Math.min(22, g.width / 44, g.height / 19));
        const available = enzyme.alpha > 0.24;
        parts.push({ ...enzyme, title, description, zoom: 1.42, available,
          hit: available ? ui.circle(enzyme.x, enzyme.y, hitRadius) : null
        });
      });
      const activePrimer = fragments.findLast(f => p >= f.primedAt && p < f.replacedAt);
      const visible = fragments.findLast(f => p >= f.primedAt) || fragments[0];
      const primer = activePrimer ? pairs[activePrimer.end].lag : pairs[0].lead;
      const primerAvailable = Boolean(activePrimer || (pairs[0].leadAlpha > 0.25 && pairs[0].leadRNA));
      const fragment = pairs[Math.floor((visible.start + visible.end) / 2)].lag;
      parts.push({
        id: 'primer', title: 'RNA primer', ...primer, zoom: 1.44,
        description: 'The short violet RNA segment supplies a free 3′ end. Real E. coli primers contain more bases than the two-marker shorthand shown here.',
        available: primerAvailable,
        hit: primerAvailable ? ui.circle(primer.x, primer.y, 10) : null
      }, {
        id: 'fragment', title: 'Okazaki fragment', ...fragment, zoom: 1.42,
        description: 'An RNA-primed piece of daughter DNA. Each fragment grows away from the fork and is later joined into a continuous lagging strand. Fragment lengths and timing are compressed.',
        available: p > 0.45 && p < 0.94,
        hit: p > 0.45 && p < 0.94 ? ui.circle(fragment.x, fragment.y, 10) : null
      });
      pairs.forEach(pair => {
        const { top, bottom, lead, lag, opened, leadAlpha, lagAlpha, i, base } = pair;
        const paired = opened > 0.36;
        const upperEnd = leadAlpha * opened > 0.2 ? lead : top;
        const lowerEnd = lagAlpha * opened > 0.2 ? lag : bottom;
        const anchor = pointBetween(top, paired ? upperEnd : bottom, 0.5);
        const complement = other[base];
        const count = numberOfBonds(base);
        parts.push({
          id: 'pair-' + i, title: base + '–' + complement + ' base pair',
          option: (i + 1) + ' · ' + base + '–' + complement,
          tip: names[base] + ' + ' + names[complement] + ' · ' + count + ' hydrogen bonds',
          ...anchor, zoom: 1.45, focusAt: true,
          description: names[base] + ' pairs with ' + names[complement].toLowerCase() + ' through ' + count +
            ' hydrogen bonds. In an RNA primer, uracil (U) pairs with adenine instead of thymine.',
          hit(x, y) {
            const baseDistance = Math.min(...[top, bottom, upperEnd, lowerEnd].map(point =>
              Math.hypot(x - point.x, y - point.y)));
            if (baseDistance <= 5.2) return baseDistance / 20;
            const distance = paired ? Math.min(segmentDistance(x, y, top, upperEnd),
              segmentDistance(x, y, bottom, lowerEnd)) : segmentDistance(x, y, top, bottom);
            const radius = Math.max(8, Math.min(14, g.width * 0.016));
            return distance <= radius ? distance / radius + 0.19 : Infinity;
          }
        });
      });
      ui.parts(parts);
    }
    return {
      canReverse: () => progress === 0 && rotation === 0,
      idleOrbit: () => idleAngle,
      orbit() {
        const initial = rotationTarget;
        return offset => {
          rotate(initial + offset * 0.66);
          angle.set(rotationTarget);
        };
      },
      frame(dt, scroll) {
        progress = scroll;
        rotation = ui.reduced() ? rotationTarget : lerp(rotation, rotationTarget, 1 - Math.exp(-11 * dt));
        if (Math.abs(rotation - rotationTarget) < 0.035) rotation = rotationTarget;
        if (!ui.reduced() && ui.canIdleSpin()) idleAngle = (idleAngle + dt * 0.43) % (2 * Math.PI);
        if (Math.abs(scrub.value - progress * 100) > 0.08) scrub.set(progress * 100);
        const orbit = idleAngle + rotation * Math.PI / 180;
        ui.draw((ctx, width, height) => {
          const selected = ui.selected();
          const g = render(ctx, width, height, { progress, selected, orbit, emphasis });
          anatomy(g);
          const bonds = g.pairs.reduce((n, pair) => n + Number(pair.leadAlpha > 0.9) + Number(pair.lagAlpha > 0.9), 0);
          if (bonds > previousBonds && !ui.reduced()) MorphAudio.playDnaBond();
          previousBonds = bonds;
        }, undefined,
        progress + '/' + orbit + '/' + ui.selected() + '/' + emphasis);
      }
    };
  }

  return { model, render, transition, transitionShade, mount, complement: base => other[base], numberOfBonds };
})();
