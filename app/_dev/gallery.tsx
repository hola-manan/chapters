import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, space } from '../../design/index.ts';
import {
  BookCard,
  ChapterOpening,
  GeneratedCover,
  HeadingBlock,
  ImportTile,
  ParagraphBlock,
} from '../../features/index.ts';
import type { Block, Book } from '../../pdf/types.ts';
import { listBooks } from '../../storage/index.ts';
import {
  HStack,
  IconButton,
  PressableCard,
  PressableRow,
  ReadingText,
  Surface,
  TapRegion,
  Text,
  TextLink,
  ThemeProvider,
  useTheme,
  VStack,
} from '../../ui/index.ts';

const FALLBACK: string[] = [
  'Import a book and this chooser will use its actual text instead of this placeholder. Real sentences matter here: the texture of ink on paper only shows across a full paragraph, in the words you will actually be reading.',
  'A bold ink is not the same as a loud one. Deep navy, forest and espresso all read as black at a glance and only reveal their colour when you look for it, or when they sit next to true black.',
  'Judge the accent by how rarely you notice it, not by how much you like the colour. It is the only colour on the screen, so it will always draw the eye — the question is whether it draws it somewhere useful.',
];

const VARIANTS = ['title1', 'title2', 'title3', 'body', 'subhead', 'footnote', 'caption'] as const;
const WEIGHTS = ['regular', 'medium', 'semibold'] as const;

const GAP_STEPS = [
  { key: 'none', px: 0 },
  { key: 'xxs', px: space.xxs },
  { key: 'xs', px: space.xs },
  { key: 'sm', px: space.sm },
  { key: 'md', px: space.md },
  { key: 'lg', px: space.lg },
  { key: 'xl', px: space.xl },
  { key: 'xxl', px: space.xxl },
  { key: 'xxxl', px: space.xxxl },
] as const;

const COVER_SEEDS = [
  'Laugh Tactics: Master Conversational Humor and Be Funny On Command',
  'The Elements of Typographic Style',
  'Short Title',
  'Structure and Interpretation of Computer Programs',
  'Design Systems',
  'The Extraordinary History of the Empire of the Setting Sun',
  'A',
  'Crafting Interpreters',
];

const DEMO_LONG_BOOK: Book = {
  id: 'demo-long',
  title: 'Laugh Tactics: Master Conversational Humor and Be Funny On Command',
  addedAt: 1700000000000,
  pageCount: 248,
  status: 'ready',
  chapterSource: 'outline',
  chapters: Array(14).fill({ id: 'ch', title: 'Ch', startPage: 1, endPage: 10, blocks: [] }),
  sourceUri: '',
};

const DEMO_SHORT_BOOK: Book = {
  id: 'demo-short',
  title: 'Short Title',
  addedAt: 1700000000000,
  pageCount: 32,
  status: 'ready',
  chapterSource: 'outline',
  chapters: Array(3).fill({ id: 'ch', title: 'Ch', startPage: 1, endPage: 10, blocks: [] }),
  sourceUri: '',
};

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
  const [showHiddenChild, setShowHiddenChild] = useState(false);

  // Pressable State Examples
  const [cardPressCount, setCardPressCount] = useState<number>(0);
  const [rowPressCount, setRowPressCount] = useState<number>(0);
  const [iconPressCount, setIconPressCount] = useState<number>(0);
  const [linkPressCount, setLinkPressCount] = useState<number>(0);
  const [tapRegionToggled, setTapRegionToggled] = useState<boolean>(false);
  const [hapticPressCount, setHapticPressCount] = useState<number>(0);

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
            Typographic & Interaction Specimen
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

        {/* Section 5: VStack Gap Scale Ladder */}
        <Section title="VStack Gap Scale Ladder" borderBottomColor={theme.border.subtle}>
          <VStack gap="md">
            {GAP_STEPS.map((step) => (
              <View
                key={step.key}
                style={[
                  styles.cardScaffolding,
                  { backgroundColor: theme.surface.raised, borderColor: theme.border.subtle },
                ]}
              >
                <VStack gap="xs">
                  <Text variant="caption" tone="secondary" weight="semibold">
                    {`gap="${step.key}" (${step.px}px)`}
                  </Text>
                  <VStack gap={step.key}>
                    <View style={[styles.ladderItem, { backgroundColor: theme.accent.base }]} />
                    <View style={[styles.ladderItem, { backgroundColor: theme.accent.base }]} />
                  </VStack>
                </VStack>
              </View>
            ))}
          </VStack>
        </Section>

        {/* Section 6: HStack Alignment */}
        <Section title="HStack Cross-Axis Alignment" borderBottomColor={theme.border.subtle}>
          <VStack gap="md">
            {(['center', 'start', 'end', 'baseline'] as const).map((a) => (
              <View
                key={a}
                style={[
                  styles.cardScaffolding,
                  { backgroundColor: theme.surface.raised, borderColor: theme.border.subtle },
                ]}
              >
                <VStack gap="xs">
                  <Text variant="caption" tone="secondary" weight="semibold">
                    {`align="${a}"`}
                  </Text>
                  <View
                    style={[
                      styles.alignBoxScaffolding,
                      { backgroundColor: theme.surface.sunken },
                    ]}
                  >
                    <HStack align={a} gap="md">
                      <Text variant="title1" weight="semibold">
                        Title Size
                      </Text>
                      <Text variant="caption" tone="secondary">
                        Caption Size
                      </Text>
                    </HStack>
                  </View>
                </VStack>
              </View>
            ))}
          </VStack>
        </Section>

        {/* Section 7: HStack Justify Between */}
        <Section title="HStack Justify Between (Chapter Row)" borderBottomColor={theme.border.subtle}>
          <View
            style={[
              styles.cardScaffolding,
              { backgroundColor: theme.surface.raised, borderColor: theme.border.subtle },
            ]}
          >
            <HStack justify="between" align="baseline">
              <Text variant="body" weight="semibold" flex numberOfLines={1}>
                Chapter 5: Double Joke-webs & The Hadron Joke Collider
              </Text>
              <Text variant="footnote" tone="secondary">
                24 pp
              </Text>
            </HStack>
          </View>
        </Section>

        {/* Section 8: VStack with Dividers */}
        <Section title="VStack with Dividers (Conditional Child Proof)" borderBottomColor={theme.border.subtle}>
          <VStack gap="md">
            {/* PressableCard owns radius so press feedback clips to pill shape */}
            <PressableCard
              radius="pill"
              onPress={() => setShowHiddenChild((prev) => !prev)}
            >
              <View
                style={[
                  styles.chip,
                  {
                    backgroundColor: showHiddenChild ? theme.accent.base : theme.surface.sunken,
                    alignSelf: 'flex-start',
                  },
                ]}
              >
                <Text
                  variant="footnote"
                  tone={showHiddenChild ? 'onAccent' : 'primary'}
                  weight="medium"
                >
                  {showHiddenChild ? 'Hide Conditionally Rendered Item' : 'Show Conditionally Rendered Item'}
                </Text>
              </View>
            </PressableCard>
            <View
              style={[
                styles.cardScaffolding,
                { backgroundColor: theme.surface.raised, borderColor: theme.border.subtle },
              ]}
            >
              <VStack dividers gap="sm">
                <Text variant="body" weight="medium">
                  Chapter 1: Call of the Wild
                </Text>
                {showHiddenChild && (
                  <Text variant="body" tone="secondary">
                    Chapter 2: [Conditionally Rendered Row]
                  </Text>
                )}
                <Text variant="body" weight="medium">
                  Chapter 3: The Wilderness
                </Text>
                <Text variant="body" weight="medium">
                  Chapter 4: The Sound of Thunder
                </Text>
              </VStack>
            </View>
          </VStack>
        </Section>

        {/* Section 9: Surface Primitives */}
        <Section title="Surface Primitives & Elevations" borderBottomColor={theme.border.subtle}>
          <VStack gap="xl">
            {/* Elevations in current theme */}
            <VStack gap="sm">
              <Text variant="caption" tone="tertiary" weight="semibold">
                ELEVATION LADDER (CURRENT THEME)
              </Text>
              <VStack gap="md">
                <Surface elevation={0} padding="md" radius="md" border>
                  <VStack gap="xs">
                    <Text variant="footnote" weight="semibold">
                      Elevation 0 (Page Ground)
                    </Text>
                    <Text variant="caption" tone="secondary">
                      Flat base level · theme.surface.page
                    </Text>
                  </VStack>
                </Surface>
                <Surface elevation={1} padding="md" radius="md" border>
                  <VStack gap="xs">
                    <Text variant="footnote" weight="semibold">
                      Elevation 1 (Raised Ground)
                    </Text>
                    <Text variant="caption" tone="secondary">
                      Card / list row · theme.surface.raised
                    </Text>
                  </VStack>
                </Surface>
                <Surface elevation={2} padding="md" radius="md">
                  <VStack gap="xs">
                    <Text variant="footnote" weight="semibold">
                      Elevation 2 (Floating Layer)
                    </Text>
                    <Text variant="caption" tone="secondary">
                      Sheet / toast · theme.surface.floating + shadow
                    </Text>
                  </VStack>
                </Surface>
                <Surface sunken padding="md" radius="md" border>
                  <VStack gap="xs">
                    <Text variant="footnote" weight="semibold">
                      Sunken Surface
                    </Text>
                    <Text variant="caption" tone="secondary">
                      Recessed container · theme.surface.sunken
                    </Text>
                  </VStack>
                </Surface>
              </VStack>
            </VStack>

            {/* Forced Dark Theme Elevation Ladder */}
            <VStack gap="sm">
              <Text variant="caption" tone="tertiary" weight="semibold">
                DARK THEME OVERRIDE (LIGHTNESS ELEVATION · NO SHADOWS)
              </Text>
              <ThemeProvider themeOverride="dark">
                <Surface elevation={0} padding="md" radius="lg">
                  <VStack gap="md">
                    <Surface elevation={0} padding="md" radius="md" border>
                      <VStack gap="xs">
                        <Text variant="footnote" weight="semibold">
                          Elevation 0 (Page Ground)
                        </Text>
                        <Text variant="caption" tone="secondary">
                          darkGround[900]
                        </Text>
                      </VStack>
                    </Surface>
                    <Surface elevation={1} padding="md" radius="md" border>
                      <VStack gap="xs">
                        <Text variant="footnote" weight="semibold">
                          Elevation 1 (Raised Ground)
                        </Text>
                        <Text variant="caption" tone="secondary">
                          darkGround[800]
                        </Text>
                      </VStack>
                    </Surface>
                    <Surface elevation={2} padding="md" radius="md">
                      <VStack gap="xs">
                        <Text variant="footnote" weight="semibold">
                          Elevation 2 (Floating Layer)
                        </Text>
                        <Text variant="caption" tone="secondary">
                          darkGround[700] (Lightened surface step)
                        </Text>
                      </VStack>
                    </Surface>
                    <Surface sunken padding="md" radius="md" border>
                      <VStack gap="xs">
                        <Text variant="footnote" weight="semibold">
                          Sunken Surface
                        </Text>
                        <Text variant="caption" tone="secondary">
                          darkGround.sunken
                        </Text>
                      </VStack>
                    </Surface>
                  </VStack>
                </Surface>
              </ThemeProvider>
            </VStack>

            {/* Padding Scale */}
            <VStack gap="sm">
              <Text variant="caption" tone="tertiary" weight="semibold">
                PADDING SCALE LADDER
              </Text>
              <VStack gap="sm">
                {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((p) => (
                  <Surface key={p} elevation={1} padding={p} radius="md" border>
                    <Text variant="footnote" weight="medium">
                      {`padding="${p}"`}
                    </Text>
                  </Surface>
                ))}
              </VStack>
            </VStack>

            {/* Realistic Composition */}
            <VStack gap="sm">
              <Text variant="caption" tone="tertiary" weight="semibold">
                REALISTIC COMPOSITION (BOOK CARD SHAPE)
              </Text>
              <Surface elevation={1} radius="md" padding="lg" border>
                <VStack gap="xs">
                  <Text variant="body" weight="semibold">
                    The Elements of Typographic Style
                  </Text>
                  <Text variant="footnote" tone="secondary">
                    Robert Bringhurst · 14 chapters · 352 pp
                  </Text>
                </VStack>
              </Surface>
            </VStack>
          </VStack>
        </Section>

        {/* Section 10: Pressable & Derived Variants */}
        <Section title="Pressable Primitives & Specialised Variants" borderBottomColor={theme.border.subtle}>
          <VStack gap="lg">
            {/* 1. PressableCard */}
            <VStack gap="xs">
              <Text variant="caption" tone="secondary" weight="semibold">
                {'1. PressableCard (feedback="scale", settled motion token)'}
              </Text>
              {/* PressableCard owns radius so press feedback clips to silhouette */}
              <PressableCard radius="md" onPress={() => setCardPressCount((c) => c + 1)}>
                <Surface elevation={1} padding="md" border>
                  <HStack justify="between" align="center">
                    <VStack gap="xxs">
                      <Text variant="body" weight="semibold">
                        Self-contained Tile
                      </Text>
                      <Text variant="caption" tone="secondary">
                        Scales down to 0.99 with default spring
                      </Text>
                    </VStack>
                    <Text variant="footnote" tone="accent" weight="medium">
                      {`Taps: ${cardPressCount}`}
                    </Text>
                  </HStack>
                </Surface>
              </PressableCard>
            </VStack>

            {/* 2. PressableRow */}
            <VStack gap="xs">
              <Text variant="caption" tone="secondary" weight="semibold">
                {'2. PressableRow (feedback="overlay", clipped radius)'}
              </Text>
              {/* PressableRow owns radius so press overlay clips to rounded corners */}
              <PressableRow radius="md" onPress={() => setRowPressCount((r) => r + 1)}>
                <Surface elevation={1} padding="md" border>
                  <HStack justify="between" align="center">
                    <VStack gap="xxs">
                      <Text variant="body" weight="medium">
                        Full-bleed List Row
                      </Text>
                      <Text variant="caption" tone="secondary">
                        Press overlay clips cleanly to rounded corners
                      </Text>
                    </VStack>
                    <Text variant="footnote" tone="accent" weight="medium">
                      {`Taps: ${rowPressCount}`}
                    </Text>
                  </HStack>
                </Surface>
              </PressableRow>
            </VStack>

            {/* 3. IconButton */}
            <VStack gap="xs">
              <Text variant="caption" tone="secondary" weight="semibold">
                {'3. IconButton (feedback="opacity", 44×44pt touch target)'}
              </Text>
              <HStack gap="md" align="center">
                <IconButton
                  onPress={() => setIconPressCount((i) => i + 1)}
                  accessibilityLabel="Bookmark chapter"
                >
                  <Ionicons name="bookmark-outline" size={24} color={theme.text.primary} />
                </IconButton>
                <Text variant="footnote" tone="secondary">
                  {`Icon Taps: ${iconPressCount} (Expanded slop target)`}
                </Text>
              </HStack>
            </VStack>

            {/* 4. TextLink */}
            <VStack gap="xs">
              <Text variant="caption" tone="secondary" weight="semibold">
                {'4. TextLink (feedback="opacity", accessibilityRole="link")'}
              </Text>
              <HStack gap="sm" align="center">
                <TextLink
                  variant="body"
                  weight="semibold"
                  onPress={() => setLinkPressCount((l) => l + 1)}
                >
                  Read chapter outline →
                </TextLink>
                <Text variant="caption" tone="secondary">
                  {`(${linkPressCount} clicks)`}
                </Text>
              </HStack>
            </VStack>

            {/* 5. TapRegion */}
            <VStack gap="xs">
              <Text variant="caption" tone="secondary" weight="semibold">
                {'5. TapRegion (feedback="none")'}
              </Text>
              {/* TapRegion owns radius so silhouette stays consistent */}
              <TapRegion radius="md" onPress={() => setTapRegionToggled((prev) => !prev)}>
                <Surface elevation={1} padding="md" border>
                  <HStack justify="between" align="center">
                    <VStack gap="xxs">
                      <Text variant="body" weight="medium">
                        Invisible Tap Area
                      </Text>
                      <Text variant="caption" tone="secondary">
                        No visual press animation by design
                      </Text>
                    </VStack>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: tapRegionToggled
                            ? theme.accent.base
                            : theme.surface.sunken,
                        },
                      ]}
                    >
                      <Text
                        variant="caption"
                        tone={tapRegionToggled ? 'onAccent' : 'primary'}
                        weight="semibold"
                      >
                        {tapRegionToggled ? 'Toggled: ON' : 'Toggled: OFF'}
                      </Text>
                    </View>
                  </HStack>
                </Surface>
              </TapRegion>
            </VStack>

            {/* Disabled Example */}
            <VStack gap="xs">
              <Text variant="caption" tone="secondary" weight="semibold">
                6. Disabled PressableCard
              </Text>
              {/* PressableCard owns radius so disabled silhouette is cleanly clipped */}
              <PressableCard radius="md" disabled onPress={() => {}}>
                <Surface elevation={1} padding="md" border>
                  <Text variant="body" tone="secondary">
                    Disabled state (reduced opacity, press suppressed)
                  </Text>
                </Surface>
              </PressableCard>
            </VStack>

            {/* Haptic Selection Example */}
            <VStack gap="xs">
              <Text variant="caption" tone="secondary" weight="semibold">
                {'7. Haptic Feedback (haptic="selection")'}
              </Text>
              {/* PressableCard owns radius so press feedback clips to silhouette */}
              <PressableCard
                radius="md"
                haptic="selection"
                onPress={() => setHapticPressCount((h) => h + 1)}
              >
                <Surface elevation={1} padding="md" border>
                  <HStack justify="between" align="center">
                    <VStack gap="xxs">
                      <Text variant="body" weight="semibold">
                        Selection Haptic Card
                      </Text>
                      <Text variant="caption" tone="secondary">
                        Triggers selection haptic on press-in
                      </Text>
                    </VStack>
                    <Text variant="footnote" tone="accent" weight="medium">
                      {`Taps: ${hapticPressCount}`}
                    </Text>
                  </HStack>
                </Surface>
              </PressableCard>
            </VStack>
          </VStack>
        </Section>

        {/* Section 11: Library Components */}
        <Section title="Library Components (Covers, Cards & Import Tile)" borderBottomColor={theme.border.subtle}>
          <VStack gap="xl">
            {/* 1. Eight GeneratedCovers */}
            <VStack gap="xs">
              <Text variant="caption" tone="secondary" weight="semibold">
                1. GeneratedCover (8 Seeds for Variety & Coherence)
              </Text>
              <View style={styles.coverGrid}>
                {COVER_SEEDS.map((seed, idx) => (
                  <View key={idx} style={styles.coverGridItem}>
                    <GeneratedCover seed={seed} radius="md" />
                    <Text variant="caption" tone="secondary" numberOfLines={1}>
                      {seed}
                    </Text>
                  </View>
                ))}
              </View>
            </VStack>

            {/* 2. Side-by-Side BookCards (Truncation Test) */}
            <VStack gap="xs">
              <Text variant="caption" tone="secondary" weight="semibold">
                2. Side-by-Side BookCard Truncation Behavior
              </Text>
              <HStack gap="md">
                <View style={styles.sideBySideCard}>
                  <BookCard book={DEMO_LONG_BOOK} />
                </View>
                <View style={styles.sideBySideCard}>
                  <BookCard book={DEMO_SHORT_BOOK} />
                </View>
              </HStack>
            </VStack>

            {/* 3. ImportTile States */}
            <VStack gap="xs">
              <Text variant="caption" tone="secondary" weight="semibold">
                3. ImportTile (Idle vs. Importing States)
              </Text>
              <VStack gap="md">
                <ImportTile onPress={() => {}} />
                <ImportTile isImporting stage="extracting text" pct={42} />
              </VStack>
            </VStack>
          </VStack>
        </Section>

        {/* Section 12: Reading Surface */}
        <Section title="Reading Surface" borderBottomColor={theme.border.subtle}>
          <VStack gap="xxl">
            {/* 1. All four ChapterOpening treatments stacked */}
            <VStack gap="xl">
              <Text variant="caption" tone="tertiary" weight="semibold">
                1. CHAPTER OPENING TREATMENTS (32PT MEASURE)
              </Text>

              {/* Eyebrow Treatment */}
              <View style={[styles.readingSpecimen, { backgroundColor: theme.surface.page, borderColor: theme.border.subtle }]}>
                <Text variant="caption" tone="tertiary" weight="semibold">
                  TREATMENT: EYEBROW
                </Text>
                <View style={{ marginTop: space.sm }}>
                  <ChapterOpening
                    title="The Elements of Typographic Style"
                    chapterNumber={1}
                    chapterCount={12}
                    treatment="eyebrow"
                  />
                  <ParagraphBlock text={bodyParagraphs[0]} />
                  <ParagraphBlock text={bodyParagraphs[1]} />
                </View>
              </View>

              {/* Plain Treatment */}
              <View style={[styles.readingSpecimen, { backgroundColor: theme.surface.page, borderColor: theme.border.subtle }]}>
                <Text variant="caption" tone="tertiary" weight="semibold">
                  TREATMENT: PLAIN
                </Text>
                <View style={{ marginTop: space.sm }}>
                  <ChapterOpening
                    title="The Elements of Typographic Style"
                    chapterNumber={1}
                    chapterCount={12}
                    treatment="plain"
                  />
                  <ParagraphBlock text={bodyParagraphs[0]} />
                  <ParagraphBlock text={bodyParagraphs[1]} />
                </View>
              </View>

              {/* Initial Treatment */}
              <View style={[styles.readingSpecimen, { backgroundColor: theme.surface.page, borderColor: theme.border.subtle }]}>
                <Text variant="caption" tone="tertiary" weight="semibold">
                  TREATMENT: INITIAL (RAISED INITIAL)
                </Text>
                <View style={{ marginTop: space.sm }}>
                  <ChapterOpening
                    title="The Elements of Typographic Style"
                    chapterNumber={1}
                    chapterCount={12}
                    treatment="initial"
                    firstParagraph={bodyParagraphs[0]}
                  />
                  <ParagraphBlock text={bodyParagraphs[1]} />
                </View>
              </View>

              {/* Smallcaps Treatment */}
              <View style={[styles.readingSpecimen, { backgroundColor: theme.surface.page, borderColor: theme.border.subtle }]}>
                <Text variant="caption" tone="tertiary" weight="semibold">
                  TREATMENT: SMALLCAPS (FAUX SMALL CAPS)
                </Text>
                <View style={{ marginTop: space.sm }}>
                  <ChapterOpening
                    title="The Elements of Typographic Style"
                    chapterNumber={1}
                    chapterCount={12}
                    treatment="smallcaps"
                    firstParagraph={bodyParagraphs[0]}
                  />
                  <ParagraphBlock text={bodyParagraphs[1]} />
                </View>
              </View>
            </VStack>

            {/* 2. Paragraph Rhythm Specimen */}
            <VStack gap="xs">
              <Text variant="caption" tone="tertiary" weight="semibold">
                2. PARAGRAPH & HEADING RHYTHM SPECIMEN
              </Text>
              <View style={[styles.readingSpecimen, { backgroundColor: theme.surface.page, borderColor: theme.border.subtle }]}>
                <ParagraphBlock text={bodyParagraphs[0]} />
                <ParagraphBlock text={bodyParagraphs[1]} />
                <HeadingBlock text="Section 1.1: The Asymmetric Rhythm of Headings" level={1} />
                <ParagraphBlock text={bodyParagraphs[2 % bodyParagraphs.length]} />
                <ParagraphBlock text={bodyParagraphs[3 % bodyParagraphs.length]} />
              </View>
            </VStack>
          </VStack>
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
            /* PressableCard owns radius so press feedback clips to pill shape */
            <PressableCard
              key={m}
              radius="pill"
              onPress={() => setThemeMode(m)}
            >
              <View
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
              </View>
            </PressableCard>
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
  cardScaffolding: {
    padding: space[16],
    borderRadius: radius.md,
    borderWidth: 1,
  },
  ladderItem: {
    height: space[12],
    borderRadius: radius.xs,
  },
  alignBoxScaffolding: {
    marginTop: space[8],
    padding: space[12],
    borderRadius: radius.sm,
  },
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
  badge: {
    paddingHorizontal: space[12],
    paddingVertical: space.xs,
    borderRadius: radius.pill,
  },
  coverGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[12],
  },
  coverGridItem: {
    width: '47%',
    gap: space.xs,
  },
  sideBySideCard: {
    flex: 1,
  },
  readingSpecimen: {
    paddingHorizontal: space.xxl,
    paddingVertical: space.xl,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
