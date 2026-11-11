// @ts-nocheck
/* Kalamata FC · Match Programme — 3D book engine (three.js r149).
   Pages are SkinnedMesh-free plane strips deformed on the CPU: each column is integrated along the
   page so the sheet bends like paper (edge leads while lifting, settles flat into the gutter). */
import * as THREE from 'three';

const T = THREE;

function stripesCanvas(w, h, border) {
  var c = document.createElement('canvas'); c.width = w; c.height = h;
  var x = c.getContext('2d');
  x.fillStyle = '#231f20'; x.fillRect(0, 0, w, h);
  var b = border ? Math.round(w * 0.018) : 0, n = 12, sw = (w - 2 * b) / n;
  for (var i = 0; i < n; i += 2) { x.fillStyle = '#ffffff'; x.fillRect(b + (i + 1) * sw, b, sw, h - 2 * b); }
  return c;
}

function spineCanvas() {
  var w = 256, h = 1024;
  var c = document.createElement('canvas'); c.width = w; c.height = h;
  var x = c.getContext('2d');

  var bgGrad = x.createLinearGradient(0, 0, w, 0);
  bgGrad.addColorStop(0, '#1a1718');
  bgGrad.addColorStop(0.2, '#231f20');
  bgGrad.addColorStop(0.5, '#292526');
  bgGrad.addColorStop(0.8, '#231f20');
  bgGrad.addColorStop(1, '#1a1718');
  x.fillStyle = bgGrad;
  x.fillRect(0, 0, w, h);

  var gGrad = x.createLinearGradient(0, 0, w, 0);
  gGrad.addColorStop(0, '#9e7534');
  gGrad.addColorStop(0.25, '#d2ab67');
  gGrad.addColorStop(0.5, '#fae8b4');
  gGrad.addColorStop(0.75, '#d2ab67');
  gGrad.addColorStop(1, '#9e7534');

  function drawGoldBand(y) {
    x.fillStyle = gGrad;
    x.fillRect(24, y, w - 48, 3.5);
    x.fillRect(40, y + 7, w - 80, 1.5);
  }

  drawGoldBand(60);
  drawGoldBand(220);
  drawGoldBand(800);
  drawGoldBand(950);

  x.fillStyle = gGrad;
  x.beginPath();
  x.moveTo(w / 2, 512 - 12);
  x.lineTo(w / 2 + 9, 512);
  x.lineTo(w / 2, 512 + 12);
  x.lineTo(w / 2 - 9, 512);
  x.closePath();
  x.fill();

  x.fillRect(w / 2 - 28, 511, 14, 2);
  x.fillRect(w / 2 + 14, 511, 14, 2);

  return c;
}

export function mountBook(container, opts) {
    opts = opts || {};
    var tex = opts.textures;
    var W = 1, H = 1.414, SEG = 40, YSEG = 10, K = 3;
    var CB = 0.016, OV = 0.018, TH = 0.0042, GAP = 0.0025;
    var NS = tex.pages.length / 2;           // sheets
    var reduce = !!opts.reducedMotion;
    var stageColor = opts.stage || '#e9e8e8';

    // ---------- renderer / scene ----------
    var renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding;
    // Linear mapping keeps printed greys true; lights below sum to ≈1.0 irradiance on a flat page.
    renderer.toneMapping = T.LinearToneMapping;
    renderer.toneMappingExposure = 0.98;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none';
    container.appendChild(renderer.domElement);

    var scene = new T.Scene();
    scene.background = new T.Color(stageColor);

    // neutral studio environment (no HDR file needed)
    var envScene = new T.Scene();
    var room = new T.Mesh(new T.BoxGeometry(10, 10, 10), new T.MeshBasicMaterial({ color: 0x8a8a8a, side: T.BackSide }));
    envScene.add(room);
    function panel(w, h, x, y, z, I) {
      var m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(I, I, I), side: T.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); envScene.add(m);
    }
    panel(5, 3, -2.5, 1.5, 4.5, 6); panel(3, 3, 4, 2, 2, 2.5); panel(6, 2, 0, -4.5, 3, 1.6); panel(8, 8, 0, 0, -4.9, 0.35);
    var pmrem = new T.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(envScene, 0.035).texture;

    var camera = new T.PerspectiveCamera(30, 1, 0.05, 30);

    scene.add(new T.HemisphereLight(0xffffff, 0xcfcac6, 0.36));
    var key = new T.DirectionalLight(0xffffff, 0.64);
    key.position.set(-1.8, 1.6, 4.2);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    var sc = key.shadow.camera; sc.left = -2.2; sc.right = 2.2; sc.top = 2.2; sc.bottom = -2.2; sc.near = 0.5; sc.far = 12;
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.015; key.shadow.radius = 4;
    scene.add(key);
    var fill = new T.DirectionalLight(0xffffff, 0.1); fill.position.set(2.5, -1, 2); scene.add(fill);

    var ground = new T.Mesh(new T.PlaneGeometry(30, 30), new T.ShadowMaterial({ opacity: 0.16 }));
    ground.position.z = -0.002; ground.receiveShadow = true; scene.add(ground);

    // soft contact shadow under the book
    var cs = document.createElement('canvas'); cs.width = cs.height = 128;
    var cx = cs.getContext('2d'), g = cx.createRadialGradient(64, 64, 8, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.55, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = g; cx.fillRect(0, 0, 128, 128);
    var contact = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: new T.CanvasTexture(cs), transparent: true, depthWrite: false, opacity: 0.32 }));
    contact.position.z = -0.001; scene.add(contact);

    // ---------- textures ----------
    var loader = new T.TextureLoader();
    var maxAniso = renderer.capabilities.getMaxAnisotropy();
    var pending = 0, loaded = 0;
    function load(url, flipU, linear) {
      pending++;
      var t = loader.load(url, function () { loaded++; if (opts.onProgress) opts.onProgress(loaded / pending); invalidate(); });
      if (!linear) t.encoding = T.sRGBEncoding;
      t.anisotropy = Math.min(8, maxAniso);
      if (flipU) { t.wrapS = T.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; }
      return t;
    }

    // paper grain (bump)
    var nc = document.createElement('canvas'); nc.width = nc.height = 256;
    var nx = nc.getContext('2d'), id = nx.createImageData(256, 256);
    for (var i = 0; i < id.data.length; i += 4) { var v = 110 + Math.random() * 40; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    nx.putImageData(id, 0, 0);
    var grain = new T.CanvasTexture(nc); grain.wrapS = grain.wrapT = T.RepeatWrapping; grain.repeat.set(5, 7);

    // paper edge lines (for page block sides)
    var ec = document.createElement('canvas'); ec.width = 8; ec.height = 64;
    var ex = ec.getContext('2d'); ex.fillStyle = '#f4f3f1'; ex.fillRect(0, 0, 8, 64);
    for (var r = 0; r < 64; r += 4) { ex.fillStyle = 'rgba(35,31,32,' + (0.08 + Math.random() * 0.1) + ')'; ex.fillRect(0, r, 8, 1); }
    var edgeTex = new T.CanvasTexture(ec); edgeTex.wrapS = edgeTex.wrapT = T.RepeatWrapping;

    var book = new T.Group(); scene.add(book);

    // ---------- leaves ----------
    function paperMat(map, side) {
      return new T.MeshStandardMaterial({ map: map, side: side, roughness: 0.86, metalness: 0, bumpMap: grain, bumpScale: 0.0009, envMapIntensity: 0.22, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    }
    var leaves = [];
    var pickables = [];

    // leaf 0: front cover (rigid board)
    var coverMask = load(tex.coverMask, false, true);
    var coverMat = new T.MeshPhysicalMaterial({ map: load(tex.cover), metalnessMap: coverMask, roughnessMap: coverMask, metalness: 1, roughness: 1, clearcoat: 0.3, clearcoatRoughness: 0.3, envMapIntensity: 0.35 });
    function canvasTex(c) { var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = Math.min(8, maxAniso); return t; }
    var insideTex = tex.board ? load(tex.board, true) : canvasTex(stripesCanvas(512, 724, true));
    var boardEdge = new T.MeshStandardMaterial({ color: 0x231f20, roughness: 0.55 });
    var insideMat = new T.MeshStandardMaterial({ map: insideTex, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    var coverPivot = new T.Group();
    var coverBox = new T.Mesh(new T.BoxGeometry(W + OV, H + 2 * OV, CB), [boardEdge, boardEdge, boardEdge, boardEdge, coverMat, insideMat]);
    coverBox.castShadow = true; coverBox.receiveShadow = true;
    coverBox.position.set((W + OV) / 2, 0, CB / 2);
    coverPivot.add(coverBox); book.add(coverPivot);
    leaves.push({ rigid: true, t: 0, target: 0, dir: 1, pivot: coverPivot, box: coverBox });

    // sheets
    for (var s = 0; s < NS; s++) {
      var geo = new T.PlaneGeometry(W, H, SEG, YSEG);
      var front = new T.Mesh(geo, paperMat(load(tex.pages[2 * s]), T.FrontSide));
      var back = new T.Mesh(geo, paperMat(load(tex.pages[2 * s + 1], true), T.BackSide));
      front.castShadow = back.castShadow = true; front.receiveShadow = back.receiveShadow = true;
      var grp = new T.Group(); grp.add(front); grp.add(back); book.add(grp);
      front.userData = { page: 2 * s + 1 }; back.userData = { page: 2 * s + 2 };
      pickables.push(front, back);
      leaves.push({ rigid: false, t: 0, target: 0, dir: 1, geo: geo, dirty: true, group: grp });
    }

    // back board (static)
    var backBox = new T.Mesh(new T.BoxGeometry(W + OV, H + 2 * OV, CB), [boardEdge, boardEdge, boardEdge, boardEdge,
      new T.MeshStandardMaterial({ map: tex.board ? load(tex.board) : canvasTex(stripesCanvas(512, 724, true)), roughness: 0.8, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
      new T.MeshPhysicalMaterial({ map: load(tex.back), roughness: 0.4, clearcoat: 0.4 })]);
    backBox.position.set((W + OV) / 2, 0, CB / 2); backBox.castShadow = backBox.receiveShadow = true; book.add(backBox);

    // spine matching book cover with gold foil ribs and emblem
    var spineTex = new T.CanvasTexture(spineCanvas());
    spineTex.encoding = T.sRGBEncoding;
    spineTex.anisotropy = Math.min(8, maxAniso);
    var bookThick = 2 * CB + GAP + NS * TH;
    var spineR = bookThick / 2;
    var spineMat = new T.MeshPhysicalMaterial({
      map: spineTex,
      roughness: 0.38,
      metalness: 0.25,
      clearcoat: 0.25,
      clearcoatRoughness: 0.3,
      side: T.DoubleSide
    });
    var spine = new T.Mesh(new T.CylinderGeometry(spineR, spineR, H + 2 * OV, 32, 1, true, Math.PI * 0.95, Math.PI * 1.1), spineMat);
    spine.position.set(0, 0, spineR); spine.castShadow = true; book.add(spine);

    // page blocks (visible thickness)
    var blockMat = [new T.MeshStandardMaterial({ map: edgeTex, roughness: 0.9 }), new T.MeshStandardMaterial({ color: 0xf2f1ef, roughness: 0.9 }),
      new T.MeshStandardMaterial({ map: edgeTex, roughness: 0.9 }), new T.MeshStandardMaterial({ map: edgeTex, roughness: 0.9 }),
      new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 })];
    var blockR = new T.Mesh(new T.BoxGeometry(1, 1, 1), blockMat), blockL = new T.Mesh(new T.BoxGeometry(1, 1, 1), blockMat);
    blockR.receiveShadow = blockL.receiveShadow = true; blockR.castShadow = blockL.castShadow = true;
    book.add(blockR); book.add(blockL);

    // ---------- layout ----------
    function stackRight(i) { var h = CB + GAP; for (var j = Math.max(i + 1, 1); j < leaves.length; j++) h += TH * (1 - leaves[j].t); return h; }
    function stackLeft(i) { var h = CB + GAP; for (var j = 1; j < i; j++) h += TH * leaves[j].t; return h; }

    var ds = W / SEG;
    function deform(leaf, idx) {
      var pos = leaf.geo.attributes.position, t = leaf.t;
      var hR = stackRight(idx), hL = stackLeft(idx);
      var openSpread = Math.min(hL - (CB + GAP), hR - (CB + GAP));
      var bendDepth = Math.max(0, Math.min(0.008, openSpread));
      var pz0 = (hL * t + hR * (1 - t)) - bendDepth;
      var targetZ = t * hL + (1 - t) * hR;
      var dh = targetZ - pz0;
      var angle = Math.asin(Math.min(0.85, dh / (K * ds)));
      var bend = Math.sin(Math.PI * t) * 1.15 * leaf.dir;
      for (var row = 0; row <= YSEG; row++) {
        var yf = row / YSEG;                       // 0 top .. 1 bottom (PlaneGeometry rows go top→bottom)
        var y = H / 2 - yf * H;
        var px = 0, pz = pz0;
        var diag = 0.78 + 0.44 * (1 - yf);         // top corner curls more
        for (var col = 0; col <= SEG; col++) {
          var k = row * (SEG + 1) + col;
          pos.setXYZ(k, px, y, pz);
          if (col === SEG) break;
          var r0 = col < K ? angle : 0, l0 = col < K ? Math.PI - angle : Math.PI;
          var u = (col + 0.5) / SEG;
          var a = r0 + (l0 - r0) * t + bend * diag * Math.pow(u, 1.7);
          px += Math.cos(a) * ds; pz += Math.sin(a) * ds;
        }
      }
      pos.needsUpdate = true;
      leaf.geo.computeVertexNormals();
    }

    function layout() {
      // cover
      var c = leaves[0], th = c.t * Math.PI;
      var hR0 = stackRight(0);
      var lift = Math.sin(th) * 0.02;
      var hz = hR0 * (1 - c.t) + CB * c.t + lift;
      c.pivot.position.set(0, 0, hz);
      c.pivot.rotation.y = -th;
      c.box.position.set((W + OV) / 2, 0, CB / 2);
      var closed = c.t < 0.005;
      for (var s = 1; s < leaves.length; s++) {
        leaves[s].group.visible = !closed;
      }
      for (var i = 1; i < leaves.length; i++) if (leaves[i].dirty) { deform(leaves[i], i); leaves[i].dirty = false; }
      // blocks
      var iR = -1, iL = -1;
      for (var j = 1; j < leaves.length; j++) { if (iR < 0 && leaves[j].t < 0.01) iR = j; if (leaves[j].t > 0.99) iL = j; }
      var x0 = K * ds + 0.004;
      var hr = iR > 0 && iR < leaves.length - 1 ? stackRight(iR) - (CB + GAP) - 0.0012 : 0, hl = iL > 1 ? stackLeft(iL) - (CB + GAP) - 0.0012 : 0;
      blockR.visible = hr > 0.001; blockL.visible = hl > 0.001;
      hr = Math.max(0.0005, hr); hl = Math.max(0.0005, hl);
      blockR.scale.set(W - x0 - 0.003, H - 0.004, hr); blockR.position.set(x0 + (W - x0 - 0.003) / 2, 0, CB + GAP + hr / 2);
      blockL.scale.set(W - x0 - 0.003, H - 0.004, hl); blockL.position.set(-(x0 + (W - x0 - 0.003) / 2), 0, CB + GAP + hl / 2);
      // spine collapses as the book opens
      var open = Math.min(1, c.t * 1.5);
      spine.position.set(0, 0, spineR * (1 - open * 0.7));
      spine.scale.set(1 - open * 0.95, 1, 1 - open * 0.7);
      spine.visible = open < 0.95;
      // contact shadow follows the footprint
      var cxm = c.t > 0.5 ? 0 : (W + OV) / 2, cw = c.t > 0.5 ? 2 * W + 0.5 : W + 0.4;
      contact.position.x += (cxm - contact.position.x) * 0.2;
      contact.scale.x += (cw - contact.scale.x) * 0.2; contact.scale.y = H + 0.35;
    }

    // ---------- state ----------
    var turned = 0;          // leaves turned to the left (0 = closed)
    if (opts.initialPage) {
      turned = Math.min(NS + 1, Math.floor(opts.initialPage / 2) + 1);
      for (var ii = 0; ii < turned; ii++) { leaves[ii].t = 1; leaves[ii].target = 1; leaves[ii].dirty = true; }
    }
    var focus = opts.initialPage && opts.initialPage % 2 === 0 ? 'left' : 'right';     // portrait: which page is framed
    var zoom = null;         // {x,y}
    var drag = null;
    var portrait = false;
    var soundOn = opts.sound !== undefined ? !!opts.sound : true, audio = null;

    function flipSound() {
      if (!soundOn) return;
      try {
        audio = audio || new (window.AudioContext || window.webkitAudioContext)();
        if (audio.state === 'suspended') {
          audio.resume().catch(function () {});
        }
        var now = audio.currentTime;
        var duration = 0.26;
        var numSamples = Math.floor(audio.sampleRate * duration);
        var buf = audio.createBuffer(1, numSamples, audio.sampleRate);
        var d = buf.getChannelData(0);

        // Organic fibrous paper-friction noise (pink/brown spectrum)
        var b0 = 0, b1 = 0, b2 = 0;
        for (var i2 = 0; i2 < numSamples; i2++) {
          var white = Math.random() * 2 - 1;
          b0 = 0.992 * b0 + white * 0.045;
          b1 = 0.96 * b1 + white * 0.09;
          b2 = 0.86 * b2 + white * 0.22;
          var pink = (b0 + b1 + b2) * 0.45 + white * 0.12;

          var prog = i2 / numSamples;
          // Smooth envelope: soft 50ms attack, steady paper slide, gentle release
          var env = prog < 0.22
            ? Math.sin((prog / 0.22) * Math.PI * 0.5)
            : Math.pow(Math.cos(((prog - 0.22) / 0.78) * Math.PI * 0.5), 1.8);

          var fiber = 1.0 + 0.15 * Math.sin(prog * 32.0);
          d[i2] = pink * env * fiber;
        }

        var src = audio.createBufferSource();
        src.buffer = buf;

        // Two-stage filtering: lowpass sweeps down as page settles, highpass clears mud
        var lp = audio.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(1900, now);
        lp.frequency.exponentialRampToValueAtTime(850, now + duration);
        lp.Q.value = 1.0;

        var hp = audio.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(180, now);

        // Soft, natural volume that fits the relaxed reading vibe
        var gn = audio.createGain();
        gn.gain.setValueAtTime(0.065, now);
        gn.gain.exponentialRampToValueAtTime(0.001, now + duration);

        src.connect(hp);
        hp.connect(lp);
        lp.connect(gn);
        gn.connect(audio.destination);

        src.start(now);
      } catch (err) { /* audio unavailable */ }
    }

    function setTargets() {
      for (var i = 0; i < leaves.length; i++) {
        var tg = i < turned ? 1 : 0;
        if (leaves[i].target !== tg) { leaves[i].dir = tg > leaves[i].t ? 1 : -1; leaves[i].target = tg; }
      }
      emit(); invalidate();
    }
    function label() {
      var total = NS * 2;
      if (turned === 0) return { text: 'Εξώφυλλο', aria: 'Εξώφυλλο' };
      if (turned === 1) return { text: 'Σελ. 1 / ' + total, aria: 'Σελίδα 1 από ' + total };
      if (turned > NS) return { text: 'Σελ. ' + total + ' / ' + total, aria: 'Σελίδα ' + total + ' από ' + total };
      var l = 2 * (turned - 1), r = l + 1;
      if (portrait) { var p = focus === 'left' ? l : r; return { text: 'Σελ. ' + p + ' / ' + total, aria: 'Σελίδα ' + p + ' από ' + total }; }
      return { text: 'Σελ. ' + l + '–' + r + ' / ' + total, aria: 'Σελίδες ' + l + ' και ' + r + ' από ' + total };
    }
    function visiblePages() {
      if (turned === 0) return [];
      var l = 2 * (turned - 1), r = l + 1;
      var out = [];
      if (portrait) out.push(focus === 'left' ? l : r); else { if (l >= 1) out.push(l); if (r <= NS * 2) out.push(r); }
      return out.filter(function (p) { return p >= 1 && p <= NS * 2; });
    }
    function emit() { if (opts.onChange) opts.onChange({ turned: turned, closed: turned === 0, end: turned >= leaves.length, label: label(), zoomed: !!zoom, sound: soundOn, pages: visiblePages(), portrait: portrait }); }

    function next() {
      zoom = null;
      if (portrait && turned > 0 && focus === 'left') { focus = 'right'; emit(); invalidate(); return; }
      if (turned >= leaves.length) return;
      turned++; flipSound(); focus = portrait && turned > 1 ? 'left' : 'right'; setTargets();
    }
    function prev() {
      zoom = null;
      if (portrait && turned > 1 && focus === 'right') { focus = 'left'; emit(); invalidate(); return; }
      if (turned <= 0) return;
      turned--; flipSound(); focus = 'right'; setTargets();
    }
    function goTo(page) { // page number 1..16
      zoom = null;
      turned = page <= 0 ? 0 : Math.min(leaves.length, Math.floor(page / 2) + 1);
      focus = page % 2 === 0 ? 'left' : 'right';
      flipSound(); setTargets();
    }

    // ---------- camera ----------
    var camT = new T.Vector3(), camD = 4, curT = new T.Vector3(W / 2, -0.25, 0), curD = 6.5;
    var par = { x: 0, y: 0 }, parC = { x: 0, y: 0 };
    var TILT = 17 * Math.PI / 180;
    function frame() {
      var aspect = Math.max(0.2, container.clientWidth / Math.max(1, container.clientHeight));
      portrait = aspect < 0.78;
      var vfov = camera.fov * Math.PI / 180, hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
      var fw, fx;
      if (turned === 0 || turned >= leaves.length) { fw = W + 0.22; fx = turned === 0 ? (W + OV) / 2 : -(W + OV) / 2; }
      else if (portrait) { fw = W + 0.1; fx = focus === 'left' ? -W / 2 : W / 2; }
      else { fw = 2 * W + 0.26; fx = 0; }
      var dW = (fw / 2) / Math.tan(hfov / 2), dH = ((H + 0.28) / 2) / Math.tan(vfov / 2);
      camD = Math.max(dW, dH) * 1.04;
      camT.set(fx, 0.02, 0);
      if (opts.toolbarSpace) camT.y -= opts.toolbarSpace * camD * Math.tan(vfov / 2);
      if (zoom) { camT.set(zoom.x, zoom.y, 0); camD *= portrait ? 0.5 : 0.42; }
    }

    // ---------- loop ----------
    var clock = new T.Clock(), needs = 3, raf = 0, alive = true;
    function invalidate() { needs = Math.max(needs, 2); if (!raf && alive) raf = requestAnimationFrame(tick); }
    function tick() {
      raf = 0;
      var dt = Math.min(0.05, clock.getDelta());
      var moving = false;
      for (var i = 0; i < leaves.length; i++) {
        var L = leaves[i];
        if (drag && drag.leaf === i) { moving = true; continue; }
        var d = L.target - L.t;
        if (Math.abs(d) > 0.0005) {
          var speed = reduce ? 60 : (L.rigid ? 4.2 : 5.2);
          L.t += d * (1 - Math.exp(-dt * speed));
          if (Math.abs(L.target - L.t) < 0.0005) L.t = L.target;
          L.dirty = true; moving = true;
        }
      }
      if (moving) for (var j = 1; j < leaves.length; j++) leaves[j].dirty = true;
      var wasPortrait = portrait;
      frame();
      if (wasPortrait !== portrait) emit();
      var ease = 1 - Math.exp(-dt * (reduce ? 60 : 3.2));
      curT.lerp(camT, ease); curD += (camD - curD) * ease;
      parC.x += (par.x - parC.x) * 0.08; parC.y += (par.y - parC.y) * 0.08;
      var cMove = curT.distanceTo(camT) > 0.0005 || Math.abs(curD - camD) > 0.0005 || Math.abs(par.x - parC.x) + Math.abs(par.y - parC.y) > 0.0005;
      var tilt = TILT + parC.y * 0.05, yaw = parC.x * 0.05;
      camera.position.set(curT.x + Math.sin(yaw) * curD * Math.cos(tilt), curT.y - Math.sin(tilt) * curD, Math.cos(tilt) * Math.cos(yaw) * curD);
      camera.lookAt(curT);
      layout();
      renderer.render(scene, camera);
      if (moving || cMove || needs-- > 0) raf = requestAnimationFrame(tick);
    }

    // ---------- input ----------
    var ray = new T.Raycaster(), ndc = new T.Vector2(), plane = new T.Plane(new T.Vector3(0, 0, 1), 0), hit = new T.Vector3();
    var lastWheelTime = 0;
    function worldX(e) {
      var r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return ray.ray.intersectPlane(plane, hit) ? hit.clone() : null;
    }
    function hoverLink(e) {
      for (var k = 0; k < leaves.length; k++) {
        if (Math.abs(leaves[k].target - leaves[k].t) > 0.005) return false;
      }
      if (performance.now() - lastWheelTime < 350) return false;
      var p = worldX(e);
      if (p && Math.abs(p.x) > W * 0.78) return false;
      var saved = opts.onLink, found = false;
      opts.onLink = function () { found = true; };
      try { pickLink(e); } finally { opts.onLink = saved; }
      return found;
    }
    function pickLink(e) {
      if (!opts.links || !opts.onLink) return false;
      if (performance.now() - lastWheelTime < 650) return false;
      for (var k = 0; k < leaves.length; k++) {
        if (Math.abs(leaves[k].target - leaves[k].t) > 0.005) return false;
      }
      var r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      var hits = ray.intersectObjects(pickables, false);
      if (!hits.length || !hits[0].uv) return false;
      var page = hits[0].object.userData.page;
      var vis = visiblePages();
      if (!vis.includes(page)) return false;
      var u = hits[0].uv.x, v = 1 - hits[0].uv.y;
      if (page % 2 === 0) u = 1 - u;
      var regions = opts.links[page] || [];
      for (var i = 0; i < regions.length; i++) {
        var g = regions[i];
        if (u >= g.x && u <= g.x + g.w && v >= g.y && v <= g.y + g.h) { opts.onLink(g); return true; }
      }
      return false;
    }
    var el = renderer.domElement;
    el.tabIndex = 0;
    el.setAttribute('role', 'application');
    el.setAttribute('aria-roledescription', 'βιβλίο');
    el.setAttribute('aria-label', 'Match Programme. Αριστερό και δεξί βέλος για αλλαγή σελίδας.');

    el.addEventListener('pointerdown', function (e) {
      var p = worldX(e); if (!p) return;
      el.focus({ preventScroll: true });
      var sx = e.clientX, sy = e.clientY;
      if (zoom) { drag = { pan: true, sx: sx, sy: sy, zx: zoom.x, zy: zoom.y, moved: 0, startTime: performance.now() }; el.setPointerCapture(e.pointerId); return; }
      var forward = turned === 0 ? true : p.x > 0;
      var idx = forward ? turned : turned - 1;
      if (idx < 0 || idx >= leaves.length || Math.abs(p.y) > H / 2 + OV) { drag = null; return; }
      drag = { leaf: idx, forward: forward, sx: sx, sy: sy, moved: 0, x0: p.x, startTime: performance.now() };
      leaves[idx].dir = forward ? 1 : -1;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', function (e) {
      if (!drag) {
        if (e.pointerType === 'mouse') el.style.cursor = hoverLink(e) ? 'pointer' : (zoom ? 'grab' : 'default');
        if (e.pointerType === 'mouse' && !reduce && !portrait) {
          var r = el.getBoundingClientRect();
          par.x = ((e.clientX - r.left) / r.width - 0.5); par.y = ((e.clientY - r.top) / r.height - 0.5);
          invalidate();
        }
        return;
      }
      drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy));
      if (drag.pan) {
        var k2 = curD / el.clientHeight * 0.9;
        zoom.x = drag.zx - (e.clientX - drag.sx) * k2; zoom.y = drag.zy + (e.clientY - drag.sy) * k2; invalidate(); return;
      }
      if (drag.moved < 6) return;
      var p = worldX(e); if (!p) return;
      var L = leaves[drag.leaf];
      var tt = Math.max(0, Math.min(1, (W - p.x) / (2 * W)));
      if (turned === 0) tt = Math.max(0, Math.min(1, ((W + OV) - p.x) / (2 * W)));
      L.t += (tt - L.t) * 0.55; L.dirty = true;
      for (var j = 1; j < leaves.length; j++) leaves[j].dirty = true;
      invalidate();
    });
    function endDrag(e) {
      if (!drag) return;
      var d = drag; drag = null;
      if (d.pan) { invalidate(); return; }
      var L = leaves[d.leaf];
      var now = performance.now();
      var isTap = d.moved < 6 && (now - d.startTime < 450);
      var recentScroll = now - lastWheelTime < 650;
      var p = worldX(e);
      var outer = p && (turned === 0 || Math.abs(p.x) > W * 0.78);

      if (isTap && !recentScroll) {
        if (!outer && pickLink(e)) return;
        if (portrait && p) { if (d.forward) next(); else prev(); return; }
        if (outer) { if (d.forward) next(); else prev(); }
        return;
      }
      if (d.moved < 6) return;

      var done = d.forward ? L.t > 0.5 : L.t < 0.5;
      if (done) { if (d.forward) { turned++; focus = portrait && turned > 1 ? 'left' : 'right'; } else { turned--; focus = 'right'; } flipSound(); }
      L.dir = done === d.forward ? 1 : -1;
      setTargets();
    }
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
    el.addEventListener('pointerleave', function () { par.x = par.y = 0; invalidate(); });
    el.addEventListener('dblclick', function (e) {
      if (zoom) { zoom = null; } else { var p = worldX(e); if (p) zoom = { x: p.x, y: p.y }; }
      emit(); invalidate();
    });
    var wheelLock = 0;
    el.addEventListener('wheel', function (e) {
      e.preventDefault();
      lastWheelTime = performance.now();
      if (e.ctrlKey) { if (!zoom && e.deltaY < 0) { var p = worldX(e); if (p) zoom = { x: p.x, y: p.y }; } else if (zoom && e.deltaY > 0) zoom = null; emit(); invalidate(); return; }
      var now = performance.now(); if (now - wheelLock < 420 || Math.abs(e.deltaY) < 8) return; wheelLock = now;
      if (e.deltaY > 0) next(); else prev();
    }, { passive: false });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { next(); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { prev(); e.preventDefault(); }
      else if (e.key === 'Escape' && zoom) { zoom = null; emit(); invalidate(); }
    });

    el.addEventListener('webglcontextlost', function (ev) { ev.preventDefault(); if (opts.onContextLost) opts.onContextLost(); });
    var ro = new ResizeObserver(function () {
      var w = container.clientWidth, h = container.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); invalidate();
    });
    ro.observe(container);
    var w0 = container.clientWidth || 800, h0 = container.clientHeight || 600;
    renderer.setSize(w0, h0, false); camera.aspect = w0 / h0; camera.updateProjectionMatrix();
    contact.scale.set(W + 0.4, H + 0.35, 1); contact.position.x = (W + OV) / 2;
    if (reduce) { curD = 4; }
    frame(); invalidate(); emit();

    return {
      next: next, prev: prev, goTo: goTo,
      open: function () { if (turned === 0) next(); },
      toStart: function () { goTo(0); },
      zoomOut: function () { zoom = null; emit(); invalidate(); },
      setSound: function (on) { soundOn = !!on; emit(); },
      setStage: function (c) { scene.background = new T.Color(c); invalidate(); },
      focus: function () { el.focus({ preventScroll: true }); },
      destroy: function () {
        alive = false; cancelAnimationFrame(raf); ro.disconnect();
        scene.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(function (m) { if (m.map) m.map.dispose(); m.dispose(); }); });
        renderer.dispose(); if (el.parentNode) el.parentNode.removeChild(el);
      }
    };
}
