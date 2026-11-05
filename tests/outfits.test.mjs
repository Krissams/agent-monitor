import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assignUniqueOutfits,outfitForSlot,OUTFITS,activeAvatar} from '../public/outfits.js';
const agents=(n,status='working')=>Array.from({length:n},(_,i)=>({id:`agent-${String(i).padStart(3,'0')}`,title:'Developer',status}));
test('twenty simultaneous developers receive twenty different garment shapes',()=>{
  const {looks}=assignUniqueOutfits(agents(20));
  assert.equal(new Set([...looks.values()].map(l=>l.id)).size,20);
  assert.equal(OUTFITS.length,20);
});
test('one hundred agents of the same role never share an outfit or colorway',()=>{
  const {looks}=assignUniqueOutfits(agents(100));
  const values=[...looks.values()];
  assert.equal(new Set(values.map(l=>l.key)).size,100);
  assert.equal(new Set(values.map(l=>`${l.id}:${l.primary}:${l.accent}`)).size,100);
});
test('refresh, sorting, persistence and changing runs or roles preserve agent identity',()=>{
  const all=agents(20); const first=assignUniqueOutfits(all);
  const saved=JSON.parse(JSON.stringify(first.assignments));
  const changed=all.toReversed().map(a=>({...a,title:'Security Engineer',runId:'next'}));
  const next=assignUniqueOutfits(changed,saved);
  for(const agent of all) assert.equal(first.looks.get(agent.id).key,next.looks.get(agent.id).key);
});
test('new agents do not steal a reserved look and return to the same identity',()=>{
  const first=assignUniqueOutfits(agents(3));
  const next=assignUniqueOutfits([agents(3)[0],{id:'new',title:'Developer',status:'working'}],first.assignments);
  assert.notEqual(next.looks.get('new').key,first.looks.get('agent-001').key);
  const restored=assignUniqueOutfits(agents(3),next.assignments);
  assert.equal(restored.looks.get('agent-001').key,first.looks.get('agent-001').key);
});
test('waiting and unread agents participate in the same uniqueness allocation',()=>{
  const all=[...agents(3),{id:'waiting',title:'Developer',status:'waitingInput'},{id:'unread',title:'Developer',status:'completed',unread:true}];
  const {looks}=assignUniqueOutfits(all);
  assert.equal(new Set(all.filter(activeAvatar).map(a=>looks.get(a.id).key)).size,5);
});
test('duplicated and invalid saved slots are repaired without moving the first owner',()=>{
  const {looks}=assignUniqueOutfits(agents(4),{'agent-000':0,'agent-001':0,'agent-002':-1,'agent-003':'0'});
  assert.equal(looks.get('agent-000').slot,0);
  assert.equal(new Set([...looks.values()].map(l=>l.key)).size,4);
});
test('additional colorways beyond the first four hundred never wrap to the base look',()=>{
  assert.notEqual(outfitForSlot(0).primary,outfitForSlot(400).primary);
  assert.notEqual(outfitForSlot(400).primary,outfitForSlot(800).primary);
});
