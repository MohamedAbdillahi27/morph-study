'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'exp-dna.js'), 'utf8'), context);
const dna = context.window.MorphDna;
const state = p => dna.model(620, 540, p);

test('DNA templates contain only DNA bases and use complementary pairings', () => {
  for (const [base, complement, bonds] of [['A', 'T', 2], ['T', 'A', 2], ['G', 'C', 3], ['C', 'G', 3]]) {
    assert.equal(dna.complement(base), complement);
    assert.equal(dna.numberOfBonds(base), bonds);
  }
  assert.equal(dna.complement('U'), undefined);
  assert(state(0).pairs.every(pair => dna.complement(pair.base)));
});

test('opening preserves both templates and the fork and leading tip advance together', () => {
  const states = [.26, .4, .55, .7, .81].map(state);
  const original = Array.from(states[0].pairs, pair => pair.base);
  for (const [i, current] of states.entries()) {
    assert.deepEqual(Array.from(current.pairs, pair => pair.base), original);
    assert(current.leadingTip < current.fork);
    if (i) {
      assert(current.fork >= states[i - 1].fork);
      assert(current.leadingTip >= states[i - 1].leadingTip);
    }
    const leading = Array.from(current.pairs.slice(2), pair => pair.leadAlpha);
    assert(leading.every((alpha, j) => j === 0 || alpha <= leading[j - 1]));
  }
});

test('lagging fragments extend away from the fork and replace primers before ligation', () => {
  assert(state(0).pairs.every(pair => pair.opened === 0));
  for (const fragment of state(.5).fragments) {
    const after = state(fragment.primedAt + .085).fragments.find(item => item.end === fragment.end);
    assert(after.tip < fragment.end);
    assert(fragment.primedAt < fragment.matureAt);
    assert(fragment.matureAt < fragment.replacedAt);
    assert(fragment.replacedAt < fragment.ligatesAt);
  }
  const complete = state(1);
  assert(complete.pairs.every(pair =>
    pair.opened === 1 && pair.leadAlpha === 1 && pair.lagAlpha === 1 &&
    !pair.leadRNA && !pair.lagRNA && Math.hypot(pair.top.x - pair.lead.x, pair.top.y - pair.lead.y) > 0 &&
    Math.hypot(pair.bottom.x - pair.lag.x, pair.bottom.y - pair.lag.y) > 0));
});

test('the first scroll turns the intact helix before unwinding starts', () => {
  const intact = state(0);
  const firstScroll = state(.02);
  const nextScroll = state(.04);
  assert(firstScroll.pairs.every(pair => pair.opened === 0));
  assert(firstScroll.pairs[0].top.x < intact.pairs[0].top.x);
  assert(nextScroll.pairs[0].top.x < firstScroll.pairs[0].top.x);
});

test('the intact helix is vertical and helicase moves down as replication advances', () => {
  const intact = state(0);
  assert.equal(intact.pairs[0].top.x, intact.width / 2);
  assert(intact.pairs.at(-1).top.y - intact.pairs[0].top.y > intact.height * 0.75);
  const helicase = p => state(p).enzymes.find(enzyme => enzyme.id === 'helicase');
  assert.equal(helicase(.25).x, helicase(.55).x);
  assert(helicase(.55).y > helicase(.25).y);
});

test('each finished duplex has the same dimensions as the original helix', () => {
  for (const [width, height] of [[519, 522], [151, 380]]) {
    for (const orbit of [0, Math.PI / 3, Math.PI]) {
      const original = dna.model(width, height, 0, orbit);
      const complete = dna.model(width, height, 1, orbit);
      const dimensions = points => [
        Math.max(...points.map(point => point.x)) - Math.min(...points.map(point => point.x)),
        Math.max(...points.map(point => point.y)) - Math.min(...points.map(point => point.y))
      ];
      const expected = dimensions(original.pairs.flatMap(pair => [pair.top, pair.bottom]));
      for (const keys of [['top', 'lead'], ['bottom', 'lag']]) {
        const points = complete.pairs.flatMap(pair => keys.map(key => pair[key]));
        assert(points.every(point => point.x > 5 && point.x < width - 5));
        dimensions(points).forEach((value, i) => assert(Math.abs(value - expected[i]) < 1e-9));
      }
    }
  }
});
