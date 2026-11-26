// La carte du roast, 360 × 640 points (SPEC §16.7). Ce que l'on voit est ce que l'on partage : la capture
// est celle de cette vue. Couleurs du thème sombre quel que soit le thème de l'app, positions du gabarit partagé.
import { CARD, CARD_VIEW, type ToneMode, darkColors, fontFamilies, opacities } from '@aurorya/shared';
import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { type ComponentRef, type Ref, useMemo, useRef } from 'react';
import { Image, ImageBackground, StyleSheet, Text as NativeText, View } from 'react-native';
import { type AssetId, type GlyphId, getAsset, getGlyphPath, isProvisional } from '@/assets/registry';
import { AuroraRise } from '@/components/astro/AuroraRise';
import { type RoastCardModel, cardPt } from './card-model';

const BACKGROUNDS: Readonly<Record<ToneMode, AssetId>> = { soft: 'card-bg-roast-soft', cash: 'card-bg-roast-cash', expert: 'card-bg-roast-expert' };
const MODE_GLYPHS: Readonly<Record<ToneMode, GlyphId>> = { soft: 'glyph-mode-soft', cash: 'glyph-mode-cash', expert: 'glyph-mode-expert' };
const GLYPH_BOX = 24;
// Filets de la carte : traits fins, en points de la vue (le gabarit ne fixe que les positions).
const HAIRLINE = 1;
const PUNCH_RULE = 1.5;
const BIG_THREE_RULE_GAP = cardPt(CARD.bigThree.fontSize) * 0.6;
const PUNCH_GAP = cardPt(CARD.blocks.labelFontSize);
const PUNCH_INSET = cardPt(CARD.blocks.labelFontSize) * 0.8;
export type CardViewRef = ComponentRef<typeof View>;
const colors = darkColors;
const symbolSize = cardPt(CARD.symbol.size);
const badgeGlyphSize = cardPt(CARD.signature.hostFontSize);
const blockTop = (index: number): number => cardPt(CARD.blocks.starts[index] ?? CARD.blocks.starts[0]);
const blockHeight = cardPt(CARD.blocks.starts[1] - CARD.blocks.starts[0]);

export function RoastCard({ model, onReady, ref }: { model: RoastCardModel; onReady: () => void; ref?: Ref<CardViewRef> }) {
  // La carte n'est capturable qu'une fois le fond chargé et le symbole entièrement tracé.
  const parts = useRef({ background: false, symbol: false });
  const mark = (part: 'background' | 'symbol') => (): void => {
    parts.current[part] = true;
    if (parts.current.background && parts.current.symbol) onReady();
  };
  const glyph = useMemo(() => Skia.Path.MakeFromSVGString(getGlyphPath(MODE_GLYPHS[model.mode])), [model.mode]);
  const centered = { position: 'absolute', left: cardPt(CARD.sideMargin), right: cardPt(CARD.sideMargin), textAlign: 'center' } as const;
  return (
    // `collapsable={false}` : la vue doit exister côté natif pour être capturée.
    <View ref={ref} collapsable={false} style={{ width: CARD_VIEW.width, height: CARD_VIEW.height, backgroundColor: colors.bg, overflow: 'hidden' }}>
      <ImageBackground source={getAsset(BACKGROUNDS[model.mode])} onLoad={mark('background')} onError={mark('background')} style={{ flex: 1 }}>
        {/* Grain photographique, seulement quand le fichier définitif est livré. Pas de halo derrière le symbole : Annexe C.4. */}
        {isProvisional('texture-grain') ? null : <Image source={getAsset('texture-grain')} resizeMode="repeat" style={[StyleSheet.absoluteFill, { opacity: opacities.grainCard }]} />}
        <View style={{ position: 'absolute', left: cardPt(CARD.centerX) - symbolSize / 2, top: cardPt(CARD.symbol.y) - symbolSize / 2 }}>
          <AuroraRise stage={4} size={symbolSize} on="dark" onFinished={mark('symbol')} />
        </View>
        <NativeText allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit
          style={{ ...centered, top: cardPt(CARD.title.y), fontFamily: fontFamilies.serif, fontSize: cardPt(CARD.title.fontSize), color: colors.text }}>
          {model.title}
        </NativeText>
        {/* Le trio, flanqué de deux filets d'accent atténué. */}
        <View style={{ position: 'absolute', top: cardPt(CARD.bigThree.y), left: cardPt(CARD.sideMargin), right: cardPt(CARD.sideMargin), flexDirection: 'row', alignItems: 'center', gap: BIG_THREE_RULE_GAP }}>
          <View style={{ flex: 1, height: HAIRLINE, backgroundColor: colors.accentMuted }} />
          <NativeText allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit
            style={{ flexShrink: 1, fontFamily: fontFamilies.bodyMedium, fontSize: cardPt(CARD.bigThree.fontSize), color: colors.accent }}>
            {model.bigThree}
          </NativeText>
          <View style={{ flex: 1, height: HAIRLINE, backgroundColor: colors.accentMuted }} />
        </View>
        {model.blocks.map((block, index) => (
          <View key={block.label + String(index)} style={{ position: 'absolute', left: cardPt(CARD.sideMargin), right: cardPt(CARD.sideMargin), top: blockTop(index), height: blockHeight - PUNCH_GAP, borderLeftWidth: PUNCH_RULE, borderLeftColor: colors.accentMuted, paddingLeft: PUNCH_INSET }}>
            <NativeText allowFontScaling={false} numberOfLines={1}
              style={{ fontFamily: fontFamilies.bodyMedium, fontSize: cardPt(CARD.blocks.labelFontSize), color: colors.accent }}>
              {block.label}
            </NativeText>
            {/* Trois lignes au plus ; au-delà, la taille descend jusqu'au minimum du gabarit. */}
            <NativeText allowFontScaling={false} numberOfLines={CARD.blocks.maxLines} adjustsFontSizeToFit
              minimumFontScale={CARD.punchlineShrink.minFontSize / CARD.blocks.punchlineFontSize}
              style={{ fontFamily: fontFamilies.serif, fontSize: cardPt(CARD.blocks.punchlineFontSize), lineHeight: cardPt(CARD.blocks.punchlineLineHeight), color: colors.text }}>
              {block.text}
            </NativeText>
          </View>
        ))}
        <View style={{ position: 'absolute', top: cardPt(CARD.rule.y), left: cardPt(CARD.centerX - CARD.rule.width / 2), width: cardPt(CARD.rule.width), height: 1, backgroundColor: colors.accent }} />
        <View style={{ position: 'absolute', top: cardPt(CARD.modeBadge.y), left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: cardPt(CARD.blocks.labelFontSize) / 2 }}>
          <Canvas style={{ width: badgeGlyphSize, height: badgeGlyphSize }}>
            {glyph ? <Group transform={[{ scale: badgeGlyphSize / GLYPH_BOX }]}><Path path={glyph} color={colors.accent} style="stroke" strokeWidth={1.5} strokeCap="round" strokeJoin="round" /></Group> : null}
          </Canvas>
          <NativeText allowFontScaling={false} style={{ fontFamily: fontFamilies.bodyMedium, fontSize: cardPt(CARD.blocks.labelFontSize), color: colors.accent }}>{model.modeName}</NativeText>
        </View>
        <View style={{ position: 'absolute', top: cardPt(CARD.signature.y), left: 0, right: 0, alignItems: 'center' }}>
          <NativeText allowFontScaling={false} style={{ fontFamily: fontFamilies.heading, fontSize: cardPt(CARD.signature.ctaFontSize), color: colors.text }}>{model.cta}</NativeText>
          {model.host ? <NativeText allowFontScaling={false} style={{ fontFamily: fontFamilies.bodyMedium, fontSize: cardPt(CARD.signature.hostFontSize), color: colors.textSecondary }}>{model.host}</NativeText> : null}
        </View>
      </ImageBackground>
    </View>
  );
}
