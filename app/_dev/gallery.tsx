import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { radius, space } from '../../design/index.ts';
import {
  BookCard,
  ChapterEndCard,
  ChapterOpening,
  GeneratedCover,
  HeadingBlock,
  ImportProgressCard,
  ImportTile,
  ParagraphBlock,
} from '../../features/index.ts';
import type { Block, Book } from '../../pdf/types.ts';
import { listBooks } from '../../storage/index.ts';
import {
  EmptyState,
  HStack,
  Icon,
  IconButton,
  ProgressBar,
  PressableCard,
  PressableRow,
  ReadingInitial,
  ReadingLead,
  ReadingText,
  SegmentedControl,
  Sheet,
  SkeletonText,
  Spinner,
  Surface,
  TapRegion,
  Text,
  TextLink,
  ThemeProvider,
  useTheme,
  useToast,
  VStack,
} from '../../ui/index.ts';

const FALLBACK: string[] = [
  'Import a book and this chooser will use its actual text instead of this placeholder. Real sentences matter here: the texture of ink on paper only shows across a full paragraph, in the words you will actually be reading.',
  'A bold ink is not the same as a loud one. Deep navy, forest and espresso all read as black at a glance and only reveal their colour when you look for it, or when they sit next to true black.',
  'Judge the accent by how rarely you notice it, not by how much you like the colour. It is the only colour on the screen, so it will always draw the eye — the question is whether it draws it somewhere useful.',
];

const VARIANTS = ['title1', 'title2', 'title3', 'body', 'subhead', 'footnote', 'caption'] as const;
const WEIGHTS = ['regular', 'medium', 'semibold'] as const;
const ICON_BESIDE_TEXT_SIZES = ['caption', 'footnote', 'subhead', 'body', 'title3'] as const;
const ICON_STANDALONE_SIZES = ['sm', 'md', 'lg'] as const;

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

  // Pressable & Control State Examples
  const [cardPressCount, setCardPressCount] = useState<number>(0);
  const [rowPressCount, setRowPressCount] = useState<number>(0);
  const [iconPressCount, setIconPressCount] = useState<number>(0);
  const [linkPressCount, setLinkPressCount] = useState<number>(0);
  const [tapRegionToggled, setTapRegionToggled] = useState<boolean>(false);
  const [hapticPressCount, setHapticPressCount] = useState<number>(0);

  // SegmentedControl & Sheet Specimen State
  const [twoOptVal, setTwoOptVal] = useState<'light' | 'dark'>('light');
  const [threeOptVal, setThreeOptVal] = useState<'small' | 'default' | 'large'>('default');
  const [sheetOpen, setSheetOpen] = useState<boolean>(false);

  // Feedback & Toast Specimen State
  const toast = useToast();
  const [toastFeedback, setToastFeedback] = useState<string>('');
  const [errorCardDismissed, setErrorCardDismissed] = useState<boolean>(false);

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

        {/* Section 2b: Icon Primitives */}
        <Section title="Icon Sizes & Color Tones" borderBottomColor={theme.border.subtle}>
          <VStack gap="xl">
            {/* Sizes beside matching text variants */}
            <VStack gap="xs">
              <Text variant="caption" tone="tertiary" weight="semibold">
                BESIDE TEXT (OPTICALLY CORRECTED)
              </Text>
              <VStack gap="sm">
                {ICON_BESIDE_TEXT_SIZES.map((s) => (
                  <HStack key={s} align="center" gap="sm">
                    <Icon name="book-outline" size={s} />
                    <Text variant={s}>
                      {`size="${s}" beside Text variant="${s}"`}
                    </Text>
                  </HStack>
                ))}
              </VStack>
            </VStack>

            {/* Standalone sizes */}
            <VStack gap="xs">
              <Text variant="caption" tone="tertiary" weight="semibold">
                STANDALONE SIZES
              </Text>
              <HStack gap="lg" align="center">
                {ICON_STANDALONE_SIZES.map((s) => (
                  <VStack key={s} gap="xs" align="center">
                    <Icon name="bookmark-outline" size={s} />
                    <Text variant="caption" tone="secondary">
                      {`"${s}"`}
                    </Text>
                  </VStack>
                ))}
              </HStack>
            </VStack>

            {/* Color tones */}
            <VStack gap="xs">
              <Text variant="caption" tone="tertiary" weight="semibold">
                COLOR TONES
              </Text>
              <HStack gap="lg" align="center">
                {(['primary', 'secondary', 'tertiary', 'accent'] as const).map((t) => (
                  <VStack key={t} gap="xs" align="center">
                    <Icon name="bookmark" size="lg" tone={t} />
                    <Text variant="caption" tone="secondary">
                      {t}
                    </Text>
                  </VStack>
                ))}
                <View
                  style={[
                    styles.onAccentIconContainer,
                    { backgroundColor: theme.accent.base },
                  ]}
                >
                  <VStack gap="xs" align="center">
                    <Icon name="bookmark" size="lg" tone="onAccent" />
                    <Text variant="caption" tone="onAccent">
                      onAccent
                    </Text>
                  </VStack>
                </View>
              </HStack>
            </VStack>
          </VStack>
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
                  <Icon name="bookmark-outline" size="lg" />
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
                3. ImportTile (Idle vs. Disabled States)
              </Text>
              <VStack gap="md">
                <ImportTile onPress={() => {}} />
                <ImportTile disabled />
              </VStack>
            </VStack>

            {/* 4. ImportProgressCard States */}
            <VStack gap="xs">
              <Text variant="caption" tone="secondary" weight="semibold">
                4. ImportProgressCard (Importing vs. Error States)
              </Text>
              <VStack gap="md">
                <ImportProgressCard
                  status="importing"
                  fileName="laugh-tactics.pdf"
                  stage="reading"
                  pct={35}
                />
                <ImportProgressCard
                  status="importing"
                  fileName="structure-and-interpretation.pdf"
                  stage="parsing"
                  pct={68}
                />
                <ImportProgressCard
                  status="importing"
                  fileName="crafting-interpreters.pdf"
                  stage="detecting"
                  pct={95}
                />
                {!errorCardDismissed ? (
                  <ImportProgressCard
                    status="error"
                    fileName="scanned-document.pdf"
                    errorMessage="“scanned-document.pdf” is scanned page images, not text. There is nothing to display."
                    onDismiss={() => setErrorCardDismissed(true)}
                  />
                ) : (
                  <PressableCard radius="md" onPress={() => setErrorCardDismissed(false)}>
                    <Surface elevation={1} padding="md" border>
                      <Text variant="footnote" tone="accent" align="center">
                        Reset Error Card Specimen
                      </Text>
                    </Surface>
                  </PressableCard>
                )}
              </VStack>
            </VStack>
          </VStack>
        </Section>

        {/* Section 12: Reading Surface */}
        <Section title="Reading Surface" borderBottomColor={theme.border.subtle}>
          <VStack gap="xxl">
            {/* 1. The settled chapter opening */}
            <VStack gap="xl">
              <Text variant="caption" tone="tertiary" weight="semibold">
                1. CHAPTER OPENING (32PT MEASURE)
              </Text>

              <View style={[styles.readingSpecimen, { backgroundColor: theme.surface.page, borderColor: theme.border.subtle }]}>
                <ChapterOpening
                  title="The Elements of Typographic Style"
                  chapterNumber={1}
                  chapterCount={12}
                />
                <ParagraphBlock text={bodyParagraphs[0]} />
                <ParagraphBlock text={bodyParagraphs[1]} />
              </View>
            </VStack>

            {/* 1b. Unused reading accents, kept as tier-2 library specimens */}
            <VStack gap="xs">
              <Text variant="caption" tone="tertiary" weight="semibold">
                1b. READING ACCENTS (NOT USED IN THE READER)
              </Text>
              <View style={[styles.readingSpecimen, { backgroundColor: theme.surface.page, borderColor: theme.border.subtle }]}>
                <View style={{ flexDirection: 'row', marginBottom: space.lg }}>
                  <View style={{ marginRight: space.sm }}>
                    <ReadingInitial>{bodyParagraphs[0].charAt(0)}</ReadingInitial>
                  </View>
                  <View style={{ flex: 1 }}>
                    <ReadingText>{bodyParagraphs[0].slice(1)}</ReadingText>
                  </View>
                </View>
                <ReadingText>
                  <ReadingLead>{bodyParagraphs[1].split(/\s+/).slice(0, 4).join(' ')}</ReadingLead>
                  {' ' + bodyParagraphs[1].split(/\s+/).slice(4).join(' ')}
                </ReadingText>
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

            {/* 3. Chapter End Card (With Next Chapter) */}
            <VStack gap="xs">
              <Text variant="caption" tone="tertiary" weight="semibold">
                3. CHAPTER END CARD — WITH NEXT CHAPTER
              </Text>
              <View style={[styles.readingSpecimen, { backgroundColor: theme.surface.page, borderColor: theme.border.subtle }]}>
                <ChapterEndCard
                  nextTitle="Chapter 2: The Asymmetric Rhythm of Headings"
                  nextWordCount={1450}
                  bookTitle="The Elements of Typographic Style"
                  onNext={() => {}}
                  onBackToContents={() => {}}
                />
              </View>
            </VStack>

            {/* 4. Chapter End Card (Last Chapter of Book) */}
            <VStack gap="xs">
              <Text variant="caption" tone="tertiary" weight="semibold">
                4. CHAPTER END CARD — LAST CHAPTER OF BOOK
              </Text>
              <View style={[styles.readingSpecimen, { backgroundColor: theme.surface.page, borderColor: theme.border.subtle }]}>
                <ChapterEndCard
                  bookTitle="The Elements of Typographic Style"
                  onBackToContents={() => {}}
                />
              </View>
            </VStack>
          </VStack>
        </Section>

        {/* Section 13: SegmentedControl & Sheet */}
        <Section title="SegmentedControl & Sheet Overlays" borderBottomColor={theme.border.subtle}>
          <VStack gap="xl">
            {/* 1. Two-option SegmentedControl */}
            <VStack gap="xs">
              <Text variant="caption" tone="secondary" weight="semibold">
                1. TWO-OPTION SEGMENTED CONTROL
              </Text>
              <SegmentedControl
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                ]}
                value={twoOptVal}
                onChange={setTwoOptVal}
                testID="gallery-two-option-segmented-control"
              />
            </VStack>

            {/* 2. Three-option SegmentedControl */}
            <VStack gap="xs">
              <Text variant="caption" tone="secondary" weight="semibold">
                2. THREE-OPTION SEGMENTED CONTROL
              </Text>
              <SegmentedControl
                options={[
                  { value: 'small', label: 'Small' },
                  { value: 'default', label: 'Default' },
                  { value: 'large', label: 'Large' },
                ]}
                value={threeOptVal}
                onChange={setThreeOptVal}
                testID="gallery-three-option-segmented-control"
              />
            </VStack>

            {/* 3. Sheet Trigger */}
            <VStack gap="xs">
              <Text variant="caption" tone="secondary" weight="semibold">
                3. BOTTOM SHEET OVERLAY
              </Text>
              <PressableCard radius="md" onPress={() => setSheetOpen(true)}>
                <Surface elevation={1} padding="md" border>
                  <HStack justify="between" align="center">
                    <VStack gap="xxs">
                      <Text variant="body" weight="semibold">
                        Open Sample Bottom Sheet
                      </Text>
                      <Text variant="caption" tone="secondary">
                        Drag handle, backdrop blur, pan dismiss
                      </Text>
                    </VStack>
                    <Text variant="footnote" tone="accent" weight="medium">
                      Open →
                    </Text>
                  </HStack>
                </Surface>
              </PressableCard>
            </VStack>
          </VStack>
        </Section>

        {/* Section 14: Feedback Primitives (Progress & Toast) */}
        <Section title="Feedback Primitives (ProgressBar, Spinner, Toast)" borderBottomColor={theme.border.subtle}>
          <VStack gap="xl">
            {/* 1. ProgressBar at several values */}
            <VStack gap="xs">
              <Text variant="caption" tone="secondary" weight="semibold">
                1. PROGRESS BAR (VALUES: 0%, 25%, 65%, 100%)
              </Text>
              <VStack gap="md">
                <VStack gap="xxs">
                  <Text variant="caption" tone="tertiary">
                    0% (Empty)
                  </Text>
                  <ProgressBar value={0} />
                </VStack>
                <VStack gap="xxs">
                  <Text variant="caption" tone="tertiary">
                    25% (Quarter)
                  </Text>
                  <ProgressBar value={0.25} />
                </VStack>
                <VStack gap="xxs">
                  <Text variant="caption" tone="tertiary">
                    65% (Movement transition)
                  </Text>
                  <ProgressBar value={0.65} />
                </VStack>
                <VStack gap="xxs">
                  <Text variant="caption" tone="tertiary">
                    100% (Complete)
                  </Text>
                  <ProgressBar value={1} />
                </VStack>
              </VStack>
            </VStack>

            {/* 2. Spinner sizes */}
            <VStack gap="xs">
              <Text variant="caption" tone="secondary" weight="semibold">
                2. SPINNER (SIZES: SM & MD)
              </Text>
              <HStack gap="xl" align="center">
                <VStack gap="xs" align="center">
                  <Spinner size="sm" />
                  <Text variant="caption" tone="tertiary">
                    {'size="sm" (16pt)'}
                  </Text>
                </VStack>
                <VStack gap="xs" align="center">
                  <Spinner size="md" />
                  <Text variant="caption" tone="tertiary">
                    {'size="md" (24pt)'}
                  </Text>
                </VStack>
              </HStack>
            </VStack>

            {/* 3. Toast triggers */}
            <VStack gap="xs">
              <Text variant="caption" tone="secondary" weight="semibold">
                3. TOAST NOTIFICATIONS
              </Text>
              <VStack gap="md">
                <PressableCard
                  radius="md"
                  onPress={() => {
                    toast.show({
                      message: '“The Elements of Typographic Style” is ready',
                    });
                  }}
                >
                  <Surface elevation={1} padding="md" border>
                    <HStack justify="between" align="center">
                      <VStack gap="xxs">
                        <Text variant="body" weight="semibold">
                          Show Plain Toast
                        </Text>
                        <Text variant="caption" tone="secondary">
                          Auto-dismisses after 4000ms · Floating elevation 2
                        </Text>
                      </VStack>
                      <Text variant="footnote" tone="accent" weight="medium">
                        Trigger →
                      </Text>
                    </HStack>
                  </Surface>
                </PressableCard>

                <PressableCard
                  radius="md"
                  onPress={() => {
                    toast.show({
                      message: '“Laugh Tactics” is ready',
                      onPress: () => {
                        setToastFeedback('Tapped toast for “Laugh Tactics”');
                      },
                    });
                  }}
                >
                  <Surface elevation={1} padding="md" border>
                    <HStack justify="between" align="center">
                      <VStack gap="xxs">
                        <Text variant="body" weight="semibold">
                          Show Tappable Toast
                        </Text>
                        <Text variant="caption" tone="secondary">
                          Tapping triggers onPress callback & dismisses
                        </Text>
                      </VStack>
                      <Text variant="footnote" tone="accent" weight="medium">
                        Trigger →
                      </Text>
                    </HStack>
                  </Surface>
                </PressableCard>

                {toastFeedback ? (
                  <View
                    style={[
                      styles.toastFeedbackBox,
                      { backgroundColor: theme.surface.sunken, borderColor: theme.border.subtle },
                    ]}
                  >
                    <Text variant="caption" tone="accent" weight="medium">
                      {`Feedback: ${toastFeedback}`}
                    </Text>
                  </View>
                ) : null}
              </VStack>
            </VStack>
          </VStack>
        </Section>

        {/* Section 15: Skeleton Loading Placeholders */}
        <Section title="Skeleton Loading Placeholders (delayMs={0})" borderBottomColor={theme.border.subtle}>
          <VStack gap="xl">
            <VStack gap="xs">
              <Text variant="caption" tone="secondary" weight="semibold">
                1 LINE SKELETON
              </Text>
              <View
                style={[
                  styles.cardScaffolding,
                  { backgroundColor: theme.surface.raised, borderColor: theme.border.subtle },
                ]}
              >
                <SkeletonText lines={1} delayMs={0} />
              </View>
            </VStack>

            <VStack gap="xs">
              <Text variant="caption" tone="secondary" weight="semibold">
                3 LINES SKELETON (DEFAULT)
              </Text>
              <View
                style={[
                  styles.cardScaffolding,
                  { backgroundColor: theme.surface.raised, borderColor: theme.border.subtle },
                ]}
              >
                <SkeletonText lines={3} delayMs={0} />
              </View>
            </VStack>

            <VStack gap="xs">
              <Text variant="caption" tone="secondary" weight="semibold">
                6 LINES SKELETON
              </Text>
              <View
                style={[
                  styles.cardScaffolding,
                  { backgroundColor: theme.surface.raised, borderColor: theme.border.subtle },
                ]}
              >
                <SkeletonText lines={6} delayMs={0} />
              </View>
            </VStack>
          </VStack>
        </Section>

        {/* Section 16: Empty States */}
        <Section title="EmptyState Configurations" borderBottomColor={theme.border.subtle}>
          <VStack gap="xl">
            <VStack gap="xs">
              <Text variant="caption" tone="secondary" weight="semibold">
                1. LIBRARY EMPTY STATE (TITLE + MESSAGE)
              </Text>
              <View
                style={[
                  styles.cardScaffolding,
                  { backgroundColor: theme.surface.raised, borderColor: theme.border.subtle },
                ]}
              >
                <EmptyState
                  title="Nothing here yet."
                  message="Chapters turns a PDF into a handful of short reads."
                />
              </View>
            </VStack>

            <VStack gap="xs">
              <Text variant="caption" tone="secondary" weight="semibold">
                2. CHAPTER EMPTY STATE (MESSAGE ONLY)
              </Text>
              <View
                style={[
                  styles.cardScaffolding,
                  { backgroundColor: theme.surface.raised, borderColor: theme.border.subtle },
                ]}
              >
                <EmptyState message="No text blocks found in this chapter." />
              </View>
            </VStack>
          </VStack>
        </Section>
      </ScrollView>

      {/* Gallery Sample Sheet */}
      <Sheet visible={sheetOpen} onDismiss={() => setSheetOpen(false)} testID="gallery-sample-sheet">
        <VStack gap="md">
          <Text variant="subhead" weight="semibold">
            Sample Bottom Sheet Content
          </Text>
          <Text variant="body" tone="secondary">
            This sheet demonstrates drag-to-dismiss velocity tracking, backdrop blur tinting, and bottom safe-area inset padding.
          </Text>
          <PressableCard radius="md" onPress={() => setSheetOpen(false)}>
            <Surface elevation={1} padding="md" border>
              <Text variant="body" weight="medium" align="center" tone="accent">
                Dismiss Sheet
              </Text>
            </Surface>
          </PressableCard>
        </VStack>
      </Sheet>

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
  onAccentIconContainer: {
    padding: space[8],
    borderRadius: radius.md,
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
  toastFeedbackBox: {
    padding: space[12],
    borderRadius: radius.sm,
    borderWidth: 1,
  },
});
