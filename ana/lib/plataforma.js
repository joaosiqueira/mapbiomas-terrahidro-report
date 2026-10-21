/* Mini plataforma TerraHidro: a rede de drenagem LiDAR de cada bacia (piloto HydroBASINS nível 9) ou sistema (ANA nível 7)
 * no PlatformShell do design system MapBiomas, com a hidrografia de referência, o relevo e o caminho até o exutório.
 * Um só componente para os dois relatórios (embutido na seção Mini plataforma) e para a página independente
 * (relatorio/plataforma/template.html -> /plataforma/ no GitHub Pages). Depende de React e do bundle do DS já carregados.
 *
 *   h(TerraHidroPlataforma.Mapa, { base: 'ana', dados: 'data/', unidades: B, d8: D8, suf: '', th: 5000, temRef: true,
 *     ee: function (pf) { return asset ou null; }, T: T, nf: nf, linkPagina: function (base, pf) { return url; } })
 *
 * Os textos para o leitor passam por T() (inglês de relatorio/ana/en.json no relatório ANA e na página).
 */
(function () {
  var NS = window.MapBiomasDesignSystem_0911f7, h = React.createElement;

  // viridis por ordem de Strahler (1 a 9) e espessura crescente
  var VIR = { 1: ['#440154', 0.5], 2: ['#472d7b', 0.7], 3: ['#3b528b', 0.9], 4: ['#2c728e', 1.1], 5: ['#21918c', 1.5],
              6: ['#28ae80', 2.0], 7: ['#5ec962', 2.6], 8: ['#addc30', 3.2], 9: ['#fde725', 3.8] };
  var ORDENS_MAPA = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  var cssv = function (n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); };
  var cache = {};
  function decode(arr) { var out = [], x = arr[0], y = arr[1]; out.push(x, y); for (var i = 2; i < arr.length; i += 2) { x += arr[i]; y += arr[i + 1]; out.push(x, y); } return out; }
  function indexar(j) {
    j.idx = {}; j.attrs.seg_id.forEach(function (s, i) { j.idx[s] = i; });
    j.porOrdem = {}; j.attrs.strahler.forEach(function (s, i) { (j.porOrdem[s] = j.porOrdem[s] || []).push(i); });
    return j;
  }
  // ordens 1 a 3 entram DEPOIS das demais: os índices já usados (seleção) não mudam
  function fundir(j, b) {
    var n0 = j.L.length, nb = b.linhas.length, out = Object.assign({}, j);
    out.L = j.L.concat(b.linhas.map(decode));
    out.attrs = {};
    Object.keys(j.attrs).forEach(function (k) { var extra = b.attrs[k] || new Array(nb).fill(null); out.attrs[k] = j.attrs[k].concat(extra); });
    out.tipo = j.tipo.concat(new Array(nb).fill(null));
    out.n_mapa = n0 + nb; out.completa = true;
    return indexar(out);
  }

  // estilos da plataforma (os mesmos nos relatórios e na página); as cores do mapa vêm dos tokens --rel-map-* da página
  var CSS = [
    ':root { --rel-map-bg: #f3f4f2; --rel-map-ink: #262728; --rel-map-buffer: #959698; --rel-alert: #d4271e; --rel-off: #b4b5b6; }',
    '.rel-ico, .rel-ico * { pointer-events: none; }',
    '.shellbox { height: 720px; min-width: 0; background: var(--color-neutral-100); position: relative; }',
    '.shellbox.is-expanded { position: fixed; inset: 0; height: auto; z-index: 800; padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }',
    '.shellbox.is-page { position: fixed; inset: 0; height: auto; padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }',
    '@media (max-width: 820px) { .shellbox { height: 640px; } }',
    '.mapfill { position: absolute; inset: 0; background: var(--rel-map-bg); overflow: hidden; }',
    '.map-canvas { display: block; cursor: grab; touch-action: none; }',
    '.map-canvas:active { cursor: grabbing; }',
    '.map-tip { position: absolute; pointer-events: none; background: var(--color-neutral-900); color: var(--color-neutral-100); border-radius: var(--border-radius-medium); padding: 6px 10px; font: var(--body-note); display: grid; gap: 2px; max-width: 260px; z-index: 5; }',
    '.map-tip span { opacity: .8; font-variant-numeric: tabular-nums; }',
    '.map-loading { position: absolute; top: 16px; left: 50%; transform: translateX(-50%); padding: 6px 14px; background: var(--color-neutral-100); border: 1px solid var(--color-neutral-300); border-radius: var(--border-radius-rounded); box-shadow: var(--shadow-small); font: var(--body-note-strong); color: var(--color-neutral-800); }',
    '.rpanel { padding: 16px; display: grid; gap: 12px; align-content: start; overflow: auto; height: 100%; box-sizing: border-box; background: var(--color-neutral-200); }',
    '.rpanel .muted { font: var(--body-small); color: var(--color-neutral-600); margin: 0; }',
    '.kvgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; margin: 0; }',
    '.kvgrid .drow { display: grid; grid-template-columns: 1fr; gap: 2px; min-width: 0; }',
    '.drow dt { font: var(--body-note-strong); text-transform: uppercase; letter-spacing: .72px; color: var(--color-neutral-600); }',
    '.drow dd { margin: 0; font: var(--body-small); color: var(--color-neutral-1000); font-variant-numeric: tabular-nums; min-width: 0; overflow-wrap: anywhere; }',
    // link para a página própria com o mesmo visual do IconButton muted do DS
    '.th-plat-link { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: var(--border-radius-rounded); color: var(--color-neutral-600); transition: background-color var(--transition-default); }',
    '.th-plat-link:hover { background: var(--color-neutral-200); color: var(--color-neutral-900); }',
    '.th-plat-link:focus-visible { outline: 2px solid var(--color-action-bg); outline-offset: 1px; }'
  ].join('\n');
  if (!document.getElementById('th-plataforma-css')) {
    var st = document.createElement('style'); st.id = 'th-plataforma-css'; st.textContent = CSS;
    document.head.insertBefore(st, document.head.firstChild);   // antes dos estilos da página: o tema escuro da página vence
  }

  // o que muda entre as duas bases: camadas da legenda, rótulos, sistema inicial e campos extras do cartão
  function defs(base, T) {
    var ana = base === 'ana';
    var camadas = [
      { key: 'rede', nome: T('Rede de drenagem LiDAR'), tipo: 'vetor', geometria: 'line', secao: 'lidar', levels: 1, showLevelFilter: false,
        legendaAtiva: 'ordem', selecaoInicial: [3, 4, 5, 6, 7, 8, 9],   // abre na ordem 3+ (remendo do LegendPanel em build.py)
        legendas: [
          { key: 'ordem', nome: T('Ordem de Strahler'), tree: ORDENS_MAPA.map(function (s) { return { codigo: s, nome: T('Ordem ') + s, cor: VIR[s][0] }; }) },
          { key: 'anomalia', nome: T('Cotas negativas'), tree: [{ codigo: 101, nome: T('Cota final negativa (z_fim < 0)'), cor: '#d4271e' }, { codigo: 100, nome: T('Demais trechos'), cor: '#b4b5b6' }] }
        ] },
      ana ? { key: 'bacia', nome: T('Sistema e recorte'), tipo: 'vetor', geometria: 'polygon', secao: 'lidar', levels: 1, showLevelFilter: false, showLegendChips: false,
              tree: [{ codigo: 1, nome: T('Sistema ANA (ottobacia + montante)'), cor: '#262728', translucido: true, opacidade: 0 },
                     { codigo: 2, nome: T('Recorte (sistema + 1 km)'), cor: '#959698', translucido: true, opacidade: 0 }] }
          : { key: 'bacia', nome: T('Bacia e recorte'), tipo: 'vetor', geometria: 'polygon', secao: 'lidar', levels: 1, showLevelFilter: false, showLegendChips: false,
              tree: [{ codigo: 1, nome: T('Bacia HydroBASINS nível 9'), cor: '#262728', translucido: true, opacidade: 0 },
                     { codigo: 2, nome: T('Recorte (bacia + 1 km)'), cor: '#959698', translucido: true, opacidade: 0 }] },
      ana ? null : { key: 'd8', nome: T('Bacia redelimitada pelo D8'), tipo: 'vetor', geometria: 'polygon', secao: 'lidar', visivel: false, levels: 1, showLevelFilter: false, showLegendChips: false,
              tree: [{ codigo: 1, nome: T('Tudo o que drena para o exutório da maior rede'), cor: '#436b86', translucido: true, opacidade: 0.3 }] },
      { key: 'ana', nome: T('Ottobacias da ANA (BHO 6)'), tipo: 'vetor', geometria: 'polygon', secao: 'ref', visivel: false, levels: 1, showLevelFilter: false, showLegendChips: false,
        tree: [{ codigo: 1, nome: ana ? T('Nível 7 (região dos sistemas)') : T('Nível 7 (região do piloto)'), cor: '#ca6528', translucido: true, opacidade: 0 }] },
      { key: 'fbds', nome: T('FBDS 1:25.000'), tipo: 'vetor', geometria: 'line', secao: 'ref', visivel: false, levels: 1, showLevelFilter: false, showLegendChips: false,
        tree: [{ codigo: 1, nome: ana ? T('Rios simples (região dos sistemas)') : T('Rios simples (região do piloto)'), cor: '#734c1b' }] },
      { key: 'ibge', nome: T('IBGE BC250'), tipo: 'vetor', geometria: 'line', secao: 'ref', visivel: false, levels: 1, showLevelFilter: false, showLegendChips: false,
        tree: [{ codigo: 1, nome: ana ? T('Trechos de drenagem (região dos sistemas)') : T('Trechos de drenagem (região do piloto)'), cor: '#04381d' }] },
      { key: 'relevo', nome: T('Relevo sombreado do MDT'), tipo: 'raster', secao: 'base',
        ramp: { colors: ['#3d3e3f', '#f1f2f2'], label: T('Relevo sombreado (5 m, luz de noroeste, exagero vertical 6×)'), ticks: [T('sombra'), T('luz')] } }
    ].filter(Boolean);
    return {
      camadas: camadas,
      secoes: [{ key: 'lidar', nome: T('Piloto LiDAR'), cor: 'var(--color-primary-700)', forte: true }, { key: 'ref', nome: T('Hidrografia de referência') }, { key: 'base', nome: T('Base') }],
      un: ana ? T('Sistema ') : T('Bacia '),
      grupo: ana ? T('Sistemas ANA nível 7') : T('Bacias do piloto'),
      recolher: ana ? T('Recolher a coluna de sistemas') : T('Recolher a coluna de bacias'),
      erro: ana ? T('Não foi possível carregar a rede deste sistema. Recarregue a página.') : T('Não foi possível carregar a rede desta bacia. Recarregue a página.'),
      aria: ana ? T('Rede de drenagem do sistema ') : T('Rede de drenagem da bacia '),
      dica: ana ? T('Arraste e use a roda para navegar; clique numa linha para ver o trecho e o caminho até o exutório. Geometria simplificada a 2,5 m — a rede completa está no .zip do sistema.')
        : T('Arraste e use a roda para navegar; clique numa linha para ver o trecho e o caminho até o exutório. Geometria simplificada a 2,5 m — a rede completa está no .zip da bacia.'),
      baixa: ana ? T('Ordens 1 a 3 trazem no mapa só os atributos essenciais; a tabela completa está no .zip do sistema.')
        : T('Ordens 1 a 3 trazem no mapa só os atributos essenciais; a tabela completa está no .zip da bacia.'),
      eeFalta: ana ? '—' : T('após o reprocessamento r2'),
      extras: ana,                 // ottobacias e máquina no cartão do sistema
      // sistema do teste de corte na ANA; no piloto, a penúltima bacia processada
      inicial: function (done) { return ana ? (done.filter(function (b) { return b.pfaf === 4633427; })[0] || done[0]).pfaf : done[done.length - 2].pfaf; }
    };
  }

  // salvar o PNG: pela capacidade downloads no artefato do claude.ai, por link de download fora dele (GitHub Pages)
  function salvar(dl, nome, blob) {
    if (dl) return dl.save({ filename: nome, data: blob });
    var a = document.createElement('a'), u = URL.createObjectURL(blob);
    a.href = u; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
    return Promise.resolve();
  }

  function Mapa(p) {
    var T = p.T || function (s) { return s; };
    var nf = p.nf || function (v, d) { return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }).format(v); };
    var DF = defs(p.base, T), B = p.unidades, D8 = p.d8 || [], SUF = p.suf || '', TH = p.th || 5000, DADOS = p.dados || 'data/';
    var done = B.filter(function (b) { return b.exec; });
    var Shell = NS.PlatformShell;
    var st = React.useState(p.pf && done.some(function (b) { return b.pfaf === p.pf; }) ? p.pf : DF.inicial(done)), pf = st[0], setPf = st[1];
    var md = React.useState('ordem'), modo = md[0], setModo = md[1];
    var ds = React.useState(null), dado = ds[0], setDado = ds[1];
    var ss = React.useState(null), sel = ss[0], setSel = ss[1];
    var es = React.useState(null), erro = es[0], setErro = es[1];
    var cs_ = React.useState({ rede: null, bacia: null }), codigos = cs_[0], setCodigos = cs_[1];
    var vs_ = React.useState({ rede: true, bacia: true, d8: false, ana: false, fbds: false, ibge: false, relevo: true }), visiveis = vs_[0], setVisiveis = vs_[1];
    var xs_ = React.useState(false), expandido = xs_[0], setExpandido = xs_[1];
    var cheio = expandido || !!p.pagina;
    var qs_ = React.useState(''), busca = qs_[0], setBusca = qs_[1];
    var hv_ = React.useState(null), hover = hv_[0], setHover = hv_[1];
    var cd_ = React.useState(''), coords = cd_[0], setCoords = cd_[1];
    var cv = React.useRef(null), geo = React.useRef(null), caixa = React.useRef(null), shellRef = React.useRef(null), dprForcado = React.useRef(null), scrollY = React.useRef(0);
    var vista = React.useRef({ s: 1, tx: 0, ty: 0 }), raf = React.useRef(0), arrasto = React.useRef(null), hoverRaf = React.useRef(0);
    var ek = React.useState(0), escK = ek[0], setEscK = ek[1];
    var rds = React.useState(null), refDado = rds[0], setRefDado = rds[1];
    // FBDS e IBGE da região inteira (relatorio/prep_ref_regiao.py), carregados uma vez; sem eles, os do recorte da bacia
    var rrs = React.useState(null), refRegiao = rrs[0], setRefRegiao = rrs[1];
    var ans = React.useState(null), anaRegiao = ans[0], setAnaRegiao = ans[1];
    React.useEffect(function () {
      fetch(DADOS + 'ana_n7_regiao.json').then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (j) { j.A = j.aneis.map(decode); setAnaRegiao(j); }).catch(function () {}); }, []);
    React.useEffect(function () {
      fetch(DADOS + 'ref_regiao.json').then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (j) { j.F = j.fbds.map(decode); j.I = j.ibge.map(decode); setRefRegiao(j); }).catch(function () {}); }, []);
    var ris = React.useState(null), relevoImg = ris[0], setRelevoImg = ris[1];
    React.useEffect(function () { if (p.onPf) p.onPf(pf); }, [pf]);

    React.useEffect(function () { setRefDado(null); if (!p.temRef) return;
      fetch(DADOS + 'ref_' + pf + '.json').then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (j) { j.F = j.fbds.map(decode); j.I = j.ibge.map(decode); setRefDado(j); }).catch(function () {}); }, [pf]);
    React.useEffect(function () { var vivo = true; setRelevoImg(null);
      var im = new Image(); im.onload = function () { if (vivo) setRelevoImg(im); }; im.onerror = function () { if (vivo) setRelevoImg(false); };
      im.src = DADOS + 'relevo_' + pf + '.webp'; return function () { vivo = false; }; }, [pf]);
    React.useEffect(function () {
      var vivo = true, ck = DADOS + pf + SUF;
      setSel(null); setErro(null); setHover(null); vista.current = { s: 1, tx: 0, ty: 0 };
      if (cache[ck]) { setDado(cache[ck]); if (cache[ck].completa) return; }
      else setDado(null);
      var base = cache[ck] ? Promise.resolve(cache[ck]) :
        fetch(DADOS + 'rede_' + pf + SUF + '.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
          .then(function (j) { j.L = j.linhas.map(decode); j.B = j.bacia.map(decode); j.F = j.buffer.map(decode); delete j.linhas;
            indexar(j); cache[ck] = j; if (vivo) setDado(j); return j; });
      base.then(function (j) {
        return fetch(DADOS + 'rede_baixa_' + pf + SUF + '.json').then(function (r) { if (!r.ok) throw 0; return r.json(); })
          .then(function (b) { var f = fundir(j, b); cache[ck] = f; if (vivo) setDado(f); }).catch(function () {});
      }).catch(function () { if (vivo) setErro(DF.erro); });
      return function () { vivo = false; };
    }, [pf]);

    // tela cheia, como no Catálogo: Esc ou o mesmo botão voltam ao relatório na mesma rolagem
    function alternarTela() {
      if (!expandido) { scrollY.current = window.scrollY; setExpandido(true); var el = shellRef.current; if (el && el.requestFullscreen) el.requestFullscreen().catch(function () {}); }
      else { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {}); setExpandido(false); }
    }
    React.useEffect(function () {
      if (!expandido) return;
      var esc = function (e) { if (e.key === 'Escape') setExpandido(false); };
      var fs = function () { if (!document.fullscreenElement) setExpandido(false); };
      document.addEventListener('keydown', esc); document.addEventListener('fullscreenchange', fs); document.body.style.overflow = 'hidden';
      return function () { document.removeEventListener('keydown', esc); document.removeEventListener('fullscreenchange', fs); document.body.style.overflow = ''; window.scrollTo(0, scrollY.current); };
    }, [expandido]);

    var ocultaOrdem = function (s) { return modo === 'ordem' && codigos.rede && codigos.rede.indexOf(s) < 0; };
    function caminho(j, i) { var path = [], n = 0; while (i != null && i >= 0 && n < 5000) { path.push(i); var dn = j.attrs.dn_id[i]; i = dn ? j.idx[dn] : null; n++; } return path; }

    function draw() {
      var c = cv.current, j = dado; if (!c || !j || !caixa.current) return;
      var w = caixa.current.clientWidth, hgt = caixa.current.clientHeight; if (!w || !hgt) return;
      var dpr = dprForcado.current || window.devicePixelRatio || 1;
      c.style.width = w + 'px'; c.style.height = hgt + 'px'; c.width = Math.round(w * dpr); c.height = Math.round(hgt * dpr);
      var g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      var r = paint(g, w, hgt, w < 480 ? 16 : 32);
      geo.current = { k: r.k, ox: r.ox, oy: r.oy, hgt: hgt, w: w };
      var ke = r.k * vista.current.s;
      if (Math.abs(ke - escK) > 1e-9) setEscK(ke);
    }
    function agendar() { if (raf.current) return; raf.current = requestAnimationFrame(function () { raf.current = 0; draw(); }); }

    function paint(g, w, hgt, pad) {
      var j = dado, V = vista.current;
      var k = Math.min((w - 2 * pad) / j.extent[0], (hgt - 2 * pad) / j.extent[1]), ox = (w - j.extent[0] * k) / 2, oy = (hgt - j.extent[1] * k) / 2;
      g.fillStyle = cssv('--rel-map-bg'); g.fillRect(0, 0, w, hgt);
      var P = function (x, y) { return [(ox + x * k) * V.s + V.tx, (hgt - oy - y * k) * V.s + V.ty]; };
      var zf = Math.max(0.5, Math.min(1 + Math.log2(V.s) * 0.35, 3));
      if (visiveis.relevo && relevoImg) {
        var c0 = P(0, j.extent[1]), c1 = P(j.extent[0], 0);
        g.globalAlpha = 0.55; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
        g.drawImage(relevoImg, c0[0], c0[1], c1[0] - c0[0], c1[1] - c0[1]); g.globalAlpha = 1;
      }
      function ring(arr, stroke, lw, dash) { g.beginPath(); for (var i = 0; i < arr.length; i += 2) { var p = P(arr[i], arr[i + 1]); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }
        g.closePath(); g.setLineDash(dash || []); g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); g.setLineDash([]); }
      function traco(ids, cor, lw) { if (!ids.length) return; g.beginPath();
        ids.forEach(function (i) { var L = j.L[i]; for (var q = 0; q < L.length; q += 2) { var p = P(L[q], L[q + 1]); q ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } });
        g.strokeStyle = cor; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); }
      var bc = codigos.bacia;
      if (visiveis.bacia && (!bc || bc.indexOf(2) >= 0)) j.F.forEach(function (r) { ring(r, cssv('--rel-map-buffer'), 1.2, [5, 4]); });
      var A = j.attrs, path = sel != null ? caminho(j, sel) : null;
      if (visiveis.rede) {
        g.globalAlpha = path ? 0.28 : 1;
        var rc = codigos.rede, verNeg = !rc || rc.indexOf(101) >= 0, verRest = !rc || rc.indexOf(100) >= 0;
        ORDENS_MAPA.forEach(function (s) {
          var ids = j.porOrdem[s] || []; if (!ids.length || ocultaOrdem(s)) return;
          if (modo === 'ordem') traco(ids, VIR[s][0], VIR[s][1] * zf);
          else if (verRest) traco(ids.filter(function (i) { return !(A.z_fim[i] < 0); }), cssv('--rel-off'), VIR[s][1] * zf);
        });
        if (modo === 'anomalia' && verNeg) ORDENS_MAPA.forEach(function (s) {
          traco((j.porOrdem[s] || []).filter(function (i) { return A.z_fim[i] < 0; }), cssv('--rel-alert'), Math.max(VIR[s][1], 1.8) * zf); });
        g.globalAlpha = 1;
      }
      if (path) {
        var pts = [], L0x = 0, L0y = 0;
        path.forEach(function (i, n) { var L = j.L[i], q0 = 0;
          if (n > 0) { var best = 1e18; for (var q = 0; q < L.length; q += 2) { var dx = L[q] - L0x, dy = L[q + 1] - L0y, d = dx * dx + dy * dy; if (d < best) { best = d; q0 = q; } } }
          for (var q2 = q0; q2 < L.length; q2 += 2) pts.push(P(L[q2], L[q2 + 1]));
          L0x = L[L.length - 2]; L0y = L[L.length - 1]; });
        var linha = function (cor, lw) { g.beginPath(); pts.forEach(function (p, n) { n ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); });
          g.strokeStyle = cor; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); };
        linha('#ffffff', 8); linha('#262728', 4);
        var Ls = j.L[sel], mid = Math.floor(Ls.length / 4) * 2, ps = P(Ls[mid], Ls[mid + 1]);
        var Le = j.L[path[path.length - 1]], pe = P(Le[Le.length - 2], Le[Le.length - 1]);
        var anel = function (p, r, fill) { g.beginPath(); g.arc(p[0], p[1], r, 0, 2 * Math.PI); g.fillStyle = fill; g.fill();
          g.lineWidth = 3; g.strokeStyle = '#262728'; g.stroke(); g.beginPath(); g.arc(p[0], p[1], r + 3, 0, 2 * Math.PI); g.lineWidth = 2; g.strokeStyle = '#ffffff'; g.stroke(); };
        anel(pe, 6, '#ffffff'); anel(ps, 9, '#43798a');
        g.font = '700 12px "Open Sans", sans-serif'; g.lineWidth = 4; g.strokeStyle = '#ffffff'; g.fillStyle = '#262728';
        var tx = function (t, p) { var x = Math.min(Math.max(p[0] + 14, 6), w - g.measureText(t).width - 6), y = Math.max(p[1] - 10, 16); g.strokeText(t, x, y); g.fillText(t, x, y); };
        tx(T('exutório'), pe); tx(T('trecho ') + A.seg_id[sel], ps);
      }
      // ottobacias nível 7 da ANA: contorno tracejado laranja, região inteira
      if (visiveis.ana && anaRegiao) { var adx = anaRegiao.origem[0] - j.origem[0], ady = anaRegiao.origem[1] - j.origem[1];
        g.beginPath(); anaRegiao.A.forEach(function (rg) { for (var q = 0; q < rg.length; q += 2) { var pp = P(rg[q] + adx, rg[q + 1] + ady); q ? g.lineTo(pp[0], pp[1]) : g.moveTo(pp[0], pp[1]); } g.closePath(); });
        g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.setLineDash([]); g.stroke(); g.strokeStyle = '#ca6528'; g.lineWidth = 2; g.setLineDash([7, 4]); g.stroke(); g.setLineDash([]); }
      var RF = refRegiao || refDado;
      if (RF) [['fbds', RF.F, '#734c1b', 1.6, null], ['ibge', RF.I, '#04381d', 2.4, [6, 3]]].forEach(function (rf) {
        if (!visiveis[rf[0]]) return;
        var dx = RF.origem[0] - j.origem[0], dy = RF.origem[1] - j.origem[1];
        g.strokeStyle = rf[2]; g.lineWidth = rf[3] * zf; g.setLineDash(rf[4] || []); g.beginPath();
        rf[1].forEach(function (L) { for (var q = 0; q < L.length; q += 2) { var pp = P(L[q] + dx, L[q + 1] + dy); q ? g.lineTo(pp[0], pp[1]) : g.moveTo(pp[0], pp[1]); } });
        g.stroke(); g.setLineDash([]);
      });
      // bacia redelimitada pelo D8 (relatorio/prep_d8.py), por cima da rede: anéis absolutos a partir de x0, y0, do threshold escolhido
      var bd8 = visiveis.d8 && D8.filter(function (b) { return b.pfaf_id === pf; })[0];
      if (bd8) { var ddx = bd8.x0 - j.origem[0], ddy = bd8.y0 - j.origem[1];
        g.beginPath(); bd8.d8.forEach(function (poly) { poly.forEach(function (rg) {
          for (var i = 0; i < rg.length; i += 2) { var p = P(rg[i] + ddx, rg[i + 1] + ddy); i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } g.closePath(); }); });
        g.fillStyle = 'rgba(112,178,224,0.22)'; g.fill('evenodd'); g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.setLineDash([]); g.stroke(); g.strokeStyle = '#436b86'; g.lineWidth = 2.6; g.setLineDash([]); g.stroke(); }
      if (visiveis.bacia && (!bc || bc.indexOf(1) >= 0)) j.B.forEach(function (r) { ring(r, cssv('--rel-map-ink'), 1.8); });
      return { k: k, ox: ox, oy: oy };
    }
    React.useEffect(draw);
    React.useEffect(function () { if (!caixa.current || !('ResizeObserver' in window)) return;
      var ro = new ResizeObserver(function () { agendar(); }); ro.observe(caixa.current); return function () { ro.disconnect(); }; });
    React.useEffect(function () { if (sel == null) return;
      var f = function (e) { if (e.key === 'Escape' && !expandido) setSel(null); }; window.addEventListener('keydown', f);
      return function () { window.removeEventListener('keydown', f); }; }, [sel, expandido]);

    // ---------- navegação: roda, arrasto, duplo clique, MapControls
    function zoom(f, mx, my) {
      var V = vista.current, G = geo.current; if (!G) return;
      if (mx == null) { mx = G.w / 2; my = G.hgt / 2; }
      // abaixo de 1 o mapa recua além do recorte da bacia, para ver a hidrografia de referência da região
      var s = Math.max(0.12, Math.min(400, V.s * f)); f = s / V.s;
      V.tx = mx - (mx - V.tx) * f; V.ty = my - (my - V.ty) * f; V.s = s;
      agendar();
    }
    function verTudo() { vista.current = { s: 1, tx: 0, ty: 0 }; agendar(); }
    React.useEffect(function () {
      var c = cv.current; if (!c) return;
      var f = function (e) { e.preventDefault(); var r = c.getBoundingClientRect(); zoom(Math.exp(-e.deltaY * 0.0025), e.clientX - r.left, e.clientY - r.top); };
      c.addEventListener('wheel', f, { passive: false }); return function () { c.removeEventListener('wheel', f); };
    });
    function paraDado(mx, my) { var G = geo.current, V = vista.current; var bx = (mx - V.tx) / V.s, by = (my - V.ty) / V.s;
      return [(bx - G.ox) / G.k, (G.hgt - G.oy - by) / G.k]; }
    function maisProximo(mx, my, tolPx) {
      var j = dado, G = geo.current, V = vista.current; if (!j || !G || !visiveis.rede) return -1;
      var xy = paraDado(mx, my), x = xy[0], y = xy[1], best = -1, bd = tolPx / (G.k * V.s);
      ORDENS_MAPA.forEach(function (s) { if (ocultaOrdem(s)) return; (j.porOrdem[s] || []).forEach(function (i) { var L = j.L[i];
        for (var q = 0; q + 3 < L.length; q += 2) {
          var ax = L[q], ay = L[q + 1], dx = L[q + 2] - ax, dy = L[q + 3] - ay, t = 0, l2 = dx * dx + dy * dy;
          if (l2) t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
          var px = ax + t * dx - x, py = ay + t * dy - y, d = Math.sqrt(px * px + py * py);
          if (d < bd) { bd = d; best = i; } } }); });
      return best;
    }
    function onDown(e) { if (e.button !== 0) return; var V = vista.current;
      arrasto.current = { x: e.clientX, y: e.clientY, tx: V.tx, ty: V.ty, moveu: false }; e.currentTarget.setPointerCapture(e.pointerId); }
    function onMove(e) {
      var r = cv.current.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, a = arrasto.current;
      if (geo.current && dado) { var xy = paraDado(mx, my); setCoords('E ' + nf(dado.origem[0] + xy[0]) + ' · N ' + nf(dado.origem[1] + xy[1]) + ' m · z ' + nf(vista.current.s, 1)); }
      if (a) { var dx = e.clientX - a.x, dy = e.clientY - a.y;
        if (!a.moveu && Math.abs(dx) + Math.abs(dy) < 4) return;
        a.moveu = true; setHover(null);
        vista.current.tx = a.tx + dx; vista.current.ty = a.ty + dy; agendar(); return; }
      if (hoverRaf.current) return;
      hoverRaf.current = requestAnimationFrame(function () { hoverRaf.current = 0;
        var i = maisProximo(mx, my, 8); setHover(i >= 0 ? { i: i, x: mx, y: my } : null); });
    }
    function onUp(e) { var a = arrasto.current; arrasto.current = null; if (!a || a.moveu) return;
      var r = cv.current.getBoundingClientRect(), i = maisProximo(e.clientX - r.left, e.clientY - r.top, 10); setSel(i >= 0 ? i : null); }
    function onDbl(e) { var r = cv.current.getBoundingClientRect(); zoom(2, e.clientX - r.left, e.clientY - r.top); }

    // busca de trecho pelo seg_id: seleciona e aproxima
    function buscar(ev) {
      var v = ev.target.value; setBusca(v);
      var id = parseInt(String(v).replace(/\D/g, ''), 10); if (!dado || !id || dado.idx[id] == null) return;
      var i = dado.idx[id], L = dado.L[i], G = geo.current; setSel(i); if (!G) return;
      var cx = L[Math.floor(L.length / 4) * 2], cy = L[Math.floor(L.length / 4) * 2 + 1];
      var s = 24, bx = G.ox + cx * G.k, by = G.hgt - G.oy - cy * G.k;
      vista.current = { s: s, tx: G.w / 2 - bx * s, ty: G.hgt / 2 - by * s }; agendar();
    }

    // exportar: no artefato do claude.ai só com a capacidade downloads; fora dele (GitHub Pages), download direto
    var dls = React.useState(null), dl = dls[0];
    var podeSalvar = !!dl || !(window.claude && window.claude.use);
    var exs = React.useState(''), exMsg = exs[0], setExMsg = exs[1];
    React.useEffect(function () { var vivo = true;
      if (window.claude && window.claude.use) window.claude.use('downloads').then(function (d) { if (vivo) dls[1](d); }).catch(function () {});
      return function () { vivo = false; }; }, []);
    React.useEffect(function () { if (!exMsg) return; var t = setTimeout(function () { setExMsg(''); }, 2400); return function () { clearTimeout(t); }; }, [exMsg]);
    var H2C = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    function carregarH2C() { return window.html2canvas ? Promise.resolve(window.html2canvas) : new Promise(function (ok, erro) {
      var sc = document.createElement('script'); sc.src = H2C; sc.onload = function () { ok(window.html2canvas); }; sc.onerror = erro; document.head.appendChild(sc); }); }
    // PNG fiel à tela: a plataforma inteira como está (mapa a 3x, legenda, controles e painéis)
    function exportar() {
      if (!dado || !podeSalvar || !shellRef.current) return;
      setExMsg(T('Gerando imagem…')); setHover(null);
      dprForcado.current = 3; draw();
      carregarH2C().then(function (h2c) { return h2c(shellRef.current, { scale: 3, backgroundColor: getComputedStyle(document.body).backgroundColor, logging: false }); })
        .then(function (cnv) { dprForcado.current = null; draw();
          cnv.toBlob(function (blob) {
            if (!blob) { setExMsg(T('Não foi possível gerar a imagem.')); return; }
            salvar(dl, 'rede_' + pf + '_' + modo + (sel != null ? '_trecho' + dado.attrs.seg_id[sel] : '') + '.png', blob)
              .then(function () { setExMsg(T('Imagem salva.')); })
              .catch(function (e) { setExMsg(e && e.code === 'declined' ? '' : (e && e.code === 'rate_limited' ? T('Já há um download aguardando confirmação.') : T('O download não está disponível aqui.'))); });
          }, 'image/png'); })
        .catch(function () { dprForcado.current = null; draw(); setExMsg(T('Não foi possível gerar a imagem.')); });
    }

    var bacia = B.filter(function (b) { return b.pfaf === pf; })[0];
    var escala = escK > 0 ? (function () { var m = [5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000].filter(function (v) { return v * escK <= 100; }).pop() || 5;
      return { label: m >= 1000 ? nf(m / 1000) + ' km' : nf(m) + ' m', barWidth: Math.round(m * escK) }; })() : null;
    var A = dado && dado.attrs, i = sel;
    var fmt = function (v, d, u) { return v == null ? '—' : nf(v, d) + (u ? ' ' + u : ''); };
    var kv = function (k, v) { return h('div', { key: k, className: 'drow' }, h('dt', null, k), h('dd', null, v)); };
    var baixa = i != null && dado && dado.tipo[i] == null;
    var legenda = React.useMemo(function () {
      return h(NS.LegendPanel, { key: cheio ? 'x' : 'i', title: T('Legenda'), camadas: DF.camadas, secoes: DF.secoes, width: 300, maxHeight: cheio ? 560 : 380, collapsed: !cheio,
        emphasis: 'divided', footerLabel: '',
        onChange: function (camada, cods) { setCodigos(function (o) { var c = Object.assign({}, o); c[camada] = cods; return c; }); },
        onVisibility: function (vis, camada) { setVisiveis(function (o) { var c = Object.assign({}, o); c[camada] = vis; return c; }); },
        onLegendaChange: function (leg, camada) { if (camada === 'rede') { setModo(leg); setCodigos(function (o) { return Object.assign({}, o, { rede: null }); }); } } });
    }, [cheio]);

    var asset = p.ee ? p.ee(pf) : null;
    var painel = h('div', { className: 'rpanel' },
      bacia ? h(NS.Card, { title: DF.un + bacia.rank + ' · ' + pf },
        h('dl', { className: 'kvgrid' },
          kv(T('Área'), nf(bacia.area_km2) + ' km²'), DF.extras ? kv(T('Ottobacias'), bacia.n_membros ? nf(bacia.n_membros) : '—') : null,
          kv(T('Trechos'), nf(bacia.rede.trechos)), kv(T('Canais'), nf(bacia.rede.km) + ' km'), kv(T('Strahler máx.'), String(bacia.rede.strahler_max)),
          kv(T('Redes'), nf(bacia.rede.redes)), kv(T('Maior rede'), nf(bacia.rede.maior_rede_km2, 1) + ' km² (' + bacia.rede.pct_maior + '%)'),
          kv(T('Divisor'), h(NS.StatusPill, { tone: bacia.rede.pct_maior >= 95 ? 'active' : bacia.rede.pct_maior >= 65 ? 'pending' : 'failed' }, bacia.rede.pct_maior >= 95 ? T('coincide') : bacia.rede.pct_maior >= 65 ? T('parcial') : T('dividida'))),
          kv(T('Rede confiável'), nf(bacia.rede.ok_km) + ' km'),
          DF.extras ? kv(T('Máquina'), bacia.maquina || '—') : null,
          kv('Earth Engine', asset ? h('a', { href: 'https://code.earthengine.google.com/?asset=' + asset, target: '_blank', rel: 'noopener' }, 'drenagem_t' + TH + '_' + pf) : DF.eeFalta))) : null,
      h(NS.Card, { title: i == null ? T('Trecho') : T('Trecho ') + A.seg_id[i],
          actions: i == null ? null : h(NS.IconButton, { label: T('Fechar e voltar ao mapa completo'), size: 32, tone: 'muted', onClick: function () { setSel(null); } },
            h('span', { className: 'rel-ico', 'aria-hidden': 'true' }, h(NS.LucideIcon, { name: 'X', size: 18 }))) },
        !dado ? h('p', { className: 'muted' }, erro || T('Carregando a rede…'))
        : i == null ? h('p', { className: 'muted' }, T('Clique numa linha do mapa para ver os atributos do trecho e o caminho até o exutório. Também dá para buscar pelo seg_id na barra de cima.'))
        : h(React.Fragment, null,
            h('p', { className: 'muted', style: { margin: '0 0 8px' } }, 'Strahler ' + A.strahler[i] + (baixa ? '' : ' · ' + dado.tipos[dado.tipo[i]]) + (A.trunc[i] ? T(' · área truncada') : '')),
            h('dl', { className: 'kvgrid' },
              kv('shreve', fmt(A.shreve[i])), kv('comp_m', fmt(A.comp_m[i], 1, 'm')), kv('comp_mt_km', fmt(A.comp_mt_km[i], 1, 'km')),
              kv('ac_fim_km2', fmt(A.ac_fim_km2[i], 3, 'km²')), kv('mb_km2', fmt(A.mb_km2[i], 4, 'km²')), kv('z_fim', fmt(A.z_fim[i], 2, 'm')),
              kv('desnivel', fmt(A.desnivel[i], 2, 'm')), kv('decliv', fmt(A.decliv[i], 4, 'm/m')), kv('sinuos', fmt(A.sinuos[i], 2)),
              kv('dist_ex_km', fmt(A.dist_ex_km[i], 2, 'km')), kv('dn_id', A.dn_id[i] || T('— (exutório)')), kv('ex_id', A.ex_id[i] == null ? '—' : A.ex_id[i]),
              kv('in_bacia', fmt(A.in_bacia[i], 2)), kv('trunc', A.trunc[i] == null ? '—' : (A.trunc[i] ? '1' : '0'))),
            baixa ? h('p', { className: 'muted', style: { marginTop: '8px' } }, DF.baixa) : null)));

    // coluna de bacias: um ThemeBox por base (a página independente passa as duas em `grupos`)
    var grupos = p.grupos || [{ base: p.base, nome: DF.grupo, unidades: B }];
    var abs = React.useState(function () { var o = {}; grupos.forEach(function (gr) { o[gr.base] = gr.base === p.base; }); return o; }), abertos = abs[0], setAbertos = abs[1];
    var trocar = function (gr, id) {
      var b = gr.unidades.filter(function (u) { return String(u.pfaf) === id && u.exec; })[0]; if (!b) return;
      if (gr.base === p.base) setPf(b.pfaf); else if (p.onTrocar) p.onTrocar(gr.base, b.pfaf);
    };
    var link = p.linkPagina ? p.linkPagina(p.base, pf) : null;
    var shell = h(Shell, {
      framed: !cheio, frameInset: 8, resizable: true, autoCompact: true, defaultSidebarWidth: 260, rightPanelWidth: 300,
      sidebar: function (ctx) { return h(React.Fragment, null,
        h(NS.BrandBlock, { name: 'MapBiomas', region: 'Amazônia 3D',
          leading: h('span', { style: { marginLeft: -8, display: 'flex', flex: 'none' } }, h(NS.SidebarToggle, { onToggle: ctx.toggle, label: DF.recolher })) }),
        h(NS.SidebarBody, { style: { background: 'var(--color-neutral-200)', padding: '12px 4px 12px 16px', display: 'grid', gap: '12px', alignContent: 'start' } },
          grupos.map(function (gr) {
            return h(NS.ThemeBox, { key: gr.base, name: gr.nome, icon: 'Waves', color: '#436b86', density: 'compact', growActive: false, width: '100%', uppercaseWhenOpen: false,
              open: grupos.length === 1 || !!abertos[gr.base],
              onToggle: function () { if (grupos.length > 1) setAbertos(function (o) { var c = Object.assign({}, o); c[gr.base] = !c[gr.base]; return c; }); },
              selectedId: gr.base === p.base ? String(pf) : null, onSelect: function (id) { trocar(gr, id); },
              tree: gr.unidades.map(function (b) { return { id: String(b.pfaf), label: b.rank + ' · ' + b.pfaf + ' · ' + nf(b.area_km2) + ' km²', geometria: 'polygon', locked: !b.exec }; }) });
          }))); },
      collapsedRail: function (ctx) { return h(NS.SidebarRail, { onExpand: ctx.toggle, mark: 'A3D',
        items: grupos.map(function (gr) { return { id: gr.base, label: gr.nome, color: '#436b86', icon: h(NS.LucideIcon, { name: 'Waves', size: 20 }), active: gr.base === p.base, onClick: ctx.toggle }; }) }); },
      topBar: h(NS.TopBar, { actions: h(React.Fragment, null,
          exMsg ? h('span', { className: 'muted', role: 'status', style: { font: 'var(--body-note)', marginRight: '4px' } }, exMsg) : null,
          p.acoes || null,
          podeSalvar && dado ? h(NS.IconButton, { label: T('Exportar em PNG de alta resolução, como está na tela'), tone: 'muted', onClick: exportar }, h('span', { className: 'rel-ico', 'aria-hidden': 'true' }, h(NS.LucideIcon, { name: 'ImageDown', size: 20 }))) : null,
          link ? h('a', { className: 'th-plat-link', href: link, target: '_blank', rel: 'noopener', 'aria-label': T('Abrir a mini plataforma numa página própria'), title: T('Abrir a mini plataforma numa página própria') },
            h('span', { className: 'rel-ico', 'aria-hidden': 'true' }, h(NS.LucideIcon, { name: 'ExternalLink', size: 20 }))) : null,
          p.pagina ? null : h(NS.IconButton, { label: expandido ? T('Voltar ao relatório (Esc)') : T('Expandir para tela cheia'), tone: 'muted', onClick: alternarTela },
            h('span', { className: 'rel-ico', 'aria-hidden': 'true' }, h(NS.LucideIcon, { name: expandido ? 'Minimize2' : 'Maximize2', size: 20 })))) },
        h(NS.TerritorySearch, { placeholder: T('Buscar trecho pelo seg_id'), value: busca, onChange: buscar, onClear: function () { setBusca(''); } })),
      contextBar: h(NS.ContextBar, { label: bacia ? DF.un + bacia.rank + ' · ' + pf : String(pf) },
        p.contexto || null,
        h('span', { style: { font: 'var(--body-note)', color: 'var(--color-neutral-600)', marginLeft: '8px' } },
          dado ? nf(ORDENS_MAPA.reduce(function (s, o) { return s + (ocultaOrdem(o) ? 0 : (dado.porOrdem[o] || []).length); }, 0)) + T(' de ') + nf(dado.n_total) + T(' trechos no mapa') + (dado.completa ? '' : T(' · carregando ordens 1 a 3…')) : (erro ? T('erro ao carregar') : T('carregando…')))),
      overlayTopLeft: legenda,
      overlayBottomLeft: h(NS.MapHint, { text: DF.dica }),
      overlayBottomRight: h(NS.MapControls, { onZoomIn: function () { zoom(1.6); }, onZoomOut: function () { zoom(1 / 1.6); }, onResetNorth: verTudo,
        coords: coords || undefined, scale: escala || undefined }),
      rightPanel: painel
    }, h('div', { className: 'mapfill', ref: caixa },
        h('canvas', { ref: cv, className: 'map-canvas', onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerLeave: function () { setHover(null); }, onDoubleClick: onDbl,
          role: 'img', 'aria-label': DF.aria + pf }),
        hover && dado ? h('div', { className: 'map-tip', style: { left: hover.x + 12, top: hover.y + 12 } },
          h('b', null, T('Trecho ') + dado.attrs.seg_id[hover.i]),
          h('span', null, T('ordem ') + dado.attrs.strahler[hover.i] + ' · ' + fmt(dado.attrs.comp_m[hover.i], 0, 'm') + ' · ' + fmt(dado.attrs.ac_fim_km2[hover.i], 3, 'km²'))) : null,
        !dado ? h('div', { className: 'map-loading', role: 'status' }, erro || T('Carregando a rede…')) : null));

    return h('div', { className: 'shellbox' + (p.pagina ? ' is-page' : expandido ? ' is-expanded' : ''), ref: shellRef }, shell);
  }

  window.TerraHidroPlataforma = { Mapa: Mapa, defs: defs, VIR: VIR, ORDENS_MAPA: ORDENS_MAPA, decode: decode, indexar: indexar, fundir: fundir };
})();
