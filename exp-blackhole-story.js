'use strict';

const MorphBlackHoleStory = (() => {
  const model = MorphBlackHole;
  const compact = matchMedia('(max-width: 1050px)');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const limit = n => Math.max(0, Math.min(1, n));
  const chapters = [
    [
      ['The point of no return', 'A black hole is a region of spacetime with a boundary called the event horizon. Once a signal crosses inward, it cannot reach a distant observer.'],
      ['What you’re seeing', 'Hot gas supplies the light. Gravity bends the image of that gas around an apparent shadow. The horizon itself lies inside that dark outline.']
    ],
    [
      ['When a star collapses', 'When a massive star runs out of fuel, its core can collapse under its own gravity. If the remnant is too massive to remain stable as a neutron star, it can become a stellar-mass black hole.'],
      ['The biggest black holes', 'Supermassive black holes occupy the centres of many galaxies. They grow by gaining matter and merging, but the origins of their earliest seeds are still being studied.']
    ],
    [
      ['Matter in orbit', 'Gas with angular momentum can settle into a disk. Turbulence lets some gas lose angular momentum and spiral inward. Much of the heat and light is released while the gas is still outside the horizon.'],
      ['A disk can outshine its home', 'Actively feeding supermassive black holes can power quasars. A black hole with little nearby gas may have no bright disk at all.']
    ],
    [
      ['Looking around the shadow', 'The far side of the disk would ordinarily be hidden. Close to the black hole, curved spacetime bends some of its light toward us. It appears as the luminous arcs above and below the shadow.'],
      ['The thin rim', 'Rays passing very close to the shadow boundary can loop around the black hole on their way out. They form narrow images far finer than the broad glowing band made by the disk.']
    ],
    [
      ['Why one side shines brighter', 'Orbiting gas moving toward us appears brighter than gas moving away. This is relativistic Doppler beaming. As you scroll, moving streaks trace orbital flow while the apparent shadow stays in place.'],
      ['When the black hole spins', 'A spinning black hole drags nearby spacetime around with it. Spin can affect how close gas can maintain a stable orbit, depending on the direction of the orbit.']
    ],
    [
      ['Clocks near a black hole', 'A clock held at rest close to a non-spinning black hole ticks more slowly than a distant clock. An observer beside either clock sees it tick normally. Light escaping from deep in the gravitational field arrives redshifted.'],
      ['What can reach us', 'Matter outside the event horizon can still emit light that escapes. Once it crosses the horizon, signals from that matter cannot reach the outside. Images tell us about the surroundings and the paths light took.']
    ],
    [
      ['How we observe black holes', 'The Event Horizon Telescope reconstructed radio images of M87* and Sagittarius A* from observations across Earth. The radio brightness traces hot plasma on the scale of the horizon. Stellar orbits and gravitational waves give us other ways to detect black holes.'],
      ['What the image can tell us', 'The size of the shadow helps constrain the mass if the distance is known. The brightness around it also depends on the gas and our viewing angle. The glowing gas here illustrates how a disk might look in visible light.']
    ]
  ];

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function experiments() {
    const section = element('section', 'bh-experiments');
    section.setAttribute('aria-labelledby', 'bh-experiments-title');
    const heading = element('h2', '', 'Experiment with gravity');
    heading.id = 'bh-experiments-title';
    section.append(heading);

    function experiment(title, description, label, min, max, step, value, update) {
      const card = element('section', 'bh-experiment');
      const control = element('label', '', label);
      const input = element('input');
      Object.assign(input, { type: 'range', min, max, step, value });
      const output = element('output');
      const render = () => { output.value = update(input.valueAsNumber); };
      input.addEventListener('input', render);
      control.append(input);
      card.append(element('h3', '', title), element('p', '', description), control, output);
      section.append(card);
      render();
      return card;
    }
    const ns = 'http://www.w3.org/2000/svg';
    const svg = (tag, attrs) => {
      const node = document.createElementNS(ns, tag);
      for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
      return node;
    };
    const diagram = svg('svg', { viewBox: '0 0 330 126', 'aria-hidden': 'true' });
    const flat = svg('path', { class: 'bh-ray-reference' });
    const ray = svg('path', { class: 'bh-ray-curved' });
    diagram.append(svg('circle', { cx: 165, cy: 97, r: 19 }), flat, ray);
    const lens = experiment('Bend a light ray',
      'Move the incoming ray farther away and compare the curved path with the dashed straight path. The drawing exaggerates curvature. The angle uses the weak-field approximation for a non-spinning black hole.',
      'Impact parameter in horizon radii', 8, 40, 1, 14, impact => {
        const clearance = (impact - 8) / 32;
        const y = 52 - 29 * clearance;
        const bend = 215 / impact;
        flat.setAttribute('d', `M10 ${y}H320`);
        ray.setAttribute('d', `M10 ${y}H87C156 ${y} 222 ${y + bend * 0.35} 320 ${y + bend}`);
        return `${impact} horizon radii · about ${(360 / (Math.PI * impact)).toFixed(1)}° deflection`;
      });
    lens.insertBefore(diagram, lens.querySelector('label'));
    experiment('Compare two clocks',
      'Hold a clock at a fixed distance from a non-spinning black hole and compare it with a faraway clock. The near clock is held in place outside the horizon. Locally, both clocks tick normally.',
      'Distance from the centre in horizon radii', 1.1, 20, 0.1, 2, radius =>
        `At ${radius.toFixed(1)} horizon radii, about ${(10 * Math.sqrt(1 - 1 / radius)).toFixed(2)} minutes pass nearby for 10 minutes far away.`);
    experiment('Scale the horizon',
      'A black hole’s mass determines its horizon radius in the non-spinning model. One solar mass equals the mass of our Sun.',
      'Mass as a power of ten in solar masses', 1, 9, 0.1, 1, power => {
        const mass = 10 ** power;
        const format = n => Math.round(n).toLocaleString('en-GB');
        return `${format(mass)} solar masses · about ${format(2.95325 * mass)} km in radius`;
      });
    const details = element('details', 'bh-deeper');
    details.append(element('summary', '', 'Go deeper'),
      element('p', '', 'For mass M, the Schwarzschild horizon radius rₛ is 2GM/c². Outside it, the stationary clock rate relative to a faraway clock is √(1 − rₛ/r). The first-order ray deflection for impact parameter b ≫ rₛ is 2rₛ/b radians. The diagram illustrates this trend with a schematic curve.'),
      element('p', '', 'A nearby observer always measures the same speed of light. The event horizon marks a change in where outward signals can go. Follow the sources for more on accretion disks, lensing and photon orbits.'));
    section.append(details);
    return section;
  }

  function create(host) {
    const header = element('header', 'bh-heading');
    const title = element('div', 'bh-title', 'Black Holes');
    title.setAttribute('aria-hidden', 'true');
    header.append(title, element('p', 'bh-deck', 'Follow the light that escapes, and the shadow it leaves behind.'));
    const story = element('div', 'bh-story');
    const specimen = element('figure', 'bh-specimen');
    const device = element('div', 'bh-device');
    const canvas = element('canvas', 'bh-canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'A dark central shadow, with luminous arcs lensed above and below it and a wider accretion disk crossing the foreground.');
    device.append(canvas);
    const caption = element('figcaption', 'bh-caption');
    const picker = element('button', 'bh-pick', 'Explore the features');
    picker.type = 'button';
    picker.setAttribute('aria-expanded', 'false');
    picker.setAttribute('aria-controls', 'bh-feature-list');
    const options = element('div', 'bh-feature-list');
    options.id = 'bh-feature-list';
    options.hidden = true;
    const buttons = model.features.map(([id, title]) => {
      const button = element('button', '', title);
      button.type = 'button';
      button.dataset.feature = id;
      button.setAttribute('aria-controls', 'bh-inspector');
      button.setAttribute('aria-pressed', 'false');
      return button;
    });
    options.append(...buttons);
    caption.append(picker, options);

    const inspector = element('aside', 'bh-inspector');
    inspector.id = 'bh-inspector';
    inspector.setAttribute('aria-labelledby', 'bh-inspection-title');
    inspector.hidden = true;
    const close = element('button', '', 'Close');
    close.type = 'button';
    const inspectionTitle = element('h2');
    inspectionTitle.id = 'bh-inspection-title';
    const description = element('p');
    const status = element('span', 'sr-only');
    status.setAttribute('role', 'status');
    inspector.append(close, inspectionTitle, description);
    specimen.append(device, caption, inspector, status);

    const paragraphs = [];
    const rows = chapters.map(pair => {
      const row = element('div', 'bh-row');
      pair.forEach(([title, text], side) => {
        const section = element('section', 'bh-copy');
        const p = element('p', 'bh-prose', text);
        p.dataset.side = side ? 'right' : 'left';
        paragraphs.push(p);
        section.append(element('h2', '', title), p);
        row.append(section);
      });
      return row;
    });
    const sources = element('p', 'bh-sources');
    for (const [title, href] of [
      ['Black hole anatomy · NASA', 'https://science.nasa.gov/universe/black-holes/anatomy/'],
      ['Observing black holes · EHT', 'https://eventhorizontelescope.org/science'],
      ['Gravity and clocks · MIT', 'https://web.mit.edu/8.962/www/lecnotes/8_962TA-lec-all.pdf']
    ]) {
      const link = element('a', '', title);
      link.href = href;
      sources.append(link);
    }
    story.append(specimen, ...rows);
    host.replaceChildren(header, story, experiments(), sources);
    return { story, specimen, device, canvas, picker, options, buttons, inspector, close, inspectionTitle, description, status, paragraphs };
  }

  function cubic(a, b, c, d, t) {
    const s = 1 - t;
    return s ** 3 * a + 3 * s * s * t * b + 3 * s * t * t * c + t ** 3 * d;
  }

  function orbit(word, t, g, top) {
    const entryAt = .29;
    const spiralAt = .78;
    const side = word.right ? 1 : -1;
    const entryAngle = -.93 - .16 * word.order;
    const exitAngle = 1.26 - .10 * word.order;
    const sweep = exitAngle - entryAngle;
    const angularSpeed = sweep / (spiralAt - entryAt);
    const rx = g.radius * (.92 + word.lane * .09);
    const ry = g.radius * (.45 + word.lane * .066);
    const cos = Math.cos(g.tilt);
    const sin = Math.sin(g.tilt);
    const cx = g.x - g.shadowY * g.radius * sin;
    const cy = g.y + g.shadowY * g.radius * cos;

    function ellipse(angle) {
      const x = side * rx * Math.cos(angle);
      const y = ry * Math.sin(angle);
      return {
        x: x * cos - y * sin,
        y: x * sin + y * cos,
        dx: -side * rx * Math.sin(angle) * cos - ry * Math.cos(angle) * sin,
        dy: -side * rx * Math.sin(angle) * sin + ry * Math.cos(angle) * cos
      };
    }

    let x, y;
    if (t < entryAt) {
      const q = t / entryAt;
      const start = top - word.delay + word.height / 2;
      const entry = ellipse(entryAngle);
      const handle = angularSpeed * entryAt / 3;
      // Pick up at the word's native scroll velocity. Lead along the edge
      // first, then bend toward the disk and meet its projected tangent.
      const run = q + q * (1 - q) * (.54 - 1.48 * (1 - q) ** 4);
      x = cubic(word.x, word.x, cx + entry.x - entry.dx * handle / .46, cx + entry.x, run);
      y = cubic(start, start, cy + entry.y - entry.dy * handle / 2.7, cy + entry.y, q ** 2.7) -
        word.span * entryAt * q * (1 - q) ** 3;
    } else if (t < spiralAt) {
      const orbit = ellipse(entryAngle + angularSpeed * (t - entryAt));
      x = cx + orbit.x;
      y = cy + orbit.y;
    } else {
      const spiral = (t - spiralAt) / (1 - spiralAt);
      // Radius starts shrinking with zero radial velocity. Angular velocity
      // carries through from the orbit and accelerates during the inward turn.
      const radius = 1 - spiral * spiral * (3 - 2 * spiral);
      const position = ellipse(exitAngle + angularSpeed * (t - spiralAt) + 1.08 * spiral ** 2);
      x = cx + radius * position.x;
      y = cy + radius * position.y;
    }

    const q = limit((t - spiralAt) / (1 - spiralAt));
    const absorption = q * q * (3 - 2 * q);
    return {
      x, y,
      angle: side * (.24 + .08 * word.lane) * Math.sin(Math.PI * t) ** 2,
      scale: 1 - .48 * absorption,
      opacity: 1 - absorption
    };
  }

  function createDepartures(nodes, signal, schedule) {
    if (!window.Highlight || !CSS.highlights) return null;
    const layer = element('div', 'bh-orbit');
    const probe = element('span', 'bh-orbit-word');
    probe.hidden = true;
    layer.setAttribute('aria-hidden', 'true');
    layer.append(probe);
    document.body.append(layer);
    const debug = new URLSearchParams(location.search).has('bh-departure-debug')
      ? element('div', 'bh-orbit-debug') : null;
    if (debug) {
      debug.setAttribute('aria-hidden', 'true');
      document.body.append(debug);
    }
    const concealed = new Highlight();
    CSS.highlights.set('bh-departure', concealed);
    const observer = new ResizeObserver(schedule);
    nodes.forEach(node => observer.observe(node));
    signal.addEventListener('abort', () => {
      observer.disconnect();
      CSS.highlights.delete('bh-departure');
      layer.remove();
      debug?.remove();
    });
    let words = [];
    let longest = 0;
    const active = new Map();
    const pool = [];

    function release(word, clone) {
      concealed.delete(word.range);
      clone.hidden = true;
      active.delete(word);
      pool.push(clone);
    }

    function measure(y) {
      for (const [word, clone] of active) release(word, clone);
      words = [];
      longest = 0;
      if (compact.matches || motion.matches) return;
      probe.hidden = false;
      for (const node of nodes) {
        const text = node.firstChild;
        if (!text || text.nodeType !== Node.TEXT_NODE) continue;
        const style = getComputedStyle(node);
        const font = style.fontStyle + ' ' + style.fontWeight + ' ' + style.fontSize + '/' +
          style.lineHeight + ' ' + style.fontFamily;
        // Temporary pacing adjustment in scroll pixels, shared by both directions.
        const baseSpan = Math.max(59, Math.min(82, parseFloat(style.lineHeight) * 2.48));
        const type = { font, letterSpacing: style.letterSpacing, color: style.color };
        Object.assign(probe.style, type);
        probe.textContent = 'M';
        const probeRange = document.createRange();
        probeRange.selectNodeContents(probe);
        const offset = probeRange.getBoundingClientRect().top - probe.getBoundingClientRect().top;

        const rows = [];
        for (const token of text.data.matchAll(/\S+/gu)) {
          const range = document.createRange();
          range.setStart(text, token.index);
          range.setEnd(text, token.index + token[0].length);
          const rects = range.getClientRects();
          // Keep the paragraph intact for selection and speech. The Range
          // covers one word, and a separate visual span stands in for it.
          // A word already broken by layout clips naturally as one source.
          if (rects.length !== 1) continue;
          const rect = rects[0];
          if (rect.width <= 0) continue;
          if (!rows.length || Math.abs(rows.at(-1).top - rect.top) > 1) {
            rows.push({ top: rect.top, tokens: [] });
          }
          rows.at(-1).tokens.push({ range, rect, text: token[0] });
        }

        for (const row of rows) {
          row.tokens.forEach(({ range, rect, text }, index) => {
            const order = index / Math.max(1, row.tokens.length - 1);
            // Stagger only inside the clipping band. Every word still has
            // visible glyphs at handoff, including the last word on a line.
            const delay = -2 + Math.min(16, rect.height * .78) * order;
            const span = baseSpan * (.89 + .23 * order);
            words.push({
              x: rect.left + rect.width / 2, height: rect.height,
              start: rect.top + y + delay, delay, offset, span, range, type, text,
              order, lane: (index % 3) - 1, right: node.dataset.side === 'right'
            });
            longest = Math.max(longest, span);
          });
        }
      }
      probe.hidden = true;
      words.sort((a, b) => a.start - b.start);
    }

    function firstAfter(y) {
      let low = 0;
      let high = words.length;
      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (words[mid].start <= y) low = mid + 1;
        else high = mid;
      }
      return low;
    }

    function draw(y, top, g, visible) {
      const enabled = visible && !motion.matches && !compact.matches;
      const threshold = y + top;
      const next = new Set();
      if (enabled) {
        const start = firstAfter(threshold - longest);
        const end = firstAfter(threshold);
        for (let i = start; i < end; i++) {
          const word = words[i];
          if (threshold < word.start + word.span) next.add(word);
        }
      }
      if (debug) {
        debug.hidden = !enabled;
        debug.style.top = top + 'px';
        const approaching = words[firstAfter(threshold)];
        debug.textContent = next.size ? 'Clipping edge • ' + next.size + ' words in flight' :
          approaching ? 'Clipping edge • next word in ' + Math.round(approaching.start - threshold) + ' px' : 'Clipping edge';
      }
      for (const [word, clone] of active) {
        if (!next.has(word)) release(word, clone);
      }

      for (const word of next) {
        let clone = active.get(word);
        if (!clone) {
          clone = pool.pop() || element('span', 'bh-orbit-word');
          if (!clone.parentNode) layer.append(clone);
          clone.textContent = word.text;
          Object.assign(clone.style, word.type);
          active.set(word, clone);
          concealed.add(word.range);
        }
        const progress = (threshold - word.start) / word.span;
        const pose = orbit(word, progress, g, top);
        clone.classList.toggle('bh-orbit-in-flight', progress >= .27);
        clone.style.opacity = pose.opacity;
        clone.style.transform = 'translate3d(' + pose.x + 'px,' +
          (pose.y - word.height / 2 - word.offset) + 'px,0) translateX(-50%) rotate(' + pose.angle + 'rad) scale(' + pose.scale + ')';
        clone.hidden = false;
      }
    }
    return { measure, draw };
  }

  function mount(view, surface, arrived) {
    const { story, specimen, canvas, device, picker, options, buttons, inspector, close, inspectionTitle,
      description, status, paragraphs } = view;
    const scope = new AbortController();
    const { signal } = scope;
    let frame = 0;
    let needsMeasure = true;
    let selected = '';
    let lastPaint = '';
    let lastScroll;
    let lastFrame = null;
    let lastRender = -Infinity;
    let ambient = 0;
    let layout;
    let progress = 0;
    const drawing = arrived || surface(canvas, invalidate, 1_900_000);
    if (arrived) {
      arrived.onResize(invalidate);
      lastPaint = paintKey(0, arrived.size());
    }
    const departure = drawing && model.available() ? createDepartures(paragraphs, signal, invalidate) : null;

    let fallback = null;
    function updateFallback() {
      const needed = !drawing || !model.available();
      if (needed === Boolean(fallback)) return;
      canvas.hidden = needed;
      if (needed) {
        fallback = element('img', 'bh-fallback');
        fallback.src = 'assets/black-hole-static.webp';
        fallback.alt = canvas.getAttribute('aria-label');
        device.append(fallback);
      } else {
        fallback.remove();
        fallback = null;
      }
      lastPaint = '';
      invalidate();
    }
    updateFallback();
    window.addEventListener('morphopticschange', updateFallback, { signal });

    function select(id) {
      const feature = model.features.find(part => part[0] === id);
      selected = feature?.[0] || '';
      for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.feature === selected));
      setMenu(false);
      inspector.hidden = !feature;
      if (feature) {
        inspectionTitle.textContent = feature[1];
        description.textContent = feature[2];
      }
      status.textContent = feature ? feature[1] + '. ' + feature[2] : 'Feature inspection closed.';
      schedule();
    }

    function pointerPart(event) {
      const box = canvas.getBoundingClientRect();
      return model.hit(model.geometry(box.width, box.height), event.clientX - box.left, event.clientY - box.top);
    }

    function setMenu(open) {
      options.hidden = !open;
      picker.setAttribute('aria-expanded', String(open));
    }
    picker.addEventListener('click', () => setMenu(options.hidden), { signal });
    for (const button of buttons) button.addEventListener('click', () => {
      select(button.dataset.feature);
      close.focus({ preventScroll: true });
    }, { signal });
    close.addEventListener('click', reset, { signal });
    function reset() {
      select('');
      picker.focus({ preventScroll: true });
    }
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return;
      if (selected) reset();
      else if (!options.hidden) {
        setMenu(false);
        picker.focus({ preventScroll: true });
      }
    }, { signal });
    document.addEventListener('click', ({ target }) => {
      if (specimen.contains(target)) return;
      if (selected) select('');
      else setMenu(false);
    }, { signal });
    canvas.addEventListener('click', event => {
      const id = pointerPart(event);
      if (id || selected) select(id);
    }, { signal });
    canvas.addEventListener('pointermove', event => {
      canvas.classList.toggle('bh-target', Boolean(pointerPart(event)));
    }, { signal });
    canvas.addEventListener('pointerleave', () => canvas.classList.remove('bh-target'), { signal });

    function schedule() {
      if (!frame) frame = requestAnimationFrame(paint);
    }

    function invalidate() {
      needsMeasure = true;
      schedule();
    }

    function paintKey(progress, { width, height }) {
      return [progress, selected, width, height, canvas.width, canvas.height].join('|');
    }

    function paint(now = performance.now()) {
      frame = 0;
      const y = window.scrollY;
      const measured = needsMeasure;
      if (measured) {
        const storyRect = story.getBoundingClientRect();
        const specimenRect = specimen.getBoundingClientRect();
        const canvasRect = device.getBoundingClientRect();
        const top = Number.parseFloat(getComputedStyle(specimen).top);
        const clipEdge = document.querySelector('.topbar').getBoundingClientRect().bottom;
        layout = {
          top, clipEdge, height: innerHeight, start: storyRect.top + y, end: storyRect.bottom + y,
          left: canvasRect.left, offset: canvasRect.top - specimenRect.top,
          width: canvasRect.width, canvasHeight: canvasRect.height, specimenHeight: specimenRect.height
        };
        departure?.measure(y);
        needsMeasure = false;
      }
      const { top, clipEdge, height, start, end, left, offset, width, canvasHeight, specimenHeight } = layout;
      const specimenY = Math.max(start - y, Math.min(top, end - y - specimenHeight));
      const visible = specimenY + specimenHeight > top && specimenY < height;
      progress = motion.matches ? 0 : limit(y / Math.max(1, end - specimenHeight - top));
      if (measured || y !== lastScroll) {
        const g = model.geometry(width, canvasHeight);
        g.x += left;
        g.y += specimenY + offset;
        MorphWorld.live('black-hole', progress, visible ? g : undefined);
        departure?.draw(y, clipEdge, g, visible && !fallback);
        lastScroll = y;
      }
      const drawable = drawing && visible && model.available();
      const animate = drawable && !motion.matches && !document.hidden;
      if (animate) {
        if (lastFrame !== null) ambient += Math.max(0, Math.min(0.05, (now - lastFrame) / 1000)) * 0.32;
        schedule();
      }
      lastFrame = animate ? now : null;
      if (!drawable) return;

      const size = drawing.size();
      const key = paintKey(progress, size);
      if (key === lastPaint && (!animate || now - lastRender < 31)) return;
      lastPaint = key;
      lastRender = now;
      size.ctx.clearRect(0, 0, size.width, size.height);
      model.paint(size.ctx, size.width, size.height, progress, selected, ambient);
    }
    const resize = new ResizeObserver(invalidate);
    resize.observe(story);
    resize.observe(specimen);
    window.addEventListener('scroll', schedule, { signal, passive: true });
    window.addEventListener('resize', invalidate, { signal, passive: true });
    document.fonts.addEventListener('loadingdone', invalidate, { signal });
    document.addEventListener('visibilitychange', () => {
      lastFrame = null;
      if (!document.hidden) schedule();
    }, { signal });
    motion.addEventListener('change', invalidate, { signal });
    compact.addEventListener('change', invalidate, { signal });
    cancelAnimationFrame(frame);
    paint();

    return {
      dispose() {
        cancelAnimationFrame(frame);
        resize.disconnect();
        drawing?.dispose();
        fallback?.remove();
        canvas.hidden = false;
        inspector.hidden = true;
        status.textContent = '';
        setMenu(false);
        for (const button of buttons) button.setAttribute('aria-pressed', 'false');
        canvas.classList.remove('bh-target');
        scope.abort();
      }
    };
  }

  return { create, mount };
})();
