import { useState, useEffect } from 'react';
import { DELAY_BAD_BEAT_TO_RESULT_MS } from '@poker/shared';
import { useTheme } from '../../themes/useTheme.js';
import { getBadBeatSlogan } from '../../themes/badbeat-slogans/index.js';

interface BadBeatBubbleProps {
  seatIndex: number;
  playerName: string;
}

const FADE_MS = 500; // matches the opacity transition below

export function BadBeatBubble({ seatIndex, playerName }: BadBeatBubbleProps) {
  const theme = useTheme();
  const [slogan] = useState(() => getBadBeatSlogan(theme.id));
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    // Fade in, then fade out so the fade completes exactly as the overlay is unmounted
    // (state clears at DELAY_BAD_BEAT_TO_RESULT_MS) — keeps the bubble in step with the
    // rest of the bad-beat choreography instead of lingering after it.
    const fadeIn = setTimeout(() => setOpacity(1), 50);
    const fadeOut = setTimeout(() => setOpacity(0), DELAY_BAD_BEAT_TO_RESULT_MS - FADE_MS);
    return () => { clearTimeout(fadeIn); clearTimeout(fadeOut); };
  }, []);

  // Determine tail direction based on seat position
  const isTopHalf = seatIndex >= 3 && seatIndex <= 7;
  const tailStyle = isTopHalf
    ? { bottom: -6, left: '50%', transform: 'translateX(-50%) rotate(45deg)' }
    : { top: -6, left: '50%', transform: 'translateX(-50%) rotate(45deg)' };

  return (
    <div
      style={{
        position: 'absolute',
        [isTopHalf ? 'top' : 'bottom']: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginTop: isTopHalf ? 8 : 0,
        marginBottom: isTopHalf ? 0 : 8,
        zIndex: 100,
        opacity,
        transition: 'opacity 0.5s ease',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'relative',
          background: 'rgba(0, 0, 0, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 8,
          padding: '6px 12px',
          maxWidth: 200,
          whiteSpace: 'nowrap',
          fontSize: 12,
          fontWeight: 600,
          color: '#fff',
          textAlign: 'center',
          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        }}
      >
        {/* Tail */}
        <div
          style={{
            position: 'absolute',
            width: 10,
            height: 10,
            background: 'rgba(0, 0, 0, 0.85)',
            borderRight: '1px solid rgba(255, 255, 255, 0.2)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
            ...tailStyle,
          }}
        />
        {slogan}
      </div>
    </div>
  );
}
