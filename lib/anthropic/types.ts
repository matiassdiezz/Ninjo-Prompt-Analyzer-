export interface AnthropicImageContent {
  type: 'image';
  source: {
    type: 'base64';
    media_type: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
    data: string;
  };
}

export interface AnthropicTextContent {
  type: 'text';
  text: string;
}

export type AnthropicContent = AnthropicImageContent | AnthropicTextContent;
