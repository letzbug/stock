/* ZXing continuous scanner. No dependency on the browser's BarcodeDetector. */
(()=>{
 let active=null,loading=null;
 function decoder(){
   if(window.ZXingBrowser)return Promise.resolve(window.ZXingBrowser);
   if(loading)return loading;
   loading=new Promise((resolve,reject)=>{
     const s=document.createElement('script');s.src='https://unpkg.com/@zxing/browser@0.1.5/umd/zxing-browser.min.js';
     s.onload=()=>window.ZXingBrowser?resolve(window.ZXingBrowser):reject(Error('Decoder unavailable'));
     s.onerror=()=>{s.remove();loading=null;reject(Error('Decoder unavailable'));};document.head.append(s);
   });return loading;
 }
 function article(code){
   const matches=db.items.filter(x=>code&&x.barcode===code);
   if(matches.length===1){editItem(matches[0].id);return;}
   if(matches.length>1){page('inventory');currentPlace='';document.querySelector('#search').value=matches[0].name;render();flash('Choisissez le lieu de cet article.');return;}
   itemForm('Nouvel article',{name:'',barcode:code,category:'Autre',unit:'pièces',quantity:1,minimum:0},d=>{
     const x={id:crypto.randomUUID(),...d,quantity:Number(d.quantity),minimum:Number(d.minimum),updatedBy:'Frank G',updatedAt:new Date().toISOString()};
     db.items.unshift(x);db.movements.unshift({id:crypto.randomUUID(),itemId:x.id,itemName:x.name,delta:x.quantity,reason:'Nouvelle entrée',actor:'Frank G',createdAt:new Date().toISOString()});save();flash('Article enregistré');
   });
 }
 async function scan(){
   if(active)return;
   document.querySelector('#modal').classList.remove('show');
   const focus=document.activeElement,box=document.createElement('section');box.className='barcode-overlay';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','Scanner un code-barres');
   box.innerHTML='<header class="barcode-head"><b>Scanner un code-barres</b><button type="button">Fermer</button></header><div class="barcode-stage"><video autoplay muted playsinline></video><div class="barcode-frame"></div></div><p role="status" class="barcode-help">Préparation du scanner…</p><form class="barcode-manual"><label for="manualCode">Ou saisir le code</label><div><input id="manualCode" required maxlength="200" autocomplete="off" placeholder="EAN / code-barres"><button type="submit">Valider</button></div></form>';
   document.body.append(box);const v=box.querySelector('video'),status=box.querySelector('[role=status]');v.muted=true;v.setAttribute('webkit-playsinline','');
   let closed=false,stream=null,controls=null;
   const close=()=>{if(closed)return;closed=true;controls?.stop();stream?.getTracks().forEach(t=>t.stop());v.pause();v.srcObject=null;box.remove();active=null;document.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',hide);focus?.focus();};
   const key=e=>{if(e.key==='Escape')close();if(e.key==='Tab'){const a=[...box.querySelectorAll('button,input')];if(e.shiftKey&&document.activeElement===a[0]){e.preventDefault();a.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===a.at(-1)){e.preventDefault();a[0].focus();}}};
   const hide=()=>{if(document.hidden)close();};active={close};box.querySelector('button').onclick=close;
   box.querySelector('form').onsubmit=e=>{e.preventDefault();const code=box.querySelector('input').value.trim();if(code){close();article(code);}};
   document.addEventListener('keydown',key);document.addEventListener('visibilitychange',hide);box.querySelector('button').focus();
   try{
     if(!navigator.mediaDevices?.getUserMedia||!window.isSecureContext)throw Object.assign(Error(),{name:'InsecureContext'});
     const engine=decoder();engine.catch(()=>{});
     stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});
     if(closed){stream.getTracks().forEach(t=>t.stop());return;}
     v.srcObject=stream;await v.play();status.textContent='Cadrez le code-barres. Gardez le téléphone immobile.';
     const ZX=await engine;if(closed)return;
     const reader=new ZX.BrowserMultiFormatReader(undefined,{delayBetweenScanAttempts:180,delayBetweenScanSuccess:700});
     controls=await reader.decodeFromStream(stream,v,(result,error,handle)=>{if(closed)return;if(result){const code=result.getText();handle?.stop();close();article(code);}});
     if(closed)controls.stop();
   }catch(e){if(!closed)status.textContent=e.name==='NotAllowedError'?'Autorisez la caméra dans les réglages Safari, puis rouvrez le scanner.':e.name==='InsecureContext'?'Ouvrez cette page en HTTPS pour utiliser la caméra.':'Impossible de démarrer la lecture. Vérifiez Internet ou saisissez le code ci-dessous.';}
 }
 document.querySelector('#scan').onclick=scan;window.startStockScanner=scan;
})();
