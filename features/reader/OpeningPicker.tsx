// TEMPORARY. Delete once the opening treatment is chosen — see docs/components.md #25.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { radius, space } from '../../design';
import { PressableCard, Text, useTheme } from '../../ui';
import type { OpeningTreatment } from './ChapterOpening';

export type OpeningPickerProps = {
  treatment: OpeningTreatment;
  onChangeTreatment: (treatment: OpeningTreatment) => void;
  testID?: string;
};

const TREATMENTS: OpeningTreatment[] = ['eyebrow', 'plain', 'initial', 'smallcaps'];

export function OpeningPicker({ treatment, onChangeTreatment, testID }: OpeningPickerProps) {
  const theme = useTheme();

  return (
    <View style={styles.container} testID={testID}>
      {TREATMENTS.map((t) => {
        const isSelected = treatment === t;
        return (
          <PressableCard
            key={t}
            radius="pill"
            onPress={() => onChangeTreatment(t)}
          >
            <View
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? theme.accent.base : theme.surface.sunken,
                },
              ]}
            >
              <Text
                variant="footnote"
                tone={isSelected ? 'onAccent' : 'primary'}
                weight="medium"
              >
                {t}
              </Text>
            </View>
          </PressableCard>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    marginBottom: space.lg,
  },
  chip: {
    paddingHorizontal: space[16],
    paddingVertical: space[8],
    borderRadius: radius.pill,
  },
});
