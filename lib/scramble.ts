'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

const GLITCH_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*!?/<>[]{}=+~^';

export function useScrambleText(target: string, active: boolean, onDone?: () => void) {
  const [text, setText] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);
  useEffect(() => {
    if (!active) { stop(); return; }
    let idx = 0;
    const len = target.length;
    const chars = target.split('');
    const display = chars.map(c => c === ' ' ? ' ' : GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]);
    setText(display.join(''));
    intervalRef.current = setInterval(() => {
      while (idx < len && target[idx] === ' ') { display[idx] = ' '; idx++; }
      if (idx < len) { display[idx] = target[idx]; idx++; }
      setText(display.join(''));
      if (idx >= len) {
        stop();
        setText(target);
        onDone?.();
      }
    }, 55);
    return stop;
  }, [target, active, stop, onDone]);
  return text;
}
