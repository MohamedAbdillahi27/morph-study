'use strict';

(() => {
  const topics = [
    {
      id: 'black-hole', model: 'blackhole', title: 'Black Hole', subject: 'Astrophysics',
      tags: 'Field / Spatial', label: 'Gravitational field',
      intro: 'Follow light around a collapsed star and see how gravity changes the paths it takes and the time a nearby observer experiences.',
      hook: 'What happens when gravity bends the path of light?',
      hint: 'Tap the field to launch a photon. The paths illustrate bending and capture. The readouts use Schwarzschild physics.',
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
      hint: 'Scroll, play, or scrub to move through replication. Hover or tap a rung to inspect its bases.',
      keywords: 'dna,replication,genetics,helix,biology,genes,base pairs,adenine,cytosine,polymerase,helicase,nucleotides',
      exhibit: MorphDna, poster: { progress: 0.18, time: 2.3, thumbnail: true },
      scrollStops: [0, 0.4, 0.7, 1],
      chapters: [
        ['Intact double helix', 'DNA has two sugar–phosphate backbones. Between them, adenine pairs with thymine through two hydrogen bonds, while cytosine pairs with guanine through three.', 'Inspect several rungs and count their bond dots.'],
        ['Helicase unzips', 'Helicase separates the paired strands by breaking the hydrogen bonds between bases. The backbones stay intact as the opening becomes a Y-shaped replication fork.', 'Scrub between 25% and 55% to follow the fork.'],
        ['Polymerase adds bases', 'Each exposed strand serves as a template. DNA polymerase extends a new strand in the 5′ to 3′ direction. At a real fork, one new strand is made continuously and the other in short fragments. This model shows complementary pairing on both templates.', 'Watch which base joins each exposed nucleotide.'],
        ['Two identical helices', 'Each copy contains one original strand and one newly built strand. This is called semiconservative replication. Dark teal marks the original backbones and green marks the new ones.', 'Drag the slider backward to see how each copy came together.']
      ]
    },
    {
      id: 'neural-networks', model: 'neural', title: 'Neural Networks', subject: 'Computer science',
      tags: 'Network / Process', label: 'Feedforward network',
      intro: 'Send a signal through a small neural network and trace how inputs, weights, and activation functions shape a prediction.',
      hook: 'How do simple connected units turn signals into a prediction?',
      hint: 'Tap or drag inputs. Tap a connection to cycle its weight, or edit it below. Cyan adds and coral subtracts.',
      keywords: 'neural,ai,brain,deep learning,network,perceptron,weights,softmax,machine learning,relu',
      exhibit: MorphNeural, poster: { thumbnail: true },
      chapters: [
        ['Weighted inputs', 'A neuron multiplies each incoming value by its connection weight, adds the products, and then adds a bias. A positive weight pushes the sum up. A negative weight pushes it down.', 'Change an input or a weight and watch the live calculation for the first hidden neuron.'],
        ['Hidden layer and activation', 'Each hidden neuron applies ReLU to its sum. ReLU passes positive values through and turns negative values into zero. The four resulting activations are the inputs to the final layer.', 'Try making the first hidden neuron’s sum negative and watch its activation fall to zero.'],
        ['Output probability', 'The two output neurons produce scores called logits. Softmax converts those scores into two probabilities that add to one. The gap between the scores determines how strongly the network favors one output.', 'Try the same input with a different weight and compare the output probabilities.']
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
    const chapterElements = topic.chapters.map(([heading, description, instruction], index) => {
      const section = element('section', 'chapter');
      const inside = element('div', 'chapter-inner');
      inside.append(element('div', 'chapter-index', 'Chapter ' + (index + 1) + ' / ' + topic.chapters.length),
        element('h2', '', heading), element('p', '', description), element('p', 'try', instruction));
      if (topic.model === 'neural') inside.append(element('p', 'equation-live'));
      section.append(inside);
      return section;
    });
    byId('chapters').replaceChildren(...chapterElements);
    const equations = [...byId('chapters').querySelectorAll('.equation-live')];
    let activeChapter = -1;

    const ui = {
      canvas, on, reduced, ease, size: drawing.size,
      point(event) {
        const rect = canvas.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
      },
      tip(value) {
        setText(tip, value);
        tip.hidden = !value;
      },
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
      const mobile = matchMedia('(max-width: 690px)').matches;
      const stageBottom = stage.getBoundingClientRect().height +
        document.querySelector('.topbar').offsetHeight;
      const trigger = mobile ? Math.min(innerHeight * 0.84, stageBottom + 42) : innerHeight * 0.57;
      const positions = chapterElements.map(node => {
        const rect = node.firstElementChild.getBoundingClientRect();
        return rect.top + (mobile ? 35 : rect.height / 2) - trigger;
      });
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
      if (topic.model === 'blackhole' && !reduced()) {
        chapterElements.forEach((node, index) => {
          const pull = Math.max(0, 1 - Math.abs(index / (chapterElements.length - 1) - progress) * 3) * progress;
          node.style.setProperty('--bend', (-pull * 10).toFixed(1) + 'px');
          node.style.setProperty('--tilt', (-pull * 5).toFixed(1) + 'deg');
        });
      }
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
        ui.tip('');
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
      setText(byId('exhibit-category'), next.subject + ' / ' + next.tags);
      setText(title, next.title);
      setText(byId('exhibit-intro'), next.intro);
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
      artwork.push(surface(byId('hero-art'), (ctx, width, height) => {
        MorphBlackHole.render(ctx, width, height, { poster: true, time: 4.2, progress: 0.18 });
      }));
      cards(byId('collection-cards'), topics);
      if (key === 'explore' || key === 'main') {
        requestAnimationFrame(() => byId(key).scrollIntoView());
      } else {
        window.scrollTo(0, 0);
      }
      if (focus) search.focus({ preventScroll: true });
    }
  }

  function navigate(key) {
    const url = new URL(location.href);
    url.hash = key;
    if (url.href !== location.href) history.pushState(null, '', url);
    MorphAudio.playSelect();
    if (!key && !activeTopic) {
      window.scrollTo(0, 0);
      return;
    }
    route({ focus: true });
  }

  history.scrollRestoration = 'manual';
  window.addEventListener('popstate', () => route());
  window.addEventListener('hashchange', () => route());
  route({ initial: true });
})();
