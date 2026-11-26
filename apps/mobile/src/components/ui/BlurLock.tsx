// Verrou des contenus Premium (SPEC §7.4, D-014) : faux texte flouté, fondu vers le fond, et une pilule
// flottante qui invite à débloquer. Le vrai texte n'est jamais sur l'appareil sans le droit.
import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { BlurredFiller } from './BlurredFiller';
import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

export type BlurLockProps = { message: string; actionLabel: string; onPress: () => void; icon?: 'icon-ui-sparkle' | 'icon-ui-lock' };

export function BlurLock({ message, actionLabel, onPress, icon = 'icon-ui-sparkle' }: BlurLockProps) {
  const theme = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  return (
    <View style={{ gap: theme.spacing.s16 }}>
      <View onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
        <BlurredFiller />
        {size.height > 0 ? (
          <Canvas pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
            <Rect x={0} y={0} width={size.width} height={size.height}>
              <LinearGradient start={vec(0, size.height / 3)} end={vec(0, size.height)} colors={['transparent', theme.colors.bg]} />
            </Rect>
          </Canvas>
        ) : null}
      </View>
      <View
        style={[styles.pill, { gap: theme.spacing.s12, padding: theme.spacing.s20, borderRadius: theme.radii.xl, borderWidth: theme.borderWidth, borderColor: theme.colors.accentMuted, backgroundColor: theme.colors.surfaceRaised }]}>
        <Icon id={icon} color="accent" size={theme.spacing.s24} />
        <Text align="center" color="textSecondary">{message}</Text>
        <View style={styles.action}><Button label={actionLabel} icon={icon} onPress={onPress} /></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({ pill: { alignItems: 'center' }, action: { alignSelf: 'stretch' } });
