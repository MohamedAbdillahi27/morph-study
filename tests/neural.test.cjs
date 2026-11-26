'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = vm.createContext({ window: {} });
for (const file of ['exp-neural.js', 'exp-neural-graph.js']) {
  vm.runInContext(readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
  if (file === 'exp-neural.js') context.MorphNeural = context.window.MorphNeural;
}
const math = context.MorphNeural;
const makeGeometry = vm.runInContext('MorphNeuralGraph.computeNeuralOpeningGeometry', context);
const near = (a, b, tolerance = 1e-12) => assert(Math.abs(a - b) < tolerance, a + ' differs from ' + b);

test('fixed network has three inputs, four hidden units, two outputs and twenty weights', () => {
  assert.equal(math.inputs.length, 3);
  assert.deepEqual(Array.from(math.weights, row => row.length), [4, 4, 4, 2, 2, 2, 2]);
  assert.equal(math.biases.length, 6);
  assert.equal(math.edges.length, 20);
  assert.equal(new Set(math.edges.map(edge => edge.id)).size, 20);
  for (const edge of math.edges) {
    assert.equal(edge.weight, math.weights[edge.from][edge.column]);
    assert.equal(edge.to, edge.column + (edge.layer === 0 ? 3 : 7));
  }
});

test('canonical weighted sums, ReLU and output logits match worked calculations', () => {
  const result = math.calculate();
  // h1 sum: .22 × .8 + .76 × −.6 + .4 × .4 − .08 = −.20.
  near(result.hiddenSums[0], -.2);
  assert.equal(result.hidden[0], 0);
  near(result.hidden[1], .658);
  near(result.hidden[2], .192);
  near(result.hidden[3], .824);
  // A logit: 0 × .9 + .658 × −.7 + .192 × .4 + .824 × −.4 − .08.
  near(result.logits[0], -.7934);
  near(result.logits[1], 1.3192);
  near(result.probabilities.reduce((sum, value) => sum + value, 0), 1);
});

test('editing a feature recalculates downstream scores without mutating parameters', () => {
  const canonical = math.calculate();
  const edited = math.calculate([.85, .76, .4]);
  near(edited.hidden[0], .304);
  assert.notEqual(edited.logits[0], canonical.logits[0]);
  assert.notEqual(edited.probabilities[0], canonical.probabilities[0]);
  near(edited.probabilities[0] + edited.probabilities[1], 1);
  assert.deepEqual(math.calculate(), canonical);
});

test('softmax uses a stable common-logit offset', () => {
  const reference = math.softmax([0, -1]);
  const high = math.softmax([10000, 9999]);
  const low = math.softmax([-10000, -10001]);
  for (const pair of [high, low, math.softmax([1e100, -1e100])]) {
    assert(pair.every(Number.isFinite));
    near(pair[0] + pair[1], 1);
  }
  assert.deepEqual(reference, high);
  assert.deepEqual(reference, low);
});

test('editing the first signed weight changes just the first hidden sum before propagation', () => {
  const values = [.85, .76, .4];
  const original = math.calculate(values);
  const weights = math.weights.map(row => row.slice());
  weights[0][0] = -.6;
  const edited = math.calculate(values, weights);
  near(edited.hiddenSums[0] - original.hiddenSums[0], values[0] * (-.6 - .8));
  assert.deepEqual(edited.hiddenSums.slice(1), original.hiddenSums.slice(1));
  assert.equal(edited.hidden[0], 0);
  assert.notEqual(edited.logits[0], original.logits[0]);
  assert.equal(math.weights[0][0], .8);
});

test('every position maps to the same computation in either direction', () => {
  const offsets = [0, 302, 611, 980, 1304, 1680, 2073, 2345, 2601, 2900];
  const locations = offsets.flatMap((offset, i) => i ? [offset-1, offset, offset+1] : [0]);
  const state = position => {
    const p = math.progressAt(position, offsets);
    return [p, math.stageAt(p), ...math.edges.map(edge => math.signalAt(edge, p))];
  };
  const forward = locations.map(state);
  assert.deepEqual(locations.slice().reverse().map(state).reverse(), forward);
  assert.deepEqual(Array.from(offsets, offset => math.progressAt(offset, offsets)), Array.from(math.stages));
  const graph = makeGeometry(774, 463);
  for (const edge of graph.edges) {
    const start = edge.at(0);
    const end = edge.at(1);
    assert.equal(start[1], graph.nodes[edge.from].y);
    assert.equal(end[1], graph.nodes[edge.to].y);
    assert(start[0] > graph.nodes[edge.from].x && end[0] < graph.nodes[edge.to].x);
    assert(edge.at(.35)[0] < edge.at(.72)[0]);
  }
});
