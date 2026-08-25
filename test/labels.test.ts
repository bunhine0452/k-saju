// English display layer — spot checks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stemLabel, branchLabel, ganjiLabel, ELEMENT_EN, STAGE_EN, SIPSEONG_DETAIL_EN } from '../src/labels.js';

test('labels — stems, branches, ganji', () => {
  assert.equal(stemLabel('甲'), 'Yang Wood');
  assert.equal(stemLabel('癸'), 'Yin Water');
  assert.equal(branchLabel('亥'), 'Water Pig');
  assert.equal(ganjiLabel('丙申'), 'Yang Fire Monkey');
  assert.equal(ganjiLabel('癸亥'), 'Yin Water Pig');
  assert.equal(ganjiLabel('??'), '');
  assert.equal(ELEMENT_EN['木'], 'Wood');
  assert.equal(STAGE_EN['제왕'], 'Peak');
  assert.equal(SIPSEONG_DETAIL_EN['겁재'], 'Rob Wealth');
});
