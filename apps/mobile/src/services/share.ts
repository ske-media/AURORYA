// Capture et partage des cartes (SPEC §15.8) : la vue affichée devient un PNG de 1080 × 1920 dans le cache,
// supprimé après usage. Capture par Skia (ADR-023) : aucune dépendance native de plus.
import { CARD } from '@aurorya/shared';
import { ImageFormat, Skia, makeImageFromView } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import type { Component, ComponentRef, RefObject } from 'react';
import type { View } from 'react-native';

export class CaptureError extends Error {}

/** Capture la vue de carte, ramenée à la taille du gabarit quelle que soit la densité de l'écran. */
export async function captureCard(ref: RefObject<ComponentRef<typeof View> | null>): Promise<File> {
  // Les types de Skia décrivent encore une référence de composant de classe ; la vue native convient à l'exécution.
  const snapshot = await makeImageFromView(ref as unknown as RefObject<Component<unknown, unknown> | null>);
  const surface = Skia.Surface.MakeOffscreen(CARD.width, CARD.height);
  if (!snapshot || !surface) throw new CaptureError('capture impossible');
  surface.getCanvas().drawImageRect(snapshot, Skia.XYWHRect(0, 0, snapshot.width(), snapshot.height()), Skia.XYWHRect(0, 0, CARD.width, CARD.height), Skia.Paint());
  surface.flush();
  const file = new File(Paths.cache, `aurorya-card-${Date.now()}.png`);
  file.write(surface.makeImageSnapshot().encodeToBase64(ImageFormat.PNG), { encoding: 'base64' });
  return file;
}

const discard = (file: File): void => {
  try {
    file.delete();
  } catch {
    // Le cache est purgé par le système : un fichier déjà absent n'est pas une erreur.
  }
};

/** Ouvre la feuille de partage d'iOS avec l'image, puis supprime le fichier. */
export async function shareCard(file: File): Promise<void> {
  try {
    await Sharing.shareAsync(file.uri, { mimeType: 'image/png', UTI: 'public.png' });
  } finally {
    discard(file);
  }
}

/** Enregistre l'image dans la photothèque. L'autorisation d'ajout n'est demandée qu'ici. Faux si elle est refusée. */
export async function saveCard(file: File): Promise<boolean> {
  try {
    const permission = await requestPermissionsAsync(true);
    if (!permission.granted) return false;
    await Asset.create(file.uri);
    return true;
  } finally {
    discard(file);
  }
}
