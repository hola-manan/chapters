import React from 'react';
import { StyleSheet, View } from 'react-native';
import { radius as radiusTokens, space } from '../../design';
import {
  HStack,
  ProgressBar,
  Spinner,
  Surface,
  Text,
  TextLink,
  useTheme,
  VStack,
} from '../../ui';
import { COVER_ASPECT_RATIO } from './GeneratedCover';

export type ImportProgressCardProps = {
  status: 'importing' | 'error';
  fileName: string;
  stage?: string;
  pct?: number;
  errorMessage?: string;
  onDismiss?: () => void;
  testID?: string;
};

export function ImportProgressCard({
  status,
  fileName,
  stage = 'reading',
  pct = 0,
  errorMessage,
  onDismiss,
  testID,
}: ImportProgressCardProps) {
  const theme = useTheme();

  const renderIndicator = () => {
    if (stage === 'detecting') {
      return (
        <HStack justify="between" align="center">
          <Text variant="footnote" tone="secondary">
            Finding chapters…
          </Text>
          <Spinner size="sm" />
        </HStack>
      );
    }

    const stageWords = stage === 'parsing' ? 'Extracting text…' : 'Reading file…';
    const progressVal = Math.min(1, Math.max(0, pct / 100));

    return (
      <VStack gap="xs">
        <Text variant="footnote" tone="secondary">
          {stageWords}
        </Text>
        <ProgressBar value={progressVal} />
      </VStack>
    );
  };

  return (
    <Surface elevation={1} border radius="lg" testID={testID}>
      <VStack gap="none">
        {/* Placeholder cover maintaining 16:9 aspect ratio */}
        <View
          style={[
            styles.coverPlaceholder,
            {
              backgroundColor: theme.surface.sunken,
            },
          ]}
        />

        {/* Text and interaction container */}
        <View style={styles.textContainer}>
          {status === 'importing' ? (
            <VStack gap="sm">
              <Text variant="title3" weight="semibold" numberOfLines={2}>
                {fileName}
              </Text>
              {renderIndicator()}
            </VStack>
          ) : (
            <VStack gap="xs">
              <Text variant="title3" weight="semibold" numberOfLines={2}>
                {fileName}
              </Text>
              {errorMessage ? (
                <Text variant="footnote" tone="secondary">
                  {errorMessage}
                </Text>
              ) : null}
              {onDismiss ? (
                <View style={styles.dismissRow}>
                  <TextLink onPress={onDismiss}>Dismiss</TextLink>
                </View>
              ) : null}
            </VStack>
          )}
        </View>
      </VStack>
    </Surface>
  );
}

const styles = StyleSheet.create({
  coverPlaceholder: {
    width: '100%',
    aspectRatio: COVER_ASPECT_RATIO,
    // Surface paints a radius but does not clip, and this card is deliberately not pressable,
    // so nothing above it clips either — BookCard only gets away with it because PressableCard
    // does the clipping. The placeholder rounds its own top corners to match the card.
    borderTopLeftRadius: radiusTokens.lg,
    borderTopRightRadius: radiusTokens.lg,
  },
  textContainer: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.lg,
  },
  dismissRow: {
    marginTop: space.xs,
  },
});
