import { useState } from 'react';
import ShiftTooltip from '@/components/shifts/ShiftTooltip';
import { expandShift } from '@/lib/shiftRepeat';
import { localDateKey, occurrenceKey } from '@/lib/ponto';

const DAY_MS = 86400000;
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HOURS = [0, 4, 8, 12, 16, 20];
const OTHER_COLORS = ['var(--c5)', 'var(--c6)', 'var(--c14)'];
const OWN_COLOR = 'var(--c1)';

const colorFor = (usuarioId) => {
  const key = String(usuarioId || '');
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % 9973;
  }
  return OTHER_COLORS[hash % OTHER_COLORS.length];
};

const assignLanes = (items) => {
  const sorted = [...items].sort((a, b) => a.start - b.start);
  const result = [];
  let cluster = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    const laneEnds = [];
    cluster.forEach((item) => {
      let lane = laneEnds.findIndex((end) => end <= item.start);
      if (lane === -1) {
        laneEnds.push(item.end);
        lane = laneEnds.length - 1;
      } else {
        laneEnds[lane] = item.end;
      }
      item.lane = lane;
    });
    const lanes = Math.max(laneEnds.length, 1);
    cluster.forEach((item) => {
      item.lanes = lanes;
      result.push(item);
    });
    cluster = [];
    clusterEnd = -Infinity;
  };

  sorted.forEach((item) => {
    if (cluster.length && item.start >= clusterEnd) flush();
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.end);
  });
  if (cluster.length) flush();

  return result;
};

const buildBlocks = (days, shifts, pontoIndex) => {
  const windowStart = days[0].getTime();
  const windowEnd = days[days.length - 1].getTime() + DAY_MS;
  const occurrences = shifts.flatMap((shift) => expandShift(shift, windowStart, windowEnd));

  return days.map((day) => {
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
    const dayEnd = dayStart + DAY_MS;
    const items = [];
    const seen = new Set();

    occurrences.forEach((occurrence) => {
      const from = Math.max(occurrence.start, dayStart);
      const to = Math.min(occurrence.end, dayEnd);
      if (to <= from) return;
      const key = `${occurrence.shift.id}-${dayStart}`;
      if (seen.has(key)) return;
      seen.add(key);
      const dateKey = localDateKey(occurrence.start);
      items.push({
        key,
        shift: occurrence.shift,
        ponto: pontoIndex?.[occurrenceKey(occurrence.shift.id, dateKey)] || null,
        start: from,
        end: to,
        top: ((from - dayStart) / DAY_MS) * 100,
        height: Math.max(((to - from) / DAY_MS) * 100, 1.5),
      });
    });

    return assignLanes(items);
  });
};

export default function WeekGrid({ days, shifts, userId, chatterNames = {}, pontoIndex }) {
  const [hover, setHover] = useState(null);
  const blocksByDay = buildBlocks(days, shifts, pontoIndex);
  const totalBlocks = blocksByDay.reduce((sum, list) => sum + list.length, 0);

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '32px repeat(7, 1fr)',
          flexShrink: 0,
        }}
      >
        <div />
        {days.map((day) => {
          const isToday = new Date().toDateString() === day.toDateString();
          return (
            <div
              key={day.toISOString()}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, paddingBottom: 6 }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: 'var(--c2)',
                  opacity: 0.5,
                }}
              >
                {WEEKDAYS[day.getDay()]}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: isToday ? 'var(--c1)' : 'var(--c3)',
                  fontWeight: isToday ? 700 : 400,
                }}
              >
                {String(day.getDate()).padStart(2, '0')}/{String(day.getMonth() + 1).padStart(2, '0')}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '32px repeat(7, 1fr)',
            height: '100%',
          }}
        >
          <div style={{ position: 'relative' }}>
            {HOURS.map((hour) => (
              <span
                key={hour}
                style={{
                  position: 'absolute',
                  top: `${(hour / 24) * 100}%`,
                  fontSize: 10,
                  color: 'var(--c2)',
                  opacity: 0.5,
                  fontWeight: 600,
                  lineHeight: 1,
                }}
              >
                {String(hour).padStart(2, '0')}
              </span>
            ))}
          </div>

          {blocksByDay.map((blocks, index) => (
            <div key={days[index].toISOString()} style={{ position: 'relative', height: '100%' }}>
              {blocks.map((block) => {
                const shift = block.shift;
                const isOwn = shift.usuario_id && shift.usuario_id === userId;
                const isLive = shift.status === 'em_andamento';
                const baseColor = isLive ? 'var(--c16)' : isOwn ? OWN_COLOR : colorFor(shift.usuario_id);

                const style = {
                  position: 'absolute',
                  top: `${block.top}%`,
                  height: `${block.height}%`,
                  left: `calc(2px + (100% - 4px) * ${block.lane} / ${block.lanes})`,
                  width: `calc((100% - 4px) / ${block.lanes})`,
                  borderRadius: 8,
                  transition: 'box-shadow 0.15s',
                  cursor: 'default',
                };

                if (isLive) {
                  style.background = 'var(--c16-bg)';
                  style.border = '1px solid var(--c16-border)';
                  style.borderRadius = '8px 8px 0 0';
                } else if (isOwn) {
                  style.background = 'color-mix(in srgb, var(--c1) 30%, transparent)';
                  style.border = '1px solid color-mix(in srgb, var(--c1) 50%, transparent)';
                } else {
                  style.background = `color-mix(in srgb, ${baseColor} 12%, transparent)`;
                }

                if (hover && hover.key === block.key) {
                  style.boxShadow = `0 0 12px 3px color-mix(in srgb, ${baseColor} 45%, transparent)`;
                }

                return (
                  <div
                    key={block.key}
                    style={style}
                    onMouseEnter={(event) =>
                      setHover({
                        key: block.key,
                        shift,
                        ponto: block.ponto,
                        x: event.clientX,
                        y: event.clientY,
                      })
                    }
                    onMouseMove={(event) =>
                      setHover((prev) =>
                        prev && prev.key === block.key
                          ? { ...prev, x: event.clientX, y: event.clientY }
                          : prev
                      )
                    }
                    onMouseLeave={() => setHover(null)}
                  >
                    {block.ponto?.entrada && (
                      <span
                        style={{
                          position: 'absolute',
                          left: 4,
                          bottom: 4,
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          background: block.ponto.saida ? 'var(--c2)' : 'var(--c16)',
                          pointerEvents: 'none',
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {totalBlocks === 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              color: 'var(--c2)',
              opacity: 0.6,
              pointerEvents: 'none',
            }}
          >
            Nenhum turno nesta semana
          </div>
        )}
      </div>

      <ShiftTooltip
        shift={hover?.shift}
        ponto={hover?.ponto}
        name={hover?.shift ? chatterNames[hover.shift.usuario_id] : ''}
        x={hover?.x}
        y={hover?.y}
      />
    </>
  );
}