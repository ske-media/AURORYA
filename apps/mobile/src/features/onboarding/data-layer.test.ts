import { ChartSummarySchema } from '@aurorya/shared';
import { describe, expect, it } from 'vitest';
import { ApiError, createApiClient } from '@/services/api-client';
import { CHUNK_SIZE, type KeyValueStore, createChunkedStorage } from '@/services/chunked-storage';
import { EMPTY_DRAFT, type OnboardingDraft, firstIncompleteStep, isFirstNameWellFormed, isOldEnough, isStepComplete, latestBirthDate, toChartInput, toProfileInput } from './draft';

const memory = (): KeyValueStore & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: async (k) => data.get(k) ?? null, setItem: async (k, v) => void data.set(k, v), removeItem: async (k) => void data.delete(k) };
};

describe('stockage sécurisé par morceaux', () => {
  it('restitue une valeur longue à l’identique, avec des clés acceptées par le trousseau', async () => {
    const store = memory();
    const storage = createChunkedStorage(store);
    const value = JSON.stringify({ token: 'é'.repeat(3000), refresh: 'x'.repeat(1000) });
    await storage.setItem('sb-projet-auth-token', value);
    expect(await storage.getItem('sb-projet-auth-token')).toBe(value);
    for (const [key, chunk] of store.data) {
      expect(key).toMatch(/^[A-Za-z0-9._-]+$/);
      expect(chunk.length).toBeLessThanOrEqual(CHUNK_SIZE);
      expect(new TextEncoder().encode(chunk).length).toBeLessThan(2048);
    }
  });
  it('remplace une valeur longue par une courte sans laisser de reste, puis efface tout', async () => {
    const store = memory();
    const storage = createChunkedStorage(store);
    await storage.setItem('k', 'a'.repeat(2000));
    await storage.setItem('k', 'court');
    expect(await storage.getItem('k')).toBe('court');
    expect(store.data.size).toBe(2);
    await storage.removeItem('k');
    expect(store.data.size).toBe(0);
    expect(await storage.getItem('k')).toBeNull();
  });
  it('traite une valeur incomplète comme absente', async () => {
    const store = memory();
    const storage = createChunkedStorage(store);
    await storage.setItem('k', 'a'.repeat(1500));
    store.data.delete('k.1');
    expect(await storage.getItem('k')).toBeNull();
  });
});

describe('client de l’API', () => {
  const summary = { chartId: '00000000-0000-4000-8000-000000000001', sunSign: 'aries', moonSign: null, ascSign: 'leo', flags: { timeAssumed: false, dstAmbiguous: false, houseSystemFallback: false } };
  const make = (responses: (Response | Error)[], extra: Partial<Parameters<typeof createApiClient>[0]> = {}) => {
    const calls: { url: string; init: RequestInit }[] = [];
    const client = createApiClient({
      baseUrl: 'https://api.invalid/api/v1', appVersion: '0.1.0', appBuild: '7', getToken: async () => 'jeton', getLocale: () => 'fr', newRequestId: () => 'req-1', sleep: async () => undefined,
      fetch: (async (url: string, init: RequestInit) => {
        calls.push({ url, init });
        const next = responses.shift();
        if (next === undefined || next instanceof Error) throw next ?? new Error('plus de réponse');
        return next;
      }) as unknown as typeof fetch,
      ...extra,
    });
    return { client, calls };
  };
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

  it('envoie le jeton et les en-têtes, et valide la réponse', async () => {
    const { client, calls } = make([json(201, summary)]);
    const result = await client.request({ method: 'POST', path: '/charts', body: { a: 1 }, output: ChartSummarySchema, idempotencyKey: 'idem-1' });
    expect(result.sunSign).toBe('aries');
    expect(calls[0]?.url).toBe('https://api.invalid/api/v1/charts');
    expect(calls[0]?.init.headers).toMatchObject({ authorization: 'Bearer jeton', 'x-app-build': '7', 'x-app-version': '0.1.0', 'x-locale': 'fr', 'x-request-id': 'req-1', 'idempotency-key': 'idem-1' });
  });
  it('convertit les erreurs de l’API en ApiError porteuse du code', async () => {
    const { client } = make([json(403, { error: { code: 'PREMIUM_REQUIRED', message: 'x', retryable: false, details: {} } })]);
    await expect(client.request({ method: 'POST', path: '/roasts', body: {}, output: null })).rejects.toMatchObject({ code: 'PREMIUM_REQUIRED', status: 403 });
  });
  it('refuse une réponse qui ne respecte pas le schéma', async () => {
    const { client } = make([json(200, { chartId: 'x' })]);
    await expect(client.request({ method: 'POST', path: '/charts', body: {}, output: ChartSummarySchema })).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
  it('relance deux fois une lecture, jamais une création', async () => {
    const reads = make([new Error('réseau'), json(500, { error: { code: 'INTERNAL', message: 'x', retryable: true, details: {} } }), json(200, summary)]);
    expect((await reads.client.request({ method: 'GET', path: '/x', output: ChartSummarySchema })).ascSign).toBe('leo');
    expect(reads.calls).toHaveLength(3);
    const writes = make([new Error('réseau'), json(201, summary)]);
    await expect(writes.client.request({ method: 'POST', path: '/charts', body: {}, output: ChartSummarySchema })).rejects.toBeInstanceOf(ApiError);
    expect(writes.calls).toHaveLength(1);
  });
  it('signale la mise à jour obligatoire', async () => {
    let asked = false;
    const { client } = make([json(426, { error: { code: 'UPDATE_REQUIRED', message: 'x', retryable: false, details: {} } })], { onUpdateRequired: () => { asked = true; } });
    await expect(client.request({ method: 'GET', path: '/config', output: null })).rejects.toMatchObject({ code: 'UPDATE_REQUIRED' });
    expect(asked).toBe(true);
  });
});

describe('brouillon d’onboarding', () => {
  const today = new Date(2026, 10, 23);
  const full: OnboardingDraft = {
    ...EMPTY_DRAFT, firstName: ' léa ', grammaticalGender: 'f', birthDate: '1993-04-17', timePrecision: 'exact', birthTime: '14:35',
    place: { geonameId: 2996944, name: 'Lyon', admin1Name: 'Auvergne-Rhône-Alpes', countryCode: 'FR' },
  };
  it('valide la forme du prénom', () => {
    expect(isFirstNameWellFormed('Jean-Baptiste')).toBe(true);
    for (const bad of ['', ' ', 'Léa2', 'x'.repeat(25), '-Léa']) expect(isFirstNameWellFormed(bad)).toBe(false);
  });
  it('borne la date de naissance par l’âge minimum', () => {
    expect(latestBirthDate(today, 16)).toBe('2010-11-23');
    expect(isOldEnough('2010-11-23', today, 16)).toBe(true);
    expect(isOldEnough('2010-11-24', today, 16)).toBe(false);
  });
  it('exige un choix d’accord : aucune présélection', () => {
    expect(isStepComplete('welcome', { ...EMPTY_DRAFT, firstName: 'Léa' })).toBe(false);
    expect(isStepComplete('welcome', { ...EMPTY_DRAFT, firstName: 'Léa', grammaticalGender: 'n' })).toBe(true);
  });
  it('présélectionne Mars et suit les étapes dans l’ordre', () => {
    expect(EMPTY_DRAFT.toneMode).toBe('cash');
    expect(firstIncompleteStep(EMPTY_DRAFT)).toBe('welcome');
    expect(firstIncompleteStep({ ...full, timePrecision: null, birthTime: null })).toBe('birth-time');
    expect(firstIncompleteStep({ ...full, timePrecision: 'approx', birthTime: null })).toBe('birth-time');
    expect(firstIncompleteStep({ ...full, timePrecision: 'unknown', birthTime: null })).toBeNull();
    expect(firstIncompleteStep(full)).toBeNull();
  });
  it('produit les entrées de l’API, sans heure quand elle n’est pas exacte', () => {
    expect(toProfileInput(full, 'fr', 'Europe/Paris')).toMatchObject({ firstName: 'léa', grammaticalGender: 'f', toneModeDefault: 'cash' });
    expect(toChartInput(full)).toEqual({ placeId: 2996944, date: '1993-04-17', timePrecision: 'exact', time: '14:35', timeWindow: null, dstChoice: null });
    expect(toChartInput({ ...full, timePrecision: 'approx', timeWindow: 'evening' })).toMatchObject({ time: null, timeWindow: 'evening' });
    expect(toChartInput({ ...full, timePrecision: 'unknown' })).toMatchObject({ time: null, timeWindow: null });
    expect(toChartInput(EMPTY_DRAFT)).toBeNull();
  });
});
