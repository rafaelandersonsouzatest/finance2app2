import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Defs, Pattern, Circle, Text as SvgText } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import { useVisibility } from '../contexts/VisibilityContext';
import { useMembros } from '../hooks/useMembros';
import AvatarRenderer from './AvatarRenderer';

// --- Funções Auxiliares (geometria do donut) ---
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

export default function SecaoEntradas({ entradas = [] }) {
  const { formatValue } = useVisibility();
  // 🔹 Fonte única de Membros (mesma usada pelo resto do app) — necessária
  // para resolver o avatar de cada grupo a partir do membroId.
  const { membros } = useMembros();

  // 🔹 Agrupamento por `membroId` quando disponível — referência estável
  // (Sprint 5, ver SPRINT5_DISCOVERY.md seção 4.3.3). `membroNome`/`membro`
  // (nome) só entram como fallback para lançamentos antigos, criados antes
  // do incremento 3, que ainda não têm `membroId`. Antes deste refactor, o
  // agrupamento usava só o nome em texto — se um Membro fosse renomeado, as
  // entradas antigas e novas apareciam como duas pessoas diferentes aqui.
  const normalizedEntradas = useMemo(() => {
    return entradas.map((i) => {
      const membroReal = i.membroId ? membros.find((m) => m.id === i.membroId) : null;
      const chave = i.membroId || i.membroNome || i.membro || 'Desconhecido';
      const nome = membroReal?.nome || i.membroNome || i.membro || 'Desconhecido';

      return {
        chave: String(chave),
        nome,
        avatar: membroReal?.avatar || null,
        amount: Number(i.valor ?? 0),
        paid: i.pago === true,
      };
    });
  }, [entradas, membros]);

  const groupedByMember = useMemo(() => {
    return normalizedEntradas.reduce((acc, it) => {
      if (!acc[it.chave]) {
        acc[it.chave] = { nome: it.nome, avatar: it.avatar, total: 0, paid: 0, awaiting: 0 };
      }
      acc[it.chave].total += it.amount;
      if (it.paid) acc[it.chave].paid += it.amount;
      else acc[it.chave].awaiting += it.amount;
      return acc;
    }, {});
  }, [normalizedEntradas]);

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
      .forEach(([chave, vals], idx) => {
        const ratio = vals.paid / totalPrevisto;
        const sweep = ratio * 360;
        const endAngle = angleStart + sweep;

        segs.push({
          key: `seg-${chave}`,
          path: createDonutSegmentPath(CX, CY, OUTER_R, INNER_R, angleStart, endAngle),
          fill: PALETTE[idx % PALETTE.length],
          opacity: 1,
        });

        avatars.push({
          chave,
          nome: vals.nome,
          avatar: vals.avatar,
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
    <View style={[globalStyles.card, globalStyles.mb4]}>
      <Text style={globalStyles.subtitle}>Entradas</Text>

      <View
        style={[
          globalStyles.donutWrapper,
          { width: SIZE, height: SIZE, position: 'relative', alignSelf: 'center' },
        ]}
      >
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

          {avatarData.map((avatar) => {
            const textYPosition = avatar.position.y + AVATAR_SIZE / 2 + 10;
            return (
              <React.Fragment key={`pct-${avatar.chave}`}>
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

        {/* 🔹 Avatares sobrepostos ao donut via View absoluta, na mesma
            posição polar calculada acima — o avatar vetorial (AvatarRenderer.js)
            não pode ser embutido como filho direto de <Svg> (é composto por
            View/SvgXml, não só primitivas SVG), diferente da imagem estática
            fixa que existia antes aqui.

            Importante: este overlay precisa ter o MESMO tamanho/origem do
            <Svg> (top:0, left:0, width/height = SIZE) — sem isso, o
            posicionamento fica sujeito ao alignItems/justifyContent do
            wrapper (que centraliza filhos "de fluxo", não filhos
            absolutos), e a posição calculada em coordenadas do Svg deixa de
            corresponder à posição real na tela — foi essa a causa do
            desalinhamento reportado após a troca de <Image> para
            <AvatarRenderer>. Center do avatar (não canto superior esquerdo)
            é sempre `position.{x,y}` menos a metade do tamanho usado — já
            generaliza para qualquer AVATAR_SIZE (mini/circle/futuros). */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, width: SIZE, height: SIZE }}
        >
          {avatarData.map((avatar) => (
            <View
              key={`avatar-${avatar.chave}`}
              style={{
                position: 'absolute',
                left: avatar.position.x - AVATAR_SIZE / 2,
                top: avatar.position.y - AVATAR_SIZE / 2,
              }}
            >
              <AvatarRenderer avatar={avatar.avatar} nome={avatar.nome} tamanho={AVATAR_SIZE} />
            </View>
          ))}
        </View>

        <View style={[globalStyles.centerContent, { position: 'absolute' }]}>
          <Text style={globalStyles.textSecondary}>Recebido</Text>
          <Text style={[globalStyles.value, globalStyles.valorEentrada, { fontSize: 22 }]}>
            {formatValue(totalRealizado)}
          </Text>
          <Text style={globalStyles.miniCardNote}>
            de {formatValue(totalPrevisto)}
          </Text>
        </View>
      </View>

      <View style={globalStyles.mt16}>
        {Object.keys(groupedByMember).length === 0 ? (
          <Text style={globalStyles.noDataText}>Nenhuma entrada registrada.</Text>
        ) : (
          Object.entries(groupedByMember).map(([chave, vals]) => {
            const isFullyPaid = vals.awaiting === 0 && vals.total > 0;

            return (
              <View
                key={`row-${chave}`}
                style={[
                  globalStyles.investmentItem,
                  globalStyles.rowBetween,
                  globalStyles.alignCenter,
                  globalStyles.mb12,
                  !isFullyPaid && globalStyles.itemPendente,
                ]}
              >
                <View style={[globalStyles.row, globalStyles.alignCenter]}>
                  <AvatarRenderer avatar={vals.avatar} nome={vals.nome} variante="mini" />
                  <Text style={[globalStyles.text, { marginLeft: 8 }]}>{vals.nome}</Text>
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
                  {formatValue(vals.total)}
                </Text>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}
