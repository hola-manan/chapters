import { useFonts } from 'expo-font';
import { Literata_400Regular, Literata_600SemiBold } from '@expo-google-fonts/literata';
import { Newsreader_400Regular, Newsreader_600SemiBold } from '@expo-google-fonts/newsreader';
import {
  SourceSerif4_400Regular,
  SourceSerif4_600SemiBold,
} from '@expo-google-fonts/source-serif-4';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Block } from '../../pdf/types.ts';
import { listBooks } from '../../storage/index.ts';

/**
 * TEMPORARY CHOOSER — not a component, not a design.
 * Puts candidate tokens in front of a real eye, in real book text, on real hardware.
 * Replaced by the actual component gallery once the tokens are decided.
 *
 * Decided so far: Source Serif 4 · 19pt · 1.45 leading · cool paper · one restrained accent.
 * Open: ink colour, accent colour.
 */

const FACES = [
  { key: 'literata', label: 'Literata', regular: 'Literata_400Regular', semi: 'Literata_600SemiBold' },
  { key: 'newsreader', label: 'Newsreader', regular: 'Newsreader_400Regular', semi: 'Newsreader_600SemiBold' },
  { key: 'source', label: 'Source Serif', regular: 'SourceSerif4_400Regular', semi: 'SourceSerif4_600SemiBold' },
] as const;

const PAPERS = [
  { key: 'cool', label: 'Cool', bg: '#F7F8FA' },
  { key: 'warm', label: 'Warm', bg: '#FAF8F4' },
  { key: 'white', label: 'White', bg: '#FFFFFF' },
] as const;

// Safe near-blacks first, then genuinely bold inks. Historically printed ink was
// rarely pure black — blue-blacks and brown-blacks are the traditional choices.
const INKS = [
  { key: 'blueblack', label: 'Blue-black', ink: '#12171F', muted: '#6B7280' },
  { key: 'neutral', label: 'Neutral', ink: '#15171A', muted: '#6E7176' },
  { key: 'navy', label: 'Ink navy', ink: '#16233A', muted: '#5E6B80' },
  { key: 'teal', label: 'Deep teal', ink: '#0E2126', muted: '#5A6E72' },
  { key: 'forest', label: 'Forest', ink: '#142621', muted: '#5C7169' },
  { key: 'espresso', label: 'Espresso', ink: '#241C16', muted: '#75695E' },
  { key: 'plum', label: 'Plum', ink: '#1E1424', muted: '#6F6076' },
  { key: 'black', label: 'True black', ink: '#000000', muted: '#6E6E73' },
] as const;

const ACCENTS = [
  { key: 'signal', label: 'Signal blue', color: '#2563EB' },
  { key: 'ink', label: 'Ink blue', color: '#3A5A8C' },
  { key: 'rust', label: 'Rust', color: '#B4530F' },
  { key: 'crimson', label: 'Crimson', color: '#A81E2D' },
  { key: 'teal', label: 'Teal', color: '#0F766E' },
  { key: 'violet', label: 'Violet', color: '#6D40C4' },
] as const;

const SIZES = [16, 17, 18, 19, 20] as const;
const LEADINGS = [1.35, 1.45, 1.55, 1.65, 1.75] as const;

const FALLBACK: string[] = [
  'Import a book and this chooser will use its actual text instead of this placeholder. Real sentences matter here: the texture of ink on paper only shows across a full paragraph, in the words you will actually be reading.',
  'A bold ink is not the same as a loud one. Deep navy, forest and espresso all read as black at a glance and only reveal their colour when you look for it, or when they sit next to true black.',
  'Judge the accent by how rarely you notice it, not by how much you like the colour. It is the only colour on the screen, so it will always draw the eye — the question is whether it draws it somewhere useful.',
];

export default function Gallery() {
  const [fontsLoaded] = useFonts({
    Literata_400Regular,
    Literata_600SemiBold,
    Newsreader_400Regular,
    Newsreader_600SemiBold,
    SourceSerif4_400Regular,
    SourceSerif4_600SemiBold,
  });

  const [mode, setMode] = useState<'read' | 'inks'>('read');
  const [faceIdx, setFaceIdx] = useState(2); // Source Serif 4 — decided
  const [paperIdx, setPaperIdx] = useState(0); // Cool — decided
  const [inkIdx, setInkIdx] = useState(0);
  const [accentIdx, setAccentIdx] = useState(0);
  const [sizeIdx, setSizeIdx] = useState(3); // 19pt — decided
  const [leadIdx, setLeadIdx] = useState(1); // 1.45 — decided
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

  const face = FACES[faceIdx];
  const paper = PAPERS[paperIdx];
  const ink = INKS[inkIdx];
  const accent = ACCENTS[accentIdx];
  const size = SIZES[sizeIdx];
  const leading = LEADINGS[leadIdx];
  const body = paragraphs ?? FALLBACK;

  const textStyle = useMemo(
    () => ({
      fontFamily: face.regular,
      fontSize: size,
      lineHeight: Math.round(size * leading),
      color: ink.ink,
    }),
    [face, size, leading, ink]
  );

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <Text>Loading faces…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: paper.bg }]}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator={false}
      >
        {mode === 'read' ? (
          <>
            <Text style={[styles.eyebrow, { color: ink.muted }]}>CHAPTER 3</Text>
            <Text style={[styles.title, { fontFamily: face.semi, color: ink.ink }]}>
              {sourceLabel}
            </Text>
            {body.map((p, i) => (
              <Text key={i} style={[textStyle, styles.para]}>
                {p}
              </Text>
            ))}

            {/* The accent, shown in use rather than as a swatch — it is the only
                colour on the screen, so this is the only honest way to judge it. */}
            <View style={[styles.rule, { backgroundColor: ink.muted }]} />
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { backgroundColor: accent.color }]} />
            </View>
            <Text style={[styles.meta, { color: ink.muted }]}>4 min left</Text>
            <Text style={[styles.nextLink, { fontFamily: face.semi, color: accent.color }]}>
              Next — Chapter 4
            </Text>
            <Text style={[styles.footnote, { color: ink.muted }]}>
              {face.label} · {size}pt · {leading.toFixed(2)} · {ink.label} on {paper.label} ·{' '}
              {accent.label}
            </Text>
          </>
        ) : (
          // Same passage in every ink, so the colours can be compared directly
          // instead of from memory.
          INKS.map((k) => (
            <View key={k.key} style={styles.compareBlock}>
              <Text style={[styles.compareLabel, { color: k.muted }]}>{k.label}</Text>
              <Text
                style={{
                  fontFamily: face.regular,
                  fontSize: size,
                  lineHeight: Math.round(size * leading),
                  color: k.ink,
                }}
              >
                {body[0]}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <ScrollView style={styles.controls} contentContainerStyle={styles.controlsContent}>
        <Row label="Mode" options={['Read', 'Inks']} index={mode === 'read' ? 0 : 1} onChange={(i) => setMode(i === 0 ? 'read' : 'inks')} />
        <Row label="Ink" options={INKS.map((i) => i.label)} index={inkIdx} onChange={setInkIdx} />
        <Row label="Accent" options={ACCENTS.map((a) => a.label)} index={accentIdx} onChange={setAccentIdx} />
        <Row label="Paper" options={PAPERS.map((p) => p.label)} index={paperIdx} onChange={setPaperIdx} />
        <Row label="Face" options={FACES.map((f) => f.label)} index={faceIdx} onChange={setFaceIdx} />
        <Row label="Size" options={SIZES.map(String)} index={sizeIdx} onChange={setSizeIdx} />
        <Row label="Lead" options={LEADINGS.map((l) => l.toFixed(2))} index={leadIdx} onChange={setLeadIdx} />
      </ScrollView>
    </View>
  );
}

function Row({
  label,
  options,
  index,
  onChange,
}: {
  label: string;
  options: readonly string[];
  index: number;
  onChange: (i: number) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowOptions}>
        {options.map((o, i) => (
          <Pressable
            key={o}
            onPress={() => onChange(i)}
            style={[styles.chip, i === index && styles.chipOn]}
          >
            <Text style={[styles.chipText, i === index && styles.chipTextOn]}>{o}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  page: { flex: 1 },
  pageContent: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 28 },
  eyebrow: { fontSize: 11, letterSpacing: 1.4, marginBottom: 8 },
  title: { fontSize: 26, lineHeight: 32, marginBottom: 24 },
  para: { marginBottom: 18 },
  rule: { height: StyleSheet.hairlineWidth, opacity: 0.3, marginTop: 14, marginBottom: 22 },
  progressTrack: { height: 2, backgroundColor: 'rgba(0,0,0,0.10)', borderRadius: 1 },
  progressFill: { height: 2, width: '62%', borderRadius: 1 },
  meta: { fontSize: 12, marginTop: 8 },
  nextLink: { fontSize: 17, marginTop: 18 },
  footnote: { fontSize: 10, marginTop: 26 },
  compareBlock: { marginBottom: 30 },
  compareLabel: { fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 },
  // Controls are deliberately utilitarian — scaffolding, not design.
  controls: { maxHeight: 210, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.12)', backgroundColor: '#EFEFEF' },
  controlsContent: { padding: 10, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  rowLabel: { width: 46, fontSize: 11, color: '#555', paddingTop: 5 },
  rowOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 },
  chip: { paddingHorizontal: 9, paddingVertical: 5, backgroundColor: '#DDD', borderRadius: 4 },
  chipOn: { backgroundColor: '#333' },
  chipText: { fontSize: 12, color: '#333' },
  chipTextOn: { color: '#FFF' },
});
