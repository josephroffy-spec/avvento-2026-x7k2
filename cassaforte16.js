/* Cassaforte romantica, 16 dicembre 2026. Modulo isolato. */
import {firebaseConfig, UID_ADMIN} from './firebase-config.js';
import {getApp,getApps,initializeApp} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {getFirestore,doc,getDocFromServer,setDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
const app16=getApps().length?getApp():initializeApp(firebaseConfig), auth16=getAuth(app16), db16=getFirestore(app16);
const E=id=>document.getElementById(id), ref=(group,id='config')=>doc(db16,group,id);
const isAdmin=()=>!!auth16.currentUser && !auth16.currentUser.isAnonymous && auth16.currentUser.uid===UID_ADMIN;
let public16=null,secret16=null,reward16=null,loaded16=false,stage16=0,session16=0,adminReady16=false,working16=false;
const blankPublic={attivo:false,indizio:'',domanda:'Ti ricordi cosa è successo in questa data?'};
const blankReward={testo:'',foto1:'',foto2:''};
const safeText=(s,max)=>String(s||'').trim().slice(0,max);
function msg16(s){const el=E('c16Status');if(el)el.textContent=s;}
function appendText(parent,tag,value,cls){const el=document.createElement(tag);el.textContent=value;if(cls)el.className=cls;parent.append(el);return el;}
function makeButton(text,fn,extra=''){const b=document.createElement('button');b.type='button';b.className='bottone piccolo '+extra;b.textContent=text;b.onclick=fn;return b;}
function target16(){const el=E('sorpresa');return !!el && el.classList.contains('visibile') && /^16 dicembre 2026$/.test(E('cData')?.textContent?.trim()||'');}
function clear16(){session16++;stage16=0;const el=E('c16Area');if(el){el.hidden=true;E('c16Main')?.replaceChildren();}}
const area16=document.createElement('section');area16.id='c16Area';area16.className='c16-area';area16.hidden=true;
area16.innerHTML='<h3>La cassaforte dell’amore 💙</h3><div id="c16Main"></div><p id="c16Status" class="c16-status" role="status"></p>';
if(E('carta')&&E('cLink'))E('carta').insertBefore(area16,E('cLink'));

function showCode16(root,{preview=false,code='',indizio='',domanda='',onUnlocked=()=>{}}={}){
 root.replaceChildren();appendText(root,'p','Inserisci il codice segreto di 4 cifre per aprire la cassaforte.');
 if(indizio)appendText(root,'p',`Indizio: ${indizio}`,'c16-hint');
 const form=document.createElement('form');form.className='c16-form';
 const input=document.createElement('input');input.className='campo c16-code';input.inputMode='numeric';input.pattern='[0-9]{4}';input.maxLength=4;input.autocomplete='off';input.placeholder='••••';input.type='text';input.setAttribute('aria-label','Codice segreto di quattro cifre');
 input.addEventListener('input',()=>input.value=input.value.replace(/\D/g,'').slice(0,4));
 const b=document.createElement('button');b.type='submit';b.className='bottone piccolo';b.textContent='Apri la cassaforte';
 form.append(input,b);root.append(form);
 form.onsubmit=async ev=>{
  ev.preventDefault();if(!/^[0-9]{4}$/.test(input.value)){msg16('Inserisci esattamente quattro cifre.');return;}
  if(preview){if(input.value===code){msg16('Codice corretto!');onUnlocked();}else msg16('Codice errato, riprova.');return;}
  if(working16)return;working16=true;b.disabled=true;msg16('Controllo il codice…');
  try{const uid=auth16.currentUser?.uid;if(!uid)throw Error('Accesso mancante');
   await setDoc(ref('cassaforte16Accessi',uid),{uid,codice:input.value,creatoIl:serverTimestamp()});
   msg16('Codice corretto!');onUnlocked();
  }catch(e){console.warn('Codice 16:',e);msg16(e.code==='permission-denied'?'Codice errato, riprova.':'Non riesco a verificare il codice. Riprova quando c’è connessione.');}
  finally{working16=false;b.disabled=false;}
 };
}
function showAnswer16(root,{preview=false,onSubmitted=()=>{},uid='',answer='',attempt=1}={}){
 root.replaceChildren();appendText(root,'h4',public16?.domanda||blankPublic.domanda);
 const form=document.createElement('form');form.className='c16-form';const textarea=document.createElement('textarea');textarea.className='campo';textarea.maxLength=1000;textarea.rows=4;textarea.required=true;textarea.placeholder='Scrivi qui il tuo ricordo…';textarea.value=answer;
 const btn=document.createElement('button');btn.type='submit';btn.className='bottone piccolo';btn.textContent='Invia la risposta';form.append(textarea,btn);root.append(form);
 form.onsubmit=async ev=>{ev.preventDefault();const value=textarea.value.trim();if(!value){msg16('Scrivi una risposta prima di inviarla.');return;}
  if(preview){onSubmitted(value);return;}
  if(working16)return;working16=true;btn.disabled=true;msg16('Invio la risposta…');
  try{await setDoc(ref('cassaforte16Risposte',uid),{uid,testo:value,tentativo:attempt,inviatoIl:serverTimestamp()});
   msg16('Risposta inviata. Ora aspetta la mia approvazione 💙');showPending16(root,uid);
  }catch(e){console.error(e);msg16('Invio non riuscito. Controlla la connessione o riprova.');}
  finally{working16=false;btn.disabled=false;}
 };
}
function showPending16(root,uid){root.replaceChildren();appendText(root,'p','Risposta inviata. Ora aspetta la mia approvazione 💙');root.append(makeButton('Controlla se è stata approvata',()=>loadStage16(uid),'chiaro'));}
function showReward16(root,data,preview=false){root.replaceChildren();appendText(root,'h4','La tua sorpresa è finalmente qui! 💙');
 if(data?.foto1){const img=new Image();img.src=data.foto1;img.alt='Prima fotografia della sorpresa';root.append(img)}
 if(data?.testo)appendText(root,'p',data.testo,'c16-reward-text');
 if(data?.foto2){const img=new Image();img.src=data.foto2;img.alt='Seconda fotografia della sorpresa';root.append(img)}
 if(!data?.foto1&&!data?.foto2&&!data?.testo)appendText(root,'p',preview?'Configura una sorpresa dal pannello amministratore.':'La sorpresa non è stata ancora preparata.');
}
async function loadStage16(uid){if(!target16())return;const token=session16;msg16('Controllo lo stato della cassaforte…');
 try{
  const [access,answer,decision]=await Promise.all([
   getDocFromServer(ref('cassaforte16Accessi',uid)),getDocFromServer(ref('cassaforte16Risposte',uid)),getDocFromServer(ref('cassaforte16Esiti',uid))]);
  if(token!==session16||!target16())return;
  const root=E('c16Main');if(!access.exists()){showCode16(root,{indizio:public16?.indizio,onUnlocked:()=>loadStage16(uid)});msg16('');return;}
  if(!answer.exists()){showAnswer16(root,{uid});msg16('Codice corretto. Ora rispondi alla domanda.');return;}
  const a=answer.data(), d=decision.exists()?decision.data():null;
  if(d?.tentativo===a.tentativo&&d.stato==='approvata'){
   const r=await getDocFromServer(ref('cassaforte16Regalo'));if(token!==session16||!target16())return;
   showReward16(root,r.exists()?r.data():blankReward);msg16('Sorpresa sbloccata!');return;
  }
  if(d?.tentativo===a.tentativo&&d.stato==='riprova'){
   showAnswer16(root,{uid,attempt:a.tentativo+1});msg16('Puoi riprovare: scrivi una nuova risposta.');return;
  }
  showPending16(root,uid);msg16('La risposta è in attesa della tua approvazione.');
 }catch(e){console.error('Cassaforte 16:',e);msg16('Non riesco a caricare lo stato. Verifica Firebase e la connessione.');}
}
async function show16(){if(!target16()){clear16();return;}
 const token=++session16;area16.hidden=true;E('c16Main')?.replaceChildren();
 try{const s=await getDocFromServer(ref('cassaforte16Pubblica'));
  if(token!==session16||!target16())return;public16=s.exists()?s.data():blankPublic;
  if(!public16.attivo){if(isAdmin()){area16.hidden=false;appendText(E('c16Main'),'p','Cassaforte non ancora attivata. Configurala dal pannello amministratore.');}return;}
  area16.hidden=false;
  if(isAdmin()){appendText(E('c16Main'),'p','La cassaforte è attiva. Usa il pulsante «Prova cassaforte» nel pannello amministratore per il test senza salvataggi.');return;}
  const uid=auth16.currentUser?.uid;if(!uid){msg16('Devi essere autorizzata per aprire la cassaforte.');return;}
  await loadStage16(uid);
 }catch(e){console.error(e);if(token===session16&&isAdmin()){area16.hidden=false;msg16('Non riesco a caricare la configurazione.');}}
}

// Pannello amministratore separato dall'app principale.
const panel16=document.createElement('div');panel16.id='c16AdminPanel';panel16.className='blocco c16-admin';panel16.hidden=true;
panel16.innerHTML=`<h3>Cassaforte dell’amore • 16 dicembre</h3><p>Il codice resta in Firebase e non nei file GitHub. Le foto e il messaggio normali della casella non vengono modificati.</p>
<label class="c16-check"><input id="c16Active" type="checkbox"> Attiva cassaforte</label>
<label>Codice segreto (4 cifre)<input id="c16Secret" class="campo" inputmode="numeric" maxlength="4" placeholder="Es. 0207" autocomplete="off"></label>
<label>Indizio<input id="c16Hint" class="campo" maxlength="200"></label>
<label>Domanda aperta<input id="c16Question" class="campo" maxlength="200" value="Ti ricordi cosa è successo in questa data?"></label>
<h4>Sorpresa finale: foto 1 → testo → foto 2</h4>
<label>Prima fotografia (facoltativa)<input id="c16Photo1" class="campo" type="file" accept="image/*"></label><img id="c16Thumb1" class="c16-thumb" hidden alt="Anteprima foto 1"><button type="button" id="c16Remove1" class="bottone piccolo chiaro">Rimuovi foto 1</button>
<label>Testo finale<textarea id="c16FinalText" class="campo" rows="4" maxlength="3000"></textarea></label>
<label>Seconda fotografia (facoltativa)<input id="c16Photo2" class="campo" type="file" accept="image/*"></label><img id="c16Thumb2" class="c16-thumb" hidden alt="Anteprima foto 2"><button type="button" id="c16Remove2" class="bottone piccolo chiaro">Rimuovi foto 2</button>
<div class="c16-actions"><button type="button" id="c16Save" class="bottone piccolo">Salva cassaforte e sorpresa</button><button type="button" id="c16Preview" class="bottone piccolo chiaro">Prova cassaforte</button></div>
<h4>Risposta della destinataria</h4><button id="c16Refresh" type="button" class="bottone piccolo chiaro">Leggi risposta ricevuta</button><div id="c16Review"></div>
<p id="c16AdminStatus" role="status"></p><div id="c16PreviewHost" class="c16-area" hidden></div>`;
const col=E('admin')?.querySelector('.colonna');if(col){const anchor=E('p13AdminPanel')||E('spoilerAdminPannello');if(anchor)anchor.insertAdjacentElement('afterend',panel16);else col.append(panel16);}
function adminMsg(s){E('c16AdminStatus').textContent=s;}
function displayThumb(i){const im=E('c16Thumb'+i),src=reward16?.['foto'+i];im.hidden=!src;if(src)im.src=src;else im.removeAttribute('src');}
async function scalePhoto(file){if(!file.type.startsWith('image/')||file.size>12000000)throw Error('Usa una foto inferiore a 12 MB.');
 const url=URL.createObjectURL(file);try{const img=new Image();img.src=url;await img.decode();const c=document.createElement('canvas'),ratio=Math.min(1,580/Math.max(img.naturalWidth,img.naturalHeight));c.width=Math.max(1,Math.round(img.naturalWidth*ratio));c.height=Math.max(1,Math.round(img.naturalHeight*ratio));c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c.toDataURL('image/jpeg',0.64)}finally{URL.revokeObjectURL(url)}
}
async function loadAdmin16(){if(!isAdmin())return;adminMsg('Carico la configurazione…');
 try{const [p,s,r]=await Promise.all([getDocFromServer(ref('cassaforte16Pubblica')),getDocFromServer(ref('cassaforte16Privata')),getDocFromServer(ref('cassaforte16Regalo'))]);
  public16=p.exists()?p.data():{...blankPublic};secret16=s.exists()?s.data():{codice:''};reward16=r.exists()?r.data():{...blankReward};
  E('c16Active').checked=!!public16.attivo;E('c16Secret').value=secret16.codice||'';E('c16Hint').value=public16.indizio||'';E('c16Question').value=public16.domanda||blankPublic.domanda;
  E('c16FinalText').value=reward16.testo||'';displayThumb(1);displayThumb(2);adminMsg('Configurazione caricata.');
 }catch(e){console.error(e);adminMsg('Impossibile caricare la configurazione. Controlla le regole Firebase.');}
}
async function saveAdmin16(){if(!isAdmin())return;const code=E('c16Secret').value.trim();if(!/^[0-9]{4}$/.test(code)){adminMsg('Il codice deve contenere esattamente 4 cifre.');return;}
 const publicData={attivo:E('c16Active').checked,indizio:safeText(E('c16Hint').value,200),domanda:safeText(E('c16Question').value,200)||blankPublic.domanda,aggiornatoIl:serverTimestamp()};
 const reward={testo:safeText(E('c16FinalText').value,3000),foto1:reward16?.foto1||'',foto2:reward16?.foto2||'',aggiornatoIl:serverTimestamp()};
 if(JSON.stringify(reward).length>750000){adminMsg('Fotografie troppo grandi. Scegline di più leggere.');return;}
 const btn=E('c16Save');btn.disabled=true;adminMsg('Salvataggio in corso…');
 try{await setDoc(ref('cassaforte16Privata'),{codice:code,aggiornatoIl:serverTimestamp()});
  await setDoc(ref('cassaforte16Regalo'),reward);await setDoc(ref('cassaforte16Pubblica'),publicData);public16=publicData;secret16={codice:code};reward16=reward;adminMsg('Cassaforte, domanda, foto e testo salvati.');
 }catch(e){console.error(e);adminMsg('Salvataggio incompleto. Controlla la connessione e ripremi Salva.');}finally{btn.disabled=false;}
}
function preview16(){const host=E('c16PreviewHost');host.hidden=false;host.replaceChildren();const h=appendText(host,'h3','Anteprima privata • 16 dicembre');const status=appendText(host,'p','','c16-status');
 const main=document.createElement('div');host.append(main);const showQ=()=>{
  main.replaceChildren();appendText(main,'h4',E('c16Question').value||blankPublic.domanda);
  const form=document.createElement('form');form.className='c16-form';const t=document.createElement('textarea');t.className='campo';t.rows=3;t.required=true;t.placeholder='Scrivi una risposta di prova…';const b=document.createElement('button');b.className='bottone piccolo';b.type='submit';b.textContent='Invia (solo anteprima)';form.append(t,b);main.append(form);
  form.onsubmit=ev=>{ev.preventDefault();if(!t.value.trim())return;main.replaceChildren();appendText(main,'p','Risposta inviata. Ora aspetta la mia approvazione 💙');main.append(makeButton('Simula approvazione',()=>showReward16(main,{foto1:reward16?.foto1||'',testo:E('c16FinalText').value,foto2:reward16?.foto2||''},true)));main.append(makeButton('Simula rifiuto e riprova',showQ,'chiaro'));};
 };
 showCode16(main,{preview:true,code:E('c16Secret').value,indizio:E('c16Hint').value,onUnlocked:showQ});
 // Il form d'anteprima scrive soltanto nel DOM, mai su Firebase.
 host.scrollIntoView({behavior:'smooth',block:'start'});
}
async function review16(){const root=E('c16Review');root.replaceChildren();adminMsg('Cerco la risposta…');
 try{
  const users=await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const q=users.query(users.collection(db16,'destinatari'),users.limit(20)),usersSnap=await users.getDocs(q);
  let found=0;
  for(const user of usersSnap.docs){const uid=user.id;const [a,d]=await Promise.all([getDocFromServer(ref('cassaforte16Risposte',uid)),getDocFromServer(ref('cassaforte16Esiti',uid))]);if(!a.exists())continue;
   found++;const answer=a.data();const decision=d.exists()?d.data():null;const state=decision?.tentativo===answer.tentativo?decision.stato:'in attesa';
   const card=document.createElement('div');card.className='c16-response';appendText(card,'p',`Destinataria: ${uid.slice(0,8)}… · Tentativo ${answer.tentativo} · Stato: ${state}`);appendText(card,'p',answer.testo,'c16-answer');
   const approve=makeButton('Approva',()=>decide16(uid,answer.tentativo,'approvata'));const retry=makeButton('Falla riprovare',()=>decide16(uid,answer.tentativo,'riprova'),'chiaro');
   card.append(approve,retry);root.append(card);
  }
  if(!found)appendText(root,'p','Non ci sono ancora risposte per il giorno 16.');adminMsg(`Risposte trovate: ${found}.`);
 }catch(e){console.error(e);adminMsg('Impossibile leggere le risposte. Controlla le autorizzazioni Firebase.');}
}
async function decide16(uid,attempt,state){if(!isAdmin())return;adminMsg('Aggiorno la valutazione…');
 try{const fresh=await getDocFromServer(ref('cassaforte16Risposte',uid));if(!fresh.exists()||fresh.data().tentativo!==attempt){adminMsg('È arrivata una risposta più recente: aggiorna l’elenco.');return;}
  await setDoc(ref('cassaforte16Esiti',uid),{uid,tentativo:attempt,stato:state,aggiornatoIl:serverTimestamp()});adminMsg(state==='approvata'?'Risposta approvata: sorpresa sbloccata.':'Risposta rifiutata: può riprovare.');await review16();
 }catch(e){console.error(e);adminMsg('Non sono riuscito ad aggiornare la valutazione.');}
}
function init16(){if(!col)return;panel16.hidden=!isAdmin();if(!isAdmin())return;if(!adminReady16){adminReady16=true;
 E('c16Secret').oninput=()=>E('c16Secret').value=E('c16Secret').value.replace(/\D/g,'').slice(0,4);
 for(const i of [1,2]){E('c16Photo'+i).onchange=async ev=>{const f=ev.target.files?.[0];if(!f)return;adminMsg('Preparo la fotografia…');try{if(!reward16)reward16={...blankReward};reward16['foto'+i]=await scalePhoto(f);displayThumb(i);adminMsg('Fotografia pronta. Premi Salva.')}catch(e){adminMsg(e.message)}};
  E('c16Remove'+i).onclick=()=>{if(!reward16)reward16={...blankReward};reward16['foto'+i]='';displayThumb(i);E('c16Photo'+i).value='';};}
 E('c16Save').onclick=saveAdmin16;E('c16Preview').onclick=preview16;E('c16Refresh').onclick=review16;
 }loadAdmin16();}
onAuthStateChanged(auth16,()=>{clear16();init16();if(target16())show16();});
const scene=E('sorpresa');if(scene)new MutationObserver(()=>{if(target16())show16();else clear16();}).observe(scene,{attributes:true,attributeFilter:['class']});
const day=E('cData');if(day)new MutationObserver(()=>{if(target16())show16();else clear16();}).observe(day,{childList:true,characterData:true,subtree:true});
if(target16())show16();
