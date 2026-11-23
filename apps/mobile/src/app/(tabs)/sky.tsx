import { useTranslation } from 'react-i18next';
import { EmptyState, Screen, Text } from '@/components/ui';

export default function SkyScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <Text variant="title1" accessibilityRole="header">{t('sky.title')}</Text>
      <EmptyState title={t('sky.state.empty.title')} body={t('sky.state.empty.body')} />
    </Screen>
  );
}
