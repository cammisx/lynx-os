import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/AuthContext";
import { iniciaisDe, nomeDe, usePerfil } from "@/lib/perfilUsuario";
import { CONFIRMAR_SAIR, FUNDO_MENU_INICIAR, MENU_INICIAR } from "@/lib/camadas";
import {
  UsersIcon,
  CalendarIcon,
  MoneyIcon,
  BookIcon,
  ImageIcon,
  StarIcon,
  PaletteIcon,
} from "@/components/icons";

const ANIM_MS = 180;

const APPS = [
  {
    id: "chatters",
    Icon: UsersIcon,
    title: "Chatters",
    desc: "Comissões e nomes de exibição",
  },
  {
    id: "modelos",
    Icon: StarIcon,
    title: "Modelos",
    desc: "Gerenciar modelos e chatters",
  },
  {
    id: "turnos",
    Icon: CalendarIcon,
    title: "Turnos",
    desc: "Escala e turnos da equipe",
  },
  {
    id: "financeiro",
    Icon: MoneyIcon,
    title: "Financeiro",
    desc: "Extratos, comissões e repasses",
  },
  {
    id: "playbook",
    Icon: BookIcon,
    title: "Playbook",
    desc: "Diretrizes da agência e das modelos",
  },
  {
    id: "conteudo",
    Icon: ImageIcon,
    title: "Conteúdo",
    desc: "Conteúdos das modelos",
  },
  {
    id: "paint",
    Icon: PaletteIcon,
    title: "Paint",
    desc: "Referência da API de plugins do Paint.NET",
  },
];

/* Playbook e conteúdo são de todo mundo: o chatter vê o da empresa e o das
   modelos dele, e só o admin edita. */
const APPS_CHATTER = APPS.filter((app) => app.id === "playbook" || app.id === "conteudo");

export default function StartMenu({ open, onClose, onOpenApp, onOpenConfig }) {
  const { user, logout } = useAuth();
  const perfil = usePerfil(user);
  const [mounted, setMounted] = useState(open);
  const [confirmarSair, setConfirmarSair] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return undefined;
    }
    if (!mounted) return undefined;
    setClosing(true);
    const timeout = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, ANIM_MS);
    return () => clearTimeout(timeout);
  }, [open, mounted]);

  if (!mounted) return null;

  const displayName = nomeDe(perfil, user);
  const initials = iniciaisDe(displayName);
  const subnick = (perfil.subnick || "").trim();
  const isAdmin = user?.role === "admin";

  const panelStyle = {
    position: "fixed",
    bottom: "calc(100vh * 1.5 / 24 + 3px)",
    left: "3px",
    width: "calc(100vw / 6)",
    height: "65vh",
    zIndex: MENU_INICIAR,
    borderRadius: 14,
    background: "transparent",
    backdropFilter: "blur(24px) saturate(1.4)",
    WebkitBackdropFilter: "blur(24px) saturate(1.4)",
    border: "1px solid color-mix(in srgb, var(--c1) 20%, transparent)",
    boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    transformOrigin: "bottom left",
    animation: `${closing ? "sm-out" : "sm-in"} ${ANIM_MS}ms ease forwards`,
  };

  const bodyStyle = {
    flex: 1,
    padding: "16px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    overflowY: "auto",
  };

  const footerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexShrink: 0,
    marginTop: "auto",
    padding: "12px 14px",
    borderTop: "1px solid color-mix(in srgb, var(--c1) 12%, transparent)",
  };

  const avatarStyle = {
    width: 30,
    height: 30,
    borderRadius: "50%",
    background: "color-mix(in srgb, var(--c1) 25%, transparent)",
    border: "1px solid color-mix(in srgb, var(--c1) 40%, transparent)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 700,
    color: "var(--c1)",
    flexShrink: 0,
  };

  const powerStyle = {
    width: 28,
    height: 28,
    borderRadius: 7,
    border: "1px solid color-mix(in srgb, var(--c1) 18%, transparent)",
    background: "none",
    color: "var(--c2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
    transition: "background-color 150ms ease",
  };

  return createPortal(
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: FUNDO_MENU_INICIAR,
          background: "transparent",
        }}
      />
      <div style={panelStyle}>
        <div className="glass-scroll" style={bodyStyle}>
          {(isAdmin ? APPS : APPS_CHATTER).map((app) => (
            <button
              key={app.id}
              type="button"
              className="sm-item"
              onClick={() => {
                onClose();
                if (onOpenApp) onOpenApp(app.id);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "none",
                textAlign: "left",
                cursor: "pointer",
                fontFamily: "var(--font-main)",
                transition: "background-color 150ms ease",
              }}
            >
              <app.Icon size={18} />
              <span
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  minWidth: 0,
                }}
              >
                <span
                  style={{ fontSize: 13, fontWeight: 700, color: "var(--c3)" }}
                >
                  {app.title}
                </span>
                <span
                  style={{ fontSize: 11, color: "var(--c2)", opacity: 0.7 }}
                >
                  {app.desc}
                </span>
              </span>
            </button>
          ))}
        </div>
        <div style={footerStyle}>
          <button
            type="button"
            className="sm-user"
            onClick={() => {
              onClose();
              if (onOpenConfig) onOpenConfig();
            }}
            title="Configurações do perfil"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              minWidth: 0,
              flex: 1,
              padding: "4px 6px",
              marginLeft: -6,
              borderRadius: 8,
              border: "none",
              background: "transparent",
              textAlign: "left",
              cursor: "pointer",
              fontFamily: "var(--font-main)",
            }}
          >
            <div style={{ ...avatarStyle, overflow: "hidden" }}>
              {perfil.fotoUrl ? (
                <img
                  src={perfil.fotoUrl}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                initials
              )}
            </div>
            <span
              style={{ display: "flex", flexDirection: "column", minWidth: 0 }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--c3)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {displayName}
              </span>
              {subnick && (
                <span
                  style={{
                    fontSize: 10,
                    fontStyle: "italic",
                    color: "var(--c1)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  — {subnick}
                </span>
              )}
            </span>
          </button>
          <button
            type="button"
            aria-label="Sair"
            onClick={() => setConfirmarSair(true)}
            style={powerStyle}
            className="start-power"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
              <line x1="12" y1="2" x2="12" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {confirmarSair && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: CONFIRMAR_SAIR,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            background: "rgba(10,10,16,0.38)",
            backdropFilter: "blur(3px)",
            WebkitBackdropFilter: "blur(3px)",
          }}
          onClick={() => setConfirmarSair(false)}
        >
          <div
            onClick={(evento) => evento.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sair-titulo"
            style={{
              width: 380,
              maxHeight: "94vh",
              display: "flex",
              flexDirection: "column",
              background: "color-mix(in srgb, var(--c8) 72%, transparent)",
              backdropFilter: "blur(22px)",
              WebkitBackdropFilter: "blur(22px)",
              border:
                "1px solid color-mix(in srgb, var(--c2) 18%, transparent)",
              borderRadius: 14,
              boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
              overflow: "hidden",
              fontFamily: "var(--font-main)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderBottom:
                  "1px solid color-mix(in srgb, var(--c2) 14%, transparent)",
              }}
            >
              <span
                id="sair-titulo"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 14,
                  color: "var(--c1)",
                  letterSpacing: "0.02em",
                }}
              >
                Sair da conta
              </span>
              <button
                type="button"
                onClick={() => setConfirmarSair(false)}
                aria-label="Fechar"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  border: "none",
                  background: "transparent",
                  color: "var(--c2)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                padding: "16px 16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 11.5,
                  color: "var(--c2)",
                  lineHeight: 1.6,
                }}
              >
                Você vai sair do Lyxn OS e voltar para a tela de entrada. Quer
                mesmo encerrar a sessão?
              </p>

              <div
                style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
              >
                <button
                  type="button"
                  className="md-btn"
                  onClick={() => setConfirmarSair(false)}
                  style={{
                    height: 30,
                    padding: "0 14px",
                    borderRadius: 8,
                    border:
                      "1px solid color-mix(in srgb, var(--c2) 22%, transparent)",
                    color: "var(--c2)",
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: "var(--font-main)",
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="md-primary"
                  onClick={() => {
                    setConfirmarSair(false);
                    logout();
                  }}
                  style={{
                    height: 30,
                    padding: "0 14px",
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: "var(--font-main)",
                    cursor: "pointer",
                  }}
                >
                  Sair
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
