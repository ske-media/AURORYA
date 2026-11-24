// Les huit sections de la lecture complète, sous la roue (SPEC §7.2) : titre et accroche, visibles par toutes.
// Les accroches viennent du roast déjà reçu : aucun appel réseau ici.
import { SECTION_KEYS } from '@aurorya/shared';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button, Card, Text } from '@/components/ui';
import { useOnboarding } from '@/store/onboarding';
import { useTheme } from '@/theme/ThemeProvider';

export function SectionCards() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const roast = useOnboarding((s) => s.roast);
  if (!roast) return null;
  return (
    <View style={{ gap: theme.spacing.s12 }}>
      <Text variant="title2" accessibilityRole="header">{t('reading.sectionsTitle')}</Text>
      {SECTION_KEYS.map((key) => (
        <Card key={key}>
          <Text variant="heading">{t(`reading.section.${key}`)}</Text>
          <Text color="textSecondary">{roast.hooks[key]}</Text>
          <Button variant="secondary" label={t('reading.open')} accessibilityLabel={`${t('reading.open')} ${t(`reading.section.${key}`)}`}
            onPress={() => router.push(`/reading/${key}?mode=${roast.mode}`)} />
        </Card>
      ))}
    </View>
  );
}
