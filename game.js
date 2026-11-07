// HACKERS MUTANTES CHILENOS
// Beat 'em up arcade para Platanus Hack 26: Santiago.
// RUTA, PUERTO, ANDES y BYTE contra Condor Corp en una Santiago cyberpunk.

const W = 800;
const H = 600;
const FLOOR = 392;

// DO NOT replace existing keys - they match the physical arcade cabinet wiring.
// To add local testing shortcuts, append extra keys to any array.
const CABINET_KEYS = {
  P1_U: ['w'],
  P1_D: ['s'],
  P1_L: ['a'],
  P1_R: ['d'],
  P1_1: ['u'],
  P1_2: ['i'],
  P1_3: ['o'],
  P1_4: ['j'],
  P1_5: ['k'],
  P1_6: ['l'],
  P2_U: ['ArrowUp'],
  P2_D: ['ArrowDown'],
  P2_L: ['ArrowLeft'],
  P2_R: ['ArrowRight'],
  P2_1: ['r'],
  P2_2: ['t'],
  P2_3: ['y'],
  P2_4: ['f'],
  P2_5: ['g'],
  P2_6: ['h'],
  START1: ['Enter'],
  START2: ['2'],
};

// Everything below lives in one function scope so the minifier can shorten every name.
(() => {
const { abs: ABS, random: RND, min: MN, max: MX, sin: SIN, cos: COS, hypot: HYP, PI } = Math;
// Shared palette and the square-wave type.
const YL = '#ffe14a', WH = '#ffffff', CY = '#40e0ff', PK = '#ff3ca6', PL = '#f6b919', DK = '#120a1a', SQ = 'square';
// Canvas fill shorthand for the procedural art.
const FR = (c, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
// Stroked line segment in the current stroke style.
const LN = (c, x1, y1, x2, y2) => { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); };
// Filled circle (rx only) or ellipse in the current fill style.
const DOT = (c, x, y, rx, ry = rx, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, 7); c.fill(); };
// ---------- Input (arcade codes only) ----------
const KM = {};
for (const [c, ks] of Object.entries(CABINET_KEYS)) for (const k of ks) KM[k.length === 1 ? k.toLowerCase() : k] = c;
const held = Object.create(null);
let was = {};
const keyCode = (e) => e.key && KM[e.key.length === 1 ? e.key.toLowerCase() : e.key];
addEventListener('keydown', (e) => {
  const c = keyCode(e);
  if (c) { held[c] = true; e.preventDefault(); }
  if (AC && AC.state !== 'running') AC.resume().catch(() => {});
});
addEventListener('keyup', (e) => { const c = keyCode(e); if (c) held[c] = false; });
addEventListener('blur', () => { for (const k in held) held[k] = false; });
const tap = (c) => held[c] && !was[c];
// Buttons 1-3 (top row) and 4-6 (bottom row) do the same thing.
const btn = (pre, n) => tap(pre + n) || tap(pre + (n + 3));

// ---------- Storage (arcade bridge, local fallback) ----------
const SKEY = 'hmc-records-v1';
let board = [];
const store = () => window.platanusArcadeStorage || {
  async get(k) { try { const r = localStorage.getItem(k); return r === null ? { found: false } : { found: true, value: JSON.parse(r) }; } catch (e) { return { found: false }; } },
  async set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
};
const loadBoard = async () => {
  try {
    const r = await store().get(SKEY);
    if (r && r.found && Array.isArray(r.value)) {
      board = r.value.filter((e) => e && typeof e.n === 'string' && Number.isFinite(e.s) && e.s >= 0)
        .map((e) => ({ n: e.n.slice(0, 3), s: Math.floor(MN(e.s, 1e9)), h: ((e.h | 0) % 4 + 4) % 4 })).sort((a, b) => b.s - a.s).slice(0, 8);
    }
  } catch (e) { board = []; }
}
const saveBoard = async () => { try { await store().set(SKEY, board); } catch (e) { /* keep playing */ } }

// ---------- Audio: synthesized SFX and chiptune ----------
let AC = null, MG = null, NB = null;
const mf = (m) => 440 * 2 ** ((m - 69) / 12);
const tone = (f, d, ty = SQ, v = 0.08, dl = 0, f2 = 0) => {
  if (!AC || AC.state !== 'running') return;
  const t = AC.currentTime + MX(0, dl), o = AC.createOscillator(), g = AC.createGain();
  o.type = ty; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(g); g.connect(MG); o.start(t); o.stop(t + d + 0.02);
}
const noise = (d, v = 0.1, dl = 0, hp = 800) => {
  if (!AC || AC.state !== 'running') return;
  if (!NB) { NB = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const a = NB.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = RND() * 2 - 1; }
  const t = AC.currentTime + MX(0, dl), s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = NB; f.type = 'highpass'; f.frequency.value = hp;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
  s.connect(f); f.connect(g); g.connect(MG); s.start(t); s.stop(t + d);
}
const arp = (base, ns, gap, ty = SQ) => ns.forEach((n, i) => tone(mf(base + n), 0.16, ty, 0.07, i * gap));
// Pitch climbs with the combo count so long chains sound like they build.
const SFX_hit = (k = 0) => { noise(0.09, 0.28, 0, 1200); tone(180 + MN(k, 12) * 22, 0.1, SQ, 0.1, 0, 60); };
const SFX_sw = () => noise(0.07, 0.06, 0, 3000);
const SFX_jp = () => tone(300, 0.15, SQ, 0.06, 0, 700);
const SFX_hu = () => tone(220, 0.22, 'sawtooth', 0.12, 0, 70);
const SFX_zap = () => { tone(900, 0.35, 'sawtooth', 0.08, 0, 120); tone(1400, 0.3, SQ, 0.05, 0.05, 300); };
const SFX_pk = () => arp(72, [0, 4, 7, 12], 0.06);
const SFX_boom = () => { noise(0.45, 0.35, 0, 150); tone(90, 0.45, 'sine', 0.3, 0, 30); };
const SFX_thud = () => tone(90, 0.12, 'sine', 0.25, 0, 40);
const SFX_bz = () => tone(110, 0.15, SQ, 0.08);
const SFX_blk = () => tone(1300, 0.08, SQ, 0.08, 0, 500);
const SFX_sel = () => tone(660, 0.06, SQ, 0.06);
const SFX_cl = () => arp(64, [0, 4, 7, 12, 16, 19, 24], 0.09);
const SFX_ov = () => arp(60, [12, 7, 3, 0, -5], 0.2, 'triangle');
// Patterns: letters are semitones above the root (a = 0), '.' is a rest.
const SONG = {
  t: { bpm: 112, r: 50, b: 'a..a..m.i..i..k.f..f..h.h..h..k.', l: 'm...o.p.o...m.k.m...k.h.k...h.f.' },
  g: { bpm: 140, r: 45, b: 'a.aa.am.a.aa.ak.f.ff.fm.h.hh.hk.', l: 'h.k.m.k.h.k.o.m.p.o.m.k.m.k.h.f.h.k.m.k.o.p.r.p.o.m.k.m.k.h.f.h.' },
  b: { bpm: 158, r: 40, b: 'aaamaaakaaamaaab', l: 'm.l.m.o.p.o.m.l.m.l.m.o.r.p.o.m.' },
};
let mus = null, mStep = 0, mNext = 0;
const playSong = (s) => { mus = s; mStep = 0; mNext = AC ? AC.currentTime + 0.1 : 0; }
const musTick = () => {
  if (!AC || !mus || AC.state !== 'running') return;
  const sp = 60 / mus.bpm / 4;
  if (mNext < AC.currentTime - 0.2) mNext = AC.currentTime + 0.05;
  while (mNext < AC.currentTime + 0.15) {
    const i = mStep, dl = mNext - AC.currentTime, b = mus.b[i % mus.b.length], l = mus.l[i % mus.l.length];
    if (b !== '.') tone(mf(mus.r + b.charCodeAt(0) - 97 - 12), sp * 1.8, 'triangle', 0.16, dl);
    if (l !== '.') tone(mf(mus.r + l.charCodeAt(0) - 97 + 12), sp * 1.5, SQ, 0.04, dl);
    if (i % 4 === 0) tone(150, 0.12, 'sine', 0.3, dl, 40);
    if (i % 8 === 4) noise(0.1, 0.1, dl, 1800);
    if (i % 2) noise(0.03, 0.025, dl, 7000);
    mStep++; mNext += sp;
  }
}

// ---------- Helpers ----------
const css = (n) => '#' + n.toString(16).padStart(6, '0');
const shd = (c, f) => { const ch = (v) => MN(255, v * f) | 0; return (ch(c >> 16 & 255) << 16) | (ch(c >> 8 & 255) << 8) | ch(c & 255); };
// Headings (28px+) use the poster's chunky italic display face; small text stays monospace.
const TS = (sz, col = WH, d = sz > 27) => ({ fontFamily: d ? FONT.slice(3) : 'monospace', fontSize: sz + 'px', fontStyle: d ? 'italic' : 'bold', color: col, stroke: DK, strokeThickness: MX(3, sz / 6 | 0), padding: { x: sz / 8 } });
const cl = (v, a, b) => MX(a, MN(b, v));
let sd = 1;
const rr = () => (sd = sd * 16807 % 2147483647) / 2147483647;
const ri = (a, b) => a + rr() * (b - a) | 0;

let S, AD, CM, MODE, L, HUD, st, P = [null, null], E = [], PR = [], IT = [], AL = [], WO = [], UI = [], FIN = [], frz = 0;
const G = {};

// ---------- Heroes, enemies, stages ----------
const HER = [
  { n: 'RUTA', c: 0xff3ca6, sp: 3.6, pw: 8, rg: 30, x: 'dash', d: 'INFILTRADORA URBANA', b: 'DASH PARKOUR', st: [5, 2, 3], cry: '¡AL TOQUE!' },
  { n: 'PUERTO', c: 0xff8a1e, sp: 2.5, pw: 13, rg: 36, x: 'drone', d: 'TÉCNICO DE HARDWARE', b: 'DRON ALIADO', st: [2, 5, 3], cry: '¡DRON, PO!' },
  { n: 'ANDES', c: 0x9b5cff, sp: 2.9, pw: 10, rg: 38, x: 'holo', d: 'CRIPTÓGRAFA', b: 'HOLOGRAMA', st: [3, 3, 5], cry: '¡CIFRADO!' },
  { n: 'BYTE', c: 0x39ff6a, sp: 3.1, pw: 10, rg: 32, x: 'emp', d: 'INGENIERO SOCIAL', b: 'PULSO EMP', st: [4, 3, 4], cry: '¡SE CAYÓ EL SISTEMA!' },
];
const LOOK = {
  h0: { sk: 0xe8b08a, hr: 0xb0208a, hl: 1, hd: 0xff3ca6, pa: 0x1c1c26, sh: 0xf4f4f4, gg: 1, bp: 0x2c2c40, ac: 0xffffff, hood: 1 },
  h1: { sk: 0xc68a5e, hr: 0x1a1010, hd: 0xf07c1a, cap: 0x2a5ab8, hp: 0x1a1a1a, hpc: 0xff8a1e, pa: 0x5a5a40, sh: 0x4a3020, wr: 1 },
  h2: { sk: 0xdca47e, hr: 0x3a1a5a, hl: 1, hd: 0x9b5cff, jk: 0x2a2440, gl: 0x9b5cff, pa: 0x2a2a36, sh: 0xdcdcff, hood: 1 },
  h3: { sk: 0xb87850, hr: 0xf0d878, hd: 0x39ff6a, sg: 0x39ff6a, hp: 0x222228, hpc: 0x39ff6a, pa: 0x2a3a60, sh: 0xff3b3b, sb: 0x7a3cff, ac: 0x0a3a14, hood: 1 },
  gd: { sk: 0xc9926a, hr: 0x151515, hd: 0x23252f, tie: 0xc8202a, pa: 0x23252f, sh: 0x0a0a0a, sg: 0xff3030 },
  tk: { sk: 0xb07a55, hr: 0x222222, cap: 0xffc21a, gl: 0x30e0ff, hd: 0x3c4c5c, ac: 0xffc21a, pa: 0x3c4c5c, sh: 0x1a1a1a },
  ex: { sk: 0xe8b48e, hr: 0x8a8a8a, hd: 0x5a6070, tie: 0x2a7aff, pa: 0x40444e, sh: 0x2a1a10, gl: 0x30e0ff },
};
// Bosses share the rig but get their own silhouettes: pads, helmets with visors, coats, beards, an antenna.
Object.assign(LOOK, {
  b0: { ...LOOK.gd, pd: 0x3a3c4c, hm: 0x2a2c38, vz: 0x80d0ff },
  b1: { ...LOOK.ex, sk: 0xb8c0cc, hr: 0xb8c0cc, hm: 0x8a92a4, vz: 0xff3040, an: 0xff3040 },
  b2: { ...LOOK.tk, hd: 0xd8e020, pd: 0x3c4c5c, bd: 0x3a2414 },
  b3: { ...LOOK.ex, hr: 0x6a2a8a, hl: 1, hd: 0xf0f0f4, ct: 0xe4e4ec, tie: 0, hm: 0x7ab8f0, vz: 0xe8f8ff },
  b4: { ...LOOK.tk, sk: 0xd8a080, hd: 0x2a6ab0, ct: 0x2a6ab0, cap: 0, ac: 0, hm: 0xe8e0d0, vz: 0x40e0ff, bd: 0xf4f4f4, pd: 0xe8e0d0 },
});
const POSES = ['i0', 'i1', 'w0', 'w1', 'w2', 'w3', 'p1', 'p2', 'k', 'j', 'jk', 'h', 's', 'b'];
const ED = {
  gd: { hp: 34, sp: 1.5, dm: 8, sc: 100 },
  tk: { hp: 52, sp: 1.3, dm: 11, sc: 150 },
  ex: { hp: 40, sp: 1.6, dm: 7, sc: 200 },
  dr: { hp: 12, sp: 2.2, dm: 7, sc: 150 },
  dg: { hp: 28, sp: 2.6, dm: 10, sc: 120 },
};
// Boss: [name, sprite, scale, hp, moves (p punch, c charge, s shoot, m summon, t stomp, h stage hazard), line]
const STG = [
  { n: 'SANTIAGO CENTRO', s: 'Metro U. de Chile · Paseo Ahumada', pool: 'gd', b: ['GUARDIA MAX', 'b0', 1.8, 380, 'pc', '¡Alto ahí, cabros!'], sg: [['PASEO AHUMADA', 0x1c5aa0, 240], ['METRO U. DE CHILE', 0xd8202a, 1500]] },
  { n: 'PROVIDENCIA', s: 'Los Leones · ¡ojo, piso mojado!', pool: 'gd,ex,dr', b: ['CEO-BOT 3000', 'b1', 1.75, 460, 'pms', 'Esta reunión pudo ser un mail.'], sg: [['METRO LOS LEONES', 0xd8202a, 1300]] },
  { n: 'VALPARAÍSO', s: '¡Ojo con los contenedores!', pool: 'gd,tk,dg', b: ['CAPATAZ GRÚA', 'b2', 1.9, 540, 'pcth', '¡Del puerto no sale nadie!'], sg: [['CERRO ALEGRE', 0x1c5aa0, 1700]] },
  { n: 'ATACAMA', s: 'Lluvia de meteoritos', pool: 'tk,dr,dg,ex', b: ['DRA. ÓRBITA', 'b3', 1.8, 600, 'psmh', 'Las estrellas son de Condor Corp.'], sg: [['ZONA RESTRINGIDA', 0xd8202a, 1100]] },
  { n: 'PATAGONIA', s: 'Donde el diablo perdió el poncho', pool: 'tk,dg,dr,ex', b: ['CAPITÁN GLACIAR', 'b4', 1.95, 620, 'pcht', '¡Acá manda el viento, cabros!'], sg: [['TORRES DEL PAINE', 0x2a7a3a, 1500]] },
  { n: 'COSTANERA CENTER', s: 'Piso 62 · láseres de seguridad', pool: 'gd,tk,ex,dr,dg', b: ['EL CÓNDOR', 'cd', 1.3, 900, 'csmth', 'Soy el dueño de la red.'], sg: [] },
];
const SL = ['¡WENA!', '¡BACÁN!', '¡TOMA, PO!', '¡CHAO!', '¡SEEE!', '¡FUISTE!', '¡PA LA CASA!', '¡CACHAI!', '¡LA RAJA!', '¡AL TIRO!', '¡SALTA PAL LAO!'];
const ITEMS = [['¡COMPLETO, UN MANJAR!', '#ffd21a'], ['¡PLÁTANO HACK!', PL], ['¡BIP! +500', CY], ['¡MOTE CON HUESILLO!', '#ffa640']];

// ---------- Procedural art ----------
const cv = (k, w, h, fn) => { const t = S.textures.createCanvas(k, w, h); fn(t.getContext(), w, h); t.refresh(); return t; }
const pix = (k, w, h, draw, s = 3, ol = 0x140a1c) => {
  const b = new Array(w * h).fill(0);
  const R = (x, y, ww, hh, c) => { for (let j = y; j < y + hh; j++) for (let i = x; i < x + ww; i++) if (i >= 0 && j >= 0 && i < w && j < h) b[j * w + i] = c; };
  draw(R);
  const o = b.slice();
  if (ol) for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const q = j * w + i;
    if (!b[q] && ((i && b[q - 1]) || (i < w - 1 && b[q + 1]) || (j && b[q - w]) || (j < h - 1 && b[q + w]))) o[q] = ol;
  }
  cv(k, w * s, h * s, (c) => { for (let q = 0; q < w * h; q++) if (o[q]) { FR(c, css(o[q]), q % w * s, (q / w | 0) * s, s, s); } });
}

// One 23x30 pixel figure, facing right, in pose p.
const human = (R, L, p) => {
  const T = 10 + (p === 'i1') - (p === 'j' || p === 'jk'), ox = -(p === 'h') - (p === 'k');
  const sk = L.sk, top = L.jk || L.hd;
  const A = (x, y, w, h, c) => { R(x + ox, y, w, h, c); R(x + ox, y, 1, h, shd(c, 0.6)); };
  if (L.bp) { R(3 + ox, T + 1, 4, 8, L.bp); R(4 + ox, T + 2, 2, 2, 0xffd21a); R(4 + ox, T + 6, 2, 1, 0x40e0ff); }
  if (L.sb) { R(3 + ox, T - 3, 2, 15, L.sb); R(2 + ox, T - 1, 1, 2, 0xdddddd); R(2 + ox, T + 9, 1, 2, 0xdddddd); }
  if (L.hl) R(5 + ox, T - 7, 4, 9, L.hr);
  const Pa = L.pa, Sh = L.sh, leg = (x, h) => { R(x, 20, 3, h, Pa); R(x, 20 + h, 4, 2, Sh); };
  if (p === 'k') { leg(8, 7); R(12, 19, 8, 3, Pa); R(20, 18, 2, 4, Sh); }
  else if (p === 'j' || p === 'jk') {
    R(7, 20, 3, 4, Pa); R(7, 24, 4, 2, Sh);
    if (p === 'j') { R(11, 19, 3, 4, Pa); R(12, 23, 4, 2, Sh); } else { R(12, 19, 7, 3, Pa); R(19, 18, 2, 4, Sh); }
  } else {
    const o = { w0: [5, 13, 7, 7], w1: [8, 10, 6, 7], w2: [5, 13, 7, 7], w3: [8, 10, 7, 6] }[p] || [7, 11, 7, 7];
    leg(o[0], o[2]); leg(o[1], o[3]);
  }
  const ac = shd(top, 0.8), af = shd(top, 0.95);
  if (p === 'p2') { A(11, T + 3, 8, 3, ac); R(19 + ox, T + 3, 3, 3, sk); }
  else if (p === 's') { A(7, T - 6, 3, 8, ac); R(7 + ox, T - 8, 3, 2, sk); }
  else if (p === 'h') { A(3, T + 1, 4, 3, ac); R(1 + ox, T + 1, 2, 3, sk); }
  else { A(7, T + 1, 3, 8, ac); R(7 + ox, T + 9, 3, 2, sk); }
  R(6 + ox, T, 9, 10, top); R(6 + ox, T, 2, 10, shd(top, 0.82));
  if (L.jk) R(10 + ox, T, 2, 9, L.hd);
  if (L.tie) { R(9 + ox, T, 4, 2, 0xeeeeee); R(10 + ox, T + 1, 2, 6, L.tie); }
  if (L.ac) { R(9 + ox, T + 3, 1, 1, L.ac); R(10 + ox, T + 4, 1, 1, L.ac); R(9 + ox, T + 5, 1, 1, L.ac); R(11 + ox, T + 5, 2, 1, L.ac); }
  R(6 + ox, T + 8, 9, 2, shd(top, 0.7));
  if (L.ct) R(6 + ox, T + 8, 9, 7, L.ct);
  if (L.pd) { R(4 + ox, T - 1, 4, 4, L.pd); R(14 + ox, T - 1, 4, 4, L.pd); }
  if (L.hood) R(5 + ox, T - 1, 4, 3, L.hd);
  const hx = 8 + ox, hy = T - 8;
  R(hx + 2, T - 1, 3, 1, sk);
  R(hx, hy, 7, 7, sk); R(hx + 5, hy + 3, 1, 2, 0x1a0c14); R(hx + 4, hy + 6, 3, 1, shd(sk, 0.75));
  R(hx, hy - 1, 7, 2, L.hr); R(hx, hy, 2, 4, L.hr);
  if (L.cap) { R(hx, hy - 2, 7, 3, L.cap); R(hx + 6, hy, 3, 1, L.cap); }
  if (L.gg) { R(hx, hy + 1, 7, 1, 0x30303c); R(hx + 4, hy, 3, 2, 0x7ff6ff); }
  if (L.gl) { R(hx + 4, hy + 2, 3, 2, L.gl); R(hx + 5, hy + 2, 1, 1, 0xe0ffff); }
  if (L.sg) { R(hx + 3, hy + 2, 4, 2, 0x0c0c16); R(hx + 5, hy + 2, 1, 1, L.sg); }
  if (L.hp) { R(hx - 1, hy - 2, 8, 1, L.hp); R(hx + 1, hy + 1, 2, 4, L.hp); R(hx + 1, hy + 2, 2, 2, L.hpc); }
  if (L.hm) { R(hx - 1, hy - 2, 9, 6, L.hm); R(hx + 3, hy + 2, 5, 2, L.vz); }
  if (L.an) { R(hx + 3, hy - 6, 1, 4, 0x8a90a0); R(hx + 2, hy - 7, 3, 2, L.an); }
  if (L.bd) R(hx + 2, hy + 4, 5, 4, L.bd);
  if (p === 'p1') { A(12, T + 2, 7, 3, af); R(19 + ox, T + 2, 3, 3, sk); if (L.wr) R(21 + ox, T, 2, 7, 0xa0a8b4); }
  else if (p === 's') { A(12, T - 6, 3, 8, af); R(12 + ox, T - 8, 3, 2, sk); }
  else if (p === 'k' || p === 'j' || p === 'jk') { A(11, T + 1, 6, 3, af); R(17 + ox, T + 1, 2, 3, sk); }
  else if (p === 'h') { A(9, T + 1, 3, 6, af); R(9 + ox, T + 7, 3, 2, sk); }
  else if (p === 'p2') { A(10, T + 1, 3, 5, af); R(10 + ox, T + 6, 3, 2, sk); }
  else if (p === 'b') { A(13, T - 6, 3, 8, af); R(13 + ox, T - 8, 3, 2, sk); }
  else { A(10, T + 1, 3, 8, af); R(10 + ox, T + 9, 3, 2, sk); }
}
const drone = (R, f) => {
  R(5, 4, 8, 4, 0x5a6070); R(6, 3, 6, 1, 0x8a90a0); R(10, 5, 2, 2, 0xff2a3a); R(8, 8, 2, 2, 0x333344);
  R(3, 1, 1, 3, 0x444455); R(14, 1, 1, 3, 0x444455); R(f ? 0 : 2, 1, f ? 7 : 3, 1, 0xccccdd); R(f ? 11 : 13, 1, f ? 7 : 3, 1, 0xccccdd);
}
const dog = (R, f) => {
  const c = 0x8c919c, d = 0x4a4f5a;
  R(3, 3, 13, 5, c); R(3, 3, 13, 1, 0xc0c4cc); R(14, 0, 7, 5, c); R(18, 2, 2, 1, 0xff2a3a); R(19, 4, 3, 1, d); R(0, 2, 4, 1, d);
  (f === 2 ? [1, 4, 15, 18] : f ? [3, 6, 12, 15] : [5, 7, 10, 13]).forEach((x) => R(x, 8, 2, 4, d));
}
const condor = (R, f) => {
  const k = 0x1a1a24, m = 0x3a3e4c, y = f ? 2 : 8;
  R(0, y, 13, 24, k); R(31, y, 13, 24, k);
  for (let i = 0; i < 4; i++) { R(1 + i * 3, y + 22, 2, 5 + i % 2 * 3, 0x9aa0ac); R(32 + i * 3, y + 22, 2, 5 + (i + 1) % 2 * 3, 0x9aa0ac); }
  R(15, 31, 5, 11, m); R(24, 31, 5, 11, m); R(13, 42, 8, 3, 0xd6a020); R(23, 42, 8, 3, 0xd6a020);
  R(12, 15, 20, 17, 0x262834); R(14, 17, 16, 10, m); R(20, 20, 4, 4, 0xff2a4a);
  R(8, 16, 5, 11, m); R(31, 16, 5, 11, m); R(8, 26, 5, 3, 0xff2a4a); R(31, 26, 5, 3, 0xff2a4a);
  R(11, 11, 22, 5, 0xf2f2f2); R(16, 1, 12, 11, 0x2a2c38); R(16, 0, 7, 2, 0xb02838);
  R(23, 4, 3, 2, 0xff2a4a); R(28, 5, 5, 3, 0xd8c8a0); R(31, 8, 2, 3, 0xd8c8a0);
}

// The Platanus logo: a yellow disc with three cream banana strokes.
const platanusLogo = (c, x, y, r) => {
  c.fillStyle = PL; DOT(c, x, y, r);
  c.strokeStyle = '#fffbe4'; c.lineCap = 'butt';
  [[0.05, -0.66, 0.12, -0.05, -0.72, -0.07, 0.075], [0.12, -0.62, 0.16, 0.04, -0.44, 0.39, 0.09], [0.17, -0.65, 0.68, 0.02, 0.2, 0.72, 0.11]]
    .forEach(([a, b, qx, qy, d, e, w]) => {
      c.lineWidth = w * r; c.beginPath(); c.moveTo(x + a * r, y + b * r);
      c.quadraticCurveTo(x + qx * r, y + qy * r, x + d * r, y + e * r); c.stroke();
    });
}

const grad = (c, h, stops, y0 = 0) => { const g = c.createLinearGradient(0, y0, 0, h); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; }
const poly = (c, pts, col) => { c.fillStyle = col; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); }
const FONT = 'px Impact,"Arial Black",sans-serif';
// Chilean flag with its five-point star, w wide.
const flag = (c, x, y, w) => {
  const h = w * 2 / 3;
  FR(c, DK, x - 4, y - 4, w + 8, h + 8);
  FR(c, WH, x, y, w, h / 2);
  FR(c, '#d52b1e', x, y + h / 2, w, h / 2);
  FR(c, '#0039a6', x, y, h / 2, h / 2);
  poly(c, [...Array(10)].map((_, i) => { const r = (i % 2 ? 0.4 : 1) * h / 7, a = i * PI / 5 - PI / 2; return [x + h / 4 + r * COS(a), y + h / 4 + r * SIN(a)]; }), WH);
}
// Title logo: slanted chrome/neon words with speed streaks and the flag.
const logoTex = () => {
  cv('logo', 700, 270, (c) => {
    c.setTransform(1, 0, -0.2, 1, 40, 0);
    [[40, 70, PK], [520, 40, CY], [50, 176, CY], [560, 200, PK]].forEach(([x, y, k]) => { FR(c, k, x, y, 110, 6); c.fillRect(x + 24, y + 12, 60, 4); });
    [['HACKERS', 84, 78, PK, [WH, '#8ff8ff', '#1a7aff']], ['MUTANTES', 172, 84, '#3a0a4a', [YL, PK, '#9b1aff']], ['CHILENOS', 248, 60, CY, [WH, '#c8c8e8', '#6a6a98']]].forEach(([t, y, z, o, g]) => {
      c.font = '900 ' + z + FONT; c.textAlign = 'center'; c.lineJoin = 'round';
      c.lineWidth = 18; c.strokeStyle = DK; c.strokeText(t, 342, y + 6, 500); c.strokeText(t, 336, y, 500);
      c.lineWidth = 7; c.strokeStyle = o; c.strokeText(t, 336, y, 500);
      c.fillStyle = grad(c, y, g, y - z * 0.75); c.fillText(t, 336, y, 500);
    });
    c.setTransform(1, 0, 0, 1, 0, 0); flag(c, 616, 118, 64);
  });
}
// Slanted name badge with a colored tab, like the arcade poster.
const badge = (k, t, col) => {
  cv(k, 150, 36, (c) => {
    poly(c, [[14, 2], [148, 2], [136, 34], [2, 34]], DK);
    c.lineWidth = 3; c.strokeStyle = css(col); c.stroke();
    poly(c, [[14, 2], [38, 2], [26, 34], [2, 34]], css(col));
    c.font = 'italic 900 20' + FONT; c.textAlign = 'center'; c.fillStyle = WH; c.fillText(t, 88, 26, 96);
  });
}
const ridge = (c, base, amp, step, col, snow) => {
  const hs = [];
  for (let x = 0; x <= 800; x += step) hs.push(base - rr() * amp);
  hs[hs.length - 1] = hs[0];
  poly(c, [[0, 390], ...hs.map((y, i) => [i * step, y]), [800, 390]], col);
  if (snow) hs.forEach((y, i) => { if (y < base - amp * 0.55) poly(c, [[i * step, y], [i * step - 20, y + 24], [i * step + 20, y + 24]], snow); });
}
const city = (c, col, lit, h0, h1) => {
  for (let x = 0; x < 800;) {
    const w = ri(26, 64), h = ri(h0, h1);
    FR(c, col, x, 390 - h, w - 2, h);
    if (lit) for (let y = 396 - h; y < 384; y += 9) for (let i = x + 4; i < x + w - 6; i += 8) if (rr() < 0.35) { FR(c, rr() < 0.7 ? '#ffd66a' : '#6ae4ff', i, y, 3, 4); }
    x += w;
  }
}
// The Costanera Center tower on the skyline.
const tower = (c, x, col, lit) => {
  poly(c, [[x - 16, 390], [x - 7, 40], [x + 7, 40], [x + 16, 390]], col);
  FR(c, col, x - 5, 22, 10, 20);
  if (lit) { c.fillStyle = '#6ae4ff'; for (let y = 60; y < 380; y += 14) c.fillRect(x - 4, y, 8, 2); }
}
const tag = (c, x, y, w) => {
  const cols = [PK, '#39ff6a', CY, YL, '#9b5cff', '#ff8a1e'];
  c.lineWidth = 3; c.lineCap = 'round';
  for (let k = 0; k < 2; k++) {
    c.strokeStyle = cols[ri(0, 6)]; c.beginPath(); c.moveTo(x, y + ri(0, 24));
    for (let i = 1; i < 6; i++) c.quadraticCurveTo(x + i * w / 6 - w / 12, y + ri(-16, 36), x + i * w / 6, y + ri(0, 24));
    c.stroke();
  }
}
const txtC = (c, t, x, y, sz, col) => { c.font = 'bold ' + sz + 'px monospace'; c.textAlign = 'center'; c.fillStyle = col; c.fillText(t, x, y); }

const cloud = (c, x, y) => { c.fillStyle = 'rgba(255,255,255,.85)'; [[0, 0, 40], [34, -12, 30], [64, 2, 34]].forEach(([a, b, r]) => { DOT(c, x + a, y + b, r, r * 0.6); }); };
// Skies: 0 Santiago golden hour, 1 Providencia dusk, 2 Valpo day, 3 Atacama dusk, 4 Patagonia, 5 Costanera night, 6 title dusk.
const DUSK = ['#140a36', '#4a2a8a', '#c04a9a', '#ff8a7a', '#ffc27a'];
const SKY = [['#6fa0e0', '#c8b4e8', '#ffd0a0'], DUSK, ['#4a9ae8', '#a8d4ff', '#e8f6ff'], ['#2a1a5a', '#a04a8a', '#ff9a6a', '#ffc88a'], ['#3a6ac0', '#9cc4ec', '#ffe0c8'], ['#040410', '#100c2a', '#2a1a4a'], DUSK];
const farLayer = (s) => {
  cv('f' + s, 800, 390, (c) => {
    sd = 5 + s;
    FR(c, grad(c, 390, SKY[s]), 0, 0, 800, 390);
    if (s % 2 || s > 5) for (let i = 0; i < 90; i++) { FR(c, `rgba(255,255,255,${rr()})`, ri(0, 800), ri(0, s === 5 ? 220 : 110), 1 + (rr() < 0.1), 1 + (rr() < 0.1)); }
    if (s === 5) { c.fillStyle = '#eef0ff'; DOT(c, 660, 80, 26); }
    // Providencia and the title share the Andes + Costanera skyline.
    if (s === 1 || s > 5) { ridge(c, 290, 150, 50, '#5a4a9a', '#f4eeff'); ridge(c, 330, 60, 40, '#3a2c6a'); tower(c, 620, '#2a3a7a', 1); city(c, '#1c1638', 1, 50, 170); }
    if (s > 5) {
      FR(c, '#4a4466', 0, 334, 800, 56); FR(c, '#6c6690', 0, 328, 800, 8);
      for (let x = 160; x < 800; x += 210) tag(c, x, 346, 120);
      c.font = 'italic 900 38' + FONT; c.lineWidth = 6; c.strokeStyle = YL; c.strokeText('STGO', 40, 380); c.fillStyle = PK; c.fillText('STGO', 40, 380);
    }
    if (s === 0) { ridge(c, 300, 190, 50, '#8a86b8', '#fff6f0'); ridge(c, 345, 70, 40, '#a49ab8'); tower(c, 600, '#9a9cc0'); city(c, '#b0a8c4', 0, 30, 110); }
    if (s === 2 || s === 4) { cloud(c, 90, 70); cloud(c, 470, 46); }
    if (s === 2) {
      FR(c, '#2a6ab8', 0, 250, 800, 140);
      for (let i = 0; i < 60; i++) { FR(c, 'rgba(255,255,255,.35)', ri(0, 800), ri(255, 385), ri(8, 30), 2); }
      c.fillStyle = '#3a4a6a';
      [[90, 1], [300, -1]].forEach(([x, d]) => { c.fillRect(x, 150, 8, 100); c.fillRect(d < 0 ? x - 92 : x - 10, 150, 110, 6); c.fillRect(x + d * 70, 156, 2, 50); });
      c.fillRect(380, 228, 170, 24);
      const cc = ['#c83a3a', '#3a7ac8', '#e8b03a', '#3ab07a'];
      for (let i = 0; i < 12; i++) { FR(c, cc[i % 4], 390 + i % 6 * 24, 216 - (i / 6 | 0) * 10, 22, 9); }
      poly(c, [[0, 390], [0, 170], [120, 200], [200, 260], [260, 390]], '#4a6a4a');
    }
    // Atacama: Licancabur-style volcano with a snow cap and red rock spires.
    if (s === 3) {
      ridge(c, 330, 70, 60, '#7a3a5a');
      poly(c, [[300, 340], [470, 120], [520, 120], [700, 340]], '#6a3050');
      poly(c, [[440, 160], [470, 120], [520, 120], [550, 160], [520, 150], [495, 162], [470, 150]], '#ffeef0');
      for (let x = 20; x < 800; x += 130) poly(c, [[x, 390], [x + 14, 300 + ri(0, 40)], [x + 34, 290 + ri(0, 40)], [x + 60, 390]], rr() < 0.5 ? '#b0503a' : '#8a3a2a');
    }
    // Patagonia: the three granite Torres del Paine above a glacier lake.
    if (s === 4) {
      ridge(c, 300, 120, 40, '#6a7aa8', '#f6f8ff');
      [[300, 90], [360, 56], [420, 100]].forEach(([x, t]) => { poly(c, [[x - 34, 300], [x - 18, t], [x + 18, t + 6], [x + 30, 300]], '#7a7286'); poly(c, [[x - 18, t], [x + 18, t + 6], [x + 14, t + 30], [x - 16, t + 24]], '#f4f4ff'); });
      ridge(c, 296, 30, 40, '#3a5a3a'); FR(c, '#3aa8c8', 0, 286, 800, 50); FR(c, '#7a9a4a', 0, 336, 800, 54);
      for (let i = 0; i < 30; i++) FR(c, 'rgba(255,255,255,.3)', ri(0, 800), ri(290, 332), ri(10, 40), 2);
    }
    if (s === 5) {
      ridge(c, 230, 110, 50, '#15112c', '#2c2848');
      FR(c, '#08081a', 0, 250, 800, 140);
      for (let y = 262; y < 390; y += 9) for (let i = 0; i < 70; i++) { FR(c, rr() < 0.6 ? '#ffb05a' : '#fff4d0', ri(0, 800), y + ri(0, 4), 2, 1 + (y > 330)); }
    }
  });
}

const midLayer = (s) => {
  cv('m' + s, 1024, 290, (c) => {
    sd = 30 + s;
    [downtown, provi, valpo, atacama, patag, torre][s](c);
  });
}
const downtown = (c) => {
  const shops = ['FARMACIA', 'CAMBIO', 'COMPLETOS', 'ÓPTICA', 'CELULARES', 'SUSHI', 'LIBRERÍA', 'SOPAIPILLAS'], sm = [];
  for (let x = 0; x < 1024;) {
    let w = ri(180, 250); if (1024 - x - w < 150) w = 1024 - x;
    const top = ri(0, 50), aw = ['#d83a3a', '#2a8a4a', '#2a5ac8', '#e8a020'][ri(0, 4)];
    sm.push(x);
    if (top > 34) { FR(c, '#ddd', x + 20, top - 36, 2, 36); flag(c, x + 24, top - 34, 27); }
    FR(c, ['#cdb894', '#b9a27c', '#d9cbb0', '#a9b1bb', '#c9a0a0'][ri(0, 5)], x, top, w, 290 - top);
    FR(c, 'rgba(0,0,0,.18)', x, top, w, 6); c.fillRect(x, 166, w, 10); c.fillRect(x + w - 4, top, 4, 290 - top);
    for (let y = top + 22; y < 150; y += 40) for (let i = x + 16; i < x + w - 30; i += 36) { FR(c, '#2a3856', i, y, 20, 28); FR(c, '#5e7ca8', i + 2, y + 2, 7, 12); }
    FR(c, '#1b2433', x + 14, 200, w - 28, 90);
    if (rr() < 0.5) { FR(c, '#7a7f88', x + 14, 200, w - 28, 90); c.fillStyle = '#6a6f78'; for (let y = 204; y < 290; y += 8) c.fillRect(x + 14, y, w - 28, 2); tag(c, x + 30, 220, w - 70); }
    for (let i = 0; i < w - 28; i += 16) { FR(c, i % 32 ? '#f4f0e6' : aw, x + 14 + i, 186, MN(16, w - 28 - i), 14); }
    FR(c, '#16121e', x + w / 2 - 64, 160, 128, 22);
    txtC(c, shops[ri(0, shops.length)], x + w / 2, 176, 13, YL);
    for (let i = 0; i < 6; i++) { FR(c, [PK, CY, YL, WH][ri(0, 4)], x + ri(2, 12), ri(205, 280), 6, 5); }
    x += w;
  }
  // Street trees on the building seams, then a red-roofed kiosco selling diarios and bip!.
  sm.forEach((x) => { FR(c, '#5a3a24', x - 4, 196, 8, 94); c.fillStyle = '#4a8a3a'; [[0, 178, 34], [-24, 196, 24], [24, 196, 24]].forEach(([d, y, r]) => { DOT(c, x + d, y, r); }); });
  FR(c, '#2a6a3a', 470, 210, 90, 80); poly(c, [[460, 212], [570, 212], [560, 190], [470, 190]], '#c8202a'); txtC(c, 'KIOSCO', 515, 206, 11, WH);
  // A quiltro (Santiago street dog) napping by the kiosco.
  c.fillStyle = '#b8864a'; DOT(c, 610, 280, 26, 9); DOT(c, 588, 276, 8); FR(c, '#7a5530', 583, 267, 5, 7); txtC(c, 'z Z', 590, 258, 11, WH);
  for (let i = 0; i < 8; i++) FR(c, [YL, CY, PK, WH][i % 4], 478 + i % 4 * 20, 222 + (i >> 2) * 22, 14, 18);
}
const provi = (c) => {
  // Office blocks with gaps, so the Andes and the Costanera show through behind them.
  for (let x = 0; x < 1024; x += 256) {
    FR(c, '#1e1a3a', x + 140, 30, 110, 140);
    for (let y = 40; y < 160; y += 18) for (let i = x + 148; i < x + 240; i += 18) { const r = rr(); FR(c, r < 0.3 ? '#ffd66a' : r < 0.45 ? '#6ae4ff' : '#26224a', i, y, 12, 12); }
  }
  FR(c, '#14122a', 0, 150, 1024, 140);
  const ns = ['CAFÉ', 'SUSHI', 'BAR', 'ARCADE', 'POKE', '24 HRS', 'GAMER', 'VINILOS'];
  for (let x = 0; x < 1024; x += 256) {
    FR(c, '#0c0a18', x + 16, 196, 224, 94);
    FR(c, 'rgba(120,160,255,.08)', x + 24, 204, 208, 80);
    const col = [PK, CY, '#39ff6a', YL][ri(0, 4)];
    c.shadowColor = col; c.shadowBlur = 14; c.strokeStyle = col; c.lineWidth = 3; c.strokeRect(x + 48, 160, 160, 30);
    txtC(c, ns[ri(0, ns.length)], x + 128, 183, 20, col); c.shadowBlur = 0;
    tag(c, x + 220, 230, 40);
  }
}
const valpo = (c) => {
  poly(c, [[0, 290], [0, 40], [260, 10], [470, 70], [560, 190], [840, 190], [940, 80], [1024, 40], [1024, 290]], '#4a5a3c');
  const hc = ['#ffcf3a', '#3ab0ff', '#ff4a6a', '#7ad84a', '#ff8a2a', '#c86aff', '#f4f4f4', '#2ac8b0'];
  for (let i = 0; i < 24; i++) {
    const x = i % 4 ? ri(0, 400) : ri(900, 990), y = ri(40, 130), w = ri(40, 70), h = ri(34, 52);
    FR(c, hc[ri(0, 8)], x, y, w, h);
    FR(c, '#5a3a3a', x - 3, y - 6, w + 6, 7);
    c.fillStyle = '#20304a'; for (let k = x + 8; k < x + w - 10; k += 16) c.fillRect(k, y + 10, 9, 12);
  }
  c.strokeStyle = '#3a3a3a'; c.lineWidth = 4; LN(c, 300, 200, 450, 40);
  poly(c, [[340, 150], [380, 150], [400, 128], [360, 128]], '#e83a3a');
  FR(c, '#8c7c6c', 0, 190, 1024, 100);
  for (let i = 0; i < 10; i++) { c.fillStyle = hc[ri(0, 8)]; DOT(c, ri(20, 1000), ri(205, 280), ri(14, 40)); }
  // Street-art cat mural, a Valparaíso classic.
  FR(c, '#6a3aa8', 250, 196, 140, 90); c.fillStyle = '#3ab0e8'; DOT(c, 320, 246, 34);
  poly(c, [[290, 232], [296, 196], [316, 216]], '#3ab0e8'); poly(c, [[350, 232], [344, 196], [324, 216]], '#3ab0e8');
  [306, 334].forEach((x) => { c.fillStyle = YL; DOT(c, x, 242, 8, 10); FR(c, '#111', x - 2, 235, 4, 14); });
  c.font = 'bold 40px monospace'; c.textAlign = 'center'; c.lineWidth = 5; c.strokeStyle = '#1a1020'; c.strokeText('VALPO', 640, 262); c.fillStyle = '#ffcf3a'; c.fillText('VALPO', 640, 262);
}
const atacama = (c) => {
  [[120, 1], [430, 0.8], [760, 1.1]].forEach(([x, k]) => {
    FR(c, '#c8ccd8', x - 6, 110, 12, 92);
    c.save(); c.translate(x, 100); c.rotate(-0.5);
    c.fillStyle = '#eef1f8'; DOT(c, 0, 0, 48 * k, 20 * k);
    c.fillStyle = '#b8bccc'; DOT(c, 0, 4, 40 * k, 13 * k);
    c.strokeStyle = '#ddd'; c.lineWidth = 2; c.beginPath(); c.moveTo(-30 * k, 0); c.lineTo(0, -40 * k); c.lineTo(30 * k, 0); c.stroke();
    c.restore();
  });
  for (let x = 200; x < 1024; x += 300) for (let i = 0; i < 4; i++) poly(c, [[x + i * 44, 198], [x + i * 44 + 38, 198], [x + i * 44 + 46, 178], [x + i * 44 + 8, 178]], i % 2 ? '#2a4cb0' : '#1e3c9a');
  c.fillStyle = '#4a4a58'; for (let x = 0; x < 1024; x += 64) c.fillRect(x, 200, 4, 90);
  c.fillRect(0, 203, 1024, 3);
  c.strokeStyle = 'rgba(170,170,190,.35)'; c.lineWidth = 1;
  for (let x = -96; x < 1100; x += 12) { LN(c, x, 206, x + 84, 290); LN(c, x, 290, x + 84, 206); }
}
// Patagonia: estancia houses with tin roofs, wind-bent lengas, a fence and a guanaco.
const patag = (c) => {
  for (let x = 30; x < 1024; x += 330) {
    FR(c, ['#d8c8a8', '#a8c0d0', '#e8d8b8'][ri(0, 3)], x, 150, 150, 100);
    poly(c, [[x - 10, 152], [x + 75, 110], [x + 160, 152]], rr() < 0.5 ? '#c03a2a' : '#3a7a4a');
    for (let i = x + 16; i < x + 140; i += 44) FR(c, '#2a3040', i, 172, 22, 26);
    FR(c, '#5a3a24', x + 62, 200, 26, 50);
    poly(c, [[x + 220, 250], [x + 228, 250], [x + 250, 170], [x + 244, 168]], '#4a3020');
    c.fillStyle = '#3a6a32'; DOT(c, x + 270, 168, 44, 18, -0.3);
  }
  const g = 700, k = '#c8945a';
  FR(c, k, g, 196, 44, 18); FR(c, k, g + 38, 166, 8, 34); FR(c, k, g + 36, 160, 16, 9); FR(c, k, g + 40, 154, 3, 7); FR(c, '#f0e0c8', g + 4, 206, 36, 8);
  [2, 10, 30, 38].forEach((d) => FR(c, '#8a6038', g + d, 214, 4, 26));
  FR(c, '#6a4a2a', 0, 240, 1024, 4); for (let x = 0; x < 1024; x += 32) FR(c, '#6a4a2a', x, 228, 5, 36);
}
const torre = (c) => {
  FR(c, 'rgba(120,170,255,.07)', 0, 0, 1024, 150);
  c.fillStyle = '#262838'; for (let x = 0; x < 1024; x += 128) c.fillRect(x, 0, 6, 150);
  c.fillRect(0, 70, 1024, 4); c.fillRect(0, 146, 1024, 8);
  FR(c, '#b01828', 250, 14, 220, 40); txtC(c, 'CONDOR CORP', 360, 42, 22, WH);
  FR(c, '#12141c', 0, 152, 1024, 138);
  for (let x = 10; x < 1000; x += 86) {
    if (x > 540 && x < 700) continue;
    FR(c, '#0a0b10', x, 166, 72, 124); c.strokeStyle = '#2c3040'; c.lineWidth = 2; c.strokeRect(x, 166, 72, 124);
    for (let y = 176; y < 286; y += 10) { FR(c, '#1a1d28', x + 6, y, 60, 7); FR(c, ['#39ff6a', CY, '#ff3040', YL][ri(0, 4)], x + 8 + ri(0, 50), y + 2, 3, 3); }
  }
  FR(c, '#8a90a0', 580, 170, 100, 120); FR(c, '#5a6070', 629, 170, 2, 120);
  txtC(c, 'PISO 62', 630, 164, 13, '#ff3040');
}
const groundLayer = (s) => {
  cv('g' + s, 256, 210, (c) => {
    sd = 50 + s;
    FR(c, ['#b3a493', '#17151f', '#5e5664', '#8b4a30', '#857e70', '#14161f'][s], 0, 0, 256, 210);
    if (s === 4) for (let i = 0; i < 260; i++) FR(c, rr() < 0.5 ? '#a09888' : '#5e5848', ri(0, 256), ri(0, 210), 3, 2);
    if (s === 0) { c.strokeStyle = '#9a8a7a'; c.lineWidth = 2; for (let i = -256; i < 512; i += 32) { LN(c, i, 0, i + 210, 210); LN(c, i + 210, 0, i, 210); } }
    if (s === 1) {
      FR(c, '#2b2939', 0, 0, 256, 44); c.fillStyle = '#3a3850'; for (let x = 0; x < 256; x += 64) c.fillRect(x, 0, 2, 44); c.fillRect(0, 42, 256, 3);
      for (let i = 0; i < 14; i++) { FR(c, rr() < 0.5 ? 'rgba(255,60,166,.14)' : 'rgba(64,224,255,.13)', ri(0, 200), ri(50, 200), ri(20, 56), 3); }
    }
    if (s === 2) for (let y = 0; y < 210; y += 14) for (let x = (y / 14 % 2) * 8 - 16; x < 272; x += 16) { c.fillStyle = rr() < 0.5 ? '#7a7084' : '#6c6476'; DOT(c, x, y + 7, 7, 6); }
    if (s === 3) { for (let i = 0; i < 300; i++) { FR(c, rr() < 0.5 ? '#a05a3a' : '#74402a', ri(0, 256), ri(0, 210), 2, 2); } FR(c, '#6e3a26', 0, 120, 256, 5); c.fillRect(0, 150, 256, 5); }
    if (s === 5) {
      c.strokeStyle = '#262a3a'; c.lineWidth = 2;
      for (let x = 0; x < 256; x += 64) { LN(c, x, 0, x, 210); }
      for (let y = 0; y < 210; y += 42) { LN(c, 0, y, 256, y); }
      FR(c, 'rgba(160,200,255,.05)', 0, 60, 256, 30);
    }
    FR(c, 'rgba(0,0,0,.35)', 0, 0, 256, 6);
  });
}
const signTex = (k, t, bg) => {
  const w = t.length * 11 + 24;
  cv(k, w, 30, (c) => { FR(c, '#e8e8e8', 0, 0, w, 30); FR(c, css(bg), 3, 3, w - 6, 24); txtC(c, t, w / 2, 20, 15, WH); });
}

const genArt = () => {
  for (const k in LOOK) for (const p of POSES) pix(k + '_' + p, 23, 30, (R) => human(R, LOOK[k], p));
  [0, 1].forEach((f) => { pix('dr' + f, 18, 10, (R) => drone(R, f)); pix('cd' + f, 44, 46, (R) => condor(R, f)); });
  [0, 1, 2].forEach((f) => pix('dg' + f, 22, 13, (R) => dog(R, f)));
  pix('it0', 14, 7, (R) => { R(0, 3, 14, 4, 0xd99a4a); R(1, 2, 12, 2, 0xb8462a); R(2, 1, 10, 1, 0x86c840); R(3, 1, 2, 1, 0xe83a3a); R(8, 1, 2, 1, 0xe83a3a); R(1, 0, 12, 1, 0xf6f0d0); });
  pix('it1', 12, 11, (R) => { R(9, 0, 2, 2, 0x5a3a14); R(8, 2, 3, 2, 0xffd21a); R(7, 4, 3, 2, 0xffd21a); R(5, 6, 4, 2, 0xffd21a); R(1, 7, 5, 2, 0xffd21a); R(0, 8, 1, 1, 0x5a3a14); R(6, 5, 2, 1, 0xfff27a); });
  pix('it2', 11, 7, (R) => { R(0, 0, 11, 7, 0x1aa0e8); R(0, 5, 11, 2, 0x0a5aa8); R(1, 1, 3, 2, 0xffd21a); R(6, 1, 4, 1, 0xffffff); });
  pix('it3', 7, 10, (R) => { R(0, 2, 7, 8, 0xe8e0c8); R(1, 4, 5, 5, 0xc8782a); R(2, 5, 3, 3, 0xffa640); R(5, 0, 1, 4, 0xff3a3a); });
  pix('bx0', 10, 14, (R) => { R(0, 0, 10, 3, 0x2a7a3a); R(1, 3, 8, 11, 0x3a9a4a); R(3, 5, 4, 1, 0x1a4a2a); });
  pix('bx1', 14, 11, (R) => { R(0, 0, 14, 11, 0xb8864a); R(0, 0, 14, 2, 0xd8a868); R(6, 0, 2, 11, 0xd8c890); });
  pix('sp', 9, 9, (R) => { R(4, 0, 1, 9, 0xffffff); R(0, 4, 9, 1, 0xffffff); R(3, 3, 3, 3, 0xfff27a); [[2, 2], [6, 6], [6, 2], [2, 6]].forEach(([x, y]) => R(x, y, 1, 1, 0xffffff)); }, 3, 0);
  cv('plat', 128, 128, (c) => platanusLogo(c, 64, 64, 62));
  S.textures.get('plat').setFilter(Phaser.Textures.FilterMode.LINEAR);
  cv('pb', 240, 112, (c) => {
    FR(c, PL, 0, 0, 240, 112); FR(c, '#1a1424', 4, 4, 232, 104);
    platanusLogo(c, 56, 56, 42);
    txtC(c, 'PLATANUS', 166, 44, 22, PL); txtC(c, 'HACK 26', 166, 70, 22, WH); txtC(c, 'SANTIAGO', 166, 94, 13, PL);
  });
  for (let s = 0; s < 6; s++) { farLayer(s); midLayer(s); groundLayer(s); STG[s].sg.forEach(([t, bg], k) => signTex('sg' + s + k, t, bg)); }
  farLayer(6); logoTex(); S.textures.get('logo').setFilter(Phaser.Textures.FilterMode.LINEAR);
  // Foreground street lamp (one per 1100px tile) and diagonal rain streaks.
  cv('fg', 1100, 600, (c) => {
    c.fillStyle = 'rgba(255,214,120,.16)'; DOT(c, 92, 196, 46);
    FR(c, '#0b0814', 40, 186, 12, 414); FR(c, '#0b0814', 40, 180, 60, 8); FR(c, '#0b0814', 76, 186, 28, 8); FR(c, '#ffe9a0', 80, 194, 22, 4);
    FR(c, '#0b0814', 28, 560, 36, 40);
  });
  cv('rn', 256, 256, (c) => {
    c.strokeStyle = 'rgba(170,200,255,.4)';
    for (let i = 0; i < 70; i++) { const x = rr() * 256, y = rr() * 256; LN(c, x, y, x - 4, y + 14); }
  });
  HER.forEach((h, i) => badge('nb' + i, h.n, h.c));
}

// ---------- UI helpers ----------
const ui = (o, d = 1000) => { o.setScrollFactor(0).setDepth(d); UI.push(o); return o; }
const txt = (x, y, s, sz, col, ox = 0.5) => AD.text(x, y, s, TS(sz, col)).setOrigin(ox, 0.5);
// UI text in one call: ut(x, y, text, size, depth = 10, color, originX).
const ut = (x, y, t, sz, d = 10, col, ox) => ui(txt(x, y, t, sz, col, ox), d);
// Full-screen dim overlay and a tween shorthand (k: destroy the target when done).
const dim = (a, d = 3, k = 0x0a0614) => ui(AD.rectangle(W / 2, H / 2, W, H, k, a), d);
const tw = (t, o, k) => S.tweens.add({ targets: t, ...o, onComplete: k && (() => t.destroy()) });
const clearAll = () => { UI.forEach((o) => { S.tweens.killTweensOf(o); o.destroy(); }); UI = []; }
const clearWorld = () => {
  [...E, ...PR, ...IT, ...AL].forEach((o) => { o.s.destroy(); if (o.sd) o.sd.destroy(); });
  E = []; PR = []; IT = []; AL = [];
  WO.forEach((o) => o.destroy()); WO = [];
  P.forEach((p) => { if (p && p.s) { p.s.destroy(); p.sd.destroy(); p.s = null; } });
}
const camX = () => CM.scrollX;
const bgSet = (i) => {
  return {
    f: ui(AD.tileSprite(0, 0, W, FLOOR, 'f' + i).setOrigin(0), 0),
    m: ui(AD.tileSprite(0, 100, W, 290, 'm' + i).setOrigin(0), 1),
    g: ui(AD.tileSprite(0, FLOOR - 2, W, 210, 'g' + i).setOrigin(0), 2),
  };
}
const scrollBg = (x) => { L.f.tilePositionX = x * 0.2; L.m.tilePositionX = x; L.g.tilePositionX = x; if (L.p) L.p.tilePositionX = x * 1.4; }
const duskBg = () => { L = bgSet(1); L.f.setTexture('f6'); L.m.setVisible(false); }
const banner = (lines, ms = 2400) => {
  lines.forEach((t, k) => {
    const o = ut(-300, 210 + k * 46, t, k === 1 ? 40 : k ? 18 : 24, 4000, k === 1 ? YL : WH);
    tw(o, { x: W / 2, duration: 350, delay: k * 120, ease: 'Back.Out' });
    tw(o, { alpha: 0, delay: ms, duration: 400 });
  });
}
const logoBadge = (x, y, s) => {
  ui(AD.image(x, y, 'plat').setScale(s), 10);
  ut(x, y + 66 * s + 10, 'PLATANUS HACK 26', 11, 10, PL);
}

// ---------- Effects ----------
const spark = (x, y, col = 0xffffff) => {
  const s = AD.image(x, y, 'sp').setDepth(2000).setAngle(RND() * 90).setTint(col);
  tw(s, { scale: { from: 0.6, to: 1.6 }, alpha: 0, duration: 200 }, 1);
}
const ring = (x, y, r, col) => {
  const c = AD.circle(x, y - 30, r, col, 0.15).setStrokeStyle(6, col).setDepth(1999).setScale(0.1);
  tw(c, { scale: 1, alpha: 0, duration: 420 }, 1);
}
const pop = (x, y, t, col = WH, sz = 16) => {
  const o = AD.text(x, y, t, TS(sz, col)).setOrigin(0.5).setDepth(3000);
  tw(o, { y: y - 40, alpha: { from: 1, to: 0 }, duration: 1100, ease: 'Quad.In' }, 1);
}
const boom = (x, y) => { for (let i = 0; i < 4; i++) spark(x + (RND() - 0.5) * 40, y + (RND() - 0.5) * 40, i % 2 ? 0xffa040 : 0xffffff); ring(x, y + 30, 50, 0xffa040); SFX_boom(); }
const ghost = (p) => {
  const g = hum(p.s.x, p.s.y, p.s.texture.key).setFlipX(p.f < 0).setTintFill(p.h.c).setAlpha(0.55).setDepth(p.y - 1);
  tw(g, { alpha: 0, duration: 260 }, 1);
}
const zap = (x1, y1, x2, y2, col) => tw(AD.line(0, 0, x1, y1, x2, y2, col).setOrigin(0).setLineWidth(3).setDepth(1998), { alpha: 0, duration: 120 }, 1);
const debris = (e) => { dust(e.x, e.y, 5); spark(e.x, e.y - 20, e.v ? 0xb8864a : 0x3a9a4a); SFX_thud(); }
// Big shakes (boss death, quake, stomp) force past a small hit shake that is still running.
const tn = () => S.time.now;
// A player who is still in the game (not out of lives).
const live = (p) => p && p.st !== 'o';
const later = (ms, f) => S.time.delayedCall(ms, f);
// A human-rig sprite anchored at its feet.
const hum = (x, y, k) => AD.image(x, y, k).setOrigin(0.46, 1);
const shake = (d, i) => CM.shake(d, i, i > 0.01);
// Squash (v > 0) or stretch (v < 0) that springs back to rest in 180 ms; drawE applies it.
const squ = (o, v) => { o.sq = v; o.sqT = tn(); };
const dust = (x, y, n = 3) => {
  for (let i = 0; i < n; i++) {
    const k = i - (n - 1) / 2, d = AD.circle(x + k * 12, y - 4, 5, 0xe8e0f0, 0.5).setDepth(y + 1);
    tw(d, { x: x + k * 26, y: y - 12, scale: 2.4, alpha: 0, duration: 380, ease: 'Quad.Out' }, 1);
  }
}

// ---------- Phaser setup ----------

function create() {
  S = this; AD = S.add; CM = S.cameras.main;
  // Soft vignette (WebGL only; a no-op under Canvas) to frame the action.
  if (CM.postFX) CM.postFX.addVignette(0.5, 0.5, 0.92, 0.3);
  AC = S.sound.context || null;
  if (AC) { MG = AC.createGain(); MG.gain.value = 0.45; MG.connect(AC.destination); }
  genArt();
  title();
  loadBoard().then(() => { if (MODE === 't' && G.rt) G.rt.setText(recStr()); });
}

const update = (time, delta) => {
  const dt = MN(delta, 50) / 16.67;
  musTick();
  // Modes: t title, s select, p play, o game over, n name entry, e end screens.
  const f = { t: upTitle, s: upSel, p: upPlay, n: upName, e: upEnd }[MODE];
  const fz = MODE === 'p' && st && !st.end && frz > tn();
  if (f) f(dt, time);
  // Keep taps pending through hit-stop frames so combo inputs are not dropped.
  if (!fz) was = { ...held };
}

// ---------- Title ----------
const recStr = () => board.slice(0, 5).map((e, i) => `${i + 1}. ${e.n.padEnd(3)} ${String(e.s).padStart(7, '0')}`).join('\n') || 'SIN RÉCORDS AÚN\n¡SÉ EL PRIMERO!';
const title = () => {
  clearAll(); clearWorld(); MODE = 't'; CM.setScroll(0, 0);
  duskBg();
  const lg =ui(AD.image(W / 2, 150, 'logo').setScale(0.84), 10);
  tw(lg, { y: 143, yoyo: true, repeat: -1, duration: 1100, ease: 'Sine.InOut' });
  ut(W / 2, 286, 'CONDOR CORP SE TOMÓ LA RED. ¡A HACKEARLOS, PO!', 15, 10, YL);
  G.ic = ut(W / 2, 318, '>>> INSERT COIN <<<', 22, 10, YL);
  G.st = ut(W / 2, 346, 'PRESIONA START', 22);
  // Heroes stand on the wet street with a faint mirrored reflection.
  G.hs = HER.map((h, i) => {
    const x = 160 + i * 160;
    ui(AD.image(x, 384, 'nb' + i), 10);
    return [1.6, -0.7].map((k) => ui(hum(x, 550, 'h' + i + '_i0').setScale(1.6, k).setAlpha(k < 0 ? 0.25 : 1), 10));
  });
  logoBadge(70, 62, 0.62);
  ut(730, 40, 'RÉCORDS', 14, 10, YL);
  G.rt = ui(AD.text(730, 54, recStr(), TS(11, WH)).setOrigin(0.5, 0), 10);
  ut(W / 2, 584, '1 O 2 JUGADORES · 6 ETAPAS · DE SANTIAGO A LA PATAGONIA', 11, 10, '#b0a8c8');
  playSong(SONG.t);
}
const SHOW = ['i0', 'i1', 'i0', 'i1', 'p1', 'p2', 'k', 'i0', 's', 's', 'i1', 'i0'];
const upTitle = (dt, now) => {
  G.tx = (G.tx || 0) + dt * 1.2; scrollBg(G.tx);
  G.st.setAlpha((now / 450 | 0) % 2 ? 1 : 0.25); G.ic.setAlpha((now / 450 | 0) % 2 ? 0.35 : 1);
  G.hs.forEach((a, i) => a.forEach((s) => s.setTexture('h' + i + '_' + SHOW[((now / 300 | 0) + i * 3) % 12])));
  if (tap('START1')) sel(0); else if (tap('START2')) sel(1);
}

// ---------- Character select ----------
const sel = (pi) => {
  clearAll(); MODE = 's'; SFX_pk();
  L = bgSet(0);
  dim(0.6);
  ut(W / 2, 48, 'ELIGE TU HACKER', 34, 10, YL);
  G.j = [pi === 0, pi === 1]; G.cu = [0, 3]; G.lk = [-1, -1]; G.go = 0;
  G.cards = HER.map((h, i) => {
    const x = 130 + i * 180;
    const g = ui(AD.graphics(), 9);
    const im = ui(hum(x, 330, 'h' + i + '_i0').setScale(1.6), 11);
    ui(AD.image(x, 356, 'nb' + i), 11);
    ut(x, 386, h.d, 11, 11, css(h.c));
    ['VEL', 'FUERZA', 'HACK'].forEach((l, k) => {
      ut(x - 72, 412 + k * 20, l, 11, 11, '#aaaaaa', 0);
      for (let q = 0; q < 5; q++) ui(AD.rectangle(x + 4 + q * 14, 412 + k * 20, 11, 9, q < h.st[k] ? h.c : 0x333344), 11);
    });
    ut(x, 474, '> B3: ' + h.b, 11, 11, WH);
    return { x, g, im };
  });
  G.tags = [ut(0, 0, '1P', 20, 12, PK), ut(0, 0, '2P', 20, 12, CY)];
  ut(W / 2, 510, 'JOYSTICK: ELEGIR · B1: CONFIRMAR', 13, 10, '#cccccc');
  G.jn = ut(W / 2, 534, '', 13, 10, CY);
  ut(W / 2, 568, 'B1 GOLPE (MANTÉN: BLOQUEO) · B2 SALTO · B3 HACKEO', 12, 10, YL);
  logoBadge(740, 50, 0.4);
}
const upSel = (dt, now) => {
  G.tx = (G.tx || 0) + dt * 0.6; scrollBg(G.tx);
  for (let pi = 0; pi < 2; pi++) {
    const pre = 'P' + (pi + 1) + '_', o = G.lk[1 - pi];
    if (!G.j[pi]) {
      if (tap('START' + (pi + 1))) { G.j[pi] = true; G.go = 0; G.cu[pi] = [0, 1, 2, 3].find((i) => i !== o); SFX_sel(); }
      continue;
    }
    if (G.lk[pi] >= 0) continue;
    if (tap(pre + 'L')) { G.cu[pi] = (G.cu[pi] + 3) % 4; SFX_sel(); }
    if (tap(pre + 'R')) { G.cu[pi] = (G.cu[pi] + 1) % 4; SFX_sel(); }
    if ((btn(pre, 1) || tap('START' + (pi + 1))) && G.cu[pi] !== o) { G.lk[pi] = G.cu[pi]; SFX_pk(); }
  }
  G.cards.forEach((c, i) => {
    const l = G.lk.indexOf(i), cu = [0, 1].filter((pi) => G.j[pi] && G.cu[pi] === i);
    c.g.clear().fillStyle(0x120c22, 0.9).fillRect(c.x - 82, 160, 164, 330);
    c.g.lineStyle(l >= 0 ? 5 : 2, l === 0 ? 0xff3ca6 : l === 1 ? 0x40e0ff : cu.length ? 0xffffff : 0x3a3450).strokeRect(c.x - 82, 160, 164, 330);
    c.im.setTexture('h' + i + '_' + (l >= 0 ? 's' : SHOW[((now / 300 | 0) + i * 3) % 12]));
  });
  [0, 1].forEach((pi) => { const t = G.tags[pi]; t.setVisible(G.j[pi]); t.setPosition(G.cards[G.cu[pi]].x + (pi ? 30 : -30), 176); });
  G.jn.setText(G.j[0] && G.j[1] ? '' : (G.j[0] ? 'P2' : 'P1') + ': PRESIONA START PARA UNIRTE').setAlpha((now / 400 | 0) % 2 ? 1 : 0.3);
  if (!G.go && [0, 1].every((pi) => !G.j[pi] || G.lk[pi] >= 0)) G.go = now + 700;
  if (G.go && now > G.go) {
    FIN = [];
    P = [0, 1].map((pi) => (G.j[pi] ? newP(pi, G.lk[pi]) : null));
    stage(0);
  }
}

// ---------- Players ----------
const newP = (pi, hi) => {
  return { pi, hi, h: HER[hi], k: 'h' + hi, pre: 'P' + (pi + 1) + '_', hp: 100, lives: 3, sc: 0, hk: 30, st: 'i', t: 0, cb: 0, lt: 0, f: 1, fl: 0, inv: 0, hitd: new Set(), x: 0, y: 0, z: 0, vz: 0 };
}
const spawnP = (p, x) => {
  p.s = hum(x, 0, p.k + '_i0');
  p.sd = AD.ellipse(x, 0, 46, 12, 0, 0.35).setDepth(390);
  Object.assign(p, { x, y: 470 + p.pi * 50, z: 380, vz: 0, f: 1, inv: 1500 });
  setSt(p, 'j');
}
const setSt = (p, s) => { p.st = s; p.t = 0; p.hd = 0; }
const join = (pi) => {
  const o = P[1 - pi], prev = P[pi];
  let hi = prev ? prev.hi : pi;
  if (o && o.hi === hi) hi = [0, 1, 2, 3].find((i) => i !== o.hi);
  if (prev && prev.s) { prev.s.destroy(); prev.sd.destroy(); }
  P[pi] = newP(pi, hi);
  if (prev) { P[pi].sc = prev.sc; FIN = FIN.filter((f) => f.pi !== pi); }
  // During the stage-clear banner the next stage() spawns them.
  if (!st.end) spawnP(P[pi], camX() + W / 2);
  pop(camX() + W / 2, 260, 'P' + (pi + 1) + ': ' + HER[hi].n + ' SE UNE', css(HER[hi].c), 22);
  SFX_pk();
}
const reach = (p, e, r) => {
  const dx = (e.x - p.x) * p.f;
  return !e.dead && !e.rm && dx > -12 && dx < r + e.w && ABS(e.y - p.y) < 24 && e.z < 70;
}
const strike = (p, mult, kn, r) => { E.forEach((e) => { if (reach(p, e, r)) hurtE(e, p.h.pw * mult, kn, p); }); }
const special = (p) => {
  if (p.hk < 50) { pop(p.x, p.y - 110, 'FALTA HACK', '#9a9ab0'); SFX_bz(); return; }
  p.hk -= 50; setSt(p, 'x'); p.hitd.clear(); SFX_zap();
  pop(p.x, p.y - 120, p.h.cry, css(p.h.c), 22);
  CM.flash(120, p.h.c >> 16, p.h.c >> 8 & 255, p.h.c & 255);
  const x = p.h.x;
  if (x === 'drone') AL.push({ ow: p, x: p.x, y: p.y, z: 90, life: 7000, cd: 0, s: AD.image(p.x, p.y, 'dr0').setOrigin(0.5, 1).setTint(0xffa040) });
  if (x === 'holo') { const o = proj(p.x + p.f * 30, p.y, 0, p.f * 9, 'p', 26, 1, 20, 110, 0x9b5cff); o.ow = p; o.life = 1000; }
  if (x === 'emp') {
    ring(p.x, p.y, 200, p.h.c);
    E.forEach((e) => {
      if (e.dead || ABS(e.x - p.x) > 200 || ABS(e.y - p.y) > 90) return;
      if (e.t === 'dr' || e.t === 'dg') hurtE(e, 60, 1, p, 1);
      else { hurtE(e, 16, 0, p, 1); if (!e.boss && !e.bx && e.hp > 0) es(e, 'u'); }
    });
  }
}
const upP = (p, dt, now) => {
  if (p.st === 'o') return;
  const ms = dt * 16.67, pre = p.pre;
  const mx = (held[pre + 'R'] ? 1 : 0) - (held[pre + 'L'] ? 1 : 0), my = (held[pre + 'D'] ? 1 : 0) - (held[pre + 'U'] ? 1 : 0);
  p.t += ms; if (p.inv > 0) p.inv -= ms; if (p.fl > 0) p.fl -= ms;
  if (p.z > 0 || p.vz > 0) {
    // Heavier gravity on the way down: same jump height, snappier landing.
    p.z += p.vz * dt; p.vz -= (p.vz > 0 ? 0.55 : 0.75) * dt;
    if (p.st === 'd') p.x += p.kx * dt;
    if (p.z <= 0) {
      p.z = 0; p.vz = 0;
      if (p.st === 'j' || p.st === 'jk') { setSt(p, 'i'); squ(p, 0.22); dust(p.x, p.y); }
      if (p.st === 'd') { p.t = 0; SFX_thud(); dust(p.x, p.y, 4); }
    }
  }
  const s = p.st;
  if (s === 'i' || s === 'w') {
    if (mx) p.f = mx;
    // Providencia's wet floor keeps momentum, so players slide when they stop or turn.
    p.vx = st.i === 1 ? (p.vx || 0) + (mx * p.h.sp - (p.vx || 0)) * 0.06 * dt : mx * p.h.sp;
    p.x += p.vx * dt; p.y += my * p.h.sp * 0.65 * dt; p.st = mx || my ? 'w' : 'i';
    if (btn(pre, 1)) { p.cb = now - p.lt < 480 && p.cb < 3 ? p.cb + 1 : 1; p.lt = now; setSt(p, 'a'); SFX_sw(); }
    else if (btn(pre, 2)) { p.vz = 10; p.z = 0.1; setSt(p, 'j'); SFX_jp(); squ(p, -0.2); }
    else if (btn(pre, 3)) special(p);
    // Hold Hit after the punch to guard: the press attacks (edge), holding blocks (level).
    else if (held[pre + 1] || held[pre + 4]) setSt(p, 'b');
  } else if (s === 'b') { if (!held[pre + 1] && !held[pre + 4]) setSt(p, 'i'); }
  else if (s === 'a') {
    const fin = p.cb === 3;
    if (p.t > 60 && !p.hd) { p.hd = 1; strike(p, fin ? 1.7 : 1, fin, p.h.rg + (fin ? 14 : 0)); }
    if (p.t > (fin ? 320 : 190)) setSt(p, 'i');
  } else if (s === 'j' || s === 'jk') {
    if (mx) p.f = mx;
    p.x += mx * p.h.sp * dt;
    if (s === 'j' && btn(pre, 1)) { setSt(p, 'jk'); p.hitd.clear(); SFX_sw(); }
    if (p.st === 'jk') E.forEach((e) => { if (!p.hitd.has(e) && reach(p, e, p.h.rg + 12)) { p.hitd.add(e); hurtE(e, p.h.pw * 1.4, 1, p); } });
  } else if (s === 'h') { if (p.t > 280) setSt(p, 'i'); }
  else if (s === 'd') { if (p.z <= 0 && p.t > 850) { if (p.hp <= 0) loseLife(p); else { setSt(p, 'i'); p.inv = 1000; } } }
  else if (s === 'x') {
    if (p.h.x === 'dash' && p.t < 340) {
      p.x += p.f * 12 * dt;
      E.forEach((e) => { if (!p.hitd.has(e) && !e.dead && ABS(e.x - p.x) < 44 && ABS(e.y - p.y) < 26) { p.hitd.add(e); hurtE(e, 30, 1, p, 1); } });
      if ((p.t / 40 | 0) !== p.gh) { p.gh = p.t / 40 | 0; ghost(p); }
    }
    if (p.t > 360) setSt(p, 'i');
  }
  const c = camX();
  p.x = cl(p.x, c + 26, c + W - 26); p.y = cl(p.y, FLOOR + 10, H - 12);
}
// ub: unblockable (shockwaves, stage hazards).
const hurtP = (p, d, kn, fx, ub) => {
  if (p.st === 'o' || p.st === 'd' || p.inv > 0 || (p.st === 'x' && p.h.x === 'dash')) return;
  // Guarding a frontal hit: only chip damage, a small push and a clank.
  if (p.st === 'b' && !ub && (fx - p.x) * p.f > 0) { p.hp = MX(1, p.hp - d / 6); p.x -= p.f * 8; squ(p, 0.1); spark(p.x + p.f * 14, p.y - 60, 0x80e0ff); SFX_blk(); return; }
  p.hp = MX(0, p.hp - d); p.fl = 120; p.ch = 0; squ(p, 0.15); SFX_hu(); shake(120, 0.006); spark(p.x, p.y - p.z - 50, 0xff4040);
  if (p.hp <= 0 || kn) { setSt(p, 'd'); p.vz = 6.5; p.z = MX(p.z, 0.1); p.kx = (p.x > fx ? 1 : -1) * 4; p.f = p.kx > 0 ? -1 : 1; }
  else { setSt(p, 'h'); p.inv = 450; }
}
const loseLife = (p) => {
  p.lives--;
  if (p.lives > 0) {
    Object.assign(p, { hp: 100, z: 380, vz: 0, x: camX() + W / 2, inv: 2500 });
    setSt(p, 'j'); pop(p.x, 300, '¡VOLVÍ!', css(p.h.c), 20);
  } else {
    p.st = 'o'; p.s.setVisible(false); p.sd.setVisible(false);
    FIN.push({ s: p.sc, h: p.hi, pi: p.pi });
    pop(p.x, p.y - 80, 'FUERA', '#ff4040', 22);
  }
}
const pfr = (p, now) => {
  const s = p.st;
  if (s === 'w') return 'w' + (now / 110 | 0) % 4;
  if (s === 'a') return p.cb === 3 ? 'k' : p.cb === 2 ? 'p2' : 'p1';
  if (s === 'j' || s === 'jk') return s === 'jk' ? 'jk' : 'j';
  if (s === 'h' || s === 'd') return 'h';
  if (s === 'x') return p.h.x === 'dash' ? 'jk' : 's';
  if (s === 'b') return 'b';
  return 'i' + (now / 420 | 0) % 2;
}

// ---------- Enemies ----------
// Actor states: i idle, w walk, a attack, j jump, jk jump-kick, h hurt, d down, x special, o out,
// n wind-up, s shoot, c charge, C charge wind-up, m summon, t stomp, u stun.
const es = (e, s) => { e.st = s; e.tm = 0; e.hd = 0; e.ld = 0; e.hit = new Set(); };
const spawnE = (t, side) => {
  const c = camX(), d = ED[t] || {}, k = 1 + st.i * 0.12, sprite = t === 'dr' || t === 'dg' || t === 'cd';
  const e = {
    t, x: side > 0 ? c + W + 60 : c - 60, y: 410 + RND() * 160, z: t === 'dr' ? 140 : 0, vz: 0, f: -side,
    hp: (d.hp || 1) * k, sp: d.sp || 1.7, dm: (d.dm || 10) * (1 + st.i * 0.08), sc: d.sc || 100,
    st: 'w', tm: 0, cd: 600 + RND() * 900, yo: RND() * 40 - 20, w: 18, fl: 0, mv: 0, hit: new Set(),
  };
  e.mhp = e.hp;
  e.s = AD.image(e.x, e.y, t === 'cd' ? 'cd0' : sprite ? t + '0' : t + '_i0').setOrigin(sprite ? 0.5 : 0.46, 1);
  e.sd = AD.ellipse(e.x, e.y, t === 'cd' ? 130 : 46, 12, 0, 0.35).setDepth(390);
  E.push(e);
  return e;
}
const near = (e) => {
  let b = null, bd = 1e9;
  P.forEach((p) => { if (live(p) && p.s) { const d = ABS(p.x - e.x) + ABS(p.y - e.y) * 2; if (d < bd) { bd = d; b = p; } } });
  return b;
}
const hitP = (e, r, dm, kn) => {
  P.forEach((p) => {
    if (!p || p.st === 'o') return;
    const dx = (p.x - e.x) * e.f;
    if (dx > -10 && dx < r && ABS(p.y - e.y) < 18 + (e.boss ? 8 : 0) && p.z < 45) hurtP(p, dm, kn, e.x);
  });
}
// X of a slot `gap` px in front of the target. Once inside that gap an enemy holds its x
// (it only lines up in y), so it never backs away while a player walks in to hit it.
const slotX = (e, tg, gap) => (ABS(tg.x - e.x) > gap ? tg.x - e.f * gap : e.x);
const moveTo = (e, gx, gy, dt) => {
  const dx = gx - e.x, dy = gy - e.y, m = HYP(dx, dy);
  e.mv = m > 5;
  if (e.mv) { e.x += dx / m * e.sp * dt; e.y += dy / m * e.sp * 0.7 * dt; }
}
const hurtE = (e, d, kn, by, quiet) => {
  if (e.dead || e.rm) return;
  const n = tn();
  e.hp -= d; e.fl = 80; e.hb = n + 1500; squ(e, e.boss ? 0.08 : 0.2);
  spark(e.x - (by ? by.f : 0) * 8, e.y - e.z - (e.t === 'dr' ? 14 : e.bx ? 20 : 50), by ? by.h.c : 0xffffff);
  // Combo: hits within 1.5 s chain; each hit scores 10 x chain (capped at 10x).
  if (by) { by.ch = n - by.ct < 1500 ? by.ch + 1 : 1; by.ct = n; by.hk = MN(100, by.hk + 4); by.sc += 10 * MN(by.ch, 10); if (by.ch % 10 < 1) pop(by.x, by.y - 130, '¡TE FUISTE AL CHANCHO!', css(by.h.c), 20); }
  SFX_hit(by ? by.ch : 0);
  if (!quiet) { frz = n + (e.hp <= 0 ? 110 : kn ? 70 : 40); if (kn) shake(80, e.hp <= 0 ? 0.008 : 0.004); if (e.hp <= 0 && !e.bx) ring(e.x, e.y - e.z - 20, 60, by ? by.h.c : 0xffffff); }
  if (e.bx) { if (e.hp <= 0) { e.rm = 1; debris(e); drop(e, 1); } return; }
  if (e.hp <= 0 && by && !e.ko) { e.ko = 1; by.sc += e.sc; }
  if (e.boss) { if (e.hp <= 0) bossDie(e); return; }
  if (e.t === 'dr') { if (e.hp <= 0) { boom(e.x, e.y - e.z); e.rm = 1; drop(e); } else e.x += by && e.x > by.x ? 14 : -14; return; }
  if (e.hp <= 0) kn = 1;
  if (kn) {
    es(e, 'd'); e.vz = 6.5; e.z = MX(e.z, 0.1);
    e.kx = (by ? (e.x > by.x ? 1 : -1) : -e.f) * 4.5; e.f = e.kx > 0 ? -1 : 1;
    if (by && e.hp <= 0 && RND() < 0.4) pop(e.x, e.y - 100, SL[RND() * SL.length | 0], css(by.h.c), 20);
  } else { es(e, 'h'); e.x += by && e.x > by.x ? 5 : -5; }
}
const drop = (e, force) => {
  if (!force && RND() > 0.1) return;
  const r = RND(), k = force ? (r < 0.45 ? 0 : r < 0.72 ? 2 : r < 0.88 ? 1 : 3) : (r < 0.5 ? 1 : 0);
  IT.push({ x: e.x, y: e.y, k, t: 0, s: AD.image(e.x, e.y, 'it' + k).setOrigin(0.5, 1) });
}
const upE = (e, dt, now) => {
  const ms = dt * 16.67;
  e.tm += ms; e.cd -= ms; if (e.fl > 0) e.fl -= ms;
  if (e.bx) return;
  if (e.dead) { e.s.setAlpha((now / 60 | 0) % 2 ? 0.25 : 1); if (e.tm > (e.boss ? 1700 : 700)) e.rm = 1; return; }
  if (e.st === 'd') {
    if (e.z > 0 || e.vz > 0) {
      e.z += e.vz * dt; e.vz -= 0.5 * dt; e.x += e.kx * dt;
      // Thrown bodies rebound off the screen edges so they stay in play.
      const c = camX();
      if ((e.x < c + 24 && e.kx < 0) || (e.x > c + W - 24 && e.kx > 0)) { e.kx *= -0.6; shake(60, 0.004); dust(e.x, e.y - e.z, 3); }
      if (e.z <= 0) {
        SFX_thud(); dust(e.x, e.y, 4);
        // First hard landing bounces once at a third of the speed; the second one settles.
        if (e.vz < -5) { e.z = 0.1; e.vz *= -0.35; e.kx *= 0.5; e.ld = 1; }
        else { e.z = 0; e.vz = 0; e.tm = 0; if (e.hp <= 0) { e.dead = 1; drop(e); } }
      }
    } else if (e.tm > 650) { es(e, 'w'); e.cd = 600; }
    return;
  }
  if (e.st === 'h') { if (e.tm > 250) es(e, 'w'); return; }
  if (e.st === 'u') { if (now % 200 < 20) spark(e.x, e.y - 90, 0x39ff6a); if (e.tm > 1500) es(e, 'w'); return; }
  const tg = near(e);
  if (!tg) { e.mv = 0; return; }
  if (e.boss) upBoss(e, dt, tg);
  else if (e.t === 'dr') upDr(e, dt, tg, now);
  else if (e.t === 'dg') upDg(e, dt, tg);
  else upHum(e, dt, tg);
  e.y = cl(e.y, FLOOR + 10, H - 12);
}
// Attack slots: two grunts may wind up at once (three from stage 4), so crowds stay fair.
const free = () => E.filter((e) => !e.boss && (e.st === 'n' || e.st === 'a' || e.st === 'c')).length < 2 + (st.i > 2);
const upHum = (e, dt, tg) => {
  const dx = tg.x - e.x, dy = tg.y - e.y;
  if (e.st === 'w') {
    e.f = dx > 0 ? 1 : -1;
    moveTo(e, slotX(e, tg, 44), tg.y + e.yo * 0.3, dt);
    if (e.cd <= 0 && ABS(dx) < 66 && ABS(dy) < 14) { if (free()) es(e, 'n'); else e.cd = 400; }
    else if (e.t === 'ex' && e.cd <= 0 && ABS(dy) < 14 && ABS(dx) > 170) es(e, 's');
  } else if (e.st === 'n') { e.mv = 0; if (e.tm > 330 - st.i * 25) es(e, 'a'); }
  else if (e.st === 'a') {
    if (!e.hd && e.tm > 50) { e.hd = 1; hitP(e, 62, e.dm, e.t === 'tk'); }
    if (e.tm > 260) { es(e, 'w'); e.cd = (700 + RND() * 1200) * (1 - st.i * 0.08); }
  } else if (e.st === 's') {
    e.mv = 0;
    if (!e.hd && e.tm > 250) { e.hd = 1; proj(e.x + e.f * 24, e.y, 50, e.f * 5, 'e', e.dm, 0, 6, 8, 0xf4f4f4); }
    if (e.tm > 450) { es(e, 'w'); e.cd = 2000; }
  }
}
const upDr = (e, dt, tg, now) => {
  e.z += (42 + SIN(now / 200 + e.yo) * 6 - e.z) * 0.05 * dt;
  e.f = tg.x > e.x ? 1 : -1;
  // Keep the hover point on screen so drones never shoot from off-camera.
  const c = camX(), gx = cl(slotX(e, tg, 170), c + 30, c + W - 30);
  e.x += cl(gx - e.x, -e.sp * dt, e.sp * dt); e.y += cl(tg.y - e.y, -1.5 * dt, 1.5 * dt);
  if (e.cd <= 0 && ABS(tg.y - e.y) < 18) { proj(e.x + e.f * 16, e.y, e.z, e.f * 6, 'e', e.dm, 0, 10, 5, 0xff3040); SFX_bz(); e.cd = 1800 + RND() * 900; }
}
const upDg = (e, dt, tg) => {
  const dx = tg.x - e.x, dy = tg.y - e.y;
  if (e.st === 'w') {
    e.f = dx > 0 ? 1 : -1;
    moveTo(e, slotX(e, tg, 210), tg.y, dt);
    if (e.cd <= 0 && ABS(dy) < 10 && ABS(dx) < 330 && free()) { es(e, 'n'); SFX_bz(); }
  } else if (e.st === 'n') { e.mv = 0; if (e.tm > 420) es(e, 'c'); }
  else if (e.st === 'c') {
    e.x += e.f * 7.5 * dt;
    P.forEach((p) => { if (live(p) && !e.hit.has(p) && ABS(p.x - e.x) < 34 && ABS(p.y - e.y) < 16 && p.z < 30) { e.hit.add(p); hurtP(p, e.dm, 1, e.x - e.f); } });
    if (e.tm > 520) { es(e, 'w'); e.cd = 1600 + RND() * 1000; }
  }
}
const upBoss = (e, dt, tg) => {
  const dx = tg.x - e.x, dy = tg.y - e.y, sc = e.bs;
  switch (e.st) {
    case 'w':
      if (e.z > 0) e.z = MX(0, e.z - 3 * dt);
      e.f = dx > 0 ? 1 : -1;
      moveTo(e, slotX(e, tg, 45 * sc), tg.y, dt);
      if (e.cd <= 0) {
        const close = ABS(dx) < 80 * sc && ABS(dy) < 22, mo = e.mo.replace('p', '') || 'p';
        // Up close: punch half the time, otherwise any other move, so each boss shows its whole set.
        const m = close && e.mo.includes('p') && RND() < 0.5 ? 'p' : mo[RND() * mo.length | 0];
        es(e, { p: 'n', c: 'C', s: 's', m: 'm', t: 't', h: 'z' }[m]);
      }
      break;
    case 'n': e.mv = 0; if (e.tm > 380) es(e, 'a'); break;
    case 'a':
      if (!e.hd && e.tm > 60) { e.hd = 1; hitP(e, 66 * sc, e.dm * 1.2, 1); }
      if (e.tm > 360) { es(e, 'w'); e.cd = 700; }
      break;
    case 'C': e.mv = 0; e.f = dx > 0 ? 1 : -1; e.y += cl(dy, -2, 2) * dt; if (e.tm > 550) { es(e, 'c'); SFX_sw(); } break;
    case 'c': {
      e.x += e.f * 9 * dt; if (e.t === 'cd') e.z = 40;
      P.forEach((p) => { if (live(p) && !e.hit.has(p) && ABS(p.x - e.x) < 40 * sc && ABS(p.y - e.y) < 24) { e.hit.add(p); hurtP(p, e.dm, 1, e.x - e.f); } });
      const c = camX();
      if (e.tm > 900 || e.x < c + 40 || e.x > c + W - 40) { e.x = cl(e.x, c + 40, c + W - 40); e.z = 0; es(e, 'w'); e.cd = 900; }
      break;
    }
    case 's':
      e.mv = 0;
      if (!e.hd && e.tm > 300) { e.hd = 1; [-34, 0, 34].forEach((o) => proj(e.x + e.f * 40, e.y + o, 60, e.f * 6.5, 'e', e.dm * 0.8, 0, 12, 6, 0xff3040)); SFX_zap(); }
      if (e.tm > 650) { es(e, 'w'); e.cd = 900; }
      break;
    case 'z':
      e.mv = 0;
      if (!e.hd && e.tm > 250) { e.hd = 1; const p = tgt(); if (p && HZ[st.i]) HZ[st.i](p); }
      if (e.tm > 700) { es(e, 'w'); e.cd = 1000; }
      break;
    case 'm':
      e.mv = 0;
      if (!e.hd && e.tm > 300) { e.hd = 1; if (E.filter((x) => x.t === 'dr').length < 3) { spawnE('dr', -1); spawnE('dr', 1); } pop(e.x, e.y - 200, '¡SEGURIDAD!', '#ff3040'); }
      if (e.tm > 650) { es(e, 'w'); e.cd = 1100; }
      break;
    case 't':
      e.mv = 0;
      e.z = e.tm < 600 ? SIN(e.tm / 600 * PI) * 150 : 0;
      if (e.tm < 400) e.x += cl(dx, -3, 3) * dt;
      if (!e.hd && e.tm >= 600) {
        e.hd = 1; ring(e.x, e.y + 30, 240, 0xffa040); shake(250, 0.015); SFX_boom(); dust(e.x, e.y, 7);
        P.forEach((p) => { if (p && p.z < 8 && ABS(p.x - e.x) < 240 && ABS(p.y - e.y) < 70) hurtP(p, e.dm, 1, e.x, 1); });
      }
      if (e.tm > 950) { es(e, 'w'); e.cd = 900; }
      break;
    default: es(e, 'w');
  }
  const c = camX(); e.x = cl(e.x, c + 30, c + W - 30);
}
const efr = (e, now) => {
  if (e.bx) return 'bx' + e.v;
  if (e.t === 'dr') return 'dr' + (now / 50 | 0) % 2;
  if (e.t === 'dg') return 'dg' + (e.st === 'c' || e.st === 'n' ? 2 : e.mv ? (now / 110 | 0) % 2 : 0);
  if (e.t === 'cd') return 'cd' + (now / (e.st === 'c' ? 90 : 220) | 0) % 2;
  const k = e.t + '_', s = e.st;
  if (e.dead || s === 'h' || s === 'd' || s === 'u') return k + 'h';
  if (s === 'n') return k + 'p2';
  if (s === 'a') return k + (e.t === 'tk' ? 'k' : 'p1');
  if (s === 'c' || s === 'C') return k + 'k';
  if (s === 's' || s === 'm' || s === 'z') return k + 's';
  if (s === 't') return k + (e.z > 0 ? 'j' : 'i0');
  return k + (e.mv ? 'w' + (now / 140 | 0) % 4 : 'i' + (now / 420 | 0) % 2);
}
const drawE = (e, fr, pl) => {
  const s = e.s;
  s.setTexture(fr).setPosition(e.x, e.y - e.z).setDepth(e.y + (e.boss ? 1 : 0));
  const q = e.sq ? e.sq * MX(0, 1 - (tn() - e.sqT) / 180) : 0, k = e.bs || 1;
  s.setScale(k * (1 + q), k * (1 - q));
  s.flipX = e.f < 0;
  // Knocked bodies tumble back 35° in flight, then lie flat from the first landing on.
  s.angle = e.st === 'd' && !e.boss ? (e.f > 0 ? -1 : 1) * (e.z <= 0 || e.ld ? 90 : 35) : 0;
  if (e.fl > 0) { if (pl) s.setTint(0xff6060); else s.setTintFill(0xffffff); }
  else s.clearTint();
  if (e.sd) e.sd.setPosition(e.x, e.y).setScale(1 - MN(e.z, 200) / 300);
}

// ---------- Bosses ----------
const spawnBoss = () => {
  const b = st.d.b, n = P.filter((p) => live(p)).length;
  const e = spawnE(b[1], 1);
  Object.assign(e, { boss: 1, nm: b[0], mo: b[4], hp: b[3] * (n > 1 ? 1.5 : 1), sc: 3000, dm: 14 + st.i * 2, sp: 1.7, w: 30, cd: 1500 });
  e.mhp = e.hp; e.bs = b[2];
  if (b[1] === 'cd') { e.z = 220; e.x = camX() + W - 160; e.vz = 0; }
  st.boss = e;
  banner(['¡JEFE!', b[0], '«' + b[5] + '»'], 2200);
  playSong(SONG.b);
}
const bossDie = (e) => {
  e.dead = 1; e.tm = 0; e.z = 0;
  frz = tn() + 450; shake(700, 0.02);
  E.forEach((o) => {
    if (o === e || o.bx || o.dead) return;
    o.hp = 0;
    if (o.t === 'dr') { boom(o.x, o.y - o.z); o.rm = 1; } else { es(o, 'd'); o.vz = 5; o.z = 0.1; o.kx = 3; }
  });
  for (let i = 0; i < 8; i++) later(i * 180, () => boom(e.x + (RND() - 0.5) * 120, e.y - 40 - RND() * 120));
  CM.flash(300);
  later(1900, clearStage);
}

// ---------- Projectiles, allies, items ----------
const proj = (x, y, z, vx, o, dm, kn, w, h, col) => {
  const p = { x, y, z, vx, o, dm, kn, w, life: 2500, hit: new Set(), s: AD.rectangle(x, y - z, w * 2, h, col, o === 'p' ? 0.55 : 1).setOrigin(0.5, 1) };
  if (o === 'p') p.s.setStrokeStyle(3, 0xe0c8ff);
  PR.push(p);
  return p;
}
const upPR = (o, dt) => {
  o.x += o.vx * dt; o.life -= dt * 16.67;
  o.s.setPosition(o.x, o.y - o.z).setDepth(o.y);
  if (o.o === 'e') {
    P.forEach((p) => {
      if (o.life > 0 && live(p) && p.inv <= 0 && ABS(p.x - o.x) < o.w + 12 && ABS(p.y - o.y) < 16 && ABS(p.z - o.z) < 50) { hurtP(p, o.dm, o.kn, o.x - o.vx * 10); o.life = 0; }
    });
  } else {
    E.forEach((e) => { if (!e.dead && !o.hit.has(e) && ABS(e.x - o.x) < o.w + e.w && ABS(e.y - o.y) < 26) { o.hit.add(e); hurtE(e, o.dm, 1, o.ow, 1); } });
    o.s.setAlpha(0.35 + RND() * 0.4);
  }
}
const upAL = (a, dt, now) => {
  const o = a.ow, ms = dt * 16.67;
  a.life -= ms; a.cd -= ms;
  a.x += (o.x - o.f * 34 - a.x) * 0.1 * dt; a.y += (o.y - 4 - a.y) * 0.1 * dt; a.z = 80 + SIN(now / 150) * 6;
  if (a.cd <= 0) {
    let b = null, bd = 300;
    E.forEach((e) => { if (!e.dead && !e.bx) { const d = HYP(e.x - a.x, e.y - a.y); if (d < bd) { bd = d; b = e; } } });
    if (b) { zap(a.x, a.y - a.z, b.x, b.y - b.z - 40, 0xffa040); hurtE(b, 9, 0, o, 1); a.cd = 450; }
  }
  a.s.setTexture('dr' + (now / 50 | 0) % 2).setPosition(a.x, a.y - a.z).setDepth(a.y);
}
const upIT = (i, dt, now) => {
  i.t += dt * 16.67;
  i.s.setPosition(i.x, i.y - 4 - ABS(SIN(now / 200)) * 6).setDepth(i.y);
  if (i.t > 9000) i.s.setVisible((now / 80 | 0) % 2 === 0);
  if (i.t > 12000) i.rm = 1;
  for (const p of P) {
    if (live(p) && p.st !== 'd' && ABS(p.x - i.x) < 32 && ABS(p.y - i.y) < 20 && p.z < 20) { take(p, i.k); i.rm = 1; break; }
  }
}
const take = (p, k) => {
  if (k === 0) p.hp = MN(100, p.hp + 35);
  if (k === 1) p.hk = 100;
  if (k === 2) { p.sc += 500; p.hk = MN(100, p.hk + 20); }
  if (k === 3) p.hp = 100;
  pop(p.x, p.y - 110, ITEMS[k][0], ITEMS[k][1], 18);
  SFX_pk();
}
const cull = () => {
  const c = camX();
  const f = (a) => a.filter((o) => {
    const d = o.rm || o.life <= 0 || (o.vx && (o.x < c - 120 || o.x > c + W + 120));
    if (d) { o.s.destroy(); if (o.sd) o.sd.destroy(); }
    return !d;
  });
  E = f(E); PR = f(PR); IT = f(IT); AL = f(AL);
}
const sep = (dt) => {
  for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) {
    const a = E[i], b = E[j];
    if (a.bx || b.bx || a.dead || b.dead || a.t === 'dr' || b.t === 'dr') continue;
    const dx = b.x - a.x, dy = b.y - a.y;
    // Scaled by dt so the crowd push is the same at 60, 120 or 180 fps.
    if (ABS(dx) < 26 && ABS(dy) < 14) { const s = (dx < 0 ? -0.8 : 0.8) * dt, t = (dy < 0 ? -0.5 : 0.5) * dt; a.x -= s; b.x += s; a.y -= t; b.y += t; }
  }
}

// ---------- Stages ----------
const wave = (i, k, n) => {
  const pool = STG[i].pool.split(','), q = [];
  // Waves grow every other stage so the 6-stage run stays near arcade length (~7 min).
  for (let j = 0; j < 3 + (i >> 1) + k + (n > 1 ? 2 : 0); j++) q.push(pool[RND() * pool.length | 0]);
  return q;
}
const stage = (i) => {
  clearAll(); clearWorld(); MODE = 'p'; CM.setScroll(0, 0);
  const d = STG[i], n = P.filter(Boolean).length;
  // Two waves, then the boss: keeps a full 6-stage clear near arcade length.
  st = { i, d, len: 2800, wv: [650, 1450].map((x, k) => ({ x, q: wave(i, k, n) })), wi: 0, act: 0, q: [], sp: 0, lim: 650 };
  L = bgSet(i);
  // Street lamps in the foreground (faster parallax) on the city stages; rain in Providencia.
  if (i < 3) L.p = ui(AD.tileSprite(0, 0, W, H, 'fg').setOrigin(0).setAlpha(0.92), 900);
  if (i === 1) L.r = ui(AD.tileSprite(0, 0, W, H, 'rn').setOrigin(0), 950);
  // Wind streaks: the rain texture turned sideways, shown only during gusts.
  if (i === 4) L.w = ui(AD.tileSprite(W / 2, H / 2, 1100, 1100, 'rn').setAngle(82).setAlpha(0), 950);
  if (!i) tw(ut(W / 2, 548, 'B1 GOLPE · MANTÉN B1: BLOQUEO · B2 SALTO · B3 HACKEO', 13, 4001, YL), { alpha: 0, delay: 7000, duration: 800 });
  WO.push(AD.image(560, 106, 'pb').setOrigin(0.5, 0).setDepth(5), AD.image(2240, 106, 'pb').setOrigin(0.5, 0).setDepth(5));
  d.sg.forEach(([, , x], k) => WO.push(AD.image(x, 124, 'sg' + i + k).setDepth(6)));
  [500, 1250, 1950, 2700].forEach((x, k) => {
    const e = { bx: 1, v: k % 2, t: 'bx', x, y: 420 + RND() * 120, z: 0, f: 1, hp: 1, w: 16, st: 'i', tm: 0, cd: 0, fl: 0 };
    e.s = AD.image(x, e.y, 'bx' + e.v).setOrigin(0.5, 1).setDepth(e.y);
    E.push(e);
  });
  P.forEach((p, k) => { if (live(p)) spawnP(p, 140 + k * 70); });
  mkHud();
  banner(['ETAPA ' + (i + 1), d.n, d.s]);
  playSong({ ...SONG.g, r: [45, 47, 43, 42, 46, 44][i] });
}
// ¡TEMBLOR! Big shake; grounded grunts stagger, the heroes (Chileans) don't even flinch.
const temblor = () => {
  if (MODE !== 'p' || st.end) return;
  shake(700, 0.012); SFX_boom();
  pop(camX() + W / 2, 250, '¡TEMBLOR! TRANQUI, ES UN 5,9', YL, 26);
  E.forEach((e) => { if (!e.boss && !e.bx && !e.dead && e.t !== 'dr' && e.z <= 0 && e.st !== 'd') es(e, 'u'); });
};
// ---------- Stage hazards: one new mechanic per stage, telegraphed, then reused by the boss ----------
// A red mark warns for 0.9 s, then a container/meteor lands (or a laser sweeps the lane) and hits players
// (unblockable; jump over lasers) and grunts alike.
const hzd = (x, y, lane) => {
  const m = (lane ? AD.rectangle(camX() + W / 2, y, W, 8, 0xff2a40, 0.6) : AD.ellipse(x, y, 96, 28, 0xff2a40, 0.45)).setDepth(391);
  tw(m, { alpha: 0.25, yoyo: true, repeat: 2, duration: 150 });
  if (!lane) {
    const b = AD.image(x, y - 420, st.i === 3 ? 'sp' : 'bx1').setScale(2.4).setOrigin(0.5, 1).setDepth(y).setTint(st.i === 3 ? 0xff7a30 : 0xffffff);
    tw(b, { y, delay: 740, duration: 160 }); tw(b, { alpha: 0, delay: 1300, duration: 300 }, 1);
  }
  later(900, () => {
    m.destroy();
    if (MODE !== 'p' || st.end) return;
    const hit = (o) => o.z < 30 && ABS(o.y - y) < (lane ? 16 : 22) && (lane || ABS(o.x - x) < 52);
    if (lane) { tw(AD.rectangle(camX() + W / 2, y - 40, W, 12, 0xff3050).setDepth(1990), { alpha: 0, duration: 350 }, 1); SFX_zap(); } else boom(x, y - 20);
    shake(150, 0.006);
    P.forEach((p) => { if (live(p) && hit(p)) hurtP(p, 16, 1, x, 1); });
    E.forEach((e) => { if (!e.boss && !e.bx && !e.dead && hit(e)) hurtE(e, 30, 1); });
  });
};
// Patagonian wind: 2.5 s gusts push everyone sideways (bosses less).
const gust = () => { st.wd = RND() < 0.5 ? -2.2 : 2.2; st.wt = tn() + 2500; pop(camX() + W / 2, 250, '¡VIENTO PATAGÓNICO!', '#cfefff', 22); };
const tgt = () => { const a = P.filter((p) => live(p) && p.s); return a[RND() * a.length | 0]; };
// Santiago teaches the basics; Providencia's wet floor is passive (see upP); then containers, meteors, wind, lasers.
const HZ = [0, 0, (p) => hzd(p.x, p.y), (p) => [-1, 0, 1].forEach((k) => hzd(p.x + k * 110, p.y + k * 30)), gust, (p) => hzd(0, p.y, 1)];
const upCam = (dt, now) => {
  const al = P.filter((p) => live(p));
  const lim = st.wi < st.wv.length ? st.wv[st.wi].x : st.len - W;
  st.lim = lim;
  let c = camX();
  if (al.length && !st.act) {
    const ax = al.reduce((a, p) => a + p.x, 0) / al.length, t = MN(ax - W * 0.42, lim);
    if (t > c) c = MN(t, c + 5 * dt);
    CM.scrollX = c;
    if (c >= lim - 1) {
      st.act = 1; st.ht = now + 3000;
      if (st.wi < st.wv.length) { st.q = st.wv[st.wi].q.slice(); if (st.wi && RND() < 0.6) later(2500, temblor); } else spawnBoss();
    }
  }
  scrollBg(c);
  if (L.r) L.r.setTilePosition(c + now * 0.18, -now * 0.65);
  if (L.w) L.w.setAlpha(st.wt > now ? 0.7 : 0).tilePositionY += (st.wd || 0) * 9 * dt;
  if (st.act && st.wi < st.wv.length) {
    const alive = E.filter((e) => !e.bx && !e.dead).length, cap = 3 + al.length + (st.i >> 1);
    if (st.q.length && alive < cap && now > st.sp) { spawnE(st.q.shift(), RND() < 0.5 ? -1 : 1); st.sp = now + 450; }
    if (!st.q.length && !alive) { st.act = 0; st.wi++; st.gt = now + 3000; }
    if (HZ[st.i] && now > st.ht) { st.ht = now + 6500 - st.i * 300; const p = tgt(); if (p) HZ[st.i](p); }
  }
}
const upPlay = (dt, now) => {
  for (let pi = 0; pi < 2; pi++) if (tap('START' + (pi + 1)) && (!P[pi] || P[pi].st === 'o')) join(pi);
  if (st.end) { renderAll(now); drawHud(now); return; }
  if (frz > tn()) { drawHud(now); return; }
  P.forEach((p) => { if (p) upP(p, dt, now); });
  upCam(dt, now);
  if (st.wt > now) [...P, ...E].forEach((o) => { if (o && !o.bx && o.st !== 'o') o.x += st.wd * (o.boss ? 0.4 : 1) * dt; });
  E.forEach((e) => upE(e, dt, now));
  sep(dt);
  PR.forEach((o) => upPR(o, dt));
  AL.forEach((a) => upAL(a, dt, now));
  IT.forEach((i) => upIT(i, dt, now));
  cull();
  renderAll(now); drawHud(now);
  // Arcade continue: 10 s countdown once everyone is out; START (join) cancels it.
  const out = P.some(Boolean) && P.every((p) => !p || p.st === 'o');
  if (!out) st.go = 0; else if (!st.go) st.go = now + 9999;
  const cs = st.go > now ? (st.go - now) / 1000 | 0 : -1;
  if (cs !== HUD.cv) { HUD.cv = cs; if (cs >= 0) SFX_sel(); }
  HUD.ct.setText('¿CONTINUAR? ' + cs);
  if (st.go && cs < 0) gameOver();
}
const renderAll = (now) => {
  P.forEach((p) => {
    if (!p || p.st === 'o' || !p.s) return;
    drawE(p, p.k + '_' + pfr(p, now), 1);
    p.s.setVisible(!(p.inv > 0 && p.st !== 'd' && (now / 70 | 0) % 2));
  });
  E.forEach((e) => drawE(e, efr(e, now)));
}
const clearStage = () => {
  if (MODE !== 'p') return;
  st.end = 1; playSong(null); SFX_cl();
  P.forEach((p) => { if (live(p)) p.sc += 1000 + p.hp * 20; });
  banner(['¡BACÁN, CABROS!', 'ETAPA ' + (st.i + 1) + ' COMPLETA', 'BONO: 1000 + VIDA x20'], 3000);
  later(4000, () => {
    if (MODE !== 'p') return;
    if (st.i < STG.length - 1) { P.forEach((p) => { if (p) p.hp = 100; }); stage(st.i + 1); } else win();
  });
}

// ---------- HUD ----------
const mkHud = () => {
  HUD = { g: ui(AD.graphics(), 5000), s: [] };
  for (let pi = 0; pi < 2; pi++) {
    const x = pi ? W - 300 : 10;
    HUD.s[pi] = {
      x, k: -1,
      im: ui(AD.image(0, 0, 'h0_i0').setOrigin(0), 5001),
      n: ut(x + 52, 22, '', 16, 5001, WH, 0),
      l: ut(x + 140, 22, '', 14, 5001, WH, 0),
      sc: ut(x + 284, 22, '', 16, 5001, YL, 1),
      m: ut(x + 150, 38, '', 14, 5001, WH),
      cb: ut(x + 8, 94, '', 28, 5001, WH, 0),
    };
  }
  // Continue countdown, shown only while every player is out.
  HUD.cd = dim(0.55, 5002);
  HUD.ct = ut(W / 2, 270, '', 56, 5003, YL);
  HUD.cs = ut(W / 2, 330, 'PRESIONA START PARA SEGUIR', 18, 5003);
  ui(AD.image(W / 2, 34, 'plat').setScale(0.4), 5001);
  ut(W / 2, 74, 'ETAPA ' + (st.i + 1), 12, 5001, PL);
  HUD.bn = ut(W / 2, 562, '', 14, 5002, WH);
  HUD.go = ut(W - 90, 300, '¡SIGUE! ▶', 24, 5001, YL);
}
const drawHud = (now) => {
  const g = HUD.g;
  g.clear();
  for (let pi = 0; pi < 2; pi++) {
    const h = HUD.s[pi], p = P[pi], x = h.x, on = live(p), col = p ? p.h.c : 0x555566;
    g.fillStyle(0x0c0816, 0.85).fillRect(x, 6, 290, 60);
    g.lineStyle(3, on && p.hp < 30 && (now / 200 | 0) % 2 ? 0xff3040 : col).strokeRect(x, 6, 290, 60);
    // Text colors change only with the hero (setColor re-renders the text, so never per frame).
    if (p && h.k !== p.hi) { h.k = p.hi; h.im.setTexture('h' + p.hi + '_i0').setCrop(18, 3, 33, 33).setPosition(x + 8 - 18, 16 - 3); h.n.setColor(css(p.h.c)); h.cb.setColor(css(p.h.c)); }
    h.im.setVisible(!!on); h.n.setVisible(!!on); h.l.setVisible(!!on); h.sc.setVisible(!!p); h.m.setVisible(!on);
    // Combo counter pops on each hit and fades out as the chain window closes.
    const ca = on && p.ch > 1 ? 1500 - now + p.ct : 0;
    h.cb.setVisible(ca > 0);
    if (ca > 0) h.cb.setText(p.ch + ' HITS!').setScale(1 + MX(0, ca - 1340) / 300).setAlpha(MN(1, ca / 300));
    if (on) {
      h.n.setText(p.h.n); h.l.setText('x' + p.lives); h.sc.setText(String(p.sc).padStart(7, '0'));
      for (let k = 0; k < 20; k++) g.fillStyle(k < p.hp / 5 ? (p.hp > 30 ? 0x5cff6a : 0xff4a4a) : 0x2a2838).fillRect(x + 52 + k * 11, 36, 9, 10);
      g.fillStyle(0x1a1a2a).fillRect(x + 52, 52, 218, 7);
      g.fillStyle(p.hk >= 50 && (now / 150 | 0) % 2 ? 0xffffff : 0x40e0ff).fillRect(x + 52, 52, 218 * p.hk / 100, 7);
      g.fillStyle(0xffe14a).fillRect(x + 160, 50, 2, 11);
    } else {
      h.m.setText(p ? 'CONTINUAR? START' : 'P' + (pi + 1) + ' · PRESIONA START').setAlpha((now / 400 | 0) % 2 ? 1 : 0.35);
      if (p) h.sc.setText(String(p.sc).padStart(7, '0'));
    }
  }
  const b = st.boss;
  if (b && !b.dead) {
    g.fillStyle(0x0c0816, 0.85).fillRect(180, 548, 440, 42);
    g.fillStyle(0x2a2838).fillRect(190, 574, 420, 9);
    g.fillStyle(0xff3040).fillRect(190, 574, 420 * MX(0, b.hp) / b.mhp, 9);
    HUD.bn.setText(b.nm);
  } else HUD.bn.setText('');
  // Small HP bar over any grunt hit in the last 1.5 s.
  E.forEach((e) => {
    if (e.hb > now && e.mhp && !e.boss && !e.dead) {
      const x = e.x - camX() - 20, y = e.y - e.z - (e.st === 'd' ? 40 : e.s.displayHeight) - 12;
      g.fillStyle(0x120a1a).fillRect(x - 2, y - 2, 44, 8).fillStyle(0xff3040).fillRect(x, y, 40 * MX(0, e.hp) / e.mhp, 4);
    }
  });
  HUD.go.setVisible(!st.act && !st.end && st.gt > now && camX() < st.lim - 5 && (now / 300 | 0) % 2 === 0);
  // Continue overlay: only while the countdown runs, and never over the stage-clear banner.
  [HUD.cd, HUD.ct, HUD.cs].forEach((o) => o.setVisible(st.go > now && !st.end));
}

// ---------- Game over, victory, records ----------
const gameOver = () => {
  MODE = 'o'; playSong(null); SFX_ov();
  dim(0.6, 6000, 0);
  ut(W / 2, 250, '¡CHUTA!', 64, 6001, PK);
  ut(W / 2, 320, 'GAME OVER', 36, 6001);
  ut(W / 2, 370, 'Condor Corp sigue al mando... por ahora.', 16, 6001, '#cccccc');
  later(3500, names);
}
const win = () => {
  clearAll(); clearWorld(); MODE = 'e'; CM.setScroll(0, 0);
  P.forEach((p) => { if (live(p)) FIN.push({ s: p.sc, h: p.hi, pi: p.pi }); });
  L = bgSet(5);
  dim(0.45);
  ut(W / 2, 120, '¡SANTIAGO ESTÁ LIBRE!', 40, 10, YL);
  ut(W / 2, 175, 'La red vuelve a ser de todos. ¡CHI CHI CHI, LE LE LE!', 16);
  HER.forEach((h, i) => ui(hum(220 + i * 120, 420, 'h' + i + '_s').setScale(1.3), 10));
  ui(AD.image(W / 2, 500, 'plat').setScale(0.5), 10);
  ut(W / 2, 555, 'GRACIAS POR JUGAR · PLATANUS HACK 26 · SANTIAGO', 14, 10, PL);
  playSong(SONG.t); SFX_cl();
  G.wt = tn() + 8000; G.w0 = tn(); G.next = names;
}
const upEnd = (dt, now) => {
  if (L) { G.tx = (G.tx || 0) + dt * 0.5; scrollBg(G.tx); }
  if (now > G.wt || (now > G.w0 + 1500 && (tap('START1') || tap('START2') || btn('P1_', 1) || btn('P2_', 1)))) G.next();
}
const names = () => {
  G.nq = FIN.filter((f) => f.s > 0).sort((a, b) => b.s - a.s); G.ni = 0;
  nextName();
}
const qualifies = (s) => board.length < 8 || s > board[board.length - 1].s;
const AB = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const nextName = () => {
  while (G.ni < G.nq.length && !qualifies(G.nq[G.ni].s)) G.ni++;
  if (G.ni >= G.nq.length) { showBoard(); return; }
  clearAll(); clearWorld(); MODE = 'n';
  duskBg(); dim(0.55);
  const f = G.nq[G.ni];
  G.nm = { f, l: [0, 0, 0], c: 0, rp: 0, t0: tn() };
  ut(W / 2, 110, '¡NUEVO RÉCORD!', 40, 10, YL);
  ut(W / 2, 170, 'JUGADOR ' + (f.pi + 1) + ' · ' + HER[f.h].n, 20, 10, css(HER[f.h].c));
  ut(W / 2, 210, String(f.s).padStart(7, '0'), 28);
  ui(hum(140, 400, 'h' + f.h + '_s').setScale(1.6), 10);
  G.lt = [0, 1, 2].map((k) => ut(330 + k * 70, 320, 'A', 56));
  G.cur = ui(AD.rectangle(330, 360, 50, 6, 0xffe14a), 10);
  ut(W / 2, 440, 'ARRIBA/ABAJO: LETRA · B1: SIGUIENTE · START: LISTO', 13, 10, '#aaaaaa');
  logoBadge(W / 2, 520, 0.36);
}
const upName = (dt, now) => {
  const n = G.nm, pre = 'P' + (n.f.pi + 1) + '_', u = held[pre + 'U'], d = held[pre + 'D'];
  // Ignore input carried over from play; auto-accept if the player walked away.
  if (now < n.t0 + 600) return;
  let step = 0;
  if (tap(pre + 'U') || tap(pre + 'D')) { step = u ? 1 : -1; n.rp = now + 320; }
  else if ((u || d) && now > n.rp) { step = u ? 1 : -1; n.rp = now + 90; }
  if (step) { n.l[n.c] = (n.l[n.c] + step + AB.length) % AB.length; SFX_sel(); }
  if (tap(pre + 'L')) n.c = MX(0, n.c - 1);
  if (tap(pre + 'R')) n.c = MN(2, n.c + 1);
  let done = tap('START' + (n.f.pi + 1)) || now > n.t0 + 30000;
  if (btn(pre, 1)) { if (n.c < 2) { n.c++; SFX_sel(); } else done = true; }
  // Tint, not setColor: no per-frame text re-render.
  G.lt.forEach((t, k) => t.setText(AB[n.l[k]]).setTint(k === n.c ? 0xffe14a : 0xffffff));
  G.cur.x = 330 + n.c * 70;
  if (done) {
    board = [...board, { n: n.l.map((i) => AB[i]).join(''), s: n.f.s, h: n.f.h }].sort((a, b) => b.s - a.s).slice(0, 8);
    saveBoard(); SFX_pk(); G.ni++; nextName();
  }
}
const showBoard = () => {
  clearAll(); clearWorld(); MODE = 'e'; CM.setScroll(0, 0);
  L = bgSet(3);
  dim(0.55);
  ut(W / 2, 80, 'RÉCORDS', 44, 10, YL);
  board.forEach((e, i) => {
    ut(220, 150 + i * 42, i + 1 + '.', 24, 10, '#aaaaaa', 0);
    ut(280, 150 + i * 42, e.n, 24, 10, css(HER[e.h].c), 0);
    ut(400, 150 + i * 42, HER[e.h].n, 16, 10, '#888899', 0);
    ut(590, 150 + i * 42, String(e.s).padStart(7, '0'), 24, 10, WH, 1);
  });
  if (!board.length) ut(W / 2, 250, 'SIN RÉCORDS AÚN', 24);
  logoBadge(W / 2, 520, 0.36);
  playSong(SONG.t);
  G.wt = tn() + 9000; G.w0 = tn(); G.next = title;
}
new Phaser.Game({
  type: Phaser.AUTO,
  width: W,
  height: H,
  parent: 'game-root',
  backgroundColor: '#0a0614',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: { create, update },
});
})();
