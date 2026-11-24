// Réglages (SPEC §7.7, §7.9) : ton par défaut, création du compte par e-mail avec code, mention IA,
// suppression du compte en deux étapes. Le reste des réglages arrive avec ses tickets.
import { TONE_MODES } from '@aurorya/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Application from 'expo-application';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Banner, Button, Card, Chip, Screen, Text, TextField } from '@/components/ui';
import { endpoints, ensureSession, getBackend } from '@/services/backend';
import { useOnboarding } from '@/store/onboarding';
import { useTheme } from '@/theme/ThemeProvider';

export function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { draft, update, reset } = useOnboarding();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const session = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const backend = getBackend();
      if (!backend) return null;
      await ensureSession(backend);
      const { data } = await backend.supabase.auth.getUser();
      return data.user ? { isAnonymous: data.user.is_anonymous === true, email: data.user.email ?? null } : null;
    },
  });

  const run = async (failureKey: 'settings.account.failed' | 'settings.delete.failed', work: (backend: NonNullable<ReturnType<typeof getBackend>>) => Promise<void>): Promise<void> => {
    const backend = getBackend();
    if (!backend) return;
    setBusy(true);
    setNotice(null);
    try {
      await work(backend);
    } catch {
      setNotice(t(failureKey));
    } finally {
      setBusy(false);
    }
  };
  // Conversion de la session anonyme en compte : l'identifiant ne change pas, rien n'est à migrer (A-003).
  const sendCode = () => run('settings.account.failed', async (backend) => {
    const { error } = await backend.supabase.auth.updateUser({ email: email.trim() });
    if (error) throw error;
    setCodeSent(true);
    setNotice(t('settings.account.codeSent'));
  });
  const verify = () => run('settings.account.failed', async (backend) => {
    const { error } = await backend.supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email_change' });
    if (error) throw error;
    setNotice(t('settings.account.created'));
    await queryClient.invalidateQueries({ queryKey: ['session'] });
  });
  const remove = () => run('settings.delete.failed', async (backend) => {
    await endpoints(backend).deleteAccount();
    await backend.supabase.auth.signOut();
    queryClient.clear();
    reset();
    router.replace('/');
  });

  return (
    <Screen>
      <Text variant="title1" accessibilityRole="header">{t('settings.title')}</Text>
      {notice ? <Banner message={notice} /> : null}
      <Card>
        <Text variant="heading">{t('settings.tone')}</Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.s8 }}>
          {TONE_MODES.map((mode) => <Chip key={mode} label={t(`modes.${mode}.name`)} selected={draft.toneMode === mode} onPress={() => update({ toneMode: mode })} />)}
        </View>
      </Card>
      <Card>
        <Text variant="heading">{t('settings.account.title')}</Text>
        {session.data && !session.data.isAnonymous ? <Text>{t('settings.account.signedIn', { email: session.data.email ?? '' })}</Text> : (
          <>
            <Text color="textSecondary">{t('settings.account.anonymous')}</Text>
            <TextField label={t('settings.account.email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" />
            {codeSent ? (
              <>
                <TextField label={t('settings.account.code')} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={8} textContentType="oneTimeCode" />
                <Button label={t('settings.account.verify')} onPress={() => void verify()} loading={busy} disabled={code.trim().length < 6} />
              </>
            ) : <Button variant="secondary" label={t('settings.account.sendCode')} onPress={() => void sendCode()} loading={busy} disabled={!/^\S+@\S+\.\S+$/.test(email.trim())} />}
          </>
        )}
      </Card>
      <Card>
        <Text variant="heading">{t('settings.about.title')}</Text>
        <Text variant="bodySmall" color="textSecondary">{t('persona.disclosure', { name: t('persona.name') })}</Text>
        <Text variant="bodySmall" color="textSecondary">{t('settings.about.disclaimer')}</Text>
        <Text variant="caption" color="textSecondary">{t('settings.about.version', { version: Application.nativeApplicationVersion ?? '' })}</Text>
      </Card>
      <Card>
        <Text variant="heading">{t('settings.delete.title')}</Text>
        <Text color="textSecondary">{t('settings.delete.body')}</Text>
        <Text variant="bodySmall" color="textSecondary">{t('settings.delete.subscription')}</Text>
        {confirming ? (
          <>
            <Button label={t('settings.delete.confirm')} onPress={() => void remove()} loading={busy} />
            <Button variant="ghost" label={t('settings.delete.cancel')} onPress={() => setConfirming(false)} />
          </>
        ) : <Button variant="secondary" label={t('settings.delete.start')} onPress={() => setConfirming(true)} />}
      </Card>
    </Screen>
  );
}
