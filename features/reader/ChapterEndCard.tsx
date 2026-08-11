import React from 'react';
import { StyleSheet, View } from 'react-native';
import { space } from '../../design';
import { Divider, PressableCard, Surface, Text, TextLink, VStack } from '../../ui';
import { readMinutes } from '../readingTime';

export type ChapterEndCardProps = {
  nextTitle?: string; // already through displayTitle(); absent on the last chapter
  nextWordCount?: number;
  bookTitle: string;
  onNext?: () => void;
  onBackToContents: () => void;
  testID?: string;
};

export function ChapterEndCard({
  nextTitle,
  nextWordCount,
  bookTitle,
  onNext,
  onBackToContents,
  testID,
}: ChapterEndCardProps) {
  const hasNext = Boolean(nextTitle && onNext);

  return (
    <View style={styles.container} testID={testID}>
      <Divider />
      <View style={styles.content}>
        <VStack gap="xl">
          {hasNext ? (
            <PressableCard radius="lg" onPress={onNext}>
              <Surface elevation={1} border radius="lg" paddingX="lg" paddingY="lg">
                <VStack gap="xs">
                  <Text variant="caption" weight="semibold" tone="secondary">
                    NEXT
                  </Text>
                  <Text variant="title3" weight="semibold" tone="primary">
                    {nextTitle}
                  </Text>
                  {nextWordCount !== undefined && (
                    <Text variant="footnote" tone="secondary">
                      {readMinutes(nextWordCount)} min read
                    </Text>
                  )}
                </VStack>
              </Surface>
            </PressableCard>
          ) : (
            <Text variant="footnote" tone="secondary" align="center">
              End of {bookTitle}
            </Text>
          )}

          <View style={styles.linkContainer}>
            <TextLink onPress={onBackToContents} variant="footnote">
              Back to Contents
            </TextLink>
          </View>
        </VStack>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: space.xxxl,
  },
  content: {
    paddingTop: space.xxl,
  },
  linkContainer: {
    alignItems: 'center',
  },
});
