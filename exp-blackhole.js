'use strict';

const MorphBlackHole = (() => {
  const optics = MorphBlackHoleOptics;
  const background = '#08080a';
  const features = [
    ['shadow', 'Shadow and event horizon', 'The dark patch is the apparent shadow. Light aimed too close is captured, and gravity magnifies the apparent dark region. The event horizon is the boundary beyond which no signal can escape. It lies inside this apparent outline and has no luminous surface.'],
    ['disk', 'Accretion disk', 'Gas with angular momentum can orbit in a flattened disk. Turbulence transfers angular momentum outward, allowing gas to spiral in and heat up. Much of the light is emitted before matter crosses the horizon. A black hole without a substantial supply of gas may have no bright disk.'],
    ['lens', 'Lensed disk', 'The tall arc is an image of the far side of the disk. Gravity bends its light over and under the shadow toward us. The lower arc also shows light taking a bent path from the disk. Both belong to the same system.'],
    ['beam', 'Doppler beaming', 'Orbiting gas on this side is moving partly toward the observer. Its radiation is boosted in the observer’s direction and shifted toward higher frequencies. The other side is dimmer as its gas moves away. The exact contrast depends on speed and viewing angle.'],
    ['ring', 'Photon ring', 'Very near the apparent shadow boundary, some rays loop partway or multiple times around the black hole before escaping. The resulting narrow features are much finer than the broad glow of the lensed disk. The fine rim here is schematic.']
  ];

  function shade(t) {
    const p = Math.max(0, Math.min(1, (t - .13) / .73));
    return p * p * (3 - 2 * p);
  }

  function paint(ctx, width, height, progress, selection, ambient = 0) {
    return optics.paint(ctx, width, height, optics.geometry(width, height), progress, selection, undefined, 1, ambient);
  }

  function transition(ctx, width, height, source, target, t) {
    ctx.clearRect(0, 0, width, height);
    const g = optics.geometry(target.width, target.height);
    g.x += target.left;
    g.y += target.top;
    optics.paint(ctx, width, height, g, 0, '', source, t);
  }

  function render(ctx, width, height) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
    paint(ctx, width, height, 0, '');
  }

  return { background, features, geometry: optics.geometry, hit: optics.hit,
    available: optics.available, paint, transition, shade, render };
})();
