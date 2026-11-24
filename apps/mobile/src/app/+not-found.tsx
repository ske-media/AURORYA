import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState, Screen } from '@/components/ui';

export default function NotFound() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Screen scroll={false}>
      <EmptyState title={t('notFound.title')} body="" action={{ label: t('notFound.action'), onPress: () => router.replace('/today') }} />
    </Screen>
  );
}
