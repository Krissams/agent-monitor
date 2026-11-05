// Local SVG characters: the loops illustrate status, not individual model actions.
import {roleById, roleIcon, roleScene, roleHeadwear} from './roles.js';
import {defaultOutfit, outfitBody} from './outfits.js';
let sequence = 0;
export function wavingMascot(role = roleById('developer'), outfit = defaultOutfit(role)) {
  return mascot('waving', role, outfit);
}
export function workingMascot(role = roleById('developer'), outfit = defaultOutfit(role)) {
  return mascot('working', role, outfit);
}
function mascot(mode, sourceRole, outfit) {
  const role={...sourceRole,colors:[...sourceRole.colors.slice(0,2),outfit.primary,outfit.dark,outfit.accent,outfit.accentDark]};
  const headwear={...role,accessory:role.id==='developer'?outfit.accessory:role.accessory};
  const working = mode === 'working';
  const id = `${mode}-${++sequence}`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 320 230');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('agent-mascot', `${mode}-mascot`);
  if (role) svg.dataset.role = role.id;
  svg.dataset.outfit = outfit.key;
  svg.innerHTML = `
    <defs>
      <linearGradient id="${id}-scene" x2="1" y2="1"><stop stop-color="${role?.colors[0] || '#e7e1fc'}"/><stop offset="1" stop-color="${role?.colors[1] || '#b5afd9'}"/></linearGradient>
      <linearGradient id="${id}-cream" x2=".8" y2="1"><stop stop-color="#fffdf6"/><stop offset=".55" stop-color="#f7e1ca"/><stop offset="1" stop-color="#d7b89a"/></linearGradient>
      <linearGradient id="${id}-hoodie" x2=".6" y2="1"><stop stop-color="${role?.colors[2] || '#51525f'}"/><stop offset="1" stop-color="${role?.colors[3] || '#20232e'}"/></linearGradient>
      <linearGradient id="${id}-sleeve" x2=".6" y2="1"><stop stop-color="${outfit.sleeve}"/><stop offset="1" stop-color="${outfit.sleeveDark}"/></linearGradient>
      <linearGradient id="${id}-orange" x2="1" y2="1"><stop stop-color="${role?.colors[4] || '#ffd4a1'}"/><stop offset="1" stop-color="${role?.colors[5] || '#ec8f52'}"/></linearGradient>
      <linearGradient id="${id}-laptop" x2=".6" y2="1"><stop stop-color="#d4cedd"/><stop offset="1" stop-color="#817d96"/></linearGradient>
      <radialGradient id="${id}-light"><stop stop-color="#fff" stop-opacity=".65"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="320" height="230" fill="url(#${id}-scene)"/>
    <circle cx="120" cy="67" r="137" fill="url(#${id}-light)"/>
    <rect x="239" y="22" width="57" height="73" rx="9" fill="#fff" opacity=".25"/>
    <path d="M249 41h26m-26 12h36m-36 12h18" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".45"/>
    <path d="M0 193Q155 183 320 195v35H0Z" fill="#d8cad3"/>
    <ellipse cx="155" cy="207" rx="111" ry="12" fill="#57516f" opacity=".18"/>
    ${role ? roleScene(role) : ''}
    ${outfitBody(outfit,id)}
    ${working ? `
    <g class="typing-pose"><g class="typing-right">
      <path d="M188 149q28 3 39 27 6 18-16 20l-15-18-10-9" fill="url(#${id}-sleeve)" stroke="${outfit.dark}" stroke-width="3"/>
      <ellipse cx="212" cy="188" rx="14" ry="11" fill="url(#${id}-cream)" stroke="#c6a68c" stroke-width="2"/>
      <path d="M204 188h11m-10 4h10" stroke="#d4b399" stroke-width="1.5" stroke-linecap="round"/>
    </g></g>` : `
    <g class="waving-arm">
      <path d="M188 165q23 10 44-14l14-26-23-13-17 27-18 2" fill="url(#${id}-sleeve)" stroke="${outfit.dark}" stroke-width="3" stroke-linejoin="round"/>
      <path d="m220 115 22 12 6-12-23-12Z" fill="#5b5b68" stroke="#2c2f3a" stroke-width="2"/>
      <path d="m227 107-6-13q-5-10 0-13 6-4 11 8l-6-27q-2-8 3-9 6-2 8 7l5 20-3-31q-1-8 5-8 6 0 6 8l3 29 2-27q1-8 7-7 6 1 5 9l-2 28 5-17q3-8 8-5 5 2 2 10l-8 32q-4 16-17 20-15 4-28-14Z" fill="url(#${id}-cream)" stroke="#bd997d" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M233 90q10-5 17 4" fill="none" stroke="#d4b399" stroke-width="2" stroke-linecap="round"/>
    </g>`}
    <g class="mascot-head">
    <path d="M88 82c0-64 109-71 109 0" fill="none" stroke="#575263" stroke-width="12"/>
    <path d="M136 38V25" stroke="#baa189" stroke-width="7" stroke-linecap="round"/>
    <circle cx="136" cy="20" r="10" fill="url(#${id}-orange)" stroke="#edac78" stroke-width="2"/>
    <rect x="77" y="49" width="128" height="104" rx="40" fill="url(#${id}-cream)" stroke="#c7a88d" stroke-width="3"/>
    <rect x="88" y="60" width="106" height="82" rx="30" fill="#fff3e1" stroke="#e4c6aa" stroke-width="3"/>
    <path d="M97 78q0-10 13-12h57" fill="none" stroke="#fffdf7" stroke-width="4" stroke-linecap="round"/>
    <rect x="69" y="79" width="17" height="46" rx="8" fill="url(#${id}-orange)" stroke="#c18c63" stroke-width="3"/>
    <rect x="199" y="79" width="16" height="46" rx="8" fill="url(#${id}-orange)" stroke="#c18c63" stroke-width="3"/>
    <g class="mascot-eyes">
    <ellipse cx="115" cy="98" rx="6.2" ry="9" fill="#292735"/>
    <ellipse cx="166" cy="98" rx="6.2" ry="9" fill="#292735"/>
    <circle cx="113" cy="95" r="1.8" fill="#fff"/><circle cx="164" cy="95" r="1.8" fill="#fff"/>
    </g>
    <ellipse cx="103" cy="115" rx="8" ry="5.7" fill="#efb09b"/><ellipse cx="178" cy="115" rx="8" ry="5.7" fill="#efb09b"/>
    <path d="M130 113q10 13 21 0" fill="none" stroke="#725447" stroke-width="3" stroke-linecap="round"/>
    <path d="M203 116q1 17-18 18" fill="none" stroke="#66616e" stroke-width="4" stroke-linecap="round"/>
    <rect x="176" y="129" width="15" height="8" rx="4" fill="#46434f"/>
    ${roleHeadwear(headwear)}
    </g>
    ${working ? `
    <g class="thinking-pose">
      <path d="M187 166q16 19 29 3 12-14-4-30l-17 13" fill="url(#${id}-sleeve)" stroke="${outfit.dark}" stroke-width="3"/>
      <path d="M195 151q-10-1-13-9-3-7 3-11 4-3 9 0l-5-11q-2-5 2-7 4-2 7 4l12 20q5 12-15 14Z" fill="url(#${id}-cream)" stroke="#c6a68c" stroke-width="2"/>
    </g>` : ''}
    <g class="${working ? 'typing-left' : 'resting-arm'}">
    <path d="M83 159q-13 6-9 25 4 15 31 16l8-19-21-7" fill="url(#${id}-sleeve)" stroke="${outfit.dark}" stroke-width="3"/>
    <ellipse cx="109" cy="188" rx="14" ry="11" fill="url(#${id}-cream)" stroke="#c6a68c" stroke-width="2"/>
    </g>
    <g class="mascot-laptop" transform="translate(26 41) scale(.85)">
    <path d="m135 164 72-4q6 0 4 6l-10 37h-77Z" fill="url(#${id}-laptop)" stroke="#79768d" stroke-width="2"/>
    <path d="M117 203h91q3 6-8 7h-77q-10-1-6-7" fill="#aba5b7" stroke="#79768d" stroke-width="2"/>
    ${role ? `<g transform="translate(155 174) scale(.8)" fill="none" stroke="#f4f0fa" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${roleIcon(role)}</g>` : '<path d="m167 178 6 4-6 6-6-4Z" fill="none" stroke="#eee9f3" stroke-width="2" stroke-linejoin="round"/>'}
    </g>
    ${working ? `
    <g class="thought-bubble">
      <circle cx="210" cy="60" r="4" fill="#fff" opacity=".7"/>
      <circle cx="220" cy="48" r="6" fill="#fff" opacity=".85"/>
      <rect x="228" y="20" width="66" height="39" rx="19.5" fill="#fff" opacity=".93"/>
      <circle class="thought-dot dot-one" cx="246" cy="40" r="3.4" fill="#8272b8"/>
      <circle class="thought-dot dot-two" cx="261" cy="40" r="3.4" fill="#8272b8"/>
      <circle class="thought-dot dot-three" cx="276" cy="40" r="3.4" fill="#8272b8"/>
    </g>` : ''}
  `;
  return svg;
}
