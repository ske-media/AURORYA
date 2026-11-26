// Les huit chapitres de la lecture complète, sous la roue (SPEC §7.2) : numéro, titre, accroche visible par toutes.
// Les accroches viennent du roast déjà reçu : aucun appel réseau ici.
import { type House, SECTION_KEYS, type ToneMode, houseToRoman } from '@aurorya/shared';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Button, Card, Icon, Text } from '@/components/ui';
import { feedback } from '@/services/feedback';
import { useEntitlement } from '@/services/query';
import { useOnboarding } from '@/store/onboarding';
import { useTheme } from '@/theme/ThemeProvider';

export function SectionCards({ mode }: { mode: ToneMode }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const roast = useOnboarding((s) => s.roast);
  const premium = useEntitlement().data?.premium === true;
  if (!roast) return null;
  // Les accroches appartiennent au roast d'un mode : hors de ce mode, le chapitre s'ouvre dans celui du roast.
  const readingMode = roast.mode === mode ? mode : roast.mode;
  return (
    <View style={{ gap: theme.spacing.s12 }}>
      <Button label={t('share.share')} icon="icon-ui-share" onPress={() => router.push('/share/roast')} />
      <Text variant="title2" accessibilityRole="header">{t('reading.sectionsTitle')}</Text>
      {SECTION_KEYS.map((key, index) => (
        <Pressable key={key} accessibilityRole="button" accessibilityLabel={`${t('reading.open')} ${t(`reading.section.${key}`)}`}
          onPress={() => { feedback.tap(); router.push(`/reading/${key}?mode=${readingMode}`); }}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="label" color="accent">{houseToRoman((index + 1) as House)}</Text>
              {premium ? null : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s4 }}>
                  <Icon id="icon-ui-lock" size={theme.spacing.s12} color="textSecondary" />
                  <Text variant="caption" color="textSecondary">{t('reading.premiumBadge')}</Text>
                </View>
              )}
            </View>
            <Text variant="title2">{t(`reading.section.${key}`)}</Text>
            <Text variant="quote" color="textSecondary">{roast.hooks[key]}</Text>
          </Card>
        </Pressable>
      ))}
    </View>
  );
}
