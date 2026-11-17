// Sound, synthesized live with WebAudio — no audio files, no network. A
// two-tone siren, an engine hum that follows the car's speed, gunshots,
// pickups and a mission jingle. The context starts on the first user gesture;
// M mutes everything.
export function createAudio() {
  let context = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = 0;
  let muted = false;
  let sirenOn = false;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
      engineOsc = context.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 60;
      engineGain = context.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      sirenOsc = context.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 700;
      sirenGain = context.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      return true;
    } catch {
      return false;
    }
  }

  function beep(freq, seconds, type, volume, when) {
    if (!context || muted) return;
    const osc = context.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume || 0.2, context.currentTime + (when || 0));
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + (when || 0) + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(context.currentTime + (when || 0));
    osc.stop(context.currentTime + (when || 0) + seconds + 0.02);
  }

  function noise(seconds, volume) {
    if (!context || muted) return;
    const length = Math.floor(context.sampleRate * seconds);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const gain = context.createGain();
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(master);
    source.start();
  }

  return {
    unlock() {
      if (ensure() && context.state === 'suspended') context.resume();
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() {
      return muted;
    },
    shot() {
      noise(0.12, 0.35);
    },
    enemyShot() {
      noise(0.1, 0.15);
    },
    crash() {
      noise(0.25, 0.4);
    },
    pickup() {
      beep(880, 0.12, 'sine', 0.25);
      beep(1320, 0.18, 'sine', 0.2, 0.09);
    },
    cash() {
      beep(1046, 0.1, 'triangle', 0.25);
      beep(1568, 0.22, 'triangle', 0.22, 0.08);
    },
    missionDone() {
      beep(523, 0.14, 'triangle', 0.25);
      beep(659, 0.14, 'triangle', 0.25, 0.13);
      beep(784, 0.3, 'triangle', 0.28, 0.26);
    },
    busted() {
      beep(220, 0.5, 'sawtooth', 0.2);
      beep(165, 0.8, 'sawtooth', 0.2, 0.4);
    },
    /** Called every frame: engine follows speed, siren wails while police chase. */
    update(dt, speed, chasing) {
      if (!context || muted) return;
      if (engineOsc) {
        engineOsc.frequency.value = 55 + Math.min(1, Math.abs(speed) / 560) * 140;
        engineGain.gain.value = speed !== 0 ? 0.05 : 0.015;
      }
      if (sirenOsc) {
        sirenTimer += dt;
        const high = Math.floor(sirenTimer * 1.6) % 2 === 0;
        sirenOsc.frequency.value = high ? 950 : 650;
        sirenGain.gain.value = chasing ? 0.045 : 0;
        sirenOn = chasing;
      }
    },
    isSirenOn() {
      return sirenOn;
    },
  };
}
