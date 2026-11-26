'use strict';

window.MorphNeural = (() => {
  const POSITIVE = '#87dbaa';
  const NEGATIVE = '#e5a58e';
  const INPUTS = [0.22, 0.76, 0.4];
  const WEIGHTS = [
    [0.8, -0.5, 0.6, -0.4], [-0.6, 0.8, 0.5, 0.7], [0.4, 0.3, -0.5, 0.8],
    [0.9, -0.6], [-0.7, 0.8], [0.4, 0.5], [-0.4, 0.7]
  ];
  const BIASES = [-0.08, 0.04, -0.12, 0.06, -0.08, 0.12];
  const names = ['x₁', 'x₂', 'x₃', 'h₁', 'h₂', 'h₃', 'h₄', 'p₁', 'p₂'];

  function calculate(inputs = INPUTS, weights = WEIGHTS) {
    const hiddenSums = Array.from({ length: 4 }, (_, to) =>
      inputs.reduce((sum, input, from) => sum + input * weights[from][to], BIASES[to]));
    const hidden = hiddenSums.map(sum => Math.max(0, sum));
    const logits = Array.from({ length: 2 }, (_, to) =>
      hidden.reduce((sum, value, from) => sum + value * weights[from + 3][to], BIASES[to + 4]));
    return { hiddenSums, hidden, logits, probabilities: softmax(logits) };
  }

  function geometry(w, h) {
    const radius = Math.max(12, Math.min(w * 0.047, h * 0.088, 25));
    const columns = [0.16, 0.5, 0.84];
    const counts = [3, 4, 2];
    const margin = Math.min(0.38, Math.max(0.18, 47 / h));
    const nodes = columns.flatMap((x, layer) => Array.from({ length: counts[layer] }, (_, index) => ({
      x: w * x, y: h * (margin + (index + 0.5) / counts[layer] * (0.96 - margin)), layer
    })));
    const edges = WEIGHTS.flatMap((weights, from) => weights.map((_, to) => ({
      from, to: from < 3 ? to + 3 : to + 7, column: to, layer: from < 3 ? 0 : 1
    })));
    return { radius, nodes, edges };
  }

  function render(ctx, w, h, { inputs = INPUTS, weights = WEIGHTS, data = calculate(inputs, weights),
    pulse = Infinity, stage = -1, selected = -1, selectedNode = -1, thumbnail = false } = {}) {
    const graph = geometry(w, h);
    const { radius, nodes, edges } = graph;
    ctx.fillStyle = '#131a17';
    ctx.fillRect(0, 0, w, h);

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
        ctx.fillStyle = layer === stage ? POSITIVE : '#b0c6b9';
        ctx.fillText(label, w * [0.16, 0.5, 0.84][layer], Math.max(29, h * 0.095), w * 0.30);
      });
    }

    const values = [...inputs, ...data.hidden, ...data.probabilities];
    edges.forEach((edge, index) => {
      const a = nodes[edge.from];
      const b = nodes[edge.to];
      const weight = weights[edge.from][edge.column];
      const magnitude = Math.abs(weight);
      const color = weight < 0 ? NEGATIVE : POSITIVE;
      const chosen = index === selected;
      ctx.globalAlpha = chosen ? 0.95 : 0.16 + 0.51 * magnitude;
      ctx.setLineDash(weight === 0 ? [2, 4] : weight < 0 ? [4, 5] : []);
      stroke(a, b, weight === 0 ? '#a1aebc' : color, 0.65 + magnitude * 2.2 + (chosen ? 1.7 : 0));
      ctx.setLineDash([]);
      if (chosen) {
        const mx = a.x + (b.x - a.x) * 0.44;
        const my = a.y + (b.y - a.y) * 0.44;
        ctx.fillStyle = '#1c2822';
        ctx.fillRect(mx - 19, my - 9, 38, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = '11px Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(weight.toFixed(1), mx, my);
      }
      const travel = (pulse - edge.layer * 1.08) * (0.94 + magnitude * 0.52);
      if (travel >= 0 && travel <= 1 && magnitude > 0 && values[edge.from] > 0) {
        ctx.fillStyle = color;
        ctx.globalAlpha = Math.min(1, 0.25 + magnitude * values[edge.from] * 0.75);
        ctx.beginPath();
        ctx.arc(a.x + (b.x - a.x) * travel, a.y + (b.y - a.y) * travel, 2 + magnitude * 2.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    });

    nodes.forEach((node, index) => {
      const active = stage === node.layer || selectedNode === index;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = active ? '#2b4b3b' : '#1c2822';
      ctx.fill();
      ctx.strokeStyle = active ? POSITIVE : '#87a597';
      ctx.lineWidth = active ? 1.6 : 1;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = Math.max(8, Math.min(12, radius * 0.68)) + 'px Geist, system-ui, sans-serif';
      ctx.fillStyle = '#e7f3eb';
      ctx.fillText(thumbnail ? names[index] : values[index].toFixed(2), node.x, node.y);
      if (!thumbnail && radius >= 14) {
        ctx.fillStyle = active ? POSITIVE : '#b0c6b9';
        ctx.fillText(names[index], node.x + radius + 8, node.y - radius + 2);
      }
    });
    return graph;
  }

  const stages = [0, .10, .22, .38, .52, .62, .77, .88, .96, 1];
  const clamp = n => Math.max(0, Math.min(1, n));

  function progressAt(scroll, offsets) {
    if (scroll <= offsets[0]) return 0;
    const next = offsets.findIndex(offset => offset > scroll);
    if (next < 0) return 1;
    const prev = next - 1;
    const q = clamp((scroll - offsets[prev]) / (offsets[next] - offsets[prev]));
    return stages[prev] + (stages[next] - stages[prev]) * q;
  }

  function phase(p, from, to) {
    return clamp((p - from) / (to - from));
  }

  function stageAt(p) {
    return Math.min(stages.length - 2, stages.findLastIndex(start => start <= p));
  }

  function signalAt(edge, p) {
    const boundary = edge.layer === 0 ? [.22, .38] : [.62, .77];
    const offset = .009 * ((edge.from % 3 + edge.column) % 4);
    return phase(p, boundary[0] + offset, boundary[1] - .017 + offset * .45);
  }

  function softmax(logits) {
    const largest = Math.max(...logits);
    const exponents = logits.map(value => Math.exp(value - largest));
    const total = exponents.reduce((sum, value) => sum + value, 0);
    return exponents.map(value => value / total);
  }

  WEIGHTS.forEach(Object.freeze);
  Object.freeze(WEIGHTS);
  const edges = geometry(1, 1).edges.map((edge, index) => Object.freeze({
    ...edge, id: 'edge-' + index, weight: WEIGHTS[edge.from][edge.column]
  }));
  return {
    render, calculate, softmax, phase, stageAt, progressAt, signalAt,
    inputs: Object.freeze(INPUTS), weights: WEIGHTS, biases: Object.freeze(BIASES),
    edges: Object.freeze(edges), stages: Object.freeze(stages)
  };
})();
