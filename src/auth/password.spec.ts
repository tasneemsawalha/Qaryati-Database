import { hashPassword, verifyPassword, tokenHash } from './password';
describe('passwords and tokens', () => {
  it('salts identical passwords differently and verifies securely', async () => {
    const a = await hashPassword('correct-password'),
      b = await hashPassword('correct-password');
    expect(a).not.toEqual(b);
    expect(await verifyPassword('correct-password', a)).toBe(true);
    expect(await verifyPassword('wrong-password', a)).toBe(false);
    expect(a).not.toContain('correct-password');
  });
  it('hashes tokens deterministically without storing plaintext', () => {
    expect(tokenHash('secret')).toHaveLength(64);
    expect(tokenHash('secret')).not.toBe('secret');
  });
});
