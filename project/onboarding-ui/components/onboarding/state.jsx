'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { emptyProfile } from '../../app/onboarding/_data/profile';

export { nextId } from '../../app/onboarding/_data/merge';

/**
 * One onboarding record shared by every screen of the wizard.
 *
 * Kept in sessionStorage so a refresh mid-wizard does not lose the answers.
 * Storage can be blocked, in which case the wizard still works and simply
 * starts again on reload.
 */

const KEY = 'bizzii.onboarding.v2';
const Ctx = createContext(null);

export function OnboardingProvider({ children }) {
  const [profile, setProfile] = useState(emptyProfile);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(KEY);
      if (saved) setProfile({ ...emptyProfile(), ...JSON.parse(saved) });
    } catch (e) {
      /* unreadable or blocked storage: start empty */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.sessionStorage.setItem(KEY, JSON.stringify(profile));
    } catch (e) {
      /* a viewer with site data blocked loses progress on reload */
    }
  }, [profile, loaded]);

  /** Shallow-merge `patch` into one section, e.g. update('fit', { team_size }). */
  const update = useCallback((section, patch) => {
    setProfile((p) => ({
      ...p,
      [section]: Array.isArray(patch) ? patch : { ...p[section], ...patch },
    }));
  }, []);

  /**
   * An owner edit to one scalar field. Whatever its source, a value the owner
   * has edited counts as confirmed by them.
   */
  const setField = useCallback((path, value) => {
    const [section, field] = path.split('.');
    setProfile((p) => ({
      ...p,
      [section]: { ...p[section], [field]: value },
      provenance: { ...p.provenance, [path]: { source: p.provenance[path]?.source ?? null, confirmed: true } },
    }));
  }, []);

  /** Any change computed from the whole record, e.g. folding in an import. */
  const apply = useCallback((fn) => setProfile(fn), []);

  const reset = useCallback(() => setProfile(emptyProfile()), []);

  return (
    <Ctx.Provider value={{ profile, loaded, update, setField, apply, reset }}>{children}</Ctx.Provider>
  );
}

export function useOnboarding() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return v;
}
