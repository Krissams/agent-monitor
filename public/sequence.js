// FLIP transitions keep each agent's identity while its position changes.
// Content-only polls do not trigger motion; a new or reordered list does.
export function updateAgentList(container, agents, createCard) {
  const existing = new Map([...container.children]
    .filter(node => node.dataset.agentId)
    .map(node => [node.dataset.agentId, node]));
  const oldIds = [...existing.keys()];
  const newIds = agents.map(agent => agent.id);
  const changed = oldIds.length !== newIds.length || oldIds.some((id,index) => id !== newIds[index]);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animate = changed && oldIds.length > 0 && !reduced;
  const before = new Map();
  if (animate) for (const [id,node] of existing) before.set(id,node.getBoundingClientRect());
  if (changed || reduced) for (const node of existing.values()) {
    node._sequenceAnimation?.cancel();
    node._sequenceAnimation = null;
  }

  const ordered = agents.map(agent => {
    const fresh = createCard(agent);
    const node = existing.get(agent.id);
    if (!node) return fresh;
    const picker = node.querySelector('.role-picker');
    const freshPicker = fresh.querySelector('.role-picker');
    if (picker && freshPicker && document.activeElement === picker &&
        picker.value === freshPicker.value && node.className === fresh.className &&
        node.querySelector('.avatar')?.className === fresh.querySelector('.avatar')?.className) return node;
    // Keep matching characters so polling does not restart their animation loops.
    const avatar = node.querySelector('.avatar.waving, .avatar.working-motion, .avatar.sleeping');
    const freshAvatar = fresh.querySelector('.avatar.waving, .avatar.working-motion, .avatar.sleeping');
    if (avatar && freshAvatar && avatar.className === freshAvatar.className) freshAvatar.replaceWith(avatar);
    node.className = fresh.className;
    node.replaceChildren(...fresh.childNodes);
    return node;
  });
  const retained = new Set(newIds);
  for (const node of [...container.children]) if (!retained.has(node.dataset.agentId)) node.remove();
  for (let index=0;index<ordered.length;index++) {
    if (container.children[index] !== ordered[index]) container.insertBefore(ordered[index],container.children[index] || null);
  }
  if (!animate) return;

  let moved = 0;
  for (const node of ordered) {
    const first = before.get(node.dataset.agentId);
    const last = node.getBoundingClientRect();
    if (first) {
      const x = first.left-last.left, y = first.top-last.top;
      if (Math.abs(x)<1 && Math.abs(y)<1) continue;
      node._sequenceAnimation = node.animate([
        {transform:`translate(${x}px,${y}px)`}, {transform:'translate(0,0)'}
      ],{duration:550,easing:'cubic-bezier(.22,1,.36,1)'});
      moved++;
    } else {
      node._sequenceAnimation = node.animate([
        {opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}
      ],{duration:320,easing:'ease-out'});
    }
  }
  if (moved) container.dataset.reorderCount = String(Number(container.dataset.reorderCount || 0)+1);
}
