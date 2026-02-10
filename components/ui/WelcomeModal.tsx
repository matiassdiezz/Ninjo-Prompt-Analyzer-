'use client';

import { useState } from 'react';
import {
  Sparkles,
  FolderOpen,
  MessageCircle,
  ArrowRight,
  ArrowLeft,
  Keyboard,
  GripVertical,
  X,
} from 'lucide-react';
import Image from 'next/image';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: () => void;
}

const STEPS = [
  {
    title: 'Bienvenido a Nazare',
    subtitle: 'Herramienta interna para crear, analizar y optimizar prompts de agentes DM.',
  },
  {
    title: 'Como funciona',
    subtitle: 'En 3 pasos simples:',
  },
  {
    title: 'Tips utiles',
    subtitle: 'Algunos atajos para ser mas productivo:',
  },
];

export function WelcomeModal({ isOpen, onClose, onCreateProject }: WelcomeModalProps) {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem('ninjo-welcome-dismissed', 'true');
    } catch {}
    onClose();
  };

  const handleCreateProject = () => {
    handleDismiss();
    onCreateProject();
  };

  const isLastStep = step === STEPS.length - 1;
  const isFirstStep = step === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)' }}
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg rounded-xl overflow-hidden animate-fadeIn"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-md transition-colors hover:bg-[var(--bg-tertiary)] z-10"
        >
          <X className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
        </button>

        {/* Content */}
        <div className="px-8 pt-8 pb-6">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center animate-fadeIn">
              <div className="flex items-center justify-center mb-5">
                <div className="h-14 w-14 relative">
                  <Image src="/images/LogoNazare.png" alt="Nazare" width={56} height={56} />
                </div>
              </div>
              <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                {STEPS[0].title}
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                {STEPS[0].subtitle}
              </p>

              {/* Visual hierarchy */}
              <div
                className="rounded-lg p-4 mb-2"
                style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
              >
                <div className="flex items-center justify-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="p-2 rounded-lg" style={{ background: 'var(--accent-glow)' }}>
                      <FolderOpen className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
                    </div>
                    <span className="font-medium">Proyecto</span>
                    <span style={{ color: 'var(--text-muted)' }}>Un cliente</span>
                  </div>
                  <ArrowRight className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="p-2 rounded-lg" style={{ background: 'rgba(228, 64, 95, 0.1)' }}>
                      <Sparkles className="h-5 w-5" style={{ color: '#E4405F' }} />
                    </div>
                    <span className="font-medium">Agente</span>
                    <span style={{ color: 'var(--text-muted)' }}>Bot en un canal</span>
                  </div>
                  <ArrowRight className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="p-2 rounded-lg" style={{ background: 'rgba(0, 212, 170, 0.1)' }}>
                      <MessageCircle className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
                    </div>
                    <span className="font-medium">Prompt + QA</span>
                    <span style={{ color: 'var(--text-muted)' }}>Editar y revisar</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: How it works */}
          {step === 1 && (
            <div className="animate-fadeIn">
              <h2 className="text-lg font-semibold mb-1 text-center" style={{ color: 'var(--text-primary)' }}>
                {STEPS[1].title}
              </h2>
              <p className="text-sm mb-5 text-center" style={{ color: 'var(--text-secondary)' }}>
                {STEPS[1].subtitle}
              </p>

              <div className="space-y-3">
                {[
                  {
                    num: '1',
                    title: 'Crea un proyecto',
                    desc: 'Agrupa los agentes de un mismo cliente o negocio.',
                    icon: FolderOpen,
                    color: 'var(--accent-primary)',
                    bg: 'var(--accent-glow)',
                  },
                  {
                    num: '2',
                    title: 'Agrega un agente',
                    desc: 'Cada agente es un bot que responde en un canal (Instagram, WhatsApp, etc.).',
                    icon: Sparkles,
                    color: '#E4405F',
                    bg: 'rgba(228, 64, 95, 0.1)',
                  },
                  {
                    num: '3',
                    title: 'Edita el prompt y usa el chat QA',
                    desc: 'Pega tu prompt en el editor y usa el chat Ninjo para revisarlo y mejorarlo.',
                    icon: MessageCircle,
                    color: 'var(--accent-primary)',
                    bg: 'rgba(0, 212, 170, 0.1)',
                  },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.num}
                      className="flex items-start gap-3 p-3 rounded-lg"
                      style={{ background: 'var(--bg-tertiary)' }}
                    >
                      <div
                        className="flex items-center justify-center h-8 w-8 rounded-lg flex-shrink-0"
                        style={{ background: item.bg }}
                      >
                        <Icon className="h-4 w-4" style={{ color: item.color }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {item.title}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Tips */}
          {step === 2 && (
            <div className="animate-fadeIn">
              <h2 className="text-lg font-semibold mb-1 text-center" style={{ color: 'var(--text-primary)' }}>
                {STEPS[2].title}
              </h2>
              <p className="text-sm mb-5 text-center" style={{ color: 'var(--text-secondary)' }}>
                {STEPS[2].subtitle}
              </p>

              <div className="space-y-2.5">
                {[
                  {
                    icon: Keyboard,
                    keys: '?',
                    desc: 'Ver todos los atajos de teclado',
                  },
                  {
                    icon: Keyboard,
                    keys: 'Cmd+S',
                    desc: 'Guardar version del prompt',
                  },
                  {
                    icon: GripVertical,
                    keys: null,
                    desc: 'Arrastra el divisor entre editor y chat para redimensionar',
                  },
                ].map((tip, i) => {
                  const Icon = tip.icon;
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-lg"
                      style={{ background: 'var(--bg-tertiary)' }}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--accent-primary)' }} />
                      {tip.keys && (
                        <kbd
                          className="px-2 py-0.5 rounded text-xs font-mono flex-shrink-0"
                          style={{
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {tip.keys}
                        </kbd>
                      )}
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {tip.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          {/* Step indicators */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: i === step ? 16 : 6,
                  height: 6,
                  background: i === step ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                <ArrowLeft className="h-3 w-3" />
                Atras
              </button>
            )}

            {isFirstStep && (
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-xs rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                Ya conozco la app
              </button>
            )}

            {!isLastStep ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="flex items-center gap-1 px-4 py-1.5 text-xs font-medium rounded-lg transition-colors"
                style={{
                  background: 'var(--accent-primary)',
                  color: 'var(--bg-primary)',
                }}
              >
                Siguiente
                <ArrowRight className="h-3 w-3" />
              </button>
            ) : (
              <button
                onClick={handleCreateProject}
                className="flex items-center gap-1 px-4 py-1.5 text-xs font-medium rounded-lg transition-colors"
                style={{
                  background: 'var(--accent-primary)',
                  color: 'var(--bg-primary)',
                }}
              >
                Crear mi primer proyecto
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
