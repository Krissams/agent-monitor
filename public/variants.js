import {ROLES,roleById} from './roles.js';
import {workingMascot} from './mascot.js';
import {OUTFITS,defaultOutfit,outfitForSlot} from './outfits.js';
const key='agent-monitor-preferences-v2';
let preferences={};
try {preferences=JSON.parse(localStorage.getItem(key))||{};} catch {}
let theme=preferences.theme||'light', motion=preferences.animateAgents!==false;
function controls() {
  document.documentElement.dataset.theme=theme;
  document.documentElement.dataset.motion=motion?'on':'paused';
  document.getElementById('gallery-theme').textContent=theme==='light'?'Dark mode':'Light mode';
  document.getElementById('gallery-motion').textContent=motion?'Pause animation':'Play animation';
  document.getElementById('gallery-motion').setAttribute('aria-pressed',String(motion));
}
document.getElementById('gallery-theme').onclick=()=>{theme=theme==='light'?'dark':'light';controls();};
document.getElementById('gallery-motion').onclick=()=>{motion=!motion;controls();};
const outfitView=new URLSearchParams(location.search).get('view')==='outfits';
document.getElementById(outfitView?'outfit-view':'role-view').setAttribute('aria-current','page');
if (outfitView) {
  document.title='Unique developer outfits · Agent Monitor';
  document.querySelector('h1').textContent='Same role. Different outfits.';
  document.querySelector('.variant-header p').textContent='Twenty developers, twenty individual looks. Role tools stay the same; clothing, accessories, and colors change.';
  document.querySelector('.gallery-note').textContent='Active agents receive their own reserved outfit, shared across the full list and saved between refreshes. These are preview characters, with no live status data.';
  document.getElementById('variants').setAttribute('aria-label','20 unique developer outfits');
}
(outfitView?OUTFITS:ROLES).forEach((entry,index)=>{
  const role=outfitView?roleById('developer'):entry;
  const outfit=outfitView?outfitForSlot(index):defaultOutfit(role);
  const article=document.createElement('article'); article.className='variant-card'; article.dataset.role=role.id;
  const preview=document.createElement('div'); preview.className='avatar working-motion'; preview.dataset.motionPhase=String(index%3); preview.setAttribute('aria-hidden','true'); preview.append(workingMascot(role,outfit));
  const heading=document.createElement('h2');heading.textContent=outfitView?outfit.name:role.name;
  const description=document.createElement('p');description.textContent=outfitView?`Developer · ${outfit.colorName} · Reserved look ${index+1}`:`${role.description.split(' · ').slice(0,2).join(' · ')} · ${outfit.name}`;
  const number=document.createElement('span');number.className='variant-number';number.textContent=String(index+1).padStart(2,'0');
  article.append(preview,number,heading,description);document.getElementById('variants').append(article);
});
controls();
