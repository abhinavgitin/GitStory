import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isValidGitHubUsername, normalizeUsername } from './username.ts';

describe('isValidGitHubUsername', () => {
  it('accepts valid usernames', () => {
    assert.strictEqual(isValidGitHubUsername('abhinavgitin'), true);
    assert.strictEqual(isValidGitHubUsername('octocat'), true);
    assert.strictEqual(isValidGitHubUsername('a'), true);
    assert.strictEqual(isValidGitHubUsername('user-name'), true);
    assert.strictEqual(isValidGitHubUsername('user-1-2-3'), true);
    assert.strictEqual(isValidGitHubUsername('User123'), true);
    // 39 characters max boundary
    const maxLenUsername = 'a'.repeat(39);
    assert.strictEqual(isValidGitHubUsername(maxLenUsername), true);
  });

  it('rejects empty, null, and undefined values', () => {
    assert.strictEqual(isValidGitHubUsername(''), false);
    assert.strictEqual(isValidGitHubUsername('   '), false);
    assert.strictEqual(isValidGitHubUsername(null as unknown as string), false);
    assert.strictEqual(isValidGitHubUsername(undefined as unknown as string), false);
  });

  it('rejects usernames exceeding 39 characters', () => {
    const tooLong = 'a'.repeat(40);
    assert.strictEqual(isValidGitHubUsername(tooLong), false);
  });

  it('rejects leading hyphens', () => {
    assert.strictEqual(isValidGitHubUsername('-username'), false);
  });

  it('rejects trailing hyphens', () => {
    assert.strictEqual(isValidGitHubUsername('username-'), false);
  });

  it('rejects consecutive / double hyphens', () => {
    assert.strictEqual(isValidGitHubUsername('user--name'), false);
    assert.strictEqual(isValidGitHubUsername('user---name'), false);
  });

  it('rejects whitespace in usernames', () => {
    assert.strictEqual(isValidGitHubUsername('user name'), false);
    assert.strictEqual(isValidGitHubUsername(' username'), false);
    assert.strictEqual(isValidGitHubUsername('username '), false);
  });

  it('rejects slashes and path traversal attempts', () => {
    assert.strictEqual(isValidGitHubUsername('user/name'), false);
    assert.strictEqual(isValidGitHubUsername('user\\name'), false);
    assert.strictEqual(isValidGitHubUsername('../user'), false);
  });

  it('rejects unicode and emojis', () => {
    assert.strictEqual(isValidGitHubUsername('userö'), false);
    assert.strictEqual(isValidGitHubUsername('user🚀'), false);
    assert.strictEqual(isValidGitHubUsername('userñame'), false);
  });

  it('rejects special query and delimiter characters', () => {
    assert.strictEqual(isValidGitHubUsername('user?query=1'), false);
    assert.strictEqual(isValidGitHubUsername('user#anchor'), false);
    assert.strictEqual(isValidGitHubUsername('user@domain'), false);
    assert.strictEqual(isValidGitHubUsername('user.name'), false);
    assert.strictEqual(isValidGitHubUsername('user:name'), false);
  });
});

describe('normalizeUsername', () => {
  it('lowercases and trims usernames', () => {
    assert.strictEqual(normalizeUsername('AbhinavGitin'), 'abhinavgiting'.slice(0, 12));
    assert.strictEqual(normalizeUsername('  OctoCat  '), 'octocat');
    assert.strictEqual(normalizeUsername('USER-123'), 'user-123');
  });
});
