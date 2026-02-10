'use client';

import { useState, useEffect } from 'react';
import { useKnowledgeStore } from '@/store/knowledgeStore';
import { useToastStore } from '@/store/toastStore';
import type { Agent } from '@/types/prompt';
import {
  X,
  Instagram,
  MessageCircle,
  Music,
  Globe,
  Sparkles,
} from 'lucide-react';

interface ChannelOption {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const CHANNEL_OPTIONS: ChannelOption[] = [
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: '#E4405F', bgColor: 'rgba(228, 64, 95, 0.1)' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: '#25D366', bgColor: 'rgba(37, 211, 102, 0.1)' },
  { id: 'tiktok', label: 'TikTok', icon: Music, color: '#ffffff', bgColor: 'rgba(255, 255, 255, 0.05)' },
  { id: 'web', label: 'Web', icon: Globe, color: '#58a6ff', bgColor: 'rgba(88, 166, 255, 0.1)' },
];

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  editAgent?: Agent | null; // If provided, we're editing
}

export function AgentModal({ isOpen, onClose, projectId, editAgent }: AgentModalProps) {
  const { createAgent, updateAgent } = useKnowledgeStore();
  const { addToast } = useToastStore();

  const [name, setName] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('instagram');
  const [customChannel, setCustomChannel] = useState('');
  const [description, setDescription] = useState('');
  const isCustom = selectedChannel === 'custom';

  useEffect(() => {
    if (editAgent) {
      setName(editAgent.name);
      setDescription(editAgent.description || '');
      const predefined = CHANNEL_OPTIONS.find(c => c.id === editAgent.channelType);
      if (predefined) {
        setSelectedChannel(editAgent.channelType);
        setCustomChannel('');
      } else {
        setSelectedChannel('custom');
        setCustomChannel(editAgent.channelType);
      }
    } else {
      setName('');
      setSelectedChannel('instagram');
      setCustomChannel('');
      setDescription('');
    }
  }, [editAgent, isOpen]);

  if (!isOpen) return null;

  const channelType = isCustom ? customChannel.trim().toLowerCase() : selectedChannel;
  const isValid = name.trim().length > 0 && channelType.length > 0;

  const handleSubmit = () => {
    if (!isValid) return;

    if (editAgent) {
      updateAgent(projectId, editAgent.id, {
        name: name.trim(),
        channelType,
        description: description.trim() || undefined,
      });
      addToast('Agente actualizado', 'success');
    } else {
      createAgent(projectId, name.trim(), channelType, description.trim() || undefined);
      addToast('Agente creado', 'success');
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-xl overflow-hidden animate-fadeIn"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {editAgent ? 'Editar agente' : 'Nuevo agente'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-[var(--bg-tertiary)]">
            <X className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4">
          {/* Helper text for new agents */}
          {!editAgent && (
            <p className="text-xs rounded-lg px-3 py-2" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
              Un agente es un bot que responde en un canal especifico (Instagram, WhatsApp, etc.)
            </p>
          )}

          {/* Channel Selector */}
          <div>
            <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>
              Canal
            </label>
            <div className="grid grid-cols-5 gap-2">
              {CHANNEL_OPTIONS.map(channel => {
                const Icon = channel.icon;
                const isSelected = selectedChannel === channel.id;
                return (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannel(channel.id)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-lg transition-all"
                    style={{
                      background: isSelected ? channel.bgColor : 'var(--bg-tertiary)',
                      border: isSelected ? `1.5px solid ${channel.color}` : '1.5px solid transparent',
                    }}
                  >
                    <Icon className="h-5 w-5" style={{ color: isSelected ? channel.color : 'var(--text-muted)' }} />
                    <span className="text-[10px]" style={{ color: isSelected ? channel.color : 'var(--text-muted)' }}>
                      {channel.label}
                    </span>
                  </button>
                );
              })}

              {/* Custom option */}
              <button
                onClick={() => setSelectedChannel('custom')}
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg transition-all"
                style={{
                  background: isCustom ? 'rgba(136, 136, 255, 0.1)' : 'var(--bg-tertiary)',
                  border: isCustom ? '1.5px solid #8888ff' : '1.5px solid transparent',
                }}
              >
                <Sparkles className="h-5 w-5" style={{ color: isCustom ? '#8888ff' : 'var(--text-muted)' }} />
                <span className="text-[10px]" style={{ color: isCustom ? '#8888ff' : 'var(--text-muted)' }}>
                  Otro
                </span>
              </button>
            </div>

            {/* Custom channel input */}
            {isCustom && (
              <input
                type="text"
                value={customChannel}
                onChange={e => setCustomChannel(e.target.value)}
                placeholder="Ej: telegram, email..."
                className="w-full mt-2 px-3 py-2 text-sm rounded-lg"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
                autoFocus
              />
            )}
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
              Nombre del agente
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Bot de ventas IG"
              className="w-full px-3 py-2 text-sm rounded-lg"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              autoFocus={!isCustom}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
              Descripcion <span style={{ color: 'var(--text-muted)' }}>(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Breve descripcion del agente..."
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg resize-none"
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg transition-colors"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-40"
            style={{
              background: 'var(--accent-primary)',
              color: 'var(--bg-primary)',
            }}
          >
            {editAgent ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}
