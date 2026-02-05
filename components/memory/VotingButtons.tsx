'use client';

import { useState, useEffect } from 'react';
import { votesRepository } from '@/lib/supabase/repositories';
import { getSupabaseDeviceId } from '@/lib/supabase/device';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface VotingButtonsProps {
  learningId: string;
  onVoteChange?: (upvotes: number, downvotes: number) => void;
}

export function VotingButtons({ learningId, onVoteChange }: VotingButtonsProps) {
  const [upvotes, setUpvotes] = useState(0);
  const [downvotes, setDownvotes] = useState(0);
  const [userVote, setUserVote] = useState<-1 | 1 | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const deviceId = getSupabaseDeviceId();

  useEffect(() => {
    loadVotes();
  }, [learningId]);

  const loadVotes = async () => {
    setIsLoading(true);
    
    // Load vote stats
    const stats = await votesRepository.getVoteStats(learningId);
    setUpvotes(stats.upvotes);
    setDownvotes(stats.downvotes);
    
    // Load user's vote if device is registered
    if (deviceId) {
      const vote = await votesRepository.getUserVote(learningId, deviceId);
      setUserVote(vote);
    }
    
    setIsLoading(false);
  };

  const handleVote = async (vote: -1 | 1) => {
    if (!deviceId) return;

    // If clicking the same vote, remove it
    if (userVote === vote) {
      const success = await votesRepository.removeVote(learningId, deviceId);
      if (success) {
        setUserVote(null);
        if (vote === 1) {
          setUpvotes(upvotes - 1);
        } else {
          setDownvotes(downvotes - 1);
        }
        onVoteChange?.(
          vote === 1 ? upvotes - 1 : upvotes,
          vote === -1 ? downvotes - 1 : downvotes
        );
      }
      return;
    }

    // Otherwise, cast new vote
    const result = await votesRepository.vote(learningId, deviceId, vote);
    if (result) {
      // Update counts
      if (userVote === null) {
        // New vote
        if (vote === 1) {
          setUpvotes(upvotes + 1);
        } else {
          setDownvotes(downvotes + 1);
        }
      } else {
        // Changed vote
        if (vote === 1) {
          setUpvotes(upvotes + 1);
          setDownvotes(downvotes - 1);
        } else {
          setUpvotes(upvotes - 1);
          setDownvotes(downvotes + 1);
        }
      }
      
      setUserVote(vote);
      onVoteChange?.(
        vote === 1 ? (userVote === null ? upvotes + 1 : upvotes + 1) : (userVote === 1 ? upvotes - 1 : upvotes),
        vote === -1 ? (userVote === null ? downvotes + 1 : downvotes + 1) : (userVote === -1 ? downvotes - 1 : downvotes)
      );
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {/* Upvote button */}
      <button
        onClick={() => handleVote(1)}
        disabled={!deviceId}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-200"
        style={{
          background: userVote === 1 ? 'var(--success-subtle)' : 'var(--bg-elevated)',
          color: userVote === 1 ? 'var(--success)' : 'var(--text-secondary)',
          border: `1px solid ${userVote === 1 ? 'rgba(63, 185, 80, 0.3)' : 'var(--border-subtle)'}`,
        }}
        title="Útil"
      >
        <ThumbsUp className="h-3.5 w-3.5" />
        <span>{upvotes}</span>
      </button>

      {/* Downvote button */}
      <button
        onClick={() => handleVote(-1)}
        disabled={!deviceId}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-200"
        style={{
          background: userVote === -1 ? 'var(--error-subtle)' : 'var(--bg-elevated)',
          color: userVote === -1 ? 'var(--error)' : 'var(--text-secondary)',
          border: `1px solid ${userVote === -1 ? 'rgba(248, 81, 73, 0.3)' : 'var(--border-subtle)'}`,
        }}
        title="No útil"
      >
        <ThumbsDown className="h-3.5 w-3.5" />
        <span>{downvotes}</span>
      </button>

      {/* Net score */}
      {(upvotes > 0 || downvotes > 0) && (
        <span
          className="text-[10px] px-2 py-0.5 rounded-full"
          style={{
            background: upvotes > downvotes ? 'var(--success-subtle)' : 
                       upvotes < downvotes ? 'var(--error-subtle)' : 'var(--bg-elevated)',
            color: upvotes > downvotes ? 'var(--success)' : 
                   upvotes < downvotes ? 'var(--error)' : 'var(--text-muted)',
          }}
        >
          {upvotes > downvotes ? '+' : ''}{upvotes - downvotes}
        </span>
      )}
    </div>
  );
}
