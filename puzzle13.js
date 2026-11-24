/* Puzzle + Timeline, giorno 13. Modulo aggiuntivo: non altera app.js. */
import {firebaseConfig, UID_ADMIN} from './firebase-config.js';
import {getApp, getApps, initializeApp} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {getAuth, onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {getFirestore, doc, getDocFromServer, setDoc, serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const app13 = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth13 = getAuth(app13);
const db13 = getFirestore(app13);
const $13 = id => document.getElementById(id);
const configRef13 = doc(db13, 'puzzle13', 'config');
const empty13 = () => Array.from({length:5},()=>({titolo:'',data:'',testo:'',foto:''}));
let cached13=null, ready13=false, session13=0, lastVisible13=false, lastDay13=false, preview13=false;
const admin13=()=>!!auth13.currentUser && !auth13.currentUser.isAnonymous && auth13.currentUser.uid===UID_ADMIN;
function err13(e){console.error('Puzzle giorno 13:', e);return 'Operazione non riuscita. Controlla le regole Firebase e la connessione.';}

const block13=document.createElement('section');
block13.id='p13Area'; block13.className='p13-area'; block13.hidden=true;
block13.innerHTML=`<h3>Un ricordo da ricomporre 💙</h3><p class="p13-desc">Tocca due pezzi per scambiarli e ricomporre la nostra foto. Quando finirai, si aprirà la nostra storia.</p><div class="p13-board" id="p13Board" role="group" aria-label="Puzzle fotografico, nove pezzi"></div><p id="p13Info" class="p13-info" aria-live="polite"></p><button type="button" id="p13Reset" class="bottone piccolo chiaro">Ricomincia il puzzle</button><div id="p13Vittoria" class="p13-vittoria" hidden><h3>Hai sbloccato la nostra timeline! 💙</h3><p>Ogni ricordo è un pezzo della nostra storia.</p></div><div id="p13Timeline" class="p13-timeline" hidden></div>`;
const carta13=$13('carta');
if(carta13 && $13('cLink')) carta13.insertBefore(block13,$13('cLink'));

function puzzle13Start(preview=false, target=block13, data=null){
 const board=target.querySelector('#p13Board'); if(!board)return;
 const info=target.querySelector('#p13Info'),victory=target.querySelector('#p13Vittoria'), timeline=target.querySelector('#p13Timeline');
 const reset=target.querySelector('#p13Reset');
 target.hidden=false; victory.hidden=true; timeline.hidden=true; timeline.replaceChildren();
 const session=++session13; const tiles=[...Array(9).keys()];
 // Shuffle a caso, senza presentare già il puzzle completo.
 for(let i=8;i>0;i--){const j=Math.floor(Math.random()*(i+1));[tiles[i],tiles[j]]=[tiles[j],tiles[i]];}
 if(tiles.every((v,i)=>v===i)) [tiles[0],tiles[1]]=[tiles[1],tiles[0]];
 let chosen=-1, moves=0;
 info.textContent='Scegli un pezzo, poi un altro per scambiarli.';
 const render=()=>{
  board.replaceChildren();
  tiles.forEach((piece,index)=>{
   const b=document.createElement('button');b.type='button';b.className='p13-tile'+(chosen===index?' scelto':'');
   b.setAttribute('aria-label',`Posizione ${index+1}, pezzo ${piece+1}`);
   b.style.backgroundPosition=`${(piece%3)*50}% ${Math.floor(piece/3)*50}%`;
   b.onclick=()=>{
    if(session!==session13 || !timeline.hidden)return;
    if(chosen===-1){chosen=index;render();return;}
    if(chosen===index){chosen=-1;render();return;}
    [tiles[chosen],tiles[index]]=[tiles[index],tiles[chosen]];chosen=-1;moves++;render();
    if(tiles.every((v,i)=>v===i)){
      info.textContent=`Puzzle completato in ${moves} mosse!`;
      [...board.children].forEach(el=>{el.disabled=true;el.classList.add('finito')});
      victory.hidden=false;
      renderTimeline13(timeline, data || cached13);timeline.hidden=false;
      victory.scrollIntoView({behavior:'smooth',block:'nearest'});
    }else info.textContent=`${moves} scambi effettuati. Continua!`;
   };
   board.appendChild(b);
  });
 };
 render();
 reset.onclick=()=>{if(session===session13)puzzle13Start(preview,target,data)};
}
function renderTimeline13(target,docData){
 target.replaceChildren();
 const tappe=Array.isArray(docData?.tappe)?docData.tappe:empty13();
 tappe.slice(0,5).forEach((t,i)=>{
   const item=document.createElement('article');item.className='p13-tappa';
   const number=document.createElement('span');number.className='p13-num';number.textContent=`${i+1}`;item.append(number);
   const content=document.createElement('div');content.className='p13-tappa-content';
   const title=document.createElement('h4');title.textContent=t?.titolo?.trim() || `Ricordo ${i+1}`;content.append(title);
   if(t?.data){const d=document.createElement('small');d.textContent=t.data;content.append(d)}
   if(t?.foto && String(t.foto).startsWith('data:image/')){const im=new Image();im.src=t.foto;im.alt=`Fotografia del ricordo ${i+1}`;im.loading='lazy';content.append(im)}
   const p=document.createElement('p');p.textContent=t?.testo?.trim() || 'Un ricordo da raccontare…';content.append(p);
   item.append(content);target.append(item);
 });
}

async function show13IfNeeded(){
 if(!block13 || !$13('sorpresa'))return;
 const visible=$13('sorpresa').classList.contains('visibile');
 const day=visible && /^13 dicembre 2026$/.test(($13('cData')?.textContent||'').trim());
 if(visible===lastVisible13 && day===lastDay13)return;
 lastVisible13=visible;lastDay13=day;
 if(!day){block13.hidden=true;session13++;return;}
 // Le regole Firestore decidono realmente se l'utente è autorizzato.
 const seq=++session13;
 block13.hidden=true;
 try{
   const snap=await getDocFromServer(configRef13);
   if(seq!==session13 || !$13('sorpresa').classList.contains('visibile') || !/^13 dicembre/.test($13('cData')?.textContent||''))return;
   cached13=snap.exists()?snap.data():{tappe:empty13()};
   puzzle13Start(false,block13,cached13);
 }catch(e){console.warn('Puzzle 13 non disponibile',e); if(admin13() && seq===session13){puzzle13Start(false,block13,{tappe:empty13()});}}
}

const adminPanel13=document.createElement('div');adminPanel13.id='p13AdminPanel';adminPanel13.className='blocco p13-admin';adminPanel13.hidden=true;
adminPanel13.innerHTML=`<h3>Puzzle + Timeline • 13 dicembre</h3><p>La fotografia del puzzle è già impostata. Personalizza le cinque tappe della timeline. Tutti i dati rimangono in Firebase.</p><div id="p13AdminSteps"></div><p id="p13AdminStatus" role="status"></p><button type="button" id="p13Save" class="bottone piccolo">Salva le 5 tappe</button> <button type="button" id="p13Preview" class="bottone piccolo chiaro">Prova puzzle e timeline</button><div id="p13AdminPreview" hidden></div>`;
const adminCol13=$13('admin')?.querySelector('.colonna');
if(adminCol13){const other=$13('spoilerAdminPannello');if(other)other.insertAdjacentElement('afterend',adminPanel13);else adminCol13.append(adminPanel13)}
function formSteps13(data){
 const root=$13('p13AdminSteps'); root.replaceChildren();
 const tappe=Array.isArray(data?.tappe)?data.tappe:empty13();
 for(let i=0;i<5;i++){
  const t=tappe[i]||{};const el=document.createElement('fieldset');el.className='p13-fieldset';
  const legend=document.createElement('legend');legend.textContent=`Tappa ${i+1}`;el.append(legend);
  for(const [name,descr,max] of [['titolo','Titolo',80],['data','Data (anche in formato libero)',50],['testo','Testo del ricordo',900]]){
   const label=document.createElement('label');label.textContent=descr;
   const field=name==='testo'?document.createElement('textarea'):document.createElement('input');
   field.className='campo';field.maxLength=max;field.value=t[name]||'';field.dataset.part=i;field.dataset.field=name;
   if(name==='testo')field.rows=3;label.append(field);el.append(label);
  }
  const label=document.createElement('label');label.textContent='Foto facoltativa (puoi cambiarla quando vuoi)';
  const input=document.createElement('input');input.className='campo';input.type='file';input.accept='image/*';input.dataset.photoPart=i;
  const thumb=new Image();thumb.className='p13-admin-thumb';thumb.hidden=!t.foto;if(t.foto)thumb.src=t.foto;
  input.onchange=async()=>{
   const f=input.files?.[0];if(!f)return;
   $13('p13AdminStatus').textContent='Preparo la fotografia…';
   try{const encoded=await resize13(f);photo13[i]=encoded;thumb.src=encoded;thumb.hidden=false;$13('p13AdminStatus').textContent='Fotografia pronta. Premi Salva le 5 tappe.'}
   catch(e){$13('p13AdminStatus').textContent=e.message}
  };
  label.append(input,thumb);el.append(label);root.append(el);
 }
}
let photo13=empty13().map(()=>undefined);
async function resize13(file){
 if(!file.type.startsWith('image/') || file.size>12e6)throw Error('Seleziona un’immagine valida inferiore a 12 MB.');
 const url=URL.createObjectURL(file);try{
  const img=new Image();img.src=url;await img.decode();
  const canvas=document.createElement('canvas'),ratio=Math.min(1,420/Math.max(img.naturalWidth,img.naturalHeight));
  canvas.width=Math.round(img.naturalWidth*ratio);canvas.height=Math.round(img.naturalHeight*ratio);
  canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
  return canvas.toDataURL('image/jpeg',0.63);
 }finally{URL.revokeObjectURL(url)}
}
function readForm13(){
 const t=empty13();
 adminPanel13.querySelectorAll('[data-part]').forEach(el=>{t[+el.dataset.part][el.dataset.field]=el.value.trim()});
 t.forEach((entry,i)=>entry.foto=photo13[i]===undefined?(cached13?.tappe?.[i]?.foto||''):photo13[i]);
 return t;
}
function initAdmin13(){
 if(!adminPanel13)return;
 adminPanel13.hidden=!admin13();
 if(!admin13())return;
 if(!ready13){
  ready13=true;
  $13('p13Save').onclick=async()=>{
   const status=$13('p13AdminStatus'),btn=$13('p13Save');btn.disabled=true;status.textContent='Salvataggio in corso…';
   try{
    const t=readForm13();const payload={tappe:t,aggiornatoIl:serverTimestamp()};
    if(JSON.stringify(t).length>850000)throw Error('Le foto sono troppo grandi. Seleziona foto più leggere.');
    await setDoc(configRef13,payload);cached13={tappe:t};photo13=empty13().map(()=>undefined);
    status.textContent='Le cinque tappe sono state salvate su Firebase.';
   }catch(e){status.textContent=e.message?.includes('foto')?e.message:err13(e)}finally{btn.disabled=false}
  };
  $13('p13Preview').onclick=()=>{
   const host=$13('p13AdminPreview');host.hidden=false;
   host.innerHTML=`<div class="p13-area"><h3>Anteprima privata</h3><p class="p13-desc">Completa il puzzle per aprire la timeline.</p><div id="p13Board" class="p13-board"></div><p id="p13Info" class="p13-info"></p><button type="button" id="p13Reset" class="bottone piccolo chiaro">Ricomincia il puzzle</button><div id="p13Vittoria" class="p13-vittoria" hidden><h3>Hai sbloccato la nostra timeline! 💙</h3></div><div id="p13Timeline" class="p13-timeline" hidden></div></div>`;
   puzzle13Start(true,host,{tappe:readForm13()});host.scrollIntoView({behavior:'smooth',block:'start'});
  };
 }
 $13('p13AdminStatus').textContent='Carico le tappe salvate…';
 getDocFromServer(configRef13).then(s=>{
  if(!admin13())return;
  cached13=s.exists()?s.data():{tappe:empty13()};photo13=empty13().map(()=>undefined);formSteps13(cached13);
  $13('p13AdminStatus').textContent=s.exists()?'Tappe caricate. Puoi modificarle.':'Le cinque tappe sono vuote: compilale quando vuoi.';
 }).catch(e=>{$13('p13AdminStatus').textContent=err13(e);formSteps13({tappe:empty13()})});
}
onAuthStateChanged(auth13,()=>{initAdmin13()});
// La finestra originale riusa gli stessi nodi: osserviamo solo lo stato della finestra e il giorno.
const scene13=$13('sorpresa');if(scene13)new MutationObserver(()=>show13IfNeeded()).observe(scene13,{attributes:true,attributeFilter:['class']});
const day13=$13('cData');if(day13)new MutationObserver(()=>show13IfNeeded()).observe(day13,{childList:true,characterData:true,subtree:true});
show13IfNeeded();
