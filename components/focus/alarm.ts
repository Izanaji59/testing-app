// Alerte de fin de distraction : son, vibration et notification système.
// Les navigateurs bloquent le son et les notifications sans geste de l'utilisateur :
// unlockAlarm() est appelé au clic sur « Je me suis déconcentré ».

let audio: AudioContext | null = null;

export function unlockAlarm() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx && !audio) audio = new Ctx();
    void audio?.resume();
  } catch { /* son indisponible : l'alerte visuelle reste */ }
  try { if ('Notification' in window && Notification.permission === 'default') void Notification.requestPermission(); } catch {}
}

/** Trois bips aigus. */
export function playAlarm() {
  try {
    if (!audio) return;
    void audio.resume();
    const start = audio.currentTime + 0.05;
    for (let i = 0; i < 3; i++) {
      const t = start + i * 0.32;
      const osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(i === 2 ? 1175 : 880, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      osc.connect(gain).connect(audio.destination);
      osc.start(t); osc.stop(t + 0.26);
    }
  } catch {}
  try { navigator.vibrate?.([400, 150, 400, 150, 700]); } catch {}
}

export function notifyRefocus(title: string) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const n = new Notification('Distraction terminée', {
      body: `Les 10 minutes sont écoulées. Replonge maintenant : ${title}`,
      tag: 'grind-refocus', requireInteraction: true,
    });
    n.onclick = () => { window.focus(); n.close(); };
  } catch {}
}
