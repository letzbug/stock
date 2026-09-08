/* Presentation layer: no database mutations. */
(() => {
 const $=s=>document.querySelector(s);
 const icon=(paths)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
 const icons=[icon('<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>'),icon('<path d="M5 21V3h10v18M3 21h18M15 9h5v12M8 7h3M8 11h3M8 15h3"/>'),icon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>')];
 document.querySelectorAll('.nav button').forEach((b,i)=>{b.innerHTML=icons[i]+`<span>${['Inventaire','Lieux & salles','Journal'][i]}</span>`;});
 const brand=document.createElement('div');brand.className='mobile-brand';brand.innerHTML='<img src="unipop-logo.png" alt="UniPop"><span>STOCK / 02</span>';$('.main').prepend(brand);
 $('.user').innerHTML='<b>UniPop Stock</b><small>Built by Frank G<br>IBM Certified AI Developer</small>';
 const scan=document.createElement('button');scan.type='button';scan.className='primary scan-action';scan.innerHTML=icon('<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M7 8v8m3-8v8m4-8v8m3-8v8"/>')+'Scanner';scan.onclick=()=>$('#scan').click();$('.top>div:last-child').prepend(scan);
 $('#search').setAttribute('aria-label','Rechercher le matériel');$('#placeFilter').setAttribute('aria-label','Filtrer par lieu');
 const mark=document.createElement('img');mark.className='print-brand';mark.src='unipop-logo.png';mark.alt='UniPop';$('.layout>.panel').prepend(mark);
 $('#print').textContent='Imprimer stock';$('#print').onclick=()=>{currentPlace='';$('#search').value='';page('inventory');render();$('#printTitle').textContent='Inventaire · Tous les lieux';window.print();};
 window.printLocation=(placeId)=>{currentPlace=placeId;$('#search').value='';page('inventory');render();$('#printTitle').textContent='Inventaire · '+(loc(placeId)?.name||'');window.print();};
 document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#modal').classList.remove('show');});
})();
