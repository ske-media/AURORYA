import { useTranslation } from 'react-i18next';
import { EmptyState, Screen, Text } from '@/components/ui';

export default function TodayScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <Text variant="title1" accessibilityRole="header">{t('today.title')}</Text>
      <EmptyState title={t('today.state.empty.title')} body={t('today.state.empty.body')} />
    </Screen>
  );
}
