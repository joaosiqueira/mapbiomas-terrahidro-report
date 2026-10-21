/**
 * Plataforma da rede de drenagem LiDAR — piloto HydroBASINS nível 9 (TerraHidro, thresholds 5000 e 7500).
 *
 * Layout no estilo do PlatformShell do design system MapBiomas (o mesmo da mini plataforma do
 * relatório): barra superior com busca, coluna de bacias à esquerda, mapa único com a legenda
 * sobre ele e painel de detalhes à direita. Sem tela dividida.
 *
 * Uso: cole no Code Editor do Earth Engine e clique em Run. Se pedir um Cloud Project, use
 * `mapbiomas-brazil`. Escolha a bacia na coluna da esquerda; ligue e desligue camadas e ordens
 * na legenda e ajuste a espessura das linhas; ligue a inspeção (botão no mapa) e clique numa
 * linha para ver os atributos do trecho; busque um trecho pelo seg_id.
 *
 * Assets (projects/nexgenmap/AMAZONIA3D/terrahidro/piloto_nivel9/), todos públicos:
 *   drenagem_t5000_<pfaf> e drenagem_t7500_<pfaf>  rede vetorial, 26 campos por trecho
 *                                                  (docs/DRENAGEM_VETORIAL.md); as bacias 1, 4 e 5
 *                                                  vêm do reprocessamento r2 (nodata −9999 corrigido)
 *   bacias_d8_nivel9                               bacia redelimitada pelo D8 (rede principal)
 *   bacias_hydrobasins_nivel9                      HydroBASINS com as métricas da comparação
 * ANA (BHO 6, 1:100.000): ana_bho6/ottobacias_n6, ottobacias_n7 e trechos_drenagem (Brasil inteiro).
 * Base: MDT (projects/nexgenmap/AMAZONIA3D/mdt) e ortofoto de 10 cm (projects/nexgenmap/AMAZONIA3D/ortofoto).
 *   referencia_fbds_rios, referencia_fbds_massas,  hidrografia FBDS 1:25.000 (rios simples, rios duplos e
 *   referencia_fbds_app                            massas d'água, APP) recortada no buffer das bacias
 *   referencia_ibge_trechos, referencia_ibge_massas  IBGE BC250 2023 (trechos e massas d'água), mesmo recorte
 * O card "Comparação na bacia" traz densidade de drenagem e APP de 30 m da rede LiDAR (threshold e ordens
 * escolhidos na legenda), da FBDS e do IBGE, dentro do polígono HydroBASINS (números de
 * scripts/comparacao_referencias.py, gravados aqui por scripts/gee_comparacao.py). Os números de trechos e
 * canais do card da bacia são do recorte inteiro (bacia + 1 km), onde a rede foi extraída.
 * O seletor "Threshold" troca a rede entre 5.000 (1.250 m²) e 7.500 células (1.875 m²); "Sobrepor a rede de N
 * células" desenha a rede do outro limiar em vermelho fino por cima, para ver o que o limiar maior remove. A camada
 * "Bacia redelimitada pelo D8" mostra o que drena para o exutório da maior rede, ao lado do HydroBASINS.
 * A bacia 8 não foi processada (precisa de ~65 GB de RAM).
 */

// -----------------------------------------------------------------------------
// Dados.
// -----------------------------------------------------------------------------

var PASTA = 'projects/nexgenmap/AMAZONIA3D/terrahidro/piloto_nivel9/';
var HYBAS9 = ee.FeatureCollection('WWF/HydroSHEDS/v1/Basins/hybas_9');
var BACIAS_D8 = ee.FeatureCollection(PASTA + 'bacias_d8_nivel9');   // campos com até 10 caracteres (shapefile)
var THRESHOLDS = {5000: '5.000 células (1.250 m²)', 7500: '7.500 células (1.875 m²)'};
// hidrografia de referência (scripts/ingere_gee.py --so referencias); cores das referências no relatório
var REF = {
  fbdsRios: ee.FeatureCollection(PASTA + 'referencia_fbds_rios'),
  fbdsMassas: ee.FeatureCollection(PASTA + 'referencia_fbds_massas'),
  fbdsApp: ee.FeatureCollection(PASTA + 'referencia_fbds_app'),
  ibgeTrechos: ee.FeatureCollection(PASTA + 'referencia_ibge_trechos'),
  ibgeMassas: ee.FeatureCollection(PASTA + 'referencia_ibge_massas')
};
var COR_FBDS = '734c1b', COR_IBGE = '04381d', COR_AGUA = '70b2e0', COR_ANA = 'ca6528';
// ANA, Base Hidrográfica Ottocodificada BHO 6 (v6.2.4, 1:100.000), Brasil inteiro (scripts/ana_bho6.py);
// recortada aqui num retângulo em volta do piloto para desenhar rápido
var ANA = 'projects/nexgenmap/AMAZONIA3D/terrahidro/ana_bho6/';
var REGIAO = ee.Geometry.Rectangle([-64.2, -7.8, -62.2, -6.2]);
var ANA_FC = {
  n6: ee.FeatureCollection(ANA + 'ottobacias_n6').filterBounds(REGIAO),
  n7: ee.FeatureCollection(ANA + 'ottobacias_n7').filterBounds(REGIAO),
  trechos: ee.FeatureCollection(ANA + 'trechos_drenagem').filterBounds(REGIAO)
};

// <comparacao>
// Gerado por scripts/gee_comparacao.py a partir de data/referencias/comparacao*.json — não editar à mão.
// Por bacia (dentro do polígono HydroBASINS, grade de 5 m): área (km²); fbds e ibge = [comprimento km, APP km²];
// por threshold, km e app da rede LiDAR com Strahler >= N, N = 1..9 (índice 0 = ordem 1).
var COMP = {"622639292":{"area":101.54,"fbds":[145.0,8.95],"ibge":[29.2,1.89],"5000":{"km":[3025.7,1455.9,747.4,369.9,181.5,89.6,27.0,7.4,0.0],"app":[90.27,57.28,32.03,16.59,8.43,4.23,1.3,0.36,0.0]},"7500":{"km":[2407.3,1211.2,619.2,313.1,151.3,67.8,21.5,5.7,0.0],"app":[80.6,49.15,26.87,14.14,7.07,3.21,1.03,0.28,0.0]}},"622639293":{"area":186.5,"fbds":[272.1,16.7],"ibge":[48.9,3.15],"5000":{"km":[5462.5,2592.3,1363.0,663.4,289.5,138.8,53.3,12.5,0.0],"app":[165.14,103.5,59.36,30.2,13.75,6.67,2.55,0.6,0.0]},"7500":{"km":[4299.5,2147.3,1125.6,527.7,236.6,118.0,38.6,0.0,0.0],"app":[145.86,88.74,49.7,24.29,11.31,5.63,1.87,0.0,0.0]}},"622639538":{"area":156.2,"fbds":[206.8,14.65],"ibge":[35.2,2.34],"5000":{"km":[4361.0,2166.7,1196.9,657.1,361.7,193.0,116.8,38.4,0.0],"app":[134.23,86.37,50.57,27.92,15.38,8.25,4.97,1.62,0.0]},"7500":{"km":[3510.0,1822.1,1003.4,556.3,307.8,161.0,99.9,27.8,0.0],"app":[120.26,74.46,42.57,23.61,13.03,6.86,4.19,1.17,0.0]}},"622921642":{"area":303.56,"fbds":[300.6,17.8],"ibge":[58.5,3.79],"5000":{"km":[7459.9,3757.1,2034.2,1098.1,589.3,321.1,169.4,78.8,16.8],"app":[257.2,162.84,91.95,49.44,26.21,14.14,7.43,3.41,0.74]},"7500":{"km":[6022.2,3152.5,1710.3,932.1,490.7,280.0,132.3,62.7,16.8],"app":[229.44,139.41,77.33,41.8,21.76,12.29,5.8,2.72,0.74]}},"622921662":{"area":117.79,"fbds":[87.7,5.29],"ibge":[17.7,1.14],"5000":{"km":[2697.7,1421.4,801.9,450.3,232.8,122.6,71.0,18.8,0.0],"app":[98.66,63.14,36.36,19.99,10.18,5.36,3.07,0.8,0.0]},"7500":{"km":[2208.3,1199.8,683.4,375.8,198.1,104.6,53.3,18.8,0.0],"app":[88.18,54.09,30.81,16.58,8.63,4.57,2.3,0.8,0.0]}},"622921674":{"area":225.07,"fbds":[170.7,11.05],"ibge":[38.5,2.49],"5000":{"km":[5317.7,2763.2,1553.6,838.5,464.2,274.6,127.7,54.0,43.4],"app":[185.39,118.94,69.05,37.03,20.4,12.04,5.63,2.39,1.93]},"7500":{"km":[4315.2,2335.2,1297.8,709.0,399.2,220.6,113.7,52.3,0.0],"app":[165.53,102.25,57.63,31.29,17.55,9.74,5.03,2.31,0.0]}},"622921676":{"area":207.14,"fbds":[203.9,12.4],"ibge":[34.4,2.22],"5000":{"km":[5089.1,2498.0,1350.6,721.5,373.4,164.0,85.7,40.8,0.0],"app":[177.58,109.49,61.36,32.59,16.66,7.21,3.73,1.75,0.0]},"7500":{"km":[4126.2,2096.7,1141.9,603.4,302.7,144.5,83.9,19.2,0.0],"app":[158.68,93.63,51.82,27.17,13.42,6.33,3.65,0.82,0.0]}}};
// </comparacao>

// rank, pfaf, área (km²) e situação (ver data/piloto_nivel9/ranking.csv); `base` = revisão dos rasters
// de que o vetor parte (r2 nas bacias 1, 4 e 5, onde o nodata −9999 da ENTREGA_06 foi corrigido)
var BACIAS = [
  {rank: 1, pfaf: 622639292, area: 101.5, status: 'ok', base: 'r2'},
  {rank: 2, pfaf: 622921662, area: 117.8, status: 'ok', base: 'r1'},
  {rank: 3, pfaf: 622639538, area: 156.2, status: 'ok', base: 'r1'},
  {rank: 4, pfaf: 622921676, area: 207.1, status: 'ok', base: 'r2'},
  {rank: 5, pfaf: 622639293, area: 186.5, status: 'ok', base: 'r2'},
  {rank: 6, pfaf: 622921674, area: 225.1, status: 'ok', base: 'r1'},
  {rank: 7, pfaf: 622921642, area: 303.6, status: 'ok', base: 'r1'},
  {rank: 8, pfaf: 622921682, area: 556.5, status: 'pendente', base: ''}
];
var STATUS_TXT = {pendente: 'não processada'};

// Viridis por ordem de Strahler, com espessura crescente (mesma paleta do relatório).
var ORDENS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
var VIR = {
  1: ['440154', 1], 2: ['472d7b', 1], 3: ['3b528b', 1.5], 4: ['2c728e', 1.5], 5: ['21918c', 2],
  6: ['28ae80', 2.5], 7: ['5ec962', 3], 8: ['addc30', 3.5], 9: ['fde725', 4]
};

// Tokens do design system MapBiomas.
var C = {
  primary700: '#43798a', primary900: '#15292f', primary200: '#d5f0f8',
  n100: '#ffffff', n200: '#f1f2f2', n300: '#d2d3d4', n500: '#959698', n600: '#76787a',
  n700: '#5b5d5f', n800: '#414243', n900: '#262728', erro: '#d4271e'
};

// -----------------------------------------------------------------------------
// MDT e relevo (luz única de noroeste, como no relatório).
// -----------------------------------------------------------------------------

var mdtCol = ee.ImageCollection('projects/nexgenmap/AMAZONIA3D/mdt');
// projeção nativa (0,5 m) para o hillshade calcular o gradiente na escala real
var mdt = mdtCol.mosaic().setDefaultProjection(mdtCol.first().projection());
var sombra = ee.Terrain.hillshade(mdt, 315, 45).updateMask(mdt.mask());
// p2–p98 do hillshade sobre as bacias (≈158–200 a 2 m)
var SOMBRA_VIS = {min: 155, max: 205};
var VIRIDIS = ['440154', '482878', '3e4989', '31688e', '26828e', '1f9e89', '35b779', '6ece58', 'b5de2b', 'fde725'];
var mdtFaixa = {min: 40, max: 70};   // refinada por bacia (p2–p98)

// Ortofoto da Amazônia 3D (10 cm, EPSG:31980, bandas b1–b3 = RGB), ao lado da coleção do MDT; pública.
// Pixels pretos nas três bandas são o fundo sem imagem e ficam transparentes.
var ortoCol = ee.ImageCollection('projects/nexgenmap/AMAZONIA3D/ortofoto');
var orto = ortoCol.mosaic().setDefaultProjection(ortoCol.first().projection());
var ortoVis = orto.select(['b1', 'b2', 'b3']).visualize({min: 0, max: 255})
  .updateMask(orto.select('b1').add(orto.select('b2')).add(orto.select('b3')).gt(0));

function relevo(tipo) {
  if (tipo === 'sombra') return {img: sombra, vis: SOMBRA_VIS};
  var cor = mdt.visualize({min: mdtFaixa.min, max: mdtFaixa.max, palette: VIRIDIS});
  if (tipo === 'mdt') return {img: cor, vis: {}};
  var brilho = sombra.unitScale(SOMBRA_VIS.min, SOMBRA_VIS.max).clamp(0, 1).multiply(0.55).add(0.45);
  return {img: cor.multiply(brilho).uint8().updateMask(mdt.mask()), vis: {}};
}

// -----------------------------------------------------------------------------
// Estado.
// -----------------------------------------------------------------------------

var estado = {
  bacia: BACIAS[2],
  th: 5000,                            // threshold do d8drainage (células): 5000 | 7500
  modo: 'ordem',                       // 'ordem' | 'anomalia'
  ordens: {},                          // ordem -> visível
  vis: {rede: true, comp: false, bacia: true, d8: false, vizinhas: false, relevo: true, orto: false,
        fbds: false, fbdsApp: false, ibge: false, anaN6: false, anaN7: false, anaTrechos: false},
  relevo: 'sombra',
  opRede: 1, opRelevo: 1,
  espessura: 1,                        // multiplicador da espessura das linhas
  larguraPorOrdem: true,               // espessura cresce com a ordem, ou igual para todas
  inspecao: false,                     // clique no mapa seleciona trecho só com o botão ligado
  trecho: null
};
ORDENS.forEach(function (o) { estado.ordens[o] = true; });

function nomeAsset() { return 'drenagem_t' + estado.th + '_' + estado.bacia.pfaf; }
function rede() { return ee.FeatureCollection(PASTA + nomeAsset()); }
function outroTh() { return estado.th === 5000 ? 7500 : 5000; }
function redeOutra() { return ee.FeatureCollection(PASTA + 'drenagem_t' + outroTh() + '_' + estado.bacia.pfaf); }
function baciaGeom() { return HYBAS9.filter(ee.Filter.eq('PFAF_ID', estado.bacia.pfaf)); }
function fmt(v, d) {
  if (v === null || v === undefined) return '—';
  var s = Number(v).toFixed(d || 0).split('.');
  return s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (s[1] ? ',' + s[1] : '');
}

// -----------------------------------------------------------------------------
// Peças de interface (equivalentes simples dos componentes do design system).
// -----------------------------------------------------------------------------

var FONTE = {fontFamily: 'Open Sans, Roboto, Arial, sans-serif'};
function st(o) { var r = {}; Object.keys(FONTE).forEach(function (k) { r[k] = FONTE[k]; }); Object.keys(o || {}).forEach(function (k) { r[k] = o[k]; }); return r; }
function txt(t, o) { return ui.Label(t, st(o)); }
function linha(ws, o) { return ui.Panel(ws, ui.Panel.Layout.flow('horizontal'), st(o)); }
function coluna(ws, o) { return ui.Panel(ws, ui.Panel.Layout.flow('vertical'), st(o)); }
function titulo(t) { return txt(t.toUpperCase(), {fontSize: '11px', fontWeight: 'bold', color: C.n600, margin: '12px 0 4px 0', backgroundColor: 'rgba(0,0,0,0)'}); }
function card(t, corpo) {
  return coluna([txt(t, {fontSize: '14px', fontWeight: 'bold', color: C.n900, margin: '0 0 8px 0'}), corpo],
    {backgroundColor: C.n100, border: '1px solid ' + C.n300, padding: '12px', margin: '0 0 12px 0'});
}
function kv(k, v) {
  return linha([txt(k, {fontSize: '12px', color: C.n600, width: '110px', margin: '2px 0'}),
                (typeof v === 'string' ? txt(v, {fontSize: '12px', color: C.n900, margin: '2px 0'}) : v)],
    {margin: '0', backgroundColor: 'rgba(0,0,0,0)'});
}
// amostra da legenda: 24×14, linha ou área, todas do mesmo tamanho
function amostra(cor, tipo) {
  if (tipo === 'area') return txt('', {width: '20px', height: '10px', margin: '3px 8px 0 2px', backgroundColor: cor, border: '1px solid ' + C.n900});
  return txt('', {width: '22px', height: '3px', margin: '8px 8px 0 1px', backgroundColor: cor});
}

// -----------------------------------------------------------------------------
// Mapa.
// -----------------------------------------------------------------------------

var mapa = ui.Map();
var CINZA = [
  {stylers: [{saturation: -100}, {lightness: 40}]},
  {elementType: 'labels', stylers: [{visibility: 'off'}]},
  {featureType: 'road', stylers: [{visibility: 'simplified'}, {lightness: 20}]}
];
mapa.setOptions('Cinza', {Cinza: CINZA});
mapa.setControlVisibility({all: false, zoomControl: true, scaleControl: true, fullscreenControl: true, layerList: false});
mapa.style().set('cursor', 'hand');

function imagemRede() {
  var vis = ORDENS.filter(function (o) { return estado.ordens[o]; });
  var fc = rede().filter(ee.Filter.inList('strahler', vis));
  if (estado.modo === 'ordem') {
    var cores = ee.Dictionary({}), larg = ee.Dictionary({});
    ORDENS.forEach(function (o) {
      cores = cores.set(String(o), VIR[o][0]);
      larg = larg.set(String(o), (estado.larguraPorOrdem ? VIR[o][1] : 1.5) * estado.espessura);
    });
    return fc.sort('strahler').map(function (f) {
      var k = ee.Number(f.get('strahler')).int().format('%d');
      return f.set('estilo', ee.Dictionary({color: cores.get(k), width: larg.get(k)}));
    }).style({styleProperty: 'estilo'});
  }
  return ee.ImageCollection([
    fc.filter(ee.Filter.gte('z_fim', 0)).style({color: 'b4b5b6', width: 1 * estado.espessura}),
    fc.filter(ee.Filter.lt('z_fim', 0)).style({color: 'd4271e', width: 2.5 * estado.espessura})
  ]).mosaic();
}

// Camadas do mapa, de baixo para cima. Cada uma tem:
//   ver()    — se aparece agora (checkbox da legenda, bacia processada, trecho selecionado)
//   chave()  — o que muda o desenho; só quando ela muda a camada é recriada (novos tiles)
//   cria()   — a imagem e o nome da camada
// Ligar e desligar só mostra ou esconde a camada (setShown): as demais não recarregam. Uma camada
// é criada na primeira vez em que aparece e recriada só se a chave mudou.
function ordensVis() { return ORDENS.filter(function (o) { return estado.ordens[o]; }).join(','); }
function ok() { return estado.bacia.status === 'ok'; }
var CAMADAS = [
  {id: 'relevo', ver: function () { return estado.vis.relevo; },
   chave: function () { return estado.relevo + (estado.relevo === 'sombra' ? '' : '|' + mdtFaixa.min + '|' + mdtFaixa.max); },
   cria: function () { var r = relevo(estado.relevo); return {img: r.img, vis: r.vis, nome: 'Relevo do MDT', op: estado.opRelevo}; }},
  // a ortofoto fica sobre o relevo: ligada, é ela que aparece como base
  {id: 'orto', ver: function () { return estado.vis.orto; }, chave: function () { return ''; },
   cria: function () { return {img: ortoVis, nome: 'Ortofoto Amazônia 3D (10 cm)'}; }},
  {id: 'vizinhas', ver: function () { return estado.vis.vizinhas; }, chave: function () { return estado.bacia.pfaf; },
   cria: function () {
     var viz = HYBAS9.filterBounds(baciaGeom().geometry().buffer(15000)).filter(ee.Filter.neq('PFAF_ID', estado.bacia.pfaf));
     return {img: viz.style({color: '76787a', width: 0.8, fillColor: '00000000'}), nome: 'Outras bacias nível 9'}; }},
  {id: 'fbdsApp', ver: function () { return estado.vis.fbdsApp; }, chave: function () { return ''; },
   cria: function () { return {img: REF.fbdsApp.style({color: COR_FBDS + '00', width: 0, fillColor: COR_FBDS + '59'}), nome: 'APP FBDS'}; }},
  {id: 'fbdsMassas', ver: function () { return estado.vis.fbds; }, chave: function () { return ''; },
   cria: function () { return {img: REF.fbdsMassas.style({color: COR_FBDS, width: 1, fillColor: COR_AGUA + '99'}), nome: 'FBDS: rios duplos e massas d’água'}; }},
  {id: 'ibgeMassas', ver: function () { return estado.vis.ibge; }, chave: function () { return ''; },
   cria: function () { return {img: REF.ibgeMassas.style({color: COR_IBGE, width: 1, fillColor: COR_AGUA + '99'}), nome: 'IBGE: massas d’água'}; }},
  {id: 'rede', ver: function () { return ok() && estado.vis.rede; },
   chave: function () { return [estado.bacia.pfaf, estado.th, estado.modo, ordensVis(), estado.espessura, estado.larguraPorOrdem].join('|'); },
   cria: function () { return {img: imagemRede(), nome: 'Rede de drenagem LiDAR', op: estado.opRede}; }},
  {id: 'comp', ver: function () { return ok() && estado.vis.comp; },
   chave: function () { return [estado.bacia.pfaf, estado.th, ordensVis(), estado.espessura].join('|'); },
   // a rede do outro threshold por cima, em vermelho fino: onde ela falta, o trecho só existe no limiar menor
   cria: function () { return {img: redeOutra().filter(ee.Filter.inList('strahler', ORDENS.filter(function (o) { return estado.ordens[o]; })))
     .style({color: 'd4271e', width: 1 * estado.espessura}), nome: 'Rede de ' + fmt(outroTh()) + ' células (comparação)'}; }},
  {id: 'fbdsRios', ver: function () { return estado.vis.fbds; }, chave: function () { return estado.espessura; },
   cria: function () { return {img: REF.fbdsRios.style({color: COR_FBDS, width: 2 * estado.espessura}), nome: 'FBDS 1:25.000: rios simples'}; }},
  {id: 'anaTrechos', ver: function () { return estado.vis.anaTrechos; }, chave: function () { return estado.espessura; },
   cria: function () { return {img: ANA_FC.trechos.style({color: COR_ANA, width: 1.5 * estado.espessura}), nome: 'ANA BHO 6: trechos de drenagem'}; }},
  {id: 'anaN6', ver: function () { return estado.vis.anaN6; }, chave: function () { return ''; },
   cria: function () { return {img: ANA_FC.n6.style({color: COR_ANA, width: 3, fillColor: '00000000'}), nome: 'ANA: ottobacias nível 6'}; }},
  {id: 'anaN7', ver: function () { return estado.vis.anaN7; }, chave: function () { return ''; },
   cria: function () { return {img: ANA_FC.n7.style({color: COR_ANA, width: 1.5, lineType: 'dashed', fillColor: '00000000'}), nome: 'ANA: ottobacias nível 7'}; }},
  {id: 'ibgeTrechos', ver: function () { return estado.vis.ibge; }, chave: function () { return estado.espessura; },
   cria: function () { return {img: REF.ibgeTrechos.style({color: COR_IBGE, width: 2.5 * estado.espessura}), nome: 'IBGE BC250: trechos de drenagem'}; }},
  {id: 'recorte', ver: function () { return estado.vis.bacia; }, chave: function () { return estado.bacia.pfaf; },
   cria: function () { return {img: baciaGeom().map(function (f) { return f.buffer(1000); }).style({color: '959698', width: 1, fillColor: '00000000'}), nome: 'Recorte (bacia + 1 km)'}; }},
  {id: 'bacia', ver: function () { return estado.vis.bacia; }, chave: function () { return estado.bacia.pfaf; },
   cria: function () { return {img: baciaGeom().style({color: '262728', width: 2, fillColor: '00000000'}), nome: 'Bacia HydroBASINS nível 9'}; }},
  {id: 'd8', ver: function () { return ok() && estado.vis.d8; }, chave: function () { return estado.bacia.pfaf; },
   cria: function () { return {img: BACIAS_D8.filter(ee.Filter.eq('pfaf_id', estado.bacia.pfaf)).style({color: '436b86', width: 2, fillColor: '70b2e055'}), nome: 'Bacia redelimitada pelo D8'}; }},
  {id: 'halo', ver: function () { return !!estado.trecho; }, chave: function () { return estado.trecho ? estado.bacia.pfaf + '|' + estado.th + '|' + estado.trecho.properties.seg_id : ''; },
   cria: function () { return {img: ee.FeatureCollection([ee.Feature(ee.Geometry(estado.trecho.geometry))]).style({color: 'ffffff', width: 7}), nome: 'Trecho (halo)'}; }},
  {id: 'trecho', ver: function () { return !!estado.trecho; }, chave: function () { return estado.trecho ? estado.bacia.pfaf + '|' + estado.th + '|' + estado.trecho.properties.seg_id : ''; },
   cria: function () { return {img: ee.FeatureCollection([ee.Feature(ee.Geometry(estado.trecho.geometry))]).style({color: 'd4271e', width: 3}), nome: 'Trecho selecionado'}; }}
];
var criadas = {};   // id -> {chave, layer}; a ordem no mapa segue CAMADAS

function camada(id) { return criadas[id] ? criadas[id].layer : null; }

function atualizarMapa() {
  CAMADAS.forEach(function (c) {
    var ver = c.ver(), atual = criadas[c.id];
    if (!ver) { if (atual) atual.layer.setShown(false); return; }
    var k = String(c.chave());
    if (atual && atual.chave === k) { atual.layer.setShown(true); return; }
    var d = c.cria();
    var layer = ui.Map.Layer(d.img, d.vis || {}, d.nome, true, d.op === undefined ? 1 : d.op);
    if (atual) {
      mapa.layers().set(mapa.layers().indexOf(atual.layer), layer);
    } else {
      // posição: depois das camadas já criadas que vêm antes desta em CAMADAS
      var pos = 0;
      for (var i = 0; i < CAMADAS.length && CAMADAS[i].id !== c.id; i++) if (criadas[CAMADAS[i].id]) pos++;
      mapa.layers().insert(pos, layer);
    }
    criadas[c.id] = {chave: k, layer: layer};
  });
}

// -----------------------------------------------------------------------------
// Legenda (LegendPanel): sobre o mapa, no canto superior esquerdo, recolhível.
// -----------------------------------------------------------------------------

var legCorpo = coluna([], {margin: '0', padding: '0', backgroundColor: 'rgba(0,0,0,0)'});
var legBotao = ui.Button({label: '▾', style: st({margin: '0', padding: '0'}), onClick: function () {
  var shown = legCorpo.style().get('shown') !== false;
  legCorpo.style().set('shown', !shown); legBotao.setLabel(shown ? '▸' : '▾');
}});
var legenda = coluna([
  linha([txt('Legenda', {fontSize: '14px', fontWeight: 'bold', color: C.n900, margin: '6px 0 0 0', stretch: 'horizontal', backgroundColor: 'rgba(0,0,0,0)'}), legBotao],
    {backgroundColor: 'rgba(0,0,0,0)', margin: '0'}),
  legCorpo
], {position: 'top-left', width: '290px', maxHeight: '560px', padding: '8px 12px', margin: '10px', backgroundColor: C.n100, border: '1px solid ' + C.n300});

function chk(rotulo, valor, fn, extra) {
  var c = ui.Checkbox({label: rotulo, value: valor, onChange: fn, style: st({fontSize: '13px', color: C.n800, margin: '2px 0', backgroundColor: 'rgba(0,0,0,0)'})});
  return extra ? linha([c, extra], {margin: '0', backgroundColor: 'rgba(0,0,0,0)'}) : c;
}
function slider(v, fn, live) {
  var s = ui.Slider({min: 0.1, max: 1, step: 0.05, value: v, style: st({stretch: 'horizontal', margin: '0 0 0 24px', backgroundColor: 'rgba(0,0,0,0)'})});
  if (live) s.onSlide(fn); else s.onChange(fn);
  return s;
}

function montarLegenda() {
  var w = [];
  w.push(titulo('Piloto LiDAR'));
  if (estado.bacia.status !== 'ok') {
    w.push(txt('Rede desta bacia ainda não processada.',
      {fontSize: '12px', color: C.n600, margin: '2px 0 6px 0', backgroundColor: 'rgba(0,0,0,0)'}));
  } else {
    w.push(chk('Rede de drenagem LiDAR', estado.vis.rede, function (v) { estado.vis.rede = v; atualizarMapa(); }));
    w.push(txt('Threshold', {fontSize: '12px', color: C.n800, margin: '4px 0 0 24px', backgroundColor: 'rgba(0,0,0,0)'}));
    w.push(ui.Select({items: Object.keys(THRESHOLDS).map(function (k) { return {label: THRESHOLDS[k], value: Number(k)}; }),
      value: estado.th, style: st({stretch: 'horizontal', margin: '2px 0 4px 24px'}),
      onChange: function (v) { estado.th = v; estado.trecho = null; montarLegenda(); atualizarMapa(); mostrarBacia(); mostrarComparacao(); mostrarTrecho(); }}));
    w.push(chk('Sobrepor a rede de ' + fmt(outroTh()) + ' células (vermelho)', estado.vis.comp, function (v) { estado.vis.comp = v; atualizarMapa(); },
      null));
    w.push(ui.Select({items: [{label: 'Ordem de Strahler', value: 'ordem'}, {label: 'Cotas negativas (z_fim < 0)', value: 'anomalia'}],
      value: estado.modo, style: st({stretch: 'horizontal', margin: '2px 0 4px 24px'}),
      onChange: function (v) { estado.modo = v; montarLegenda(); atualizarMapa(); }}));
    if (estado.modo === 'ordem') {
      var grade = ui.Panel([], ui.Panel.Layout.flow('horizontal', true), st({margin: '0 0 0 24px', backgroundColor: 'rgba(0,0,0,0)'}));
      ORDENS.forEach(function (o) {
        grade.add(linha([
          ui.Checkbox({value: estado.ordens[o], style: st({margin: '2px 0', backgroundColor: 'rgba(0,0,0,0)'}),
            onChange: function (v) { estado.ordens[o] = v; atualizarMapa(); mostrarComparacao(); }}),
          amostra('#' + VIR[o][0], 'linha'),
          txt(String(o), {fontSize: '12px', color: C.n800, margin: '4px 0 0 0', width: '14px', backgroundColor: 'rgba(0,0,0,0)'})
        ], {width: '80px', margin: '0', backgroundColor: 'rgba(0,0,0,0)'}));
      });
      w.push(grade);
    } else {
      w.push(linha([amostra('#d4271e', 'linha'), txt('Cota final negativa', {fontSize: '12px', color: C.n800, margin: '2px 0', backgroundColor: 'rgba(0,0,0,0)'})], {margin: '0 0 0 24px', backgroundColor: 'rgba(0,0,0,0)'}));
      w.push(linha([amostra('#b4b5b6', 'linha'), txt('Demais trechos', {fontSize: '12px', color: C.n800, margin: '2px 0', backgroundColor: 'rgba(0,0,0,0)'})], {margin: '0 0 0 24px', backgroundColor: 'rgba(0,0,0,0)'}));
    }
    w.push(slider(estado.opRede, function (v) { estado.opRede = v; if (camada('rede')) camada('rede').setOpacity(v); }, true));
    // estilo das linhas: espessura (multiplicador) e se cresce com a ordem
    w.push(txt('Espessura das linhas (×)', {fontSize: '12px', color: C.n800, margin: '6px 0 0 24px', backgroundColor: 'rgba(0,0,0,0)'}));
    w.push(ui.Slider({min: 0.5, max: 5, step: 0.5, value: estado.espessura, style: st({stretch: 'horizontal', margin: '0 0 0 24px', backgroundColor: 'rgba(0,0,0,0)'}),
      onChange: function (v) { estado.espessura = v; atualizarMapa(); }}));
    if (estado.modo === 'ordem') {
      w.push(ui.Select({items: [{label: 'Espessura cresce com a ordem', value: 'ordem'}, {label: 'Mesma espessura em todas as ordens', value: 'igual'}],
        value: estado.larguraPorOrdem ? 'ordem' : 'igual', style: st({stretch: 'horizontal', margin: '2px 0 4px 24px'}),
        onChange: function (v) { estado.larguraPorOrdem = v === 'ordem'; atualizarMapa(); }}));
    }
  }
  w.push(chk('Bacia e recorte (+ 1 km)', estado.vis.bacia, function (v) { estado.vis.bacia = v; atualizarMapa(); }));
  if (estado.bacia.status === 'ok') {
    w.push(chk('Bacia redelimitada pelo D8', estado.vis.d8, function (v) { estado.vis.d8 = v; atualizarMapa(); }));
  }
  w.push(chk('Outras bacias nível 9', estado.vis.vizinhas, function (v) { estado.vis.vizinhas = v; atualizarMapa(); }));

  w.push(titulo('Hidrografia de referência'));
  w.push(chk('FBDS 1:25.000 (rios e massas d\u2019água)', estado.vis.fbds, function (v) { estado.vis.fbds = v; atualizarMapa(); }, amostra('#' + COR_FBDS, 'linha')));
  w.push(chk('APP da FBDS', estado.vis.fbdsApp, function (v) { estado.vis.fbdsApp = v; atualizarMapa(); }, amostra('rgba(115,76,27,0.35)', 'area')));
  w.push(chk('IBGE BC250 (trechos e massas d\u2019água)', estado.vis.ibge, function (v) { estado.vis.ibge = v; atualizarMapa(); }, amostra('#' + COR_IBGE, 'linha')));
  w.push(chk('ANA: ottobacias nível 7', estado.vis.anaN7, function (v) { estado.vis.anaN7 = v; atualizarMapa(); }, amostra('#' + COR_ANA, 'linha')));
  w.push(chk('ANA: ottobacias nível 6', estado.vis.anaN6, function (v) { estado.vis.anaN6 = v; atualizarMapa(); }, amostra('#' + COR_ANA, 'linha')));
  w.push(chk('ANA BHO 6: trechos de drenagem', estado.vis.anaTrechos, function (v) { estado.vis.anaTrechos = v; atualizarMapa(); }, amostra('#' + COR_ANA, 'linha')));

  w.push(titulo('Base'));
  w.push(chk('Ortofoto Amazônia 3D (10 cm)', estado.vis.orto, function (v) { estado.vis.orto = v; atualizarMapa(); }));
  w.push(chk('Relevo do MDT (0,5 m)', estado.vis.relevo, function (v) { estado.vis.relevo = v; atualizarMapa(); }));
  w.push(ui.Select({items: [{label: 'Sombreado, luz de noroeste', value: 'sombra'}, {label: 'Sombreado colorido', value: 'colorido'}, {label: 'Elevação (viridis)', value: 'mdt'}],
    value: estado.relevo, style: st({stretch: 'horizontal', margin: '2px 0 4px 24px'}),
    onChange: function (v) { estado.relevo = v; montarLegenda(); atualizarMapa(); }}));
  if (estado.relevo === 'sombra') {
    w.push(rampa(['#3d3e3f', '#f1f2f2'], 'sombra', 'luz'));
  } else {
    w.push(rampa(VIRIDIS.map(function (c) { return '#' + c; }), fmt(mdtFaixa.min, 1) + ' m', fmt(mdtFaixa.max, 1) + ' m'));
  }
  w.push(slider(estado.opRelevo, function (v) { estado.opRelevo = v; if (camada('relevo')) camada('relevo').setOpacity(v); }, true));
  w.push(ui.Select({items: ['Cinza', 'SATELLITE', 'HYBRID', 'ROADMAP'], value: 'Cinza', placeholder: 'Mapa de fundo',
    style: st({stretch: 'horizontal', margin: '6px 0 0 0'}),
    onChange: function (v) { if (v === 'Cinza') mapa.setOptions('Cinza', {Cinza: CINZA}); else mapa.setOptions(v); }}));
  legCorpo.widgets().reset(w);
}

function rampa(cores, a, b) {
  var barra = ui.Thumbnail({
    image: ee.Image.pixelLonLat().select(0),
    params: {bbox: [0, 0, 1, 0.1], dimensions: '200x10', format: 'png', min: 0, max: 1, palette: cores},
    style: st({stretch: 'horizontal', maxHeight: '10px', margin: '2px 0 0 24px', padding: '0'})
  });
  var rot = linha([txt(a, {fontSize: '11px', color: C.n600, margin: '0', stretch: 'horizontal', backgroundColor: 'rgba(0,0,0,0)'}),
                   txt(b, {fontSize: '11px', color: C.n600, margin: '0', backgroundColor: 'rgba(0,0,0,0)'})],
    {margin: '0 0 0 24px', backgroundColor: 'rgba(0,0,0,0)'});
  return coluna([barra, rot], {margin: '0', backgroundColor: 'rgba(0,0,0,0)'});
}

// Dica (MapHint), no canto inferior esquerdo.
var dica = txt('Ligue a inspeção (canto superior direito) e clique numa linha para ver os atributos do trecho.', {position: 'bottom-left', fontSize: '12px', color: C.n700,
  padding: '4px 10px', margin: '10px', backgroundColor: 'rgba(255,255,255,0.9)'});
// Botão de inspeção, dentro do mapa: só com ele ligado o clique seleciona um trecho.
var botaoInspecao = ui.Button({style: st({position: 'top-right', margin: '10px', fontSize: '13px'}), onClick: function () {
  estado.inspecao = !estado.inspecao; ajustarInspecao();
}});
function ajustarInspecao() {
  var on = estado.inspecao;
  botaoInspecao.setLabel(on ? '◉ Inspeção ligada' : '○ Inspecionar trecho');
  botaoInspecao.style().set({color: on ? C.primary900 : C.n800, fontWeight: on ? 'bold' : 'normal'});
  mapa.style().set('cursor', on ? 'crosshair' : 'hand');
  dica.setValue(on ? 'Clique numa linha para ver os atributos do trecho.'
                   : 'Ligue a inspeção (canto superior direito) e clique numa linha para ver os atributos do trecho.');
}
mapa.add(legenda); mapa.add(dica); mapa.add(botaoInspecao);
ajustarInspecao();

// -----------------------------------------------------------------------------
// Painel direito: bacia e trecho (Cards).
// -----------------------------------------------------------------------------

var painelBacia = coluna([], {margin: '0', padding: '0', backgroundColor: 'rgba(0,0,0,0)'});
var painelTrecho = coluna([], {margin: '0', padding: '0', backgroundColor: 'rgba(0,0,0,0)'});
var painelComp = coluna([], {margin: '0', padding: '0', backgroundColor: 'rgba(0,0,0,0)'});
var painelDir = coluna([painelComp, painelBacia, painelTrecho], {width: '340px', padding: '12px', backgroundColor: C.n200});

// Comparação na bacia: densidade de drenagem e APP de 30 m da rede LiDAR (threshold e ordens da legenda),
// da FBDS e do IBGE, dentro do polígono HydroBASINS. Densidade LiDAR = soma exata das ordens ligadas
// (comprimento da ordem N = km(>= N) − km(>= N+1)); a APP não soma por ordem (faixas se sobrepõem) e usa a
// rede a partir da menor ordem ligada.
function mostrarComparacao() {
  var b = estado.bacia, c = COMP[String(b.pfaf)];
  if (!c || b.status !== 'ok') { painelComp.widgets().reset([]); return; }
  var L = c[estado.th], on = ORDENS.filter(function (o) { return estado.ordens[o]; });
  var km = 0;
  on.forEach(function (o) { var a = L.km[o - 1]; if (a !== null && a !== undefined) km += a - (L.km[o] || 0); });
  var app = on.length ? L.app[on[0] - 1] : 0;
  var continua = !on.length || on[on.length - 1] - on[0] + 1 === on.length && on[on.length - 1] === 9;
  var rotOrd = !on.length ? 'nenhuma ordem' : on.length === 9 ? 'todas as ordens' : continua ? 'ordens ' + on[0] + (on[0] < 9 ? '–9' : '') : 'ordens ' + on.join(', ');
  // uma fonte por bloco, em duas linhas (nome; densidade e APP): sem colunas de largura fixa, nada rola no card
  function lin(nome, cor, d, a, forte) {
    var dens = d === null || d === undefined ? '—' : fmt(d / c.area, 2) + ' km/km²';
    var appTxt = a === null || a === undefined ? 'APP —' : 'APP ' + fmt(a, 1) + ' km² (' + fmt(100 * a / c.area, 1) + '% da bacia)';
    return coluna([
      txt(nome, {fontSize: '12px', fontWeight: 'bold', color: '#' + cor, margin: '0', backgroundColor: 'rgba(0,0,0,0)'}),
      txt(dens + '  ·  ' + appTxt, {fontSize: '12px', color: C.n900, fontWeight: forte ? 'bold' : 'normal', margin: '1px 0 0 0', backgroundColor: 'rgba(0,0,0,0)'})
    ], {margin: '0 0 8px 0', padding: '0', backgroundColor: 'rgba(0,0,0,0)'});
  }
  var corpo = coluna([
    txt('Dentro do polígono HydroBASINS (' + fmt(c.area, 1) + ' km²): densidade de drenagem e APP de 30 m.', {fontSize: '12px', color: C.n600, margin: '0 0 8px 0', backgroundColor: 'rgba(0,0,0,0)'}),
    lin('LiDAR, threshold ' + fmt(estado.th), VIR[4][0], km, app, true),
    lin('FBDS 1:25.000', COR_FBDS, c.fbds[0], c.fbds[1]),
    lin('IBGE BC250', COR_IBGE, c.ibge[0], c.ibge[1]),
    txt('LiDAR: threshold ' + fmt(estado.th) + ' células, ' + rotOrd + ' (legenda); a APP usa a rede a partir da ordem ' + (on[0] || '—') +
      '. FBDS: APP publicada pela FBDS. IBGE: faixa de 30 m dos trechos e massas d\u2019água do BC250, calculada no projeto.',
      {fontSize: '11px', color: C.n600, margin: '6px 0 0 0', backgroundColor: 'rgba(0,0,0,0)'})
  ], {margin: '0', backgroundColor: 'rgba(0,0,0,0)'});
  painelComp.widgets().reset([card('Comparação na bacia', corpo)]);
}

function mostrarBacia() {
  var b = estado.bacia;
  var corpo = coluna([
    kv('Área', fmt(b.area, 1) + ' km²'),
    kv('Rank', String(b.rank))
  ], {margin: '0', backgroundColor: 'rgba(0,0,0,0)'});
  painelBacia.widgets().reset([card('Bacia ' + b.rank + ' · ' + b.pfaf, corpo)]);
  if (b.status !== 'ok') {
    corpo.add(kv('Earth Engine', STATUS_TXT[b.status]));
    return;
  }
  var asset = PASTA + nomeAsset();
  var carregando = txt('calculando…', {fontSize: '12px', color: C.n600, margin: '2px 0'});
  corpo.add(txt('Rede LiDAR de ' + fmt(estado.th) + ' células no recorte (bacia + 1 km)', {fontSize: '11px', fontWeight: 'bold', color: C.n600, margin: '8px 0 2px 0', backgroundColor: 'rgba(0,0,0,0)'}));
  corpo.add(kv('Trechos', carregando));
  corpo.add(kv('Rasters de base', b.base));
  corpo.add(kv('Earth Engine', txt(nomeAsset(), {fontSize: '12px', color: C.primary700, margin: '2px 0'})
    .setUrl('https://code.earthengine.google.com/?asset=' + asset)));
  var pf = b.pfaf, th = estado.th;
  ee.Dictionary({
    n: rede().size(), km: rede().aggregate_sum('comp_m'), smax: rede().aggregate_max('strahler'),
    neg: rede().filter(ee.Filter.lt('z_fim', 0)).size(), n_outro: redeOutra().size(), km_outro: redeOutra().aggregate_sum('comp_m')
  }).evaluate(function (r, e) {
    // a resposta de um threshold ou bacia anterior chega depois da troca: descarta
    if (pf !== estado.bacia.pfaf || th !== estado.th) return;
    if (e) { carregando.setValue('erro: ' + e); return; }
    carregando.setValue(fmt(r.n));
    corpo.widgets().insert(4, kv('Canais', fmt(r.km / 1000, 1) + ' km'));
    corpo.widgets().insert(5, kv('Strahler máx.', String(r.smax)));
    corpo.widgets().insert(6, kv('z_fim < 0', fmt(r.neg) + ' trechos'));
    corpo.widgets().insert(7, kv('Com ' + fmt(outroTh()), fmt(r.n_outro) + ' trechos · ' + fmt(r.km_outro / 1000, 0) + ' km'));
  });
  // bacia redelimitada pelo D8 × polígono HydroBASINS (scripts/redelimita_bacias.py)
  BACIAS_D8.filter(ee.Filter.eq('pfaf_id', b.pfaf)).first().toDictionary(['a_d8_km2', 'p_hyb_d8', 'p_d8_hyb', 'iou', 'p_outras'])
    .evaluate(function (d, e) {
      if (pf !== estado.bacia.pfaf || th !== estado.th || e || !d) return;
      corpo.add(txt('Bacia redelimitada pelo D8 (rede de 5.000 células)', {fontSize: '11px', fontWeight: 'bold', color: C.n600, margin: '8px 0 2px 0', backgroundColor: 'rgba(0,0,0,0)'}));
      corpo.add(kv('Bacia D8', fmt(d.a_d8_km2, 1) + ' km²'));
      corpo.add(kv('Cobre o polígono', fmt(d.p_hyb_d8, 1) + '%'));
      corpo.add(kv('Dentro do polígono', fmt(d.p_d8_hyb, 1) + '%'));
      corpo.add(kv('IoU', fmt(d.iou, 2)));
      corpo.add(kv('Outras redes', fmt(d.p_outras, 1) + '% do polígono'));
    });
}

var CAMPOS = [
  ['strahler', 'Strahler', 0], ['shreve', 'Shreve', 0], ['tipo', 'Tipo'], ['comp_m', 'comp_m', 1, 'm'],
  ['comp_mt_km', 'comp_mt_km', 2, 'km'], ['ac_fim_km2', 'ac_fim_km2', 3, 'km²'], ['mb_km2', 'mb_km2', 4, 'km²'],
  ['z_ini', 'z_ini', 2, 'm'], ['z_fim', 'z_fim', 2, 'm'], ['desnivel', 'desnivel', 2, 'm'], ['decliv', 'decliv', 4, 'm/m'],
  ['sinuos', 'sinuos', 2], ['n_mont', 'n_mont', 0], ['dn_id', 'dn_id'], ['ex_id', 'ex_id'], ['dist_ex_km', 'dist_ex_km', 2, 'km'],
  ['in_bacia', 'in_bacia', 2], ['trunc', 'trunc'], ['fim', 'fim']
];

function mostrarTrecho(msg) {
  if (msg) { painelTrecho.widgets().reset([card('Trecho', txt(msg, {fontSize: '12px', color: C.n600}))]); return; }
  var t = estado.trecho;
  if (!t) {
    painelTrecho.widgets().reset([card('Trecho', txt(estado.bacia.status === 'ok'
      ? 'Ligue a inspeção no canto superior direito do mapa e clique numa linha para ver os atributos do trecho. Também dá para buscar pelo seg_id na barra de cima.'
      : 'Sem rede vetorial publicada para esta bacia.', {fontSize: '12px', color: C.n600}))]);
    return;
  }
  var p = t.properties;
  var corpo = coluna(CAMPOS.map(function (c) {
    var v = p[c[0]];
    if (c[0] === 'dn_id' && v === 0) return kv(c[1], '— (exutório)');
    return kv(c[1], typeof v === 'number' && c[2] !== undefined ? fmt(v, c[2]) + (c[3] ? ' ' + c[3] : '') : String(v));
  }), {margin: '0', backgroundColor: 'rgba(0,0,0,0)'});
  var fechar = ui.Button({label: 'Fechar', style: st({margin: '8px 0 0 0'}), onClick: function () { estado.trecho = null; mostrarTrecho(); atualizarMapa(); }});
  corpo.add(fechar);
  painelTrecho.widgets().reset([card('Trecho ' + p.seg_id, corpo)]);
}

function selecionar(fc, centrar) {
  mostrarTrecho('Buscando o trecho…');
  var pf = estado.bacia.pfaf;
  fc.first().evaluate(function (f, e) {
    if (pf !== estado.bacia.pfaf) return;
    if (e || !f) { estado.trecho = null; mostrarTrecho(e ? 'Erro: ' + e : 'Nenhum trecho encontrado.'); atualizarMapa(); return; }
    estado.trecho = f; mostrarTrecho(); atualizarMapa();
    if (centrar) mapa.centerObject(ee.Geometry(f.geometry), 17);
  });
}

mapa.onClick(function (c) {
  if (!estado.inspecao || estado.bacia.status !== 'ok') return;
  var pt = ee.Geometry.Point([c.lon, c.lat]);
  var raio = Math.max(mapa.getScale() * 8, 2);   // ~8 pixels de tolerância
  var vis = ORDENS.filter(function (o) { return estado.ordens[o]; });
  selecionar(rede().filterBounds(pt.buffer(raio)).filter(ee.Filter.inList('strahler', vis))
    .map(function (f) { return f.set('_d', f.geometry().distance(pt, 0.1)); }).sort('_d'), false);
});

// -----------------------------------------------------------------------------
// Coluna esquerda: marca e bacias (BrandBlock + ThemeBox).
// -----------------------------------------------------------------------------

var listaBacias = coluna([], {margin: '0', padding: '0', backgroundColor: 'rgba(0,0,0,0)'});

function montarBacias() {
  listaBacias.widgets().reset(BACIAS.map(function (b) {
    var ativo = b.pfaf === estado.bacia.pfaf;
    var rot = b.rank + ' · ' + b.pfaf + ' · ' + fmt(b.area, 1) + ' km²';
    var item = ui.Button({
      label: (ativo ? '● ' : '') + rot,
      style: st({stretch: 'horizontal', margin: '2px 0', fontWeight: ativo ? 'bold' : 'normal', color: ativo ? C.primary900 : C.n800}),
      onClick: function () { escolher(b); }
    });
    var w = [item];
    if (b.status === 'pendente') w.push(txt(STATUS_TXT[b.status], {fontSize: '11px', color: C.n600, margin: '-2px 0 4px 12px', backgroundColor: 'rgba(0,0,0,0)'}));
    return coluna(w, {margin: '0', padding: '0', backgroundColor: 'rgba(0,0,0,0)'});
  }));
}

var colEsq = coluna([
  titulo('Bacias do piloto'),
  txt('HydroBASINS nível 9 · threshold 5.000 ou 7.500 células', {fontSize: '12px', color: C.n600, margin: '0 0 8px 0', backgroundColor: 'rgba(0,0,0,0)'}),
  listaBacias,
  txt('Rede vetorial do TerraHidro sobre o MDT LiDAR de 0,5 m da Amazônia 3D (EPSG:31980). As bacias 1, 4 e 5 vêm dos rasters r2 (nodata corrigido). A bacia 8 precisa de ~65 GB de RAM.',
    {fontSize: '11px', color: C.n600, margin: '16px 0 0 0', backgroundColor: 'rgba(0,0,0,0)'})
], {width: '260px', padding: '12px 12px 12px 16px', backgroundColor: C.n200});

// -----------------------------------------------------------------------------
// Barra superior (TopBar + TerritorySearch).
// -----------------------------------------------------------------------------

var busca = ui.Textbox({placeholder: 'Buscar trecho pelo seg_id', style: st({width: '260px', margin: '6px 8px'}),
  onChange: function (v) {
    var id = parseInt(String(v).replace(/\D/g, ''), 10);
    if (!id || estado.bacia.status !== 'ok') return;
    selecionar(rede().filter(ee.Filter.eq('seg_id', id)), true);
  }});
var topo = linha([
  txt('MapBiomas', {fontSize: '18px', fontWeight: 'bold', color: C.n900, margin: '8px 4px 8px 16px'}),
  txt('Amazônia 3D', {fontSize: '13px', color: C.primary700, margin: '13px 24px 8px 0'}),
  txt('Rede de drenagem LiDAR · piloto nível 9', {fontSize: '14px', color: C.n800, margin: '12px 0 8px 0', stretch: 'horizontal'}),
  busca
], {stretch: 'horizontal', backgroundColor: C.n100, padding: '0', margin: '0'});

// -----------------------------------------------------------------------------
// Montagem (PlatformShell): barra superior, e abaixo coluna | mapa | painel.
// -----------------------------------------------------------------------------

var corpo = ui.Panel([colEsq, mapa, painelDir], ui.Panel.Layout.flow('horizontal'), {stretch: 'both', margin: '0', padding: '0'});
mapa.style().set({stretch: 'both', margin: '0'});
ui.root.clear();
ui.root.setLayout(ui.Panel.Layout.flow('vertical'));
ui.root.add(topo);
ui.root.add(corpo);

function escolher(b) {
  estado.bacia = b; estado.trecho = null;
  montarBacias(); montarLegenda(); mostrarBacia(); mostrarComparacao(); mostrarTrecho(); atualizarMapa();
  mapa.centerObject(baciaGeom(), 13);
  // faixa de elevação da bacia (p2–p98) para o relevo colorido
  var pf = b.pfaf;
  mdt.reduceRegion({reducer: ee.Reducer.percentile([2, 98]), geometry: baciaGeom().geometry(), scale: 20, maxPixels: 1e9, bestEffort: true})
    .evaluate(function (r) {
      if (!r || pf !== estado.bacia.pfaf || r.b1_p2 === null) return;
      mdtFaixa = {min: r.b1_p2, max: r.b1_p98};
      montarLegenda();
      if (estado.relevo !== 'sombra') atualizarMapa();
    });
}

escolher(estado.bacia);
