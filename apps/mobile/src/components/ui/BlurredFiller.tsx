// Zone floutée de la lecture complète (SPEC §7.4, D-014) : la chaîne fixe `ui.blurFiller`, seul faux texte admis,
// rendue par Skia sous un flou. Le vrai texte n'est jamais sur l'appareil sans le droit Premium.
import { textStyles } from '@aurorya/shared';
import { Blur, Canvas, Group, Paint, Paragraph, Skia } from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

const FILLER_REPEATS = 2;
const BLUR_SIGMA = 5;

export function BlurredFiller() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const paragraph = useMemo(() => {
    if (width === 0) return null;
    const { fontSize, lineHeight } = textStyles.body;
    const built = Skia.ParagraphBuilder.Make({})
      .pushStyle({ color: Skia.Color(theme.colors.textSecondary), fontSize, heightMultiplier: lineHeight / fontSize })
      .addText(Array.from({ length: FILLER_REPEATS }, () => t('ui.blurFiller')).join(' '))
      .build();
    built.layout(width);
    return built;
  }, [width, theme, t]);

  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {paragraph ? (
        <Canvas style={{ width, height: paragraph.getHeight() }}>
          <Group layer={<Paint><Blur blur={BLUR_SIGMA} /></Paint>}>
            <Paragraph paragraph={paragraph} x={0} y={0} width={width} />
          </Group>
        </Canvas>
      ) : null}
    </View>
  );
}
