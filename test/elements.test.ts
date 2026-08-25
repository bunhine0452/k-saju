// Five-element distribution (hidden-stem weighting), ten gods, and the day-pillar reading.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveSaju } from '../src/saju.js';
import { analyzeElements } from '../src/elements.js';
import { analyzeSipseong } from '../src/sipseong.js';
import { iljuInfo, twelveStage } from '../src/ilju.js';

const sj = (date: string, time?: string) => deriveSaju({ date, time, calendar: 'solar' });

// Chart: 庚寅 庚辰 戊戌 丁巳 (2010-04-18 09:30 — 巳 hour under the −30 min convention).
test('hidden-stem weighting — day-count-ratio distribution', () => {
  const p = analyzeElements(sj('2010-04-18', '09:30'));
  // Principal counts (integers): stem 1 + branch principal 1.
  assert.deepEqual(p.counts, { 木: 1, 火: 2, 土: 3, 金: 2, 水: 0 });
  // Weighted total = 4 stems + 4 branches = 8 (each branch still sums to 1 after the split).
  const sum = Object.values(p.weighted).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 8) < 0.01, `weighted total ≈ 8 (got ${sum})`);
  // Principal counts say 水 = 0, but the hidden stem 癸 inside 辰 surfaces some 水.
  assert.ok(p.weighted.水 > 0, 'hidden stems surface 水 > 0');
  assert.equal(p.counts.水, 0, 'principal count of 水 stays 0 (absence judgment intact)');
  assert.deepEqual(p.lacking, ['水'], 'absence is judged on principal counts');
});

test('ten gods — distribution over 7 characters (day master excluded)', () => {
  const s = sj('2010-04-18', '09:30'); // 庚寅 庚辰 戊戌 丁巳, day master 戊
  const sip = analyzeSipseong(s);
  assert.equal(sip.dayMaster, '戊');
  const sum = Object.values(sip.counts).reduce((a, b) => a + b, 0);
  assert.equal(sum, 7, 'day master excluded once → 7 characters counted');
  assert.ok(sip.dominant.length >= 1, 'a dominant category exists');
});

test('day-pillar reading — 癸亥 anchor: Peak stage, Rob Wealth branch', () => {
  // 癸 (yin water) starts its stage cycle at 卯 and walks in reverse → 亥 is 제왕 (Peak).
  assert.equal(twelveStage('癸', '亥'), '제왕');
  // 2020-01-21 is a 癸亥 day.
  const info = iljuInfo(sj('2020-01-21', '12:00'));
  assert.equal(info.ganji, '癸亥');
  assert.equal(info.twelveStage, '제왕');
  assert.equal(info.branchSipseong, '겁재', '亥 principal 壬 → 겁재 (Rob Wealth) for 癸');
  assert.equal(info.stemElement, '水');
});
