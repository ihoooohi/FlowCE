const slides=[
 {src:'assets/nasdaq_three_revolutions_extended.png',title:'三次革命：涨跌之后，历史会怎样继续？'},
 {src:'assets/nasdaq_history_1981_2026.png',title:'45 年：真实时间轴上的纳斯达克'},
 {src:'assets/nasdaq_two_crashes_recovery.png',title:'跌下去以后：多久才能回到前高？'},
 {src:'assets/three_tech_revolutions_nasdaq_full.png',title:'三次革命：从各自起点开始'},
 {src:'assets/three_tech_revolutions_nasdaq_48months.png',title:'公平一点：只比较前 48 个月'},
 {src:'assets/nasdaq_dotcom_vs_ai_full.png',title:'互联网泡沫 vs. AI：完整走势'},
 {src:'assets/nasdaq_dotcom_vs_ai_zoom.png',title:'同样的 48 个月，涨幅相差多少？'}
];
const viewer=document.getElementById('viewer');
const viewerImg=document.getElementById('viewerImage');
const viewerTitle=document.getElementById('viewerTitle');
const viewerIndex=document.getElementById('viewerIndex');
const viewerCounter=document.getElementById('viewerCounter');
const viewerDownload=document.getElementById('viewerDownload');
const closeBtn=document.getElementById('viewerClose');
let active=0, returnFocus=null;
const visibleIndices=()=>[...document.querySelectorAll('.chart-card:not([hidden])')].map(c=>+c.dataset.index);
function changeSlide(index){
 active=index;
 const entry=slides[index];
 viewerImg.src=entry.src;
 viewerImg.alt=entry.title;
 viewerTitle.textContent=entry.title;
 viewerIndex.textContent=`FIGURE ${String(index+1).padStart(2,'0')} / 07`;
 viewerCounter.textContent=`${visibleIndices().indexOf(index)+1} / ${visibleIndices().length}`;
 viewerDownload.href=entry.src;
 viewerDownload.download=entry.src.split('/').pop();
}
function openViewer(index){returnFocus=document.activeElement;viewer.hidden=false;viewer.setAttribute('aria-hidden','false');document.body.classList.add('no-scroll');changeSlide(index);closeBtn.focus();}
function closeViewer(){viewer.hidden=true;viewer.setAttribute('aria-hidden','true');document.body.classList.remove('no-scroll');viewerImg.removeAttribute('src');if(returnFocus) returnFocus.focus();}
function switchSlide(step){const ids=visibleIndices();let idx=ids.indexOf(active);if(idx<0)idx=0;changeSlide(ids[(idx+step+ids.length)%ids.length]);}
document.querySelectorAll('.js-open').forEach(el=>el.addEventListener('click',()=>openViewer(+el.dataset.index)));
closeBtn.addEventListener('click',closeViewer);
viewer.addEventListener('click',event=>{if(event.target.dataset.close==='true') closeViewer();});
document.getElementById('viewerPrev').addEventListener('click',()=>switchSlide(-1));
document.getElementById('viewerNext').addEventListener('click',()=>switchSlide(1));
document.addEventListener('keydown',event=>{
 if(viewer.hidden)return;
 if(event.key==='Escape'){event.preventDefault();closeViewer();}
 if(event.key==='ArrowLeft'){event.preventDefault();switchSlide(-1);}
 if(event.key==='ArrowRight'){event.preventDefault();switchSlide(1);}
 if(event.key==='Tab'){
  const focusable=[...viewer.querySelectorAll('a[href],button:not([disabled])')];
  const first=focusable[0], last=focusable[focusable.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 }
});
const filterButtons=[...document.querySelectorAll('.filter')];
const cards=[...document.querySelectorAll('.chart-card')];
filterButtons.forEach(button=>button.addEventListener('click',()=>{
 const filter=button.dataset.filter;
 filterButtons.forEach(other=>{other.classList.toggle('is-active',other===button);other.setAttribute('aria-pressed',String(other===button));});
 let visible=0;
 cards.forEach(card=>{card.hidden=(filter!=='all'&&card.dataset.category!==filter);if(!card.hidden)visible++;});
 document.getElementById('displayCount').textContent=`显示 ${visible} 张图`;
 document.getElementById('emptyMessage').hidden=visible>0;
}));
