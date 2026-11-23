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
const MAX_FOTO = 6;
let galleriaCorrente = [], indiceFoto = 0;
function mostraIndiceFoto() {
  const nav = $('cNavigazione');
  const g = $('cGalleria');
  if (!g || !$('cFoto')) return;
  g.hidden = !galleriaCorrente.length;
  if (!galleriaCorrente.length) { $('cFoto').removeAttribute('src'); return; }
  $('cFoto').src = galleriaCorrente[indiceFoto];
  if (nav) nav.hidden = galleriaCorrente.length < 2;
  if ($('cContatore')) $('cContatore').textContent = (indiceFoto + 1) + ' / ' + galleriaCorrente.length;
}
if ($('cPrecedente')) $('cPrecedente').onclick = () => { indiceFoto = (indiceFoto + galleriaCorrente.length - 1) % galleriaCorrente.length; mostraIndiceFoto(); };
if ($('cSuccessiva')) $('cSuccessiva').onclick = () => { indiceFoto = (indiceFoto + 1) % galleriaCorrente.length; mostraIndiceFoto(); };
let xInizio = null;
$('cFoto')?.addEventListener('touchstart', e => { xInizio = e.touches[0]?.clientX ?? null; }, {passive:true});
$('cFoto')?.addEventListener('touchend', e => {
  if (xInizio === null || galleriaCorrente.length < 2) return;
  const dx = (e.changedTouches[0]?.clientX ?? xInizio) - xInizio; xInizio = null;
  if (Math.abs(dx) > 40) { indiceFoto = (indiceFoto + (dx < 0 ? 1 : -1) + galleriaCorrente.length) % galleriaCorrente.length; mostraIndiceFoto(); }
}, {passive:true});
function visualizzaFoto(foto) {
  galleriaCorrente = Array.isArray(foto) ? foto.filter(Boolean) : (foto ? [foto] : []);
  indiceFoto = 0; mostraIndiceFoto();
}
function riempi(n, d, foto) {
  $('quizInCarta').hidden = true; $('quizInCarta').replaceChildren();
  resetSpoiler6();
  d = d || {};
  const tipo = d.tipo || 'messaggio';
  $('cData').textContent = n + ' dicembre 2026';
  $('cTitolo').textContent = d.titolo || (n === 24 ? 'Buon Natale, amore mio' : 'La sorpresa di oggi');
  $('cTesto').textContent = tipo === 'foto' ? '' : (d.messaggio || 'Qui apparirà la sorpresa del giorno ' + n + ' \u2764\uFE0F');
  $('cTesto').hidden = !$('cTesto').textContent;
  visualizzaFoto(foto);
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
const rifFoto = (n, i) => S.doc(db, 'gallerie', String(n), 'immagini', String(i));
async function caricaFoto(n, d) {
  if (!d || !d.haFoto) return [];
  if (Number.isInteger(d.fotoCount) && d.fotoCount > 0) {
    if (d.fotoCount > MAX_FOTO) throw new Error('Galleria troppo grande');
    const docs = await Promise.all(Array.from({length:d.fotoCount}, (_,i) => S.getDocFromServer(rifFoto(n,i))));
    if (docs.some(x => !x.exists() || x.data().v !== d.fotoV || !x.data().dati)) throw new Error('Galleria non completa');
    return docs.map(x=>x.data().dati);
  }
  // Compatibilita' con le foto salvate prima dell'aggiornamento.
  const f = await leggi('foto', n);
  return f && f.v === d.fotoV ? [f.dati] : [];
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
  if (n === 6) mostraSpoiler6();
  if ([18,19,20].includes(n)) mostraQuiz(n);
  if (st.dati && st.dati.haFoto) {
    caricaFoto(n, st.dati).then((foto) => { if (cartaN === n && $('sorpresa').classList.contains('visibile')) visualizzaFoto(foto); }).catch(() => avviso('Non riesco a caricare le foto. Controlla la connessione.'));
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
let fotoAdmin = [], fotoCambiata = false, fotoV = 0, fotoCount = 0, legacyFoto = false, salvando = false, adminPronto = false;
const num = () => $('aNum').value;
function datiForm() {
  return { titolo: $('aTitolo').value.trim(), messaggio: $('aMessaggio').value.trim(), tipo: $('aTipo').value, bottoneTesto: $('aBtnTesto').value.trim(), bottoneLink: $('aBtnLink').value.trim() };
}
function mostraFotoAdmin() {
  const box = $('aGalleria'); if (!box) return; box.replaceChildren();
  fotoAdmin.forEach((src, i) => {
    const scheda = document.createElement('div'); scheda.className = 'foto-admin-item';
    const im = document.createElement('img'); im.src = src; im.alt = 'Foto ' + (i+1); scheda.appendChild(im);
    const bottoni = document.createElement('div'); bottoni.className = 'foto-admin-azioni';
    [['←',()=>spostaFoto(i,-1),'Sposta indietro'],['→',()=>spostaFoto(i,1),'Sposta avanti'],['×',()=>{fotoAdmin.splice(i,1);fotoCambiata=true;mostraFotoAdmin();},'Rimuovi foto']].forEach(([testo,azione,aria]) => {
      const b = document.createElement('button'); b.type='button'; b.textContent=testo; b.setAttribute('aria-label',aria);
      b.disabled = (testo==='←' && i===0) || (testo==='→' && i===fotoAdmin.length-1);
      b.onclick=azione; bottoni.appendChild(b);
    });
    scheda.appendChild(bottoni); box.appendChild(scheda);
  });
  const p = document.createElement('p'); p.className = 'aiuto-foto'; p.textContent = fotoAdmin.length + ' / ' + MAX_FOTO + ' foto'; box.appendChild(p);
}
function spostaFoto(i, passo) { const j=i+passo; if (j<0||j>=fotoAdmin.length) return; [fotoAdmin[i],fotoAdmin[j]]=[fotoAdmin[j],fotoAdmin[i]]; fotoCambiata=true; mostraFotoAdmin(); }
let caricamentoForm = 0;
async function caricaForm() {
  const id=++caricamentoForm;
  try {
    const n=num(), d = (await leggi('caselle', n)) || {};
    const foto = d.haFoto ? await caricaFoto(n,d) : [];
    if (id !== caricamentoForm || n !== num()) return;
    $('aTitolo').value = d.titolo || ''; $('aMessaggio').value = d.messaggio || ''; $('aTipo').value = d.tipo || 'messaggio';
    $('aBtnTesto').value = d.bottoneTesto || ''; $('aBtnLink').value = d.bottoneLink || '';
    fotoV = d.fotoV || 0; fotoCount = d.fotoCount || 0; legacyFoto = !!(d.haFoto && !fotoCount);
    fotoAdmin = foto; fotoCambiata = false; $('aFile').value = ''; mostraFotoAdmin();
  } catch (e) { if (id === caricamentoForm) avviso('Non riesco a leggere la casella o le sue foto. Controlla la connessione.'); }
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
  installaSpoilerAdmin();
  $('ingranaggio').onclick = async () => {
    if (!sonoAdmin()) return;
    $('admin').classList.add('visibile');
    const c = (await leggi('config', 'principale').catch(() => null)) || {};
    $('tTitoloB').value = c.titoloBenvenuto || $('titoloBenvenuto').textContent;
    $('tFraseB').value = c.fraseBenvenuto || $('fraseBenvenuto').textContent;
    $('tTitoloC').value = c.titoloCal || $('titoloCal').textContent;
    $('tTestoC').value = c.testoCal || $('testoCal').textContent;
    caricaForm(); caricaAperture(); caricaDestinatari(); aggiornaQuizAdmin(); caricaSpoilerAdmin();
  };
  $('aTorna').onclick = () => { anteprimaQuizVersione++; $('quizAnteprima').hidden = true; $('quizAnteprima').replaceChildren(); $('admin').classList.remove('visibile'); aggiornaClassi(); };
  $('aEsci').onclick = async () => { try { await A.signOut(auth); } catch (e) {} location.reload(); };
  $('aAggiorna').onclick = caricaAperture;
  document.querySelectorAll('[data-quiz-preview]').forEach(b => { b.onclick = () => apriAnteprimaQuiz(Number(b.dataset.quizPreview)); });
  $('quizImporta').onclick = importaQuiz;
  $('quizAggiornaRisposte').onclick = aggiornaQuizAdmin;
  $('quizPubblicaRisultato').onclick = pubblicaRisultatoQuiz;
  $('generaInvito').onclick = generaInvito;
  $('copiaInvito').onclick = () => { if (ultimoInvito) navigator.clipboard.writeText(ultimoInvito).then(() => avviso('Codice copiato.')).catch(() => avviso('Seleziona il codice e copialo manualmente.')); };
  $('aFile').onchange = async () => {
    const file = Array.from($('aFile').files); $('aFile').value = '';
    if (!file.length) return;
    if (fotoAdmin.length + file.length > MAX_FOTO) { avviso('Puoi inserire al massimo ' + MAX_FOTO + ' foto per casella.'); return; }
    const selezionata = num(); $('aFile').disabled = true;
    try {
      const nuove = await Promise.all(file.map(ridimensiona));
      if (num() !== selezionata) { avviso('Hai cambiato casella durante il caricamento: seleziona di nuovo le foto.'); return; }
      fotoAdmin.push(...nuove); fotoCambiata = true; mostraFotoAdmin();
    } catch (e) { avviso('Una foto non è valida o è troppo grande. Prova con immagini diverse.'); }
    finally { $('aFile').disabled = false; }
  };
  $('aAnteprima').onclick = () => {
    const d = datiForm();
    mostraCarta(+num(), d, d.tipo !== 'messaggio' ? fotoAdmin : [], true);
  };
  // Le foto vengono salvate in documenti distinti, nel medesimo batch della casella.
  $('aSalva').onclick = async () => {
    if (salvando) return;
    const n = num(), d = datiForm();
    if (d.bottoneLink && !/^https?:\/\//i.test(d.bottoneLink)) { avviso('L\'indirizzo del pulsante deve iniziare con https://'); return; }
    if (d.tipo !== 'messaggio' && !fotoAdmin.length) { avviso('Questo tipo di sorpresa richiede almeno una foto.'); return; }
    salvando = true; $('aSalva').disabled = true; $('aNum').disabled = true;
    try {
      const b = S.writeBatch(db); let v = fotoV, count = fotoCount;
      const fotoAttive = d.tipo !== 'messaggio' ? fotoAdmin : [];
      const cambiano = fotoCambiata || (d.tipo === 'messaggio' && fotoCount > 0) || (d.tipo === 'messaggio' && legacyFoto);
      if (cambiano) {
        v = Date.now(); count = fotoAttive.length;
        fotoAttive.forEach((src, i) => b.set(rifFoto(n, i), { dati:src, v }));
        for (let i=count; i<fotoCount; i++) b.delete(rifFoto(n,i));
        if (legacyFoto) b.delete(rif('foto', n));
      }
      const haFoto = fotoAttive.length > 0;
      b.set(rif('caselle', n), { ...d, haFoto, fotoV:v, fotoCount:count, aggiornatoIl:S.serverTimestamp() });
      await conTimeout(b.commit(), 25000);
      fotoV = v; fotoCount = count; fotoCambiata = false; legacyFoto = false;
      stato[n] = { ok:true, dati:{ ...d, haFoto, fotoV:v, fotoCount:count } };
      avviso('Sorpresa salvata con successo!');
    } catch (e) {
      console.error('Errore salvataggio',e);
      avviso(e.code === 'permission-denied' ? 'Salvataggio negato: verifica le nuove regole Firestore.' : 'Salvataggio non confermato. Controlla la connessione e riprova.');
    } finally { salvando = false; $('aSalva').disabled = false; $('aNum').disabled = false; }
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


/* L'anteprima è isolata: legge soltanto quizParti, NON salva né consulta le soluzioni. */
let anteprimaQuizVersione = 0;
const anteprimaQuizRisposte = new Map();
async function apriAnteprimaQuiz(giorno) {
  if (!sonoAdmin() || ![18,19,20].includes(giorno)) return;
  const box = $('quizAnteprima');
  if (!box || !$('admin').classList.contains('visibile')) return;
  const versione = ++anteprimaQuizVersione;
  box.hidden = false;
  box.replaceChildren(hQuiz('p', 'Caricamento anteprima…', 'quiz-stato'));
  try {
    // Lettura autorizzata all'amministratore, anche prima delle date di sblocco.
    const snap = await conTimeout(S.getDocFromServer(quizDoc('quizParti', giorno)), 14000);
    if (versione !== anteprimaQuizVersione || !$('admin').classList.contains('visibile')) return;
    if (!snap.exists() || !Array.isArray(snap.data().domande) || snap.data().domande.length !== 5) {
      box.replaceChildren(hQuiz('p', 'Questa parte non è stata configurata correttamente su Firebase.', 'quiz-stato'));
      return;
    }
    disegnaAnteprimaQuiz(giorno, snap.data().domande, versione);
  } catch (errore) {
    if (versione !== anteprimaQuizVersione) return;
    console.error('Anteprima quiz', errore);
    box.replaceChildren(hQuiz('p', 'Impossibile caricare la parte. Verifica la connessione e le regole Firebase.', 'quiz-stato'));
  }
}
function disegnaAnteprimaQuiz(giorno, domande, versione) {
  const box = $('quizAnteprima');
  box.replaceChildren();
  const intestazione = hQuiz('div', null, 'quiz-preview-intestazione');
  intestazione.appendChild(hQuiz('h3', 'Quanto mi conosci davvero?'));
  intestazione.appendChild(hQuiz('p', 'Anteprima privata · Parte ' + ([18,19,20].indexOf(giorno)+1) + ' di 3 · Nessun salvataggio', 'quiz-stato'));
  const chiudi = hQuiz('button', 'Chiudi anteprima', 'bottone piccolo chiaro');
  chiudi.type='button';
  chiudi.onclick=()=>{ anteprimaQuizVersione++; anteprimaQuizRisposte.clear(); box.replaceChildren(); box.hidden=true; };
  intestazione.appendChild(chiudi);
  box.appendChild(intestazione);
  const form = hQuiz('form', null, 'quiz-form');
  const progresso = hQuiz('p', null, 'quiz-stato');
  const area = hQuiz('div');
  const comandi = hQuiz('div', null, 'quiz-preview-navigazione');
  const indietro = hQuiz('button', 'Indietro', 'bottone piccolo chiaro'); indietro.type='button';
  const avanti = hQuiz('button', 'Avanti', 'bottone piccolo'); avanti.type='submit';
  const ricomincia = hQuiz('button', 'Ricomincia la prova', 'bottone piccolo chiaro'); ricomincia.type='button';
  comandi.append(indietro, avanti, ricomincia);
  form.append(progresso,area,comandi);
  box.appendChild(form);
  let indice = 0;
  let risposte = {};
  const salvaLocale = () => {
    const q=domande[indice];
    if (q.tipo==='scelta') risposte[q.id]=area.querySelector('input:checked')?.value || '';
    else risposte[q.id]=(area.querySelector('textarea')?.value || '').trim();
  };
  const disegna = () => {
    if (versione!==anteprimaQuizVersione) return;
    const q=domande[indice]; area.replaceChildren();
    progresso.textContent='Domanda '+q.id+' di 15 · '+(indice+1)+'/5 di questa parte';
    area.appendChild(hQuiz('h4',q.domanda));
    if (q.tipo==='scelta') {
      (q.opzioni||[]).forEach((val,j)=>{
        const lettera='ABCD'[j],label=hQuiz('label',null,'quiz-opzione');
        const radio=document.createElement('input'); radio.type='radio';radio.name='anteprima-'+giorno+'-'+q.id;radio.value=lettera;
        radio.checked=risposte[q.id]===lettera;
        label.append(radio,document.createTextNode(' '+lettera+'. '+val));area.appendChild(label);
      });
    } else {
      const campo=hQuiz('textarea',null,'campo');campo.rows=3;campo.maxLength=400;
      campo.placeholder='Scrivi la tua risposta';campo.value=risposte[q.id]||'';area.appendChild(campo);
    }
    indietro.disabled=indice===0;
    avanti.textContent=indice===4?'Termina prova':'Avanti';
  };
  indietro.onclick=()=>{ salvaLocale(); if(indice>0)indice--;disegna(); };
  ricomincia.onclick=()=>{risposte={};indice=0;disegna();};
  form.onsubmit=(event)=>{
    event.preventDefault();
    if (versione!==anteprimaQuizVersione) return;
    salvaLocale();
    if (!risposte[domande[indice].id]) { avviso('Rispondi prima di proseguire.');return; }
    if (indice<4) {indice++;disegna();return;}
    // Risposte temporanee: soltanto in questa sessione JavaScript.
    form.replaceChildren(hQuiz('h3', 'Prova completata!'));
    form.appendChild(hQuiz('p','Hai provato tutte le cinque domande della parte '+([18,19,20].indexOf(giorno)+1)+'. Nessuna risposta è stata salvata o inviata.','quiz-stato'));
    const diNuovo=hQuiz('button','Ricomincia la prova','bottone piccolo chiaro');diNuovo.type='button';
    diNuovo.onclick=()=>{risposte={};indice=0;form.replaceChildren(progresso,area,comandi);disegna();};
    form.appendChild(diNuovo);
  };
  disegna();
}

/* ========== QUIZ A TRE GIORNI (18, 19, 20 dicembre) ========== */
const QUIZ_GIORNI = [18,19,20];
const quizDoc = (c, id) => S.doc(db, c, String(id));
const quizStato = {};
let risposteRevisionate = null;
const hQuiz = (tag, testo, classe) => {
  const e = document.createElement(tag);
  if (testo !== undefined && testo !== null) e.textContent = String(testo);
  if (classe) e.className = classe;
  return e;
};
const messaggioQuiz = (m) => { $('quizImportMessaggio').textContent = m; };
async function importaQuiz() {
  if (!sonoAdmin()) return;
  const file = $('quizImportFile').files[0];
  if (!file) { messaggioQuiz('Seleziona prima il file JSON privato incluso nello ZIP.'); return; }
  $('quizImporta').disabled = true;
  try {
    const data = JSON.parse(await file.text());
    if (!data.parti || !data.soluzioni || data.versione !== 1) throw new Error('Formato non riconosciuto');
    const tutte = [];
    for (const day of QUIZ_GIORNI) {
      const domande = data.parti[String(day)];
      if (!Array.isArray(domande) || domande.length !== 5) throw new Error('Giorno ' + day + ': servono 5 domande');
      for (const q of domande) {
        if (!Number.isInteger(q.id) || q.id < 1 || q.id > 15 || typeof q.domanda !== 'string' || !['scelta','aperta'].includes(q.tipo)) throw new Error('Domanda non valida');
        if (q.tipo === 'scelta' && (!Array.isArray(q.opzioni) || q.opzioni.length !== 4)) throw new Error('Opzioni mancanti');
        if (q.tipo === 'scelta' && !['A','B','C','D'].includes(data.soluzioni[String(q.id)])) throw new Error('Soluzione mancante');
        if (q.tipo === 'aperta' && typeof data.soluzioni[String(q.id)] !== 'string') throw new Error('Riferimento risposta aperta mancante');
        tutte.push(q.id);
      }
    }
    if (new Set(tutte).size !== 15) throw new Error('Numeri di domanda duplicati');
    // Dopo che esistono risposte, non riscriviamo le domande e non invalidiamo il punteggio.
    for (const giorno of QUIZ_GIORNI) {
      const snap = await S.getDocFromServer(quizDoc('quizRisposte', giorno));
      if (snap.exists()) throw new Error('Il quiz ha già risposte: importazione bloccata per non sovrascriverle.');
    }
    const batch = S.writeBatch(db);
    for (const giorno of QUIZ_GIORNI) {
      batch.set(quizDoc('quizParti', giorno), { domande: data.parti[String(giorno)], aggiornatoIl: S.serverTimestamp() });
    }
    batch.set(quizDoc('quizPrivato', 'soluzioni'), { chiavi: data.soluzioni, aggiornatoIl: S.serverTimestamp() });
    await conTimeout(batch.commit(), 24000);
    $('quizImportFile').value = '';
    messaggioQuiz('Quiz configurato! Domande e soluzioni salvate in Firebase. Il file privato deve restare fuori da GitHub.');
    avviso('Le tre parti del quiz sono state configurate.');
  } catch (e) {
    console.error('Importazione quiz',e);
    messaggioQuiz('Importazione non riuscita: ' + (e.code === 'permission-denied' ? 'controlla le regole Firestore.' : e.message));
  } finally { $('quizImporta').disabled = false; }
}
function mostraMessaggioQuiz(box, messaggio) {
  box.replaceChildren(hQuiz('p', messaggio, 'quiz-stato'));
}
async function mostraQuiz(giorno) {
  const box = $('quizInCarta');
  box.hidden = false;
  mostraMessaggioQuiz(box, 'Caricamento del quiz…');
  const token = Symbol(); quizStato[giorno] = token;
  try {
    // Il server vieta la lettura delle domande future alla destinataria.
    const [parteSnap,rispSnap] = await Promise.all([
      conTimeout(S.getDocFromServer(quizDoc('quizParti', giorno)), 12000),
      conTimeout(S.getDocFromServer(quizDoc('quizRisposte', giorno)), 12000)
    ]);
    if (quizStato[giorno] !== token || cartaN !== giorno || !$('sorpresa').classList.contains('visibile')) return;
    if (!parteSnap.exists()) { mostraMessaggioQuiz(box, sonoAdmin() ? 'Quiz non configurato: importa il file privato dal pannello amministratore.' : 'Il quiz non è ancora disponibile.'); return; }
    const domande = parteSnap.data().domande;
    if (!Array.isArray(domande) || domande.length !== 5) throw new Error('Dati quiz incompleti');
    box.replaceChildren();
    box.appendChild(hQuiz('h3','Quanto mi conosci davvero?'));
    box.appendChild(hQuiz('p', 'Parte ' + (QUIZ_GIORNI.indexOf(giorno)+1) + ' di 3 · Domande ' + domande[0].id + '–' + domande[4].id, 'quiz-stato'));
    if (sonoAdmin()) {
      box.appendChild(hQuiz('p','Modalità amministratore: le risposte sono visibili e correggibili dal pannello.', 'quiz-stato'));
      return;
    }
    if (rispSnap.exists()) {
      box.appendChild(hQuiz('p','Hai già completato questa parte. Le tue risposte sono state salvate.','quiz-stato'));
      await mostraRisultatoQuiz(box);
      return;
    }
    const form = document.createElement('form'); form.className = 'quiz-form';
    const scelta = {};
    let indice = 0;
    const progresso = hQuiz('p','', 'quiz-stato');
    const area = hQuiz('div');
    const pulsante = hQuiz('button','Avanti', 'bottone piccolo'); pulsante.type = 'submit';
    form.append(progresso, area, pulsante);
    const disegna = () => {
      const q=domande[indice]; area.replaceChildren();
      progresso.textContent = 'Domanda ' + q.id + ' di 15';
      area.appendChild(hQuiz('h4',q.domanda));
      if (q.tipo === 'scelta') {
        for (const [j,val] of q.opzioni.entries()) {
          const lettera='ABCD'[j];
          const label=hQuiz('label',null,'quiz-opzione');
          const radio=document.createElement('input'); radio.type='radio';radio.name='risposta';radio.value=lettera;radio.checked=scelta[q.id]===lettera;
          label.append(radio,document.createTextNode(' '+lettera+'. '+val)); area.appendChild(label);
        }
      } else {
        const campo = document.createElement('textarea'); campo.className='campo';campo.rows=3;campo.maxLength=400;campo.placeholder='Scrivi la tua risposta';campo.value=scelta[q.id]||'';
        campo.oninput=()=>scelta[q.id]=campo.value; area.appendChild(campo);
      }
      pulsante.textContent = indice === 4 ? 'Invia le cinque risposte' : 'Avanti';
    };
    form.onsubmit = async (event) => {
      event.preventDefault();
      const q=domande[indice];
      if (q.tipo === 'scelta') scelta[q.id]=area.querySelector('input:checked')?.value||'';
      else scelta[q.id]=(area.querySelector('textarea')?.value||'').trim();
      if (!scelta[q.id]) { avviso('Rispondi prima di proseguire.'); return; }
      if (indice < 4) { indice++; disegna(); return; }
      pulsante.disabled=true;
      try {
        await conTimeout(S.setDoc(quizDoc('quizRisposte',giorno), { uid: utente.uid, risposte: Object.fromEntries(Object.entries(scelta).map(([k,v])=>[k,String(v).slice(0,400)])), inviatoIl:S.serverTimestamp() }), 17000);
        mostraMessaggioQuiz(box,'Parte completata! Le risposte sono state salvate. Le soluzioni arriveranno alla fine della terza parte, dopo la correzione.');
        await mostraRisultatoQuiz(box);
      } catch (e) {
        const salvato=await S.getDocFromServer(quizDoc('quizRisposte',giorno)).catch(()=>null);
        if (salvato?.exists()) mostraMessaggioQuiz(box,'Le tue risposte risultano salvate correttamente.');
        else { pulsante.disabled=false; avviso('Impossibile salvare le risposte. Controlla la connessione e riprova.'); }
      }
    };
    box.append(form); disegna();
  } catch (e) {
    console.error('Quiz',e);
    if (quizStato[giorno] === token && cartaN===giorno) mostraMessaggioQuiz(box,'Impossibile caricare il quiz. Controlla la connessione o le regole Firebase.');
  }
}
async function mostraRisultatoQuiz(box) {
  if (sonoAdmin()) return;
  try {
    const snap=await S.getDocFromServer(quizDoc('quizRisultati','finale'));
    if (!snap.exists() || !snap.data().pubblicato || snap.data().uid !== utente.uid) return;
    const ris=snap.data();
    const area=hQuiz('section',null,'quiz-risultato');
    area.appendChild(hQuiz('h3','Il risultato finale: '+ris.punteggio+' / 15'));
    area.appendChild(hQuiz('p','Ecco le risposte corrette, dopo tutti e tre i giorni.'));
    for (const r of ris.dettagli||[]) {
      const card=hQuiz('div',null,'quiz-risposta');
      card.appendChild(hQuiz('strong',r.id+'. '+r.domanda));
      card.appendChild(hQuiz('p','La tua risposta: '+(r.risposta||'—')));
      card.appendChild(hQuiz('p',r.corretta?'Corretta':'Non corretta'));
      if (!r.corretta) card.appendChild(hQuiz('p','Risposta prevista: '+r.soluzione));
      area.appendChild(card);
    }
    box.appendChild(area);
  } catch (e) { /* Nessun risultato finche' l'admin non lo pubblica. */ }
}
let cacheQuizCorrezione=null;
async function aggiornaQuizAdmin() {
  if (!sonoAdmin()) return;
  const box=$('quizCorrezioni'); box.replaceChildren(hQuiz('p','Caricamento…'));
  $('quizPubblicaRisultato').hidden=true;
  try {
    const [p18,p19,p20,r18,r19,r20,sol,giudiziSnap] = await Promise.all([
      ...QUIZ_GIORNI.map(n=>S.getDocFromServer(quizDoc('quizParti',n))),
      ...QUIZ_GIORNI.map(n=>S.getDocFromServer(quizDoc('quizRisposte',n))),
      S.getDocFromServer(quizDoc('quizPrivato','soluzioni')),
      S.getDocFromServer(quizDoc('quizValutazione','manuale'))
    ]);
    const p=[p18,p19,p20], r=[r18,r19,r20];
    box.replaceChildren();
    if (p.some(s=>!s.exists()) || !sol.exists()) { box.appendChild(hQuiz('p','Quiz da configurare: importa il file JSON privato.')); return; }
    if (r.some(s=>!s.exists())) {
      const fatte=r.filter(s=>s.exists()).length;
      box.appendChild(hQuiz('p','Parti completate da lei: '+fatte+' su 3. Le soluzioni rimangono nascoste fino alla conclusione.'));
      return;
    }
    if (new Set(r.map(s=>s.data().uid)).size!==1) { box.appendChild(hQuiz('p','Le parti risultano inviate da UID diversi: verifica gli accessi prima di correggere.'));return; }
    const uid=r[0].data().uid;
    const risposte=Object.assign({},...r.map(s=>s.data().risposte));
    const domande=p.flatMap(s=>s.data().domande);
    const chiavi=sol.data().chiavi;
    const giudizi=giudiziSnap.exists() ? (giudiziSnap.data().giudizi || {}) : {};
    cacheQuizCorrezione={uid,risposte,domande,chiavi,giudizi};
    box.appendChild(hQuiz('p','Tutte le parti sono state consegnate. Correggi le tre domande aperte:'));
    for (const q of domande.filter(q=>q.tipo==='aperta')) {
      const blocco=hQuiz('div',null,'quiz-correggi');
      blocco.appendChild(hQuiz('strong',q.id+'. '+q.domanda));
      blocco.appendChild(hQuiz('p','Risposta di lei: '+(risposte[q.id]||'—')));
      blocco.appendChild(hQuiz('p','Risposta di riferimento: '+chiavi[q.id]));
      const select=document.createElement('select');select.className='campo';
      for (const [value,label] of [['','Da correggere'],['si','Corretta'],['no','Sbagliata']]) { const opt=new Option(label,value);select.appendChild(opt); }
      select.value=giudizi[q.id]===true?'si':giudizi[q.id]===false?'no':'';
      select.onchange=async()=>{
        if (!select.value) return;
        const nuovo={...cacheQuizCorrezione.giudizi,[String(q.id)]:select.value==='si'};
        select.disabled=true;
        try {
          await S.setDoc(quizDoc('quizValutazione','manuale'),{giudizi:nuovo,aggiornatoIl:S.serverTimestamp()});
          cacheQuizCorrezione.giudizi=nuovo; avviso('Correzione salvata.');
        } catch(e) { select.value='';avviso('Non riesco a salvare la correzione.'); }
        finally { select.disabled=false; aggiornaStatoPubblicazione(); }
      };
      blocco.appendChild(select);box.appendChild(blocco);
    }
    $('quizPubblicaRisultato').hidden=false;
    aggiornaStatoPubblicazione();
  } catch(e) {
    console.error('Revisione quiz',e);
    box.replaceChildren(hQuiz('p','Impossibile caricare le risposte. Controlla le regole Firebase e la connessione.'));
  }
}
function aggiornaStatoPubblicazione() {
  const c=cacheQuizCorrezione;
  if (!c) return;
  const aperte=c.domande.filter(q=>q.tipo==='aperta');
  $('quizPubblicaRisultato').disabled=!aperte.every(q=>typeof c.giudizi[String(q.id)]==='boolean');
}
async function pubblicaRisultatoQuiz() {
  if (!sonoAdmin() || !cacheQuizCorrezione) return;
  const c=cacheQuizCorrezione;
  if (c.domande.filter(q=>q.tipo==='aperta').some(q=>typeof c.giudizi[String(q.id)]!=='boolean')) { avviso('Correggi prima tutte le risposte aperte.'); return; }
  if (!confirm('Pubblicare il risultato finale e mostrare tutte le soluzioni alla destinataria?')) return;
  const dettagli=c.domande.map(q=>{
    const response=c.risposte[String(q.id)]||'';
    const lettera=c.chiavi[String(q.id)];
    const corretta=q.tipo==='aperta' ? c.giudizi[String(q.id)] : response===lettera;
    const soluzione=q.tipo==='aperta' ? lettera : q.opzioni['ABCD'.indexOf(lettera)];
    const testo=q.tipo==='aperta' ? response : q.opzioni['ABCD'.indexOf(response)] || response;
    return {id:q.id,domanda:q.domanda,risposta:testo,corretta,soluzione};
  });
  const punteggio=dettagli.filter(x=>x.corretta).length;
  $('quizPubblicaRisultato').disabled=true;
  try {
    await conTimeout(S.setDoc(quizDoc('quizRisultati','finale'), {uid:c.uid, pubblicato:true, punteggio, dettagli, pubblicatoIl:S.serverTimestamp()}), 18000);
    avviso('Risultato pubblicato: '+punteggio+'/15. Lei può vederlo nelle caselle del quiz.');
  } catch(e) { avviso('Pubblicazione non riuscita: verifica la connessione e le regole.'); }
  finally { $('quizPubblicaRisultato').disabled=false; }
}

/* ---------- Giorno 6: spoiler pixelato e gratta il cuore ----------
   I dati sul server contengono solo la miniatura gia' pixelata.
   Non c'e' alcuna scrittura durante il gioco: ogni apertura ricomincia da zero.
*/
const SPOILER_RIF = () => S.doc(db, 'spoiler6', 'config');
let spoilerCaricatoAdmin = null, spoilerImmagineNuova = null, spoilerVersione = 0, spoilerInizializzato = false;
function resetSpoiler6() {
  spoilerVersione++;
  const area = $('spoiler6');
  if (!area) return;
  area.hidden = true;
  $('spoilerNascosto').hidden = true;
  $('spoilerImmagine').hidden = true;
  $('spoilerCanvas').hidden = false;
  $('spoilerProgresso').textContent = 'Gratta il cuore con il dito';
}
// Foto rimpicciolita a 28x28 e poi ingrandita solo per la visualizzazione.
// Pixelare *prima* del salvataggio impedisce di recuperare la foto nitida da Firestore.
function preparaSpoilerPixelato(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/') || file.size > 15 * 1024 * 1024) return reject(new Error('Seleziona una foto valida inferiore a 15 MB.'));
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      try {
        const canv = document.createElement('canvas'); canv.width = 28; canv.height = 28;
        const ctx = canv.getContext('2d', { willReadFrequently: false });
        ctx.fillStyle = '#f9edf0'; ctx.fillRect(0,0,28,28);
        const ratio = Math.min(28/im.width,28/im.height);
        const w=im.width*ratio, h=im.height*ratio;
        ctx.drawImage(im,(28-w)/2,(28-h)/2,w,h);
        const data=canv.toDataURL('image/jpeg',0.72);
        if (data.length > 25000) throw new Error('Immagine non valida');
        resolve(data);
      } catch(e) { reject(e); }
      finally { URL.revokeObjectURL(url); }
    };
    im.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Immagine non leggibile')); };
    im.src = url;
  });
}
async function caricaSpoilerAdmin() {
  if (!sonoAdmin()) return;
  $('spoilerAdminMessaggio').textContent = 'Caricamento…';
  try {
    const d = await conTimeout(S.getDocFromServer(SPOILER_RIF()),12000);
    spoilerCaricatoAdmin = d.exists() ? d.data() : null;
    spoilerImmagineNuova = null;
    $('spoilerAttivo').checked = !!spoilerCaricatoAdmin?.attivo;
    $('spoilerFrase').value = spoilerCaricatoAdmin?.testo || '';
    const anteprima = $('spoilerAdminImmagine');
    anteprima.hidden = !spoilerCaricatoAdmin?.immagine;
    if (spoilerCaricatoAdmin?.immagine) anteprima.src = spoilerCaricatoAdmin.immagine;
    else anteprima.removeAttribute('src');
    $('spoilerAdminMessaggio').textContent = spoilerCaricatoAdmin ? 'Spoiler caricato. Puoi modificarlo.' : 'Carica una foto e salva lo spoiler.';
  } catch (e) { $('spoilerAdminMessaggio').textContent = 'Impossibile caricare lo spoiler da Firebase.'; }
}
function installaSpoilerAdmin() {
  if (spoilerInizializzato) return; spoilerInizializzato = true;
  $('spoilerFile').onchange = async () => {
    const file = $('spoilerFile').files[0]; if (!file) return;
    $('spoilerAdminMessaggio').textContent = 'Creo la versione pixelata…';
    try {
      spoilerImmagineNuova = await preparaSpoilerPixelato(file);
      $('spoilerAdminImmagine').src = spoilerImmagineNuova;
      $('spoilerAdminImmagine').hidden = false;
      $('spoilerAdminMessaggio').textContent = 'Foto pixelata, pronta da salvare.';
    } catch (e) { $('spoilerAdminMessaggio').textContent = e.message || 'Errore di caricamento'; }
    finally { $('spoilerFile').value = ''; }
  };
  $('spoilerSalva').onclick = async () => {
    if (!sonoAdmin()) return;
    const immagine = spoilerImmagineNuova || spoilerCaricatoAdmin?.immagine || '';
    const testo = $('spoilerFrase').value.trim();
    const attivo = $('spoilerAttivo').checked;
    if (attivo && (!immagine || !testo)) { $('spoilerAdminMessaggio').textContent = 'Per attivarlo servono sia una foto sia una frase.'; return; }
    const b = $('spoilerSalva'); b.disabled = true;
    try {
      const d = { attivo, testo, immagine, aggiornatoIl: S.serverTimestamp() };
      await conTimeout(S.setDoc(SPOILER_RIF(), d),18000);
      spoilerCaricatoAdmin = { attivo, testo, immagine };
      spoilerImmagineNuova = null;
      $('spoilerAdminMessaggio').textContent = 'Spoiler del 6 dicembre salvato.';
    } catch(e) { console.error('Spoiler6 salvataggio',e); $('spoilerAdminMessaggio').textContent = 'Salvataggio fallito. Verifica le regole Firebase e la connessione.'; }
    finally { b.disabled = false; }
  };
  $('spoilerAnteprima').onclick = () => {
    if (!sonoAdmin()) return;
    const dati = {attivo: true, immagine: spoilerImmagineNuova || spoilerCaricatoAdmin?.immagine, testo: $('spoilerFrase').value.trim()};
    if (!dati.immagine || !dati.testo) { $('spoilerAdminMessaggio').textContent='Carica prima la foto e scrivi il testo.'; return; }
    const d = stato[6]?.dati || {titolo:'Sorpresa del 6 dicembre'};
    // Non ricarichiamo le fotografie della casella: la prova dello spoiler e' locale.
    $('admin').classList.remove('visibile');
    mostraCarta(6,d,null,true);
    disegnaSpoiler6(dati);
  };
}
async function mostraSpoiler6() {
  const token = spoilerVersione;
  try {
    const snap = await conTimeout(S.getDocFromServer(SPOILER_RIF()),12000);
    if (token !== spoilerVersione || cartaN !== 6 || !$('sorpresa').classList.contains('visibile')) return;
    if (!snap.exists() || !snap.data().attivo || !snap.data().immagine) return;
    disegnaSpoiler6(snap.data());
  } catch(e) { if(token === spoilerVersione) console.warn('Spoiler del giorno 6 non disponibile',e); }
}
function disegnaSpoiler6(d) {
  const area=$('spoiler6'), cover=$('spoilerCanvas'), nascosto=$('spoilerNascosto'), img=$('spoilerImmagine');
  if (!area || !d?.immagine) return;
  area.hidden = false; nascosto.hidden = true;
  img.src = d.immagine; img.hidden=false; $('spoilerTesto').textContent = d.testo || '';
  cover.hidden = false; $('spoilerProgresso').textContent = 'Gratta il cuore con il dito';
  const ctx=cover.getContext('2d',{willReadFrequently:true}), W=cover.width,H=cover.height;
  ctx.clearRect(0,0,W,H);
  const path=new Path2D();
  path.moveTo(160,285);
  path.bezierCurveTo(133,257,20,169,20,101);
  path.bezierCurveTo(20,17,123,5,160,76);
  path.bezierCurveTo(197,5,300,17,300,101);
  path.bezierCurveTo(300,169,187,257,160,285);
  path.closePath();
  ctx.fillStyle='#a83a56';ctx.fill(path);
  ctx.save(); ctx.clip(path);
  ctx.fillStyle='rgba(255,255,255,.12)';
  for(let k=0;k<35;k++){ctx.beginPath();ctx.arc((k*53)%W,(k*97)%H,2+(k%3),0,Math.PI*2);ctx.fill();}
  ctx.restore();
  ctx.save();ctx.fillStyle='#fff0d9';ctx.font='bold 20px sans-serif';ctx.textAlign='center';ctx.fillText('GRATTA QUI',160,155);ctx.restore();
  const points=[];
  for(let y=4;y<H;y+=5)for(let x=4;x<W;x+=5)if(ctx.isPointInPath(path,x,y))points.push([x,y]);
  const identita=spoilerVersione;
  let grattando=false, ultimo=null, rivelato=false, aggiornato=0;
  function gratta(e){
    const r=cover.getBoundingClientRect();
    return {x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};
  }
  function percentuale(){
    const pixel=ctx.getImageData(0,0,W,H).data;
    let cancellati=0;
    for (const [x,y] of points) if(pixel[(y*W+x)*4+3]<55)cancellati++;
    return cancellati / points.length;
  }
  function verifica(){
    if(rivelato || identita!==spoilerVersione)return;
    const p=percentuale();
    if(p>=0.9){
      rivelato=true; cover.hidden=true; nascosto.hidden=false;
      $('spoilerProgresso').textContent='Spoiler sbloccato! Riapri la casella per grattare di nuovo.';
      cuori(10,area);
    } else $('spoilerProgresso').textContent='Continua a grattare… '+Math.floor(p*100)+'%';
  }
  cover.onpointerdown=e=>{
    if(rivelato || identita!==spoilerVersione)return;
    grattando=true;ultimo=gratta(e);
    try{cover.setPointerCapture(e.pointerId);}catch(_){}
    e.preventDefault();
  };
  cover.onpointermove=e=>{
    if(!grattando || rivelato || identita!==spoilerVersione)return;
    const pos=gratta(e);
    ctx.save();ctx.clip(path);ctx.globalCompositeOperation='destination-out';ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=39;
    ctx.beginPath();ctx.moveTo(ultimo.x,ultimo.y);ctx.lineTo(pos.x,pos.y);ctx.stroke();ctx.restore();
    ultimo=pos;e.preventDefault();
    const now=performance.now(); if(now-aggiornato>180){aggiornato=now;verifica();}
  };
  cover.onpointerup=cover.onpointercancel=e=>{if(!grattando)return;grattando=false;verifica();};
}
