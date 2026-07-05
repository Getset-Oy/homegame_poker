import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Regression guard for the bad-beat loser-seat shake.
 *
 * The seat wrapper is centered with Tailwind's `-translate-x-1/2 -translate-y-1/2`,
 * which in Tailwind v4 emits the CSS `translate` *property* (`translate: -50% -50%`) —
 * a separate channel from `transform`. The `bad-beat-shake` keyframe animates
 * `transform`, so it must contain ONLY the jitter delta. If a frame re-adds `-50%`
 * (e.g. `translate(calc(-50% + 4px), ...)`), it stacks on top of the `translate`
 * property and flings the avatar a full half-size up-left instead of shaking in place.
 */
describe('bad-beat-shake keyframe', () => {
  const css = readFileSync(new URL('../styles/index.css', import.meta.url), 'utf8');

  function keyframeBody(name: string): string {
    const start = css.indexOf(`@keyframes ${name}`);
    expect(start, `@keyframes ${name} must exist`).toBeGreaterThan(-1);
    const open = css.indexOf('{', start);
    // Walk to the matching closing brace (keyframe blocks nest one level of frames).
    let depth = 0;
    for (let i = open; i < css.length; i++) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i);
    }
    throw new Error(`unterminated @keyframes ${name}`);
  }

  it('animates transform with jitter offsets only — never re-adds the -50% centering', () => {
    const body = keyframeBody('bad-beat-shake');
    expect(body).not.toContain('-50%');
    // Sanity: it still actually jitters (pixel offsets present).
    expect(body).toMatch(/translate\(-?\d+px/);
  });
});
