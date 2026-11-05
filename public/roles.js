// These are visual role hints, inferred locally. They never change an agent's task.
const role = (id, name, description, match, colors, accessory) => ({id,name,description,match,colors,accessory});
export const ROLES = [
  role('developer','Developer','Code terminal · hoodie · code badge', /\b(developer|dev|coding|programmer|software engineer|bug fixer|fixer|implementation)\b|\b(build|develop|implement)\b.*\b(app|dashboard|website|tool|feature)\b/i, ['#deedff','#a5bcdf','#405c84','#23334d','#7eb6ff','#447cc8'],'square-glasses'),
  role('tester','Tester','Test checklist · magnifying glass · QA goggles', /\b(tester|testing|qa|quality assurance|regression|test engineer)\b/i, ['#e3f2ed','#a7ccbf','#53716b','#2d4842','#a1d9ba','#548c76'],'goggles'),
  role('marketer','Marketer','Campaign charts · megaphone · coral jacket', /\b(marketer|marketing|campaign|paid ads|advertising|growth)\b/i, ['#ffe6db','#e6b19e','#b56250','#713c38','#ffbc8d','#e48765'],'cap'),
  role('artist','Artist','Paint palette · brush jar · violet beret', /\b(artist|illustrat\w*|painting|artwork|drawing)\b/i, ['#f3e1fb','#c7aad9','#82609f','#4a355f','#dfb0ed','#a470c3'],'beret'),
  role('designer','Designer','Layout board · swatches · round glasses', /\b(designer|design|ui\/?ux|figma|interface|wireframe)\b/i, ['#ece4ff','#b4a4df','#655a89','#38304f','#bea4ff','#8970c5'],'round-glasses'),
  role('social','Social Media','Social feed · phone · pink headphones', /\b(social media|facebook|instagram|tiktok|social|fb ads|posts?|reels?)\b/i, ['#ffe4f1','#dca4c4','#a35f8c','#65374f','#f8a1cd','#c870a0'],'headphones'),
  role('security','Security Engineer','Shield · secure terminal · green visor', /\b(security|cyber|vulnerabil\w*|penetration|pentest|threat|audit)\b/i, ['#daeee7','#90b7aa','#334e49','#1c302d','#85d0b4','#3e927b'],'visor'),
  role('scientist','Scientist','Molecules · laboratory flask · white coat', /\b(scientist|science|laboratory|chemistry|physics|biology|experiment)\b/i, ['#e2f4fa','#9ec5d4','#fafcfb','#bacfd5','#8ed5e5','#4d9bb0'],'goggles'),
  role('math','Math Engineer','Equation board · geometry tools · blue knit', /\b(math(?:ematics|ematical)?|algebra|calculus|geometry|equation|numerical)\b/i, ['#e0eafa','#a0b3d6','#4a6399','#2c3b62','#9fbaff','#617ebc'],'round-glasses'),
  role('devops','DevOps Engineer','Server rack · cloud tools · hard hat', /\b(devops|deploy\w*|infrastructure|kubernetes|docker|server|sre)\b/i, ['#f9e9d7','#d9b799','#a7784b','#63442e','#ffca7a','#d19346'],'hardhat'),
  role('data','Data Analyst','Charts · data grid · blue blazer', /\b(data analyst|data science|analytics|analysis|reporting|dashboard|metrics)\b/i, ['#e1f1f2','#9cc6cd','#406d7e','#25434f','#93d7df','#4e9ea9'],'square-glasses'),
  role('writer','Writer','Manuscript · books · warm cardigan', /\b(writer|writing|copywriter|copywriting|documentation|article|editorial|story)\b/i, ['#f5ebdd','#cebaa4','#987a5d','#5c4c3f','#e8c394','#b28d62'],'newsboy'),
  role('researcher','Researcher','Research notes · books · field hat', /\b(research\w*|investigat\w*|discovery|literature|study)\b/i, ['#e8efdf','#b2c6a1','#6f8260','#43533b','#c1d69c','#899c63'],'field-hat'),
  role('product','Product Manager','Kanban board · roadmap · mustard blazer', /\b(product manager|product management|roadmap|requirements|planning|\bpm\b)\b/i, ['#fff0cc','#d8c18f','#a38b4f','#64562f','#f8d97c','#c7a449'],'tie'),
  role('seo','SEO Specialist','Search results · ranking graph · emerald cap', /\b(seo|search engine|keywords?|ranking|serp|organic search)\b/i, ['#ddf2e6','#9fcbb5','#467c62','#29513e','#94d9af','#4d9f71'],'cap'),
  role('support','Support Agent','Help conversations · ticket cards · cyan headset', /\b(support|customer service|helpdesk|zendesk|tickets?)\b/i, ['#e0f3fb','#9ec8df','#4c8099','#2b4e64','#9bddf5','#59a6c6'],'headphones'),
  role('finance','Finance Analyst','Calculator · coins · mint waistcoat', /\b(finance|financial|accounting|invoice|bookkeeping|budget|revenue)\b/i, ['#e3f1e8','#a8c8b2','#547e68','#304f40','#a7d9b7','#629975'],'tie'),
  role('video','Video Editor','Film frames · clapperboard · red cap', /\b(video|filmmak\w*|motion graphics|editing|cinema|footage)\b/i, ['#fae2df','#d9a3a0','#945559','#573239','#f3a5a0','#b96c68'],'cap'),
  role('music','Music Producer','Audio waveform · keyboard · studio headphones', /\b(music|audio|sound|composer|recording|producer|mixing)\b/i, ['#ede0fa','#bba0d5','#72518e','#443052','#cf9cf3','#9a68c3'],'headphones'),
  role('automation','Automation Engineer','Robot arm · gears · workshop visor', /\b(automation|automate|robotics|workflow|pipeline|integration|hooks?)\b/i, ['#e4e8fb','#a6b0d9','#596b9a','#354166','#b4bfff','#7a8bc8'],'workshop'),
];
export function roleById(id) { return ROLES.find(role => role.id === id); }

// Match explicit role names before broader topic words; title beats progress text.
const priority = ['security','devops','social','math','scientist','tester','developer','artist','designer','video','music','finance','support','product','seo','marketer','automation','writer','researcher','data'];
export function roleForAgent(agent, override) {
  const chosen = roleById(override);
  if (chosen) return chosen;
  for (const value of [agent.title || '', agent.update || '']) {
    for (const id of priority) { const role = roleById(id); if (role.match.test(value)) return role; }
  }
  return roleById('developer');
}

const ICONS = {
  developer:'<path d="m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16"/>',
  tester:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="m8 9 2 2 5-5m-7 9 2 2 5-5"/>',
  marketer:'<path d="M3 10h5l12-6v16L8 14H3Zm4 4 2 7h4l-2-6M23 9v6"/>',
  artist:'<path d="M12 3a9 9 0 1 0 1 18c3-1-1-4 1-6 2-2 7 2 7-2a9 9 0 0 0-9-10Z"/><circle cx="7" cy="10" r="1"/><circle cx="11" cy="7" r="1"/><circle cx="16" cy="9" r="1"/>',
  designer:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 8h18M9 8v13m3-10h6v7h-6Z"/>',
  social:'<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M9 17h6m-3-4-3-3a2 2 0 0 1 3-3 2 2 0 0 1 3 3Z"/>',
  security:'<path d="m12 2 9 4v6q0 7-9 10-9-3-9-10V6Z"/><rect x="8" y="10" width="8" height="6" rx="1"/><path d="M10 10V8a2 2 0 0 1 4 0v2"/>',
  scientist:'<path d="M9 2h6m-5 0v7L4 19q-1 3 3 3h10q4 0 3-3L14 9V2M7 16h10"/><circle cx="11" cy="12" r=".5"/>',
  math:'<path d="M3 8h7M3 4h7M14 4h7m-3-3v7M3 14l7 7m0-7-7 7m11-4h7m-4-4h0m0 8h0"/>',
  devops:'<rect x="3" y="2" width="18" height="6" rx="1"/><rect x="3" y="9" width="18" height="6" rx="1"/><rect x="3" y="16" width="18" height="6" rx="1"/><path d="M6 5h1m-1 7h1m-1 7h1m5-14h6m-6 7h6m-6 7h6"/>',
  data:'<path d="M3 3v18h19M7 17v-6m5 6V6m5 11v-9"/>',
  writer:'<path d="M5 3h10l4 4v14H5Zm9 0v5h5M8 11h8m-8 4h8m-8 3h5"/>',
  researcher:'<path d="M3 4q5-2 9 1 4-3 9-1v16q-5-2-9 1-4-3-9-1Zm9 1v16M6 8h3m-3 4h3m6-4h3m-3 4h3"/>',
  product:'<rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 3v18m8-18v18M4 7h2m4 0h4m4 0h2M4 11h2m4 0h4m4 4h2"/>',
  seo:'<circle cx="10" cy="10" r="7"/><path d="m15 15 7 7M6 12l3-3 3 1 3-4"/>',
  support:'<path d="M4 14v-3a8 8 0 0 1 16 0v3M3 10h4v8H3Zm14 0h4v8h-4Zm3 8q0 4-8 4"/>',
  finance:'<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M7 6h10M7 11h1m3 0h1m3 0h1M7 15h1m3 0h1m3 0h1M7 19h1m3 0h1m3 0h1"/>',
  video:'<path d="M3 9h18v12H3ZM2 4l18-3 1 5L3 9Zm4-1 4 4m3-5 4 4m-7 6 6 3-6 3Z"/>',
  music:'<path d="M9 17V5l11-3v12M9 8l11-3"/><ellipse cx="6" cy="18" rx="3" ry="3"/><ellipse cx="17" cy="15" rx="3" ry="3"/>',
  automation:'<path d="m6 21 2-6 6-3-3-5 4-4 5 4-4 5m-4-8 4 4M3 21h12"/><circle cx="9" cy="15" r="3"/><circle cx="15" cy="7" r="2"/>',
};
export function roleIcon(role) { return ICONS[role.id] || ICONS.developer; }

export function roleScene(role) {
  const [, , , , accent] = role.colors;
  // Each workspace has its own large, recognizable tool and background display.
  const boards = {
    developer:'<path d="m232 91 7 5-7 5m12 0h18m-30 12h28m-28 9h19m-19 9h33"/>',
    tester:'<path d="m230 93 3 3 5-6m-8 17 3 3 5-6m-8 17 3 3 5-6m5-22h20m-20 14h20m-20 14h15"/>',
    marketer:'<path d="M229 132h47m-44-6v-12h8v12m8 0v-22h8v22m8 0V93h8v33m-40-20 15-11 10 3 15-16"/>',
    artist:'<path d="m235 132 12-45 14 45m-31-12h36m-23-25h9"/><circle cx="250" cy="108" r="9"/>',
    designer:'<rect x="230" y="87" width="43" height="46" rx="2"/><path d="M230 97h43m-28 0v36m5-29h16v13h-16m0 6h16"/>',
    social:'<path d="M230 88h37v21h-12l-9 8v-8h-16Zm9 6h20m-20 7h13M252 124l-6-6q-6-6-10 0-4 6 16 16 20-10 16-16-4-6-10 0Z"/>',
    security:'<path d="m251 86 19 7v14q0 17-19 25-19-8-19-25V93Z"/><path d="m242 108 7 7 13-17"/>',
    scientist:'<circle cx="251" cy="108" r="5"/><ellipse cx="251" cy="108" rx="24" ry="9" transform="rotate(45 251 108)"/><ellipse cx="251" cy="108" rx="24" ry="9" transform="rotate(-45 251 108)"/>',
    math:'<path d="m230 116 6 8 6-30h29M247 110h18m-18 7h18"/><text x="235" y="90" font-size="12" stroke="none" fill="currentColor">x² + y²</text>',
    devops:'<path d="M232 96q-7-15 7-17 6-12 18-4 14-2 15 12 12 7 1 14h-39Zm17 6v12m-18 10v-10h38v10"/><rect x="227" y="124" width="13" height="11"/><rect x="261" y="124" width="13" height="11"/>',
    data:'<path d="M229 132V88m0 44h44m-37-7v-12h7v12m7 0V98h7v27m7 0v-21h7v21"/>',
    writer:'<path d="M234 85h32v47h-32Zm6 10h20m-20 8h20m-20 8h20m-20 8h14"/>',
    researcher:'<rect x="229" y="88" width="19" height="17"/><rect x="256" y="87" width="19" height="17"/><rect x="242" y="117" width="19" height="17"/><path d="m238 105 13 12 14-13"/>',
    product:'<rect x="229" y="87" width="46" height="46" rx="2"/><path d="M244 87v46m16-46v46M233 95h6m-6 8h6m10-8h6m-6 8h6m10 0h6m-6 8h6"/>',
    seo:'<rect x="228" y="86" width="49" height="12" rx="6"/><path d="M232 107h28m-28 9h38m-38 9h24"/><circle cx="268" cy="92" r="2"/>',
    support:'<path d="M230 86h38v23h-14l-10 8v-8h-14Zm10 7h19m-19 8h13m-1 16h22v18h-9l-7 6v-6h-6"/>',
    finance:'<path d="M232 131h41m-39-8 9-12 9 4 16-27"/><circle cx="239" cy="93" r="8"/><path d="M239 87v12m3-10h-5v4h5v4h-5"/>',
    video:'<rect x="229" y="88" width="45" height="39" rx="2"/><path d="m247 97 14 10-14 10ZM229 96h5m-5 9h5m-5 9h5m35-18h5m-5 9h5m-5 9h5"/>',
    music:'<path d="M230 110h5l4-19 6 38 7-48 6 47 6-29 5 11h6"/>',
    automation:'<path d="M230 130h45m-29-4 5-20 13-9-8-12m-9 21-11-10 8-12"/><circle cx="251" cy="106" r="5"/><circle cx="256" cy="85" r="4"/>',
  };
  const props = {
    developer:'<rect x="25" y="166" width="27" height="28" rx="5"/><path d="M52 171q16 0 0 17M32 160v-8m10 8v-8"/>',
    tester:'<circle cx="40" cy="170" r="13"/><path d="m31 180-12 15m17-24 4 4 7-9"/>',
    marketer:'<path d="M21 169h12l25-12v35l-25-12H21Zm9 11 3 17h10l-5-15"/>',
    artist:'<path d="m27 180-5-25m17 25 2-31m6 32 10-26"/><rect x="25" y="176" width="29" height="21" rx="5"/><path d="m20 156-3-9 7-2 2 10m12-7 3-8 4 9m9 8 5-8 5 4-7 7"/>',
    designer:'<path d="m22 184 24-30 15 12-24 30Z"/><path d="m28 177 15 12m-9-19 15 12m-8-19 15 12"/>',
    social:'<rect x="27" y="154" width="28" height="44" rx="6"/><path d="M35 191h12m-7-15-7-6q-6-7 2-7 5 0 5 4 0-4 5-4 8 0 2 7Z"/>',
    security:'<path d="m40 155 20 8v14q0 15-20 22-20-7-20-22v-14Z"/><rect x="33" y="173" width="15" height="12" rx="2"/><path d="M36 173v-5a4 4 0 0 1 9 0v5"/>',
    scientist:'<path d="M34 151h13m-10 0v18l-15 25q-1 5 7 5h25q7 0 5-5l-15-25v-18M28 186h24"/><circle cx="39" cy="179" r="2"/>',
    math:'<path d="m25 197 17-42 17 42m-30-11h25m-12-31v-7"/><circle cx="42" cy="158" r="4"/>',
    devops:'<rect x="22" y="157" width="38" height="12" rx="3"/><rect x="22" y="172" width="38" height="12" rx="3"/><rect x="22" y="187" width="38" height="12" rx="3"/><path d="M29 163h4m-4 15h4m-4 15h4"/>',
    data:'<circle cx="41" cy="177" r="20"/><path d="M41 157v20h20m-20 0-14 14"/>',
    writer:'<path d="M22 174h37v9H22Zm4 12h37v10H26Zm-2-24h28v9H24Z"/><path d="m47 153 7-9 5 3-8 12"/>',
    researcher:'<path d="M22 162q10-4 20 2 9-6 19-2v33q-9-4-19 1-10-5-20-1Zm20 2v32m-14-25h8m12 0h7m-27 9h8m12 0h7"/>',
    product:'<rect x="25" y="156" width="34" height="43" rx="4"/><rect x="34" y="152" width="15" height="8" rx="2"/><path d="m31 172 3 3 5-6m3 4h10m-21 12 3 3 5-6m3 4h10"/>',
    seo:'<circle cx="38" cy="170" r="14"/><path d="m49 181 13 14m-30-22 5-6 5 2 5-7"/>',
    support:'<path d="M21 160h39v27H43l-10 10v-10H21Zm9 8h20m-20 10h14"/>',
    finance:'<ellipse cx="39" cy="191" rx="19" ry="6"/><path d="M20 181v10m38-10v10m-38-17v9m38-9v9"/><ellipse cx="39" cy="181" rx="19" ry="6"/><ellipse cx="39" cy="172" rx="19" ry="6"/>',
    video:'<path d="M21 172h41v25H21Zm-2-13 40-7 3 12-40 8Zm8-2 8 10m4-13 8 10m-7 14 12 6-12 6Z"/>',
    music:'<rect x="19" y="164" width="47" height="31" rx="4"/><path d="M27 165v29m8-29v29m8-29v29m8-29v29m8-29v29M23 165v15m8-15v15m8-15v15m12-15v15m8-15v15"/>',
    automation:'<path d="M20 199h44m-22-5 3-17 12-8-9-13m-6 21-13-10 9-10"/><circle cx="45" cy="177" r="5"/><circle cx="48" cy="156" r="4"/>',
  };
  return `<g class="role-workspace" color="${role.colors[3]}">
    <rect x="220" y="75" width="65" height="69" rx="8" fill="#fff" opacity=".46"/>
    <g fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" opacity=".7">${boards[role.id]}</g>
    <g fill="${accent}" stroke="${role.colors[3]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${props[role.id]}</g>
  </g>`;
}

export function roleClothes(role) {
  if (['scientist','finance','product','support','data'].includes(role.id)) {
    return `<path d="m106 143 29 21-11 33m44-54-29 21 11 33" fill="none" stroke="${role.colors[4]}" stroke-width="5"/>
      ${['finance','product'].includes(role.id) ? `<path d="m136 155-5 9 6 27 7-27-5-9Z" fill="${role.colors[4]}"/>` : ''}`;
  }
  return '';
}

export function roleHeadwear(role) {
  const [, , , dark, accent] = role.colors;
  const glasses = `<g fill="#fff" fill-opacity=".12" stroke="${dark}" stroke-width="2.5"><circle cx="115" cy="99" r="14"/><circle cx="166" cy="99" r="14"/><path d="M129 98h23"/></g>`;
  switch(role.accessory) {
    case 'round-glasses': return glasses;
    case 'square-glasses': return `<g fill="#fff" fill-opacity=".1" stroke="${dark}" stroke-width="2.5"><rect x="99" y="86" width="30" height="24" rx="5"/><rect x="151" y="86" width="30" height="24" rx="5"/><path d="M129 96h22"/></g>`;
    case 'goggles': return `<rect x="91" y="82" width="99" height="34" rx="15" fill="${accent}" fill-opacity=".2" stroke="${dark}" stroke-width="3"/><path d="M94 98H80m109 0h10M138 84v29" stroke="${dark}" stroke-width="3"/>`;
    case 'beret': return `<ellipse cx="141" cy="47" rx="55" ry="18" fill="${dark}"/><path d="m138 28 6-9" stroke="${dark}" stroke-width="5" stroke-linecap="round"/><path d="M92 50q49 10 97-2" stroke="${accent}" stroke-width="4" fill="none"/>`;
    case 'hardhat': return `<path d="M90 50q0-40 50-40t50 40Z" fill="${accent}" stroke="${dark}" stroke-width="2"/><path d="M84 51h112M133 13v30m15-30v30" stroke="${dark}" stroke-width="4" stroke-linecap="round"/>`;
    case 'field-hat': return `<path d="M99 46 109 20h57l17 26Z" fill="${accent}" stroke="${dark}" stroke-width="2"/><ellipse cx="141" cy="47" rx="62" ry="10" fill="${accent}" stroke="${dark}" stroke-width="2"/><path d="M104 37h70" stroke="${dark}" stroke-width="7"/>`;
    case 'newsboy': return `<path d="M89 50q14-36 53-33 42 0 49 34Z" fill="${dark}"/><path d="M90 50h112q-14 10-52 7" fill="${accent}" stroke="${dark}" stroke-width="2"/>${glasses}`;
    case 'cap': return `<path d="M94 48q3-32 48-32 45 0 47 32Z" fill="${accent}" stroke="${dark}" stroke-width="2"/><path d="M126 47h79q-6 12-52 9Z" fill="${dark}"/>`;
    case 'visor': return `<path d="M89 82h104v33H89Z" fill="${accent}" fill-opacity=".28" stroke="${dark}" stroke-width="3"/><path d="m101 87-7 23m16-23-7 23" stroke="#fff" stroke-width="3" opacity=".65"/>`;
    case 'headphones': return `<rect x="63" y="75" width="22" height="55" rx="10" fill="${accent}" stroke="${dark}" stroke-width="3"/><rect x="201" y="75" width="21" height="55" rx="10" fill="${accent}" stroke="${dark}" stroke-width="3"/><path d="M75 78q-2-54 67-54 69 0 70 54" fill="none" stroke="${dark}" stroke-width="8"/>`;
    case 'workshop': return `<path d="M92 49q4-35 49-35 45 0 50 35" fill="${accent}" stroke="${dark}" stroke-width="3"/><rect x="104" y="30" width="72" height="20" rx="7" fill="${dark}"/><circle cx="128" cy="40" r="6" fill="${accent}"/><circle cx="154" cy="40" r="6" fill="${accent}"/>`;
    default: return '';
  }
}
