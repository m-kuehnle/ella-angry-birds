// Lightweight Web Audio wrapper — one AudioContext, disposable nodes per play.

const SOUNDS = {
  launch: { type: "tone", freq: [200, 400], dur: 0.1, gain: 0.1 },
  break: { type: "tone", freq: [300, 100], dur: 0.3, gain: 0.2 },
  victory: {
    type: "melody",
    notes: [261.63, 329.63, 392.0, 523.25],
    dur: 0.15,
    gain: 0.1,
  },
  impact: { type: "noise", dur: 0.1, gain: 0.3 },
};

let ctx = null;

function getContext() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return ctx;
}

function playTone(freq, dur, gain) {
  const ac = getContext();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.connect(g);
  g.connect(ac.destination);
  const t = ac.currentTime;
  osc.frequency.setValueAtTime(freq[0], t);
  osc.frequency.exponentialRampToValueAtTime(freq[1], t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.01, t + dur);
  osc.start(t);
  osc.stop(t + dur);
}

function playNoise(dur, gain) {
  const ac = getContext();
  if (!ac) return;
  const len = ac.sampleRate * dur;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  }
  const src = ac.createBufferSource();
  const g = ac.createGain();
  src.buffer = buf;
  src.connect(g);
  g.connect(ac.destination);
  g.gain.setValueAtTime(gain, ac.currentTime);
  src.start();
}

function playMelody(notes, dur, gain) {
  const ac = getContext();
  if (!ac) return;
  let t = ac.currentTime;
  notes.forEach((freq) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.connect(g);
    g.connect(ac.destination);
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + dur + 0.05);
    osc.start(t);
    osc.stop(t + dur + 0.05);
    t += dur;
  });
}

/** Play a named sound effect. Silently fails if audio unavailable. */
export function playSound(name) {
  const def = SOUNDS[name];
  if (!def) return;
  try {
    if (def.type === "tone") playTone(def.freq, def.dur, def.gain);
    else if (def.type === "noise") playNoise(def.dur, def.gain);
    else if (def.type === "melody") playMelody(def.notes, def.dur, def.gain);
  } catch {
    // Audio unavailable — silent fallback
  }
}
