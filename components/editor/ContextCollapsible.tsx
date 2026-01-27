'use client';

import { useState, useCallback } from 'react';
import { useAnalysisStore } from '@/store/analysisStore';
import { fileToBase64, compressImage } from '@/lib/utils/image';
import { validateBase64Image } from '@/lib/utils/validation';
import type { ImageFeedback, TextFeedback } from '@/types/feedback';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Image as ImageIcon,
  MessageSquare,
  Upload,
  Paperclip,
} from 'lucide-react';

export function ContextCollapsible() {
  const { feedbackItems, addFeedback, removeFeedback } = useAnalysisStore();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'images' | 'text'>('images');
  const [textInput, setTextInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const images = feedbackItems.filter((item): item is ImageFeedback => item.type === 'image');
  const textItems = feedbackItems.filter((item): item is TextFeedback => item.type === 'text');
  const totalItems = feedbackItems.length;

  const handleFiles = useCallback(
    async (files: FileList) => {
      setError(null);
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          setError('Solo se permiten imágenes');
          continue;
        }
        try {
          let base64 = await fileToBase64(file);
          const validation = validateBase64Image(base64);
          if (!validation.valid) {
            setError(validation.error || 'Imagen inválida');
            continue;
          }
          if (file.size > 1024 * 1024) {
            base64 = await compressImage(base64);
          }
          const imageFeedback: ImageFeedback = {
            id: crypto.randomUUID(),
            type: 'image',
            url: URL.createObjectURL(file),
            name: file.name,
            size: file.size,
            base64,
            timestamp: Date.now(),
          };
          addFeedback(imageFeedback);
        } catch (err) {
          console.error('Failed to process image:', err);
          setError(`Error procesando ${file.name}`);
        }
      }
    },
    [addFeedback]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files?.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleAddText = () => {
    if (textInput.trim()) {
      const feedback: TextFeedback = {
        id: crypto.randomUUID(),
        type: 'text',
        content: textInput.trim(),
        timestamp: Date.now(),
      };
      addFeedback(feedback);
      setTextInput('');
    }
  };

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)'
      }}
    >
      {/* Header - Always visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 transition-all duration-200 hover:bg-[var(--accent-subtle)]"
      >
        <div className="flex items-center gap-3">
          <Paperclip className="h-4 w-4" style={{ color: 'var(--accent-primary)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Agregar contexto
          </span>
          {totalItems > 0 && (
            <span className="badge badge-accent">
              {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
        ) : (
          <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
        )}
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <button
              onClick={() => setActiveTab('images')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-all duration-200 relative ${
                activeTab === 'images'
                  ? ''
                  : 'hover:bg-[var(--accent-subtle)]'
              }`}
              style={{
                color: activeTab === 'images' ? 'var(--accent-primary)' : 'var(--text-secondary)'
              }}
            >
              <ImageIcon className="h-4 w-4 inline mr-2" />
              Screenshots
              {images.length > 0 && (
                <span className="ml-2 text-xs">({images.length})</span>
              )}
              {activeTab === 'images' && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                  style={{ background: 'var(--accent-primary)' }}
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-all duration-200 relative ${
                activeTab === 'text'
                  ? ''
                  : 'hover:bg-[var(--accent-subtle)]'
              }`}
              style={{
                color: activeTab === 'text' ? 'var(--accent-primary)' : 'var(--text-secondary)'
              }}
            >
              <MessageSquare className="h-4 w-4 inline mr-2" />
              Feedback
              {textItems.length > 0 && (
                <span className="ml-2 text-xs">({textItems.length})</span>
              )}
              {activeTab === 'text' && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                  style={{ background: 'var(--accent-primary)' }}
                />
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {activeTab === 'images' ? (
              <div className="space-y-3">
                {/* Drop Zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  className="border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200"
                  style={{
                    borderColor: isDragging ? 'var(--accent-primary)' : 'var(--border-default)',
                    background: isDragging ? 'var(--accent-subtle)' : 'var(--bg-tertiary)'
                  }}
                >
                  <Upload className="mx-auto h-8 w-8 mb-2" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Arrastra imágenes o{' '}
                    <label style={{ color: 'var(--accent-primary)', cursor: 'pointer' }}>
                      selecciona
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => e.target.files && handleFiles(e.target.files)}
                        className="hidden"
                      />
                    </label>
                  </p>
                </div>

                {error && (
                  <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>
                )}

                {/* Image Previews */}
                {images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((image) => (
                      <div
                        key={image.id}
                        className="relative group aspect-video rounded-lg overflow-hidden"
                        style={{ background: 'var(--bg-tertiary)' }}
                      >
                        <img
                          src={image.url}
                          alt={image.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removeFeedback(image.id)}
                          className="absolute top-1 right-1 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200"
                          style={{ background: 'var(--error)', color: 'white' }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <div
                          className="absolute bottom-0 left-0 right-0 px-2 py-1 text-[10px] truncate"
                          style={{ background: 'rgba(0,0,0,0.7)', color: 'var(--text-primary)' }}
                        >
                          {image.name}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Text Input */}
                <div className="space-y-2">
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Pega feedback de usuarios, comentarios, o contexto adicional..."
                    className="input w-full h-24 resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.metaKey) {
                        handleAddText();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddText}
                    disabled={!textInput.trim()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar
                  </button>
                </div>

                {/* Text Items */}
                {textItems.length > 0 && (
                  <div className="space-y-2">
                    {textItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-3 rounded-lg"
                        style={{ background: 'var(--bg-tertiary)' }}
                      >
                        <p
                          className="flex-1 text-sm line-clamp-2"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {item.content}
                        </p>
                        <button
                          onClick={() => removeFeedback(item.id)}
                          className="p-1 rounded-md transition-all duration-200 hover:bg-[var(--error-subtle)]"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
