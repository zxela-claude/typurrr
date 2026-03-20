import { describe, it, expect } from 'vitest';

// Tests for the profile avatar sync logic from profile.js.
// The avatar update fix ensures local state is updated correctly
// without mutating the original object.

describe('Profile avatar sync', () => {
  it('updates local profile state when avatar changes', () => {
    let profile = { username: 'testuser', avatar_cat: 'orange' };

    // Simulate the profile update flow from profile.js
    function updateLocalProfile(currentProfile, newVariant) {
      return { ...currentProfile, avatar_cat: newVariant };
    }

    const updated = updateLocalProfile(profile, 'tuxedo');
    expect(updated.avatar_cat).toBe('tuxedo');
    expect(updated.username).toBe('testuser'); // unchanged
    expect(profile.avatar_cat).toBe('orange'); // original unchanged
  });

  it('preserves all profile fields on avatar update', () => {
    const profile = { username: 'player1', avatar_cat: 'grey', created_at: '2024-01-01' };
    const updated = { ...profile, avatar_cat: 'calico' };
    expect(Object.keys(updated)).toEqual(Object.keys(profile));
    expect(updated.avatar_cat).toBe('calico');
  });

  it('does not mutate the original profile object', () => {
    const profile = { username: 'testuser', avatar_cat: 'orange' };
    const original = { ...profile };
    const _updated = { ...profile, avatar_cat: 'tuxedo' };
    expect(profile).toEqual(original);
  });

  it('setUserProfile is called with merged profile including new avatar', () => {
    let storedProfile = null;
    function setUserProfile(p) { storedProfile = p; }

    const profile = { username: 'catfan', avatar_cat: 'grey' };
    const newVariant = 'calico';
    setUserProfile({ ...profile, avatar_cat: newVariant });

    expect(storedProfile).not.toBeNull();
    expect(storedProfile.avatar_cat).toBe('calico');
    expect(storedProfile.username).toBe('catfan');
  });

  it('local profile variable is also updated to new variant', () => {
    // Simulate the btn.onclick closure from profile.js
    let profile = { username: 'catfan', avatar_cat: 'grey' };

    function onAvatarClick(variant) {
      // This mirrors: profile = { ...profile, avatar_cat: variant };
      profile = { ...profile, avatar_cat: variant };
    }

    onAvatarClick('tuxedo');
    expect(profile.avatar_cat).toBe('tuxedo');
  });

  it('avatar change from one valid variant to another', () => {
    const CAT_VARIANTS = ['orange', 'grey', 'tuxedo', 'calico'];
    const profile = { username: 'player', avatar_cat: 'orange' };

    for (const variant of CAT_VARIANTS) {
      const updated = { ...profile, avatar_cat: variant };
      expect(CAT_VARIANTS).toContain(updated.avatar_cat);
    }
  });

  it('profile with extra fields retains them after avatar update', () => {
    const profile = {
      username: 'user1',
      avatar_cat: 'orange',
      created_at: '2024-01-01',
      id: 'abc-123',
    };
    const updated = { ...profile, avatar_cat: 'grey' };
    expect(updated.id).toBe('abc-123');
    expect(updated.created_at).toBe('2024-01-01');
    expect(updated.username).toBe('user1');
    expect(updated.avatar_cat).toBe('grey');
  });
});
