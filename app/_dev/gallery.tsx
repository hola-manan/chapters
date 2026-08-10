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
 * Its only job is to put the three candidate reading faces and the three candidate
 * paper colours in front of a real eye, set in real book text, on real hardware.
 * It is replaced by the actual component gallery once the tokens are decided.
 */

const FACES = [
  { key: 'literata', label: 'Literata', regular: 'Literata_400Regular', semi: 'Literata_600SemiBold' },
  { key: 'newsreader', label: 'Newsreader', regular: 'Newsreader_400Regular', semi: 'Newsreader_600SemiBold' },
  { key: 'source', label: 'Source Serif 4', regular: 'SourceSerif4_400Regular', semi: 'SourceSerif4_600SemiBold' },
] as const;

const PAPERS = [
  { key: 'warm', label: 'Warm', bg: '#FAF8F4', ink: '#1C1917', muted: '#6B6560' },
  { key: 'white', label: 'White', bg: '#FFFFFF', ink: '#111111', muted: '#6E6E73' },
  { key: 'cool', label: 'Cool', bg: '#F7F8FA', ink: '#14171A', muted: '#61676E' },
] as const;

const SIZES = [16, 17, 18, 19, 20] as const;

// Used only when no book has been imported yet.
const FALLBACK: string[] = [
  'Import a book and this chooser will use its actual text instead of this placeholder. Real sentences matter here: the texture of a typeface only shows across a full paragraph, in the words you will actually be reading.',
  'What you are looking for is not which one is prettiest in isolation. It is which one you stop noticing first. A reading face succeeds when it becomes invisible after a paragraph or two, and fails when some detail keeps catching your eye.',
  'Compare them at the size you would actually read at, in the light you would actually read in. Then look away, look back, and see which one your eye settles into without effort.',
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

  // Defaults are the decisions already made: 19pt, 1.45 leading, cool paper.
  const [mode, setMode] = useState<'read' | 'compare'>('compare');
  const [faceIdx, setFaceIdx] = useState(0);
  const [paperIdx, setPaperIdx] = useState(2);
  const [sizeIdx, setSizeIdx] = useState(3);
  const [leading, setLeading] = useState(1.45);
  const [paragraphs, setParagraphs] = useState<string[] | null>(null);
  const [sourceLabel, setSourceLabel] = useState('placeholder text');

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
          setSourceLabel(`${book.title} — ${chapter.title}`);
        }
      } catch {
        // fall through to placeholder
      }
    })();
  }, []);

  const face = FACES[faceIdx];
  const paper = PAPERS[paperIdx];
  const size = SIZES[sizeIdx];
  const body = paragraphs ?? FALLBACK;

  const textStyle = useMemo(
    () => ({
      fontFamily: face.regular,
      fontSize: size,
      lineHeight: Math.round(size * leading),
      color: paper.ink,
    }),
    [face, size, leading, paper]
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
            <Text style={[styles.chapterTitle, { fontFamily: face.semi, color: paper.ink }]}>
              {sourceLabel}
            </Text>
            {body.map((p, i) => (
              <Text key={i} style={[textStyle, styles.para]}>
                {p}
              </Text>
            ))}
            <Text style={[styles.footnote, { color: paper.muted }]}>
              {face.label} · {size}pt · {leading.toFixed(2)} leading · {paper.label} paper
            </Text>
          </>
        ) : (
          // Same passage, all three faces, identical size and leading — so the
          // differences are visible directly instead of from memory.
          FACES.map((f) => (
            <View key={f.key} style={styles.compareBlock}>
              <Text style={[styles.compareLabel, { color: paper.muted }]}>{f.label}</Text>
              <Text
                style={{
                  fontFamily: f.regular,
                  fontSize: size,
                  lineHeight: Math.round(size * leading),
                  color: paper.ink,
                }}
              >
                {body[0]}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.controls}>
        <Row
          label="Mode"
          options={['Compare', 'Read']}
          index={mode === 'compare' ? 0 : 1}
          onChange={(i) => setMode(i === 0 ? 'compare' : 'read')}
        />
        <Row
          label="Face"
          options={FACES.map((f) => f.label)}
          index={faceIdx}
          onChange={setFaceIdx}
        />
        <Row
          label="Paper"
          options={PAPERS.map((p) => p.label)}
          index={paperIdx}
          onChange={setPaperIdx}
        />
        <Row
          label="Size"
          options={SIZES.map((s) => `${s}`)}
          index={sizeIdx}
          onChange={setSizeIdx}
        />
        <Row
          label="Lead"
          options={['1.45', '1.55', '1.60', '1.70', '1.80']}
          index={[1.45, 1.55, 1.6, 1.7, 1.8].indexOf(leading)}
          onChange={(i) => setLeading([1.45, 1.55, 1.6, 1.7, 1.8][i])}
        />
      </View>
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
  options: string[];
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
  pageContent: { paddingHorizontal: 24, paddingTop: 64, paddingBottom: 32 },
  chapterTitle: { fontSize: 13, letterSpacing: 0.4, marginBottom: 28, opacity: 0.55 },
  para: { marginBottom: 20 },
  compareBlock: { marginBottom: 34 },
  compareLabel: { fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 },
  footnote: { fontSize: 11, marginTop: 12 },
  // Controls are deliberately utilitarian — they are scaffolding, not design.
  controls: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.12)', padding: 10, gap: 6, backgroundColor: '#EFEFEF' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: { width: 44, fontSize: 11, color: '#555' },
  rowOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#DDD', borderRadius: 4 },
  chipOn: { backgroundColor: '#333' },
  chipText: { fontSize: 12, color: '#333' },
  chipTextOn: { color: '#FFF' },
});
