import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ROLES, roleForAgent} from '../public/roles.js';

test('all twenty named roles can be selected from an agent title',()=>{
  assert.equal(ROLES.length,20);
  for (const role of ROLES) assert.equal(roleForAgent({title:role.name}).id,role.id,role.name);
});
test('specific titles take precedence over project words and changing progress',()=>{
  assert.equal(roleForAgent({title:'Example SEO - Devops',update:'Testing the deployment'}).id,'devops');
  assert.equal(roleForAgent({title:'Sample App - BUG Fixer',update:'Testing push notification security'}).id,'developer');
  assert.equal(roleForAgent({title:'FB Ads',update:'Marketing campaign'}).id,'social');
  assert.equal(roleForAgent({title:'Build local Codex activity dashboard'}).id,'developer');
  assert.equal(roleForAgent({title:'Scientist',update:'Research and data analysis'}).id,'scientist');
});
test('manual styles win, invalid saved styles cannot inject markup, and generic tasks have a fallback',()=>{
  assert.equal(roleForAgent({title:'Developer'},'artist').id,'artist');
  assert.equal(roleForAgent({title:'Developer'},'<script>').id,'developer');
  assert.equal(roleForAgent({title:'My agent',update:'Checking laboratory experiments'}).id,'scientist');
  assert.equal(roleForAgent({title:'My agent'}).id,'developer');
});
