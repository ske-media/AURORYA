// Cadre commun des cinq écrans : progression discrète, retour possible partout, action principale (SPEC §7.1).
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { ONBOARDING_STEPS, type OnboardingStep } from './draft';

type Props = { step: OnboardingStep; title: string; subtitle?: string; canContinue: boolean; onContinue: () => void; continueLabel?: string; children: ReactNode };

export function OnboardingScaffold({ step, title, subtitle, canContinue, onContinue, continueLabel, children }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const index = ONBOARDING_STEPS.indexOf(step);
  return (
    <Screen>
      <View style={{ flexDirection: 'row', gap: theme.spacing.s8 }} accessibilityRole="progressbar" accessibilityLabel={t('onboarding.progress', { current: index + 1, total: ONBOARDING_STEPS.length })}>
        {ONBOARDING_STEPS.map((s, i) => (
          <View key={s} style={{ flex: 1, height: theme.spacing.s2, borderRadius: theme.radii.pill, backgroundColor: i <= index ? theme.colors.accent : theme.colors.border }} />
        ))}
      </View>
      <View style={{ gap: theme.spacing.s8 }}>
        <Text variant="title1" accessibilityRole="header">{title}</Text>
        {subtitle ? <Text color="textSecondary">{subtitle}</Text> : null}
      </View>
      {children}
      <View style={{ gap: theme.spacing.s12 }}>
        <Button label={continueLabel ?? t('onboarding.continue')} onPress={onContinue} disabled={!canContinue} />
        {index > 0 ? <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} /> : null}
      </View>
    </Screen>
  );
}
