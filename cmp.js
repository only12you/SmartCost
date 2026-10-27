(()=>{'use strict';
/* ===== CoatCost 제품 비교 v498 · 코어(계산·추출·그래프) ===== */
const COL = ['#1c58e0', '#ea580c', '#059669', '#7c3aed', '#e11d48'];
const LAB = ['기존 제품', '비교 A', '비교 B', '비교 C', '비교 D'];
const N = (v) => { const x = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isFinite(x) ? x : 0; };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fm = (x, d = 0) => (isFinite(x) && x !== 0 ? Number(x).toLocaleString('ko-KR', { maximumFractionDigits: d }) : '-');
const won = (x) => (!isFinite(x) || x === 0 ? '-' : Math.abs(x) >= 1e8 ? (x / 1e8).toFixed(2) + '억원' : Math.abs(x) >= 1e4 ? Math.round(x / 1e4).toLocaleString('ko-KR') + '만원' : Math.round(x).toLocaleString('ko-KR') + '원');
const lst = (s) => String(s || '').split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean);
const hrs = (s) => {
  const t = String(s || ''); const m = t.match(/(\d+(?:\.\d+)?)\s*(시간|hrs?|hours?|h\b|분|min|일|days?)/i);
  if (!m) return 0; const v = parseFloat(m[1]); const u = m[2].toLowerCase();
  return /분|min/.test(u) ? v / 60 : /일|day/.test(u) ? v * 24 : v;
};
const blank = () => ({ id: Math.random().toString(36).slice(2, 9), name: '', company: '', desc: '', usage: '', func: '', comp: '', perf: '', svr: '', dft: '', cov: '', pack: '', price: '', dry: '', pot: '', heat: '', voc: '', life: '', certs: '', tracks: '', file: null, ext: [] });
const has = (p) => N(p.svr) > 0 || N(p.cov) > 0;

/* ---------- 계산 ---------- */
function calcOne(p, X) {
  if (!has(p)) return null;
  const svr = N(p.svr), ownDft = N(p.dft), dft = X.dft > 0 ? X.dft : ownDft || 100;
  const theoCov = svr > 0 ? (svr * 10) / dft : N(p.cov);
  const loss = Math.min(90, Math.max(0, X.loss));
  const actCov = theoCov * (1 - loss / 100);
  const pack = N(p.pack), priceCan = N(p.price);
  const priceL = pack > 0 && priceCan > 0 ? priceCan / pack : 0;
  const costM2 = actCov > 0 && priceL > 0 ? priceL / actCov : 0;
  const vol = X.area > 0 && actCov > 0 ? X.area / actCov : 0;
  const cans = pack > 0 ? Math.ceil(vol / pack) : 0;
  const life = N(p.life);
  const c = {
    svr, dft, dftAssumed: !(X.dft > 0) && !(ownDft > 0), theoCov, theoUse: theoCov > 0 ? 1 / theoCov : 0, actCov, actUse: actCov > 0 ? 1 / actCov : 0,
    pack, priceCan, priceL, canArea: pack > 0 ? actCov * pack : 0, canAreaTheo: pack > 0 ? theoCov * pack : 0,
    costM2, vol, cans, mat: priceL > 0 ? vol * priceL : 0, life,
  };
  // LCC
  const H = Math.max(1, X.H), e = X.esc / 100, labor = X.labor;
  const times = []; if (life > 0) { for (let t = 0; t < H - 1e-9; t += life) times.push(+t.toFixed(4)); } else times.push(0);
  const per = (costM2 + labor) * X.area;
  c.times = times; c.per = per; c.n = times.length;
  c.lcc = times.reduce((s, t) => s + per * Math.pow(1 + e, t), 0);
  c.F = times.reduce((s, t) => s + Math.pow(1 + e, t), 0);
  c.annual = c.lcc / H; c.annualM2 = X.area > 0 ? c.annual / X.area : 0;
  c.cum = []; for (let y = 0; y <= H; y++) c.cum.push(times.filter((t) => t <= y + 1e-9).reduce((s, t) => s + per * Math.pow(1 + e, t), 0));
  c.lifeMissing = !(life > 0);
  return c;
}
function calcAll(S) {
  const X = { area: N(S.area), loss: N(S.loss), dft: N(S.dft), H: N(S.H) || 20, labor: N(S.labor), esc: N(S.esc) };
  return { X, C: S.ps.map((p) => calcOne(p, X)) };
}
function breakEven(M, o) {
  const b = M.C[0], c = M.C[o]; if (!b || !c || !(b.actCov > 0) || !(c.actCov > 0)) return null;
  const r = {};
  if (c.costM2 > 0) { r.baseL = c.costM2 * b.actCov; r.baseCan = b.pack > 0 ? r.baseL * b.pack : 0; r.baseNow = b.priceL; }
  if (b.costM2 > 0) { r.oursL = b.costM2 * c.actCov; r.oursCan = c.pack > 0 ? r.oursL * c.pack : 0; r.oursNow = c.priceL; }
  if (b.lcc > 0 && c.F > 0 && M.X.area > 0) { const v = (b.lcc / (c.F * M.X.area) - M.X.labor) * c.actCov; r.lccOursL = v > 0 ? v : 0; r.lccOursCan = c.pack > 0 ? r.lccOursL * c.pack : 0; }
  if (c.lcc > 0 && b.F > 0 && M.X.area > 0) { const v = (c.lcc / (b.F * M.X.area) - M.X.labor) * b.actCov; r.lccBaseL = v > 0 ? v : 0; r.lccBaseCan = b.pack > 0 ? r.lccBaseL * b.pack : 0; }
  return r;
}
function scores(S, M) {
  const ax = ['경제성', '도막 효율', '도포 효율', '작업성', '내구성', '신뢰도'];
  const raw = S.ps.map((p, i) => { const c = M.C[i]; if (!c) return null; const dh = hrs(p.dry), ph = hrs(p.pot);
    return [c.costM2 > 0 ? 1 / c.costM2 : 0, c.svr, c.actCov, (dh > 0 ? 1 / dh : 0) * 0.6 + (ph > 0 ? ph / 10 : 0) * 0.4, c.life, lst(p.certs).length + lst(p.tracks).length]; });
  const mx = ax.map((_, k) => Math.max(0, ...raw.map((r) => (r ? r[k] : 0))));
  return { ax, v: raw.map((r) => (r ? r.map((x, k) => (mx[k] > 0 ? Math.round((x / mx[k]) * 100) : 0)) : null)) };
}
function verdict(S, M) {
  const o = S.ours, b = M.C[0], c = M.C[o]; const out = { head: '', pts: [] };
  if (!b || !c) { out.head = '비교할 데이터시트가 더 필요합니다.'; return out; }
  const d = b.costM2 > 0 && c.costM2 > 0 ? b.costM2 - c.costM2 : null;
  if (d != null) { const pct = (d / b.costM2) * 100; out.pts.push('㎡당 도장 자재비 ' + fm(b.costM2) + '원 → ' + fm(c.costM2) + '원 (' + (d >= 0 ? Math.abs(pct).toFixed(1) + '% 절감' : Math.abs(pct).toFixed(1) + '% 증가') + ')'); }
  if (b.actCov > 0 && c.actCov > 0) out.pts.push('실제 단위당 면적 ' + b.actCov.toFixed(2) + ' → ' + c.actCov.toFixed(2) + ' ㎡/L (' + ((c.actCov / b.actCov - 1) * 100 >= 0 ? '+' : '') + ((c.actCov / b.actCov - 1) * 100).toFixed(1) + '%)');
  if (b.life > 0 && c.life > 0) out.pts.push('보수주기 ' + b.life + '년 → ' + c.life + '년, 분석기간 ' + M.X.H + '년 중 도장 횟수 ' + b.n + '회 → ' + c.n + '회');
  if (b.lcc > 0 && c.lcc > 0) { const dl = b.lcc - c.lcc; out.pts.push(M.X.H + '년 LCC ' + won(b.lcc) + ' → ' + won(c.lcc) + ' (' + (dl >= 0 ? Math.abs((dl / b.lcc) * 100).toFixed(1) + '% 절감' : Math.abs((dl / b.lcc) * 100).toFixed(1) + '% 증가') + ')'); out.win = dl >= 0; }
  else if (d != null) out.win = d >= 0;
  out.head = out.win === true ? '제안 제품으로 변경하면 비용과 성능 면에서 유리합니다.' : out.win === false ? '단가 조건이 현재는 기존 제품이 유리합니다. 손익분기 단가를 참고해 조건을 조정하세요.' : '단가·보수주기를 입력하면 경제성 결론이 계산됩니다.';
  return out;
}

/* ---------- 데이터시트 추출 ---------- */
function section(L, keys, max) {
  const re = new RegExp('^(?:' + keys + ')\\s*[:：]?\\s*(.*)$', 'i');
  for (let i = 0; i < L.length; i++) {
    const m = L[i].match(re); if (!m || L[i].length > 200) continue;
    const out = []; if (m[1]) out.push(m[1]);
    for (let j = i + 1; j < L.length && out.length < (max || 3); j++) { if (/^[가-힣A-Za-z ]{2,14}\s*[:：]/.test(L[j]) || L[j].length < 3 || /\d/.test(L[j])) break; out.push(L[j]); }
    const t = out.join(' ').trim(); if (t.length >= 4) return t.slice(0, 240);
  }
  return '';
}
function near(t, re, lo, hi, win, skip) {
  const g = new RegExp(re.source, 'gi'); let m;
  while ((m = g.exec(t))) {
    if (skip && skip.test(t.slice(Math.max(0, m.index - 6), m.index))) continue;
    const seg = t.slice(m.index + m[0].length, m.index + m[0].length + (win || 45)).split('\n').slice(0, 2).join(' ');
    const nr = /(\d+(?:\.\d+)?)(?:\s*[-~～]\s*(\d+(?:\.\d+)?))?/g; let r;
    while ((r = nr.exec(seg))) { const a = parseFloat(r[1]), b = r[2] ? parseFloat(r[2]) : null; const v = b != null && b >= a ? (a + b) / 2 : a; if (v >= lo && v <= hi) return String(+v.toFixed(2)); }
  }
  return '';
}
function extract(raw, fname) {
  const t = String(raw || '').replace(/\r/g, '').replace(/[ \t\u00a0]+/g, ' '); const o = {};
  const L = t.split('\n').map((x) => x.trim()).filter(Boolean); let m;
  if ((m = t.match(/(?:제품\s*명|품\s*명|Product\s*Name)\s*[:：]?\s*([^\n]{2,60})/i))) o.name = m[1].trim();
  else { const c = L.find((x) => x.length >= 3 && x.length <= 50 && !/^(page|\d|www|tel|http)/i.test(x)); if (c) o.name = c; }
  { const v = near(t, /용적\s*고형분|체적\s*고형분|용적\s*비\s*고형분|고형분|solids?\s*by\s*volume|volume\s*solids|\bSVR\b|\bVS\b/, 20, 100, 45, /중량|무게|weight|wt|mass/i); if (v) o.svr = v; }
  { const v = near(t, /건조\s*도막(?:\s*두께)?|표준\s*도막(?:\s*두께)?|권장\s*도막|도막\s*두께|\bDFT\b|dry\s*film(?:\s*thickness)?/, 10, 2000, 40); if (v) o.dft = v; }
  if ((m = t.match(/(\d+(?:\.\d+)?)\s*(?:㎡|m2|m²)\s*\/\s*(?:L|ℓ|l|리터)/i))) o.cov = m[1];
  { let v = ''; const mm = t.match(/(?:포장\s*단위|포장|용량|Packing|Pack\s*size|Package|Container)[^0-9\n]{0,25}(\d+(?:\.\d+)?)\s*(?:L|ℓ|ℓ|리터|liters?|ltr)\b/i); if (mm) v = mm[1]; else { const m2 = t.match(/(?:^|[^\d.\/])(\d{1,2}(?:\.\d+)?)\s*(?:L|ℓ|리터|liters?)\b(?!\s*\/)/i); if (m2 && +m2[1] >= 1 && +m2[1] <= 25) v = m2[1]; } if (v) o.pack = v; }
  const line = (re) => { const r = t.match(re); return r ? r[0].replace(/\s+/g, ' ').trim().slice(0, 70) : ''; };
  const dry = line(/(?:건조\s*시간|지촉|touch\s*dry|dry\s*to\s*touch|고화|hard\s*dry)[^\n]{0,50}/i); if (dry) o.dry = dry;
  const pot = line(/(?:가사\s*시간|pot\s*life|사용\s*가능\s*시간)[^\n]{0,40}/i); if (pot) o.pot = pot;
  if ((m = t.match(/(?:내열|heat\s*resist\w*|max\.?\s*(?:dry\s*)?temp\w*)[^0-9\n]{0,20}(\d{2,3})\s*(?:℃|°C|도)/i))) o.heat = m[1];
  if ((m = t.match(/VOC[^0-9\n]{0,15}(\d+(?:\.\d+)?)\s*(g\/L|g\/l|%)/i))) o.voc = m[1] + ' ' + m[2];
  if ((m = t.match(/(?:보수\s*주기|재도장\s*주기|내구\s*연한|기대\s*수명|예상\s*수명|service\s*life|durability)[^0-9\n]{0,15}(\d{1,2})(?:\s*[-~]\s*(\d{1,2}))?\s*(?:년|years?|yrs?)/i))) o.life = m[2] ? String((+m[1] + +m[2]) / 2) : m[1];
  const cs = [...new Set((t.match(/KS\s?[A-Z]\s?\d{4}(?:\s?\d종)?|ISO\s?\d{4,5}(?:-\d+)?|DNV(?:[-\s]?GL)?|ABS|Lloyd'?s|KR\s?선급(?:인증)?|친환경[^,.;\s]{0,8}인증|HB\s?마크|NSF\s?\d+|UL\s?\d+|FM\s?\d+|NORSOK\s?M-?501|SSPC[-\s]?\w+|우수\s?조달|조달청\s?인증|환경표지/gi) || []).map((x) => x.replace(/\s+/g, ' ').trim()))].slice(0, 10);
  if (cs.length) o.certs = cs.join(', ');
  const us = section(L, '용도|적용\\s*부위|적용\\s*대상|적용\\s*범위|Recommended\\s*use|Application|Use', 3); if (us) o.usage = us;
  const ft = section(L, '특징|특성|Features?|제품\\s*설명|제품\\s*개요|개요|Description', 4); if (ft) { o.desc = ft; o.func = ft.split(/[.。]/)[0].slice(0, 120); }
  const cp = section(L, '성분|조성|주성분|Composition|Binder|바인더|Generic\\s*type|종류', 2); if (cp) o.comp = cp;
  const pf = L.filter((x) => !/^(특징|용도|성분|개요|제품\s*설명)/.test(x) && /(부착|adhesion|염수분무|salt\s*spray|내염|내후|내화학|내마모|경도|hardness|내식|방식|내수|내알칼리)/i.test(x) && x.length < 120).slice(0, 5); if (pf.length) o.perf = pf.join('\n');
  if (!o.name && fname) o.name = fname.replace(/\.[^.]+$/, '');
  return o;
}

let FS = 1;
/* ---------- SVG 그래프 ---------- */
function radarSvg(ax, series) {
  const W = 420, Hh = 330, cx = 210, cy = 150, R = 105, pt = (i, f) => { const a = (-90 + i * 60) * Math.PI / 180; return [cx + Math.cos(a) * R * f, cy + Math.sin(a) * R * f]; };
  const poly = (f) => ax.map((_, i) => pt(i, f).join(',')).join(' ');
  let s = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" class="x-svg" role="img" aria-label="육각 비교 그래프">';
  [0.25, 0.5, 0.75, 1].forEach((f) => { s += '<polygon points="' + poly(f) + '" fill="' + (f === 1 ? '#f8fafc' : 'none') + '" stroke="#cbd5e1" stroke-width="1"/>'; });
  ax.forEach((a, i) => { const [x, y] = pt(i, 1), [lx, ly] = pt(i, 1.2); s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + x + '" y2="' + y + '" stroke="#cbd5e1"/><text x="' + lx + '" y="' + (ly + 4) + '" text-anchor="middle" font-size="' + (12 * FS) + '" font-weight="700" fill="#334155">' + a + '</text>'; });
  [25, 50, 75, 100].forEach((v) => { s += '<text x="' + (cx + 3) + '" y="' + (cy - R * v / 100 + 10) + '" font-size="' + (8 * FS) + '" fill="#94a3b8">' + v + '</text>'; });
  series.forEach((sr) => { if (!sr.v) return; const pts = sr.v.map((v, i) => pt(i, v / 100).join(',')).join(' ');
    s += '<polygon points="' + pts + '" fill="' + sr.color + '" fill-opacity=".16" stroke="' + sr.color + '" stroke-width="2.2"/>';
    sr.v.forEach((v, i) => { const [x, y] = pt(i, v / 100); s += '<circle cx="' + x + '" cy="' + y + '" r="3" fill="' + sr.color + '"/>'; }); });
  series.forEach((sr, k) => { s += '<rect x="' + (30 + k * 100) + '" y="' + (Hh - 26) + '" width="12" height="12" rx="3" fill="' + sr.color + '"/><text x="' + (47 + k * 100) + '" y="' + (Hh - 16) + '" font-size="' + (11 * FS) + '" fill="#334155">' + esc(sr.name) + '</text>'; });
  return s + '</svg>';
}
function barsSvg(title, unit, items, f, W0) {
  const W = W0 || 420, Hh = 230, pl = 14, top = 38, bot = 44, n = items.length || 1, mx = Math.max(1, ...items.map((i) => i.v)) * 1.18, bw = Math.min(54, (W - pl * 2) / n - 16);
  let s = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" class="x-svg" role="img" aria-label="' + esc(title) + '"><text x="' + pl + '" y="18" font-size="' + (13 * FS) + '" font-weight="800" fill="#0f172a">' + esc(title) + '</text><text x="' + (W - pl) + '" y="18" text-anchor="end" font-size="' + (10 * FS) + '" fill="#64748b">' + esc(unit) + '</text><line x1="' + pl + '" y1="' + (Hh - bot) + '" x2="' + (W - pl) + '" y2="' + (Hh - bot) + '" stroke="#cbd5e1"/>';
  items.forEach((it, i) => { const x = pl + ((W - pl * 2) / n) * (i + 0.5) - bw / 2, h = it.v > 0 ? Math.max(3, (it.v / mx) * (Hh - top - bot)) : 0, y = Hh - bot - h;
    s += '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + h + '" rx="4" fill="' + it.color + '"/><text x="' + (x + bw / 2) + '" y="' + (y - 5) + '" text-anchor="middle" font-size="' + (11 * FS) + '" font-weight="800" fill="#0f172a">' + (it.v > 0 ? f(it.v) : '-') + '</text><text x="' + (x + bw / 2) + '" y="' + (Hh - bot + 16) + '" text-anchor="middle" font-size="' + (11 * FS) + '" fill="#334155">' + esc(it.name) + '</text>'; });
  return s + '</svg>';
}
function lccSvg(series, H) {
  const W = 460, Hh = 270, pl = 54, pr = 14, pt0 = 16, pb = 56, mx = Math.max(1, ...series.map((s) => s.cum[s.cum.length - 1])) * 1.1;
  const X = (y) => pl + ((W - pl - pr) * y) / H, Y = (v) => Hh - pb - ((Hh - pb - pt0) * v) / mx;
  let s = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" class="x-svg" role="img" aria-label="LCC 누적비용 그래프">';
  for (let k = 0; k <= 4; k++) { const v = (mx / 4) * k, y = Y(v); s += '<line x1="' + pl + '" y1="' + y + '" x2="' + (W - pr) + '" y2="' + y + '" stroke="#e2e8f0"/><text x="' + (pl - 6) + '" y="' + (y + 3) + '" text-anchor="end" font-size="' + (9 * FS) + '" fill="#64748b">' + won(v) + '</text>'; }
  const step = H <= 12 ? 1 : H <= 30 ? 5 : 10; for (let y = 0; y <= H; y += step) s += '<text x="' + X(y) + '" y="' + (Hh - pb + 14) + '" text-anchor="middle" font-size="' + (9 * FS) + '" fill="#64748b">' + y + '년</text>';
  series.forEach((sr) => { let d = ''; sr.cum.forEach((v, y) => { d += (y === 0 ? 'M' : 'L') + X(y) + ' ' + Y(sr.cum[y - 1] != null && y > 0 ? sr.cum[y - 1] : v) + ' L' + X(y) + ' ' + Y(v) + ' '; });
    s += '<path d="' + d + '" fill="none" stroke="' + sr.color + '" stroke-width="2.4" stroke-linejoin="round"/>';
    sr.times.forEach((t) => { const yy = Math.min(H, Math.floor(t + 1e-9)); s += '<circle cx="' + X(t) + '" cy="' + Y(sr.cum[yy]) + '" r="3.6" fill="#fff" stroke="' + sr.color + '" stroke-width="2"/>'; }); });
  series.forEach((sr, k) => { s += '<rect x="' + (pl + k * 105) + '" y="' + (Hh - 18) + '" width="12" height="12" rx="3" fill="' + sr.color + '"/><text x="' + (pl + 17 + k * 105) + '" y="' + (Hh - 8) + '" font-size="' + (11 * FS) + '" fill="#334155">' + esc(sr.name) + '</text>'; });
  return s + '</svg>';
}

/* ===== UI · 보고서 생성기 ===== */
const FIELDS = [['name', '제품명'], ['company', '제조사 (선택)'], ['desc', '제품 특징 (개요)', 'ta'], ['usage', '용도', 'ta'], ['func', '기능 · 역할', 'ta'], ['comp', '성분 (수지·경화제·안료)', 'ta'], ['perf', '성능 (부착·내염·내후 등)', 'ta'],
  ['svr', '고형분 SVR (%)', 'n'], ['dft', '표준 도막 (㎛)', 'n'], ['cov', '이론 도포면적 ㎡/L (SVR 없을 때)', 'n'], ['dry', '건조시간'], ['pot', '가사시간'], ['heat', '내열온도 (℃)', 'n'], ['voc', 'VOC'], ['life', '보수주기 (년)', 'n'], ['certs', '인증서 (쉼표·줄바꿈 구분)', 'ta'], ['tracks', '시공 실적 (줄바꿈 구분)', 'ta']];

const S = { ps: [blank(), blank()], ours: 1, area: 1000, loss: 20, dft: '', H: 20, labor: 0, esc: 0, meta: { cust: '', vend: '', who: '', title: '' }, tab: 'prod', open: -1, doc: 'main', tgt: 0 };
const rl = (i) => (i === 0 ? '기존 제품' : i === S.ours ? '제안 제품' : LAB[i]);
const pn = (i) => (S.ps[i].name || '').trim() || '(제품명 미입력)';
const colsOf = (M) => S.ps.map((_, i) => i).filter((i) => M.C[i]);
const ready = (M) => !!(M.C[0] && M.C[S.ours]);
function bestIdx(vals, mode) { const v = vals.filter((x) => x > 0); if (v.length < 2 || Math.max(...v) === Math.min(...v)) return -1; const t = mode === 'max' ? Math.max(...v) : Math.min(...v); return vals.indexOf(t); }
const thc = (i) => '<th style="border-top:3px solid ' + COL[i] + '"><span style="color:' + COL[i] + '">' + rl(i) + '</span><small>' + esc(pn(i)) + '</small></th>';
function table(M, rows) {
  const cs = colsOf(M); let h = '<div class="x-tw"><table class="x-tbl"><thead><tr><th></th>' + cs.map(thc).join('') + '</tr></thead><tbody>';
  rows.forEach((r) => { const vals = cs.map((i) => (r[2] ? r[2](M.C[i], i) : 0)); const b = r[3] ? bestIdx(vals, r[3]) : -1;
    h += '<tr><td class="x-lb">' + r[0] + '</td>' + cs.map((i, k) => '<td class="' + (b === k ? 'x-best' : '') + '">' + r[1](M.C[i], i) + (b === k ? ' ★' : '') + '</td>').join('') + '</tr>'; });
  return h + '</tbody></table></div>';
}
const pctVs = (v, b, lowGood) => { if (!(b > 0) || !(v > 0)) return '-'; const d = ((v - b) / b) * 100; const good = lowGood ? d <= 0 : d >= 0; return '<b class="' + (good ? 'x-up' : 'x-dn') + '">' + (d >= 0 ? '+' : '') + d.toFixed(1) + '%</b>'; };

function calcTbl(M) {
  return table(M, [
    ['고형분 SVR (%)', (c) => fm(c.svr, 1), (c) => c.svr, 'max'],
    ['적용 도막 두께 (㎛)', (c) => fm(c.dft) + (c.dftAssumed ? ' (가정)' : ''), null],
    ['이론 단위당 면적 (㎡/L)', (c) => fm(c.theoCov, 2), (c) => c.theoCov, 'max'],
    ['이론 소요량 (L/㎡)', (c) => fm(c.theoUse, 3), (c) => c.theoUse, 'min'],
    ['실제 소요량 (L/㎡, 손실 ' + fm(M.X.loss) + '% 반영)', (c) => fm(c.actUse, 3), (c) => c.actUse, 'min'],
    ['실제 단위당 면적 (㎡/L)', (c) => fm(c.actCov, 2), (c) => c.actCov, 'max'],
    ['캔 용량 (L)', (c) => fm(c.pack, 1), null],
    ['캔당 면적 · 이론 (㎡/캔)', (c) => fm(c.canAreaTheo, 1), (c) => c.canAreaTheo, 'max'],
    ['캔당 면적 · 실제 (㎡/캔)', (c) => fm(c.canArea, 1), (c) => c.canArea, 'max'],
    ['단위 단가 (원/L)', (c) => fm(c.priceL), (c) => c.priceL, 'min'],
    ['캔당 단가 (원/캔)', (c) => fm(c.priceCan), (c) => c.priceCan, 'min'],
    ['㎡당 도장 자재비 (원/㎡) ※경제성', (c) => '<b>' + fm(c.costM2) + '</b>', (c) => c.costM2, 'min'],
    ['총 소요량 (L, ' + fm(M.X.area) + '㎡)', (c) => fm(c.vol, 1), (c) => c.vol, 'min'],
    ['필요 캔 수 (캔)', (c) => fm(c.cans), (c) => c.cans, 'min'],
    ['총 자재비', (c) => won(c.mat), (c) => c.mat, 'min'],
    ['경제성 (기존 대비 ㎡당 자재비)', (c, i) => (i === 0 ? '기준' : pctVs(c.costM2, M.C[0].costM2, true)), null],
  ]);
}
const PKS = [['내후성', /내후|자외선|UV|광택|백화|초킹|변색|황변|옥외|chalk/i], ['내염 · 내약품 · 내수', /내염|염수|내약품|내화학|내수|내알칼리|내산|방청|salt/i], ['부착 · 기계적 성능', /부착|밀착|경도|신장|인장|내충격|내마모|adhesion/i], ['내구성', /내구|수명|장기|보수주기|내식|방식/], ['내열', /내열|고온|열/]];
function perfSplit(p) {
  const out = {}; const rest = [];
  lst(p.perf).forEach((ln) => { const k = PKS.find((q) => q[1].test(ln)); if (k) (out[k[0]] = out[k[0]] || []).push(ln); else rest.push(ln); });
  if (N(p.life) > 0) (out['내구성'] = out['내구성'] || []).unshift('권장 보수주기 ' + fm(N(p.life)) + '년');
  if (N(p.heat) > 0) (out['내열'] = out['내열'] || []).unshift('내열온도 ' + fm(N(p.heat)) + '℃');
  out['기타 성능'] = rest; return out;
}
function textTbl(M) {
  const cs = colsOf(M), sp = cs.map((i) => perfSplit(S.ps[i]));
  const R = [['제품 특징', (i) => S.ps[i].desc], ['용도', (i) => S.ps[i].usage], ['기능 · 역할', (i) => S.ps[i].func], ['성분 (수지·경화제·안료)', (i) => S.ps[i].comp]].concat(PKS.map((q) => [q[0], (i, k) => (sp[k][q[0]] || []).join('\n')])).concat([['기타 성능', (i, k) => (sp[k]['기타 성능'] || []).join('\n')], ['건조시간', (i) => S.ps[i].dry], ['가사시간', (i) => S.ps[i].pot], ['VOC', (i) => S.ps[i].voc]]);
  let h = '<div class="x-tw"><table class="x-tbl x-txt"><thead><tr><th></th>' + cs.map(thc).join('') + '</tr></thead><tbody>';
  R.forEach((r) => { const vs = cs.map((i, k) => String(r[1](i, k) || '').trim()); if (!vs.some(Boolean)) return; h += '<tr><td class="x-lb">' + r[0] + '</td>' + vs.map((v) => '<td>' + (esc(v).replace(/\n/g, '<br>') || '<span class="x-na">자료 없음</span>') + '</td>').join('') + '</tr>'; });
  return h + '</tbody></table></div>';
}
function certTbl(M) {
  const cs = colsOf(M); let h = '<div class="x-tw"><table class="x-tbl x-txt"><thead><tr><th></th>' + cs.map(thc).join('') + '</tr></thead><tbody><tr><td class="x-lb">보유 인증서</td>';
  const base = lst(S.ps[0].certs);
  h += cs.map((i) => '<td>' + (lst(S.ps[i].certs).map((c) => '<span class="x-chip' + (i !== 0 && !base.includes(c) ? ' on' : '') + '">' + esc(c) + '</span>').join('') || '<span class="x-na">자료 없음</span>') + '</td>').join('') + '</tr>';
  h += '<tr><td class="x-lb">인증서 수</td>' + cs.map((i) => '<td>' + lst(S.ps[i].certs).length + '건</td>').join('') + '</tr>';
  h += '<tr><td class="x-lb">시공 실적 수</td>' + cs.map((i) => '<td>' + lst(S.ps[i].tracks).length + '건</td>').join('') + '</tr>';
  return h + '</tbody></table></div><p class="x-note">초록색 인증서는 기존 제품에 없는 추가 인증입니다. 시공 실적 상세는 별도 실적자료로 제공됩니다.</p>';
}
function ovHtml(i, role) {
  const p = S.ps[i], c = calcOne(p, calcAll(S).X);
  const kc = (k, v) => (v ? '<span class="x-kc"><small>' + k + '</small><b>' + esc(v) + '</b></span>' : '');
  const chips = kc('고형분', N(p.svr) > 0 ? fm(N(p.svr)) + '%' : '') + kc('표준 도막', N(p.dft) > 0 ? fm(N(p.dft)) + '㎛' : '') + kc('이론 도포', c && c.theoCov > 0 ? fm(c.theoCov, 1) + '㎡/L' : '') + kc('건조', p.dry) + kc('가사시간', p.pot) + kc('내열', N(p.heat) > 0 ? fm(N(p.heat)) + '℃' : '') + kc('VOC', p.voc) + kc('보수주기', N(p.life) > 0 ? fm(N(p.life)) + '년' : '') + kc('캔 · 단가', N(p.pack) > 0 && N(p.price) > 0 ? fm(N(p.pack)) + 'L · ' + fm(N(p.price)) + '원' : '');
  const row = (k, v) => (v && String(v).trim() ? '<dt>' + k + '</dt><dd>' + esc(v).replace(/\n/g, '<br>') + '</dd>' : '');
  const dl = row('특징', p.desc) + row('용도', p.usage) + row('기능', p.func) + row('성분', p.comp) + row('성능', p.perf);
  const cert = lst(p.certs).map((x) => '<span class="x-chip">' + esc(x) + '</span>').join('');
  return '<div class="x-ov" style="border-left:5px solid ' + COL[i] + '"><div class="x-ovh"><div><div class="x-role" style="color:' + COL[i] + '">' + role + '</div><h2>' + esc(pn(i)) + '</h2></div>' + (p.company ? '<span class="x-co">' + esc(p.company) + '</span>' : '') + '</div>' + (chips ? '<div class="x-kcs">' + chips + '</div>' : '') + (dl ? '<dl>' + dl + '</dl>' : '<p class="x-na">데이터시트에서 인식된 제품 소개 정보가 없습니다. 제품 탭에서 ‘추출값 확인·수정’으로 입력해 주세요.</p>') + (cert ? '<div class="x-ovc"><b>인증</b>' + cert + '</div>' : '') + '</div>';
}
function radarBlock(M) {
  const sc = scores(S, M); const cs = colsOf(M);
  return '<div class="x-chart">' + radarSvg(sc.ax, cs.map((i) => ({ name: rl(i), color: COL[i], v: sc.v[i] }))) + '</div><p class="x-note">육각 그래프는 제품 간 상대 점수(최고값=100)입니다. 경제성=㎡당 자재비(낮을수록↑), 도막 효율=SVR, 도포 효율=실제 단위당 면적, 작업성=건조·가사시간, 내구성=보수주기, 신뢰도=인증+실적 수.</p>';
}
function costBars(M) {
  const cs = colsOf(M); const it = (f) => cs.map((i) => ({ name: rl(i).replace(' 제품', ''), color: COL[i], v: f(M.C[i]) }));
  return '<div class="x-grid3"><div class="x-chart">' + barsSvg('캔당 단가', '원/캔', it((c) => c.priceCan), (v) => fm(v), 270) + '</div><div class="x-chart">' + barsSvg('㎡당 자재비', '원/㎡', it((c) => c.costM2), (v) => fm(v), 270) + '</div><div class="x-chart">' + barsSvg('총 자재비', fm(M.X.area) + '㎡', it((c) => c.mat), (v) => won(v), 270) + '</div></div>';
}
function lccBlock(M) {
  const cs = colsOf(M); const warn = cs.filter((i) => M.C[i].lifeMissing).map(rl);
  const t = table(M, [
    ['보수주기 (년)', (c) => (c.life > 0 ? fm(c.life, 1) : '<span class="x-na">미입력</span>'), (c) => c.life, 'max'],
    ['분석기간 내 도장 횟수 (회)', (c) => fm(c.n), (c) => c.n, 'min'],
    ['1회 도장비 (자재+시공)', (c) => won(c.per), (c) => c.per, 'min'],
    ['분석기간 LCC (' + M.X.H + '년)', (c) => '<b>' + won(c.lcc) + '</b>', (c) => c.lcc, 'min'],
    ['연평균 비용', (c) => won(c.annual), (c) => c.annual, 'min'],
    ['㎡·년당 비용 (원)', (c) => fm(c.annualM2), (c) => c.annualM2, 'min'],
    ['LCC (기존 대비)', (c, i) => (i === 0 ? '기준' : pctVs(c.lcc, M.C[0].lcc, true)), null],
  ]);
  const ser = cs.map((i) => ({ name: rl(i), color: COL[i], cum: M.C[i].cum, times: M.C[i].times }));
  return t + '<div class="x-grid2"><div class="x-chart">' + lccSvg(ser, M.X.H) + '<p class="x-note">누적 비용 · ○는 도장 시행 시점(보수주기), 시공비 ' + fm(M.X.labor) + '원/㎡ · 물가상승 ' + fm(M.X.esc, 1) + '%/년 가정</p></div><div class="x-chart">' + barsSvg('분석기간 LCC', '', cs.map((i) => ({ name: rl(i).replace(' 제품', ''), color: COL[i], v: M.C[i].lcc })), (v) => won(v)) + '</div></div>' +
    (warn.length ? '<p class="x-warn">※ ' + warn.join(', ') + ': 보수주기가 입력되지 않아 초기 도장 1회만 반영했습니다.</p>' : '');
}
function beBlock(M) {
  const b = breakEven(M, S.ours); if (!b) return '<p class="x-na">단가를 입력하면 손익분기 단가가 계산됩니다.</p>';
  const L = (v, can) => '<b>' + fm(v) + '원/L</b>' + (can > 0 ? ' (<b>' + fm(can) + '원/캔</b>)' : '');
  let h = '<table class="x-tbl x-be"><tbody>';
  if (b.baseL) h += '<tr><td class="x-lb">① 자재비 동일 단가 (기존)</td><td>기존 제품 단가가 ' + L(b.baseL, b.baseCan) + ' 일 때 ㎡당 도장 자재비가 제안 제품과 같아집니다. <span class="x-na">(현재 ' + fm(b.baseNow) + '원/L)</span></td></tr>';
  if (b.oursL) h += '<tr><td class="x-lb">② 자재비 동일 단가 (제안)</td><td>제안 제품 단가가 ' + L(b.oursL, b.oursCan) + '까지는 ㎡당 자재비가 기존 제품과 같거나 더 낮습니다. <span class="x-na">(현재 ' + fm(b.oursNow) + '원/L)</span></td></tr>';
  if (b.lccOursL) h += '<tr><td class="x-lb">③ LCC 동일 단가 (제안)</td><td>보수주기를 반영하면 제안 제품 단가가 ' + L(b.lccOursL, b.lccOursCan) + '까지 올라도 ' + M.X.H + '년 LCC가 기존 제품과 같습니다.</td></tr>';
  if (b.lccBaseL) h += '<tr><td class="x-lb">④ LCC 동일 단가 (기존)</td><td>기존 제품 단가가 ' + L(b.lccBaseL, b.lccBaseCan) + '이면 ' + M.X.H + '년 LCC가 제안 제품과 같습니다.</td></tr>';
  return h + '</tbody></table>';
}
function verdictBlock(M) {
  const v = verdict(S, M); return '<div class="x-verdict ' + (v.win === false ? 'bad' : '') + '"><b>' + v.head + '</b><ul>' + v.pts.map((p) => '<li>' + p + '</li>').join('') + '</ul></div>';
}
function effectBlock(M) {
  const o = S.ours, p = S.ps[o], b = M.C[0], c = M.C[o]; const li = [];
  if (p.perf) li.push('제공 성능: ' + esc(p.perf).replace(/\n/g, ' / '));
  if (p.usage) li.push('적용 용도: ' + esc(p.usage));
  if (c.life > 0) li.push('보수주기: ' + (b.life > 0 ? '기존 ' + fm(b.life, 1) + '년 → ' : '') + '<b>' + fm(c.life, 1) + '년</b> (' + M.X.H + '년 동안 도장 ' + c.n + '회' + (b.life > 0 ? ', 기존 ' + b.n + '회' : '') + ')');
  if (lst(p.certs).length) li.push('보유 인증: ' + lst(p.certs).map(esc).join(', '));
  if (c.cans && b.cans) li.push('필요 도료량: ' + fm(b.cans) + '캔 → <b>' + fm(c.cans) + '캔</b> (' + fm(M.X.area) + '㎡ 1회 시공 기준)');
  return '<ul class="x-ul">' + li.map((x) => '<li>' + x + '</li>').join('') + '</ul>';
}

/* ---------- 화면 조각 ---------- */
const guide = () => '<div class="x-guide"><div class="x-gi">⬆</div><b>데이터시트를 첨부하면 자동으로 비교합니다</b><ol><li><b>기존 제품</b> — 현재 사용 중인 제품 데이터시트 첨부</li><li><b>비교 A~D</b> — 변경 후보(제안) 제품 데이터시트 첨부</li><li>소요량 · 경제성 · 성능 · 인증 · LCC 비교와 A4 보고서가 자동 생성됩니다</li></ol><small>PDF · 엑셀 · 워드 · PPT · CSV · 사진 지원 · 단가와 캔 용량은 직접 입력</small></div>';
function slotHtml(i) {
  const p = S.ps[i], c = calcOne(p, calcAll(S).X), hasD = !!p.file || has(p), o = i === S.ours, op = S.open === i;
  const inp = (f, lab, ph, extra) => '<label class="x-f ' + (extra || '') + '"><span>' + lab + '</span><input data-f="' + f + '" data-i="' + i + '" inputmode="decimal" value="' + esc(p[f]) + '" placeholder="' + ph + '"></label>';
  let h = '<div class="x-slot' + (o ? ' ours' : '') + '" style="--c:' + COL[i] + '"><div class="x-sh"><div class="x-st"><b>' + LAB[i] + (i === 0 ? ' (현재 사용)' : '') + '</b>' + (o ? '<em>제안 제품</em>' : '') + '<span class="x-nm">' + (hasD ? esc(pn(i)) : '데이터시트를 첨부하세요') + '</span></div>';
  h += '<div class="x-sb"><button class="x-bt p" data-a="attach" data-i="' + i + '">' + (hasD ? '변경' : '첨부') + '</button>';
  if (window.parent && window.parent.CMPB) h += '<button class="x-bt" data-a="db" data-i="' + i + '">DB</button>';
  if (i > 1) h += '<button class="x-bt" data-a="del" data-i="' + i + '" aria-label="삭제">✕</button>';
  h += '</div></div>';
  if (p.file) h += '<div class="x-file">' + (p.file.url ? '<img src="' + p.file.url + '" alt="">' : '📄') + '<span>' + esc(p.file.name) + '</span></div>';
  h += '<div class="x-row">' + inp('pack', '캔 용량 (L)', '18') + inp('price', '캔당 단가 (원)', '180000') + '</div>';
  h += '<div class="x-stat" data-st="' + i + '">' + (c ? '㎡당 자재비 <b>' + fm(c.costM2) + '원</b> · 실제 ' + fm(c.actCov, 2) + '㎡/L' : '<span class="x-na">SVR이 인식되면 결과가 표시됩니다</span>') + '</div>';
  h += '<div class="x-sf">' + (i > 0 ? '<label class="x-rad"><input type="radio" name="ours" data-a="ours" data-i="' + i + '"' + (o ? ' checked' : '') + '> 이 제품을 제안 제품으로</label>' : '<span></span>') + (hasD ? '<button class="x-lk" data-a="open" data-i="' + i + '">' + (op ? '값 닫기' : '추출값 확인·수정') + '</button>' : '') + '</div>';
  if (op) {
    h += '<div class="x-det"><p class="x-note">데이터시트에서 자동 추출한 값입니다(읽은 글자 ' + (p.rawLen == null ? '-' : fm(p.rawLen)) + '자 · ' + (p.ext || []).length + '개 항목). 비어 있거나 원문과 다르면 직접 입력해 주세요. <span class="x-tag">추출</span> 표시는 자동 입력 항목입니다.</p><div class="x-g2">';
    FIELDS.forEach(([k, lab, ty]) => { const t = (p.ext || []).includes(k) ? '<span class="x-tag">추출</span>' : ''; h += '<label class="x-f ' + (ty === 'ta' || k === 'name' || k === 'company' ? 'full' : '') + '"><span>' + lab + t + '</span>' + (ty === 'ta' ? '<textarea data-f="' + k + '" data-i="' + i + '" rows="2">' + esc(p[k]) + '</textarea>' : '<input data-f="' + k + '" data-i="' + i + '" value="' + esc(p[k]) + '"' + (ty === 'n' ? ' inputmode="decimal"' : '') + '>') + '</label>'; });
    h += '</div><div class="x-sb end"><button class="x-bt" data-a="trk" data-i="' + i + '">실적 파일 첨부</button><button class="x-bt" data-a="clear" data-i="' + i + '">비우기</button></div></div>';
  }
  return h + '</div>';
}
function tabProd() {
  const g = (k, lab, ph) => '<label class="x-f"><span>' + lab + '</span><input data-g="' + k + '" inputmode="decimal" value="' + esc(S[k]) + '" placeholder="' + (ph || '') + '"></label>';
  return '<div class="x-card"><div class="x-h">비교 조건</div><div class="x-g3">' + g('area', '도장 면적 (㎡)', '1000') + g('loss', '손실률 (%)', '20') + g('dft', '동일 도막 (㎛)', '비우면 각 제품 값') + '</div></div>' +
    '<div class="x-h2">데이터시트 첨부 <small>첨부하면 자동으로 비교됩니다</small></div>' + S.ps.map((_, i) => slotHtml(i)).join('') +
    (S.ps.length < 5 ? '<button class="x-add" data-a="add">＋ 비교 제품 추가 (최대 D까지)</button>' : '');
}
function cmpBody(M, forReport) {
  return '<div class="x-sec">' + ovHtml(0, '현재 사용 제품') + ovHtml(S.ours, '제안 제품') + '</div>' +
    '<div class="x-h2">1. 도막 · 소요량 · 경제성 비교</div>' + calcTbl(M) + costBars(M) +
    '<div class="x-h2">2. 육각 성능 비교</div>' + radarBlock(M) +
    '<div class="x-h2">3. 성분 · 성능 · 용도 비교</div>' + textTbl(M) +
    '<div class="x-h2">4. 인증서 · 실적 비교</div>' + certTbl(M);
}
function lccOut(M) { return ready(M) ? '<div class="x-h2">LCC 분석 (보수주기 · 비용 · 수명)</div>' + lccBlock(M) + '<div class="x-h2">손익분기 단가</div>' + beBlock(M) + verdictBlock(M) : guide(); }
function tabLcc() {
  const M = calcAll(S); const cs = colsOf(M);
  const g = (k, lab, ph) => '<label class="x-f"><span>' + lab + '</span><input data-g="' + k + '" inputmode="decimal" value="' + esc(S[k]) + '" placeholder="' + (ph || '') + '"></label>';
  return '<div class="x-card"><div class="x-h">LCC 조건</div><div class="x-g3">' + g('H', '분석기간 (년)', '20') + g('labor', '시공비 (원/㎡)', '0') + g('esc', '물가상승 (%/년)', '0') + '</div>' +
    '<div class="x-h" style="margin-top:12px">제품별 보수주기 (년)</div><div class="x-g3">' + cs.map((i) => '<label class="x-f"><span style="color:' + COL[i] + '">' + rl(i) + '</span><input data-f="life" data-i="' + i + '" inputmode="decimal" value="' + esc(S.ps[i].life) + '" placeholder="예: 10"></label>').join('') + '</div><p class="x-note">보수주기는 데이터시트의 내구 연한 또는 제안 조건으로 입력합니다.</p></div><div id="out">' + lccOut(M) + '</div>';
}
function tabCmp() { const M = calcAll(S); return ready(M) ? verdictBlock(M) + cmpBody(M) : guide(); }

/* ---------- A4 보고서 ---------- */
function pg(n, tot, title, inner) { return '<section class="x-pg"><header class="x-ph"><b>' + esc(S.meta.title || '제품 변경 제안 분석 보고서') + '</b><span>' + esc(S.meta.cust) + '</span></header><h1>' + title + '</h1>' + inner + '<footer class="x-pf"><span>' + esc(S.meta.vend) + '</span><span>' + n + ' / ' + tot + '</span></footer></section>'; }
function reportHtml() { FS = 1.5; try { return reportHtml0(); } finally { FS = 1; } }
function reportHtml0() {
  const M = calcAll(S); if (!ready(M)) return '<div class="x-guide">보고서는 기존 제품과 제안 제품의 데이터시트를 첨부하면 자동으로 생성됩니다.</div>';
  const d = new Date(), ds = d.getFullYear() + '. ' + (d.getMonth() + 1) + '. ' + d.getDate();
  const cover = '<table class="x-tbl x-be"><tbody><tr><td class="x-lb">고객사</td><td>' + (esc(S.meta.cust) || '-') + '</td><td class="x-lb">작성일</td><td>' + ds + '</td></tr><tr><td class="x-lb">제안사</td><td>' + (esc(S.meta.vend) || '-') + '</td><td class="x-lb">작성자</td><td>' + (esc(S.meta.who) || '-') + '</td></tr><tr><td class="x-lb">변경 대상</td><td colspan="3">' + esc(pn(0)) + ' → <b>' + esc(pn(S.ours)) + '</b></td></tr><tr><td class="x-lb">분석 조건</td><td colspan="3">도장 면적 ' + fm(M.X.area) + '㎡ · 손실률 ' + fm(M.X.loss) + '% · 도막 ' + (M.X.dft > 0 ? fm(M.X.dft) + '㎛ 동일 적용' : '데이터시트 기준') + ' · 분석기간 ' + M.X.H + '년 · 시공비 ' + fm(M.X.labor) + '원/㎡ · 물가상승 ' + fm(M.X.esc, 1) + '%/년</td></tr></tbody></table>';
  let n = 0; const H = (t) => '<div class="x-h2">' + ++n + '. ' + t + '</div>';
  const others = colsOf(M).filter((i) => i !== 0 && i !== S.ours);
  const secs = [
    '<h1>' + esc(S.meta.title || '제품 변경 제안 분석 보고서') + '</h1>' + cover,
    H('종합 결론') + verdictBlock(M),
    H('현재 사용 제품 · 제안 제품 소개') + ovHtml(0, '현재 사용 제품') + ovHtml(S.ours, '제안 제품') + others.map((i) => ovHtml(i, LAB[i])).join('') + '<p class="x-note">비교 기준: 각 제조사 기술자료(데이터시트)에 기재된 값입니다. 추출값은 원문과 대조해 확정하였습니다.</p>',
    H('도막 · 소요량 · 단가 · 경제성') + calcTbl(M) + '<p class="x-note">이론 단위당 면적 = SVR(%)×10÷도막(㎛), 실제 = 이론×(1−손실률), ㎡당 자재비 = 단위단가÷실제 단위당 면적, 캔당 면적 = 단위당 면적×캔 용량.</p>',
    H('비용 막대 그래프') + costBars(M),
    H('손익분기 단가') + beBlock(M) + '<p class="x-note">손익분기 단가는 ㎡당 도장 자재비(및 LCC)가 두 제품에서 같아지는 단가입니다. 기존 제품이 이 단가보다 비싸거나 제안 제품이 저렴하면 변경 효과가 발생합니다.</p>',
    H('육각 성능 그래프') + radarBlock(M),
    H('인증서 · 실적 비교') + certTbl(M),
    H('성분 · 성능 · 내구성 · 내후성 비교') + textTbl(M),
    H('LCC 분석 (보수주기 · 비용 · 수명)') + lccBlock(M),
    H('제안 제품으로 변경 시 기대 효과') + effectBlock(M),
    H('결론') + verdictBlock(M) + '<p class="x-note">본 보고서는 제조사 데이터시트와 입력 조건을 기준으로 한 참고 자료이며, 실제 소요량·비용·수명은 현장 조건(표면 상태, 환경, 시공 방법)에 따라 달라질 수 있습니다. 시공 전 최신 기술자료를 확인하시기 바랍니다.</p>',
  ].map((x) => '<div class="x-sc">' + x + '</div>');
  return packPages(secs);
}
function packPages(secs) {
  const shell = (inner) => '<section class="x-pg"><header class="x-ph"><b>' + esc(S.meta.title || '제품 변경 제안 분석 보고서') + '</b><span>' + esc(S.meta.cust) + '</span></header><div class="x-pb"><div class="x-pbi">' + inner + '</div></div><footer class="x-pf"><span>' + esc(S.meta.vend) + '</span><span>@N@</span></footer></section>';
  const host = document.createElement('div'); host.className = 'x-pgs'; host.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;transform:none';
  host.innerHTML = shell(''); document.body.appendChild(host);
  const cap = host.querySelector('.x-pb').clientHeight; host.innerHTML = shell(secs.join(''));
  const hs = [...host.querySelectorAll('.x-sc')].map((e) => e.offsetHeight + parseFloat(getComputedStyle(e).marginBottom || 0));
  host.remove();
  const pages = []; let cur = [], used = 0;
  secs.forEach((x, k) => { if (cur.length && used + hs[k] > cap) { pages.push(cur); cur = []; used = 0; } cur.push(x); used += hs[k]; });
  if (cur.length) pages.push(cur);
  return pages.map((g, k) => shell(g.join('')).replace('@N@', (k + 1) + ' / ' + pages.length)).join('');
}
function fill() {
  document.querySelectorAll('.x-pg').forEach((pg) => {
    const pb = pg.querySelector('.x-pb'), bi = pg.querySelector('.x-pbi'); if (!pb || !bi) return;
    bi.style.cssText = ''; const cap = pb.clientHeight; if (bi.scrollHeight > cap + 1) return;
    let lo = 1, hi = 1.4;
    for (let t = 0; t < 9; t++) { const k = (lo + hi) / 2; bi.style.width = 100 / k + '%'; bi.style.transform = 'scale(' + k + ')'; if (bi.scrollHeight * k <= cap) lo = k; else hi = k; }
    bi.style.width = 100 / lo + '%'; bi.style.transform = 'scale(' + lo + ')'; bi.style.minHeight = '';
    const left = cap / lo - bi.scrollHeight, tr = [...bi.querySelectorAll('tr')];
    if (left > 6 && tr.length) { const ex = Math.min(22, left / tr.length); tr.forEach((r) => { r.style.height = r.offsetHeight + ex + 'px'; }); }
    bi.style.minHeight = cap / lo + 'px';
  });
}
function tracksHtml() { FS = 1.5; try { return tracksHtml0(); } finally { FS = 1; } }
function tracksHtml0() {
  const idx = [S.ours, 0].filter((i, k, a) => a.indexOf(i) === k && has(S.ps[i]) || lst(S.ps[i].tracks).length);
  const body = idx.map((i) => '<div class="x-h2" style="color:' + COL[i] + '">' + rl(i) + ' · ' + esc(pn(i)) + ' (' + lst(S.ps[i].tracks).length + '건)</div>' + (lst(S.ps[i].tracks).length ? '<ol class="x-ol">' + lst(S.ps[i].tracks).map((t) => '<li>' + esc(t) + '</li>').join('') + '</ol>' : '<p class="x-na">등록된 실적이 없습니다.</p>')).join('');
  const t = S.meta.title; S.meta.title = '시공 실적 자료'; const h = pg(1, 1, '시공 실적 자료', body || '<p class="x-na">실적 정보가 없습니다. 제품의 추출값 확인 화면에서 실적을 입력하거나 실적 파일을 첨부하세요.</p>'); S.meta.title = t; return h;
}
function tabRep() {
  const m = (k, lab) => '<label class="x-f"><span>' + lab + '</span><input data-m="' + k + '" value="' + esc(S.meta[k]) + '"></label>';
  const br = window.parent && window.parent.CMPB && window.parent.CMPB.layers ? (() => { try { return window.parent.CMPB.layers(); } catch (e) { return []; } })() : [];
  return '<div id="repCtl"><div class="x-card"><div class="x-h">보고서 정보</div><div class="x-g2">' + m('cust', '고객사') + m('vend', '제안사') + m('who', '작성자') + m('title', '보고서 제목 (선택)') + '</div></div>' +
    '<div class="x-seg"><button data-a="doc" data-v="main" class="' + (S.doc === 'main' ? 'on' : '') + '">분석 보고서</button><button data-a="doc" data-v="trk" class="' + (S.doc === 'trk' ? 'on' : '') + '">실적자료 (별도)</button></div>' +
    '<div class="x-acts"><button class="x-bt p" data-a="print">A4 인쇄</button><button class="x-bt p" data-a="pdf">PDF 저장</button><button class="x-bt" data-a="xls">엑셀 저장</button></div>' +
    (br.length ? '<div class="x-card"><div class="x-h">도장 시스템에 적용</div><div class="x-row"><label class="x-f"><span>적용할 코트</span><select id="lyr">' + br.map((l) => '<option value="' + l.i + '">' + esc(l.lb || '') + ' · ' + esc(l.n) + '</option>').join('') + '</select></label><button class="x-bt p" data-a="apply">제안 제품으로 변경</button></div><p class="x-note">제품 DB에 같은 이름의 제품이 있을 때 적용됩니다.</p></div>' : '') + '</div>' +
    '<div id="repWrap"><div id="pgw"><div class="x-pgs" id="pgs">' + (S.doc === 'trk' ? tracksHtml() : reportHtml()) + '</div></div></div>';
}
function fit() { const w = document.getElementById('pgw'), s = document.getElementById('pgs'); if (!w || !s) return; const sc = Math.min(1, w.clientWidth / 794); s.style.transform = 'scale(' + sc + ')'; w.style.height = Math.ceil(s.scrollHeight * sc) + 'px'; }

/* ---------- 파일 처리 ---------- */
const LIBS = { xlsx: ['XLSX', 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'], pdf: ['pdfjsLib', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'], h2c: ['html2canvas', 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'], jspdf: ['jspdf', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'], tess: ['Tesseract', 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js'] };
async function lib(k) {
  const [g, u] = LIBS[k]; let o = window[g]; try { o = o || window.parent[g]; } catch (e) {}
  if (!o) { await new Promise((res, rej) => { const s = document.createElement('script'); s.src = u; s.onload = res; s.onerror = () => rej(new Error('lib')); document.head.appendChild(s); }); o = window[g]; }
  if (k === 'pdf' && o.GlobalWorkerOptions && !o.GlobalWorkerOptions.workerSrc) o.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  return o;
}
async function unzip(buf) {
  const dv = new DataView(buf), u8 = new Uint8Array(buf), td = new TextDecoder(); let e = u8.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const out = {};
  for (let i = 0; i < n; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const meth = dv.getUint16(p + 10, true), csz = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    const name = td.decode(u8.subarray(p + 46, p + 46 + nl)); p += 46 + nl + xl + cl;
    if (!/^(word\/document\.xml|ppt\/slides\/slide\d+\.xml)$/.test(name)) continue;
    const ds = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true), data = u8.subarray(ds, ds + csz);
    out[name] = meth === 0 ? td.decode(data) : td.decode(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
  }
  return out;
}
const xmlText = (x) => x.replace(/<\/(?:w:p|a:p|w:tr)>/g, '\n').replace(/<\/w:tc>/g, ' | ').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
async function pdfOcr(f) {
  const P = await lib('pdf'), T = await lib('tess'); const pdf = await P.getDocument({ data: await f.arrayBuffer() }).promise; let out = '';
  for (let i = 1; i <= Math.min(3, pdf.numPages); i++) { const pg = await pdf.getPage(i), vp = pg.getViewport({ scale: 2 }); const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height; await pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise; out += (await T.recognize(cv, 'kor+eng')).data.text + '\n'; }
  return out;
}
async function fileText(f) {
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  if (['txt', 'csv', 'tsv', 'md'].includes(ext)) return await f.text();
  if (['xlsx', 'xls', 'xlsm'].includes(ext)) { const X = await lib('xlsx'); const wb = X.read(await f.arrayBuffer(), { type: 'array' }); return wb.SheetNames.map((s) => X.utils.sheet_to_csv(wb.Sheets[s], { FS: ' ' })).join('\n'); }
  if (ext === 'pdf') {
    const P = await lib('pdf'); const pdf = await P.getDocument({ data: await f.arrayBuffer() }).promise; let out = '';
    for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) { const c = await (await pdf.getPage(i)).getTextContent(); let y = null, line = ''; c.items.forEach((it) => { const yy = Math.round(it.transform[5]); if (y !== null && Math.abs(yy - y) > 2) { out += line.trim() + '\n'; line = ''; } y = yy; line += it.str + ' '; }); out += line + '\n'; }
    if (out.replace(/\s/g, '').length < 50) { busy('글자가 없는 PDF입니다 · 이미지 인식 중…'); return await pdfOcr(f); }
    return out;
  }
  if (ext === 'docx' || ext === 'pptx') { const z = await unzip(await f.arrayBuffer()); return Object.keys(z).sort().map((k) => xmlText(z[k])).join('\n'); }
  if ((f.type || '').startsWith('image/')) { const T = await lib('tess'); return (await T.recognize(f, 'kor+eng')).data.text; }
  throw new Error('unsupported');
}

/* ---------- 앱 ---------- */
const KEY = 'cmp_v495';
function load() { try { const r = JSON.parse(localStorage.getItem(KEY)); if (r && r.ps && r.ps.length >= 2) { Object.assign(S, r); S.ps.forEach((p) => { p.ext = p.ext || []; }); S.tab = 'prod'; S.open = -1; } } catch (e) {} }
let tm = 0;
function save() { clearTimeout(tm); tm = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify({ ...S, ps: S.ps.map((p) => ({ ...p, file: p.file ? { name: p.file.name } : null })) })); } catch (e) {} }, 300); }
const $ = (s) => document.querySelector(s);
function toast(m) { const t = $('#toast'); if (!t) return; t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 3200); }
/* ---------- 대시보드 (SMARTCOST 형식: 요약 ROI · 기술스펙 · LCC 분석 · 견적 산출 / 움직이는 차트) ---------- */
const D = { t: 'roi', demo: false, area: null, loss: null, dft: null };
function demoS() {
  const mk = (o) => ({ ...blank(), ...o });
  return { ...S, ps: [mk({ name: '기존 제품 (예시)', svr: 45, dft: 50, pack: 9, price: 82000, life: 5 }), mk({ name: '제안 제품 (예시)', svr: 58, dft: 50, pack: 15, price: 80000, life: 10 }), mk({ name: '비교 B (예시)', svr: 50, dft: 50, pack: 15, price: 180000, life: 7 })], ours: 1, area: 1500, loss: 20, dft: 50, H: 30, labor: 4500, esc: 3 };
}
function dctx() {
  const src = D.demo ? demoS() : S, M = calcAll(src), b = M.C[0], o = M.C[src.ours];
  if (!b || !o) return null;
  let oi = -1; src.ps.forEach((p, i) => { if (oi < 0 && i !== 0 && i !== src.ours && M.C[i]) oi = i; });
  const nm = (i) => (src.ps[i].name || '').trim() || (i === 0 ? '기존 제품' : i === src.ours ? '제안 제품' : LAB[i]);
  return { src, M, b, o, oi, x: oi >= 0 ? M.C[oi] : null, nm };
}
const dTabs = [['roi', '요약 ROI'], ['spec', '기술스펙'], ['lcc', 'LCC 분석'], ['est', '견적 산출']];
const dCn = (v, f) => '<b data-cn="' + v + '" data-cf="' + f + '">0</b>';
function dFmt(v, f) { return f === 'pct' ? v.toFixed(1) + '%' : f === 'x' ? v.toFixed(1) + '배' : f === 'won' ? fm(v) + '원' : fm(v); }
function tabDash() {
  const h = '<div class="d-top"><i></i>SMARTCOST AI<small>도료 스펙 &amp; LCC 대시보드</small></div><div class="d-tabs">' + dTabs.map((t) => '<button data-a="dt" data-v="' + t[0] + '" class="' + (D.t === t[0] ? 'on' : '') + '">' + t[1] + '</button>').join('') + '</div>';
  const c = dctx();
  if (!c) return h + '<div class="x-card"><div class="x-h">대시보드를 표시할 데이터가 없습니다</div><p class="x-na">‘제품’ 탭에서 기존 제품과 제안 제품의 데이터시트를 첨부하면(고형분·도막·단가 인식) 자동으로 채워집니다.</p><div class="x-sb"><button class="x-bt p" data-a="demo">예시 데이터로 미리보기</button><button class="x-bt" data-a="tab" data-v="prod">제품 탭으로</button></div></div>';
  return h + (D.demo ? '<div class="d-demo">예시 데이터입니다 · <button data-a="demo" data-v="off">내 데이터로 돌아가기</button></div>' : '') + (D.t === 'roi' ? dRoi(c) : D.t === 'spec' ? dSpec(c) : D.t === 'lcc' ? dLcc(c) : dEst(c));
}
function dRoi(c) {
  const { b, o, src } = c, cut = b.costM2 > 0 ? (1 - o.costM2 / b.costM2) * 100 : 0, mul = b.canArea > 0 ? o.canArea / b.canArea : 0, lc = b.lcc > 0 ? (1 - o.lcc / b.lcc) * 100 : 0;
  const row = (p, cc, cls, t) => '<div class="d-row ' + cls + '"><div class="d-sp"><span>' + t + ': <b>' + esc(c.nm(p)) + '</b></span><span>단가: ' + fm(cc.priceCan) + '원 (' + fm(cc.pack) + 'L)</span></div><div>실제 소요량: <b class="' + (cls ? 'g' : '') + '">' + cc.actUse.toFixed(3) + ' L/㎡</b> <small>(손실 ' + fm(c.M.X.loss) + '% 기준 · 고형분 ' + fm(cc.svr) + '%)</small></div></div>';
  return '<div class="x-card"><div class="x-h">현재 사양 vs 제안 사양 요약</div>' + row(0, b, '', '기존 사용') + row(src.ours, o, 'p', '제안 제품') + '</div>' +
    '<div class="x-card"><div class="d-kp"><div><small>㎡당 자재비 절감</small>' + dCn(cut, 'pct') + '</div><div><small>캔당 도포 면적</small>' + dCn(mul, 'x') + '</div><div><small>' + c.M.X.H + '년 LCC 절감</small>' + dCn(lc, 'pct') + '</div></div></div>' +
    '<div class="x-card"><div class="x-h">✔ 경영진 제안 및 총평</div><p class="d-tx">초기 ㎡당 자재비 ' + fm(b.costM2) + '원 → ' + fm(o.costM2) + '원(' + cut.toFixed(1) + '% ' + (cut >= 0 ? '절감' : '증가') + '), 고형분(SVR) ' + fm(b.svr) + '% → ' + fm(o.svr) + '%로 캔당 도포 면적이 ' + fm(b.canArea, 1) + '㎡에서 ' + fm(o.canArea, 1) + '㎡로 ' + mul.toFixed(1) + '배 달라집니다.' + (b.lcc > 0 && o.lcc > 0 ? ' ' + c.M.X.H + '년 LCC는 ' + won(b.lcc) + ' → ' + won(o.lcc) + '입니다.' : '') + '</p></div>';
}
const dAx = (i, k, r) => { const a = -Math.PI / 2 + i * Math.PI / 3; return [160 + r * k * Math.cos(a), 150 + r * k * Math.sin(a)]; };
const dPts = (v, k) => v.map((x, i) => dAx(i, k, 95 * x / 100).map((n) => n.toFixed(1)).join(',')).join(' ');
function dSpec(c) {
  const sc = scores(c.src, c.M), ids = [0, c.src.ours].concat(c.oi >= 0 ? [c.oi] : []), cols = ids.map((i) => c.M.C[i]);
  const best = (f, hi) => { const v = cols.map(f); const t = hi ? Math.max(...v) : Math.min(...v.filter((x) => x > 0)); return v.map((x) => x > 0 && x === t); };
  const R = [['고형분 SVR (%)', (q) => q.svr, 0, 1], ['적용 도막 두께 (㎛)', (q) => q.dft, 0, 0], ['이론 단위면적 (㎡/L)', (q) => q.theoCov, 1, 1], ['이론 소요량 (L/㎡)', (q) => q.theoUse, 3, 0], ['실제 소요량 (L/㎡)', (q) => q.actUse, 3, 0], ['실제 단위면적 (㎡/L)', (q) => q.actCov, 2, 1], ['캔 용량 (L)', (q) => q.pack, 0, 1], ['캔당 실제 면적 (㎡)', (q) => q.canArea, 1, 1], ['캔당 단가 (원)', (q) => q.priceCan, 0, 0]];
  const hex = (k) => dPts([100, 100, 100, 100, 100, 100], k);
  const poly = ids.map((id, k) => sc.v[id] ? '<polygon class="d-poly" data-v="' + sc.v[id].join(',') + '" points="' + dPts(sc.v[id], 0) + '" fill="' + COL[k] + '" fill-opacity=".28" stroke="' + COL[k] + '" stroke-width="' + (k === 1 ? 3 : 1.6) + '"/>' : '').join('');
  return '<div class="x-card"><div class="d-sp"><div class="x-h">6대 육각 물성 밸런스 비교</div><small>상대 점수 (100점 만점)</small></div><svg viewBox="0 0 320 300" class="d-svg">' + [.25, .5, .75, 1].map((k) => '<polygon points="' + hex(k) + '" fill="none" stroke="#cbd5e1"/>').join('') + sc.ax.map((t, i) => { const p = dAx(i, 1.24, 95); return '<text x="' + p[0] + '" y="' + (p[1] + 3) + '" text-anchor="middle">' + t + '</text>'; }).join('') + poly + '</svg><div class="d-leg">' + ids.map((id, k) => '<span><i style="background:' + COL[k] + '"></i>' + esc(c.nm(id)) + '</span>').join('') + '</div></div>' +
    '<div class="x-card"><div class="d-sp"><div class="x-h">기술 스펙 Matrix 상세 비교</div><small class="g">★ 우수 항목</small></div><div class="x-tw"><table class="x-tbl d-tbl"><tr><th>검토 항목</th>' + ids.map((id, k) => '<th style="color:' + COL[k] + '">' + esc(c.nm(id)) + '</th>').join('') + '</tr>' + R.map((r) => { const bs = best(r[1], r[3]); const same = new Set(cols.map(r[1])).size < 2; return '<tr><td class="x-lb">' + r[0] + '</td>' + cols.map((q, k) => '<td class="' + (bs[k] && !same ? 'd-best' : '') + '">' + fm(r[1](q), r[2]) + (bs[k] && !same ? ' ★' : '') + '</td>').join('') + '</tr>'; }).join('') + '</table></div></div>';
}
const dY = (v, mx) => 190 - (v / mx) * 175, dX = (i, n) => 40 + (i * 280) / Math.max(1, n);
function dLcc(c) {
  const H = c.M.X.H, lines = [c.b, c.o].concat(c.x ? [c.x] : []), mx = Math.max(1, ...lines.map((q) => q.cum[q.cum.length - 1] || 0)) * 1.08, step = Math.pow(10, Math.floor(Math.log10(mx))) , tk = [0, .25, .5, .75, 1].map((f) => mx * f);
  const path = (q) => q.cum.map((v, i) => (i ? 'L' : 'M') + dX(i, H).toFixed(1) + ',' + dY(v, mx).toFixed(1)).join('');
  const yrs = [0, Math.round(H / 4), Math.round(H / 2), Math.round((3 * H) / 4), H];
  const sv = c.b.lcc - c.o.lcc, svp = c.b.lcc > 0 ? (sv / c.b.lcc) * 100 : 0;
  const mats = [c.b, c.o].concat(c.x ? [c.x] : []), mm = Math.max(1, ...mats.map((q) => q.costM2));
  return '<div class="x-card"><div class="x-h">' + H + '년 수명주기비용 (LCC) 시뮬레이션</div><small>보수 주기·경과 연수별 누적 유지비용 (원, 면적 ' + fm(c.M.X.area) + '㎡ 기준)</small><svg viewBox="0 0 340 230" class="d-svg"><defs><clipPath id="dcp"><rect id="dcr" x="0" y="0" width="0" height="230"/></clipPath></defs>' + tk.map((v) => '<line x1="40" x2="320" y1="' + dY(v, mx) + '" y2="' + dY(v, mx) + '" stroke="#cbd5e1" stroke-dasharray="3 4"/><text x="36" y="' + (dY(v, mx) + 3) + '" text-anchor="end">' + won(v) + '</text>').join('') + yrs.map((y) => '<text x="' + dX(y, H) + '" y="212" text-anchor="middle">' + (y ? y + '년' : '초기') + '</text>').join('') + '<g clip-path="url(#dcp)">' + lines.map((q, k) => '<path d="' + path(q) + '" fill="none" stroke="' + COL[k] + '" stroke-width="' + (k === 1 ? 3.5 : 2.4) + '"' + (k === 2 ? ' stroke-dasharray="5 4"' : '') + '/>' + q.times.map((t) => '<circle cx="' + dX(t, H).toFixed(1) + '" cy="' + dY(q.cum[Math.min(H, Math.floor(t + 1e-9))], mx).toFixed(1) + '" r="4" fill="#fff" stroke="' + COL[k] + '" stroke-width="2"/>').join('')).join('') + '</g></svg><div class="d-leg">' + lines.map((q, k) => '<span><i style="background:' + COL[k] + '"></i>' + esc(c.nm(k === 0 ? 0 : k === 1 ? c.src.ours : c.oi)) + '</span>').join('') + '</div>' +
    '<div class="d-row p" style="margin-top:10px"><div class="d-sp"><b>' + H + '년 LCC 최종 절감액</b><b class="g">' + (b0(sv) ? '' : '') + '<span data-cn="' + sv + '" data-cf="won">0</span> (' + svp.toFixed(1) + '%)</b></div><small>초기 자재비 차이와 보수 주기(수명) 차이가 함께 반영됩니다. 보수 횟수: ' + c.b.n + '회 → ' + c.o.n + '회</small></div></div>' +
    '<div class="x-card"><div class="x-h">초기 ㎡당 자재비 직관 비교</div><div class="d-bars">' + mats.map((q, k) => '<div data-h="' + (q.costM2 / mm * 100).toFixed(1) + '" style="background:' + COL[k] + '"><span>' + fm(q.costM2) + '원</span></div>').join('') + '</div><div class="d-lb">' + mats.map((q, k) => '<span>' + esc(c.nm(k === 0 ? 0 : k === 1 ? c.src.ours : c.oi)) + '</span>').join('') + '</div></div>';
}
const b0 = (v) => !isFinite(v);
function dEst(c) {
  const X = c.M.X; if (D.area == null) { D.area = X.area || 1000; D.loss = X.loss; D.dft = X.dft || c.b.dft || 50; }
  const sl = (id, lab, v, mn, mx, st, col, u) => '<label class="d-sl"><span>' + lab + '<b id="v' + id + '" style="color:' + col + '">' + fm(v) + ' ' + u + '</b></span><input type="range" id="s' + id + '" min="' + mn + '" max="' + mx + '" step="' + st + '" value="' + v + '"></label>';
  const box = (t, cls) => '<div class="d-row ' + cls + '"><b>' + t + '</b><div>소요 캔 수: <b id="' + cls + 'n"></b></div><div>캔당 면적: <b id="' + cls + 's"></b></div><hr><small>총 자재비</small><div class="d-big" id="' + cls + 'c"></div></div>';
  return '<div class="x-card"><div class="d-sp"><div class="x-h">현장 도장 파라미터 실시간 조정</div><button class="x-lk" data-a="rs">⟳ 초기화</button></div>' + sl('a', '총 도장 면적 (㎡)', D.area, 100, 20000, 100, '#1c58e0', '㎡') + sl('l', '현장 손실률 (Loss %)', D.loss, 0, 50, 1, '#ea580c', '%') + sl('t', '목표 도막 두께 (㎛)', D.dft, 20, 300, 5, '#059669', '㎛') + '</div>' +
    '<div class="x-card"><div class="x-h">실시간 견적 산출 비교 결과</div><div class="d-two">' + box(esc(c.nm(0)), 'a') + box(esc(c.nm(c.src.ours)), 'o') + '</div><div class="d-sv"><span>현장 총 자재비 절감액<br><small id="dar"></small></span><span style="text-align:right"><big id="dd"></big><br><small id="dpc"></small></span></div></div>';
}
let dSh = { a: 0, o: 0 };
function dCalc() {
  const c = dctx(); if (!c) return; const g = (id) => document.getElementById(id); if (!g('sa')) return;
  D.area = +g('sa').value; D.loss = +g('sl').value; D.dft = +g('st').value;
  g('va').textContent = fm(D.area) + ' ㎡'; g('vl').textContent = D.loss + ' %'; g('vt').textContent = D.dft + ' ㎛';
  const X = { ...c.M.X, area: D.area, loss: D.loss, dft: D.dft }, A = calcOne(c.src.ps[0], X), O = calcOne(c.src.ps[c.src.ours], X);
  const to = { a: A.cans * A.priceCan, o: O.cans * O.priceCan }, from = { ...dSh };
  g('an').textContent = A.cans + '캔'; g('on').textContent = O.cans + '캔'; g('as').textContent = fm(A.canArea, 1) + '㎡'; g('os').textContent = fm(O.canArea, 1) + '㎡'; g('dar').textContent = '(' + fm(D.area) + '㎡ 시공 기준)';
  anim((e) => { const a = from.a + (to.a - from.a) * e, o = from.o + (to.o - from.o) * e; dSh = { a, o }; g('ac').textContent = fm(a) + '원'; g('oc').textContent = fm(o) + '원'; g('dd').textContent = (a - o >= 0 ? '-' : '+') + fm(Math.abs(a - o)) + '원'; g('dpc').textContent = '(' + (a > 0 ? Math.abs((a - o) / a * 100).toFixed(1) : '0.0') + '% 비용 ' + (a >= o ? '절감' : '증가') + ')'; }, 450);
}
function anim(fn, d) { const s = performance.now(); (function t(n) { const k = Math.min(1, (n - s) / d), e = 1 - Math.pow(1 - k, 3); fn(e); if (k < 1) requestAnimationFrame(t); })(s); }
function dashAfter() {
  document.querySelectorAll('[data-cn]').forEach((el) => { const v = +el.dataset.cn, f = el.dataset.cf; anim((e) => { el.textContent = (f === 'won' && v < 0 ? '-' : f === 'won' ? '' : '') + dFmt(f === 'won' ? Math.abs(v) * e : v * e, f); }, 1200); });
  const P = [...document.querySelectorAll('.d-poly')]; if (P.length) anim((e) => P.forEach((p) => p.setAttribute('points', dPts(p.dataset.v.split(',').map(Number), e))), 1400);
  const cr = document.getElementById('dcr'); if (cr) { cr.style.transition = 'none'; cr.style.width = '0px'; requestAnimationFrame(() => requestAnimationFrame(() => { cr.style.transition = 'width 2s ease'; cr.style.width = '340px'; })); }
  const B = document.querySelectorAll('.d-bars div'); if (B.length) setTimeout(() => B.forEach((d) => { d.style.height = d.dataset.h * 1.6 + 'px'; }), 150);
  if (document.getElementById('sa')) { dSh = { a: 0, o: 0 }; ['sa', 'sl', 'st'].forEach((id) => { document.getElementById(id).oninput = dCalc; }); dCalc(); }
}

function render() {
  const root = $('#root'); const T = [['prod', '제품'], ['dash', '대시보드'], ['cmp', '비교'], ['lcc', 'LCC'], ['rep', '보고서']];
  const sy = window.scrollY;
  root.innerHTML = '<div class="x-app"><div class="x-top"><b>제품 변경 제안 분석</b><small>데이터시트 기준 · 자동 비교</small><span class="x-th" title="화면 모드(전체 페이지 적용)">' + [['light', '☀ 주간'], ['dark', '☾ 야간'], ['auto', '자동']].map((m) => '<button data-a="th" data-v="' + m[0] + '" class="' + ((window.CCTHEME ? window.CCTHEME.get() : 'light') === m[0] ? 'on' : '') + '">' + m[1] + '</button>').join('') + '</span></div><div class="x-tabs">' + T.map((t) => '<button data-a="tab" data-v="' + t[0] + '" class="' + (S.tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>').join('') + '</div><div class="x-body" id="body">' +
    (S.tab === 'prod' ? tabProd() : S.tab === 'dash' ? tabDash() : S.tab === 'cmp' ? tabCmp() : S.tab === 'lcc' ? tabLcc() : tabRep()) + '</div><div class="x-busy" id="busy"></div><div class="x-toast" id="toast"></div>' +
    '<input type="file" id="fi" hidden accept=".pdf,.xlsx,.xls,.xlsm,.csv,.txt,.docx,.pptx,image/*"><input type="file" id="fc" hidden accept="image/*" capture="environment"><input type="file" id="ft" hidden accept=".pdf,.xlsx,.xls,.csv,.txt,.docx,.pptx,image/*"></div>';
  if (S.tab === 'dash') dashAfter(); if (S.tab === 'rep') { fill(); fit(); } window.scrollTo(0, S.keepY ? sy : 0); S.keepY = false;
}
function busy(m) { const b = $('#busy'); if (b) { b.textContent = m || ''; b.classList.toggle('on', !!m); } }
async function attach(i, f, mode) {
  const img = (f.type || '').startsWith('image/'); busy(img ? '이미지 글자 인식 중… (처음엔 시간이 걸립니다)' : '데이터시트 분석 중…');
  try {
    const txt = await fileText(f);
    if (mode === 'trk') { const L = txt.split('\n').map((x) => x.replace(/\s+/g, ' ').trim()).filter((x) => x.length >= 4 && x.length <= 90 && !/^[\d.,\s|-]+$/.test(x)).slice(0, 80); S.ps[i].tracks = [...new Set([...lst(S.ps[i].tracks), ...L])].join('\n'); toast('실적 ' + L.length + '건을 불러왔습니다'); }
    else { const o = extract(txt, f.name); const keys = Object.keys(o); const p = S.ps[i]; Object.assign(p, o); p.ext = keys; p.rawLen = txt.replace(/\s/g, '').length; p.file = { name: f.name, url: img ? URL.createObjectURL(f) : '' }; toast(keys.length ? keys.length + '개 항목을 추출해 자동 비교했습니다' : '자동 추출된 값이 없습니다 · 추출값 확인에서 직접 입력하세요'); }
  } catch (e) { toast(e.message === 'unsupported' ? '지원하지 않는 형식입니다' : '분석하지 못했습니다 · 네트워크를 확인하거나 직접 입력하세요'); }
  busy(''); save(); S.keepY = true; render();
}
function pickDb(i) {
  const B = window.parent.CMPB; const m = document.createElement('div'); m.className = 'x-modal';
  m.innerHTML = '<div class="x-mb"><div class="x-h">제품 DB에서 선택</div><input id="dq" placeholder="제품명 검색"><div id="dl" class="x-dl"></div><button class="x-bt" id="dx">닫기</button></div>'; document.body.appendChild(m);
  const list = (q) => { let r = []; try { r = B.db(q, 30); } catch (e) {} $('#dl').innerHTML = r.map((x, k) => '<button data-k="' + k + '"><b>' + esc(x.n) + '</b><small>SVR ' + fm(x.svr) + '% · ' + fm(x.dft) + '㎛ · ' + fm(x.packL, 1) + 'L</small></button>').join('') || '<p class="x-na">검색 결과가 없습니다</p>'; $('#dl').rows = r; };
  list(''); $('#dq').oninput = (e) => list(e.target.value); $('#dx').onclick = () => m.remove();
  $('#dl').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; const x = $('#dl').rows[+b.dataset.k], p = S.ps[i];
    Object.assign(p, { name: x.n, company: x.mf || '', usage: x.us || p.usage, svr: String(x.svr || ''), dft: String(x.dft || ''), pack: x.packL ? String(+x.packL.toFixed(2)) : p.pack, dry: x.dry || p.dry, pot: x.pot || p.pot, file: { name: '제품 DB', url: '' }, ext: [] }); m.remove(); save(); S.keepY = true; render(); toast('제품 DB 값을 불러왔습니다'); };
}
function rowsFor(M) {
  const cs = colsOf(M), A = [['항목', ...cs.map((i) => rl(i) + ' · ' + pn(i))]]; const add = (l, f) => A.push([l, ...cs.map((i) => f(M.C[i], i))]);
  add('고형분 SVR (%)', (c) => c.svr); add('도막 (㎛)', (c) => c.dft); add('이론 단위당 면적 (㎡/L)', (c) => +c.theoCov.toFixed(2)); add('이론 소요량 (L/㎡)', (c) => +c.theoUse.toFixed(3)); add('실제 소요량 (L/㎡)', (c) => +c.actUse.toFixed(3)); add('실제 단위당 면적 (㎡/L)', (c) => +c.actCov.toFixed(2));
  add('캔 용량 (L)', (c) => c.pack); add('캔당 면적 이론 (㎡)', (c) => +c.canAreaTheo.toFixed(1)); add('캔당 면적 실제 (㎡)', (c) => +c.canArea.toFixed(1)); add('단위 단가 (원/L)', (c) => Math.round(c.priceL)); add('캔당 단가 (원)', (c) => c.priceCan); add('㎡당 자재비 (원)', (c) => Math.round(c.costM2));
  add('총 소요량 (L)', (c) => +c.vol.toFixed(1)); add('필요 캔 수', (c) => c.cans); add('총 자재비 (원)', (c) => Math.round(c.mat)); add('보수주기 (년)', (c) => c.life); add('도장 횟수', (c) => c.n); add('LCC (원)', (c) => Math.round(c.lcc)); add('연평균 비용 (원)', (c) => Math.round(c.annual));
  [['제품 특징', 'desc'], ['용도', 'usage'], ['기능', 'func'], ['성분', 'comp'], ['성능', 'perf'], ['건조시간', 'dry'], ['가사시간', 'pot'], ['인증서', 'certs']].forEach((r) => A.push([r[0], ...cs.map((i) => S.ps[i][r[1]] || '')]));
  return A;
}
async function doXls() {
  const M = calcAll(S); if (!ready(M)) return toast('데이터시트를 먼저 첨부하세요'); const A = rowsFor(M);
  try { const X = await lib('xlsx'); const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(A), '비교표'); const T = [['제품', '시공 실적']]; S.ps.forEach((p, i) => lst(p.tracks).forEach((t) => T.push([rl(i) + ' ' + pn(i), t]))); X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(T), '실적'); X.writeFile(wb, '제품비교.xlsx'); toast('엑셀 파일을 저장했습니다'); }
  catch (e) { const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; const b = new Blob(['\ufeff' + A.map((r) => r.map(q).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = '제품비교.csv'; document.body.appendChild(a); a.click(); a.remove(); toast('CSV로 저장했습니다'); }
}
function doPrint() { document.body.classList.add('pr'); const done = () => { document.body.classList.remove('pr'); window.removeEventListener('afterprint', done); fit(); }; window.addEventListener('afterprint', done); try { window.print(); } catch (e) { done(); toast('인쇄를 열 수 없습니다 · PDF 저장을 사용하세요'); } setTimeout(() => { if (document.body.classList.contains('pr')) done(); }, 4000); }
async function doPdf() {
  const pages = [...document.querySelectorAll('#pgs .x-pg')]; if (!pages.length) return toast('보고서가 없습니다'); busy('PDF 생성 중…');
  try {
    const h2c = await lib('h2c'), J = await lib('jspdf'); const s = $('#pgs'); s.style.transform = 'none'; const pdf = new J.jsPDF('p', 'mm', 'a4'); let first = true;
    for (const p of pages) { const cv = await h2c(p, { scale: 2, backgroundColor: '#ffffff', useCORS: true }); const h = (cv.height * 210) / cv.width, img = cv.toDataURL('image/jpeg', 0.92); for (let y = 0; y < h - 3; y += 297) { if (!first) pdf.addPage(); first = false; pdf.addImage(img, 'JPEG', 0, -y, 210, h); } }
    pdf.save((S.doc === 'trk' ? '실적자료' : '제품변경_분석보고서') + '.pdf'); fit(); toast('PDF를 저장했습니다');
  } catch (e) { fit(); toast('PDF를 만들지 못했습니다 · 네트워크를 확인하거나 A4 인쇄를 사용하세요'); }
  busy('');
}
function live() { if (S.tab === 'lcc') { const o = $('#out'); if (o) o.innerHTML = lccOut(calcAll(S)); } if (S.tab === 'prod') { const X = calcAll(S).X; S.ps.forEach((p, i) => { const e = document.querySelector('[data-st="' + i + '"]'), c = calcOne(p, X); if (e) e.innerHTML = c ? '㎡당 자재비 <b>' + fm(c.costM2) + '원</b> · 실제 ' + fm(c.actCov, 2) + '㎡/L' : '<span class="x-na">SVR이 인식되면 결과가 표시됩니다</span>'; }); } }
function init() {
  load(); render();
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, i = +b.dataset.i;
    if (a === 'tab') { S.tab = b.dataset.v; render(); }
    else if (a === 'dt') { D.t = b.dataset.v; render(); }
    else if (a === 'th') { try { window.CCTHEME.set(b.dataset.v); } catch (x) {} S.keepY = true; render(); }
    else if (a === 'demo') { D.demo = b.dataset.v !== 'off'; D.area = null; render(); }
    else if (a === 'rs') { D.area = null; render(); }
    else if (a === 'attach') { S.tgt = i; $('#fi').click(); } else if (a === 'cam') { S.tgt = i; $('#fc').click(); } else if (a === 'trk') { S.tgt = i; $('#ft').click(); }
    else if (a === 'db') pickDb(i);
    else if (a === 'open') { S.open = S.open === i ? -1 : i; S.keepY = true; render(); }
    else if (a === 'ours') { S.ours = i; save(); S.keepY = true; render(); }
    else if (a === 'add') { S.ps.push(blank()); save(); S.keepY = true; render(); }
    else if (a === 'del') { S.ps.splice(i, 1); if (S.ours >= S.ps.length || S.ours === i) S.ours = 1; else if (S.ours > i) S.ours--; S.open = -1; save(); S.keepY = true; render(); }
    else if (a === 'clear') { const id = S.ps[i].id; S.ps[i] = { ...blank(), id }; save(); S.keepY = true; render(); }
    else if (a === 'doc') { S.doc = b.dataset.v; render(); }
    else if (a === 'print') doPrint(); else if (a === 'pdf') doPdf(); else if (a === 'xls') doXls();
    else if (a === 'apply') { try { const B = window.parent.CMPB, M = calcAll(S), c = M.C[S.ours]; const r = B.apply(+$('#lyr').value, S.ps[S.ours].name, c ? c.priceL : 0); toast(r.ok ? '도장 시스템에 적용했습니다' : r.msg); } catch (x) { toast('적용하지 못했습니다'); } }
  });
  document.addEventListener('input', (e) => {
    const t = e.target; if (t.dataset.f) { const p = S.ps[+t.dataset.i]; p[t.dataset.f] = t.value; p.ext = (p.ext || []).filter((x) => x !== t.dataset.f); } else if (t.dataset.g) S[t.dataset.g] = t.value; else if (t.dataset.m) S.meta[t.dataset.m] = t.value; else return;
    save(); live();
  });
  document.addEventListener('change', (e) => {
    const t = e.target; if (t.dataset.m && S.tab === 'rep') { const y = window.scrollY; render(); window.scrollTo(0, y); return; }
    if (t.id === 'fi' || t.id === 'fc' || t.id === 'ft') { const f = t.files && t.files[0]; t.value = ''; if (f) attach(S.tgt, f, t.id === 'ft' ? 'trk' : ''); }
  });
  window.addEventListener('resize', fit);
  window.CMPAPP = { refresh() { if (!document.querySelector('.x-modal')) { S.keepY = true; render(); } } };
}
if (typeof document !== 'undefined' && document.getElementById('root')) init();
})();
