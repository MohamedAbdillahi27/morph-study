'use strict';

(() => {
  const topics = [
    {
      id: 'black-hole', model: 'blackhole', title: 'Black Hole', subject: 'Astrophysics',
      tags: 'Field / Spatial', label: 'Gravitational field',
      intro: 'Follow light around a collapsed star and see how gravity changes the paths it takes and the time a nearby observer experiences.',
      hook: 'What happens when gravity bends the path of light?',
      hint: 'Scroll to follow gravity. Select the shadow, ring, or disk to inspect it.',
      keywords: 'black hole,gravity,relativity,event horizon,space,singularity,light,photon,astronomy,astrophysics',
      exhibit: MorphBlackHole, poster: { poster: true, time: 2.85 },
      chapters: [
        ['Stellar collapse', 'When a sufficiently massive star runs out of fuel, its core can collapse into a region from which light cannot escape. The Schwarzschild radius gives the size of the event horizon for a non-rotating black hole.', 'Increase the mass. How does the radius change?'],
        ['The event horizon', 'The event horizon is a boundary in spacetime. Once light or matter crosses it inward, every future path leads deeper in. The dark shadow seen from far away is larger than the horizon itself.', 'Launch a photon near the shadow, then launch one farther away. Compare their paths.'],
        ['Gravitational lensing', 'Light follows the curvature of spacetime. Near the black hole, that curvature can pull background starlight into arcs. The bright disc is hot matter. One side appears brighter when that material moves toward the viewer.', 'Scroll back and forth to see how the stars distort.'],
        ['Extreme time dilation', 'A stationary clock closer to a non-rotating black hole runs slower than a clock very far away. The model uses the Earth clock as the distant reference and the observer clock at your selected radius.', 'Move the observer closer. Watch both clocks and compare how fast they tick.']
      ]
    },
    {
      id: 'dna', model: 'dna', title: 'DNA Replication', subject: 'Molecular biology',
      tags: 'Anatomy / Process / Transformation', label: 'Replication fork',
      intro: 'Unzip a double helix and follow the pairing rules that let a cell copy its genetic information.',
      hook: 'How can a cell copy a molecule strand by strand?',
      hint: 'Scroll to unwind the helix. Select a rung, backbone, or helicase to inspect it.',
      keywords: 'dna,replication,genetics,helix,biology,genes,base pairs,adenine,cytosine,polymerase,helicase,nucleotides',
      exhibit: MorphDna, poster: { progress: 0.18, time: 2.3, thumbnail: true },
      scrollStops: [0, 0.4, 0.7, 1],
      chapters: [
        ['Double helix structure', 'DNA has two sugar–phosphate backbones. Between them, adenine pairs with thymine through two hydrogen bonds, while cytosine pairs with guanine through three.', 'Inspect several rungs and count their bond dots.'],
        ['Helicase unzips', 'Helicase separates the paired strands by breaking the hydrogen bonds between bases. The backbones stay intact as the opening becomes a Y-shaped replication fork.', 'Scrub between 25% and 55% to follow the fork.'],
        ['Base pairing', 'Each exposed strand serves as a template. DNA polymerase extends a new strand in the 5′ to 3′ direction. At a real fork, one new strand is made continuously and the other in short fragments. This model shows complementary pairing on both templates.', 'Watch which base joins each exposed nucleotide.'],
        ['Two identical copies', 'Each copy contains one original strand and one newly built strand. This is called semiconservative replication. Dark teal marks the original backbones and green marks the new ones.', 'Drag the slider backward to see how each copy came together.']
      ]
    },
    {
      id: 'neural-networks', model: 'neural', title: 'Neural Networks', subject: 'Computer science',
      tags: 'Network / Process', label: 'Feedforward network',
      intro: 'Send a signal through a small neural network and trace how inputs, weights, and activation functions shape a prediction.',
      hook: 'How do simple connected units turn signals into a prediction?',
      hint: 'Select a node or wire to inspect it. Scroll to follow the signal.',
      keywords: 'neural,ai,brain,deep learning,network,perceptron,weights,softmax,machine learning,relu',
      exhibit: MorphNeural, poster: { thumbnail: true },
      chapters: [
        ['Input signals', 'A neuron multiplies each incoming value by its connection weight, adds the products, and then adds a bias. A positive weight pushes the sum up. A negative weight pushes it down.', 'Change an input or a weight and watch the live calculation for the first hidden neuron.'],
        ['Synaptic weights', 'Cyan connections carry positive weights. Coral connections carry negative weights. The magnitude of a weight determines how much that input changes the receiving neuron’s sum.', 'Select a connection and change its weight. A zero weight removes its contribution.'],
        ['Activation and output', 'Hidden neurons apply ReLU to their sums, replacing negative results with zero. The two output neurons then produce logits. Softmax converts those scores into probabilities that add to one.', 'Try the same input with a different weight and compare the output probabilities.']
      ]
    }
  ];

  const byId = id => document.getElementById(id);
  const home = byId('home');
  const exhibit = byId('exhibit');
  const stage = byId('stage');
  const canvas = byId('model-canvas');
  const controls = byId('controls');
  const search = byId('search');
  const results = byId('results');
  const searchStatus = byId('search-status');
  const sound = byId('sound');
  const share = byId('share');
  const title = byId('exhibit-title');
  const toast = byId('toast');
  const dialog = byId('share-dialog');
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => media.matches;
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const ease = (current, target, dt) => reduced() ? target : current + (target - current) * (1 - 0.9 ** (dt * 60));
  let session = null;
  let activeTopic = null;
  let artwork = [];
  let timer;
  let matches = [];
  let selection = -1;
  let fusion = null;
  const modelWindow = stage.querySelector('.model');
  const motionCurve = 'cubic-bezier(0.22, 1, 0.36, 1)';

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function setText(node, value) {
    if (node.textContent !== value) node.textContent = value;
  }

  function surface(node, onResize = () => {}) {
    const ctx = node.getContext('2d', { alpha: false });
    let width = 1, height = 1, ratio = 0;
    function resize() {
      const rect = node.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const nextRatio = window.devicePixelRatio || 1;
      if (width === rect.width && height === rect.height && ratio === nextRatio) return;
      width = rect.width;
      height = rect.height;
      ratio = nextRatio;
      node.width = Math.max(1, Math.round(width * ratio));
      node.height = Math.max(1, Math.round(height * ratio));
      ctx.setTransform(node.width / width, 0, 0, node.height / height, 0, 0);
      onResize(ctx, width, height);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    let resolution;
    function watchResolution() {
      resolution?.removeEventListener('change', watchResolution);
      resolution = matchMedia('(resolution: ' + (window.devicePixelRatio || 1) + 'dppx)');
      resolution.addEventListener('change', watchResolution);
      resize();
    }
    watchResolution();
    return {
      size: () => ({ ctx, width, height }),
      dispose() {
        observer.disconnect();
        resolution.removeEventListener('change', watchResolution);
      }
    };
  }

  function cards(target, items) {
    target.replaceChildren(...items.map(topic => {
      const link = element('a', 'card');
      link.href = '#' + topic.id;
      const art = element('canvas', 'card-art');
      art.setAttribute('aria-hidden', 'true');
      const copy = element('div', 'card-copy');
      copy.append(element('div', 'card-area', topic.subject), element('h3', '', topic.title), element('p', '', topic.hook));
      link.append(art, copy);
      return link;
    }));
    [...target.querySelectorAll('canvas')].forEach((node, index) => {
      const topic = items[index];
      artwork.push(surface(node, (ctx, width, height) => topic.exhibit.render(ctx, width, height, topic.poster)));
    });
  }

  function distance(a, b) {
    let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 1; i <= a.length; i++) {
      const next = [i];
      for (let j = 1; j <= b.length; j++) {
        next[j] = Math.min(next[j - 1] + 1, previous[j] + 1, previous[j - 1] + Number(a[i - 1] !== b[j - 1]));
      }
      previous = next;
    }
    return previous[b.length];
  }

  function findTopics(raw) {
    const query = raw.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').slice(0, 100);
    if (!query) return [];
    return topics.map(topic => {
      const terms = topic.keywords.split(',');
      const score = Math.max(...terms.map(term => {
        if (term === query) return 10;
        if (term.startsWith(query)) return 8 - (term.length - query.length) * 0.05;
        if (term.length > 2 && (' ' + query + ' ').includes(' ' + term + ' ')) return 7;
        if (query.length >= 3 && term.includes(query)) return 5;
        const edits = distance(query, term);
        return query.length >= 3 && edits <= (query.length > 6 ? 2 : 1) ? 4 - edits * 0.1 : 0;
      }));
      return { topic, score };
    }).filter(result => result.score > 0).sort((a, b) => b.score - a.score).map(result => result.topic);
  }

  function closeSearch() {
    results.hidden = true;
    search.setAttribute('aria-expanded', 'false');
    search.removeAttribute('aria-activedescendant');
    selection = -1;
  }

  function selectOption(index) {
    selection = index;
    [...results.children].forEach((option, position) => option.setAttribute('aria-selected', String(position === index)));
    search.setAttribute('aria-activedescendant', 'match-' + index);
  }

  function updateSearch() {
    matches = findTopics(search.value);
    if (!search.value.trim()) {
      setText(searchStatus, '');
      closeSearch();
      return;
    }
    results.replaceChildren();
    matches.forEach((topic, index) => {
      const row = element('li');
      row.id = 'match-' + index;
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', 'false');
      row.append(element('span', '', topic.title), element('small', '', topic.subject));
      row.addEventListener('pointerdown', event => {
        if (event.pointerType === 'mouse') event.preventDefault();
      });
      row.addEventListener('click', () => navigate(topic.id));
      results.append(row);
    });
    if (!matches.length) {
      const empty = element('li', '', 'No matching exhibits. Try gravity, genetics, or AI.');
      empty.setAttribute('role', 'presentation');
      results.append(empty);
    }
    setText(searchStatus, matches.length ? matches.length + ' matching exhibits' : 'No matching exhibits');
    results.hidden = false;
    search.setAttribute('aria-expanded', 'true');
    search.removeAttribute('aria-activedescendant');
    selection = -1;
  }

  search.addEventListener('input', updateSearch);
  search.addEventListener('focus', updateSearch);
  search.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !results.hidden) {
      event.preventDefault();
      closeSearch();
    }
    if (!['ArrowDown', 'ArrowUp'].includes(event.key) || !matches.length) return;
    event.preventDefault();
    if (results.hidden) updateSearch();
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    const index = selection < 0 ? (direction > 0 ? 0 : matches.length - 1) : (selection + direction + matches.length) % matches.length;
    selectOption(index);
  });
  byId('search-form').addEventListener('submit', event => {
    event.preventDefault();
    const topic = matches[Math.max(selection, 0)];
    if (topic) navigate(topic.id);
    else updateSearch();
  });

  document.addEventListener('keydown', event => {
    if (activeTopic || event.key !== '/' || event.altKey || event.metaKey || event.ctrlKey) return;
    if (event.target.closest('input,select,textarea,[contenteditable]')) return;
    event.preventDefault();
    search.focus();
  });

  document.addEventListener('click', event => {
    if (!event.target.closest('#search-form')) closeSearch();
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.button !== 0 || event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
    const hash = link.getAttribute('href').slice(1);
    if (link.classList.contains('skip')) {
      event.preventDefault();
      byId('main').focus();
      return;
    }
    if (hash && !topics.some(topic => topic.id === hash)) return;
    event.preventDefault();
    navigate(hash);
  });

  function soundLabel() {
    sound.setAttribute('aria-pressed', String(MorphAudio.enabled));
    setText(sound, MorphAudio.enabled ? 'Sound on' : 'Sound off');
  }

  sound.addEventListener('click', () => {
    MorphAudio.setEnabled(!MorphAudio.enabled);
    soundLabel();
    MorphAudio.playSelect();
  });

  function announce(message) {
    setText(toast, message);
    toast.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(() => { toast.hidden = true; }, 2600);
  }

  share.addEventListener('click', async () => {
    if (!activeTopic) return;
    MorphAudio.playSelect();
    const url = location.protocol === 'file:' ? 'https://morph.study/#' + activeTopic.id : location.href;
    try {
      await navigator.clipboard.writeText(url);
      announce(location.hostname === 'morph.study' || location.protocol === 'file:' ? 'Copied morph.study link' : 'Copied exhibit link');
    } catch {
      const field = byId('share-url');
      field.value = url;
      dialog.showModal();
      field.focus();
      field.select();
    }
  });

  function mount(topic) {
    const listenerScope = new AbortController();
    const on = (node, event, handler, options = {}) =>
      node.addEventListener(event, handler, { ...options, signal: listenerScope.signal });
    const drawing = surface(canvas);
    const counter = byId('stage-counter');
    const tip = byId('model-tooltip');
    const inspection = byId('inspection');
    const inspector = byId('inspect-part');
    const inspectionControls = byId('inspection-controls');
    const reset = byId('reset-view');
    const controlsToggle = byId('controls-toggle');
    const panel = controls.parentElement;
    const compactLayout = matchMedia('(max-width: 940px)');
    const chapterElements = topic.chapters.map(([heading, description, instruction], index) => {
      const section = element('section', 'chapter');
      const slot = element('div', 'chapter-slot');
      const text = element('div', 'chapter-inner');
      if (index === 0) {
        const lead = element('div', 'chapter-lead');
        lead.append(element('div', 'chapter-category', topic.subject),
          element('strong', 'chapter-topic', topic.title), element('p', 'chapter-description', topic.intro));
        text.append(lead);
      }
      text.append(element('div', 'chapter-index', String(index + 1).padStart(2, '0') + ' / ' + String(topic.chapters.length).padStart(2, '0')),
        element('h2', '', heading), element('p', 'chapter-description', description));
      slot.append(text);

      const action = element('div', 'chapter-slot chapter-action');
      const actionText = element('div', 'chapter-inner');
      actionText.append(element('h3', '', 'Try it'), element('p', 'try', instruction));
      if (topic.model === 'neural') actionText.append(element('p', 'equation-live'));
      action.append(actionText);
      section.append(slot, action);
      return section;
    });
    const chapters = byId('chapters');
    chapters.replaceChildren(...chapterElements);
    const equations = [...chapters.querySelectorAll('.equation-live')];
    const chapterSlots = [...chapters.querySelectorAll('.chapter-slot')];
    let activeChapter = -1;
    let parts = [];
    let optionsKey = '';
    let selected = '';
    let selectedOffset = null;
    let pointer = null;
    let drag = null;
    let suppressClick = false;
    let restoreControl = null;
    const camera = { zoom: 1, x: 0, y: 0 };
    let delta = 1 / 60;

    function setControls(open) {
      controls.hidden = !open;
      panel.classList.toggle('has-controls', open);
      controlsToggle.setAttribute('aria-expanded', String(open));
    }

    function inspect(part, point) {
      restoreControl?.();
      restoreControl = null;
      selected = part?.id || '';
      selectedOffset = part?.focusAt && point ? {
        x: (point.x - camera.x) / camera.zoom - part.x,
        y: (point.y - camera.y) / camera.zoom - part.y
      } : null;
      inspector.value = selected;
      inspection.hidden = !part;
      reset.hidden = !part;
      stage.classList.toggle('has-inspection', Boolean(part));
      canvas.classList.toggle('is-zoomed', Boolean(part));
      if (!part) {
        setText(byId('inspection-status'), 'Full model view');
        return;
      }
      setControls(false);
      part.onPick?.();
      setText(byId('inspection-title'), part.title);
      setText(byId('inspection-copy'), part.description);
      setText(byId('inspection-value'), part.value || '');
      setText(byId('inspection-status'), 'Inspecting ' + part.title);
      if (part.control?.parentElement) {
        const placeholder = document.createComment('Model control position');
        part.control.before(placeholder);
        inspectionControls.append(part.control);
        restoreControl = () => placeholder.replaceWith(part.control);
      }
      MorphAudio.playInspect();
    }

    function localPoint(event) {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function screenHit(point) {
      if (!point) return null;
      const x = (point.x - camera.x) / camera.zoom;
      const y = (point.y - camera.y) / camera.zoom;
      let best = null;
      let score = Infinity;
      for (const part of parts) {
        const distance = part.hit?.(x, y) ?? Infinity;
        if (distance < score) {
          score = distance;
          best = part;
        }
      }
      return best;
    }

    function resetWithFocus() {
      inspect(null);
      inspector.focus({ preventScroll: true });
    }

    on(inspector, 'change', () => inspect(parts.find(part => part.id === inspector.value)));
    on(reset, 'click', resetWithFocus);
    on(byId('inspection-close'), 'click', resetWithFocus);
    on(controlsToggle, 'click', () => {
      const open = controls.hidden;
      if (open && selected) inspect(null);
      setControls(open);
    });
    on(canvas, 'pointerdown', event => {
      suppressClick = false;
      if (event.button !== 0 || event.pointerType !== 'mouse') return;
      const point = localPoint(event);
      const part = screenHit(point);
      if (part?.drag) drag = { pointerId: event.pointerId, y: point.y, update: part.drag() };
    });
    on(canvas, 'pointermove', event => {
      pointer = localPoint(event);
      if (drag?.pointerId !== event.pointerId) return;
      const offset = drag.y - pointer.y;
      if (!suppressClick && Math.abs(offset) <= 4) return;
      if (!suppressClick) {
        suppressClick = true;
        canvas.setPointerCapture(event.pointerId);
      }
      drag.update(offset);
    });
    on(canvas, 'pointerup', () => { drag = null; });
    on(canvas, 'lostpointercapture', () => { drag = null; });
    on(canvas, 'pointerleave', () => {
      pointer = null;
      if (!suppressClick) drag = null;
    });
    on(canvas, 'click', event => {
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      const point = localPoint(event);
      const part = screenHit(point);
      if (part || selected) inspect(part, point);
    });
    on(document, 'keydown', event => {
      if (event.key !== 'Escape' || dialog.open) return;
      if (!controls.hidden) {
        setControls(false);
        controlsToggle.focus();
      } else if (selected) resetWithFocus();
    });

    function draw(paint) {
      const { ctx, width, height } = drawing.size();
      const part = parts.find(item => item.id === selected);
      const zoom = part?.zoom || 1;
      const targetX = part ? clamp(width / 2 - zoom * (part.x + (selectedOffset?.x || 0)), width * (1 - zoom), 0) : 0;
      const targetY = part ? clamp(height / 2 - zoom * (part.y + (selectedOffset?.y || 0)), height * (1 - zoom), 0) : 0;
      camera.zoom = ease(camera.zoom, zoom, delta);
      camera.x = ease(camera.x, targetX, delta);
      camera.y = ease(camera.y, targetY, delta);
      camera.x = clamp(camera.x, width * (1 - camera.zoom), 0);
      camera.y = clamp(camera.y, height * (1 - camera.zoom), 0);
      ctx.save();
      ctx.translate(camera.x, camera.y);
      ctx.scale(camera.zoom, camera.zoom);
      paint(ctx, width, height);
      ctx.restore();

      const hovered = screenHit(pointer);
      canvas.classList.toggle('is-inspectable', Boolean(hovered));
      tip.hidden = !hovered;
      if (hovered) {
        setText(tip, hovered.tip || hovered.title);
        ctx.strokeStyle = topic.model === 'dna' ? '#0f4c5c' : topic.model === 'blackhole' ? '#fbc777' : '#9bdefa';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        const x = pointer.x;
        const y = pointer.y;
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.stroke();
      }
      const currentPart = parts.find(item => item.id === selected);
      if (currentPart) setText(byId('inspection-value'), currentPart.value || '');
    }

    const ui = {
      reduced, ease, draw,
      selected: () => selected,
      reset() { if (selected) inspect(null); },
      circle(x, y, radius) {
        return (px, py) => {
          const distance = Math.hypot(px - x, py - y) / radius;
          return distance <= 1 ? distance : Infinity;
        };
      },
      parts(items) {
        parts = items;
        const key = items.map(part => part.id).join(',');
        if (key === optionsKey) return;
        optionsKey = key;
        const prompt = element('option', '', 'Inspect a part');
        prompt.value = '';
        inspector.replaceChildren(prompt, ...items.map(part => {
          const option = element('option', '', part.option || part.title);
          option.value = part.id;
          return option;
        }));
        inspector.value = selected;
      },
      primary(button) { byId('primary-action').append(button); },
      setStage(index) {
        if (activeChapter === index) return;
        activeChapter = index;
        chapterElements.forEach((node, i) => node.classList.toggle('is-active', i === index));
        setText(counter, String(index + 1).padStart(2, '0') + ' / ' + String(chapterElements.length).padStart(2, '0'));
      },
      equation(index, value) { setText(equations[index], value); },
      range(label, min, max, step, initial, format, onChange) {
        const wrapper = element('label', 'range');
        const input = element('input');
        const display = element('output');
        const name = element('span', '', label);
        input.type = 'range';
        input.id = topic.id + '-range-' + label.toLowerCase().replace(/\W+/g, '-');
        input.min = min;
        input.max = max;
        input.step = step;
        input.setAttribute('aria-label', label);
        display.setAttribute('for', input.id);
        display.setAttribute('aria-hidden', 'true');
        wrapper.append(name, display, input);
        function update() {
          const formatted = format(Number(input.value));
          setText(display, formatted);
          input.setAttribute('aria-valuetext', formatted);
        }
        const control = {
          element: wrapper, input,
          get value() { return Number(input.value); },
          set(value) {
            const encoded = String(value);
            if (input.value !== encoded) input.value = encoded;
            update();
          }
        };
        control.set(initial);
        on(input, 'input', () => {
          update();
          onChange?.(control.value);
        });
        return control;
      },
      button(label, handler) {
        const button = element('button', '', label);
        button.type = 'button';
        on(button, 'click', handler);
        return button;
      },
      select(label, options, handler) {
        const select = element('select');
        select.setAttribute('aria-label', label);
        options.forEach(([value, caption]) => {
          const option = element('option', '', caption);
          option.value = value;
          select.append(option);
        });
        on(select, 'change', () => handler(select.value));
        return select;
      },
      readout(label) {
        const node = element('div');
        const value = element('dd');
        node.append(element('dt', '', label), value);
        return { node, set(text) { setText(value, text); } };
      },
      readouts(...items) {
        const list = element('dl', 'readouts');
        list.append(...items.map(item => item.node));
        controls.append(list);
      },
      row(...items) { addRow('control-row', items); },
      compact(...items) { addRow('control-row compact', items); }
    };

    function addRow(classes, items) {
      const row = element('div', classes);
      row.append(...items);
      controls.append(row);
    }

    const model = topic.exhibit.mount(ui);
    let raf = 0;
    let last = 0;
    let scroll = window.scrollY;
    let target = 0;
    let progress = 0;
    let chapter = 0;
    let needsMeasure = true;

    function measure() {
      const mobile = compactLayout.matches;
      const viewportHeight = innerHeight;
      const trigger = chapterElements[0].getBoundingClientRect().top + window.scrollY;
      const positions = chapterElements.map(node => node.getBoundingClientRect().top - trigger);
      const marks = topic.scrollStops || positions.map((_, index) => index / (positions.length - 1));
      let left = positions.findIndex(value => value > 0) - 1;
      if (positions.every(value => value <= 0)) left = positions.length - 1;
      if (left < 0) target = 0;
      else if (left >= positions.length - 1) target = 1;
      else target = marks[left] + (marks[left + 1] - marks[left]) *
        clamp(-positions[left] / (positions[left + 1] - positions[left] || 1));
      chapter = positions.reduce((closest, value, index) => Math.abs(value) < Math.abs(positions[closest]) ? index : closest, 0);
      if (topic.model === 'blackhole') {
        const threshold = mobile ? modelWindow.getBoundingClientRect().bottom + 54 : viewportHeight * 0.31;
        const span = viewportHeight * (mobile ? 0.31 : 0.26);
        const rects = chapterSlots.map(slot => slot.getBoundingClientRect());
        chapterSlots.forEach((slot, index) => {
          const rect = rects[index];
          const distance = clamp((threshold - rect.top) / span);
          const amount = reduced() ? 0 : distance ** 1.25;
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const direction = index % 2 === 0 ? 1 : -1;
          const x = (innerWidth / 2 - centerX) * amount;
          const y = (viewportHeight / 2 - centerY) * amount - Math.sin(Math.PI * amount) * 46;
          const rotation = direction * (amount * 82 + Math.sin(Math.PI * amount) * 18);
          const width = (1 - amount) ** 1.05;
          const height = (1 - amount) ** 0.8 * (1 + Math.sin(Math.PI * amount) * 0.72);
          const card = slot.firstElementChild;
          card.style.transform = amount ? 'translate(' + x + 'px,' + y + 'px) rotate(' + rotation +
            'deg) skewX(' + direction * 22 * Math.sin(Math.PI * amount) + 'deg) scale(' + width + ',' + height + ')' : '';
          slot.classList.toggle('is-pulling', amount > 0);
          card.style.opacity = amount ? String(clamp((1 - amount) * 1.8)) : '';
        });
      }
      needsMeasure = false;
    }

    on(window, 'scroll', () => {
      if (Math.abs(scroll - window.scrollY) >= 1) model.onScroll?.();
      scroll = window.scrollY;
      needsMeasure = true;
    }, { passive: true });
    on(window, 'resize', () => { needsMeasure = true; }, { passive: true });

    function frame(now) {
      if (document.hidden) {
        raf = 0;
        last = 0;
        return;
      }
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
      last = now;
      if (needsMeasure) measure();
      progress = ease(progress, target, dt);
      if (Math.abs(progress - target) < 0.0001) progress = target;
      if (topic.model !== 'dna') ui.setStage(chapter);
      delta = dt;
      model.frame(dt, progress, chapter);
      raf = requestAnimationFrame(frame);
    }

    on(document, 'visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
      } else if (!raf) {
        needsMeasure = true;
        raf = requestAnimationFrame(frame);
      }
    });
    raf = requestAnimationFrame(frame);

    return {
      dispose() {
        cancelAnimationFrame(raf);
        listenerScope.abort();
        drawing.dispose();
        model.dispose?.();
        inspect(null);
        setControls(false);
        tip.hidden = true;
        pointer = null;
        canvas.classList.remove('is-inspectable');
        inspector.replaceChildren();
        byId('primary-action').replaceChildren();
        controls.replaceChildren();
      }
    };
  }

  function route({ focus = false, initial = false } = {}) {
    const key = location.hash.slice(1);
    const next = topics.find(topic => topic.id === key) || null;
    if (next === activeTopic && !initial) return;
    session?.dispose();
    session = null;
    artwork.forEach(surface => surface.dispose());
    artwork = [];
    activeTopic = next;
    document.documentElement.dataset.theme = next?.id || 'home';
    document.querySelector('meta[name="theme-color"]').content =
      { 'black-hole': '#05060a', dna: '#f1f5f2', 'neural-networks': '#0a0e17' }[next?.id] || '#f7f6f2';
    home.hidden = Boolean(next);
    exhibit.hidden = !next;
    byId('browse-link').hidden = Boolean(next);
    byId('topic-label').hidden = !next;
    share.hidden = !next;
    sound.hidden = !next;
    toast.hidden = true;
    clearTimeout(timer);
    if (dialog.open) dialog.close();
    closeSearch();

    if (next) {
      setText(byId('topic-label'), next.title + ' · ' + next.tags);
      setText(title, next.title);
      setText(byId('mobile-title'), next.title);
      setText(byId('mobile-category'), next.subject);
      setText(byId('model-label'), next.label);
      setText(byId('model-hint'), next.hint);
      canvas.dataset.model = next.model;
      canvas.setAttribute('aria-label', next.label + ' visual model');
      soundLabel();
      document.title = next.title + ' — MORPH';
      cards(byId('related-cards'), topics.filter(topic => topic !== next));
      window.scrollTo(0, 0);
      session = mount(next);
      if (focus) title.focus({ preventScroll: true });
    } else {
      document.title = 'MORPH — Experience how things work';
      search.value = '';
      cards(byId('collection-cards'), topics);
      if (key === 'explore' || key === 'main') {
        requestAnimationFrame(() => byId(key).scrollIntoView());
      } else {
        window.scrollTo(0, 0);
      }
      if (focus) search.focus({ preventScroll: true });
    }
  }

  function commitLocation(key) {
    const url = new URL(location.href);
    url.hash = key;
    if (url.href !== location.href) history.pushState(null, '', url);
    if (!key && !activeTopic) window.scrollTo(0, 0);
    else route({ focus: true });
  }

  function cancelFusion() {
    if (!fusion) return;
    fusion.animations.forEach(animation => animation.cancel());
    fusion = null;
    byId('fusion-seed').hidden = true;
    document.body.classList.remove('is-fusing');
  }

  async function navigate(key) {
    if (fusion) {
      if (fusion.key === key) return;
      cancelFusion();
    }
    if (!key || activeTopic || reduced()) {
      MorphAudio.playSelect();
      commitLocation(key);
      return;
    }

    window.scrollTo(0, 0);
    closeSearch();
    search.blur();
    MorphAudio.playFusion();
    document.body.classList.add('is-fusing');
    const transition = { key, animations: [] };
    fusion = transition;
    const centerX = innerWidth / 2;
    const centerY = innerHeight / 2;
    const objects = [...home.querySelectorAll('.hero-title,.hero-tagline,.search-pill,.chips a')];
    const bounds = objects.map(node => node.getBoundingClientRect());
    transition.animations = objects.map((node, index) => {
      const rect = bounds[index];
      const isPill = node.classList.contains('search-pill');
      const x = centerX - (rect.left + rect.width / 2);
      const y = centerY - (rect.top + rect.height / 2);
      const scales = isPill ? (78 / rect.width) + ',' + (18 / rect.height) : '.07,.07';
      return node.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: 'translate(' + x + 'px,' + y + 'px) scale(' + scales + ')', opacity: isPill ? 1 : 0 }
      ], { duration: 650, easing: motionCurve, fill: 'forwards' });
    });
    await Promise.allSettled(transition.animations.map(animation => animation.finished));
    if (fusion !== transition) return;

    const seed = byId('fusion-seed');
    seed.hidden = false;
    commitLocation(key);
    const rect = modelWindow.getBoundingClientRect();
    const startX = Math.max(0, (rect.width - 78) / 2);
    const startY = Math.max(0, (rect.height - 18) / 2);
    transition.animations.push(
      modelWindow.animate([
        { clipPath: 'inset(' + startY + 'px ' + startX + 'px round 40px)' },
        { clipPath: 'inset(0px round 8px)' }
      ], { duration: 680, easing: motionCurve }),
      seed.animate([
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(1.45,2.4)', opacity: 0 }
      ], { duration: 210, easing: motionCurve, fill: 'forwards' }),
      stage.querySelector('.stage-dock').animate([{ opacity: 0 }, { opacity: 1 }],
        { duration: 460, delay: 190, fill: 'backwards', easing: motionCurve })
    );
    await Promise.allSettled(transition.animations.map(animation => animation.finished));
    if (fusion === transition) cancelFusion();
  }

  history.scrollRestoration = 'manual';
  function onHistory() {
    cancelFusion();
    route();
  }
  window.addEventListener('popstate', onHistory);
  window.addEventListener('hashchange', onHistory);
  window.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !fusion) return;
    cancelFusion();
    if (!activeTopic) search.focus({ preventScroll: true });
  });
  media.addEventListener('change', () => {
    if (!fusion || !reduced()) return;
    const { key } = fusion;
    cancelFusion();
    commitLocation(key);
  });
  route({ initial: true });
})();
