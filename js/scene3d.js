/* =====================================================
   TAJCOTTEX — 3D scenes (three.js r128, self-hosted)

   One particle object accompanies the whole page. The wrapper
   carries data-scene="cotton,yarn,fabric,globe" (up to four shapes)
   and sections carry data-stage="0..3": scrolling from one marked
   section to the next morphs the object with a swirl; between
   markers it fades to a faint ghost so text stays readable.
   Shapes: opened cotton boll, cone of yarn, adras cloth, globe with
   trade routes, governance structure.

   Every particle is drawn twice: a lit bead (sphere shading, depth
   fog) and a soft additive halo, so gold dust and trade routes glow.
   Progressive enhancement: without WebGL the pages work as plain
   HTML (html.has-3d is never added).
   ===================================================== */
(function () {
  'use strict';

  var root = document.querySelector('[data-scene]');
  var canvas = root && root.querySelector('.scene-canvas');
  if (!root || !canvas || typeof THREE === 'undefined') return;

  var NAMES = (root.getAttribute('data-scene') || 'cotton,yarn,fabric,globe').split(',');
  while (NAMES.length < 4) NAMES.push(NAMES[NAMES.length - 1]);

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; }
  if (!renderer || !renderer.getContext()) return;

  var html = document.documentElement;
  html.classList.add('has-3d');

  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lowPower = Math.min(screen.width, screen.height) < 700 || (navigator.hardwareConcurrency || 8) <= 4;
  var N = lowPower ? 10000 : 19000;

  /* ---------- deterministic random & small vector helpers ---------- */
  var seed = 20240;
  function rnd() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  function randDir() {
    var u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    return [s * Math.cos(a), u, s * Math.sin(a)];
  }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function mul(c, s) { return [c[0] * s, c[1] * s, c[2] * s]; }
  function rx(p, a) { var c = Math.cos(a), s = Math.sin(a); return [p[0], c * p[1] - s * p[2], s * p[1] + c * p[2]]; }
  function ry(p, a) { var c = Math.cos(a), s = Math.sin(a); return [c * p[0] + s * p[2], p[1], -s * p[0] + c * p[2]]; }
  function rz(p, a) { var c = Math.cos(a), s = Math.sin(a); return [c * p[0] - s * p[1], s * p[0] + c * p[1], p[2]]; }

  /* ---------- palette (brand: forest green, ivory, gold) ---------- */
  var IVORY = [0.97, 0.955, 0.91];
  var BRACT_DARK = [0.3, 0.19, 0.1];
  var BRACT_GOLD = [0.68, 0.5, 0.23];
  var STEM = [0.3, 0.36, 0.17];
  var LEAF = [0.36, 0.62, 0.3];
  var LEAF_DARK = [0.12, 0.3, 0.14];
  var GREEN = [0.16, 0.42, 0.2];
  var GREEN_LIGHT = [0.5, 0.8, 0.42];
  var GOLD = [0.85, 0.66, 0.26];
  var GOLD_BRIGHT = [1.0, 0.86, 0.5];
  var OCEAN = [0.13, 0.25, 0.14];

  /* ---------- stage A: opened cotton boll with leaves ---------- */
  var LOBES = 5;
  function stageCotton(out) {
    var r = rnd(), p;
    out.g = 0; out.arc = -1;
    if (r < 0.6) {
      // five fluffy locks, each an ellipsoid stretched outward
      var k = Math.floor(rnd() * LOBES);
      var a = k / LOBES * Math.PI * 2 + 0.3;
      var rad = [Math.cos(a), 0, Math.sin(a)];
      var d = randDir();
      var rr = 0.44 * (0.72 + 0.28 * Math.pow(rnd(), 0.35));
      var wisp = rnd() < 0.06;
      if (wisp) rr *= 1.15 + rnd() * 0.6;
      var bump = 1 + 0.1 * Math.sin(d[0] * 9 + k) * Math.sin(d[2] * 8 - k) + 0.05 * Math.sin(d[1] * 11 + k * 2);
      var outward = d[0] * rad[0] + d[2] * rad[2];
      var stretch = 1 + 0.28 * Math.max(0, outward);
      p = [rad[0] * 0.55 + d[0] * rr * bump * stretch, 0.3 + d[1] * rr * 1.05 * bump, rad[2] * 0.55 + d[2] * rr * bump * stretch];
      var shade = 0.55 + 0.45 * clamp(outward * 0.6 + d[1] * 0.5 + 0.35, 0, 1);
      out.c = mul(mix(IVORY, [1, 0.99, 0.96], rnd()), shade * (wisp ? 0.8 : 1));
      out.s = wisp ? 0.026 : 0.046 + 0.022 * rnd();
    } else if (r < 0.75) {
      // dried, pointed burr segments spreading under the locks
      var k2 = Math.floor(rnd() * LOBES);
      var b = (k2 + 0.5) / LOBES * Math.PI * 2 + 0.3;
      var u = rnd(), v = rnd() * 2 - 1;
      var dir = [Math.cos(b), 0, Math.sin(b)], tan = [-Math.sin(b), 0, Math.cos(b)];
      var rad2 = 0.12 + u * 1.3;
      var w = 0.6 * Math.sin(Math.PI * Math.pow(u, 0.6));
      var y = -0.26 + 0.6 * u - 0.22 * u * u - 0.1 * v * v;
      p = [dir[0] * rad2 + tan[0] * v * w, y + (rnd() - 0.5) * 0.025, dir[2] * rad2 + tan[2] * v * w];
      var edge = Math.abs(v);
      out.c = mul(mix(BRACT_DARK, BRACT_GOLD, 0.25 + u * 0.35 + edge * 0.35), 0.8 + 0.3 * rnd());
      out.s = 0.034;
    } else if (r < 0.9) {
      // two lobed leaves on the branch below the boll
      var side = rnd() < 0.5 ? -1 : 1;
      var lu = rnd(), lv = rnd() * 2 - 1;
      var lw = 0.42 * Math.sin(Math.PI * Math.pow(lu, 0.75)) * (0.78 + 0.35 * Math.abs(Math.sin(2.5 * Math.PI * lu)));
      var lx = 0.12 + lu * 1.0, ly = lv * lw;
      var curl = 0.16 * lu * lu - 0.1 * Math.abs(lv);
      var pl = [lx, -0.62 + curl - lu * 0.32, ly];
      pl = ry(pl, side * 1.25 + 0.35);
      var vein = Math.exp(-Math.abs(lv) * 9) * 0.35 + Math.exp(-Math.abs(Math.abs(lv) - 0.5 * lw / 0.42) * 12) * 0.12;
      p = pl;
      out.c = mul(mix(LEAF_DARK, LEAF, 0.35 + 0.65 * lu), 0.75 + vein + 0.2 * rnd());
      out.s = 0.03;
    } else if (r < 0.95) {
      // stem
      var t = rnd(), ang = rnd() * Math.PI * 2, sr = 0.045 + 0.02 * t;
      p = [Math.cos(ang) * sr, -0.18 - 1.0 * t, 0.04 * t + Math.sin(ang) * sr];
      out.c = mul(STEM, 0.75 + rnd() * 0.4);
      out.s = 0.03;
    } else {
      // floating gold dust — seeds of the harvest
      var dd = randDir(), dr = 0.9 + rnd() * 1.0;
      p = [dd[0] * dr, 0.15 + dd[1] * dr * 0.85, dd[2] * dr];
      out.c = GOLD_BRIGHT; out.s = 0.011 + rnd() * 0.013; out.g = 1;
    }
    // tip toward the viewer so the opened star shape reads
    out.p = mul(rx([p[0], p[1] + 0.12, p[2]], 0.42), 1.18);
  }

  /* ---------- stage B: a cone of spun yarn ---------- */
  var CY0 = -1.25, CY1 = 1.05, CR0 = 0.62, CR1 = 0.25;
  function coneR(y) { var t = (y - CY0) / (CY1 - CY0); return CR0 + (CR1 - CR0) * t; }
  function stageYarn(out) {
    var r = rnd(), p;
    out.g = 0; out.arc = -1;
    if (r < 0.8) {
      // crossing helical winding, six strands each way
      var y = CY0 + rnd() * (CY1 - CY0);
      var t = (y - CY0) / (CY1 - CY0);
      var dirn = rnd() < 0.5 ? 1 : -1;
      var th = dirn * t * 40 + Math.floor(rnd() * 6) * Math.PI / 3 + (dirn > 0 ? 0 : 0.7);
      var fuzz = rnd() < 0.07 ? 0.025 + rnd() * 0.05 : 0;
      var rad = coneR(y) * (1 + 0.012 * Math.sin(th * 7)) + (rnd() - 0.5) * 0.012 + fuzz;
      p = [Math.cos(th) * rad, y, Math.sin(th) * rad];
      var light = 0.5 + 0.5 * Math.cos(th - 0.7);
      out.c = mul(mix(IVORY, [1, 0.97, 0.9], rnd()), (0.35 + 0.7 * light) * (fuzz ? 0.7 : 1));
      out.s = fuzz ? 0.018 : 0.03;
    } else if (r < 0.9) {
      // the bronze tube: top cap and bottom rim
      var top = rnd() < 0.55;
      var y2 = top ? CY1 + rnd() * 0.12 : CY0 - rnd() * 0.06;
      var th2 = rnd() * Math.PI * 2;
      var rad2 = top ? CR1 * (0.15 + 0.85 * Math.sqrt(rnd())) : CR0 * (0.92 + 0.1 * rnd());
      p = [Math.cos(th2) * rad2, y2, Math.sin(th2) * rad2];
      out.c = mul(mix(BRACT_DARK, GOLD, 0.55), 0.6 + 0.5 * (0.5 + 0.5 * Math.cos(th2 - 0.7)));
      out.s = 0.03;
    } else if (r < 0.97) {
      // a single thread leaving the cone, going up and away
      var tt = rnd();
      var x = 0.05 + 1.4 * tt * tt, yy = CY1 + 0.95 * Math.sin(tt * Math.PI * 0.5), z = 0.1 - 0.3 * tt;
      p = [x + (rnd() - 0.5) * 0.015, yy + (rnd() - 0.5) * 0.015, z];
      out.c = mul(IVORY, 0.7 + 0.3 * rnd()); out.s = 0.022;
      if (rnd() < 0.25) { out.c = GOLD_BRIGHT; out.g = 1; out.s = 0.014; }
    } else {
      var dd = randDir(), dr = 0.8 + rnd() * 1.0;
      p = [dd[0] * dr, dd[1] * dr * 1.3, dd[2] * dr];
      out.c = GOLD_BRIGHT; out.s = 0.011 + rnd() * 0.012; out.g = 1;
    }
    out.p = ry(rz(p, -0.32), 0.4);
  }

  /* ---------- stage C: flowing adras cloth with an eight-pointed star ---------- */
  var FW = 1.7, FH = 1.15, FD = 0.09, AMP = 0.03;
  var WARPS = Math.round(FW * 2 / FD), WEFTS = Math.round(FH * 2 / FD);
  var IKAT = [IVORY, GOLD, GREEN, IVORY, GREEN_LIGHT];
  function ikat(u, v) {
    // feathered stripe edges give the ikat look
    var jag = 0.05 * Math.sin(v * 5.0) + 0.02 * Math.sin(v * 17.0 + u * 3.0);
    var s = (u + FW + jag) / (2 * FW);
    var band = ((Math.floor(s * 5) % 5) + 5) % 5;
    return IKAT[band];
  }
  var STAR_R = 0.5;
  function star(u, v) {
    // eight-pointed star: two squares, one rotated 45°. returns 0 outside, 1 inside, 2 on the outline
    var x = Math.abs(u), y = Math.abs(v);
    var m1 = Math.max(x, y);
    var xr = Math.abs(u * 0.7071 - v * 0.7071), yr = Math.abs(u * 0.7071 + v * 0.7071);
    var m2 = Math.max(xr, yr);
    var inside = m1 < STAR_R || m2 < STAR_R;
    if (!inside) return 0;
    var e1 = Math.abs(m1 - STAR_R) < 0.03 && m2 >= STAR_R;
    var e2 = Math.abs(m2 - STAR_R) < 0.03 && m1 >= STAR_R;
    return (e1 || e2) ? 2 : 1;
  }
  function fabricTilt(p) { return ry(rz(rx(p, -0.7), 0.18), -0.5); }
  var FAB_N = fabricTilt([0, 0, 1]);
  function stageFabric(out) {
    var x, y, z, col, s = 0.028;
    out.g = 0; out.arc = -1;
    var warp = rnd() < 0.5;
    if (warp) {
      var j = Math.floor(rnd() * WARPS);
      x = -FW + (j + 0.5) * FD; y = -FH + rnd() * FH * 2;
      z = AMP * Math.cos(Math.PI * (y + FH) / FD + j * Math.PI);
    } else {
      var i = Math.floor(rnd() * WEFTS);
      var fringe = 0.05 + 0.22 * ((i * 7919) % 13) / 13;
      x = -FW + rnd() * (FW * 2 + fringe); y = -FH + (i + 0.5) * FD;
      z = -AMP * Math.cos(Math.PI * (x + FW) / FD + i * Math.PI);
      if (x > FW) z = -(x - FW) * 0.35;
    }
    var st = x > FW ? 0 : star(x, y);
    if (st === 2) { col = GOLD_BRIGHT; out.g = 1; s = 0.026; }
    else if (st === 1) { col = mul(mix(GOLD, GOLD_BRIGHT, 0.5 + 0.5 * z / AMP), 0.95 + 0.2 * rnd()); out.g = 0.35; }
    else { col = mul(ikat(x, y), (warp ? 0.85 : 0.72) + 0.35 * (0.5 + 0.5 * z / AMP)); }
    x += (rnd() - 0.5) * 0.02; y += (rnd() - 0.5) * 0.02; z += (rnd() - 0.5) * 0.012;
    var u = x, v = y;
    z += 0.34 * Math.sin(x * 1.5 + 0.4) + 0.14 * Math.cos(y * 2.2) + 0.1 * x * y;
    out.p = fabricTilt([x, y, z]);
    out.c = col;
    out.s = s;
    out.u = u; out.v = v;
  }

  /* ---------- stage D: globe, trade routes out of Tajikistan ---------- */
  var LAND = '1c413o1bz0un1bt1081bp0r71bn15t1bk0ws1bg0nr1bf12d1be24k1bb0tc1ba17x1b70yx1b40pw1b214h1b01j31az0vh1av1111as0s11ar16m1ao0xl1ak1361ag18r1ae0zq1ac0qp1aa15b1aa27i1a80wa1a511v1a42421a21v11a117f1a129m1a00jt19z0yf19x0pe19w13z19v26619r10j19q22q19o1tq19n16419n28b19k0o319j12o19i24v19g18819f2ag19f0kn19e0z819d21f19b14s19a27019a0h71982ck1970mr19611c19623k1952i51940sc19316x1932941930jb19120418z13h18z25o18y0fv18w2b918v10118u22818t2gt18t0r118t1t818s15m18s27t18r0i018q1ys18p2dd18p0nl18o2rz18o12618o24d18n2iy18m0t518m05j18l29x18l0k518l1mc18k20x18j2fi18h14a18h26h18g2l318g1xh18f07o18f2c218e2qn18d10u18d23118c2hn18b16f18b28m18a0it18a1l018a2n71891zl18909t1882e71880oe18712z1872561870fd1862jr1860ty1851w518506d1852ar1841n51842pc18321q1830bx1822gb1820qi1821sq18115418127b1810hi1801jp1802lw17z1ya17z08h17z2cv17y0n217y2rh17y11o17x23v17x0e217w2ig17w0sn17w1uu17w05117v29f17u1lu17u2o117u20f17t0am17t2f017t0p717s13s17r25z17r0g617r1ie17r2kl17q0us17q1wz17q07617p2bk17p0lr17p1ny17o2q517o10c17o22j17o0cq17n2h517n0rc17n1tj17m28417m0ib17l1ki17l2mp17k1z317k09a17k2dp17j0nw17j00a17j12h17i24o17i0ev17i2j917h1vn17h05u17g2a917g0kg17g1mn17f2ou17f21817f0bf17e2ft17e0q017e1s717d02e17d26t17d0h017c1j717c2le17c1xs17b07z17b2cd17b0mk17a2qz17a11617a23d1790dk1792hy1781uc17804j17828x1770j41771lb1772nj1761zx1760a41762ei1750op1751qw17501317425h1740fo1741hv1742k31730ua1731wh17306o17318v1722b21720l91721ng1722pn1710zu1712211710c81702gn1700qu1701t116z27m16z0ht16y2m716y1yl16y08s16x2d716x0ne16x1pl16w11z16w24616w0ed16v2ir16v1v516v05c16u29r16u0jy16u1m516t2oc16t20q16t0ax16s2fb16s1rp16r26b16r0gi16q1ip16q2kw16q0v316q1xa16q07h16p2bv16p0m216p1o916o2qg16o10n16o22v16o0d216n2hg16n1tu16m28f16m0im16m1kt16l2n016l1zf16l09m16k2e016k0o716k1qe16j24z16j0f616j1hd16i2jk16i1vz16i06616h2ak16h0kr16h1my16g2p516g21j16g0bq16f2g416f1sj16e27416e0hb16e2lp16d1y316d08a16c2co16c0mw16c1p316c11h16b23o16b0dv16b1g216b2i916a0sg16a1un16a04u1692981690jg1691ln1692nu1682081680af1682et1671r716725s1660g01661i71662ke1661ws16506z1652bd1650lk1641nr1642py16422c1640ck1632gy1631tc16227x1620i41621kb1612mi1611yw1610941602di1600np1601pw15z24h15z0eo15z1gv15z2j215y0t915y1vg15y05o15x2a215x0k915x1mg15x2on15w21115w0b815w2fm15v1s115v26m15u0gt15u1xl15t2c615t0md15t1ol15s23615s0dd15s1fk15r2hr15r1u515r04c15q28q15q0ix15q2nc15p1zq15p09x15p2eb15o1qp15o25a15n0fh15n1hp15n2jw15n0u315n1wa15m06h15m2av15m0l215l1n915l21u15l0c115k2gg15k1su15j27f15j0hm15i0w715i1ye15i2d015h0n715h1pe15h23z15g0e615g1gd15g0sr15g1uy15f05515f29k15f0jr15f1ly15e20j15d2f415d1ri15c26415c0gb15c1ii15b0uw15b1x315b07a15b2bo15a0lv15a1o215a22o1590cv1591tn1582881580if1572mu1571z81562dt1560o01561q715624s1550ez1551h61550tl1551vs1542ad1540kk1541mr15321c1522fy1521sc15126x1510h41510vp1501xw1502ci1500mp14z1ow14z23h14z0do14y1ug14x29214x0j914x1lg14w20114w1cf14w2em14w0ot14v1r014v25m14v0ft14u1i014u0ue14u1wl14t2b614t0ld14t1nk14s22614r1t514r27q14r0hx14q1k414q2mb14q0wi14q1yq14p2db14p0ni14p1pp14o24a14o0eh14o1go14o0t314n1va14n29v14n0k214m1m914m20u14l2ff14l0pn14l1ru14k26f14k0gm14k0v714j1xe14j2bz14j0m714j1oe14i22z14h1ty14h28j14g0ir14g1ky14g1zj14f2e414f0ob14f1qi14e25314e0fb14d0tw14d1w314d2ao14c0kv14c1n214c21n14b0qg14b1sn14a27814a0hf14a2lt14a0w01491y71492ct1490n01481p714823s1480dz1470sk1471ur14629d1460jk1461lr14620c1452ex1450p41451rc14425x1440g41430up1431ww1432bh1430lo1421nw14222h1411tg1402811400i81401kg1400wu1401z113z1bf13z2dm13z0nt13z1q013y24l13y0es13y1h013x0te13x1vl13x2a613x0kd13w1mk13w21513v1dk13v2fr13v0py13v1s513u26q13u0gx13u1j413u0vi13u1xp13t2cb13t0mi13t1op13s23a13s1fo13r1u913r28v13r0j213q1l913q0xn13q1zu13q1c813p2ef13p0om13p1qt13p25f13o0fm13o1ht13o0u713o1we13n2az13n0l613n1nd13m21z13m1ed13m2gk13m0qr13l1sy13l27j13l0hq13l1jx13k0wc13k1yj13k2d413j0nb13j1pi13j24313i1gh13i0sw13i1v313h29o13h0jv13h1m213h0yg13g20n13g1d113g2f913g0pg13g1rn13f26813f0gf13f1im13e0v013e1x713e2bt13e0m013d1o713d22s13d1f613c0rk13c1tr13c28d13b0ik13b1kr13b0x513b1zc13a2dx13a0o413a1qb13924x1390f41391hb1390tp1391vw1382ah1380ko1381mv13721h1371dv1372g21370q91361sg1362711360h81361jf1350vt1351y11352cm1340mt1341p013423l1331fz1330se1331ul1322961320jd1321lk1322051311cj1312eq1310oy1311r513025q1300fx1301i41300ui1301wp12z2ba12z0li12z1np12y22a12y1eo12y2gv12y0r212x1t912x27u12x0i212x1k912w1yu12w2df12v0nm12v1pt12v24e12u1gt12u0t712u1ve12u29z12t0k612t1md12t20y12s2fk12s0pr12s1ry12r26j12r0gq12r1ix12r1xi12q2c412q0mb12q1oi12p23312p1fh12p2ho12p0rv12p1u212o28o12o0iv12o1l212n1zn12n2e812n0of12m1qn12m25812m0ff12m1hm12l0u012l1w712l2as12l0kz12k1n712k21s12k1e612j2gd12j0qk12j1sr12j27c12j0hj12i1jr12i1yc12h2cx12h0n412h1pb12h23w12g1gb12g0sp12g1uw12f29h12f0jo12f1lv12f0y912f20g12e1cv12e2f212e0p912e1rg12d26112d0g812d1if12d1x012c2bm12c0lt12c1o012b22l12b1ez12b0rd12b1tk12a28612a0id12a1kk1291z51292dq1290nx1291q412824q1281h41270ti1271vp1272aa1270kh1271mo1260z312621a1261do1262fv1250q21251s912526u1250h11251j81240vn1241xu1242cf1230mm12323e1231fs1220s71221ue12228z1210j61211ld1211zy1202ek1200or1201qy12025j11z0fq11z1hx11z0ub11z1wi11y2b411y0lb11y1ni11y22311x1eh11x0qv11x1t211w27o11w0hv11w1k211w0wg11w1yn11v2d811v0nf11v1pm11u24811u1gm11u0t011u1v711t29s11t0jz11t1m611t20s11s2fd11s0pk11r26c11r0gj11r1iq11r0v411r1xc11q2bx11q0m411p22w11p1fa11p0rp11p1tw11o28h11o0io11o1kv11n1zg11n2e111n0o911n1qg11m25111m1hf11m0tt11m1w011l2al11l0kt11k21l11k1dz11k0qd11k1sk11j27511j0hd11j1jk11i1y511i2cq11i0mx11i1p411h23p11h1g411h0si11g1up11g29a11g0jh11g1lo11f20911f2ev11f0p211e25u11e0g111e1i811e0um11d1wt11d2bf11d0lm11c22e11c1es11c0r611c1td11b27z11b0i611b1kd11a1yy11a2dj11a0nq11a1py11924j1191gx1190tb1181vi1182a31180ka1172131170pv11626n1160gu1161j21151xn1152c81150mf1142371141fm1142ht1140s01141u711328s1130iz1131l61121zr1121c61122ed1120ok1121qr11125c1110fj1111hq1110u41111wb1102ax1100l410z21w10z1ea10z0qo10z1sv10y27h10y0ho10y1jv10y1yg10x2d110x0n810x1pf10w24110w0st10w1v010v29l10v0js10v20l10u1cz10u0pd10t26510t0gc10t1x510s2bq10s0lx10s22p10r0ri10r1tp10q28a10q0ih10q1ko10q1z910p1bn10p2dv10p0o210p1q910p24u10o0tm10o1vt10o2af10n0km10n21e10n1ds10m0q610m26z10m0h610l1xy10l2cj10k0mq10k23j10j0sb10j1ui10j29310j0ja10j1lh10i20310i1ch10i0ov10h1r210h25n10h0fu10h1i110g1wn10g2b810g0lf10g1nm10f22710f0r010e1t710e27s10e0hz10e1k610d1yr10d2dc10d0nk10d1pr10c24c10c0t410c1vb10b29w10b0k410b1mb10a20w10a1da10a0po10926g1090go1091iv1091xg1082c11080m81081of1082301070rt1071u010728l1060is1061zk1061bz1050od1051qk1052551041w41042aq1040kx1031n410321p1020qh10227a1020hh1021jo1011y91012cu1010n11011p910023u1000sm0zz1ut0zz29e0zz0jl0zz1lt0zy20e0zy1cs0zy0p60zy1rd0zx25y0zx0g50zx1wy0zw0lq0zw1nx0zw22i0zv2h40zv0rb0zv1ti0zu2830zu0ia0zu1z20zu1bh0zt0nv0zt1q20zt24n0zs1vm0zs2a80zs0kf0zr1mm0zr2170zr1dl0zq0pz0zq26s0zq0gz0zp1xr0zp0mj0zp1oq0zo23c0zo0s40zo1ub0zn28w0zn0j30zm1zw0zm1ca0zm0oo0zm1qv0zl25g0zl1wg0zk0l80zk1nf0zk2200zj0qt0zj1t00zj27l0zj0hs0zi1jz0zi1yk0zi2d60zh0nd0zh1pk0zh2450zg1v40zg29q0zg0jx0zg1m40zf20p0zf1d30zf0ph0zf1ro0ze26a0ze0gh0ze1x90zd2bu0zd0m10zd1o80zc22u0zc0rm0zc1tt0zb28e0zb0il0zb1ze0za1bs0za0o60za1qd0za24y0z91vy0z92aj0z90kq0z81mx0z821i0z82g30z80qb0z72730z70ha0z61y20z60mv0z61p20z523n0z51g10z50sf0z51um0z42970z40jf0z42070z31cl0z30oz0z31r60z325r0z21wr0z22bc0z10lj0z122b0z11eq0z12gx0z00r40z01tb0z027w0z00i30yz1yv0yz2dh0yz0no0yz1pv0yy24g0yy1gu0yy1vf0yx2a10yx0k80yx2100yw0ps0yw1rz0yw26l0yv0gs0yv1xk0yu0mc0yu1ok0yu2350yu1fj0yt0rx0yt1u40yt28p0yt0iw0yt1l40ys1zp0ys0oh0ys1qo0yr2590yr1w90yq2au0yq0l10yq1n80yq21t0yp1e80yp2gf0yp0qm0yp1st0yo27e0yo0hl0yo1yd0yn0n60yn1pd0yn23y0yn1gc0ym1ux0ym29j0ym0jq0yl20i0yl1cw0yl2f30yl0pa0yl1rh0yk2630yk1x20yj0lu0yj1o10yj22n0yi1f10yi0rf0yi1tm0yi2870yh0ie0yh1z70yg0nz0yg1q60yg24r0yf1vr0yf2ac0yf0kj0ye21b0ye1dp0ye0q40ye1sb0yd26w0yd1xv0yc0mo0yc1ov0yc23g0yb1fu0yb1uf0yb2910yb0j80ya2000ya1ce0ya0os0y91qz0y925l0y81wk0y82b50y80lc0y72250y71ej0y70qx0y71t40y627p0y60hw0y61yp0y50nh0y51po0y52490y51gn0y41v90y429u0y40k10y320t0y31d70y30pm0y31rt0y226e0y21xd0y10m60y11od0y122y0y01fc0y01tx0y028i0xz0iq0xz1zi0xz1bw0xy0oa0xy1qh0xy2520xy1hh0xx1w20xx2an0xx0ku0xw21m0xw1e10xw0qf0xw1sm0xv2770xv1jl0xv1y60xu0mz0xu1p60xu23r0xu1g50xt1uq0xt29c0xt0jj0xs20b0xs1cp0xs0p30xs1ra0xr25w0xr1ia0xr1wv0xq2bg0xq0ln0xq1nv0xq22g0xp1eu0xp0r80xp1tf0xp2800xo1kf0xo1z00xo1be0xo0ns0xn1pz0xn24k0xn1gz0xm1vk0xm2a50xm0kc0xm1mj0xm2140xl1dj0xl0px0xl1s40xl26p0xk1xo0xj0mh0xj1oo0xj2390xj1fn0xi1u80xi28u0xi0j10xi1l80xh1zt0xh1c70xh0ol0xh1qs0xg25e0xg1hs0xg1wd0xf2ay0xf0l50xf1nc0xf21y0xf1ec0xe0qq0xe1sx0xe27i0xe1jw0xd1yi0xd0na0xd1ph0xc2420xc1gg0xc1v20xb29n0xb0ju0xb1m10xb20m0xb1d00xa2670xa1il0x91x60x92bs0x90lz0x91o60x822r0x81f50x81tq0x728c0x71kq0x71zb0x61bp0x61qa0x624w0x51ha0x51vv0x52ag0x50kn0x51mu0x421g0x41du0x41sf0x32700x31je0x31y00x20ms0x21oz0x223k0x11fy0x11uk0x12950x10jc0x01lj0x02040x01ci0x01r40wz25p0wz1i30wz1wo0wy2b90wy0lh0wy2290wx1en0wx1t80wx27t0ww1k80ww1yt0ww1b70ww1ps0wv24d0wv1gs0wv1vd0wu29y0wu0k50wu1mc0wu20x0wt1dc0wt26i0ws1iw0ws1xh0ws0ma0wr1oh0wr2320wr1fg0wr1u10wq28n0wq1l10wq1zm0wp1c00wp1ql0wp2570wo1hl0wo1w60wo2ar0wo0ky0wn1n60wn21r0wn1e50wn1sq0wm27b0wm1jq0wm1yb0wl1ap0wl1pa0wl23v0wk1ga0wk1uv0wk29g0wk0jn0wj1lu0wj20f0wj1cu0wj1rf0wi2600wi1ie0wi1wz0wh0ls0wh22k0wg1ey0wg0rc0wg2850wg1kj0wf1z40wf1bi0wf1q30we24p0we1h30we1vo0wd2a90wd0kg0wd1mn0wd2190wc1dn0wc26t0wc1j70wb1xt0wb1a70wb0ml0wb1os0wa23d0wa1fr0wa1ud0w928y0w91lc0w91zx0w91cb0w81qx0w825i0w81hw0w71wh0w72b30w70la0w71nh0w62220w61eg0w527n0w51k10w51ym0w51b00w41pl0w42470w41gl0w31v60w329r0w30jy0w31m50w220r0w21d50w21rq0w126b0w11ip0w11xb0w00m30w022v0w01f90vz28g0vz1ku0vy1zf0vy1bt0vy1qf0vy2500vx1he0vx2ak0vx0ks0vw1mz0vw21k0vw1dy0vv2740vv1jj0vv1y40vu1ai0vu1p30vu23o0vt1g30vt2990vt1ln0vs2080vs1cn0vs1r80vr25t0vr1i70vr1ws0vq0ll0vq1ns0vq22d0vq1er0vp1tc0vp27y0vp1kc0vo1yx0vo1bb0vo1pw0vn24i0vn1gw0vm2a20vm1mh0vm2120vm1dg0vl1s10vl26m0vl1j10vk1xm0vk1a00vk0me0vk2360vj1fl0vj1u60vj28r0vi1l50vi1zq0vi1c50vh1qq0vh25b0vh1hp0vg0l30vg1na0vg21v0vf1e90vf1su0vf27g0vf1ju0ve1yf0ve1at0ve1pe0vd2400vd1ge0vc29k0vc1ly0vc20k0vc1cy0vb1rj0vb2640vb1ii0va19i0va0lw0v922o0v91f20v90rh0v91to0v92890v81kn0v81z80v81bm0v71q80v724t0v71h70v61ms0v621d0v51dr0v51sc0v526y0v41jc0v41xx0v41ab0v40mp0v41ow0v31fw0v30sa0v31uh0v22920v21lg0v22020v21cg0v11r10v125m0v11i00v00le0v01nl0uz2260uz1ek0uz1t60uz27r0uy1k50uy1yq0uy1b40ux1pq0ux24b0ux1gp0uw1ma0uw20v0uv1d90uv0pn0uv1ru0uv26f0uv1iu0uu19t0uu0m70ut1fe0ut1tz0us28k0us1ky0us1zj0us1by0ur1qj0ur2540ur1hi0uq0kw0uq1n30uq21o0up1e20up1sn0up2790uo1jn0uo1am0uo0n00uo1p70un23t0un1g70un0sl0um1ls0um20d0um1cr0ul0p50ul1rc0ul25x0ul1ic0uk0lp0uk1nw0uj1ew0uj1th0ui1kg0ui1z10ui1bg0uh1q10uh24m0uh1h00ug1ml0ug2160uf1dk0uf1s50uf26r0uf1j50ue1a40ue0mi0ud1fp0uc1l90uc1zv0uc1c90ub1qu0ub25f0ub1ht0ub0u80ua0l70ua1ne0u91ed0u91sz0u81jy0u81yj0u81ax0u80nc0u81pj0u72440u71gi0u61m30u620o0u61d20u50pg0u51rn0u52690u51in0u419m0u40m00u41o70u31f70u328d0u21kr0u21zd0u21br0u20o50u21qc0u124x0u11hb0u01mw0u01dv0tz1sh0tz2720tz1jg0ty1af0ty0mu0tx1g00tw1ll0tw2060tw1ck0tw0oy0tw1r50tv25q0tv1i50tu1np0tu1ep0tt1ta0tt1k90ts1yu0ts1b90ts0nn0ts1pu0tr24f0tr1gt0tq1me0tq1dd0tq1ry0tp26k0tp1iy0to19x0to0mb0to1oi0to1fi0tn1l30tm1zo0tm1c20tm0og0tm1qn0tl2580tl1hn0tk1n70tk1e70tj27d0tj1jr0ti1ar0ti0n50ti1gb0th1lw0tg20h0tg1cv0tg0p90tg1rg0tg2620tf1ig0tf19f0tf2bm0te1o00te1f00td1kk0td1z60tc1bk0tc1q50tc1h40tb1mp0ta1do0ta0q30ta1sa0ta26v0t91j90t91a80t81ou0t81ft0t71le0t71zz0t71cd0t60or0t61qy0t625k0t61hy0t51ni0t41ei0t427o0t31k20t31b20t21gm0t11m70t11d60t00pk0t026d0t01ir0sz19q0sz1oc0sy1fb0sy1kw0sx1zh0sx1bv0sx1qg0sw1hg0sv1n00sv1e00sv0qe0su2760su1jk0st1ak0st1p50ss1g40ss1lp0sr20a0sr1co0sq25v0sq1i90sp1nt0sp1et0so27z0so1ke0so1yz0sn1bd0sn1gy0sm1mi0sl1di0sl0pw0sl26o0sk1j20sk1a20sj1on0sj1fm0si1l70si1zs0si1c60sh25d0sh1hr0sg1nb0sf1eb0sf0qp0sf27h0se1jv0se1av0se1pg0sd1gf0sc1m00sc1cz0sb1ik0sa19j0sa1o50s91f40s928b0s91kp0s81za0s81bo0s71h90s61mt0s61dt0s60q70s526z0s51jd0s41ad0s42ck0s41oy0s41fx0s31li0s22030s21ch0s11i20s10ug0s11nn0s01em0rz27s0rz1k70rz0wl0rz1b60ry1pr0ry1gr0ry0t50rx1mb0rw1db0rw1rw0rw1iv0rv0v90rv1og0ru1ff0rt1l00rt1zl0rt1bz0rs1qk0rs1hk0rs0ty0rr1n40rr1e40rq0qi0rq27a0rq1jp0rq0w30rp1ao0rp2cv0rp1p90ro1g90ro1lt0rn1ct0rn1re0rm1id0rm0ur0rl1ny0rl1ex0rk1ki0rk0ww0rj1bh0rj1q20rj1h20ri0tg0ri1mm0rh1dm0rg1j60rg0vl0rf1or0rf1fq0re1lb0re1ca0rd1qw0rd25h0rd1hv0rd0u90rc1ng0rb1ef0rb1k00ra0we0ra1az0ra1pk0r91gk0r90sy0r81m40r81d40r71rp0r71io0r70v20r61o90r61f80r50rm0r51kt0r50x70r41bs0r41qe0r31hd0r30tr0r31my0r21dx0r11ji0r10vw0r12co0r01p20r01g20r00sg0qz1lm0qz2070qy1cm0qy1r70qy25s0qy1i60qx0uk0qx1nr0qw1eq0qv1kb0qv0wp0qv1ba0qv1pv0qu1gv0qu0t90qt1mf0qt1df0qs1j00qs0ve0qr1ok0qq1fk0qq1l40qp0xi0qp1c40qp1qp0qo1ho0qo0u20qn1n90qn1e80qm1jt0qm0w70ql1pd0ql1gd0ql0sr0qk1lx0qk0yc0qj1cx0qj1ri0qj2630qj1ih0qi0uw0qi1o20qg1km0qg0x00qg1bl0qf1q70qf24s0qf1h60qf0tk0qe2ad0qe1mr0qe0z50qd1jb0qd0vp0qc1ov0qb1fv0qb1lf0qa0xt0qa1r00q91hz0q90ud0q81nk0q71k40q70wi0q61pp0q61go0q50t20q529u0q51m90q50yn0q426e0q31it0q30v70q31od0q11kx0q10xb0q01qi0q02530q01hh0q00tv0pz1n20pz0zg0py1jm0py0w00px1p60pw0sk0pw1lq0pv0y50pu1ib0pu0up0pt1nv0ps1kf0ps0wt0pr1q00pr1gz0pq0td0pq2a60pq1mk0pq0yy0pp26q0po1j40po0vi0po1oo0pm1l80pm0xn0pl25e0pl1hs0pl0u70pk1nd0pk0zr0pj1jx0pi0wb0pi1pi0ph0sv0ph29o0ph1m20pg0yg0pf2680pf1im0pf0v00pe1o60pd28c0pd1kq0pd0x40pc1qb0pc1ha0pb0to0pb2ah0pb1mv0pb0z90p91jf0p90vt0p92cl0p91p00p80sd0p72950p71lk0p70xy0p625p0p61i40p60ui0p51no0p41k80p30wm0p31pt0p21gs0p20t60p229z0p21md0p10yr0p026j0p01ix0p00vb0oz1oh0oz0rv0oy28n0oy1l10oy0xg0ox1hm0ow0u00ow1n60ow0zk0ou1jq0ou0w40ou1pb0ot0so0os29h0os1lv0os0y90os2f10or2610or1if0or0ut0oq1nz0oq10e0op1kj0oo0wy0on1h30on0ti0on2aa0on1mo0om0z20ol26u0ol1j80ol0vm0ok1ot0ok1170ok0s60oj28z0oj1ld0oj0xr0oi1hx0oh0ub0oh1nh0oh0zv0of1k10of0wf0oe0sz0od29s0od1m60od0yk0oc26c0oc1iq0oc0v40ob1ob0ob10p0oa0ro0oa1kv0o90x90o81hf0o80tt0o71mz0o70zd0o72g60o62750o61jj0o60vx0o51p40o511i0o50sh0o429a0o41lo0o40y20o31i80o20um0o22be0o21ns0o21070o12gz0o01kc0o00wr0nz12b0nz0tb0ny2a30ny1mh0ny0yv0ny2fo0nx26n0nx1j10nx0vf0nw1om0nw1100nv2hs0nv0rz0nv1l60nu0xk0nu1350nt1hq0nt0u40ns1na0ns0zp0ns2gh0nr1ju0nr0w90nq11t0nq0st0np1lz0np0yd0no1ij0nn0ux0nn1o40nn10i0nm2ha0nm0rh0nl1ko0nl0x20nk12m0nk0tm0nj1ms0nj0z60ni1jc0ni0vq0nh11b0ng2i30ng0sa0ng1lh0nf0xv0nf13g0ne1i10ne0uf0nd1nm0nd1000nd2gs0nc27r0nc1k60nc0wk0nb1240nb2ix0na0t40na1ma0na0yo0n91490n81iu0n80v80n81of0n710t0n72hl0n70rs0n61kz0n60xd0n512y0n51hj0n50tx0n41n30n40zi0n31jn0n20w20n211m0n12if0n10sm0n11ls0n00y60mz13r0mz1ic0mz0uq0my1nx0my10b0my2h30mx2830mx1kh0mx0wv0mw12g0mv0tf0mv1ml0mv0z00mt1j50mt0vk0mt1oq0ms1140ms2hw0ms0s40mr28w0mr1la0mr0xo0mq1390mq1hu0mq0u80mp2b10mp1nf0mp0zt0mo1jz0mn0wd0mn2d50mn11x0mm2iq0mm0sx0ml1m30ml0yh0mk1420mk1in0mk0v10mj1o80mj10m0mj2he0mi1ks0mi0x60mh12r0mg0tq0mg1mx0mf0zb0me1jh0me0vv0me2cn0md11f0md0sf0mc1ll0mc0xz0mb13k0mb1i50ma0uj0ma2bc0ma1nq0ma1040m81ka0m80wo0m71290m70t80m61me0m60yt0m51iy0m50vd0m41oj0m410x0m31l30m20xh0m11320m10u10m01n80m00zm0lz1js0lz0w60ly11r0lx0sq0lx1lw0lw0yb0lv1ig0lv0uv0lu1o10lu10f0lt1kl0lt0wz0ls12k0ls0tj0lr1mq0lr0z40lp1ja0lp0vo0lp1ou0lo1180ln1le0ln0xs0lm13d0lm1hy0lm0uc0ll1nj0ll0zx0lk1k30lj0wh0lj1220li0t10lh1m80lh0ym0lh2fe0lh1rs0lg1is0lg0v60lf1oc0lf10q0le2hj0le1kw0le0xa0ld12v0lc0tu0lb1n10lb0zf0la1jl0la0vz0l91p50l911k0l81lp0l80y40l72ew0l61i90l60uo0l61nu0l51080l41ke0l40ws0l312d0l30tc0l21mj0l20yx0l12fp0l11j30l00vh0l01on0kz1120kz2hu0ky1l70ky0xm0ky2ee0kx1360kx1hr0kx0u60kw1nc0kw0zq0kv1jw0ku0wa0ku2d30ku11v0ks1m10ks0yf0ks2f70ks1rl0kr1il0kr0uz0kq1o50kq10j0kp2hc0kp1kp0ko0x30ko2dw0ko12o0kn0tn0km1mu0km0z80km2g00kl1je0kl0vs0kk2ck0kk1oz0kk11d0kj2i50kj1lj0kj0xx0ki2ep0ki1r30kh1i30kh0uh0kg1nn0kg1010kf1k70kf0wl0ke2de0ke2rz0ke1260kd1mc0kd0yq0kc2fi0kb1iw0kb0va0kb2c20ka1og0ka10v0ka2hn0k91l00k90xf0k82e70k81ql0k812z0k81hk0k71n50k70zj0k62gc0k51jp0k50w30k52cw0k42rh0k411o0k42ig0k31lu0k30y80k22f00k21re0k21ie0k10us0k11ny0k110d0k02h50jz1ki0jz0wx0jz2dp0jy12h0jx1mn0jx0z10jw2ft0jw1j70jv0vl0jv2ce0jv1160ju2hy0jt1lc0jt0xq0jt2ei0js1qw0js1hw0jr1ng0jr0zu0jq2gn0jq1k00jp0we0jp2d70jo11z0jo2ir0jn1m50jn0yj0jn2fb0jm1ip0jm0v30jl2bv0jl10o0jk2hg0jj1ku0jj0x80jj2e00jj1qe0ji12s0jh1my0jh0zc0jg2g50jg1ji0jf0vw0jf2cp0jf11h0je2i90jd1ln0jd0y10jd2et0jc1r70jc1i70jc0ul0jb2bd0jb1060ja2gy0ja1kb0j90wq0j92di0j812a0j82j30j71mg0j70yu0j72fn0j61j00j60ve0j52c70j510z0j42hr0j31l50j30xj0j32eb0j31qp0j12av0j11n90j10zo0j02gg0j01jt0iz0w80iz2d00iz11s0iy2ik0ix1ly0ix2o50ix0yc0ix2f40iw1ii0iw0uw0iv2bp0iv10h0iu2h90it1kn0it0x10it2dt0it1q70is2je0ir2ad0ir1mr0ir0z50iq2fy0iq1jb0ip0vp0ip2ci0ip11a0io2i20in1lg0in0xu0in2em0im1r10im1i00il2b60il1nl0il0zz0ik2gr0ij1k50ij0wj0ij2db0ii2iw0ih29v0ih1m90ih0yn0ig2fg0ig1it0if0v70if2c00ie10s0ie2hk0id1ky0id0xc0ic2e40ic1qi0ic2jp0ib2ao0ib1n20ib0zh0ia2g90i91jm0i90w10i92ct0i82ie0i71lr0i70y50i62ey0i51ib0i50up0i52bi0i410a0i42h20i31kg0i30wu0i22dm0i12j70i12a60i11mk0i00yz0i02fr0hz1j40hz0vj0hy2cb0hx2hv0hx1l90hw0xn0hw2ef0hv2k00hu2b00hu0zs0hu2gk0ht1jy0ht0wc0hs2d40hr2ip0hr29o0hq1m20hq0yg0hq2f90hp1im0hp0v00ho2bt0hn2hd0hm1kr0hm0x50hm2dx0hl2ji0hk2ah0hk1mw0hk0za0hj2g20hi1jg0hi0vu0hi2cm0hh2i70hg1lk0hg0xy0hf2er0he2kb0he0ui0he2bb0hd1030hd2gv0hc1k90hc0wn0hb2df0ha2j00ha29z0h91md0h90ys0h92fk0h81ix0h80vc0h72c40h62hp0h51l20h50xg0h52e90h42jt0h32at0h30zl0h22gd0h11jr0h10w50h12cx0h02ii0gz1lv0gz0ya0gy2f20gx2km0gx0uu0gx2bm0gw2h60gv1kk0gv0wy0gu2dq0gt2jb0gt2ab0gs0z30gs2fv0gr1j90gr0vn0gq2cf0gp2i00go1ld0go0xr0go2ek0gn2k40gm0ub0gm2b40gm0zw0gl2go0gk1k20gk0wg0gj2d80gi2it0gi1m70gh0yl0gh2fd0gg0v50gf2bx0ge2hi0ge1kv0gd0x90gd2e20gc2jm0gb2am0gb0ze0ga2g60g91jk0g90vy0g92cq0g82ib0g71lo0g70y30g62ev0g52kg0g50un0g42bf0g32h00g31kd0g20wr0g12j40g00yw0fz2fo0fy1j20fy0vg0fy2c80fx2ht0fw1l60fw0xl0fu2jx0fu0u50ft2ax0fs2gh0fs1jv0fr0w90fq2im0fp0ye0fn0uy0fn2bq0fm2hb0fk0x20fj2jf0fi2af0fg1jd0fg0vr0ff2i40fc0ug0fa2gt0f90wk0f82ix0f50v90f32hm0f20xe0f10ty0ey0w20ew2if0ev0y70et0ur0es2h40er0ww0ep2j80em0vk0el2hx0ej0xp0ei0u90ef0wd0ed2iq0ea0v20e80x70e60tr0e30vv0dz0uk0dw0wp0dr0vd0dq2qr0dm0u20di2ij0df0uv0de2q90da0tk0d70vo0d20ud0d12pr0cu0v60cp0tv0co2p90ch0uo0cc0td0cb2oq0c40u60bw0uz0bq0to0bi0uh0bc0t60b91xi0b40tz0av0ut0ap0th0ag0ua0a00ts09q0um';
  var land = [];
  for (var li = 0; li < LAND.length; li += 6) {
    land.push([parseInt(LAND.substr(li, 3), 36) / 10 - 90, parseInt(LAND.substr(li + 3, 3), 36) / 10 - 180]);
  }
  var GR = 1.3, LON0 = 71;
  function ll(lat, lon, r) {
    var la = lat * Math.PI / 180, lo = (lon - LON0) * Math.PI / 180;
    return [Math.cos(la) * Math.sin(lo) * r, Math.sin(la) * r, Math.cos(la) * Math.cos(lo) * r];
  }
  var HOME = [38.56, 68.78]; // Dushanbe
  var MARKETS = [[47.37, 8.54], [41.01, 28.98], [55.76, 37.62], [31.23, 121.47], [35.68, 139.69], [25.2, 55.27], [28.61, 77.21], [52.52, 13.4]];
  function slerp(a, b, t) {
    var dot = clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1);
    var om = Math.acos(dot), so = Math.sin(om);
    if (so < 1e-5) return a.slice();
    var k0 = Math.sin((1 - t) * om) / so, k1 = Math.sin(t * om) / so;
    return [a[0] * k0 + b[0] * k1, a[1] * k0 + b[1] * k1, a[2] * k0 + b[2] * k1];
  }
  var homeV = ll(HOME[0], HOME[1], 1);
  function stageGlobe(out) {
    var r = rnd();
    out.g = 0; out.arc = -1;
    if (r < 0.4) {
      var d = land[Math.floor(rnd() * land.length)];
      var p = ll(d[0], d[1], GR);
      out.p = [p[0] + (rnd() - 0.5) * 0.012, p[1] + (rnd() - 0.5) * 0.012, p[2] + (rnd() - 0.5) * 0.012];
      out.c = mix(GOLD, IVORY, 0.25 + rnd() * 0.35);
      out.s = 0.024;
    } else if (r < 0.6) {
      var dd = randDir();
      out.p = mul(dd, GR * 0.995);
      out.c = mul(OCEAN, 0.7 + rnd() * 0.5);
      out.s = 0.016;
    } else if (r < 0.68) {
      // graticule every 30°
      var g = rnd() < 0.5, lat, lon;
      if (g) { lat = (Math.floor(rnd() * 5) - 2) * 30; lon = rnd() * 360 - 180; }
      else { lon = Math.floor(rnd() * 12) * 30 - 180; lat = rnd() * 160 - 80; }
      out.p = ll(lat, lon, GR * 1.002);
      out.c = mul(GOLD, 0.35 + 0.25 * rnd());
      out.s = 0.011;
    } else if (r < 0.93) {
      var m = Math.floor(rnd() * MARKETS.length);
      var b = ll(MARKETS[m][0], MARKETS[m][1], 1);
      var t = rnd();
      var om = Math.acos(clamp(homeV[0] * b[0] + homeV[1] * b[1] + homeV[2] * b[2], -1, 1));
      var lift = 1 + Math.sin(Math.PI * t) * (0.06 + 0.38 * om / Math.PI);
      var q = mul(slerp(homeV, b, t), GR * lift);
      out.p = [q[0] + (rnd() - 0.5) * 0.01, q[1] + (rnd() - 0.5) * 0.01, q[2] + (rnd() - 0.5) * 0.01];
      out.c = GOLD_BRIGHT;
      out.s = 0.019;
      out.g = 0.8;
      out.arc = m + t * 0.999;
    } else {
      var isHome = rnd() < 0.4;
      var c = isHome ? HOME : MARKETS[Math.floor(rnd() * MARKETS.length)];
      var cp = ll(c[0], c[1], GR * 1.01);
      var jd = randDir(), jr = (isHome ? 0.07 : 0.035) * Math.sqrt(rnd());
      out.p = [cp[0] + jd[0] * jr, cp[1] + jd[1] * jr, cp[2] + jd[2] * jr];
      out.c = isHome ? [1, 0.98, 0.9] : GOLD_BRIGHT;
      out.s = isHome ? 0.04 : 0.03;
      out.g = 1;
      out.arc = -2;
    }
  }

  /* ---------- stage E: governance structure (structure page) ---------- */
  var ORG = [
    { p: [0, 1.22, 0.35], r: 0.2, c: GOLD_BRIGHT },
    { p: [0, 0.42, 0.18], r: 0.15, c: IVORY },
    { p: [1.05, 0.42, 0.18], r: 0.13, c: GOLD, dashed: 1 },
    { p: [0, -0.3, 0.02], r: 0.14, c: IVORY },
    { p: [-1.5, -1.12, -0.16], r: 0.11, c: GREEN_LIGHT },
    { p: [-0.75, -1.12, -0.16], r: 0.11, c: GREEN_LIGHT },
    { p: [0, -1.12, -0.16], r: 0.11, c: GREEN_LIGHT },
    { p: [0.75, -1.12, -0.16], r: 0.11, c: GREEN_LIGHT },
    { p: [1.5, -1.12, -0.16], r: 0.11, c: GREEN_LIGHT }
  ];
  var BAR_Y = -0.72;
  var EDGES = [[ORG[0].p, ORG[1].p], [[0, 0.42, 0.18], ORG[2].p, 1], [ORG[1].p, ORG[3].p],
    [ORG[3].p, [0, BAR_Y, -0.07]], [[-1.5, BAR_Y, -0.07], [1.5, BAR_Y, -0.07]]];
  for (var ei = 4; ei < 9; ei++) EDGES.push([[ORG[ei].p[0], BAR_Y, -0.07], ORG[ei].p]);
  function stageOrg(out) {
    var r = rnd();
    out.g = 0; out.arc = -1;
    if (r < 0.62) {
      var k = Math.floor(Math.pow(rnd(), 1.25) * ORG.length), n = ORG[k];
      var d = randDir(), shell = rnd() < 0.75;
      var rr = n.r * (shell ? 0.92 + rnd() * 0.08 : Math.cbrt(rnd()));
      out.p = [n.p[0] + d[0] * rr, n.p[1] + d[1] * rr, n.p[2] + d[2] * rr];
      var lit = 0.55 + 0.45 * Math.max(0, d[0] * -0.4 + d[1] * 0.6 + d[2] * 0.7);
      out.c = mul(n.c, lit * (shell ? 1 : 0.8));
      out.s = shell ? 0.03 : 0.024;
      if (k === 0) { out.arc = -2; out.g = 0.5; }
    } else if (r < 0.72) {
      var h = Math.floor(rnd() * 4), nh = ORG[h], a = rnd() * Math.PI * 2, hr = nh.r * (1.7 + 0.1 * rnd());
      out.p = [nh.p[0] + Math.cos(a) * hr, nh.p[1] + Math.sin(a) * hr * 0.32, nh.p[2] + Math.sin(a) * hr * 0.6];
      out.c = mul(GOLD, 0.55 + 0.3 * rnd());
      out.s = 0.016; out.g = 0.6;
    } else if (r < 0.94) {
      var e = EDGES[Math.floor(rnd() * EDGES.length)], t = rnd();
      if (e[2] && Math.floor(t * 9) % 2) t = Math.floor(t * 9) / 9;
      out.p = [e[0][0] + (e[1][0] - e[0][0]) * t + (rnd() - 0.5) * 0.012,
               e[0][1] + (e[1][1] - e[0][1]) * t + (rnd() - 0.5) * 0.012,
               e[0][2] + (e[1][2] - e[0][2]) * t + (rnd() - 0.5) * 0.012];
      out.c = mul(GOLD, 0.7 + 0.3 * rnd());
      out.s = 0.018; out.g = 0.7;
      out.arc = Math.floor(rnd() * 7) + t * 0.999;
    } else {
      var dd = randDir(), sr = 1.3 + rnd() * 1.1;
      out.p = [dd[0] * sr * 1.3, dd[1] * sr * 0.8, dd[2] * sr * 0.6 - 0.3];
      out.c = mul(IVORY, 0.25 + 0.25 * rnd());
      out.s = 0.014;
    }
  }

  /* ---------- build geometry ---------- */
  var GEN = { cotton: stageCotton, yarn: stageYarn, fabric: stageFabric, globe: stageGlobe, org: stageOrg };
  var gens = NAMES.slice(0, 4).map(function (n) { return GEN[n] || stageCotton; });
  var hasOrg = NAMES.indexOf('org') > -1;

  var geo = new THREE.BufferGeometry();
  var A = new Float32Array(N * 3), B = new Float32Array(N * 3), C = new Float32Array(N * 3), D = new Float32Array(N * 3);
  var CA = new Float32Array(N * 3), CB = new Float32Array(N * 3), CC = new Float32Array(N * 3), CD = new Float32Array(N * 3);
  var SZ = new Float32Array(N * 4), GL = new Float32Array(N * 4), META = new Float32Array(N * 4), SC = new Float32Array(N * 3);
  var o = {};
  function put(arr, carr, i) { arr[i * 3] = o.p[0]; arr[i * 3 + 1] = o.p[1]; arr[i * 3 + 2] = o.p[2]; carr[i * 3] = o.c[0]; carr[i * 3 + 1] = o.c[1]; carr[i * 3 + 2] = o.c[2]; }
  for (var i = 0; i < N; i++) {
    var slots = [[A, CA], [B, CB], [C, CC], [D, CD]];
    META[i * 4 + 2] = -1;
    for (var k = 0; k < 4; k++) {
      o.u = 0; o.v = 0; o.arc = -1; o.g = 0;
      gens[k](o);
      put(slots[k][0], slots[k][1], i); SZ[i * 4 + k] = o.s; GL[i * 4 + k] = o.g;
      if (gens[k] === stageFabric) { META[i * 4] = o.u; META[i * 4 + 1] = o.v; }
      if (gens[k] === stageGlobe || gens[k] === stageOrg) META[i * 4 + 2] = o.arc;
    }
    META[i * 4 + 3] = rnd();
    var sd = randDir(), sr = 4 + rnd() * 5;
    SC[i * 3] = sd[0] * sr; SC[i * 3 + 1] = sd[1] * sr; SC[i * 3 + 2] = sd[2] * sr - 2;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(A, 3));
  geo.setAttribute('aPosB', new THREE.BufferAttribute(B, 3));
  geo.setAttribute('aPosC', new THREE.BufferAttribute(C, 3));
  geo.setAttribute('aPosD', new THREE.BufferAttribute(D, 3));
  geo.setAttribute('aColA', new THREE.BufferAttribute(CA, 3));
  geo.setAttribute('aColB', new THREE.BufferAttribute(CB, 3));
  geo.setAttribute('aColC', new THREE.BufferAttribute(CC, 3));
  geo.setAttribute('aColD', new THREE.BufferAttribute(CD, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(SZ, 4));
  geo.setAttribute('aGlow', new THREE.BufferAttribute(GL, 4));
  geo.setAttribute('aMeta', new THREE.BufferAttribute(META, 4));
  geo.setAttribute('aScatter', new THREE.BufferAttribute(SC, 3));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 12);

  var uniforms = {
    uT: { value: 0 }, uTime: { value: 0 }, uIntro: { value: reduceMotion ? 1 : 0 },
    uPx: { value: 1000 }, uScale: { value: 1 }, uSpin: { value: 0 },
    uMotion: { value: reduceMotion ? 0 : 1 }, uOpacity: { value: 1 },
    uFabN: { value: new THREE.Vector3(FAB_N[0], FAB_N[1], FAB_N[2]) },
    uPulseAll: { value: hasOrg ? 1 : 0 },
    uGlowPass: { value: 0 },
    uFabW: { value: new THREE.Vector4(gens[0] === stageFabric ? 1 : 0, gens[1] === stageFabric ? 1 : 0, gens[2] === stageFabric ? 1 : 0, gens[3] === stageFabric ? 1 : 0) },
    uGlbW: { value: new THREE.Vector4(gens[0] === stageGlobe ? 1 : 0, gens[1] === stageGlobe ? 1 : 0, gens[2] === stageGlobe ? 1 : 0, gens[3] === stageGlobe ? 1 : 0) }
  };
  var glowUniforms = {};
  for (var key in uniforms) glowUniforms[key] = uniforms[key];
  glowUniforms.uGlowPass = { value: 1 };

  var vert = [
    'attribute vec3 aPosB; attribute vec3 aPosC; attribute vec3 aPosD;',
    'attribute vec3 aColA; attribute vec3 aColB; attribute vec3 aColC; attribute vec3 aColD;',
    'attribute vec4 aSize; attribute vec4 aGlow; attribute vec4 aMeta; attribute vec3 aScatter;',
    'uniform float uT, uTime, uIntro, uPx, uScale, uSpin, uMotion, uPulseAll, uGlowPass;',
    'uniform vec3 uFabN; uniform vec4 uFabW, uGlbW;',
    'varying vec3 vColor; varying float vAlpha; varying float vGlow; varying float vDepth;',
    'float ease(float x){ return x*x*(3.0-2.0*x); }',
    'vec3 rotY(vec3 p, float a){ float c=cos(a), s=sin(a); return vec3(c*p.x + s*p.z, p.y, -s*p.x + c*p.z); }',
    'vec3 rotX(vec3 p, float a){ float c=cos(a), s=sin(a); return vec3(p.x, c*p.y - s*p.z, s*p.y + c*p.z); }',
    'void main(){',
    '  float r = aMeta.w;',
    '  float e1 = ease(clamp(uT*1.5 - r*0.5, 0.0, 1.0));',
    '  float e2 = ease(clamp((uT-1.0)*1.5 - r*0.5, 0.0, 1.0));',
    '  float e3 = ease(clamp((uT-2.0)*1.5 - r*0.5, 0.0, 1.0));',
    '  vec4 w = vec4(1.0-e1, e1*(1.0-e2), e1*e2*(1.0-e3), e1*e2*e3);',
    '  vec3 wave = uFabN * (sin(aMeta.x*1.6 + uTime*0.9)*0.08 + sin(aMeta.y*2.1 - uTime*0.7)*0.05) * uMotion;',
    '  float fab = dot(uFabW, w);',
    '  float glb = dot(uGlbW, w);',
    '  vec3 pa = position, pb = aPosB, pc = aPosC, pd = aPosD;',
    '  if (uGlbW.x > 0.5) pa = rotX(rotY(pa, uSpin), 0.45); if (uGlbW.y > 0.5) pb = rotX(rotY(pb, uSpin), 0.45);',
    '  if (uGlbW.z > 0.5) pc = rotX(rotY(pc, uSpin), 0.45); if (uGlbW.w > 0.5) pd = rotX(rotY(pd, uSpin), 0.45);',
    '  vec3 p = pa*w.x + pb*w.y + pc*w.z + pd*w.w + wave * fab;',
    '  vec3 dir = normalize(aScatter);',
    '  float mid = sin(3.14159*e1) + sin(3.14159*e2) + sin(3.14159*e3);',
    // morph: the cloud swirls and breathes out, then settles into the next shape
    '  p = rotY(p, mid * 1.1);',
    '  p += dir * mid * (0.3 + 0.4*r);',
    '  p += dir * sin(uTime*1.1 + r*6.2831) * (0.006 + 0.014*w.x) * uMotion;',
    '  float ie = clamp(uIntro*1.4 - r*0.4, 0.0, 1.0);',
    '  ie = 1.0 - pow(1.0-ie, 3.0);',
    '  p = mix(aScatter, p, ie);',
    '  vec3 col = aColA*w.x + aColB*w.y + aColC*w.z + aColD*w.w;',
    '  float size = dot(aSize, w);',
    '  float glow = dot(aGlow, w);',
    '  float face = smoothstep(-0.75, 0.35, p.z / 1.3);',
    '  col *= mix(1.0, 0.16 + 0.84*face, glb);',
    '  if (aMeta.z >= 0.0) {',
    '    float pulse = pow(fract(fract(aMeta.z) - uTime*0.3 + floor(aMeta.z)*0.37), 7.0);',
    '    col *= mix(1.0, 0.35 + 1.4*pulse, max(glb, uPulseAll));',
    '  } else if (aMeta.z < -1.5) {',
    '    col *= mix(1.0, 0.85 + 0.3*sin(uTime*2.2 + r*6.2831), max(glb, uPulseAll));',
    '  }',
    // gold dust twinkles
    '  float tw = 0.6 + 0.4*sin(uTime*(2.0 + 3.0*r) + r*40.0);',
    '  size *= mix(1.0, tw, glow) * mix(1.0, 1.0 + 0.6*mid, 1.0);',
    '  vColor = col;',
    '  vAlpha = ie;',
    '  vGlow = glow;',
    '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
    '  vDepth = clamp((-mv.z - 4.5) / 5.5, 0.0, 1.0);',
    '  gl_Position = projectionMatrix * mv;',
    '  float ps = size * uScale * uPx / -mv.z;',
    '  gl_PointSize = max(1.0, ps * mix(1.0, 3.4, uGlowPass));',
    '}'
  ].join('\n');

  var fragCore = [
    'precision mediump float;',
    'uniform float uOpacity;',
    'varying vec3 vColor; varying float vAlpha; varying float vGlow; varying float vDepth;',
    'void main(){',
    '  vec2 q = gl_PointCoord - 0.5;',
    '  float d = length(q);',
    '  if (d > 0.5) discard;',
    '  float a = 1.0 - smoothstep(0.3, 0.5, d);',
    // shade each point as a tiny sphere lit from the upper left
    '  float z = sqrt(max(0.0, 0.25 - d*d)) * 2.0;',
    '  vec3 n = normalize(vec3(q.x*2.0, -q.y*2.0, z));',
    '  vec3 L = normalize(vec3(-0.45, 0.6, 0.75));',
    '  float diff = 0.5 + 0.5*max(0.0, dot(n, L));',
    '  float spec = pow(max(0.0, dot(n, normalize(L + vec3(0.0, 0.0, 1.0)))), 16.0) * 0.3;',
    '  vec3 c = vColor * diff + spec * (0.6 + 0.4*vGlow);',
    '  c = mix(c, c * 0.5, vDepth * 0.7);',
    '  gl_FragColor = vec4(c, a * vAlpha * uOpacity * (1.0 - 0.45*vDepth));',
    '}'
  ].join('\n');

  var fragGlow = [
    'precision mediump float;',
    'uniform float uOpacity;',
    'varying vec3 vColor; varying float vAlpha; varying float vGlow; varying float vDepth;',
    'void main(){',
    '  float d = length(gl_PointCoord - 0.5);',
    '  if (d > 0.5) discard;',
    '  float halo = 0.1 + 0.9*vGlow;',
    '  float a = pow(1.0 - d*2.0, 2.4) * 0.5 * halo;',
    '  gl_FragColor = vec4(vColor * 1.15, a * vAlpha * uOpacity * (1.0 - 0.6*vDepth));',
    '}'
  ].join('\n');

  var matCore = new THREE.ShaderMaterial({
    uniforms: uniforms, vertexShader: vert, fragmentShader: fragCore,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.NormalBlending
  });
  var matGlow = new THREE.ShaderMaterial({
    uniforms: glowUniforms, vertexShader: vert, fragmentShader: fragGlow,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending
  });
  var group = new THREE.Group();
  var glowPts = new THREE.Points(geo, matGlow);
  var corePts = new THREE.Points(geo, matCore);
  glowPts.frustumCulled = corePts.frustumCulled = false;
  glowPts.renderOrder = 0; corePts.renderOrder = 1;
  group.add(glowPts); group.add(corePts);

  var scene = new THREE.Scene();
  var FOV = 35, CAMZ = 7;
  var camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 50);
  camera.position.set(0, 0, CAMZ);
  scene.add(group);

  /* ---------- layout & scroll ---------- */
  var marks = Array.prototype.slice.call(document.querySelectorAll('[data-stage]'));
  var vw = 1, vh = 1;
  function resize() {
    vw = canvas.clientWidth || innerWidth;
    vh = canvas.clientHeight || innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    camera.updateProjectionMatrix();
    uniforms.uPx.value = (vh * dpr) / (2 * Math.tan(FOV * Math.PI / 360));
  }
  window.addEventListener('resize', resize);
  resize();

  function smooth(e0, e1, x) { var t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }

  // Which shape the object should hold, how visible it should be and
  // whether the current section is one of the home value-chain steps.
  var cur = { stage: 0, op: 0.26, cycle: false, inMark: false };
  function readScroll() {
    if (!marks.length) { cur.stage = 0; cur.op = 1; return cur; }
    var vc = vh * 0.5, rects = marks.map(function (m) { return m.getBoundingClientRect(); });
    var centers = rects.map(function (r) { return r.top + r.height * 0.5; });
    var vals = marks.map(function (m) { return clamp(+m.getAttribute('data-stage') || 0, 0, 3); });
    var st = vals[0];
    if (vc > centers[0]) {
      st = vals[vals.length - 1];
      for (var k = 0; k < centers.length - 1; k++) {
        if (vc < centers[k + 1]) { st = vals[k] + (vals[k + 1] - vals[k]) * smooth(0.18, 0.82, (vc - centers[k]) / (centers[k + 1] - centers[k])); break; }
      }
    }
    cur.stage = st;
    var inside = -1;
    for (var j = 0; j < rects.length; j++) if (vc >= rects[j].top - vh * 0.1 && vc <= rects[j].bottom + vh * 0.1) { inside = j; break; }
    cur.inMark = inside >= 0;
    cur.cycle = inside >= 0 && marks[inside].classList.contains('cycle__step');
    cur.hero = inside >= 0 && marks[inside].classList.contains('hero');
    cur.back = inside >= 0 && marks[inside].getAttribute('data-place') === 'back';
    cur.op = inside >= 0 ? (cur.back ? 0.34 : 1) : 0.22;
    return cur;
  }

  var visH = 2 * Math.tan(FOV * Math.PI / 360) * CAMZ;
  var BASE = { cotton: 1.7, yarn: 1.9, fabric: 1.9, globe: 1.5, org: 2.4 };
  var pos = { sx: 0.75, sy: 0.5, rad: 100, op: 0 };
  function place(dt) {
    var wide = vw > 1024, sx, sy, rad, op;
    if (cur.inMark && cur.back) {
      // a large, faint backdrop behind centred content
      sx = 0.5; sy = 0.5; rad = wide ? Math.min(vw * 0.3, vh * 0.58) : Math.min(vw * 0.55, vh * 0.4); op = wide ? 0.34 : 0.26;
    } else if (!cur.inMark) {
      // between marked sections: a watermark peeking in from the right margin
      sx = wide ? 0.93 : 0.88; sy = wide ? 0.5 : 0.22; rad = wide ? Math.min(vw * 0.14, vh * 0.28) : Math.min(vw * 0.22, vh * 0.14); op = wide ? 0.22 : 0.15;
    } else if (wide) {
      sx = 0.75; sy = 0.5; rad = Math.min(vw * 0.19, vh * 0.34); op = 1;
      if (cur.hero) { sx = 0.73; sy = 0.52; }
    } else if (cur.cycle) {
      sx = 0.5; sy = 0.3; rad = Math.min(vw * 0.4, vh * 0.22); op = 1;
    } else {
      sx = 0.72; sy = 0.26; rad = Math.min(vw * 0.3, vh * 0.17); op = cur.hero ? 0.3 : 0.42;
    }
    var k = reduceMotion ? 1 : Math.min(1, dt * 4);
    pos.sx += (sx - pos.sx) * k; pos.sy += (sy - pos.sy) * k; pos.rad += (rad - pos.rad) * k; pos.op += (op - pos.op) * k;
    // the object's own scale follows the shape it is closest to
    var si = Math.round(clamp(cur.stage, 0, 3));
    var base = BASE[NAMES[si]] || 1.7;
    var visW = visH * (vw / vh);
    group.position.x = (pos.sx - 0.5) * visW;
    group.position.y = (0.5 - pos.sy) * visH;
    var sc = (pos.rad / vh * visH) / base;
    group.scale.setScalar(sc);
    uniforms.uScale.value = sc;
    uniforms.uOpacity.value = pos.op;
  }

  /* ---------- pointer parallax ---------- */
  var px = 0, py = 0, tx = 0, ty = 0;
  if (!reduceMotion) {
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5;
    }, { passive: true });
  }

  /* ---------- loop ---------- */
  var visible = true, running = false, last = performance.now(), t = 0, spinV = 0;
  var stage = readScroll().stage;
  pos.op = cur.op;
  var introStart = null;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start();
    }, { rootMargin: '100px' }).observe(root);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) start(); });

  function frame(now) {
    if (!visible || document.hidden) { running = false; return; }
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!reduceMotion) t += dt;
    if (introStart === null) introStart = now;
    if (!reduceMotion) uniforms.uIntro.value = clamp((now - introStart) / 2600, 0, 1);

    readScroll();
    stage += (cur.stage - stage) * (reduceMotion ? 1 : Math.min(1, dt * 3.5));
    uniforms.uT.value = stage;
    uniforms.uTime.value = t;
    uniforms.uSpin.value = Math.sin(t * 0.12) * 0.55;

    px += (tx - px) * Math.min(1, dt * 3); py += (ty - py) * Math.min(1, dt * 3);
    var si = Math.round(clamp(stage, 0, 3)), name = NAMES[si];
    var sway = reduceMotion ? 0 : Math.sin(t * 0.25) * 0.2;
    var slow = reduceMotion ? 0 : t * 0.06;
    var isOrg = name === 'org';
    // the object turns as the page scrolls and leans into fast scrolling
    var sv = (window.tajScroll && window.tajScroll.vel) || 0;
    spinV += (clamp(sv * 0.006, -0.5, 0.5) - spinV) * Math.min(1, dt * 4);
    var turn = reduceMotion || isOrg ? 0 : (window.scrollY || 0) * 0.0007;
    group.rotation.y = sway + px * 0.5 + (isOrg ? 0.28 : 0) + (name === 'yarn' || name === 'cotton' ? slow : 0) + turn + spinV;
    group.rotation.z = isOrg ? 0 : -spinV * 0.25;
    group.rotation.x = (isOrg ? -0.12 : 0) + py * 0.25 + (reduceMotion ? 0 : Math.sin(t * 0.18) * 0.05);
    place(dt);

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  function start() {
    if (running) return;
    running = true; last = performance.now();
    requestAnimationFrame(frame);
  }
  canvas.classList.add('is-ready');
  start();
})();
