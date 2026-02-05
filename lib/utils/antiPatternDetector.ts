/**
 * Anti-Pattern Detector - Detects known anti-patterns in prompt text
 * Uses knowledge base entries to identify problematic patterns automatically
 */

import type { KnowledgeEntry } from '@/types/prompt';
import type { SemanticSection } from '@/lib/semanticParser';

export interface DetectedAntiPattern {
  knowledgeEntryId: string;
  knowledgeEntry: KnowledgeEntry;
  matchedText: string;
  startOffset: number;
  endOffset: number;
  confidence: number; // 0-1
  sectionId?: string;
}

/**
 * Extracts keywords from text for matching
 */
function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^\w\sáéíóúñ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3);
  
  // Remove common stop words
  const stopWords = new Set(['para', 'que', 'con', 'por', 'como', 'este', 'esta', 'esto', 'the', 'and', 'for', 'with']);
  return words.filter(w => !stopWords.has(w));
}

/**
 * Calculates similarity score between text and a knowledge entry
 */
function calculateSimilarity(text: string, entry: KnowledgeEntry): number {
  const textLower = text.toLowerCase();
  const titleLower = entry.title.toLowerCase();
  const descLower = entry.description.toLowerCase();
  
  let score = 0;
  
  // Check for exact phrase matches in title
  if (textLower.includes(titleLower)) {
    score += 0.5;
  }
  
  // Check for keyword matches
  const textKeywords = extractKeywords(text);
  const entryKeywords = extractKeywords(entry.title + ' ' + entry.description);
  
  const matchingKeywords = textKeywords.filter(tk => 
    entryKeywords.some(ek => ek.includes(tk) || tk.includes(ek))
  );
  
  score += (matchingKeywords.length / Math.max(textKeywords.length, 1)) * 0.3;
  
  // Check for example matches (if example exists)
  if (entry.example) {
    const exampleLower = entry.example.toLowerCase();
    const exampleKeywords = extractKeywords(entry.example);
    
    // Exact match
    if (textLower.includes(exampleLower) || exampleLower.includes(textLower)) {
      score += 0.4;
    } else {
      // Keyword overlap with example
      const exampleMatches = textKeywords.filter(tk =>
        exampleKeywords.some(ek => ek.includes(tk) || tk.includes(ek))
      );
      score += (exampleMatches.length / Math.max(exampleKeywords.length, 1)) * 0.2;
    }
  }
  
  return Math.min(score, 1);
}

/**
 * Finds all occurrences of a pattern in text
 */
function findPatternOccurrences(
  text: string,
  pattern: KnowledgeEntry
): Array<{ start: number; end: number; matched: string }> {
  const occurrences: Array<{ start: number; end: number; matched: string }> = [];
  
  // If pattern has an example, try to find similar text
  if (pattern.example) {
    const exampleKeywords = extractKeywords(pattern.example);
    const windowSize = Math.max(pattern.example.length, 50);
    
    // Sliding window search
    for (let i = 0; i < text.length - windowSize; i += 10) {
      const window = text.substring(i, i + windowSize);
      const windowKeywords = extractKeywords(window);
      
      const matches = windowKeywords.filter(wk =>
        exampleKeywords.some(ek => ek === wk || ek.includes(wk) || wk.includes(ek))
      );
      
      if (matches.length >= Math.min(exampleKeywords.length * 0.5, 2)) {
        // Find the actual matched text boundaries
        let start = i;
        let end = i + windowSize;
        
        // Try to find sentence boundaries
        const sentenceStart = text.lastIndexOf('.', i) + 1;
        const sentenceEnd = text.indexOf('.', i + windowSize);
        
        if (sentenceStart > 0 && sentenceStart < i + 20) start = sentenceStart;
        if (sentenceEnd > 0 && sentenceEnd < end + 50) end = sentenceEnd;
        
        occurrences.push({
          start,
          end,
          matched: text.substring(start, end).trim(),
        });
        
        // Skip ahead to avoid overlapping matches
        i = end;
      }
    }
  }
  
  // Also search for title keywords
  const titleKeywords = extractKeywords(pattern.title);
  titleKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
      // Expand to sentence boundaries
      let start = match.index;
      let end = match.index + match[0].length;
      
      const sentenceStart = text.lastIndexOf('.', start) + 1;
      const sentenceEnd = text.indexOf('.', end);
      
      if (sentenceStart >= 0 && start - sentenceStart < 100) start = sentenceStart;
      if (sentenceEnd > 0 && sentenceEnd - end < 100) end = sentenceEnd;
      
      occurrences.push({
        start,
        end,
        matched: text.substring(start, end).trim(),
      });
    }
  });
  
  // Remove duplicates and overlaps
  const unique: Array<{ start: number; end: number; matched: string }> = [];
  occurrences.sort((a, b) => a.start - b.start);
  
  for (const occ of occurrences) {
    const overlaps = unique.some(u => 
      (occ.start >= u.start && occ.start <= u.end) ||
      (occ.end >= u.start && occ.end <= u.end)
    );
    if (!overlaps) {
      unique.push(occ);
    }
  }
  
  return unique;
}

/**
 * Detects anti-patterns in the entire prompt text
 */
export function detectAntiPatterns(
  promptText: string,
  knowledgeEntries: KnowledgeEntry[],
  minConfidence: number = 0.6
): DetectedAntiPattern[] {
  const detected: DetectedAntiPattern[] = [];
  
  // Filter to only anti-patterns
  const antiPatterns = knowledgeEntries.filter(e => e.type === 'anti_pattern');
  
  for (const pattern of antiPatterns) {
    const occurrences = findPatternOccurrences(promptText, pattern);
    
    for (const occ of occurrences) {
      const confidence = calculateSimilarity(occ.matched, pattern);
      
      if (confidence >= minConfidence) {
        detected.push({
          knowledgeEntryId: pattern.id,
          knowledgeEntry: pattern,
          matchedText: occ.matched,
          startOffset: occ.start,
          endOffset: occ.end,
          confidence,
        });
      }
    }
  }
  
  // Sort by confidence (highest first)
  return detected.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Detects anti-patterns in a specific section
 */
export function detectAntiPatternsInSection(
  section: SemanticSection,
  promptText: string,
  antiPatterns: KnowledgeEntry[],
  minConfidence: number = 0.6
): DetectedAntiPattern[] {
  const sectionText = promptText.substring(section.startIndex, section.endIndex);
  const detected = detectAntiPatterns(sectionText, antiPatterns, minConfidence);
  
  // Adjust offsets to be relative to the full prompt
  return detected.map(d => ({
    ...d,
    startOffset: d.startOffset + section.startIndex,
    endOffset: d.endOffset + section.startIndex,
    sectionId: section.id,
  }));
}

/**
 * Checks if a specific text range already has an anti-pattern annotation
 */
export function hasExistingAnnotation(
  startOffset: number,
  endOffset: number,
  existingAnnotations: Array<{ startOffset: number; endOffset: number }>
): boolean {
  return existingAnnotations.some(ann => {
    // Check for overlap
    return (
      (startOffset >= ann.startOffset && startOffset <= ann.endOffset) ||
      (endOffset >= ann.startOffset && endOffset <= ann.endOffset) ||
      (startOffset <= ann.startOffset && endOffset >= ann.endOffset)
    );
  });
}
