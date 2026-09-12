import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(p,'utf8'), hash=s=>createHash('sha256').update(s).digest('hex');
const baseline=JSON.parse(read('tests/locked-baseline.json'));
test('locked SM-2 formula is byte-for-byte unchanged',()=>{const s=read('src/srs.js');assert.equal(hash(s.slice(s.indexOf('export function grade('),s.indexOf('export const scheduleFields'))),baseline.grade);});
test('locked share, download, filename, MIME and fallback are unchanged',()=>{const s=read('src/app.js');assert.equal(hash(s.slice(s.indexOf('function exportFile()'),s.indexOf("document.addEventListener('keydown'"))),baseline.share);});
test('locked render markup, design tokens, fonts, manifest and vocabulary are unchanged',()=>{const s=read('src/app.js');assert.equal(hash(s.slice(s.indexOf('function render()'),s.indexOf('async function mutate('))),baseline.render);for(const [p,expected]of Object.entries(baseline.files))assert.equal(hash(readFileSync(p)),expected,p);});
