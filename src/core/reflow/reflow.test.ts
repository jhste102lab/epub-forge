import { describe, expect, it } from 'vitest';
import { DEFAULT_REFLOW_OPTIONS, reflow, type ReflowOptions } from './reflow';

const withOpts = (over: Partial<ReflowOptions> = {}): ReflowOptions => ({
  ...DEFAULT_REFLOW_OPTIONS,
  ...over,
});

describe('reflow', () => {
  it('joins wrapped lines until a Terminator, restoring spaces', () => {
    const input = ['"안녕?" 그가 물었다', '그녀는 고개를', '끄덕였다.'].join('\n');
    expect(reflow(input, withOpts())).toEqual(['"안녕?" 그가 물었다 그녀는 고개를 끄덕였다.']);
  });

  it('preserves blank lines as paragraph boundaries', () => {
    const input = ['끄덕였다.', '', '다음 날 아침이', '밝았다.'].join('\n');
    expect(reflow(input, withOpts())).toEqual(['끄덕였다.', '', '다음 날 아침이 밝았다.']);
  });

  it('treats a line ending in a Terminator as a complete paragraph', () => {
    const input = ['첫 문장이다.', '둘째 문장이다.'].join('\n');
    expect(reflow(input, withOpts())).toEqual(['첫 문장이다.', '둘째 문장이다.']);
  });

  it('recognizes a closing quote after a period as a Terminator', () => {
    const input = ['그는 말했다. "끝."', '다음 줄'].join('\n');
    expect(reflow(input, withOpts())).toEqual(['그는 말했다. "끝."', '다음 줄']);
  });

  it('omits the join space when joinWithSpace is off', () => {
    const input = ['고개를', '끄덕였다.'].join('\n');
    expect(reflow(input, withOpts({ joinWithSpace: false }))).toEqual(['고개를끄덕였다.']);
  });

  it('respects a custom Terminator set (removing default ones)', () => {
    const input = ['첫 줄.', '둘째 줄~'].join('\n');
    // Only '~' terminates now, so the period no longer breaks the paragraph.
    expect(reflow(input, withOpts({ terminators: '~' }))).toEqual(['첫 줄. 둘째 줄~']);
  });

  it('makes each line its own paragraph when disabled, still preserving blanks', () => {
    const input = ['고개를', '끄덕였다.', '', '다음 줄'].join('\n');
    expect(reflow(input, withOpts({ enabled: false }))).toEqual([
      '고개를',
      '끄덕였다.',
      '',
      '다음 줄',
    ]);
  });

  it('keeps internal multiple blank lines but trims leading/trailing ones', () => {
    const input = ['', '', '본문.', '', '', '끝.', '', ''].join('\n');
    expect(reflow(input, withOpts())).toEqual(['본문.', '', '', '끝.']);
  });

  it('flushes a trailing paragraph that has no Terminator', () => {
    expect(reflow('프롤로그', withOpts())).toEqual(['프롤로그']);
  });
});
