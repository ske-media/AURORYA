import { readFileSync } from 'node:fs';
import { palette } from '@aurorya/shared';
import { describe, expect, it } from 'vitest';
import en from './locales/en/common.json';
import fr from './locales/fr/common.json';
import { resolveLocale } from './resolve-locale';

describe('langue de l’app', () => {
  it('reste en français tant que l’anglais n’est pas activé', () => {
    expect(resolveLocale(false, 'en')).toBe('fr');
    expect(resolveLocale(false, 'fr')).toBe('fr');
    expect(resolveLocale(false, null)).toBe('fr');
  });
  it('passe en anglais seulement si le drapeau est actif et le téléphone en anglais', () => {
    expect(resolveLocale(true, 'en')).toBe('en');
    expect(resolveLocale(true, 'de')).toBe('fr');
  });
  it('porte le prénom de l’astrologue décidé par ADR-004 dans les deux langues', () => {
    expect(fr.persona.name).toBe('Ava');
    expect(en.persona.name).toBe('Ava');
  });
});

describe('configuration native', () => {
  const config = readFileSync(new URL('../../app.config.ts', import.meta.url), 'utf8');
  it('utilise la couleur de fond des tokens', () => {
    expect(config).toContain(`SPLASH_BACKGROUND = '${palette.ivory}'`);
  });
  it('cible l’iPhone en portrait, avec l’identifiant de bundle validé (ADR-003)', () => {
    expect(config).toContain("bundleIdentifier: 'com.aurorya.app'");
    expect(config).toContain('supportsTablet: false');
    expect(config).toContain("orientation: 'portrait'");
  });
});
