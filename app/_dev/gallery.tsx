import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { radius, space } from '../../design/index.ts';
import type { Block } from '../../pdf/types.ts';
import { listBooks } from '../../storage/index.ts';
import { ReadingText, Text, ThemeProvider, useTheme } from '../../ui/index.ts';

const FALLBACK: string[] = [
  'Import a book and this chooser will use its actual text instead of this placeholder. Real sentences matter here: the texture of ink on paper only shows across a full paragraph, in the words you will actually be reading.',
  'A bold ink is not the same as a loud one. Deep navy, forest and espresso all read as black at a glance and only reveal their colour when you look for it, or when they sit next to true black.',
  'Judge the accent by how rarely you notice it, not by how much you like the colour. It is the only colour on the screen, so it will always draw the eye — the question is whether it draws it somewhere useful.',
];

const VARIANTS = ['title1', 'title2', 'title3', 'body', 'subhead', 'footnote', 'caption'] as const;
const WEIGHTS = ['regular', 'medium', 'semibold'] as const;

export default function Gallery() {
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('system');
  const override = themeMode === 'system' ? undefined : themeMode;

  return (
    <ThemeProvider themeOverride={override}>
      <GalleryContent themeMode={themeMode} setThemeMode={setThemeMode} />
    </ThemeProvider>
  );
}

function GalleryContent({
  themeMode,
  setThemeMode,
}: {
  themeMode: 'system' | 'light' | 'dark';
  setThemeMode: (mode: 'system' | 'light' | 'dark') => void;
}) {
  const theme = useTheme();
  const [paragraphs, setParagraphs] = useState<string[] | null>(null);
  const [sourceLabel, setSourceLabel] = useState('Placeholder text');

  useEffect(() => {
    (async () => {
      try {
        const books = await listBooks();
        const book = books.find((b) => b.status === 'ready' && b.chapters.length > 0);
        if (!book) return;
        const chapter =
          book.chapters.find((c) => c.blocks.some((bl: Block) => bl.type === 'paragraph')) ??
          book.chapters[0];
        const paras = chapter.blocks
          .filter((bl: Block): bl is Extract<Block, { type: 'paragraph' }> => bl.type === 'paragraph')
          .map((bl) => bl.text)
          .filter((t) => t.trim().length > 120)
          .slice(0, 6);
        if (paras.length) {
          setParagraphs(paras);
          setSourceLabel(chapter.title);
        }
      } catch {
        // fall through to placeholder
      }
    })();
  }, []);

  const bodyParagraphs = paragraphs ?? FALLBACK;

  return (
    <View style={[styles.root, { backgroundColor: theme.surface.page }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="caption" tone="tertiary" weight="semibold">
            COMPONENT GALLERY
          </Text>
          <Text variant="title1" weight="semibold">
            Typographic Specimen
          </Text>
        </View>

        {/* Section 1: Text Variants & Weights */}
        <Section title="UI Typography Variants & Weights" borderBottomColor={theme.border.subtle}>
          {VARIANTS.map((v) => (
            <View key={v} style={styles.variantGroup}>
              <Text variant="caption" tone="tertiary" weight="medium">
                {v.toUpperCase()}
              </Text>
              {WEIGHTS.map((w) => (
                <Text key={w} variant={v} weight={w}>
                  {v} · {w}
                </Text>
              ))}
            </View>
          ))}
        </Section>

        {/* Section 2: Color Tones */}
        <Section title="Color Tones" borderBottomColor={theme.border.subtle}>
          <View style={styles.group}>
            <Text tone="primary">Primary tone — high contrast text</Text>
            <Text tone="secondary">Secondary tone — supporting labels and metadata</Text>
            <Text tone="tertiary">Tertiary tone — disabled states or subtle captions</Text>
            <Text tone="accent" weight="semibold">
              Accent tone — interactive text and links
            </Text>
            <View style={[styles.onAccentContainer, { backgroundColor: theme.accent.base }]}>
              <Text tone="onAccent" weight="semibold">
                onAccent tone — readable text on accent surface
              </Text>
            </View>
          </View>
        </Section>

        {/* Section 3: Truncation & Flex */}
        <Section title="Row Truncation (flex & numberOfLines)" borderBottomColor={theme.border.subtle}>
          <View
            style={[
              styles.truncationCard,
              { backgroundColor: theme.surface.raised, borderColor: theme.border.subtle },
            ]}
          >
            <Text variant="body" weight="semibold" numberOfLines={1} flex>
              Chapter 12: The Extraordinary and Unabridged History of the Empire of the Setting Sun
            </Text>
            <Text variant="footnote" tone="secondary">
              14 pp
            </Text>
          </View>
        </Section>

        {/* Section 4: ReadingText */}
        <Section title={`Reading Scale (${sourceLabel})`} borderBottomColor={theme.border.subtle}>
          <View style={styles.group}>
            {bodyParagraphs.map((p, i) => (
              <View key={i} style={styles.paragraphWrapper}>
                <ReadingText tone="primary">{p}</ReadingText>
              </View>
            ))}
            <View style={styles.paragraphWrapper}>
              <ReadingText tone="secondary">
                Secondary tone reading text — subtle body copy or secondary passages.
              </ReadingText>
            </View>
          </View>
        </Section>
      </ScrollView>

      {/* Theme Selection Controls */}
      <View
        style={[
          styles.controls,
          { backgroundColor: theme.surface.raised, borderTopColor: theme.border.subtle },
        ]}
      >
        <Text variant="caption" tone="secondary" weight="semibold">
          THEME OVERRIDE
        </Text>
        <View style={styles.chipRow}>
          {(['system', 'light', 'dark'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setThemeMode(m)}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    themeMode === m ? theme.accent.base : theme.surface.sunken,
                },
              ]}
            >
              <Text
                variant="footnote"
                tone={themeMode === m ? 'onAccent' : 'primary'}
                weight="medium"
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

function Section({
  title,
  borderBottomColor,
  children,
}: {
  title: string;
  borderBottomColor: string;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.section, { borderBottomColor }]}>
      <Text variant="subhead" weight="semibold" tone="secondary">
        {title}
      </Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingHorizontal: space[24], paddingTop: space[48], paddingBottom: space[32] },
  header: { marginBottom: space[24], gap: space[4] },
  section: { marginBottom: space[32], paddingBottom: space[24], borderBottomWidth: 1 },
  sectionBody: { marginTop: space[16] },
  variantGroup: { marginBottom: space[16], gap: space[4] },
  group: { gap: space[12] },
  onAccentContainer: {
    padding: space[16],
    borderRadius: radius.md,
    marginTop: space[8],
  },
  truncationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space[16],
    borderRadius: radius.md,
    borderWidth: 1,
    gap: space[12],
  },
  paragraphWrapper: { marginBottom: space[16] },
  controls: {
    paddingHorizontal: space[24],
    paddingVertical: space[16],
    borderTopWidth: 1,
    gap: space[8],
  },
  chipRow: { flexDirection: 'row', gap: space[8] },
  chip: {
    paddingHorizontal: space[16],
    paddingVertical: space[8],
    borderRadius: radius.pill,
  },
});
