import React, { useMemo } from 'react';
import { View, Text, Image } from 'react-native';
import Svg, { Path, Defs, Pattern, Circle, Image as SvgImage, Text as SvgText } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import { useVisibility } from '../contexts/VisibilityContext'; // 👈 novo

// --- Funções Auxiliares ---
const memberImages = {
  rafael: require('../../assets/Rafael.png'),
  kezzia: require('../../assets/Kézzia.png'),
  default: require('../../assets/default.png'),
};

const normalize = (str = '') =>
  str.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

const polarToCartesian = (cx, cy, r, angleDeg) => {
  const angleInRadians = ((angleDeg - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
};

const createDonutSegmentPath = (cx, cy, outerR, innerR, startAngle, endAngle) => {
  if (endAngle - startAngle >= 360) endAngle = startAngle + 359.99;
  if (endAngle <= startAngle) endAngle = startAngle + 0.0001;
  const startOuter = polarToCartesian(cx, cy, outerR, endAngle);
  const endOuter = polarToCartesian(cx, cy, outerR, startAngle);
  const startInner = polarToCartesian(cx, cy, innerR, endAngle);
  const endInner = polarToCartesian(cx, cy, innerR, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M',
    startOuter.x,
    startOuter.y,
    'A',
    outerR,
    outerR,
    0,
    largeArcFlag,
    0,
    endOuter.x,
    endOuter.y,
    'L',
    endInner.x,
    endInner.y,
    'A',
    innerR,
    innerR,
    0,
    largeArcFlag,
    1,
    startInner.x,
    startInner.y,
    'Z',
  ].join(' ');
};
// --- Fim das Funções Auxiliares ---

export default function SecaoEntradas({ incomes = [] }) {
  const { formatValue } = useVisibility(); // 👈 usar contexto

  const normalizedIncomes = useMemo(() => {
    return incomes.map((i) => ({
      member: i.member || i.membro || i.fonte || i.source || 'Desconhecido',
      amount: Number(i.amount ?? i.valor ?? 0),
      paid: i.pago === true,
    }));
  }, [incomes]);

  const groupedByMember = useMemo(() => {
    return normalizedIncomes.reduce((acc, it) => {
      const key = it.member;
      if (!acc[key]) acc[key] = { total: 0, paid: 0, awaiting: 0 };
      acc[key].total += it.amount;
      if (it.paid) acc[key].paid += it.amount;
      else acc[key].awaiting += it.amount;
      return acc;
    }, {});
  }, [normalizedIncomes]);

  const totalRealizado = useMemo(
    () => Object.values(groupedByMember).reduce((sum, v) => sum + v.paid, 0),
    [groupedByMember]
  );
  const totalPrevisto = useMemo(
    () => Object.values(groupedByMember).reduce((sum, v) => sum + v.total, 0),
    [groupedByMember]
  );
  const hasEntries = totalPrevisto > 0;

  const SIZE = 200;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const OUTER_R = 90;
  const INNER_R = 55;
  const AVATAR_RADIUS = (OUTER_R + INNER_R) / 2;
  const AVATAR_SIZE = 36;
  const PALETTE = [colors.chartBlue, colors.chartPurple, colors.iconGreen, colors.iconRed];

  const { segments, avatarData } = useMemo(() => {
    if (!hasEntries) return { segments: [], avatarData: [] };

    let angleStart = 0;
    const segs = [];
    const avatars = [];

    Object.entries(groupedByMember)
      .filter(([_, v]) => v.paid > 0)
      .forEach(([name, vals], idx) => {
        const ratio = vals.paid / totalPrevisto;
        const sweep = ratio * 360;
        const endAngle = angleStart + sweep;

segs.push({
  key: `seg-${name}`,
  path: createDonutSegmentPath(CX, CY, OUTER_R, INNER_R, angleStart, endAngle),
  fill: PALETTE[idx % PALETTE.length],
  opacity: 1,
});

        avatars.push({
          name: name,
          position: polarToCartesian(CX, CY, AVATAR_RADIUS, angleStart + sweep / 2),
          percentage: (vals.paid / totalPrevisto) * 100,
        });

        angleStart = endAngle;
      });

    const totalAguardando = totalPrevisto - totalRealizado;
    if (totalAguardando > 0) {
      const pendingPath = createDonutSegmentPath(CX, CY, OUTER_R, INNER_R, angleStart, 360);
      segs.push({ key: 'pending-bg', path: pendingPath, fill: colors.border, opacity: 0.3 });
      segs.push({ key: 'pending-pattern', path: pendingPath, fill: 'url(#dotted)', opacity: 1 });
    }
    return { segments: segs, avatarData: avatars };
  }, [groupedByMember, totalPrevisto, totalRealizado]);

  return (
    <View style={globalStyles.card}>
      <Text style={globalStyles.subtitle}>Entradas</Text>

      <View style={globalStyles.donutWrapper}>
        <Svg width={SIZE} height={SIZE}>
          <Defs>
            <Pattern id="dotted" patternUnits="userSpaceOnUse" width="10" height="10">
              <Circle cx="2" cy="2" r="1.5" fill={colors.border} />
            </Pattern>
          </Defs>

          {!hasEntries ? (
            <Path
              d={createDonutSegmentPath(CX, CY, OUTER_R, INNER_R, 0, 360)}
              fill={colors.border}
              opacity={0.3}
            />
          ) : (
            segments.map((s) => <Path key={s.key} d={s.path} fill={s.fill} opacity={s.opacity} />)
          )}

          {avatarData.map((avatar, i) => {
            const norm = normalize(avatar.name);
            const img = memberImages[norm] || memberImages.default;
            const textYPosition = avatar.position.y + AVATAR_SIZE / 2 + 10;

            return (
              <React.Fragment key={`avatar-group-${i}`}>
                <SvgImage
                  href={img}
                  x={avatar.position.x - AVATAR_SIZE / 2}
                  y={avatar.position.y - AVATAR_SIZE / 2}
                  width={AVATAR_SIZE}
                  height={AVATAR_SIZE}
                />
                <SvgText
                  x={avatar.position.x}
                  y={textYPosition}
                  fill={colors.cardBackground}
                  stroke={colors.cardBackground}
                  strokeWidth="2"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {avatar.percentage.toFixed(0)}%
                </SvgText>
                <SvgText
                  x={avatar.position.x}
                  y={textYPosition}
                  fill={colors.textPrimary}
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {avatar.percentage.toFixed(0)}%
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>

        <View style={[globalStyles.centerContent, { position: 'absolute' }]}>
          <Text style={globalStyles.textSecondary}>Recebido</Text>
          <Text style={[globalStyles.value, globalStyles.valueIncome, { fontSize: 22 }]}>
            {formatValue(totalRealizado)} {/* 👈 antes usava toLocaleString */}
          </Text>
          <Text style={globalStyles.miniCardNote}>
            de {formatValue(totalPrevisto)} {/* 👈 idem */}
          </Text>
        </View>
      </View>

      <View style={globalStyles.mt16}>
        {Object.keys(groupedByMember).length === 0 ? (
          <Text style={globalStyles.noDataText}>Nenhuma entrada registrada.</Text>
        ) : (
          Object.entries(groupedByMember).map(([name, vals], idx) => {
            const norm = normalize(name);
            const img = memberImages[norm] || memberImages.default;
            const isFullyPaid = vals.awaiting === 0 && vals.total > 0;

            return (
              <View
                key={`row-${idx}`}
                style={[
                  globalStyles.investmentItem,
                  globalStyles.rowBetween,
                  globalStyles.alignCenter,
                  globalStyles.mb12,
                  !isFullyPaid && globalStyles.itemPendente,
                ]}
              >
                <View style={[globalStyles.row, globalStyles.alignCenter]}>
                  <Image source={img} style={globalStyles.listAvatar} />
                  <Text style={globalStyles.text}>{name}</Text>
                  {vals.total > 0 && (
                    <MaterialCommunityIcons
                      name={isFullyPaid ? 'check-circle' : 'clock-outline'}
                      size={16}
                      color={isFullyPaid ? colors.balance : colors.pending}
                      style={{ marginLeft: 6 }}
                    />
                  )}
                </View>
                <Text
                  style={[
                    globalStyles.value,
                    { color: isFullyPaid ? colors.balance : colors.textPrimary },
                  ]}
                >
                  {formatValue(vals.total)} {/* 👈 antes usava toLocaleString */}
                </Text>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}
