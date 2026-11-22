'use strict';

window.MorphNeural = (() => {
  const CYAN = '#38bdf8';
  const CORAL = '#f43f5e';
  const GOLD = '#fbbf24';
  const INPUTS = [0.22, 0.76, 0.4];
  const WEIGHTS = [
    [0.8, -0.5, 0.6, -0.4], [-0.6, 0.8, 0.5, 0.7], [0.4, 0.3, -0.5, 0.8],
    [0.9, -0.6], [-0.7, 0.8], [0.4, 0.5], [-0.4, 0.7]
  ];
  const BIASES = [-0.08, 0.04, -0.12, 0.06, -0.08, 0.12];
  const presets = {
    'High Contrast Edge': [0.95, 0.08, 0.92],
    'Balanced Signal': [0.50, 0.50, 0.50],
    'Noise Burst': [0.12, 0.97, 0.35]
  };
  const names = ['x₁', 'x₂', 'x₃', 'h₁', 'h₂', 'h₃', 'h₄', 'p₁', 'p₂'];

  function calculate(inputs, weights) {
    const hiddenSums = Array.from({ length: 4 }, (_, to) =>
      inputs.reduce((sum, input, from) => sum + input * weights[from][to], BIASES[to]));
    const hidden = hiddenSums.map(sum => Math.max(0, sum));
    const logits = Array.from({ length: 2 }, (_, to) =>
      hidden.reduce((sum, value, from) => sum + value * weights[from + 3][to], BIASES[to + 4]));
    const largest = Math.max(...logits);
    const exponents = logits.map(value => Math.exp(value - largest));
    const total = exponents[0] + exponents[1];
    return { hiddenSums, hidden, logits, probabilities: exponents.map(value => value / total) };
  }

  function geometry(w, h) {
    const radius = Math.max(12, Math.min(w * 0.047, h * 0.088, 25));
    const columns = [0.16, 0.5, 0.84];
    const counts = [3, 4, 2];
    const nodes = columns.flatMap((x, layer) => Array.from({ length: counts[layer] }, (_, index) => ({
      x: w * x, y: h * (0.18 + (index + 0.5) / counts[layer] * 0.78), layer
    })));
    const edges = WEIGHTS.flatMap((weights, from) => weights.map((_, to) => ({
      from, to: from < 3 ? to + 3 : to + 7, column: to, layer: from < 3 ? 0 : 1
    })));
    return { radius, nodes, edges };
  }

  function render(ctx, w, h, { inputs = INPUTS, weights = WEIGHTS, data = calculate(inputs, weights),
    pulse = Infinity, stage = -1, selected = -1, thumbnail = false } = {}) {
    const graph = geometry(w, h);
    const { radius, nodes, edges } = graph;
    ctx.fillStyle = '#0a0e17';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#1e3145';
    ctx.lineWidth = 0.55;
    ctx.beginPath();
    for (let x = 0.5; x < w; x += 19) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0.5; y < h; y += 19) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    function stroke(a, b, color, lineWidth) {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }

    if (!thumbnail) {
      ['INPUT', 'HIDDEN · ReLU', 'OUTPUT · SOFTMAX'].forEach((label, layer) => {
        ctx.font = '10px Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = layer === stage ? CYAN : '#9aafc4';
        ctx.fillText(label, w * [0.16, 0.5, 0.84][layer], h * 0.095, w * 0.30);
      });
    }

    const values = [...inputs, ...data.hidden, ...data.probabilities];
    edges.forEach((edge, index) => {
      const a = nodes[edge.from];
      const b = nodes[edge.to];
      const weight = weights[edge.from][edge.column];
      const magnitude = Math.abs(weight);
      const color = weight < 0 ? CORAL : CYAN;
      const chosen = index === selected;
      ctx.globalAlpha = chosen ? 0.95 : 0.16 + 0.51 * magnitude;
      ctx.setLineDash(weight === 0 ? [2, 4] : []);
      stroke(a, b, weight === 0 ? '#a1aebc' : color, 0.65 + magnitude * 2.2 + (chosen ? 1.7 : 0));
      ctx.setLineDash([]);
      if (chosen) {
        const mx = a.x + (b.x - a.x) * 0.44;
        const my = a.y + (b.y - a.y) * 0.44;
        ctx.fillStyle = '#101a27';
        ctx.fillRect(mx - 19, my - 9, 38, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = '11px Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(weight.toFixed(1), mx, my);
      }
      const travel = (pulse - edge.layer * 1.08) * (0.94 + magnitude * 0.52);
      if (travel >= 0 && travel <= 1 && magnitude > 0 && values[edge.from] > 0) {
        ctx.fillStyle = GOLD;
        ctx.globalAlpha = Math.min(1, 0.25 + magnitude * values[edge.from] * 0.75);
        ctx.shadowColor = GOLD;
        ctx.shadowBlur = 13;
        ctx.beginPath();
        ctx.arc(a.x + (b.x - a.x) * travel, a.y + (b.y - a.y) * travel, 1.4 + magnitude * 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;
    });

    nodes.forEach((node, index) => {
      const active = stage === node.layer;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = active ? '#133043' : '#142033';
      ctx.fill();
      ctx.strokeStyle = active ? CYAN : '#57748c';
      ctx.lineWidth = active ? 1.6 : 1;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = Math.max(8, Math.min(12, radius * 0.68)) + 'px Consolas, monospace';
      ctx.fillStyle = '#dff5ff';
      ctx.fillText(thumbnail ? names[index] : values[index].toFixed(2), node.x, node.y);
      if (!thumbnail && radius >= 14) {
        ctx.fillStyle = active ? CYAN : '#a3bad0';
        ctx.fillText(names[index], node.x + radius + 8, node.y - radius + 2);
      }
    });
    return graph;
  }

  function mount(ui) {
    const inputs = [...INPUTS];
    const weights = WEIGHTS.map(row => [...row]);
    let data = calculate(inputs, weights);
    let selected = 0;
    let pulse = Infinity;
    let drag = null;
    let graph;
    const edges = geometry(1, 1).edges;
    let preset;
    const inputControls = inputs.map((value, index) =>
      ui.range('Input ' + (index + 1), 0, 1, 0.01, value, n => n.toFixed(2), next => {
        inputs[index] = next;
        preset.value = '';
        fire();
      }));
    ui.row(...inputControls.map(control => control.element));
    preset = ui.select('Input preset', [['', 'Input presets'], ...Object.keys(presets).map(name => [name, name])], name => {
      if (!presets[name]) return;
      presets[name].forEach((value, index) => {
        inputs[index] = value;
        inputControls[index].set(value);
      });
      fire();
    });
    const edgeSelect = ui.select('Synaptic connection', edges.map((edge, index) => [
      String(index), names[edge.from] + ' to ' + names[edge.to]
    ]), value => choose(Number(value)));
    const weightControl = ui.range('Weight', -1, 1, 0.1, weights[0][0], value => value.toFixed(1), value => {
      const edge = edges[selected];
      weights[edge.from][edge.column] = value;
      fire();
    });
    const fireButton = ui.button('Fire signal pulse', fire);
    ui.compact(preset, fireButton);
    ui.row(edgeSelect, weightControl.element);

    function choose(index) {
      selected = index;
      edgeSelect.value = String(index);
      const edge = edges[index];
      weightControl.set(weights[edge.from][edge.column]);
    }

    function fire(animate = true) {
      data = calculate(inputs, weights);
      if (animate) {
        pulse = ui.reduced() ? Infinity : 0;
        MorphAudio.playSynapsePulse(Math.max(...data.probabilities));
      }
      const term = index => '(' + weights[index][0].toFixed(1) + ' × ' + inputs[index].toFixed(2) + ')';
      ui.equation(0, 'z₁ = ' + [0, 1, 2].map(term).join(' + ') + ' − 0.08 = ' + data.hiddenSums[0].toFixed(2));
      ui.equation(1, 'h₁ = ReLU(' + data.hiddenSums[0].toFixed(2) + ') = ' + data.hidden[0].toFixed(2));
      ui.equation(2, 'softmax([' + data.logits.map(value => value.toFixed(2)).join(', ') + ']) = [' +
        data.probabilities.map(value => value.toFixed(2)).join(', ') + ']');
    }

    function editInput(index, value) {
      const next = Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;
      if (inputs[index] === next) return;
      inputs[index] = next;
      inputControls[index].set(next);
      preset.value = '';
      fire();
    }

    ui.on(ui.canvas, 'pointerdown', event => {
      if (!graph || event.button !== 0 || drag) return;
      const { x, y } = ui.point(event);
      const node = graph.nodes.slice(0, 3).findIndex(point => Math.hypot(point.x - x, point.y - y) <= graph.radius + 6);
      if (node >= 0) {
        drag = { node, y, start: inputs[node], pointer: event.pointerId, moved: false };
        ui.canvas.setPointerCapture(event.pointerId);
        return;
      }

      let closest = 9;
      let match = -1;
      graph.edges.forEach((edge, index) => {
        const a = graph.nodes[edge.from];
        const b = graph.nodes[edge.to];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const along = ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy);
        if (along < 0.13 || along > 0.87) return;
        const distance = Math.hypot(x - a.x - along * dx, y - a.y - along * dy);
        if (distance < closest) {
          match = index;
          closest = distance;
        }
      });
      if (match < 0) return;
      const edge = edges[match];
      const current = weights[edge.from][edge.column];
      weights[edge.from][edge.column] = current >= 1 ? -1 : Math.min(1, Math.round((current + 0.5) * 10) / 10);
      choose(match);
      fire();
    });
    ui.on(ui.canvas, 'pointermove', event => {
      if (!drag || drag.pointer !== event.pointerId) return;
      const { y } = ui.point(event);
      if (Math.abs(drag.y - y) > 3) drag.moved = true;
      if (drag.moved) editInput(drag.node, drag.start + (drag.y - y) / 115);
    });
    ui.on(ui.canvas, 'pointerup', event => {
      if (!drag || drag.pointer !== event.pointerId) return;
      if (!drag.moved) editInput(drag.node, drag.start >= 0.99 ? 0 : drag.start + 0.25);
      drag = null;
    });
    ui.on(ui.canvas, 'lostpointercapture', () => { drag = null; });
    fire(false);

    return {
      frame(dt, _progress, stage) {
        if (Number.isFinite(pulse)) {
          pulse += dt;
          if (pulse > 2.2) pulse = Infinity;
        }
        const { ctx, width, height } = ui.size();
        graph = render(ctx, width, height, { inputs, weights, data, pulse, stage, selected });
      }
    };
  }

  return { render, mount };
})();
