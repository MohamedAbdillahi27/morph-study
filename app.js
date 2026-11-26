'use strict';

(() => {
  const topics = [
    {
      id: 'black-hole', model: 'blackhole', title: 'Black Hole', subject: 'Astrophysics',
      tags: 'Astrophysics',
      hook: 'What happens when gravity bends the path of light?',
      keywords: 'black hole,black holes,blackhole,kerr,schwarzschild,gravity,relativity,event horizon,space,singularity,light,photon,astronomy,astrophysics',
      exhibit: MorphBlackHole
    },
    {
      id: 'dna', model: 'dna', title: 'DNA Replication', subject: 'Molecular biology',
      tags: 'Anatomy / Process / Transformation', label: 'E. coli replication fork',
      intro: 'Follow one replication fork in the bacterium Escherichia coli to see how two opposing templates become two complete DNA duplexes.',
      hook: 'How can a cell copy a molecule strand by strand?',
      hint: 'Scroll through the fork, or inspect a base pair, enzyme, or fragment.',
      keywords: 'dna,replication,genetics,helix,biology,genes,base pairs,adenine,cytosine,polymerase,helicase,nucleotides',
      exhibit: MorphDna, poster: { progress: 0, thumbnail: true },
      scrollStops: [0, 0.4, 0.75, 1],
      chapters: [
        ['One double helix', 'This schematic follows one E. coli replication fork as it moves down the model. The two parental strands run in opposite directions. A pairs with T through two hydrogen bonds. G pairs with C through three.', 'Inspect a base pair to see how many hydrogen bonds join its bases.'],
        ['The fork opens', 'DNA gyrase relieves torsional strain ahead of the fork. DnaB moves 5′ → 3′ along the lagging template and separates the strands. SSB proteins stabilize exposed DNA.', 'At 40%, locate DnaB at the fork and gyrase ahead of it.'],
        ['Two ways to copy', 'DnaG primase makes RNA primers. DNA polymerase III extends new DNA 5′ → 3′. The leading strand grows continuously toward the fork. Each RNA-primed Okazaki fragment grows away from it.', 'At 75%, follow both arrows. Violet marks RNA primers and lighter teal marks new DNA.'],
        ['Two daughter duplexes', 'DNA polymerase I replaces RNA primers with DNA. LigA seals the remaining nicks. Each finished duplex contains one parental strand and one new strand. The schematic compresses timing and fragment length, and omits the physical template loop and flanking DNA.', 'Scrub backward to see why the primers have to be replaced before the nicks can be sealed.']
      ]
    },
    {
      id: 'neural-networks', model: 'neural', title: 'Neural Networks', subject: 'Computer science',
      keywords: 'neural,neural networks,neural network,ai,brain,deep learning,network,perceptron,weights,softmax,machine learning,relu',
      hook: 'How do simple connected units turn signals into a prediction?',
      exhibit: MorphNeural, poster: { thumbnail: true }
    }
  ];

  const byId = id => document.getElementById(id);
  const home = byId('home');
  const exhibit = byId('exhibit');
  const stage = byId('stage');
  const blackHole = byId('black-hole-exhibit');
  const blackHoleView = MorphBlackHoleStory.create(blackHole);
  const neural = byId('neural-exhibit');
  const neuralView = MorphNeuralStory.create(neural);
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

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function setText(node, value) {
    if (node.textContent !== value) node.textContent = value;
  }

  function canvasContext(node, options) {
    try { return node.getContext('2d', options); }
    catch { return null; }
  }

  function surface(node, onResize = () => {}, pixelBudget = Infinity) {
    const ctx = canvasContext(node, { alpha: true });
    if (!ctx) return null;
    let width = 1, height = 1, ratio = 0;
    function resize() {
      const rect = node.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const nextRatio = Math.min(window.devicePixelRatio || 1, Math.sqrt(pixelBudget / (rect.width * rect.height)));
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
      onResize(handler) { onResize = handler; },
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
      const thumbnail = surface(node, (ctx, width, height) => topic.exhibit.render(ctx, width, height, topic.poster));
      if (thumbnail) artwork.push(thumbnail);
      else node.hidden = true;
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
    const query = raw.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim().replace(/\s+/g, ' ').slice(0, 100);
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
      const empty = element('li', '', 'That topic isn’t in Morph yet. Try one of the three exhibits below.');
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

  byId('home-explore').addEventListener('click', () => byId('home-exhibits').querySelector('a').focus());
  byId('home-search').addEventListener('click', () => search.focus());

  document.addEventListener('keydown', event => {
    if (event.key !== '/' || event.altKey || event.metaKey || event.ctrlKey || document.querySelector('dialog[open]')) return;
    if (event.target.closest('input,select,textarea,[contenteditable]')) return;
    event.preventDefault();
    if (activeTopic) navigate('');
    else search.focus();
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
    navigate(hash, link, event.detail ? { x: event.clientX, y: event.clientY } : null);
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
    const isDna = topic.model === 'dna';
    const track = stage.parentElement;
    let dnaStart = 0;
    const dnaBeats = isDna ? [...stage.querySelectorAll('[data-replication-at]')] : [];
    const dnaMarks = dnaBeats.map(beat => Number(beat.dataset.replicationAt));
    let dnaOffsets = [];
    let currentDnaBeat = null;
    let dnaIdleAt = performance.now() + 450;
    let dnaOnscreen = true;
    const drawing = surface(canvas, undefined, isDna ? 1_900_000 : Infinity);
    const counter = byId('stage-counter');
    const tip = byId('model-tooltip');
    const inspection = byId('inspection');
    const inspector = byId('inspect-part');
    const inspectionControls = byId('inspection-controls');
    const reset = byId('reset-view');
    const controlsToggle = byId('controls-toggle');
    const panel = controls.parentElement;
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
      if (drawing) actionText.append(element('h3', '', 'Try it'), element('p', 'try', instruction));
      else action.hidden = topic.model !== 'dna' || index !== topic.chapters.length - 1;
      if (topic.model === 'dna' && index === topic.chapters.length - 1) {
        const sources = element('p', 'dna-sources');
        const fork = element('a', '', 'E. coli fork dynamics');
        const maturation = element('a', '', 'Fragment maturation');
        fork.href = 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2651573/';
        maturation.href = 'https://www.nature.com/articles/s41594-023-01071-y';
        sources.append(fork, document.createTextNode(' · '), maturation);
        actionText.append(sources);
      }
      if (topic.model === 'neural') actionText.append(element('p', 'equation-live'));
      action.append(actionText);
      section.append(slot, action);
      return section;
    });
    const chapters = byId('chapters');
    chapters.replaceChildren(...(isDna ? [] : chapterElements));
    const fallback = byId('canvas-fallback');
    stage.classList.toggle('is-static', !drawing);
    track.classList.toggle('dna-scroll-track', isDna && Boolean(drawing));
    fallback.hidden = Boolean(drawing);
    if (!drawing) {
      setText(byId('fallback-topic'), topic.title);
      return { dispose() { listenerScope.abort(); } };
    }
    const equations = [...chapters.querySelectorAll('.equation-live')];
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
    let manualZoom = 1;

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
      (isDna ? canvas : inspector).focus({ preventScroll: true });
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
      if (event.button !== 0) return;
      const point = localPoint(event);
      if (isDna) {
        drag = { pointerId: event.pointerId, x: point.x, update: model.orbit() };
        return;
      }
      if (event.pointerType !== 'mouse') return;
      const part = screenHit(point);
      if (part?.drag) drag = { pointerId: event.pointerId, y: point.y, update: part.drag() };
    });
    on(canvas, 'pointermove', event => {
      pointer = localPoint(event);
      if (drag?.pointerId !== event.pointerId) return;
      const offset = isDna ? pointer.x - drag.x : drag.y - pointer.y;
      if (!suppressClick && Math.abs(offset) <= 4) return;
      if (!suppressClick) {
        suppressClick = true;
        canvas.setPointerCapture(event.pointerId);
      }
      drag.update(offset);
    });
    on(canvas, 'pointerup', () => { drag = null; });
    on(canvas, 'pointercancel', () => { drag = null; });
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
      if (part || selected) {
        if (isDna) pointer = null;
        inspect(part, point);
      }
    });
    on(document, 'keydown', event => {
      if (event.key !== 'Escape' || dialog.open) return;
      if (!controls.hidden) {
        setControls(false);
        controlsToggle.focus();
      } else if (selected) resetWithFocus();
    });

    let lastDnaPaint = '';
    function draw(paint, backdrop, stateKey) {
      const { ctx, width, height } = drawing.size();
      const part = parts.find(item => item.id === selected && item.available !== false);
      const zoom = part?.zoom || manualZoom;
      function pan(length, anchor) {
        const offset = length / 2 - zoom * anchor;
        return isDna ? offset : clamp(offset, length * (1 - zoom), 0);
      }
      const targetX = pan(width, part ? part.x + (selectedOffset?.x || 0) : width / 2);
      const targetY = pan(height, part ? part.y + (selectedOffset?.y || 0) : height / 2);
      const immediate = isDna && reduced();
      camera.zoom = immediate ? zoom : ease(camera.zoom, zoom, delta);
      camera.x = immediate ? targetX : ease(camera.x, targetX, delta);
      camera.y = immediate ? targetY : ease(camera.y, targetY, delta);
      if (!isDna) {
        camera.x = clamp(camera.x, width * (1 - camera.zoom), 0);
        camera.y = clamp(camera.y, height * (1 - camera.zoom), 0);
      }
      if (isDna) {
        if (Math.abs(camera.zoom - zoom) < 0.0006) camera.zoom = zoom;
        if (Math.abs(camera.x - targetX) < 0.08) camera.x = targetX;
        if (Math.abs(camera.y - targetY) < 0.08) camera.y = targetY;
        const revision = [stateKey, width, height, canvas.width, canvas.height, camera.zoom, camera.x, camera.y,
          pointer?.x, pointer?.y].join('|');
        if (revision === lastDnaPaint) return;
        lastDnaPaint = revision;
        ctx.clearRect(0, 0, width, height);
      }
      backdrop?.(ctx, width, height);
      if (isDna) canvas.classList.toggle('is-zoomed', camera.zoom > 1.06);
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
        ctx.strokeStyle = topic.model === 'dna' ? '#426d64' : '#9bdefa';
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
      canIdleSpin: () => dnaOnscreen && !fusion && !selected && !drag && performance.now() >= dnaIdleAt,
      reset() { if (selected) inspect(null); },
      zoom(value) { manualZoom = value; },
      seek(value) {
        dnaProgress();
        window.scrollTo({ top: dnaStart + interpolate(clamp(value), dnaMarks, dnaOffsets), behavior: 'instant' });
      },
      circle(x, y, radius) {
        return (px, py) => {
          const distance = Math.hypot(px - x, py - y) / radius;
          return distance <= 1 ? distance : Infinity;
        };
      },
      parts(items) {
        parts = items;
        if (isDna && selected && !items.some(part => part.id === selected && part.available !== false)) inspect(null);
        const key = items.map(part => part.id + (part.available === false ? '-' : '+')).join(',');
        if (key === optionsKey) return;
        optionsKey = key;
        const prompt = element('option', '', 'Inspect a part');
        prompt.value = '';
        inspector.replaceChildren(prompt, ...items.map(part => {
          const option = element('option', '', part.option || part.title);
          option.value = part.id;
          option.disabled = part.available === false;
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
        if (topic.model === 'dna') setText(byId('model-label'), 'E. coli · ' + topic.chapters[index][0]);
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
      needsMeasure = false;
    }

    const dnaLayout = isDna ? new ResizeObserver(() => { needsMeasure = true; }) : null;
    const dnaVisibility = isDna && 'IntersectionObserver' in window ? new IntersectionObserver(([entry]) => {
      dnaOnscreen = entry.isIntersecting;
    }) : null;
    dnaVisibility?.observe(canvas);
    const dnaReveal = isDna && 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
      for (const { target, isIntersecting } of entries) {
        if (!isIntersecting) continue;
        target.classList.add('is-revealed');
        dnaReveal.unobserve(target);
      }
    }, { rootMargin: '0px 0px -14% 0px', threshold: 0.22 }) : null;
    if (dnaLayout) {
      dnaLayout.observe(stage);
      dnaBeats.slice(1).forEach(beat => dnaReveal?.observe(beat));
      on(window, 'scroll', () => {
        pointer = null;
        dnaIdleAt = performance.now() + 450;
      }, { passive: true });
    }

    function interpolate(value, stops, values) {
      if (value <= stops[0]) return values[0];
      const next = stops.findIndex(stop => stop >= value);
      if (next < 0) return values.at(-1);
      const fraction = (value - stops[next - 1]) / Math.max(0.00001, stops[next] - stops[next - 1]);
      return values[next - 1] + fraction * (values[next] - values[next - 1]);
    }

    function dnaProgress() {
      if (needsMeasure) {
        const header = document.querySelector('.topbar').offsetHeight;
        dnaStart = track.getBoundingClientRect().top + window.scrollY - header;
        const first = dnaBeats[0].getBoundingClientRect().top;
        dnaOffsets = dnaBeats.map(beat => beat.getBoundingClientRect().top - first);
        needsMeasure = false;
      }
      const value = interpolate(window.scrollY - dnaStart, dnaOffsets, dnaMarks);
      const beat = dnaBeats[dnaMarks.findLastIndex(mark => mark <= value)];
      if (beat !== currentDnaBeat) {
        currentDnaBeat?.classList.remove('is-current');
        beat.classList.add('is-current');
        currentDnaBeat = beat;
      }
      return value;
    }

    if (!isDna) on(window, 'scroll', () => {
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
      if (isDna) {
        progress = dnaProgress();
        if (!fusion) MorphWorld.live('dna', progress);
      }
      else {
        if (needsMeasure) measure();
        progress = ease(progress, target, dt);
        if (Math.abs(progress - target) < 0.0001) progress = target;
        ui.setStage(chapter);
      }
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
    if (isDna) frame(performance.now());
    else raf = requestAnimationFrame(frame);

    return {
      canReverse: () => camera.zoom < 1.0001 && !selected && model.canReverse?.(),
      idleOrbit: model.idleOrbit,
      dispose() {
        cancelAnimationFrame(raf);
        listenerScope.abort();
        drawing.dispose();
        model.dispose?.();
        dnaVisibility?.disconnect();
        dnaLayout?.disconnect();
        dnaReveal?.disconnect();
        currentDnaBeat?.classList.remove('is-current');
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

  function route({ focus = false, initial = false, blackHoleDrawing } = {}) {
    const key = location.hash.slice(1);
    const next = topics.find(topic => topic.id === key) || null;
    if (next === activeTopic && !initial) return;
    session?.dispose();
    session = null;
    artwork.forEach(surface => surface.dispose());
    artwork = [];
    activeTopic = next;
    const isBlackHole = next?.model === 'blackhole';
    const isNeural = next?.model === 'neural';
    blackHole.hidden = !isBlackHole;
    neural.hidden = !isNeural;
    stage.parentElement.hidden = isBlackHole || isNeural;
    exhibit.classList.toggle('is-dna', next?.id === 'dna');
    const root = document.documentElement;
    const directDna = initial && next?.id === 'dna';
    if (directDna || isBlackHole || isNeural) root.classList.add('dna-handoff');
    root.dataset.theme = next?.id || 'home';
    if (directDna || isBlackHole || isNeural) {
      // Apply the scene's background synchronously with its first rendered frame.
      getComputedStyle(root).getPropertyValue('--bg-primary');
      root.classList.remove('dna-handoff');
    }
    document.querySelector('meta[name="theme-color"]').content =
      next?.id === 'dna' ? getComputedStyle(root).getPropertyValue('--dna-background').trim() :
        { 'black-hole': MorphBlackHole.background, 'neural-networks': '#131a17' }[next?.id] || '#f7f6f2';
    if (!(fusion?.dna && !next)) MorphWorld.live(next?.id, 0);
    home.hidden = Boolean(next);
    exhibit.hidden = !next;
    byId('topic-label').hidden = !next || isBlackHole || isNeural;
    share.hidden = !next;
    sound.hidden = !next || isBlackHole || isNeural;
    toast.hidden = true;
    clearTimeout(timer);
    if (dialog.open) dialog.close();
    closeSearch();

    if (next) {
      setText(title, isBlackHole ? 'Black Holes' : next.title);
      soundLabel();
      document.title = next.title + ' — MORPH';
      cards(byId('related-cards'), topics.filter(topic => topic !== next));
      if (isBlackHole) {
        session = mountBlackHole(blackHoleDrawing);
        if (focus) title.focus({ preventScroll: true });
        return;
      }
      if (isNeural) {
        session = mountNeural();
        if (focus) title.focus({ preventScroll: true });
        return;
      }
      setText(byId('topic-label'), next.title + ' · ' + next.tags);
      setText(byId('mobile-title'), next.title);
      setText(byId('mobile-category'), next.subject);
      setText(byId('model-label'), next.label);
      setText(byId('model-hint'), next.hint);
      canvas.dataset.model = next.model;
      canvas.setAttribute('aria-label', next.label + ' visual model');
      session = mountDna(next);
      if (focus) title.focus({ preventScroll: true });
    } else {
      document.title = 'MORPH — Experience how things work';
      search.value = '';
      window.scrollTo(0, 0);
      if (focus) search.focus({ preventScroll: true });
    }
  }

  function mountDna(topic) {
    let entry = history.state?.dnaEntry;
    if (!entry) {
      entry = 'morph-dna-' + Date.now() + '-' + performance.now();
      history.replaceState({ ...history.state, dnaEntry: entry }, '');
    }
    let y = 0;
    try { y = Number(sessionStorage.getItem(entry)) || 0; }
    catch { /* The exhibit also works with storage disabled. */ }
    window.scrollTo(0, y);
    const scope = new AbortController();
    const { signal } = scope;
    const story = mount(topic);
    window.addEventListener('scroll', () => { y = window.scrollY; }, { signal, passive: true });
    function save() {
      try { sessionStorage.setItem(entry, String(y)); }
      catch { /* Scroll restoration is optional if storage is disabled. */ }
    }
    window.addEventListener('pagehide', save, { signal });
    return {
      canReverse: story.canReverse,
      idleOrbit: story.idleOrbit,
      dispose() {
        save();
        scope.abort();
        story.dispose();
      }
    };
  }

  function mountBlackHole(drawing) {
    let entry = history.state?.blackHoleEntry;
    if (!entry) {
      entry = 'morph-black-hole-' + Date.now() + '-' + performance.now();
      history.replaceState({ ...history.state, blackHoleEntry: entry }, '');
    }
    let y = 0;
    try { y = Number(sessionStorage.getItem(entry)) || 0; }
    catch { /* The exhibit also works with storage disabled. */ }
    window.scrollTo(0, y);
    const scope = new AbortController();
    const { signal } = scope;
    const remember = () => { y = window.scrollY; };
    function save() {
      try { sessionStorage.setItem(entry, String(y)); }
      catch { /* Scroll restoration is optional if storage is disabled. */ }
    }
    window.addEventListener('scroll', remember, { signal, passive: true });
    window.addEventListener('pagehide', save, { signal });
    const story = MorphBlackHoleStory.mount(blackHoleView, surface, drawing);
    return {
      dispose() {
        save();
        scope.abort();
        story.dispose();
      }
    };
  }

  function mountNeural() {
    let entry = history.state?.neuralEntry;
    if (!entry) {
      entry = 'morph-neural-' + Date.now() + '-' + performance.now();
      history.replaceState({ ...history.state, neuralEntry: entry }, '');
    }
    let previous;
    try { previous = JSON.parse(sessionStorage.getItem(entry)); }
    catch { /* Storage is optional. */ }
    window.scrollTo(0, previous?.scroll || 0);
    const story = MorphNeuralStory.mount(neuralView, {
      values: previous?.values, weight: previous?.weight, share: () => share.click()
    });
    const scope = new AbortController();
    let lastY = window.scrollY;
    window.addEventListener('scroll', () => { lastY = window.scrollY; }, {signal:scope.signal,passive:true});
    function save() {
      try { sessionStorage.setItem(entry, JSON.stringify({ ...story.state(), scroll:lastY })); }
      catch { /* Navigation still works with storage disabled. */ }
    }
    window.addEventListener('pagehide', save, {signal:scope.signal});
    return {
      dispose() {
        save();
        scope.abort();
        story.dispose();
      }
    };
  }

  function commitLocation(key, blackHoleDrawing) {
    const url = new URL(location.href);
    url.hash = key;
    if (url.href !== location.href) history.pushState(null, '', url);
    if (!key && !activeTopic) window.scrollTo(0, 0);
    else route({ focus: true, blackHoleDrawing });
  }

  function cancelFusion() {
    if (!fusion) return;
    fusion.animations.forEach(animation => animation.cancel());
    exhibit.classList.remove('dna-preview', 'dna-preview-endpoint', 'bh-preview', 'is-measuring-bh');
    exhibit.inert = false;
    if (!activeTopic) {
      exhibit.hidden = true;
      exhibit.classList.remove('is-dna');
    }
    document.documentElement.style.removeProperty('--scene-copy');
    if (fusion.dna) {
      cancelAnimationFrame(fusion.raf);
      fusion.abort.abort();
      fusion.endpoint?.dispose();
      const overlay = byId('dna-transition');
      overlay.hidden = true;
      overlay.style.visibility = '';
      byId('dna-skip').hidden = true;
      overlay.width = overlay.height = 1;
      document.documentElement.classList.remove('dna-handoff', 'dna-arrived');
      document.documentElement.style.removeProperty('--dna-shade');
      document.body.classList.remove('is-dna-fusing');
    }
    if (fusion.blackHole) {
      cancelAnimationFrame(fusion.raf);
      fusion.abort.abort();
      fusion.surface?.dispose();
      fusion.clearEndpoint();
      const overlay = byId('bh-transition');
      overlay.hidden = true;
      overlay.style.visibility = '';
      byId('bh-skip').hidden = true;
      document.documentElement.style.removeProperty('--bh-shade');
      document.body.classList.remove('is-bh-fusing');
    }
    fusion.clean?.();
    fusion = null;
    document.body.classList.remove('is-fusing');
    if (!activeTopic) MorphWorld.live(undefined, 0);
  }

  function measureSearch(pill, useValue = true) {
    const value = useValue && search.value;
    const style = value ? getComputedStyle(search) : getComputedStyle(search, '::placeholder');
    return {
      ...pill.getBoundingClientRect().toJSON(),
      input: search.getBoundingClientRect(),
      icon: pill.querySelector('svg').getBoundingClientRect(),
      submit: byId('search-submit').querySelector('svg').getBoundingClientRect(),
      color: style.color,
      font: style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily,
      fontSize: parseFloat(style.fontSize),
      text: value || search.placeholder
    };
  }

  function blackHoleTransition() {
    const key = 'black-hole';
    const overlay = byId('bh-transition');
    if (!MorphBlackHole.available() || !canvasContext(overlay) || !canvasContext(blackHoleView.canvas, { alpha: true })) {
      commitLocation(key);
      return;
    }
    const pill = home.querySelector('.search-pill');
    const skip = byId('bh-skip');
    const abort = new AbortController();
    const transition = { key, blackHole: true, animations: [], abort, raf: 0, clearEndpoint };
    fusion = transition;
    document.body.classList.add('is-bh-fusing');
    overlay.hidden = false;
    const model = MorphBlackHole;
    let bounds;
    let lastProgress = 0;
    let endpoint;
    const duration = 1680;

    function clearEndpoint() {
      if (!endpoint) return;
      endpoint.dispose();
      endpoint = null;
      exhibit.classList.remove('is-measuring-bh', 'is-bh-endpoint');
      exhibit.hidden = true;
      blackHole.hidden = true;
    }

    function showEndpoint() {
      if (endpoint) return;
      // Put the live canvas on screen at its measured destination. The viewport
      // morph surface is no longer painted, so the terminal pixels have one owner.
      exhibit.classList.add('is-measuring-bh', 'is-bh-endpoint');
      exhibit.hidden = false;
      blackHole.hidden = false;
      endpoint = surface(blackHoleView.canvas, (ctx, width, height) => {
        ctx.clearRect(0, 0, width, height);
        model.paint(ctx, width, height, 0, '');
      }, 1_900_000);
      overlay.style.visibility = 'hidden';
    }

    function measure() {
      const field = measureSearch(pill);
      const source = { ...field, input: field.input.left, icon: field.icon.left };
      // Measure the committed layout in viewport coordinates before making it visible.
      if (endpoint) return;
      exhibit.classList.add('is-measuring-bh');
      exhibit.hidden = false;
      blackHole.hidden = false;
      const target = blackHoleView.device.getBoundingClientRect();
      blackHole.hidden = true;
      exhibit.hidden = true;
      exhibit.classList.remove('is-measuring-bh');
      bounds = { source, target };
    }
    function sample(t, size = transition.surface?.size()) {
      if (!size || !bounds) return;
      const { ctx, width, height } = size;
      document.documentElement.style.setProperty('--bh-shade', model.shade(t) * 100 + '%');
      MorphWorld.transition(key, t, bounds.source, bounds.target);
      revealCopy(t, .78, .99);
      exhibit.classList.toggle('bh-preview', t > .78);
      exhibit.inert = true;
      if (t >= 1) {
        showEndpoint();
        return;
      }
      clearEndpoint();
      if (t > .78) {
        exhibit.hidden = false;
        blackHole.hidden = false;
        exhibit.classList.add('is-measuring-bh');
      }
      overlay.style.visibility = '';
      model.transition(ctx, width, height, bounds.source, bounds.target, t);
    }
    measure();
    transition.surface = surface(overlay, (ctx, width, height) => {
      measure();
      sample(lastProgress, { ctx, width, height });
    }, 1_900_000);
    const remeasure = () => { measure(); sample(lastProgress); };
    document.fonts.addEventListener('loadingdone', remeasure, { signal: abort.signal });
    window.addEventListener('resize', remeasure, { signal: abort.signal, passive: true });
    window.addEventListener('scroll', remeasure, { signal: abort.signal, passive: true });
    sample(0);
    skip.hidden = false;
    skip.addEventListener('click', () => { sample(1); finish(); }, { signal: abort.signal });
    skip.focus({ preventScroll: true });
    for (const item of home.querySelectorAll('.hero-title, .hero-tagline, .chips')) {
      transition.animations.push(item.animate([{ opacity: 1 }, { opacity: 0 }],
        { duration: 620, delay: 255, fill: 'both' }));
    }
    transition.animations.push(pill.animate([{ opacity: 0 }, { opacity: 0 }], { duration, fill: 'both' }));
    const start = performance.now();
    function finish() {
      // Transfer the live surface as is. Its first frame is already painted.
      const drawing = endpoint;
      endpoint = null;
      exhibit.classList.remove('is-measuring-bh', 'is-bh-endpoint');
      cancelFusion();
      commitLocation(key, drawing);
    }
    function frame(now) {
      if (fusion !== transition) return;
      lastProgress = clamp((now - start) / duration);
      sample(lastProgress);
      if (lastProgress < 1) {
        transition.raf = requestAnimationFrame(frame);
        return;
      }
      finish();
    }
    transition.raf = requestAnimationFrame(frame);
  }

  function revealCopy(t, start, end) {
    const q = clamp((t - start) / (end - start));
    document.documentElement.style.setProperty('--scene-copy', (q * q * (3 - 2 * q)).toFixed(3));
  }

  function dnaTransition(reverse = false) {
    const orbit = reverse ? session.idleOrbit() : 0;
    const overlay = byId('dna-transition');
    const ctx = canvasContext(overlay);
    const key = reverse ? '' : 'dna';
    if (!ctx || !canvasContext(canvas, { alpha: true })) {
      commitLocation(key);
      return;
    }
    const pill = home.querySelector('.search-pill');
    const text = (!reverse && search.value) || search.placeholder;
    const skip = byId('dna-skip');
    const transition = { key, dna: true, animations: [], abort: new AbortController(), raf: 0 };
    fusion = transition;
    document.body.classList.add('is-dna-fusing');
    overlay.hidden = false;
    function measured(container, read) {
      if (!container.hidden) return read();
      container.classList.add('measuring-dna');
      container.hidden = false;
      const result = read();
      container.hidden = true;
      container.classList.remove('measuring-dna');
      return result;
    }
    const measure = () => {
      const source = measured(home, () => {
        const field = measureSearch(pill, !reverse);
        return {
          ...field,
          textColor: field.color,
          textOffset: field.input.left - field.left,
          textRight: field.input.right
        };
      });
      const wasDna = exhibit.classList.contains('is-dna');
      exhibit.classList.add('is-dna');
      const destination = measured(exhibit, () => canvas.getBoundingClientRect());
      if (!wasDna) exhibit.classList.remove('is-dna');
      const { width, height } = overlay.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, Math.sqrt(1_900_000 / (width * height)));
      overlay.width = Math.max(1, Math.round(width * ratio));
      overlay.height = Math.max(1, Math.round(height * ratio));
      ctx.setTransform(overlay.width / width, 0, 0, overlay.height / height, 0, 0);
      return { source, destination, width, height };
    };
    let bounds = measure();
    function sample(t) {
      document.documentElement.style.setProperty('--dna-shade', (MorphDna.transitionShade(t) * 100) + '%');
      MorphWorld.transition('dna', t);
      if (!reverse) {
        const seen = t > .76;
        revealCopy(t, .76, 1);
        exhibit.classList.toggle('dna-preview', seen);
        exhibit.classList.toggle('is-dna', seen);
        exhibit.hidden = !seen;
        exhibit.inert = seen;
        exhibit.classList.toggle('dna-preview-endpoint', t === 1);
        if (t === 1) {
          transition.endpoint ??= surface(canvas, (ctx, width, height) => {
            ctx.clearRect(0, 0, width, height);
            MorphDna.render(ctx, width, height);
          }, 1_900_000);
        } else {
          transition.endpoint?.dispose();
          transition.endpoint = null;
        }
        overlay.style.visibility = transition.endpoint ? 'hidden' : '';
        if (transition.endpoint) return;
      }
      MorphDna.transition(ctx, bounds.width, bounds.height, bounds.source, bounds.destination, text, t, orbit);
    }
    function finish() {
      const root = document.documentElement;
      root.classList.add('dna-handoff');
      root.style.setProperty('--dna-shade', '100%');
      exhibit.classList.remove('dna-preview', 'dna-preview-endpoint');
      exhibit.inert = false;
      // Mount paints progress zero synchronously. The live model supplies the
      // terminal frame, so the following frame retains the same painted surface.
      commitLocation(key);
      root.classList.add('dna-arrived');
      transition.raf = requestAnimationFrame(() => {
        if (fusion === transition) cancelFusion();
      });
    }
    sample(reverse ? 1 : 0);
    const start = performance.now();
    const vanish = reverse ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }];
    for (const item of home.querySelectorAll('.hero-title, .hero-tagline, .chips')) {
      transition.animations.push(item.animate(vanish,
        { duration: reverse ? 290 : 320, delay: reverse ? 410 : 125, fill: 'both' }));
    }
    transition.animations.push(pill.animate([{ opacity: 0 }, { opacity: 0 }],
      { duration: reverse ? 760 : 1120, fill: 'both' }));
    if (reverse) {
      document.documentElement.classList.add('dna-handoff');
      commitLocation(key);
    }
    function paint(now) {
      if (fusion !== transition) return;
      const progress = clamp((now - start) / (reverse ? 760 : 1120));
      if (progress < 1) {
        sample(reverse ? 1 - progress : progress);
        transition.raf = requestAnimationFrame(paint);
      } else if (reverse) {
        cancelFusion();
      } else {
        sample(1);
        finish();
      }
    }
    const remeasure = () => { bounds = measure(); };
    const listen = { signal: transition.abort.signal };
    if (!reverse) {
      skip.hidden = false;
      skip.addEventListener('click', () => {
        cancelAnimationFrame(transition.raf);
        sample(1);
        finish();
      }, listen);
      skip.focus({ preventScroll: true });
    }
    window.addEventListener('resize', remeasure, listen);
    document.fonts.addEventListener('loadingdone', remeasure, listen);
    transition.raf = requestAnimationFrame(paint);
  }

  function neuralTransition() {
    const key='neural-networks';
    if (typeof SVGSVGElement === 'undefined') {
      document.body.classList.remove('is-fusing');
      commitLocation(key);
      return;
    }
    const overlay=byId('nn-overlay');
    const skip=byId('nn-skip');
    const pill=home.querySelector('.search-pill');
    const { scene,device }=neuralView;
    const abort=new AbortController();
    const transition={ key,animations:[],raf:0,clean };
    const duration=1530;
    let source,target,geometry,bounds,endpoint=false;
    let t=0;
    fusion=transition;
    document.body.classList.add('is-nn-fusing');

    function preview(on) {
      exhibit.classList.toggle('nn-measuring',on);
      exhibit.hidden=!on;
      neural.hidden=!on;
    }

    function measure() {
      source=measureSearch(pill);
      if(!endpoint)preview(true);
      target=device.getBoundingClientRect();
      if(!endpoint)preview(false);
      geometry=MorphNeuralGraph.computeNeuralOpeningGeometry(target.width,target.height);
      bounds=overlay.getBoundingClientRect();
    }

    function sample(progress) {
      t=progress;
      document.documentElement.style.setProperty('--nn-fade',String(progress*100)+'%');
      MorphWorld.transition(key, progress);
      revealCopy(progress, .73, .985);
      exhibit.inert = true;
      if(progress>=1) {
        endpoint=true;
        preview(true);
        exhibit.classList.add('nn-endpoint');
        home.hidden=true;
        device.prepend(scene.root);
        scene.layout(geometry);
        scene.showLive();
        scene.paint(geometry,MorphNeural.inputs,MorphNeural.calculate(),0);
        return;
      }
      if(endpoint) {
        endpoint=false;
        exhibit.classList.remove('nn-endpoint');
        home.hidden=false;
        overlay.append(scene.root);
        preview(false);
      }
      preview(progress > .73);
      scene.morph(bounds.width,bounds.height,source,target,geometry,progress);
    }

    function clean() {
      abort.abort();
      cancelAnimationFrame(transition.raf);
      device.prepend(scene.root);
      exhibit.classList.remove('nn-endpoint');
      home.hidden=false;
      preview(false);
      overlay.hidden=true;
      skip.hidden=true;
      document.documentElement.style.removeProperty('--nn-fade');
      document.body.classList.remove('is-nn-fusing');
    }

    function finish() {
      cancelFusion();
      commitLocation(key);
    }

    overlay.hidden=false;
    overlay.append(scene.root);
    scene.showLive();
    measure();
    scene.layout(geometry);
    scene.paint(geometry,MorphNeural.inputs,MorphNeural.calculate(),0);
    sample(0);
    for(const item of home.querySelectorAll('.hero-title, .hero-tagline, .chips')) {
      transition.animations.push(item.animate([{opacity:1},{opacity:0}],
        {duration:500,delay:155,fill:'both'}));
    }
    transition.animations.push(pill.animate([{opacity:0},{opacity:0}],{duration,fill:'both'}));
    skip.hidden=false;
    skip.addEventListener('click',()=>{sample(1);finish();},{signal:abort.signal});
    skip.focus({preventScroll:true});
    const remeasure=()=>{measure();sample(t);};
    window.addEventListener('resize',remeasure,{signal:abort.signal,passive:true});
    document.fonts.addEventListener('loadingdone',remeasure,{signal:abort.signal});
    const start=performance.now();
    function frame(now) {
      if(fusion!==transition)return;
      const progress=clamp((now-start)/duration);
      sample(progress);
      if(progress===1) finish();
      else transition.raf=requestAnimationFrame(frame);
    }
    transition.raf=requestAnimationFrame(frame);
  }

  function blackHoleCardTransition(link, pointer) {
    const key = 'black-hole';
    const model = MorphBlackHole;
    const overlay = byId('bh-transition');
    const card = link.getBoundingClientRect();
    const point = pointer || { x: card.left + card.width / 2, y: card.top + card.height / 2 };
    const origin = { x: clamp(point.x, 0, window.innerWidth), y: clamp(point.y, 0, window.innerHeight) };
    overlay.hidden = false;
    const drawing = surface(overlay, undefined, 1_300_000);
    if (!drawing) {
      overlay.hidden = true;
      commitLocation(key);
      return;
    }

    const transition = { key, animations: [], raf: 0, clean() {
      cancelAnimationFrame(transition.raf);
      drawing.dispose();
      overlay.hidden = true;
      overlay.style.pointerEvents = '';
      overlay.style.backgroundColor = '';
      overlay.width = overlay.height = 1;
    } };
    fusion = transition;
    document.body.classList.add('is-fusing');
    overlay.style.pointerEvents = 'auto';

    function spread(t) {
      const size = drawing.size();
      const { ctx, width, height } = size;
      const x = clamp(origin.x, 0, width);
      const y = clamp(origin.y, 0, height);
      const reach = Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
      const radius = 6 + reach * 1.23 * t * t * (3 - 2 * t);
      const feather = Math.min(radius * .5, 26 + reach * .02);
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = MorphBlackHole.background;
      // Multiple contours feather the curved front without drawing ripple lines.
      for (const edge of [1, .75, .5, .25, 0]) {
        ctx.globalAlpha = edge ? .22 : 1;
        ctx.beginPath();
        for (let i = 0; i < 96; i++) {
          const angle = i * Math.PI / 48;
          const bend = angle + t * .65;
          const shape = 1 + .105 * Math.sin(bend * 3 + .7) +
            .042 * Math.sin(bend * 5 - .9) + .026 * Math.cos(bend - .4);
          const r = radius * shape + edge * feather;
          const px = x + Math.cos(angle) * r;
          const py = y + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function arrive() {
      const { ctx, width, height } = drawing.size();
      ctx.fillStyle = model.background;
      ctx.fillRect(0, 0, width, height);
      overlay.style.backgroundColor = model.background;
      document.body.classList.remove('is-fusing');
      commitLocation(key);
      window.scrollTo({ top: 0, behavior: 'instant' });
      transition.raf = requestAnimationFrame(() => {
        if (fusion !== transition) return;
        window.scrollTo({ top: 0, behavior: 'instant' });
        const reveal = overlay.animate([{ opacity: 1 }, { opacity: 0 }],
          { delay: 60, duration: 490, easing: 'cubic-bezier(.35,0,.24,1)', fill: 'both' });
        transition.animations.push(reveal);
        reveal.finished.then(() => {
          if (fusion === transition) cancelFusion();
        }, () => {});
      });
    }

    const start = performance.now();
    function frame(now) {
      if (fusion !== transition) return;
      const t = clamp((now - start) / 720);
      spread(t);
      if (t === 1) arrive();
      else transition.raf = requestAnimationFrame(frame);
    }
    spread(0);
    transition.raf = requestAnimationFrame(frame);
  }

  function neuralCardTransition() {
    const key = 'neural-networks';
    const overlay = element('div', 'nn-rewrite');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.append(overlay);
    const transition = { key, animations: [], raf: 0, clean() {
      cancelAnimationFrame(transition.raf);
      overlay.remove();
      neuralView.device.style.removeProperty('clip-path');
      neuralView.device.style.removeProperty('opacity');
    } };
    fusion = transition;
    document.body.classList.add('is-fusing');

    function measure(node) {
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return { x: box.left, y: box.top, width: box.width, height: box.height,
        font: style.font, size: parseFloat(style.fontSize), color: style.color,
        spacing: style.letterSpacing, transform: style.textTransform };
    }
    function place(line, rect) {
      Object.assign(line.style, {
        left: rect.x + 'px', top: rect.y + 'px', width: rect.width + 'px',
        maxHeight: rect.height + 'px'
      });
    }
    function hide(node) {
      transition.animations.push(node.animate([{ opacity: 0 }, { opacity: 0 }],
        { duration: 1800, fill: 'both' }));
    }
    const origins = [...exhibit.querySelectorAll(
      '.dna-beat :is(h2,p),.bh-copy :is(h2,p),.related :is(h2,h3,p,.card-area)'
    )].map(node => ({ node, rect: measure(node) })).filter(({ node, rect }) =>
      rect.width > 0 && rect.height > 0 && rect.y < innerHeight && rect.y+rect.height > 0 && node.textContent.trim()
    ).slice(-14);
    const destinations = [
      neural.querySelector('.nn-title'), neural.querySelector('.nn-deck'), neural.querySelector('.nn-index'),
      neural.querySelector('.nn-beat > h2'), neural.querySelector('.nn-beat > p')
    ];
    const sourceHeading = origins.find(({ node })=>node.matches('.related h2')) ||
      origins.find(({ node })=>node.matches('h2,h3'));
    const remaining = origins.filter(origin=>origin!==sourceHeading);
    const picks = [
      sourceHeading,
      remaining.find(({node})=>node.matches('p')),
      remaining.find(({node})=>node.matches('.dna-kicker,.card-area')),
      remaining.find(({node})=>node.matches('h2,h3'))
    ];
    picks.push(remaining.find(origin=>!picks.includes(origin)&&origin.node.matches('p')));
    const lines = origins.map((entry, index) => {
      const {node,rect}=entry;
      const slot=picks.indexOf(entry);
      const target=destinations[slot < 0 ? index % destinations.length : slot];
      const before = node.textContent.trim().replace(/\s+/g, ' ');
      const line=element('span','nn-rewrite-line',before);
      Object.assign(line.style,{font:rect.font,letterSpacing:rect.spacing,textTransform:rect.transform,color:rect.color});
      place(line, rect);
      overlay.append(line);
      hide(node);
      return {line,rect,before:Array.from(before),after:Array.from(target.textContent),target:slot<0?null:target,end:null};
    });

    let arrived=false;
    const start=performance.now();
    const mix=(a,b,t)=>a+(b-a)*t;
    function rewrite(now) {
      if(fusion!==transition)return;
      const t=clamp((now-start)/1260);
      const handoff=.60;
      if(t>=handoff&&!arrived){
        arrived=true;
        commitLocation(key);
        window.scrollTo({top:0,behavior:'instant'});
        for(const entry of lines){
          if(!entry.target)continue;
          entry.end=measure(entry.target);
          hide(entry.target);
        }
      }
      const slide=clamp((t-handoff)/(1-handoff));
      const settle=slide*slide*(3-2*slide);
      overlay.style.setProperty('--rewrite-veil', String(t<handoff?t/handoff:1-settle));
      if(arrived){
        if(window.scrollY){
          window.scrollTo({top:0,behavior:'instant'});
          for(const entry of lines)if(entry.target)entry.end=measure(entry.target);
        }
        neuralView.device.style.clipPath='inset(0 '+((1-settle)*100)+'% 0 0)';
        neuralView.device.style.opacity=String(Math.min(1,settle*1.75));
      }
      for(const [index,entry] of lines.entries()){
        const {line,before,after,rect,end}=entry;
        const amount=clamp((t-index*.009)/.49);
        const written=Math.floor(after.length*amount);
        const erased=Math.floor(before.length*amount);
        line.textContent=after.slice(0,written).join('')+
          (amount>0&&amount<1?'▏':'')+before.slice(erased).join('');
        if(amount>.24)line.style.color='#e7f3eb';
        if(end){
          place(line,{
            x:mix(rect.x,end.x,settle),y:mix(rect.y,end.y,settle),
            width:mix(rect.width,end.width,settle),height:mix(rect.height,end.height,settle)
          });
          line.style.fontSize=mix(rect.size,end.size,settle)+'px';
          if(slide>.2){
            line.style.textTransform=end.transform;
            line.style.letterSpacing=end.spacing;
          }
        }else if(arrived){
          line.style.opacity=String(1-settle);
        }
      }
      if(t===1)cancelFusion();
      else transition.raf=requestAnimationFrame(rewrite);
    }
    transition.raf=requestAnimationFrame(rewrite);
  }

  function unzipDnaCard() {
    const key = 'dna';
    const sheet = [...document.styleSheets].find(item => item.href && new URL(item.href).pathname.endsWith('/style.css'));
    if (!sheet || typeof CSSStyleSheet.prototype.replaceSync !== 'function') {
      commitLocation(key);
      return;
    }
    const styles = new CSSStyleSheet();
    styles.replaceSync([...sheet.cssRules].map(rule => rule.cssText).join('\n'));

    const overlay = element('div', 'dna-unzip');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.inert = true;
    const outline = element('canvas', 'dna-unzip-outline');
    const bodyStyle = getComputedStyle(document.body);
    const oldTheme = Object.fromEntries([...bodyStyle].filter(name => name.startsWith('--'))
      .map(name => [name, bodyStyle.getPropertyValue(name)]));
    const copies = [byId('scene-world'), document.querySelector('.topbar'), exhibit].filter(node => !node.hidden)
      .map(node => ({ node, rect: node.getBoundingClientRect() }));
    const panes = [-1, 1, 0].map(side => {
      const pane = element('div', 'dna-unzip-pane');
      const shadow = pane.attachShadow({ mode: 'open' });
      shadow.adoptedStyleSheets = [styles];
      const face = element('div', 'dna-unzip-face');
      Object.assign(face.style, { position: 'absolute', inset: '0', font: bodyStyle.font,
        color: bodyStyle.color, background: bodyStyle.backgroundColor });
      for (const [name, value] of Object.entries(oldTheme)) face.style.setProperty(name, value);
      for (const { node, rect } of copies) {
        const clone = node.cloneNode(true);
        Object.assign(clone.style, { position: 'absolute', inset: 'auto', margin: '0',
          top: rect.top + 'px', left: rect.left + 'px', width: rect.width + 'px' });
        const originals = node.matches('canvas') ? [node] : [...node.querySelectorAll('canvas')];
        const snapshots = clone.matches('canvas') ? [clone] : [...clone.querySelectorAll('canvas')];
        originals.forEach((canvas, i) => {
          if (canvas.width && canvas.height) snapshots[i].getContext('2d').drawImage(canvas, 0, 0);
        });
        face.append(clone);
      }
      shadow.append(face);
      overlay.append(pane);
      return { pane, face, side };
    });
    overlay.append(outline);
    document.body.append(overlay);

    const ink = surface(outline, undefined, 1_200_000);
    if (!ink) {
      overlay.remove();
      commitLocation(key);
      return;
    }
    const transition = { key, animations: [], raf: 0, clean() {
      cancelAnimationFrame(transition.raf);
      ink.dispose();
      overlay.remove();
    } };
    fusion = transition;
    commitLocation(key);
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.body.classList.add('is-fusing');

    const smooth = x => { const t = clamp(x); return t * t * (3 - 2 * t); };
    function unzip(t) {
      const { ctx, width, height } = ink.size();
      const head = height + 24 - (height + 52) * smooth(t / .88);
      const letGo = smooth((t - .70) / .30);
      const seam = y => width * .5 + Math.sin(y / height * Math.PI * 2 + t * 3) * width * .014;
      const gap = y => {
        const release = Math.max(0, (y - head) / (height * .45));
        const spring = 1 - Math.exp(-3.3 * release) * Math.cos(3.2 * release);
        return spring * width * .38 + letGo * width * .25;
      };
      const samples = Array.from({ length: 41 }, (_, i) => i * height / 40);
      if (head > 0 && head < height) samples.push(head);
      samples.sort((a, b) => a - b);
      ctx.clearRect(0, 0, width, height);
      for (const { pane, face, side } of panes) {
        if (side === 0) {
          // The still-zipped area keeps the source page as one continuous sheet.
          pane.style.clipPath = 'inset(0 0 ' + (height - clamp(head, 0, height)) + 'px 0)';
          continue;
        }
        const edge = samples.map(y => [seam(y) + side * gap(y), y]);
        const wall = side < 0 ? 0 : width;
        const polygon = [[wall, 0], ...edge, [wall, height]];
        pane.style.clipPath = 'polygon(' + polygon.map(([x,y]) => x + 'px ' + y + 'px').join(',') + ')';
        const pull = smooth((height - head) / (height * .85));
        const hinge = seam(head);
        face.style.clipPath = side < 0 ? 'inset(0 '+(width-hinge)+'px 0 0)' : 'inset(0 0 0 '+hinge+'px)';
        face.style.transformOrigin = hinge + 'px ' + Math.max(0, head) + 'px';
        face.style.transform = 'translateX(' + side * letGo * width * .25 +
          'px) skewX(' + side * 17 * pull + 'deg) rotate(' + side * -3 * pull + 'deg)';
        ctx.beginPath();
        for (const [x, y] of edge) {
          if (y < head) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(26,65,62,.38)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      const x = seam(head);
      ctx.beginPath();
      ctx.moveTo(x, head - 13);
      ctx.lineTo(x + 12, head + 9);
      ctx.lineTo(x - 12, head + 9);
      ctx.closePath();
      ctx.fillStyle = '#85c7af';
      ctx.strokeStyle = '#174d55';
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
    }

    const start = performance.now();
    function frame(now) {
      if (fusion !== transition) return;
      if (window.scrollY) window.scrollTo({ top: 0, behavior: 'instant' });
      const t = clamp((now - start) / 1370);
      unzip(t);
      if (t === 1) cancelFusion();
      else transition.raf = requestAnimationFrame(frame);
    }
    unzip(0);
    transition.raf = requestAnimationFrame(frame);
  }

  function navigate(key, link, pointer) {
    if (fusion) {
      if (fusion.key === key) return;
      cancelFusion();
    }
    if (!key && activeTopic?.id === 'dna' && !reduced() && session?.canReverse()) {
      document.body.classList.add('is-fusing');
      MorphAudio.playSelect();
      dnaTransition(true);
      if (!fusion) document.body.classList.remove('is-fusing');
      return;
    }
    if (key === 'black-hole' && link?.matches('.card') && !reduced()) {
      MorphAudio.playFusion();
      blackHoleCardTransition(link, pointer);
      return;
    }
    if (key === 'neural-networks' && link?.matches('#related-cards .card') && !reduced()) {
      MorphAudio.playFusion();
      neuralCardTransition();
      return;
    }
    if (key === 'dna' && link?.matches('#related-cards .card') && !reduced()) {
      MorphAudio.playFusion();
      unzipDnaCard();
      return;
    }
    if (!key || activeTopic || reduced()) {
      MorphAudio.playSelect();
      commitLocation(key);
      return;
    }

    if (key !== 'black-hole') window.scrollTo(0, 0);
    closeSearch();
    search.blur();
    MorphAudio.playFusion();
    document.body.classList.add('is-fusing');
    if (key === 'dna') {
      dnaTransition();
      if (!fusion) document.body.classList.remove('is-fusing');
      return;
    }
    if (key === 'black-hole') {
      blackHoleTransition();
      if (!fusion) document.body.classList.remove('is-fusing');
      return;
    }
    neuralTransition();
  }

  history.scrollRestoration = 'manual';
  function onHistory() {
    cancelFusion();
    route({ focus: true });
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
