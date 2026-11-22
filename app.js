import { firebaseConfig, UID_ADMIN } from './firebase-config.js';

const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';
const $ = (id) => document.getElementById(id);
const configurato = !!firebaseConfig && !String(firebaseConfig.apiKey || 'INCOLLA').startsWith('INCOLLA') && !String(firebaseConfig.projectId || 'INCOLLA').startsWith('INCOLLA');
const MSG_CONFIG = 'Firebase non è ancora configurato. Compila il file firebase-config.js seguendo la guida.';
const MSG_RETE = 'Non riesco a collegarmi a Firebase. Controlla la connessione e ricarica la pagina.';

let A = {}, S = {}, auth = null, db = null, utente = null, pronta = false, problema = '';
const sonoAdmin = () => !!utente && !utente.isAnonymous && utente.uid === UID_ADMIN;
const rif = (c, n) => S.doc(db, c, String(n));
const sonoDestinataria = () => !!utente && utente.isAnonymous;
async function leggi(c, n) { const s = await S.getDocFromServer(rif(c, n)); return s.exists() ? s.data() : null; }
const conTimeout = (p, ms) => Promise.race([p, new Promise((_, ko) => setTimeout(() => ko(Object.assign(new Error('timeout'), { code: 'timeout' })), ms))]);
function banner(t) { const b = $('banner'); b.textContent = t; b.hidden = !t; }

/* [numero, colonna, riga, larghezza, altezza, colore, decorazione] su griglia da 6 colonne */
const CASELLE = [
 [1,1,1,3,2,'rosso','\u2744'],[22,4,1,2,1,'crema',''],[10,6,1,1,2,'rosso','\u2605'],[4,4,2,2,1,'rosa',''],
 [15,1,3,2,2,'crema','\uD83C\uDF84'],[7,3,3,1,1,'rosso',''],[9,4,3,3,1,'oro','\u2726'],[20,3,4,1,1,'rosa',''],
 [13,4,4,2,1,'rosso',''],[3,6,4,1,2,'crema','\u2764'],[18,1,5,1,2,'rosso',''],[6,2,5,2,1,'crema',''],
 [11,4,5,2,2,'rosso','\uD83C\uDF81'],[16,2,6,2,1,'oro',''],[8,6,6,1,2,'crema','\u2744'],
 [21,1,7,3,2,'rosso','\u2605'],[2,4,7,2,1,'rosa',''],[17,4,8,1,1,'rosso',''],[14,5,8,2,1,'crema',''],
 [5,1,9,2,1,'oro','\u2726'],[23,3,9,1,2,'rosa','\u2764'],[24,4,9,3,2,'oro','\uD83C\uDF80'],
 [19,1,10,1,1,'crema',''],[12,2,10,1,1,'rosso','']
];
const stato = {};    // n -> {ok, dati, rete}   (ok = il server ha permesso la lettura)
const visti = {};    // n -> true se l'apertura e' registrata su Firestore
const tessere = {};  // n -> elemento HTML
const inCorso = {};
let cartaN = 0;

const oggiRoma = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
const giorniA = (anno, mese, giorno) => {
  const o = oggiRoma();
  return Math.ceil((new Date(anno, mese, giorno) - new Date(o.getFullYear(), o.getMonth(), o.getDate())) / 864e5);
};

/* neve */
(function () {
  let h = '';
  for (let i = 0; i < 26; i++) {
    const s = (Math.random() * 3 + 3).toFixed(1);
    h += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;width:' + s + 'px;height:' + s + 'px;animation-duration:' + (Math.random() * 8 + 9).toFixed(1) + 's;animation-delay:-' + (Math.random() * 14).toFixed(1) + 's;--dx:' + (Math.random() * 60 - 30).toFixed(0) + 'px"></i>';
  }
  $('neve').innerHTML = h;
})();

function applicaTesti(c) {
  if (!c) return;
  if (c.titoloBenvenuto) $('titoloBenvenuto').textContent = c.titoloBenvenuto;
  if (c.fraseBenvenuto) $('fraseBenvenuto').textContent = c.fraseBenvenuto;
  if (c.titoloCal) $('titoloCal').textContent = c.titoloCal;
  if (c.testoCal) $('testoCal').textContent = c.testoCal;
}

/* ---------- stato delle caselle: lo decide il server (regole Firestore) ---------- */
async function caricaStati() {
  await Promise.all(CASELLE.map(async (c) => {
    const n = c[0];
    try { stato[n] = { ok: true, dati: await leggi('caselle', n) }; }
    catch (e) { stato[n] = { ok: false, rete: e.code !== 'permission-denied' }; }
    try { if (await leggi('aperture', n)) visti[n] = true; } catch (e) {}
  }));
  if (Object.values(stato).some((s) => s.rete)) avviso('Controlla la connessione: alcune caselle potrebbero non essere aggiornate.');
}

function classiTessera(n) { const st = stato[n] || { ok: false }; return st.ok ? (visti[n] ? 'vista' : 'pronta') : 'chiusa'; }
function aggiornaClassi() {
  CASELLE.forEach((c) => {
    const b = tessere[c[0]]; if (!b) return;
    b.classList.remove('chiusa', 'pronta', 'vista'); b.classList.add(classiTessera(c[0]));
  });
}
function aggiornaPiede() {
  const g = giorniA(2026, 11, 25);
  $('piede').textContent = g > 1 ? 'Mancano ' + g + ' giorni a Natale \uD83C\uDF84' : g === 1 ? 'Manca 1 giorno a Natale \uD83C\uDF84' : 'Buon Natale \uD83C\uDF84';
  const p = giorniA(2026, 11, 1);
  $('nota').textContent = p > 0 ? 'La prima sorpresa si apre tra ' + p + (p === 1 ? ' giorno' : ' giorni') + ' \u2764\uFE0F' : '';
}
function costruisci() {
  const m = $('mosaico'); m.textContent = '';
  CASELLE.forEach((c, i) => {
    const n = c[0];
    const b = document.createElement('button');
    b.className = 'casella c-' + c[5] + (c[3] * c[4] >= 4 ? ' grande' : '') + (n === 24 ? ' regalo24' : '') + ' ' + classiTessera(n);
    b.style.gridColumn = c[1] + ' / span ' + c[3];
    b.style.gridRow = c[2] + ' / span ' + c[4];
    b.style.setProperty('--i', i);
    b.setAttribute('aria-label', 'Casella ' + n);
    const a = document.createElement('span'); a.className = 'num'; a.textContent = n;
    const d = document.createElement('span'); d.className = 'deco'; d.textContent = c[6];
    b.append(a, d);
    b.onclick = () => apri(n, b);
    m.appendChild(b); tessere[n] = b;
  });
  aggiornaPiede();
}

/* ---------- aggiornamento automatico a mezzanotte (verifica sul server) ---------- */
let verificando = false, tMezz = 0;
async function verificaNuove() {
  if (!pronta || !entrato || verificando || !auth || !auth.currentUser) return;
  verificando = true;
  try {
    let nuove = 0;
    for (let n = 1; n <= 24; n++) {
      if (stato[n] && stato[n].ok) continue;
      try {
        const dati = await leggi('caselle', n);
        stato[n] = { ok: true, dati }; nuove++;
        try { if (await leggi('aperture', n)) visti[n] = true; } catch (e) {}
        const b = tessere[n];
        if (b) { b.classList.remove('chiusa'); b.classList.add(visti[n] ? 'vista' : 'pronta'); b.style.animationDelay = '0s,0s'; }
      } catch (e) {
        stato[n] = { ok: false, rete: e.code !== 'permission-denied' };
        break; // i giorni successivi sono bloccati a maggior ragione
      }
    }
    if (nuove) avviso(nuove === 1 ? 'Si è aperta una nuova sorpresa \u2764\uFE0F' : 'Si sono aperte nuove sorprese \u2764\uFE0F');
    aggiornaPiede();
  } finally { verificando = false; }
}
function programmaMezzanotte() {
  clearTimeout(tMezz);
  const o = oggiRoma(), dom = new Date(o.getFullYear(), o.getMonth(), o.getDate() + 1);
  tMezz = setTimeout(() => { verificaNuove(); programmaMezzanotte(); }, Math.max(1000, dom - o) + 3000);
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') verificaNuove(); });
window.addEventListener('online', verificaNuove);
window.addEventListener('focus', verificaNuove);
setInterval(() => { if (document.visibilityState === 'visible') verificaNuove(); }, 60000);

/* ---------- avvisi, cuori, carta ---------- */
let tAvviso;
function avviso(t) {
  const a = $('avviso'); a.textContent = t; a.classList.add('su');
  clearTimeout(tAvviso); tAvviso = setTimeout(() => a.classList.remove('su'), 3200);
}
function cuori(n, box) {
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span'); s.className = 'cuore';
    s.textContent = i % 4 === 0 ? '\u2605' : '\u2764';
    if (i % 4 === 0) s.style.color = '#f3d98b';
    s.style.setProperty('--dx', (Math.random() * 300 - 150).toFixed(0) + 'px');
    s.style.setProperty('--dy', (Math.random() * -320 - 40).toFixed(0) + 'px');
    s.style.animationDelay = (Math.random() * .25).toFixed(2) + 's';
    box.appendChild(s);
    setTimeout(() => s.remove(), 1800);
  }
}
function riempi(n, d, foto) {
  d = d || {};
  const tipo = d.tipo || 'messaggio';
  $('cData').textContent = n + ' dicembre 2026';
  $('cTitolo').textContent = d.titolo || (n === 24 ? 'Buon Natale, amore mio' : 'La sorpresa di oggi');
  $('cTesto').textContent = tipo === 'foto' ? '' : (d.messaggio || 'Qui apparirà la sorpresa del giorno ' + n + ' \u2764\uFE0F');
  $('cTesto').hidden = !$('cTesto').textContent;
  const im = $('cFoto'); im.hidden = true; im.removeAttribute('src');
  if (foto) { im.src = foto; im.hidden = false; }
  const l = $('cLink'); l.hidden = true;
  if (d.bottoneTesto && /^https?:\/\//i.test(d.bottoneLink || '')) { l.textContent = d.bottoneTesto; l.href = d.bottoneLink; l.hidden = false; }
}
function mostraCarta(n, d, foto, anteprima) {
  const s = $('sorpresa'), carta = $('carta'), regalo = $('regalo');
  cartaN = n; riempi(n, d, foto);
  $('btnTorna').textContent = anteprima ? 'Chiudi anteprima' : 'Torna al calendario';
  carta.className = 'carta' + (n === 24 ? ' oro' : '');
  regalo.className = 'regalo';
  s.classList.add('visibile');
  setTimeout(() => { regalo.classList.add('apri'); cuori(n === 24 ? 30 : 16, s); }, 350);
  setTimeout(() => carta.classList.add('entra'), 900);
}
async function caricaFoto(n, d) {
  try { const f = await leggi('foto', n); return f && f.v === d.fotoV ? f.dati : null; } catch (e) { return null; }
}

/* l'apertura risulta registrata (cuoricino) solo se Firestore ha confermato il salvataggio */
async function registraApertura(n) {
  if (inCorso[n]) return; inCorso[n] = true;
  try {
    try { await conTimeout(S.setDoc(rif('aperture', n), { apertaIl: S.serverTimestamp() }), 15000); }
    catch (e) { const gia = await conTimeout(leggi('aperture', n), 8000).catch(() => null); if (!gia) throw e; }
    visti[n] = true;
    const b = tessere[n]; if (b && stato[n] && stato[n].ok) { b.classList.remove('pronta'); b.classList.add('vista'); }
  } catch (e) { avviso('Apertura non registrata. Controlla la connessione: la riproveremo alla prossima apertura.'); }
  finally { inCorso[n] = false; }
}
async function apri(n, el) {
  const st = stato[n];
  if (!st || !st.ok) {
    avviso('Questa sorpresa non è ancora pronta per essere scoperta \u2764\uFE0F');
    el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }], { duration: 260 });
    verificaNuove();
    return;
  }
  mostraCarta(n, st.dati, null, false);
  if (st.dati && st.dati.haFoto) {
    caricaFoto(n, st.dati).then((src) => { if (src && cartaN === n && $('sorpresa').classList.contains('visibile')) { $('cFoto').src = src; $('cFoto').hidden = false; } });
  }
  if (!sonoAdmin() && !visti[n]) registraApertura(n);
}
$('btnTorna').onclick = () => $('sorpresa').classList.remove('visibile');

/* ---------- porta e accesso ---------- */
let entrato = false, attesa = false;
async function procedi() {
  entrato = true;
  await caricaStati();
  $('porta').classList.add('aperta');
  setTimeout(() => { costruisci(); $('intro').classList.add('esce'); $('cal').classList.add('visibile'); programmaMezzanotte(); }, 1500);
}
$('btnPorta').onclick = async () => {
  if (entrato || attesa) return;
  attesa = true;
  try {
    await inizio;
    if (!pronta) { avviso(problema || MSG_RETE); return; }
    if (!(auth && auth.currentUser)) { mostraAccesso(); return; }
    if (sonoAdmin()) { await procedi(); return; }
    if (sonoDestinataria() && await autorizzata()) { await procedi(); return; }
    mostraAccesso();
  } finally { attesa = false; }
};
// Accesso senza email della destinataria: anonimo da autorizzare con invito monouso.
function mostraAccesso(schermata = 'scelte') {
  $('accesso').classList.add('visibile');
  $('accessoScelte').hidden = schermata !== 'scelte';
  $('accessoInvito').hidden = schermata !== 'invito';
  $('formAccesso').hidden = schermata !== 'admin';
}
async function autorizzata() {
  if (!sonoDestinataria()) return false;
  try {
    const doc = await conTimeout(S.getDocFromServer(rif('destinatari', utente.uid)), 12000);
    return doc.exists();
  } catch (e) { return false; }
}
$('btnAdminLogin').onclick = () => mostraAccesso('admin');
$('tornaAccesso').onclick = () => mostraAccesso();
$('tornaScelta').onclick = () => mostraAccesso();
$('btnDestinataria').onclick = async () => {
  $('invitoErr').textContent = '';
  $('btnDestinataria').disabled = true;
  try {
    if (!auth.currentUser) {
      const c = await A.signInAnonymously(auth);
      utente = c.user;
    }
    if (!sonoDestinataria()) {
      $('invitoErr').textContent = 'Questo browser è connesso come amministratore. Per provare la modalità destinataria usa un altro browser.';
      mostraAccesso('invito'); return;
    }
    if (await autorizzata()) {
      $('accesso').classList.remove('visibile'); await procedi();
    } else mostraAccesso('invito');
  } catch (e) { mostraAccesso('invito'); $('invitoErr').textContent = 'Connessione non riuscita. Riprova.'; }
  finally { $('btnDestinataria').disabled = false; }
};
$('formInvito').onsubmit = async (ev) => {
  ev.preventDefault();
  const codice = $('codiceInvito').value.trim().toLowerCase();
  const err = $('invitoErr'); err.textContent = '';
  if (!/^[a-f0-9]{32}$/.test(codice)) { err.textContent = 'Il codice deve avere 32 caratteri.'; return; }
  $('usaInvito').disabled = true;
  try {
    if (!sonoDestinataria()) throw new Error('Non sei in modalità destinataria');
    // Due scritture atomiche: nessuna può riuscire senza l'altra.
    const b = S.writeBatch(db);
    b.update(rif('inviti', codice), { usato: true, uid: utente.uid, usatoIl: S.serverTimestamp() });
    b.set(rif('destinatari', utente.uid), { codice, creatoIl: S.serverTimestamp() });
    await conTimeout(b.commit(), 16000);
    if (!await autorizzata()) throw new Error('Autorizzazione non verificata');
    $('accesso').classList.remove('visibile');
    await procedi();
  } catch (e) {
    if (await autorizzata()) { $('accesso').classList.remove('visibile'); await procedi(); }
    else err.textContent = 'Codice scaduto, già usato o non valido. Chiedi un nuovo invito.';
  } finally { $('usaInvito').disabled = false; }
};

function erroreAuth(e) {
  const c = (e && e.code) || '';
  if (c.includes('invalid') || c.includes('wrong-password') || c.includes('user-not-found')) return 'Email o password non corretta.';
  if (c.includes('too-many')) return 'Troppi tentativi. Riprova tra qualche minuto.';
  if (c.includes('network')) return 'Nessuna connessione. Riprova.';
  return 'Accesso non riuscito. Riprova.';
}
$('formAccesso').onsubmit = async (ev) => {
  ev.preventDefault(); $('lErr').textContent = '';
  if (!pronta) { $('lErr').textContent = problema || MSG_RETE; return; }
  try {
    const cred = await A.signInWithEmailAndPassword(auth, $('lEmail').value.trim(), $('lPass').value);
    utente = cred.user; document.body.classList.toggle('admin', sonoAdmin());
    $('lPass').value = '';
    if (!sonoAdmin()) throw new Error('accesso non autorizzato');
    $('accesso').classList.remove('visibile');
    await procedi();
  } catch (e) { $('lErr').textContent = erroreAuth(e); }
};

/* ---------- amministrazione ---------- */
let fotoAdmin = null, fotoCambiata = false, fotoV = 0, fotoSuServer = false, salvando = false, adminPronto = false;
const num = () => $('aNum').value;
function datiForm() {
  return { titolo: $('aTitolo').value.trim(), messaggio: $('aMessaggio').value.trim(), tipo: $('aTipo').value, bottoneTesto: $('aBtnTesto').value.trim(), bottoneLink: $('aBtnLink').value.trim() };
}
function mostraFotoAdmin() {
  $('aImg').hidden = !fotoAdmin; $('aRimuovi').hidden = !fotoAdmin;
  if (fotoAdmin) $('aImg').src = fotoAdmin;
}
async function caricaForm() {
  try {
    const d = (await leggi('caselle', num())) || {};
    $('aTitolo').value = d.titolo || ''; $('aMessaggio').value = d.messaggio || ''; $('aTipo').value = d.tipo || 'messaggio';
    $('aBtnTesto').value = d.bottoneTesto || ''; $('aBtnLink').value = d.bottoneLink || '';
    fotoV = d.fotoV || 0; fotoAdmin = null; fotoSuServer = false; fotoCambiata = false; $('aFile').value = '';
    if (fotoV) { const f = await leggi('foto', num()); if (f && f.v === fotoV) { fotoAdmin = f.dati; fotoSuServer = true; } }
    mostraFotoAdmin();
  } catch (e) { avviso('Non riesco a leggere la casella. Controlla la connessione.'); }
}
function ridimensiona(file) {
  return new Promise((ok, ko) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      const k = Math.min(1, 900 / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const d = c.toDataURL('image/jpeg', 0.72);
      d.length > 900000 ? ko(new Error('troppo grande')) : ok(d);
    };
    im.onerror = () => ko(new Error('formato non valido'));
    im.src = url;
  });
}
async function caricaAperture() {
  const box = $('aAperture'); box.textContent = 'Caricamento...';
  const righe = await Promise.all(CASELLE.map((c) => c[0]).sort((a, b) => a - b).map(async (n) => {
    try { return [n, await leggi('aperture', n)]; } catch (e) { return [n, null]; }
  }));
  box.textContent = '';
  righe.forEach(([n, d]) => {
    const r = document.createElement('div'); r.className = 'riga';
    const t = document.createElement('span');
    t.textContent = 'Giorno ' + n + ': ' + (d && d.apertaIl ? 'aperta il ' + d.apertaIl.toDate().toLocaleString('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'non ancora aperta');
    r.appendChild(t);
    if (d) {
      const b = document.createElement('button'); b.className = 'bottone piccolo chiaro'; b.textContent = 'Ripristina';
      b.onclick = async () => {
        try { await conTimeout(S.deleteDoc(rif('aperture', n)), 15000); delete visti[n]; avviso('Stato ripristinato per il giorno ' + n + '.'); caricaAperture(); }
        catch (e) { avviso('Ripristino non riuscito. Riprova.'); }
      };
      r.appendChild(b);
    }
    box.appendChild(r);
  });
}
let ultimoInvito = '';
async function caricaDestinatari() {
  const box = $('elencoDestinatari'); box.textContent = 'Caricamento...';
  try {
    const snap = await conTimeout(S.getDocs(S.collection(db, 'destinatari')), 12000);
    box.textContent = '';
    if (snap.empty) { box.textContent = 'Nessun dispositivo autorizzato.'; return; }
    snap.forEach((d) => {
      const r = document.createElement('div'); r.className = 'riga';
      const t = document.createElement('span'); t.textContent = 'Dispositivo: ' + d.id.substring(0, 10) + '…';
      const b = document.createElement('button'); b.className = 'bottone piccolo chiaro'; b.textContent = 'Revoca';
      b.onclick = async () => {
        if (!confirm('Revocare l’accesso a questo dispositivo?')) return;
        try { await conTimeout(S.deleteDoc(rif('destinatari', d.id)), 15000); await caricaDestinatari(); avviso('Accesso revocato.'); }
        catch (e) { avviso('Revoca non riuscita.'); }
      };
      r.append(t, b); box.appendChild(r);
    });
  } catch (e) { box.textContent = 'Impossibile caricare i dispositivi.'; }
}
async function generaInvito() {
  $('generaInvito').disabled = true;
  try {
    const bytes = new Uint8Array(16); crypto.getRandomValues(bytes);
    const codice = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    const scadenza = S.Timestamp.fromDate(new Date(Date.now() + 6 * 86400000));
    await conTimeout(S.setDoc(rif('inviti', codice), { creatoIl: S.serverTimestamp(), scade: scadenza, usato: false }), 15000);
    ultimoInvito = codice;
    $('testoInvito').textContent = codice;
    $('copiaInvito').hidden = false;
    avviso('Invito creato. Condividilo privatamente con lei.');
  } catch (e) { avviso('Invito non creato. Controlla le regole e riprova.'); }
  finally { $('generaInvito').disabled = false; }
}
function iniziaAdmin() {
  if (adminPronto) return; adminPronto = true;
  const sel = $('aNum');
  for (let n = 1; n <= 24; n++) { const o = document.createElement('option'); o.value = n; o.textContent = 'Giorno ' + n; sel.appendChild(o); }
  sel.onchange = caricaForm;
  $('ingranaggio').onclick = async () => {
    if (!sonoAdmin()) return;
    $('admin').classList.add('visibile');
    const c = (await leggi('config', 'principale').catch(() => null)) || {};
    $('tTitoloB').value = c.titoloBenvenuto || $('titoloBenvenuto').textContent;
    $('tFraseB').value = c.fraseBenvenuto || $('fraseBenvenuto').textContent;
    $('tTitoloC').value = c.titoloCal || $('titoloCal').textContent;
    $('tTestoC').value = c.testoCal || $('testoCal').textContent;
    caricaForm(); caricaAperture(); caricaDestinatari();
  };
  $('aTorna').onclick = () => { $('admin').classList.remove('visibile'); aggiornaClassi(); };
  $('aEsci').onclick = async () => { try { await A.signOut(auth); } catch (e) {} location.reload(); };
  $('aAggiorna').onclick = caricaAperture;
  $('generaInvito').onclick = generaInvito;
  $('copiaInvito').onclick = () => { if (ultimoInvito) navigator.clipboard.writeText(ultimoInvito).then(() => avviso('Codice copiato.')).catch(() => avviso('Seleziona il codice e copialo manualmente.')); };
  $('aFile').onchange = async () => {
    const f = $('aFile').files[0]; if (!f) return;
    try { fotoAdmin = await ridimensiona(f); fotoCambiata = true; mostraFotoAdmin(); }
    catch (e) { avviso('Foto non valida o troppo grande. Riprova con un\'altra.'); }
  };
  $('aRimuovi').onclick = () => { fotoAdmin = null; fotoCambiata = true; $('aFile').value = ''; mostraFotoAdmin(); };
  $('aAnteprima').onclick = () => {
    const d = datiForm();
    mostraCarta(+num(), d, d.tipo !== 'messaggio' ? fotoAdmin : null, true);
  };
  /* messaggio e foto vengono scritti insieme in un'unica operazione atomica: o tutto o niente */
  $('aSalva').onclick = async () => {
    if (salvando) return;
    const n = num(), d = datiForm();
    if (d.bottoneLink && !/^https?:\/\//i.test(d.bottoneLink)) { avviso('L\'indirizzo del pulsante deve iniziare con https://'); return; }
    if (d.tipo !== 'messaggio' && !fotoAdmin) { avviso('Questo tipo di sorpresa richiede una foto.'); return; }
    salvando = true; $('aSalva').disabled = true;
    try {
      const b = S.writeBatch(db); let v = fotoV;
      if (fotoCambiata) {
        if (fotoAdmin) { v = Date.now(); b.set(rif('foto', n), { dati: fotoAdmin, v }); }
        else { v = 0; if (fotoSuServer) b.delete(rif('foto', n)); }
      }
      const haFoto = d.tipo !== 'messaggio' && !!fotoAdmin;
      b.set(rif('caselle', n), { ...d, haFoto, fotoV: v, aggiornatoIl: S.serverTimestamp() });
      await conTimeout(b.commit(), 20000);
      fotoV = v; fotoCambiata = false; fotoSuServer = !!fotoAdmin;
      stato[n] = { ok: true, dati: { ...d, haFoto, fotoV: v } };
      avviso('Sorpresa salvata con successo!');
    } catch (e) {
      avviso(e.code === 'permission-denied' ? 'Salvataggio negato: controlla le regole e il tuo UID.' : 'Salvataggio non confermato. Controlla la connessione e riprova.');
    } finally { salvando = false; $('aSalva').disabled = false; }
  };
  $('tSalva').onclick = async () => {
    const c = { titoloBenvenuto: $('tTitoloB').value.trim(), fraseBenvenuto: $('tFraseB').value.trim(), titoloCal: $('tTitoloC').value.trim(), testoCal: $('tTestoC').value.trim() };
    try { await conTimeout(S.setDoc(rif('config', 'principale'), c), 15000); applicaTesti(c); avviso('Testi salvati con successo!'); }
    catch (e) { avviso('Salvataggio non riuscito. Controlla la connessione e riprova.'); }
  };
}

/* ---------- inizializzazione di Firebase (con gestione degli errori) ---------- */
async function inizializza() {
  if (!configurato) { problema = MSG_CONFIG; banner(problema); return; }
  try {
    const app = await import(FB + 'firebase-app.js');
    A = await import(FB + 'firebase-auth.js');
    S = await import(FB + 'firebase-firestore.js');
    const ap = app.initializeApp(firebaseConfig);
    auth = A.getAuth(ap); db = S.getFirestore(ap);
    await new Promise((ok, ko) => {
      const t = setTimeout(() => ko(new Error('timeout')), 12000);
      A.onAuthStateChanged(auth, (u) => { utente = u; document.body.classList.toggle('admin', sonoAdmin()); clearTimeout(t); ok(); }, (e) => { clearTimeout(t); ko(e); });
    });
    pronta = true;
    leggi('config', 'principale').then(applicaTesti).catch(() => {});
    iniziaAdmin();
  } catch (e) { console.error(e); problema = MSG_RETE; banner(problema); }
}
const inizio = inizializza();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
