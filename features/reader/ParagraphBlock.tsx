import React from 'react';
import { View } from 'react-native';
import { space } from '../../design';
import { ReadingText } from '../../ui';

export type ParagraphBlockProps = {
  text: string;
  testID?: string;
};

export function ParagraphBlock({ text, testID }: ParagraphBlockProps) {
  return (
    <View style={{ marginBottom: space.paragraphGap }} testID={testID}>
      <ReadingText>{text}</ReadingText>
    </View>
  );
}
