import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const output = await build({
  entryPoints: ['src/lib/company-visit-download-name.ts'],
  bundle: true, write: false, format: 'esm', platform: 'node',
});
const { companyVisitCvZipName } = await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`);

test('CV archives use CV_ followed by the event name', () => {
  assert.equal(companyVisitCvZipName('Company Visit: Banca Sella'), 'CV_Company Visit Banca Sella.zip');
  assert.equal(companyVisitCvZipName('Sella'), 'CV_Sella.zip');
});