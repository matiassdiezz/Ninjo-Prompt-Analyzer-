export type FeedbackType = 'text' | 'image';

export interface TextFeedback {
  id: string;
  type: 'text';
  content: string;
  timestamp: number;
}

export interface ImageFeedback {
  id: string;
  type: 'image';
  url: string;
  name: string;
  size: number;
  base64?: string;
  timestamp: number;
}

export type FeedbackItem = TextFeedback | ImageFeedback;

export interface FeedbackCollection {
  items: FeedbackItem[];
}
