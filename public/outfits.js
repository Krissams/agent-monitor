import {roleForAgent} from './roles.js';

// Clothing is an agent identity, independent of its task/role and run status.
export const OUTFITS = [
  ['hoodie','Zip hoodie','square-glasses'], ['bomber','Flight jacket','cap'],
  ['shirt','Rolled-sleeve shirt','round-glasses'], ['waistcoat','Tailored waistcoat','square-glasses'],
  ['coat','Lab coat','goggles'], ['blazer','Blazer','round-glasses'],
  ['overalls','Denim overalls','workshop'], ['turtleneck','Turtleneck','round-glasses'],
  ['cardigan','Cable cardigan','newsboy'], ['coveralls','Workshop coveralls','hardhat'],
  ['utility','Utility jacket','field-hat'], ['striped','Striped knit','headphones'],
  ['flannel','Flannel overshirt','cap'], ['apron','Canvas apron','beret'],
  ['harness','Tech harness','visor'], ['raincoat','Rain jacket','cap'],
  ['polo','Polo shirt','headphones'], ['varsity','Varsity jacket','cap'],
  ['puffer','Puffer vest','newsboy'], ['safety','Reflective vest','hardhat'],
].map(([id,name,accessory])=>({id,name,accessory}));

const palettes = [
  ['Midnight','#36557c','#20334e','#9ac6ff','#597eac'],
  ['Sage','#729687','#3d5c50','#d6e4b4','#8fa97a'],
  ['Ivory','#f7f0df','#b9ac97','#8abfc8','#517e87'],
  ['Copper','#a66b48','#613e30','#f3cb8a','#b58d57'],
  ['Porcelain','#fcfdfb','#b5cbd1','#8bcfdf','#558c9b'],
  ['Navy','#3d4a73','#252d48','#d0b4d9','#9278a1'],
  ['Denim','#6387ad','#354e73','#efc497','#b38a61'],
  ['Charcoal','#555363','#302d3d','#cec4df','#9182ac'],
  ['Biscuit','#ad8b6a','#6f5542','#e6d1b1','#ac9574'],
  ['Petrol','#477f86','#294a54','#b5dbd5','#78a8a2'],
  ['Rust','#aa6a53','#663e36','#e8bd8a','#ad8659'],
  ['Ice blue','#8cb1cc','#4e6a89','#e2eff5','#a2c3d0'],
  ['Forest','#617c65','#354b3b','#c6d7a6','#8fa16e'],
  ['Plum','#92709c','#533e61','#e7b8d7','#b380a7'],
  ['Graphite','#3d5358','#26383d','#8cd1ba','#579e87'],
  ['Ochre','#d5a44c','#926831','#ffe1a0','#bc965c'],
  ['Teal','#639ca5','#365f6c','#bde8e7','#80b6bb'],
  ['Crimson','#a75f6c','#653440','#f2c1b1','#b98878'],
  ['Amethyst','#8a6aab','#4f3b69','#cdb9f2','#9781bd'],
  ['Lime','#a1b671','#5b7041','#e5eab5','#a5b779'],
];
const preferred = {developer:0,tester:10,marketer:1,artist:13,designer:7,social:17,
  security:14,scientist:4,math:11,devops:9,data:5,writer:8,researcher:12,
  product:16,seo:6,support:2,finance:3,video:15,music:18,automation:19};

export function outfitForSlot(slot) {
  if (!Number.isSafeInteger(slot) || slot < 0) slot=0;
  const style=OUTFITS[slot%OUTFITS.length], colorway=Math.floor(slot/OUTFITS.length);
  let [colorName,primary,dark,accent,accentDark]=palettes[(slot%20+colorway*7)%palettes.length];
  // Additional colorways do not wrap back to an existing outfit.
  if (colorway>=palettes.length) {
    const hue=(colorway*137.507764+slot%20*17)%360;
    colorName=`Colorway ${colorway+1}`;
    primary=`hsl(${hue.toFixed(3)} 38% 48%)`; dark=`hsl(${hue.toFixed(3)} 35% 27%)`;
    accent=`hsl(${((hue+45)%360).toFixed(3)} 60% 78%)`; accentDark=dark;
  }
  const contrast=['shirt','waistcoat','overalls','apron','harness','varsity','puffer','safety'].includes(style.id);
  return {...style,slot,colorway,key:`${style.id}-${colorway}`,colorName,primary,dark,accent,accentDark,
    sleeve:contrast?'#e8e5dd':primary,sleeveDark:contrast?'#a8abb2':dark};
}

export function defaultOutfit(role) {return outfitForSlot(preferred[role.id]??0);}
export function activeAvatar(agent) {
  return ['working','waitingApproval','waitingInput','unknown','error'].includes(agent.status) || Boolean(agent.unread);
}

export function assignUniqueOutfits(agents, saved={}) {
  const assignments=Object.create(null), occupied=new Set(), looks=new Map();
  // Preserve old identities, including ones currently outside the source window.
  for (const [id,slot] of Object.entries(saved && typeof saved==='object'?saved:{})) {
    if (Number.isSafeInteger(slot)&&slot>=0&&slot<1e6) assignments[id]=slot;
  }
  const ordered=[...agents].sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  const activeStyles=new Set();
  for (const agent of ordered) {
    const slot=assignments[agent.id];
    if (slot!==undefined && !occupied.has(slot)) {
      occupied.add(slot); looks.set(agent.id,outfitForSlot(slot));
      if (activeAvatar(agent)) activeStyles.add(slot%20);
    } else delete assignments[agent.id]; // Repair duplicated/corrupt saved reservations.
  }
  const historical=new Set(Object.values(assignments));
  // Allocate active agents first, preferring different garment shapes as well as colors.
  const missing=ordered.filter(a=>!looks.has(a.id)).sort((a,b)=>Number(activeAvatar(b))-Number(activeAvatar(a)));
  for (const agent of missing) {
    const start=preferred[roleForAgent(agent).id]??0;
    const styles=Array.from({length:20},(_,i)=>(start+i)%20);
    const order=activeAvatar(agent)?[...styles.filter(i=>!activeStyles.has(i)),...styles.filter(i=>activeStyles.has(i))]:styles;
    let slot;
    // Every historical reservation stays unique too. New colorways expand as needed.
    for (const style of order) {
      for (let colorway=0;slot===undefined;colorway++) {
        const candidate=colorway*20+style;
        if (!occupied.has(candidate)&&!historical.has(candidate)) {slot=candidate;break;}
      }
      if (slot!==undefined) break;
    }
    assignments[agent.id]=slot; occupied.add(slot); historical.add(slot);
    looks.set(agent.id,outfitForSlot(slot));
    if (activeAvatar(agent)) activeStyles.add(slot%20);
  }
  return {assignments,looks};
}

export function outfitBody(look,id) {
  const p=look.primary,d=look.dark,a=look.accent;
  const body=`<path d="M99 139c-20 6-28 28-24 58h128c6-32-5-52-27-58Z" fill="url(#${id}-hoodie)" stroke="${d}" stroke-width="3"/>`;
  const line=(path,color=a,width=3)=>`<path d="${path}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const pocket=(x,y,w=20,h=17)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${d}" opacity=".7"/>${line(`M${x+2} ${y+5}h${w-4}`,a,2)}`;
  let detail='';
  switch(look.id) {
    case 'hoodie':detail=`<path d="m105 139 34 22 34-22" fill="${d}"/>${line('M139 162v36M119 154v24m39-24v24')} ${pocket(110,179,58,17)}`;break;
    case 'bomber':detail=`<path d="M109 135q29 14 58 0l-4 13h-49Z" fill="${d}"/>${line('M139 147v51M98 193h83',a,4)}${pocket(97,166)}${pocket(160,166)}`;break;
    case 'shirt':detail=`<path d="m108 137 30 19-18 12-17-25m65-6-30 19 18 12 17-25" fill="${a}" stroke="${d}" stroke-width="2"/>${line('M138 156v42',d,2)}<g fill="${d}"><circle cx="142" cy="170" r="2"/><circle cx="142" cy="181" r="2"/><circle cx="142" cy="192" r="2"/></g>${pocket(158,166)}`;break;
    case 'waistcoat':detail=`<path d="m110 136 28 36 29-36-12-1-17 19-16-19Z" fill="#f6f1e4"/><path d="m138 154-5 9 5 20 6-20-5-9Z" fill="${a}"/>${line('M138 180v17M97 181h22m38 0h22',a,2)}`;break;
    case 'coat':detail=`<path d="M103 138 91 209h39l9-44 9 44h41l-16-71-35 14Z" fill="${p}" stroke="${d}" stroke-width="2"/><path d="m109 139 29 13-20 19 12 8 8-20 10 20 11-8-21-19 29-13" fill="${a}" opacity=".8"/>${pocket(98,180,24,20)}${pocket(156,180,24,20)}`;break;
    case 'blazer':detail=`<path d="m116 137 22 14 20-14-5 62h-29Z" fill="#f3eee6"/><path d="m109 136 20 12-9 11 13 12-10 26-22-54m67-7-20 12 9 11-13 12 10 26 22-54" fill="${d}"/>${line('M138 157v25',a,5)}${pocket(164,176,19,9)}`;break;
    case 'overalls':detail=`<path d="M99 137h15v23h48v-23h15v59H99Z" fill="${d}" stroke="${a}" stroke-width="2"/><rect x="112" y="160" width="52" height="34" rx="6" fill="${p}"/>${pocket(122,169,31,20)}<g fill="${a}"><circle cx="107" cy="156" r="3"/><circle cx="169" cy="156" r="3"/></g>`;break;
    case 'turtleneck':detail=`<rect x="118" y="132" width="43" height="22" rx="7" fill="${d}"/>${line('M122 138h35m-35 6h35m-59 23h79m-76 7h74m-70 7h66',a,1.5)}`;break;
    case 'cardigan':detail=`<path d="m111 137 27 29 27-29" fill="${d}"/>${line('M138 166v31',a,7)}${line('M109 155v38m9-30v30m40-30v30m9-38v38',a,2)}<g fill="${d}"><circle cx="138" cy="176" r="2"/><circle cx="138" cy="187" r="2"/></g>`;break;
    case 'coveralls':detail=`<path d="m110 135 28 18 28-18-6 18h-44Z" fill="${d}"/>${line('M138 155v43M94 192h89',a,3)}${pocket(103,157,25,21)}${pocket(149,157,25,21)}${line('M119 162v11',a,2)}`;break;
    case 'utility':detail=`<path d="M91 142h95v18H91Z" fill="${a}" opacity=".5"/>${line('M138 139v59',d,4)}${pocket(100,150,27,22)}${pocket(150,150,27,22)}${pocket(97,181,28,17)}${pocket(152,181,28,17)}`;break;
    case 'striped':detail=`<path d="m110 138 28 10 28-10" fill="none" stroke="${d}" stroke-width="6"/>${line('M86 158h105m-110 12h114m-114 12h114m-111 12h108','#f5efdf',7)}`;break;
    case 'flannel':detail=`${line('M102 144v51m18-53v53m18-53v53m18-53v53m18-51v51',d,6)}${line('M87 155h102m-107 16h113m-114 16h114',a,5)}${line('M138 145v53','#efdfbd',3)}`;break;
    case 'apron':detail=`<path d="m108 136 10 25h42l10-25" fill="none" stroke="${d}" stroke-width="8"/><path d="M110 160h56l14 39H96Z" fill="${a}" stroke="${d}" stroke-width="2"/>${pocket(116,173,43,21)}${line('M123 161v31m12-31v31',p,2)}`;break;
    case 'harness':detail=`<path d="m105 137 56 61m9-61-56 61" stroke="${a}" stroke-width="12"/><path d="M91 180h96" stroke="${a}" stroke-width="8"/><rect x="129" y="163" width="19" height="16" rx="3" fill="${d}" stroke="#dde6dd" stroke-width="2"/>`;break;
    case 'raincoat':detail=`<path d="m106 138 32 20 32-20-8 22h-48Z" fill="${a}" stroke="${d}" stroke-width="2"/>${line('M138 160v38',d,5)}${pocket(94,174,32,22)}${pocket(151,174,32,22)}${line('M100 149v21m76-21v21',d,2)}`;break;
    case 'polo':detail=`<path d="m108 137 30 18 30-18-10 24-20-9-20 9Z" fill="${a}"/>${line('M138 154v21',d,3)}<circle cx="138" cy="162" r="2" fill="#fff"/><circle cx="166" cy="171" r="7" fill="${a}"/>${line('M105 193h67',d,3)}`;break;
    case 'varsity':detail=`<path d="m109 136 29 10 29-10-4 15h-50Z" fill="${d}"/>${line('M111 141h54m-54 7h54M138 152v45M96 194h85','#eee8df',3)}<path d="m105 163 6 16 7-16m-13 12h13" fill="none" stroke="${a}" stroke-width="4"/>`;break;
    case 'puffer':detail=`<path d="M105 136q33 18 67 0l8 62H97Z" fill="${p}" stroke="${d}" stroke-width="3"/>${line('M103 152h69m-72 14h75m-77 14h79M138 143v55',d,4)}`;break;
    case 'safety':detail=`<path d="m105 137 33 23 31-23 13 61H95Z" fill="${p}" stroke="${d}" stroke-width="2"/>${line('M112 146v48m52-48v48M98 179h80','#e5ece4',9)}${line('M138 160v38',d,3)}`;break;
  }
  return `<g class="outfit-body" data-garment="${look.id}">${body}${detail}</g>`;
}
