'use strict';
// Navigation: all content remains available without an investor gate.
const menuButton=document.querySelector('.menu-toggle');
const menu=document.querySelector('#site-menu');
function closeMenu(){menu.hidden=true;menuButton.setAttribute('aria-expanded','false');}
menuButton.addEventListener('click',()=>{menu.hidden=!menu.hidden;menuButton.setAttribute('aria-expanded',String(!menu.hidden));});
menu.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){closeMenu();menuButton.focus();}});
document.addEventListener('click',e=>{if(!e.target.closest('.site-header'))closeMenu();});
document.querySelector('.learn-link').addEventListener('click',()=>{document.querySelector('#introduction').focus({preventScroll:true});});

const video=document.querySelector('#hero-video');
const playButton=document.querySelector('#play-toggle');
const soundButton=document.querySelector('#sound-toggle');
const status=document.querySelector('#playback-status');
const ending=document.querySelector('.closing-frame');
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
const conserveData=Boolean(navigator.connection?.saveData);
let userPaused=false,autoPaused=false,inView=true,attempting=false,mediaFailed=false;
video.src=matchMedia('(max-width: 800px)').matches?'assets/video/hero-20260928-720.mp4':'assets/video/hero-20260928-1080.mp4';
video.controls=false;
document.querySelector('.playback-controls').hidden=false;
function syncControls(){
 playButton.textContent=video.ended?'Replay':video.paused?'Play':'Pause';
 soundButton.textContent=video.muted?'Sound on':'Sound off';
 soundButton.setAttribute('aria-pressed',String(!video.muted));
 ending.hidden=!video.ended;
}
async function play({automatic=false,audible=false}={}){
 if(attempting||mediaFailed||(automatic&&(userPaused||!inView||document.hidden||reduceMotion.matches||conserveData)))return;
 attempting=true;
 try{
  if(video.ended){video.currentTime=0;ending.hidden=true;}
  if(audible)video.muted=false;
  try{await video.play();}
  catch(error){
   if(!automatic)throw error;
   video.muted=true;await video.play();
  }
  autoPaused=false;status.textContent='';
 }catch(error){status.textContent='Press Play to start the film.';}
 finally{
  attempting=false;
  if(automatic&&(!inView||document.hidden)){autoPaused=true;video.pause();}
  syncControls();
 }
}
playButton.addEventListener('click',()=>{
 if(mediaFailed){mediaFailed=false;video.load();playButton.disabled=false;soundButton.disabled=false;}
 if(video.paused||video.ended){userPaused=false;void play();}
 else{userPaused=true;autoPaused=false;video.pause();}
});
soundButton.addEventListener('click',()=>{video.muted=!video.muted;syncControls();if(!video.muted&&video.paused&&!video.ended){userPaused=false;void play();}});
['play','pause','volumechange','ended'].forEach(event=>video.addEventListener(event,syncControls));
video.addEventListener('error',()=>{mediaFailed=true;video.poster='assets/video/poster-20260928.jpg';status.textContent='The film could not load. You can continue below or press Play to retry.';playButton.textContent='Retry';soundButton.disabled=true;});
function pauseAutomatically(){if(!video.paused&&!video.ended){autoPaused=true;video.pause();}}
if('IntersectionObserver' in window)new IntersectionObserver(entries=>{
 inView=entries[0].isIntersecting;
 if(!inView)pauseAutomatically();else if(autoPaused)void play({automatic:true});
},{threshold:.2}).observe(document.querySelector('.film-stage'));
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseAutomatically();else if(autoPaused)void play({automatic:true});});
reduceMotion.addEventListener('change',()=>{if(reduceMotion.matches){autoPaused=false;video.pause();}});
syncControls();
// Try sound where browser permissions allow it; otherwise retry muted.
if(!reduceMotion.matches&&!conserveData)void play({automatic:true,audible:true});

// Chart lines and their counters share a scroll-triggered animation clock.
// Clip reveals preserve the original dashed legacy line and work at any SVG scale.
const ns='http://www.w3.org/2000/svg';
function svgPath(d,color,width,dash){const p=document.createElementNS(ns,'path');Object.entries({d,fill:'none',stroke:color,'stroke-width':width,'stroke-linejoin':'round','vector-effect':'non-scaling-stroke'}).forEach(([k,v])=>p.setAttribute(k,v));if(dash)p.setAttribute('stroke-dasharray',dash);return p;}
function seriesPath(arr,width,height,padding){return arr.map((v,i)=>`${i?'L':'M'}${(i/(arr.length-1)*width).toFixed(1)},${(padding+(1-v)*(height-2*padding)).toFixed(1)}`).join('');}
function revealPath(svg,path,id,width,height){
 const defs=svg.querySelector('defs')||svg.insertBefore(document.createElementNS(ns,'defs'),svg.firstChild);
 const clip=document.createElementNS(ns,'clipPath'),rect=document.createElementNS(ns,'rect'),group=document.createElementNS(ns,'g');
 clip.id=id;clip.setAttribute('clipPathUnits','userSpaceOnUse');
 Object.entries({x:-3,y:-3,width:width+6,height:height+6}).forEach(([key,value])=>rect.setAttribute(key,value));
 clip.append(rect);defs.append(clip);group.setAttribute('clip-path',`url(#${id})`);group.append(path);svg.append(group);
 return progress=>rect.setAttribute('width',progress>=1?width+6:(width+6)*Math.max(0,progress));
}
const pendingEffects=new Map(),activeEffects=new Set();
const clampProgress=value=>Math.max(0,Math.min(1,value));
const easeOut=value=>1-Math.pow(1-value,3);
function startEffect(element,effect){
 element.dataset.animation='running';let start=null,frame=0,finished=false;
 const finish=()=>{if(finished)return;finished=true;cancelAnimationFrame(frame);effect.render(1);element.dataset.animation='complete';activeEffects.delete(finish);};
 activeEffects.add(finish);
 const tick=now=>{
  if(reduceMotion.matches){finish();return;}
  if(start===null)start=now;
  const progress=clampProgress((now-start)/effect.duration);
  if(progress===1){finish();return;}
  effect.render(progress);frame=requestAnimationFrame(tick);
 };
 frame=requestAnimationFrame(tick);
}
const effectObserver='IntersectionObserver' in window?new IntersectionObserver(entries=>{
 entries.forEach(entry=>{if(!entry.isIntersecting)return;const effect=pendingEffects.get(entry.target);if(!effect)return;pendingEffects.delete(entry.target);effectObserver.unobserve(entry.target);startEffect(entry.target,effect);});
},{threshold:.2}):null;
function animateOnce(element,render,duration){
 if(reduceMotion.matches||!effectObserver){render(1);element.dataset.animation='complete';return;}
 element.dataset.animation='pending';render(0);pendingEffects.set(element,{render,duration});effectObserver.observe(element);
}
reduceMotion.addEventListener('change',()=>{
 if(!reduceMotion.matches)return;
 for(const [element,effect] of pendingEffects){effect.render(1);element.dataset.animation='complete';effectObserver?.unobserve(element);}
 pendingEffects.clear();for(const finish of [...activeEffects])finish();
});
document.querySelectorAll('.proofChart').forEach(svg=>{
 const data=window.CHARTDATA?.[svg.dataset.tk];if(!data)return;
 const card=svg.closest('.pchart'),counter=card.querySelector('.r'),target=Number(counter.dataset.r);
 if(!Number.isFinite(target))return;
 svg.setAttribute('role','img');svg.setAttribute('aria-label',`${svg.dataset.tk}: market and Excite state-estimate tracking, not investment returns`);
 counter.setAttribute('aria-label',target.toFixed(3));
 const market=revealPath(svg,svgPath(seriesPath(data.market,500,200,14),'var(--chart-market)',1.6),`proof-${svg.dataset.tk}-market`,500,200);
 const estimate=revealPath(svg,svgPath(seriesPath(data.est,500,200,14),'var(--orange)',1.8),`proof-${svg.dataset.tk}-estimate`,500,200);
 animateOnce(card,progress=>{
  const elapsed=progress*2150,estimateProgress=clampProgress((elapsed-650)/1500);
  market(clampProgress(elapsed/1200));estimate(estimateProgress);
  counter.textContent=progress===1?target.toFixed(3):(0.900+(target-0.900)*easeOut(estimateProgress)).toFixed(3);
 },2150);
});
const lag=document.querySelector('#lagChart');
if(lag){
 let seed=7,y=120;const points=[];
 for(let k=0;k<110;k++){seed=(seed*9301+49297)%233280;y+=(seed/233280-.5)*16+Math.sin(k/8)*16;y=Math.max(48,Math.min(192,y));points.push(y);}
 const smooth=points.map((_,k)=>{let sum=0,n=0;for(let j=-2;j<=2;j++)if(points[k+j]!=null){sum+=points[k+j];n++;}return sum/n;});
 const path=delay=>smooth.map((_,k)=>`${k?'L':'M'}${(k/109*520).toFixed(1)},${smooth[Math.max(0,k-delay)].toFixed(1)}`).join('');
 const gx=Math.round(110*.62),x=gx/109*520;
 const legacy=revealPath(lag,svgPath(path(8),'var(--chart-muted)',1.5,'5 4'),'lag-legacy',520,240);
 const market=revealPath(lag,svgPath(path(0),'var(--text)',2),'lag-market',520,240);
 const gap=svgPath(`M${x},${smooth[gx]} L${x},${smooth[gx-8]}`,'var(--orange)',2);lag.append(gap);
 lag.setAttribute('role','img');lag.setAttribute('aria-label','Illustration of market motion and a lagging legacy response');
 animateOnce(lag,progress=>{const elapsed=progress*3950;market(clampProgress(elapsed/3000));legacy(clampProgress((elapsed-500)/3000));gap.style.opacity=clampProgress((elapsed-3500)/450);},3950);
}
document.querySelectorAll('.tlnode .ring').forEach(ring=>{
 const fg=ring.querySelector('.fg');if(!fg)return;
 const circumference=2*Math.PI*14,target=clampProgress(Number(ring.dataset.pct));
 fg.style.strokeDasharray=circumference;
 animateOnce(ring,progress=>{fg.style.strokeDashoffset=circumference*(1-target*easeOut(progress));},1300);
});
document.querySelectorAll('.diagramcard').forEach((card,i)=>{card.setAttribute('role','region');card.setAttribute('aria-label',`Technology diagram ${i+1}`);});
