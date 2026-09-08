/* Server is authoritative. Never seed or restore stock from browser storage. */
const c=window.UNIPOP_STOCK_CONFIG||{};
const root=(c.supabaseUrl||'').replace(/\/$/,'')+'/rest/v1/';
const h={apikey:c.supabaseAnonKey,'Content-Type':'application/json',Prefer:'return=representation'};
if(c.supabaseAnonKey&&!c.supabaseAnonKey.startsWith('sb_publishable_'))h.Authorization='Bearer '+c.supabaseAnonKey;
let stockReady=false,stockBusy=false,baseline=structuredClone(db);
const status=document.createElement('p');status.id='stock-status';status.setAttribute('role','status');status.textContent='Connexion au stock partagé…';document.querySelector('.main').prepend(status);
const notify=flash;
flash=function(message){if(!stockBusy)notify(message);};
async function q(path,method='GET',body){
 const control=new AbortController(),timeout=setTimeout(()=>control.abort(),15000);
 try{const r=await fetch(root+path,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body),signal:control.signal});if(!r.ok)throw Error((await r.text()).slice(0,400));return r.status===204?[]:r.json();}finally{clearTimeout(timeout);}
}
function fromServer(l,r,i,m){
 const names=new Map(i.map(x=>[x.id,x]));
 return {locations:l.map(x=>({id:x.id,name:x.name,address:x.address||'',contact:x.contact||'',notes:x.notes||''})),rooms:r.map(x=>({id:x.id,locationId:x.location_id,name:x.name,floor:x.floor||'',notes:x.notes||''})),items:i.map(x=>({id:x.id,name:x.name,category:x.category,quantity:Number(x.quantity),unit:x.unit,minimum:Number(x.minimum),locationId:x.location_id,roomId:x.room_id,barcode:x.barcode||'',notes:x.notes||'',updatedBy:x.updated_by,updatedAt:new Date(x.updated_at).toLocaleString('fr-LU'),serverUpdatedAt:x.updated_at})),movements:m.map(x=>({id:x.id,itemId:x.item_id,itemName:names.get(x.item_id)?.name||'Article supprimé',delta:Number(x.delta),reason:x.reason,actor:x.actor,createdAt:new Date(x.created_at).toLocaleString('fr-LU')}))};
}
async function load(){
 stockReady=false;status.textContent='Chargement du stock partagé…';
 try{
  if(!c.supabaseUrl||!c.supabaseAnonKey)throw Error('Configuration manquante');
  const rows=await Promise.all(['locations','rooms','items','movements'].map(t=>q(t+'?select=*'+(t==='movements'?'&order=created_at.desc&limit=1000':''))));
  db=fromServer(...rows);baseline=structuredClone(db);stockReady=true;render();status.textContent='Stock partagé · à jour';
 }catch(e){status.textContent='Connexion impossible : aucun stock local affiché. Rechargez la page pour réessayer.';console.error('Stock load:',e.message);throw e;}
}
function wire(table,x){
 if(table==='locations')return {id:x.id,name:x.name,address:x.address||'',contact:x.contact||'',notes:x.notes||''};
 if(table==='rooms')return {id:x.id,location_id:x.locationId,name:x.name,floor:x.floor||'',notes:x.notes||''};
 return {id:x.id,name:x.name,category:x.category,quantity:Number(x.quantity),unit:x.unit,minimum:Number(x.minimum),location_id:x.locationId||null,room_id:x.roomId||null,barcode:x.barcode||'',notes:x.notes||'',updated_by:x.updatedBy};
}
save=async function(){
 if(!stockReady||stockBusy){db=structuredClone(baseline);render();notify('Attendez la connexion au stock partagé.');return;}
 stockBusy=true;status.textContent='Enregistrement…';
 try{
  for(const table of ['locations','rooms','items']){
   const before=new Map(baseline[table].map(x=>[x.id,x]));
   for(const x of db[table]){
    const old=before.get(x.id),payload=wire(table,x);
    if(old&&JSON.stringify(wire(table,old))===JSON.stringify(payload))continue;
    if(table==='items')payload.updated_at=new Date().toISOString();
    if(!old)await q(table,'POST',payload);
    else{
     const guard=table==='items'&&old.serverUpdatedAt?'&updated_at=eq.'+encodeURIComponent(old.serverUpdatedAt):'';
     const saved=await q(table+'?id=eq.'+encodeURIComponent(x.id)+guard,'PATCH',payload);
     if(!saved.length)throw Error('Le stock a changé sur un autre appareil. Réessayez après actualisation.');
    }
   }
  }
  const known=new Set(baseline.movements.map(x=>x.id));
  for(const m of db.movements.filter(x=>!known.has(x.id))){
   const itemId=m.itemId||db.items.find(x=>x.name===m.itemName)?.id;
   if(itemId)await q('movements','POST',{id:m.id,item_id:itemId,delta:m.delta,reason:m.reason,actor:m.actor,created_at:new Date().toISOString()});
  }
  await load();stockBusy=false;notify('Enregistré dans le stock partagé');
 }catch(e){
  console.error('Stock save:',e.message);
  try{await load();}catch(_){db=structuredClone(baseline);render();}
  stockBusy=false;status.textContent='Enregistrement incomplet. Vérifiez le stock avant de réessayer. Détails : '+e.message;notify('Enregistrement non confirmé.');
 }
};
// Gate mutations until the first read succeeds; never write cached stock back.
document.addEventListener('click',e=>{
 if(stockReady&&!stockBusy)return;
 if(e.target.closest('#newItem,#addLocation,#scan,.scan-action,.qty button,.location-card,.row-arrow,#locationDetail button,.secondary[onclick]')){e.preventDefault();e.stopImmediatePropagation();notify('Attendez la connexion au stock partagé.');}
},true);
document.addEventListener('submit',e=>{if(!stockReady||stockBusy){e.preventDefault();e.stopImmediatePropagation();}},true);
// Keep the code separate from the name and persist it for later scans.
const baseItemForm=itemForm;
itemForm=function(title,item={},done){
 baseItemForm(title,item,done);
 const label=document.createElement('label'),span=document.createElement('span'),input=document.createElement('input');
 span.textContent='Code-barres / EAN';input.name='barcode';input.value=item.barcode||'';input.maxLength=200;input.autocomplete='off';label.append(span,input);document.querySelector('#form').prepend(label);
 const noteLabel=document.createElement('label'),noteTitle=document.createElement('span'),note=document.createElement('textarea');
 noteTitle.textContent='Notes';note.name='notes';note.value=item.notes||'';note.placeholder='Ajouter une note utile pour cet article…';noteLabel.append(noteTitle,note);document.querySelector('#form').insertBefore(noteLabel,document.querySelector('#form button[type="submit"]'));
};
load().catch(()=>{});
