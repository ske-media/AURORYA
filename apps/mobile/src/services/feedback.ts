// Retour sensoriel unifié (SPEC §15.9) : vibrations et sons courts, soumis aux préférences.
// Les sons se mêlent à l'audio en cours sans le couper et respectent le mode silencieux d'iOS.
// Aucun appel ne peut faire échouer un geste : toute erreur du matériel est ignorée.
import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { type AssetId, getAsset } from '@/assets/registry';
import { usePreferences } from '@/store/preferences';

export type SoundId = Extract<AssetId, 'sfx-tap-soft' | 'sfx-reveal' | 'sfx-share' | 'sfx-join' | 'sfx-aurora-rise'>;

const players = new Map<SoundId, AudioPlayer>();
let audioModeReady: Promise<void> | null = null;

const haptic = (run: () => Promise<void>): void => {
  if (!usePreferences.getState().hapticsEnabled) return;
  run().catch(() => undefined);
};

async function play(id: SoundId): Promise<void> {
  audioModeReady ??= setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false });
  await audioModeReady;
  let player = players.get(id);
  if (!player) {
    player = createAudioPlayer(getAsset(id));
    players.set(id, player);
  }
  await player.seekTo(0);
  player.play();
}

export const feedback = {
  tap: (): void => haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  select: (): void => haptic(() => Haptics.selectionAsync()),
  reveal: (): void => haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: (): void => haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: (): void => haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  sound: (id: SoundId): void => {
    if (!usePreferences.getState().soundsEnabled) return;
    play(id).catch(() => undefined);
  },
};
