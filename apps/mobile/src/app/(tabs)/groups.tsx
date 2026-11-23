import { useTranslation } from 'react-i18next';
import { EmptyState, Screen, Text } from '@/components/ui';

export default function GroupsScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <Text variant="title1" accessibilityRole="header">{t('groups.title')}</Text>
      <EmptyState title={t('groups.state.empty.title')} body={t('groups.state.empty.body')} />
    </Screen>
  );
}
