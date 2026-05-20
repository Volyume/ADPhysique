import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Ellipse, Rect, Path, Line } from 'react-native-svg';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';

// Stylised muscle map. Two figures (front + back) drawn from simple primitives.
// Each muscle region is a tappable shape filled with the volume-status colour.
//
// Co-ordinate system per figure: viewBox 0 0 160 320.
// Front and back are rendered side by side inside a single 360x320 SVG so
// they scale uniformly with the container width.

const FIGURE_WIDTH = 160;
const FIGURE_HEIGHT = 320;
const GAP = 40;
const TOTAL_WIDTH = FIGURE_WIDTH * 2 + GAP;

// Stroke used for body outline + region borders.
function outline(strokeColor) {
  return {
    stroke: strokeColor,
    strokeWidth: 1.25,
    strokeLinejoin: 'round',
    strokeLinecap: 'round',
  };
}

function getFill(volumeByMuscle, muscle) {
  const entry = volumeByMuscle?.[muscle];
  if (!entry || !entry.color) return colors.surface2;
  return entry.color;
}

export default function BodyDiagramHeatmap({ volumeByMuscle = {}, onMuscleTap }) {
  const handle = muscle => () => {
    if (onMuscleTap) onMuscleTap(muscle);
  };

  const stroke = outline(colors.border);
  const silhouetteFill = colors.surface;
  const regionStroke = colors.border;

  const region = muscleKey => ({
    fill: getFill(volumeByMuscle, muscleKey),
    stroke: regionStroke,
    strokeWidth: 0.75,
    onPress: handle(muscleKey),
  });

  return (
    <View style={styles.container}>
      <Svg
        viewBox={`0 0 ${TOTAL_WIDTH} ${FIGURE_HEIGHT}`}
        width="100%"
        height={FIGURE_HEIGHT}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* ============== FRONT VIEW ============== */}
        <G x={0} y={0}>
          {/* Silhouette outline — head, neck, torso, arms, legs */}
          {/* Head */}
          <Ellipse cx={80} cy={26} rx={18} ry={22} fill={silhouetteFill} {...stroke} />
          {/* Body silhouette path: shoulders → arms → waist → legs */}
          <Path
            d="
              M 56 52
              C 50 56, 44 64, 42 72
              L 36 110
              C 34 124, 32 138, 30 154
              C 28 168, 30 178, 34 188
              L 42 192
              C 46 184, 48 172, 50 160
              L 54 132
              L 58 132
              L 56 184
              C 56 220, 58 260, 62 296
              C 64 304, 70 308, 76 308
              L 76 200
              L 84 200
              L 84 308
              C 90 308, 96 304, 98 296
              C 102 260, 104 220, 104 184
              L 102 132
              L 106 132
              L 110 160
              C 112 172, 114 184, 118 192
              L 126 188
              C 130 178, 132 168, 130 154
              C 128 138, 126 124, 124 110
              L 118 72
              C 116 64, 110 56, 104 52
              C 96 48, 88 47, 80 47
              C 72 47, 64 48, 56 52
              Z
            "
            fill={silhouetteFill}
            {...stroke}
          />

          {/* Neck — neutral, non-interactive (no separate landmark) */}
          <Ellipse
            cx={80}
            cy={50}
            rx={8}
            ry={5}
            fill={colors.surface2}
            stroke={regionStroke}
            strokeWidth={0.75}
          />

          {/* Front delts (shoulders) */}
          <Ellipse cx={54} cy={62} rx={11} ry={9} {...region('front_delts')} />
          <Ellipse cx={106} cy={62} rx={11} ry={9} {...region('front_delts')} />

          {/* Chest — two pecs */}
          <Ellipse cx={66} cy={82} rx={14} ry={11} {...region('chest')} />
          <Ellipse cx={94} cy={82} rx={14} ry={11} {...region('chest')} />

          {/* Biceps */}
          <Ellipse cx={42} cy={92} rx={8} ry={16} {...region('biceps')} />
          <Ellipse cx={118} cy={92} rx={8} ry={16} {...region('biceps')} />

          {/* Forearms */}
          <Ellipse cx={36} cy={130} rx={7} ry={18} {...region('forearms')} />
          <Ellipse cx={124} cy={130} rx={7} ry={18} {...region('forearms')} />

          {/* Abs — central column divided into 3 sections */}
          <Rect
            x={70}
            y={96}
            width={20}
            height={42}
            rx={6}
            ry={6}
            {...region('abs')}
          />
          {/* Subtle ab divisions (purely decorative; non-interactive) */}
          <Line x1={80} y1={104} x2={80} y2={132} stroke={regionStroke} strokeWidth={0.5} />
          <Line x1={72} y1={110} x2={88} y2={110} stroke={regionStroke} strokeWidth={0.5} />
          <Line x1={72} y1={122} x2={88} y2={122} stroke={regionStroke} strokeWidth={0.5} />

          {/* Quads */}
          <Ellipse cx={68} cy={196} rx={12} ry={32} {...region('quads')} />
          <Ellipse cx={92} cy={196} rx={12} ry={32} {...region('quads')} />

          {/* Calves (front, smaller — front-of-shin region) */}
          <Ellipse cx={68} cy={266} rx={9} ry={22} {...region('calves')} />
          <Ellipse cx={92} cy={266} rx={9} ry={22} {...region('calves')} />

          {/* Label */}
        </G>

        {/* ============== BACK VIEW ============== */}
        <G x={FIGURE_WIDTH + GAP} y={0}>
          {/* Head */}
          <Ellipse cx={80} cy={26} rx={18} ry={22} fill={silhouetteFill} {...stroke} />
          {/* Body silhouette mirrors the front */}
          <Path
            d="
              M 56 52
              C 50 56, 44 64, 42 72
              L 36 110
              C 34 124, 32 138, 30 154
              C 28 168, 30 178, 34 188
              L 42 192
              C 46 184, 48 172, 50 160
              L 54 132
              L 58 132
              L 56 184
              C 56 220, 58 260, 62 296
              C 64 304, 70 308, 76 308
              L 76 200
              L 84 200
              L 84 308
              C 90 308, 96 304, 98 296
              C 102 260, 104 220, 104 184
              L 102 132
              L 106 132
              L 110 160
              C 112 172, 114 184, 118 192
              L 126 188
              C 130 178, 132 168, 130 154
              C 128 138, 126 124, 124 110
              L 118 72
              C 116 64, 110 56, 104 52
              C 96 48, 88 47, 80 47
              C 72 47, 64 48, 56 52
              Z
            "
            fill={silhouetteFill}
            {...stroke}
          />

          {/* Traps — upper-back triangle (between shoulders, framing the neck) */}
          <Path
            d="M 66 52 L 94 52 L 100 72 L 80 80 L 60 72 Z"
            {...region('traps')}
          />

          {/* Rear delts */}
          <Ellipse cx={52} cy={64} rx={11} ry={9} {...region('rear_delts')} />
          <Ellipse cx={108} cy={64} rx={11} ry={9} {...region('rear_delts')} />

          {/* Back / Lats — broad shape */}
          <Path
            d="
              M 60 76
              C 50 88, 46 104, 50 124
              C 54 138, 64 144, 80 144
              C 96 144, 106 138, 110 124
              C 114 104, 110 88, 100 76
              Z
            "
            {...region('back')}
          />

          {/* Triceps */}
          <Ellipse cx={42} cy={92} rx={8} ry={16} {...region('triceps')} />
          <Ellipse cx={118} cy={92} rx={8} ry={16} {...region('triceps')} />

          {/* Forearms (back) */}
          <Ellipse cx={36} cy={130} rx={7} ry={18} {...region('forearms')} />
          <Ellipse cx={124} cy={130} rx={7} ry={18} {...region('forearms')} />

          {/* Glutes — two rounded rects */}
          <Rect x={56} y={150} width={22} height={26} rx={10} ry={10} {...region('glutes')} />
          <Rect x={82} y={150} width={22} height={26} rx={10} ry={10} {...region('glutes')} />

          {/* Hamstrings */}
          <Ellipse cx={68} cy={208} rx={12} ry={28} {...region('hamstrings')} />
          <Ellipse cx={92} cy={208} rx={12} ry={28} {...region('hamstrings')} />

          {/* Calves (back) */}
          <Ellipse cx={68} cy={266} rx={10} ry={22} {...region('calves')} />
          <Ellipse cx={92} cy={266} rx={10} ry={22} {...region('calves')} />
        </G>
      </Svg>

      {/* Figure labels */}
      <View style={styles.labelRow}>
        <Text style={styles.figureLabel}>Front</Text>
        <Text style={styles.figureLabel}>Back</Text>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <LegendSwatch color={colors.textMuted} label="Below MEV" />
        <LegendSwatch color={colors.success} label="Optimal" />
        <LegendSwatch color={colors.warning} label="Approaching MRV" />
        <LegendSwatch color={colors.error} label="Over MRV" />
        <LegendSwatch color={colors.surface2} label="No data" bordered />
      </View>
    </View>
  );
}

function LegendSwatch({ color, label, bordered }) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.swatch,
          { backgroundColor: color },
          bordered && { borderWidth: 1, borderColor: colors.border },
        ]}
      />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.xl,
  },
  figureLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
