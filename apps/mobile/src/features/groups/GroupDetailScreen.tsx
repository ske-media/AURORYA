// Détail d'un groupe (SPEC §7.6) : membres, rôles et duos, invitation par la feuille de partage, départ.
import type { GroupType } from '@aurorya/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Share } from 'react-native';
import { Banner, Button, Card, EmptyState, Screen, Text } from '@/components/ui';
import { endpoints, ensureSession, getBackend } from '@/services/backend';
import { NotConfiguredError } from '@/services/query';
import { useOnboarding } from '@/store/onboarding';
import { useTheme } from '@/theme/ThemeProvider';

type Member = { user_id: string; display_name: string };

export function GroupDetailScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { draft } = useOnboarding();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const group = useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      const backend = getBackend();
      if (!backend) throw new NotConfiguredError();
      await ensureSession(backend);
      const [{ data: info, error }, { data: members, error: membersError }] = await Promise.all([
        backend.supabase.from('groups').select('id, name, type').eq('id', groupId).maybeSingle(),
        // Seules les colonnes partagées sont lisibles : jamais le thème d'une autre membre.
        backend.supabase.from('group_members').select('user_id, display_name').eq('group_id', groupId).order('joined_at'),
      ]);
      if (error ?? membersError) throw error ?? membersError;
      if (!info) return null;
      return { info: info as { id: string; name: string; type: GroupType }, members: (members ?? []) as Member[] };
    },
  });
  const memberCount = group.data?.members.length ?? 0;
  const reading = useQuery({
    queryKey: ['group-reading', groupId, draft.toneMode, memberCount],
    enabled: memberCount >= 2,
    retry: false,
    queryFn: async () => {
      const backend = getBackend();
      if (!backend) throw new NotConfiguredError();
      return endpoints(backend).postGroupReading(groupId, draft.toneMode);
    },
  });

  const run = async (work: (api: ReturnType<typeof endpoints>) => Promise<void>): Promise<void> => {
    const backend = getBackend();
    if (!backend) return;
    setBusy(true);
    setFailed(false);
    try {
      await work(endpoints(backend));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  const invite = () => run(async (api) => {
    const created = await api.postGroupInvite(groupId);
    const values = { group: group.data?.info.name ?? '', code: created.code, url: created.url ?? '' };
    await Share.share({ message: t(created.url ? 'groups.detail.inviteMessageWithLink' : 'groups.detail.inviteMessage', values) });
  });
  const leave = () => run(async (api) => {
    await api.leaveGroup(groupId);
    await queryClient.invalidateQueries({ queryKey: ['groups'] });
    router.back();
  });

  if (group.isPending) return <Screen><ActivityIndicator color={theme.colors.accent} accessibilityLabel={t('common.loading')} /></Screen>;
  if (group.isError || !group.data) {
    return <Screen scroll={false}><EmptyState title={t('groups.state.error.title')} body={t('groups.state.error.body')} action={{ label: t('common.back'), onPress: () => router.back() }} /></Screen>;
  }
  const nameOf = (uid: string): string => group.data?.members.find((m) => m.user_id === uid)?.display_name ?? '';
  return (
    <Screen>
      <Text variant="title1" accessibilityRole="header">{group.data.info.name}</Text>
      <Text variant="label" color="accent">{t(`groups.create.type.${group.data.info.type}`)} · {t('groups.detail.members', { count: memberCount })}</Text>
      {failed ? <Banner message={t('groups.error.generic')} /> : null}
      <Button label={t('groups.detail.invite')} onPress={() => void invite()} loading={busy} />
      {memberCount < 2 ? <Card><Text color="textSecondary">{t('groups.detail.needTwo')}</Text></Card> : null}
      {reading.isPending && memberCount >= 2 ? <ActivityIndicator color={theme.colors.accent} accessibilityLabel={t('common.loading')} /> : null}
      {reading.isError ? <Card><Text color="textSecondary">{t('groups.detail.unavailable')}</Text></Card> : null}
      {reading.data ? (
        <>
          <Text variant="heading">{t('groups.detail.roles')}</Text>
          {reading.data.roles.map((role) => (
            <Card key={role.userId}>
              <Text variant="label" color="accent">{role.displayName}</Text>
              <Text variant="title2">{role.label}</Text>
              {role.line ? <Text>{role.line}</Text> : null}
            </Card>
          ))}
          <Text variant="heading">{t('groups.detail.duos')}</Text>
          {reading.data.duos.map((duo) => (
            <Card key={duo.kind}>
              <Text variant="label" color="accent">{t(`groups.detail.${duo.kind}`)}</Text>
              <Text variant="title2">{t('groups.detail.and', { a: nameOf(duo.a), b: nameOf(duo.b) })}</Text>
              {duo.line ? <Text>{duo.line}</Text> : null}
            </Card>
          ))}
        </>
      ) : null}
      <Button variant="ghost" label={t('groups.detail.leave')} onPress={() => void leave()} disabled={busy} />
    </Screen>
  );
}
