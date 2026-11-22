'use strict';

window.MorphAudio = (() => {
  let enabled = false;
  let context;
  let master;
  let hum;
  try { enabled = localStorage.getItem('morph-sound') === 'on'; } catch {}

  function wake() {
    if (!enabled) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      if (!context) {
        context = new Audio();
        master = context.createGain();
        master.gain.value = 0.28;
        master.connect(context.destination);
      }
      if (context.state === 'suspended') context.resume().catch(() => {});
    } catch {}
  }

  function setEnabled(value) {
    enabled = value;
    try { localStorage.setItem('morph-sound', value ? 'on' : 'off'); } catch {}
    if (enabled) wake();
    else stopBlackHole();
  }

  function whenReady(play) {
    if (!enabled || !context) return;
    if (context.state === 'running') play();
    else if (context.state === 'suspended') {
      context.resume().then(() => {
        if (enabled && context.state === 'running') play();
      }).catch(() => {});
    }
  }

  function tone(frequency, duration, volume, offset = 0) {
    const now = context.currentTime + offset;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.frequency.value = frequency;
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(envelope).connect(master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.01);
  }

  function playSelect() {
    if (!enabled || context?.state !== 'running') return;
    const length = Math.ceil(context.sampleRate * 0.04);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < length; index++) {
      samples[index] = (Math.random() * 2 - 1) * Math.exp(-7 * index / length) * 0.18;
    }
    const impulse = context.createBufferSource();
    const filter = context.createBiquadFilter();
    impulse.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = 1300;
    impulse.connect(filter).connect(master);
    impulse.start();
    tone(520, 0.075, 0.075);
  }

  function playBlackHoleTone(proximity) {
    if (!enabled || context?.state !== 'running' || document.hidden) return;
    if (!hum) {
      const gain = context.createGain();
      gain.gain.value = 0;
      gain.connect(master);
      const oscillators = [65, 97.5].map(frequency => {
        const oscillator = context.createOscillator();
        oscillator.frequency.value = frequency;
        oscillator.connect(gain);
        oscillator.start();
        return oscillator;
      });
      hum = { gain, oscillators };
    }
    hum.gain.gain.setTargetAtTime(0.005 + proximity * 0.026, context.currentTime, 0.16);
  }

  function stopBlackHole() {
    if (!hum) return;
    const { gain, oscillators } = hum;
    const now = context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(0, now, 0.045);
    oscillators[1].onended = () => gain.disconnect();
    oscillators.forEach(oscillator => oscillator.stop(now + 0.22));
    hum = null;
  }

  document.addEventListener('click', wake, true);
  document.addEventListener('keydown', wake, true);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopBlackHole();
  });

  return {
    get enabled() { return enabled; },
    setEnabled, playSelect, playBlackHoleTone, stopBlackHole,
    playFusion() {
      whenReady(() => {
        playSelect();
        tone(196, 0.52, 0.035, 0.12);
        tone(294, 0.38, 0.055, 0.48);
        tone(440, 0.27, 0.03, 0.64);
      });
    },
    playInspect() {
      whenReady(() => {
        tone(480, 0.13, 0.042);
        tone(720, 0.18, 0.021, 0.045);
      });
    },
    playDnaBond() {
      if (!enabled || context?.state !== 'running') return;
      tone(880, 0.19, 0.058);
      tone(1174, 0.15, 0.025, 0.015);
    },
    playSynapsePulse(strength) {
      if (!enabled || context?.state !== 'running') return;
      tone(392 + strength * 220, 0.24, 0.045 + strength * 0.035);
      tone(587 + strength * 330, 0.2, 0.023, 0.045);
    }
  };
})();
