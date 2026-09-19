const GITHUB_USERNAME_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

export function isValidGitHubUsername(username: string | null | undefined): boolean {
  if (!username) return false;
  if (username.length === 0 || username.length > 39) return false;
  return GITHUB_USERNAME_REGEX.test(username);
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}
