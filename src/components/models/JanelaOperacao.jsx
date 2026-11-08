import { useState } from 'react';
import DateTimePicker from '@/components/DateTimePicker';

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const paraData = (texto) => {
  const [hora, minuto] = String(texto || '').split(':').map(Number);
  if (!Number.isFinite(hora)) return null;
  const data = new Date();
  data.setHours(hora, Number.isFinite(minuto) ? minuto : 0, 0, 0);
  return data;
};

const paraTexto = (data) => {
  if (!data) return '';
  return `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
};

const vazio = () => Array.from({ length: 7 }, () => ({}));

const resumo = (valor) => {
  const comJanela = (valor || []).filter((item) => item?.inicio && item?.fim).length;
  if (!comJanela) return '24 horas, todos os dias';
  if (comJanela === 7) return 'janela definida em todos os dias';
  return `janela definida em ${comJanela} dia(s)`;
};

/**
 * Área da modelo na agenda: em que horas do dia ela recebe cobertura.
 *
 * Dia vazio vale 24 horas, que é o padrão. É essa janela que separa
 * "horário sem ninguém" de "fora do expediente da modelo" na agenda.
 */
export default function JanelaOperacao({ valor, onChange }) {
  const [aberto, setAberto] = useState(false);
  const lista = Array.isArray(valor) && valor.length === 7 ? valor : vazio();

  const mexer = (dia, campo, data) => {
    const proximo = lista.map((item, indice) =>
      indice === dia ? { ...item, [campo]: paraTexto(data) } : item
    );
    onChange(proximo);
  };

  const limpar = (dia) => {
    onChange(lista.map((item, indice) => (indice === dia ? {} : item)));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '7px 10px',
          borderRadius: 8,
          border: '1px solid color-mix(in srgb, var(--c2) 16%, transparent)',
          background: 'color-mix(in srgb, var(--c8) 45%, transparent)',
          color: 'var(--c2)',
          fontSize: 10.5,
          fontFamily: 'var(--font-main)',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span>
          Janela de operação ·{' '}
          <span style={{ color: 'var(--c3)' }}>{resumo(lista)}</span>
        </span>
        <span
          style={{
            fontSize: 9,
            opacity: 0.7,
            transform: aberto ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s',
          }}
        >
          {aberto ? '▲' : '▼'}
        </span>
      </button>

      {aberto && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {DIAS.map((dia, indice) => {
            const item = lista[indice] || {};
            const definido = Boolean(item.inicio && item.fim);
            return (
              <div
                key={dia}
                style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}
              >
                <span style={{ fontSize: 10, color: 'var(--c2)', width: 48 }}>{dia}</span>
                <div style={{ width: 96 }}>
                  <DateTimePicker
                    label=""
                    value={paraData(item.inicio)}
                    onChange={(data) => mexer(indice, 'inicio', data)}
                    mode="time"
                  />
                </div>
                <span style={{ fontSize: 10, color: 'var(--c2)', opacity: 0.6 }}>às</span>
                <div style={{ width: 96 }}>
                  <DateTimePicker
                    label=""
                    value={paraData(item.fim)}
                    onChange={(data) => mexer(indice, 'fim', data)}
                    mode="time"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => limpar(indice)}
                  disabled={!definido}
                  title="Voltar para 24 horas"
                  style={{
                    height: 22,
                    padding: '0 8px',
                    borderRadius: 6,
                    border: '1px solid color-mix(in srgb, var(--c2) 16%, transparent)',
                    background: 'transparent',
                    color: definido ? 'var(--c2)' : 'var(--c12)',
                    fontSize: 9.5,
                    fontFamily: 'var(--font-main)',
                    cursor: definido ? 'pointer' : 'default',
                  }}
                >
                  24h
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
