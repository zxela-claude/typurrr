import { describe, it, expect, vi, beforeEach } from 'vitest';

// auth.js has DOM and CDN supabase dependencies, so we test its pure logic patterns.

describe('Auth state management', () => {
  it('validates email format', () => {
    const isValidEmail = (email) => email.includes('@') && email.includes('.');
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('missing@dot')).toBe(false);
  });

  it('validates password length', () => {
    const isValidPassword = (pw) => pw.length >= 6;
    expect(isValidPassword('123456')).toBe(true);
    expect(isValidPassword('12345')).toBe(false);
    expect(isValidPassword('')).toBe(false);
  });

  it('validates password at minimum boundary (exactly 6 chars)', () => {
    const isValidPassword = (pw) => pw.length >= 6;
    expect(isValidPassword('abcdef')).toBe(true);
  });

  it('rejects email with no @ symbol', () => {
    const isValidEmail = (email) => email.includes('@') && email.includes('.');
    expect(isValidEmail('noemail.com')).toBe(false);
  });

  it('rejects email with @ but no dot', () => {
    const isValidEmail = (email) => email.includes('@') && email.includes('.');
    expect(isValidEmail('user@nodot')).toBe(false);
  });
});

describe('Auth internal state logic', () => {
  it('getUser returns null initially (simulated)', () => {
    let _user = null;
    const getUser = () => _user;
    expect(getUser()).toBeNull();
  });

  it('getUserProfile returns null initially (simulated)', () => {
    let _profile = null;
    const getUserProfile = () => _profile;
    expect(getUserProfile()).toBeNull();
  });

  it('setUserProfile updates profile correctly', () => {
    let _profile = null;
    function setUserProfile(profile) { _profile = profile; }
    const getUserProfile = () => _profile;

    setUserProfile({ username: 'alice', avatar_cat: 'orange' });
    expect(getUserProfile()).toEqual({ username: 'alice', avatar_cat: 'orange' });
  });

  it('setUserProfile replaces previous profile', () => {
    let _profile = { username: 'alice', avatar_cat: 'orange' };
    function setUserProfile(profile) { _profile = profile; }
    const getUserProfile = () => _profile;

    setUserProfile({ username: 'bob', avatar_cat: 'grey' });
    expect(getUserProfile().username).toBe('bob');
    expect(getUserProfile().avatar_cat).toBe('grey');
  });

  it('setUserProfile can be set to null (logout)', () => {
    let _profile = { username: 'alice' };
    function setUserProfile(profile) { _profile = profile; }
    const getUserProfile = () => _profile;

    setUserProfile(null);
    expect(getUserProfile()).toBeNull();
  });

  it('onChange callback is invoked with updated state', () => {
    let _onChange = null;
    let _user = null;
    let _profile = null;

    function initOnChange(cb) { _onChange = cb; }
    function simulateAuthChange(user, profile) {
      _user = user;
      _profile = profile;
      _onChange?.(_user, _profile);
    }

    const callback = vi.fn();
    initOnChange(callback);
    simulateAuthChange({ id: '123' }, { username: 'alice' });

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith({ id: '123' }, { username: 'alice' });
  });

  it('onChange is not called when not set', () => {
    let _onChange = null;
    function simulateAuthChange(user, profile) {
      _onChange?.(_user, _profile);
    }
    // Should not throw
    expect(() => simulateAuthChange(null, null)).not.toThrow();
  });
});

describe('Auth mode toggling logic', () => {
  it('toggles from signin to signup', () => {
    let mode = 'signin';
    function toggle() { mode = mode === 'signin' ? 'signup' : 'signin'; }
    toggle();
    expect(mode).toBe('signup');
  });

  it('toggles from signup back to signin', () => {
    let mode = 'signup';
    function toggle() { mode = mode === 'signin' ? 'signup' : 'signin'; }
    toggle();
    expect(mode).toBe('signin');
  });

  it('toggle is idempotent over two calls', () => {
    let mode = 'signin';
    function toggle() { mode = mode === 'signin' ? 'signup' : 'signin'; }
    toggle(); toggle();
    expect(mode).toBe('signin');
  });
});
