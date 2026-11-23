// Onglet « Mes groupes » (SPEC §7.6) : liste, création, adhésion par code avec consentement explicite.
import { GROUP_TYPES, type GroupType } from '@aurorya/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';
import { Banner, Button, Card, Chip, EmptyState, Screen, Text, TextField } from '@/components/ui';
import { ApiError } from '@/services/api-client';
import { endpoints, ensureSession, getBackend } from '@/services/backend';
import { NotConfiguredError } from '@/services/query';
import { useOnboarding } from '@/store/onboarding';
import { useTheme } from '@/theme/ThemeProvider';

/** Version du texte de consentement au partage dans un groupe. À incrémenter si le texte change. */
const GROUP_CONSENT_VERSION = '1';
type GroupRow = { id: string; name: string; type: GroupType };
const KNOWN_ERRORS = ['ACCOUNT_REQUIRED', 'NAME_REJECTED', 'QUOTA_EXCEEDED', 'CONFLICT'] as const;
const errorKey = (error: unknown) => {
  const code = error instanceof ApiError ? error.code : null;
  return `groups.error.${(KNOWN_ERRORS as readonly string[]).includes(code ?? '') ? (code as (typeof KNOWN_ERRORS)[number]) : 'generic'}` as const;
};

export function GroupsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { draft } = useOnboarding();
  const [name, setName] = useState('');
  const [type, setType] = useState<GroupType>('friends');
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<{ inviter: string; group: string } | null>(null);
  const [displayName, setDisplayName] = useState(draft.firstName.trim());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const groups = useQuery({
    queryKey: ['groups'],
    queryFn: async (): Promise<GroupRow[]> => {
      const backend = getBackend();
      if (!backend) throw new NotConfiguredError();
      await ensureSession(backend);
      // Lecture directe sous RLS : seuls les groupes dont on est membre sont visibles.
      const { data, error } = await backend.supabase.from('groups').select('id, name, type').order('created_at');
      if (error) throw error;
      return (data ?? []) as GroupRow[];
    },
  });

  const act = async (work: (api: ReturnType<typeof endpoints>) => Promise<void>): Promise<void> => {
    const backend = getBackend();
    if (!backend) return;
    setBusy(true);
    setMessage(null);
    try {
      await work(endpoints(backend));
      await queryClient.invalidateQueries({ queryKey: ['groups'] });
    } catch (error) {
      setMessage(t(errorKey(error)));
    } finally {
      setBusy(false);
    }
  };
  const create = () => act(async (api) => { const group = await api.postGroups(name, type); setName(''); router.push(`/groups/${group.id}`); });
  const check = () => act(async (api) => {
    try {
      const found = await api.resolveInvite(code);
      setPreview(found.valid ? { inviter: found.inviterFirstName, group: found.groupName } : null);
      if (!found.valid) setMessage(t('groups.join.invalid'));
    } catch {
      setPreview(null);
      setMessage(t('groups.join.invalid'));
    }
  });
  const join = () => act(async (api) => { const group = await api.joinGroup({ code, displayName, consentVersion: GROUP_CONSENT_VERSION }); setCode(''); setPreview(null); router.push(`/groups/${group.id}`); });

  const unconfigured = groups.error instanceof NotConfiguredError;
  return (
    <Screen>
      <Text variant="title1" accessibilityRole="header">{t('groups.title')}</Text>
      {message ? <Banner message={message} /> : null}
      {groups.isPending ? <ActivityIndicator color={theme.colors.accent} accessibilityLabel={t('common.loading')} /> : null}
      {groups.isError ? (
        <EmptyState title={t(unconfigured ? 'onboarding.computing.state.unconfigured.title' : 'groups.state.error.title')} body={t(unconfigured ? 'onboarding.computing.state.unconfigured.body' : 'groups.state.error.body')}
          {...(unconfigured ? {} : { action: { label: t('common.retry'), onPress: () => void groups.refetch() } })} />
      ) : null}
      {groups.data?.length === 0 ? <EmptyState title={t('groups.state.empty.title')} body={t('groups.state.empty.body')} /> : null}
      {groups.data?.map((group) => (
        <Card key={group.id}>
          <Text variant="title2">{group.name}</Text>
          <Text variant="label" color="textSecondary">{t(`groups.create.type.${group.type}`)}</Text>
          <Button variant="secondary" label={t('groups.detail.open')} accessibilityLabel={`${t('groups.detail.open')} ${group.name}`} onPress={() => router.push(`/groups/${group.id}`)} />
        </Card>
      ))}
      {groups.isSuccess ? (
        <>
          <Card>
            <Text variant="heading">{t('groups.join.title')}</Text>
            <TextField label={t('groups.join.code')} value={code} onChangeText={(v) => { setCode(v); setPreview(null); }} autoCapitalize="characters" autoCorrect={false} maxLength={12} />
            {preview ? (
              <>
                <Text>{t('groups.join.preview', preview)}</Text>
                <Text variant="bodySmall" color="textSecondary">{t('groups.join.consent')}</Text>
                <TextField label={t('groups.join.displayName')} value={displayName} onChangeText={setDisplayName} maxLength={24} autoCapitalize="words" />
                <Button label={t('groups.join.accept')} onPress={() => void join()} loading={busy} disabled={displayName.trim().length === 0} />
              </>
            ) : <Button variant="secondary" label={t('groups.join.check')} onPress={() => void check()} loading={busy} disabled={code.trim().length < 8} />}
          </Card>
          <Card>
            <Text variant="heading">{t('groups.create.title')}</Text>
            <TextField label={t('groups.create.name')} value={name} onChangeText={setName} maxLength={30} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.s8 }}>
              {GROUP_TYPES.map((g) => <Chip key={g} label={t(`groups.create.type.${g}`)} selected={type === g} onPress={() => setType(g)} />)}
            </View>
            <Button label={t('groups.create.submit')} onPress={() => void create()} loading={busy} disabled={name.trim().length < 2} />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
