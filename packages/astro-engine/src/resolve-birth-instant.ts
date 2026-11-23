// De l'heure civile de naissance à l'instant UTC (SPEC §11.4). La base de fuseaux est celle,
// embarquée et figée, de @js-joda/timezone : jamais celle du système.
import { type BirthInput, BirthInputSchema, type Result, type TimeWindow, err, ok } from '@aurorya/shared';
import { LocalDate, LocalDateTime, LocalTime, ZoneId, ZoneOffset, ZonedDateTime } from '@js-joda/core';
import '@js-joda/timezone';

/** Version de la base IANA embarquée par la version verrouillée de @js-joda/timezone (vérifiée par un test). */
export const TZDATA_VERSION = '2026f';
export const MIN_BIRTH_DATE = '1900-01-01';

export type BirthInputError = Readonly<{
  code: 'INVALID_INPUT' | 'BIRTH_DATE_OUT_OF_RANGE' | 'UNKNOWN_TIMEZONE' | 'BIRTH_TIME_NONEXISTENT';
  detail?: string;
}>;

export type ResolvedInstant = Readonly<{
  /** Instant retenu pour les positions affichées (milieu de la plage si l'heure n'est pas exacte). */
  utc: string;
  utcOffsetMinutes: number;
  /** Heure répétée au retour à l'heure d'hiver, résolue par défaut sur la première occurrence. */
  dstAmbiguous: boolean;
  /** Vrai si l'heure est inconnue : le milieu de journée n'est jamais présenté comme l'heure de naissance. */
  timeAssumed: boolean;
  /** Bornes UTC de la plage quand l'heure n'est pas exacte. */
  window: Readonly<{ startUtc: string; endUtc: string }> | null;
}>;

const WINDOW_HOURS: Readonly<Record<TimeWindow, readonly [number, number]>> = {
  night: [0, 6], morning: [6, 12], afternoon: [12, 18], evening: [18, 24],
};

const iso = (z: ZonedDateTime): string => z.withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime().withNano(0).toString().padEnd(19, ':00') + 'Z';

export function resolveBirthInstant(rawInput: BirthInput): Result<ResolvedInstant, BirthInputError> {
  const parsed = BirthInputSchema.safeParse(rawInput);
  if (!parsed.success) return err({ code: 'INVALID_INPUT', detail: parsed.error.issues.map((i) => i.path.join('.')).join(', ') });
  const input = parsed.data;

  let date: LocalDate;
  try {
    date = LocalDate.parse(input.date);
  } catch {
    return err({ code: 'INVALID_INPUT', detail: 'date' });
  }
  if (date.isBefore(LocalDate.parse(MIN_BIRTH_DATE))) return err({ code: 'BIRTH_DATE_OUT_OF_RANGE' });

  let zone: ZoneId;
  try {
    zone = ZoneId.of(input.tzIana);
    zone.rules();
  } catch {
    return err({ code: 'UNKNOWN_TIMEZONE', detail: input.tzIana });
  }

  if (input.timePrecision === 'exact' && input.time !== null) {
    const local = LocalDateTime.of(date, LocalTime.parse(input.time));
    const offsets = zone.rules().validOffsets(local);
    if (offsets.length === 0) return err({ code: 'BIRTH_TIME_NONEXISTENT' });
    const ambiguous = offsets.length > 1;
    const offset = (ambiguous && input.dstChoice === 'second' ? offsets[1] : offsets[0]) ?? ZoneOffset.UTC;
    const zoned = ZonedDateTime.ofStrict(local, offset, zone);
    return ok({
      utc: iso(zoned),
      utcOffsetMinutes: Math.round(offset.totalSeconds() / 60),
      dstAmbiguous: ambiguous && input.dstChoice === null,
      timeAssumed: false,
      window: null,
    });
  }

  // Heure approximative ou inconnue : bornes de la plage et milieu. Une borne tombant dans un saut
  // d'heure est décalée vers l'avant par la bibliothèque.
  const [startHour, endHour] = input.timeWindow ? WINDOW_HOURS[input.timeWindow] : ([0, 24] as const);
  const at = (hour: number): ZonedDateTime =>
    hour === 24
      ? ZonedDateTime.of(LocalDateTime.of(date, LocalTime.of(23, 59, 59)), zone)
      : ZonedDateTime.of(LocalDateTime.of(date, LocalTime.of(hour, 0)), zone);
  const middle = at((startHour + endHour) / 2);
  return ok({
    utc: iso(middle),
    utcOffsetMinutes: Math.round(middle.offset().totalSeconds() / 60),
    dstAmbiguous: false,
    timeAssumed: input.timePrecision === 'unknown',
    window: { startUtc: iso(at(startHour)), endUtc: iso(at(endHour)) },
  });
}
