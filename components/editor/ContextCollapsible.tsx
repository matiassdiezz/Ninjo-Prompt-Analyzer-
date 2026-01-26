'use client';

import { useState, useCallback } from 'react';
import { useAnalysisStore } from '@/store/analysisStore';
import { fileToBase64, compressImage, formatFileSize } from '@/lib/utils/image';
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
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            Agregar contexto
          </span>
          {totalItems > 0 && (
            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
              {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="border-t border-gray-200">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('images')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'images'
                  ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ImageIcon className="h-4 w-4 inline mr-1.5" />
              Screenshots
              {images.length > 0 && (
                <span className="ml-1.5 text-xs">({images.length})</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'text'
                  ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <MessageSquare className="h-4 w-4 inline mr-1.5" />
              Feedback
              {textItems.length > 0 && (
                <span className="ml-1.5 text-xs">({textItems.length})</span>
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
                  className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                    isDragging
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Upload className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-1 text-sm text-gray-600">
                    Arrastra imágenes o{' '}
                    <label className="text-blue-600 hover:text-blue-700 cursor-pointer">
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
                  <p className="text-sm text-red-600">{error}</p>
                )}

                {/* Image Previews */}
                {images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((image) => (
                      <div
                        key={image.id}
                        className="relative group aspect-video bg-gray-100 rounded overflow-hidden"
                      >
                        <img
                          src={image.url}
                          alt={image.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => removeFeedback(image.id)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-black/50 text-white text-[10px] truncate">
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
                    className="w-full h-24 p-2 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.metaKey) {
                        handleAddText();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddText}
                    disabled={!textInput.trim()}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar
                  </button>
                </div>

                {/* Text Items */}
                {textItems.length > 0 && (
                  <div className="space-y-2">
                    {textItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-2 p-2 bg-gray-50 rounded text-sm"
                      >
                        <p className="flex-1 text-gray-700 line-clamp-2">
                          {item.content}
                        </p>
                        <button
                          onClick={() => removeFeedback(item.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
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
