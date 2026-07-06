import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Regression guard for a class of Tailwind-v4 animation bug.
 *
 * These elements are centered with Tailwind's `-translate-x-1/2 -translate-y-1/2`
 * (or `-translate-x-1/2`), which in Tailwind v4 emits the CSS `translate` *property*
 * (e.g. `translate: -50% -50%`) — a SEPARATE channel from `transform`. Their keyframes
 * animate `transform`, so they must NOT re-add the `-50%` centering: doing so stacks it
 * on top of the `translate` property (total -100%) and, with `forwards`/`both` fill or a
 * sustained shake, leaves the element flung/held a full half-size off its seat.
 * (In Tailwind v3 `-translate-*` compiled to `transform`, which the keyframe overrode —
 * the v4 migration silently broke every keyframe that re-specified the -50% centering.)
 *
 * Only keyframes applied to Tailwind-`translate`-centered elements are listed here;
 * keyframes on inline-`transform`-centered elements (e.g. bad-beat-text) legitimately
 * keep their -50% because it overrides the inline transform.
 */
describe('animation keyframes on Tailwind-centered elements', () => {
  const css = readFileSync(new URL('../styles/index.css', import.meta.url), 'utf8');

  function keyframeBody(name: string): string {
    const start = css.indexOf(`@keyframes ${name}`);
    expect(start, `@keyframes ${name} must exist`).toBeGreaterThan(-1);
    const open = css.indexOf('{', start);
    let depth = 0;
    for (let i = open; i < css.length; i++) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i);
    }
    throw new Error(`unterminated @keyframes ${name}`);
  }

  // keyframe name -> a `transform:` fragment that must still be present (proves the
  // animation still does its visual job after the -50% was removed).
  const CASES: Record<string, RegExp> = {
    'bad-beat-shake': /translate\(-?\d+px/, // seat jitter
    'allin-label-appear': /scale\(/,        // label pop
    'live-action-pop': /scale\(/,           // badge pop
  };

  for (const [name, mustMatch] of Object.entries(CASES)) {
    it(`${name} animates transform without re-adding the -50% centering`, () => {
      const body = keyframeBody(name);
      expect(body, `${name} must not re-add -50% (double-translates the Tailwind centering)`).not.toContain('-50%');
      expect(body, `${name} should still perform its transform`).toMatch(mustMatch);
    });
  }
});
