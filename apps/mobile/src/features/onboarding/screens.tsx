// Les cinq écrans de l'onboarding (SPEC §7.1). Les règles de saisie vivent dans draft.ts.
import { ASTRO_LEVELS, GRAMMATICAL_GENDERS, INTERESTS, TIME_WINDOWS, TONE_MODES } from '@aurorya/shared';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';
import { Banner, Card, Chip, Text, TextField } from '@/components/ui';
import { type PlaceResult, endpoints, getBackend } from '@/services/backend';
import { useOnboarding } from '@/store/onboarding';
import { useTheme } from '@/theme/ThemeProvider';
import { OnboardingScaffold } from './OnboardingScaffold';
import { earliestBirthDate, isFirstNameWellFormed, isOldEnough, isStepComplete, latestBirthDate, toIsoDate } from './draft';

const MIN_AGE = 16; // valeur de repli ; le serveur applique `policy.min_age` et reste seul juge.
const parseIso = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
};
const Row = ({ children }: { children: React.ReactNode }) => {
  const theme = useTheme();
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.s8 }}>{children}</View>;
};

export function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { draft, update } = useOnboarding();
  const [touched, setTouched] = useState(false);
  const invalid = touched && draft.firstName.trim().length > 0 && !isFirstNameWellFormed(draft.firstName);
  return (
    <OnboardingScaffold step="welcome" title={t('onboarding.welcome.title')} subtitle={t('onboarding.welcome.subtitle')}
      canContinue={isStepComplete('welcome', draft)} onContinue={() => router.push('/birth-date')}>
      <TextField label={t('onboarding.welcome.firstName')} value={draft.firstName} onChangeText={(firstName) => update({ firstName })} onBlur={() => setTouched(true)}
        autoCapitalize="words" autoCorrect={false} maxLength={24} textContentType="givenName" error={invalid ? t('onboarding.welcome.firstNameError') : null} />
      <Text variant="label" color="textSecondary">{t('onboarding.welcome.grammarLabel')}</Text>
      <Row>
        {GRAMMATICAL_GENDERS.map((g) => <Chip key={g} label={t(`onboarding.welcome.grammar.${g}`)} selected={draft.grammaticalGender === g} onPress={() => update({ grammaticalGender: g })} />)}
      </Row>
      <Text variant="bodySmall" color="textSecondary">{t('persona.disclosure', { name: t('persona.name') })}</Text>
    </OnboardingScaffold>
  );
}

export function BirthDateScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const { draft, update } = useOnboarding();
  const today = new Date();
  const value = draft.birthDate ? parseIso(draft.birthDate) : parseIso('1995-01-01');
  const tooYoung = draft.birthDate !== null && !isOldEnough(draft.birthDate, today, MIN_AGE);
  return (
    <OnboardingScaffold step="birth-date" title={t('onboarding.birthDate.title', { name: draft.firstName.trim() })}
      canContinue={isStepComplete('birth-date', draft) && !tooYoung} onContinue={() => router.push('/birth-time')}>
      <DateTimePicker mode="date" display="spinner" value={value} themeVariant="dark" textColor={theme.colors.text}
        minimumDate={parseIso(earliestBirthDate())} maximumDate={today}
        onChange={(_event, date) => { if (date) update({ birthDate: toIsoDate(date) }); }} />
      {tooYoung ? <Banner message={t('onboarding.ageGate.body', { age: MIN_AGE, limit: latestBirthDate(today, MIN_AGE) })} /> : null}
    </OnboardingScaffold>
  );
}

export function BirthTimeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const { draft, update } = useOnboarding();
  const time = draft.birthTime ?? '12:00';
  const [h, m] = time.split(':').map(Number) as [number, number];
  return (
    <OnboardingScaffold step="birth-time" title={t('onboarding.birthTime.title')} subtitle={t('onboarding.birthTime.subtitle')}
      canContinue={isStepComplete('birth-time', draft)} onContinue={() => router.push('/birth-place')}>
      <Row>
        <Chip label={t('onboarding.birthTime.exact')} selected={draft.timePrecision === 'exact'} onPress={() => update({ timePrecision: 'exact', birthTime: draft.birthTime ?? '12:00', timeWindow: null })} />
        <Chip label={t('onboarding.birthTime.approx')} selected={draft.timePrecision === 'approx'} onPress={() => update({ timePrecision: 'approx', birthTime: null })} />
        <Chip label={t('onboarding.birthTime.unknown')} selected={draft.timePrecision === 'unknown'} onPress={() => update({ timePrecision: 'unknown', birthTime: null, timeWindow: null })} />
      </Row>
      {draft.timePrecision === 'exact' ? (
        <DateTimePicker mode="time" display="spinner" is24Hour value={new Date(2000, 0, 1, h, m)} themeVariant="dark" textColor={theme.colors.text}
          onChange={(_event, date) => { if (date) update({ birthTime: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` }); }} />
      ) : null}
      {draft.timePrecision === 'approx' ? (
        <Row>
          {TIME_WINDOWS.map((w) => <Chip key={w} label={t(`onboarding.birthTime.window.${w}`)} selected={draft.timeWindow === w} onPress={() => update({ timeWindow: w })} />)}
        </Row>
      ) : null}
      <Card><Text variant="bodySmall" color="textSecondary">{t('onboarding.birthTime.help')}</Text></Card>
    </OnboardingScaffold>
  );
}

export function BirthPlaceScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const { draft, update } = useOnboarding();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');

  // Autocomplétion dès deux caractères, après 250 ms sans frappe (SPEC §7.1).
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) { setResults([]); setState('idle'); return undefined; }
    const backend = getBackend();
    if (!backend) { setState('error'); return undefined; }
    let cancelled = false;
    setState('loading');
    const timer = setTimeout(() => {
      endpoints(backend).searchPlaces(trimmed, i18n.language === 'en' ? 'en' : 'fr')
        .then((found) => { if (!cancelled) { setResults(found); setState('idle'); } })
        .catch(() => { if (!cancelled) setState('error'); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, i18n.language]);

  const label = (p: { name: string; admin1Name: string | null; countryCode: string }): string => [p.name, p.admin1Name, p.countryCode].filter(Boolean).join(', ');
  return (
    <OnboardingScaffold step="birth-place" title={t('onboarding.birthPlace.title')} canContinue={isStepComplete('birth-place', draft)} onContinue={() => router.push('/quiz')}>
      <TextField label={t('onboarding.birthPlace.search')} value={query} onChangeText={setQuery} autoCorrect={false} autoCapitalize="words" />
      {state === 'loading' ? <ActivityIndicator color={theme.colors.accent} accessibilityLabel={t('common.loading')} /> : null}
      {state === 'error' ? <Banner message={t('onboarding.birthPlace.state.error')} /> : null}
      {state === 'idle' && query.trim().length >= 2 && results.length === 0 ? <Text color="textSecondary">{t('onboarding.birthPlace.state.empty')}</Text> : null}
      <View style={{ gap: theme.spacing.s8 }}>
        {results.map((p) => <Chip key={p.geonameId} label={label(p)} selected={draft.place?.geonameId === p.geonameId} onPress={() => update({ place: p })} />)}
      </View>
      {draft.place ? <Card><Text>{t('onboarding.birthPlace.confirm', { place: label(draft.place) })}</Text></Card> : null}
      <Text variant="bodySmall" color="textSecondary">{t('onboarding.birthPlace.help')}</Text>
    </OnboardingScaffold>
  );
}

export function QuizScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const { draft, update } = useOnboarding();
  const toggle = (interest: (typeof INTERESTS)[number]): void =>
    update({ interests: draft.interests.includes(interest) ? draft.interests.filter((i) => i !== interest) : [...draft.interests, interest] });
  return (
    <OnboardingScaffold step="quiz" title={t('onboarding.quiz.title')} canContinue onContinue={() => router.push('/computing')} continueLabel={t('onboarding.quiz.submit')}>
      <Text variant="heading">{t('onboarding.quiz.interests.question')}</Text>
      <Row>{INTERESTS.map((i) => <Chip key={i} label={t(`onboarding.quiz.interests.${i}`)} selected={draft.interests.includes(i)} onPress={() => toggle(i)} />)}</Row>
      <Text variant="heading">{t('onboarding.quiz.level.question')}</Text>
      <Row>{ASTRO_LEVELS.map((l) => <Chip key={l} label={t(`onboarding.quiz.level.${l}`)} selected={draft.astroLevel === l} onPress={() => update({ astroLevel: l })} />)}</Row>
      <Text variant="heading">{t('onboarding.quiz.tone.question')}</Text>
      <View style={{ gap: theme.spacing.s8 }}>
        {TONE_MODES.map((mode) => (
          <View key={mode} style={{ gap: theme.spacing.s4 }}>
            <Chip label={t(`modes.${mode}.name`)} selected={draft.toneMode === mode} onPress={() => update({ toneMode: mode })} />
            <Text variant="bodySmall" color="textSecondary">{t(`modes.${mode}.description`)}</Text>
          </View>
        ))}
      </View>
    </OnboardingScaffold>
  );
}
