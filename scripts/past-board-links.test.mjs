import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../drizzle/migrations/0007_past_board_public_linkedin.sql', import.meta.url), 'utf8');

test('past Board links preserve hidden and expelled person exclusions', () => {
  assert.match(sql, /AND NOT p\.public_hidden/);
  assert.match(sql, /m\.membership_status = 'expelled'/);
});

test('past Board links come from public profiles linked by identity, not names or private member links', () => {
  assert.match(sql, /public\.team_members t ON t\.member_id = r\.record_id/);
  assert.match(sql, /public\.alumni a ON a\.id = r\.record_id/);
  assert.doesNotMatch(sql, /m\.linkedin_url/);
  assert.match(sql, /'linkedin_url', linkedin_url/);
  assert.doesNotMatch(sql, /'email'|'phone'|'photo_url'/);
});