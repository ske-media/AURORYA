// Paywall (SPEC §7.8). Tant que les achats ne sont pas branchés (T-060), l'écran le dit : aucun prix, aucune
// offre, aucun bouton d'achat n'est simulé (loi « pas d'écran qui simule »).
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { BrandMark, Button, Icon, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

export function PaywallScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  return (
    <Screen>
      <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => router.back()}
        style={{ alignSelf: 'flex-end', width: theme.minTouchTarget, height: theme.minTouchTarget, alignItems: 'center', justifyContent: 'center' }}>
        <Icon id="icon-ui-close" color="textSecondary" size={theme.spacing.s24} />
      </Pressable>
      <View style={{ alignItems: 'center', gap: theme.spacing.s16 }}>
        <BrandMark size={theme.spacing.s56} />
        <Text variant="title1" align="center" accessibilityRole="header">{t('paywall.soon.title')}</Text>
        <Text align="center" color="textSecondary">{t('paywall.soon.body')}</Text>
      </View>
      <Button label={t('common.close')} onPress={() => router.back()} />
    </Screen>
  );
}
