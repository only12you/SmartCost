/* CoatCost 화면 모드(주간·야간·자동) — 전체 페이지 공통. index.html 과 compare.html 이 같이 사용 */
(function () {
  'use strict';
  var K = 'cc_theme', mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : { matches: false };
  var emb = false; try { emb = window.parent !== window && !!window.parent.document; } catch (e) {}
  var MEDIA = 'img,video,canvas,picture,svg image{filter:invert(1) hue-rotate(180deg)!important}@media print{img,video,canvas{filter:none!important}}';
  var TOP = 'html[data-cc="dark"]{filter:invert(.9) hue-rotate(180deg);background:#fff}@media print{html[data-cc="dark"]{filter:none!important;background:#fff}}';
  function get() { try { var v = localStorage.getItem(K); return v === 'dark' || v === 'auto' ? v : 'light'; } catch (e) { return 'light'; } }
  function dark(m) { return m === 'dark' || (m === 'auto' && mq.matches); }
  function css(doc, id, txt, on) {
    try {
      var s = doc.getElementById(id);
      if (on) { if (!s) { s = doc.createElement('style'); s.id = id; s.textContent = txt; (doc.head || doc.documentElement).appendChild(s); } }
      else if (s) s.remove();
    } catch (e) {}
  }
  function frames() {
    var f = document.querySelectorAll('iframe');
    for (var i = 0; i < f.length; i++) { try { if (f[i].contentDocument) css(f[i].contentDocument, 'cc-dm', MEDIA, dark(get())); } catch (e) {} }
  }
  function apply() {
    var d = dark(get()), r = document.documentElement;
    if (!emb) {
      css(document, 'cc-top', TOP, true); css(document, 'cc-dm', MEDIA, d);
      if (d) r.setAttribute('data-cc', 'dark'); else r.removeAttribute('data-cc');
      try { var mt = document.querySelector('meta[name=theme-color]'); if (mt) mt.setAttribute('content', d ? '#0b1220' : '#52a5ea'); } catch (e) {}
      frames();
    } else { css(document, 'cc-dm', MEDIA, d); }
    try { document.dispatchEvent(new CustomEvent('cctheme', { detail: { mode: get(), dark: d } })); } catch (e) {}
  }
  function set(m) {
    try { localStorage.setItem(K, m); } catch (e) {}
    apply(); if (emb) { try { window.parent.CCTHEME.apply(); } catch (e) {} }
  }
  window.CCTHEME = { get: get, set: set, apply: apply, dark: function () { return dark(get()); } };
  apply();
  if (mq.addEventListener) mq.addEventListener('change', apply);
  window.addEventListener('storage', function (e) { if (e.key === K) apply(); });
  if (!emb) { document.addEventListener('DOMContentLoaded', apply); setInterval(frames, 1500); }
  /* 앱 본체 '더보기'에서 여는 설정 시트 */
  window.themeOpen = function () {
    if (typeof pqSheet !== 'function') return;
    var m = get(), B = function (v, t, d) { return '<button class="pqml" onclick="CCTHEME.set(\'' + v + '\');pqX(\'pqth\');themeOpen()"><span class="pqt"><b>' + (m === v ? '● ' : '○ ') + t + '</b><small>' + d + '</small></span></button>'; };
    pqSheet('pqth', '<div class="pqmh"><b>화면 모드</b></div><div class="pqmg">' + B('light', '주간 모드', '밝은 화면') + B('dark', '야간 모드', '어두운 화면 · 눈부심 감소') + B('auto', '자동', '기기의 다크 모드 설정을 따름') + '</div><button class="pqbc" onclick="pqX(\'pqth\')">닫기</button>');
  };
})();
