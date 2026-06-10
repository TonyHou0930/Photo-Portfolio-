'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

interface SpotifyData {
  isPlaying: boolean;
  title?: string;
  artist?: string;
  albumArt?: string;
  progress?: number;
  duration?: number;
}

interface MusicPlayerProps {
  src: string;
  title: string;
  artist: string;
}

export default function MusicPlayer({ src, title, artist }: MusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [spotify, setSpotify] = useState<SpotifyData | null>(null);

  // Poll Spotify every 15s
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/spotify');
        if (res.ok) {
          const data = await res.json();
          if (data.isPlaying) setSpotify(data);
          else setSpotify(null);
        }
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, []);

  // Local audio
  useEffect(() => {
    if (!src) return;
    const audio = new Audio(src);
    audio.loop = true; audio.volume = 0.4;
    audioRef.current = audio;
    return () => { audio.pause(); audio.src = ''; };
  }, [src]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    if (playing) {
      const fade = setInterval(() => {
        if (audio.volume > 0.05) audio.volume -= 0.05;
        else { audio.pause(); audio.volume = 0.4; clearInterval(fade); setPlaying(false); }
      }, 40);
    } else {
      audio.volume = 0;
      audio.play().then(() => {
        setPlaying(true);
        const fade = setInterval(() => {
          if (audio.volume < 0.35) audio.volume += 0.05;
          else { audio.volume = 0.4; clearInterval(fade); }
        }, 40);
      }).catch(() => {});
    }
  }, [playing, src]);

  // Show Spotify if active, otherwise show local player
  const showSpotify = spotify?.isPlaying;
  const displayTitle = showSpotify ? spotify!.title : (playing ? title : 'Play');
  const displayArtist = showSpotify ? spotify!.artist : (playing ? artist : '');
  const isActive = showSpotify || playing;

  return (
    <div className="music-player" onClick={showSpotify ? undefined : toggle}>
      <div className={`mp-pulse${isActive ? ' active' : ''}`}>
        {showSpotify && spotify!.albumArt ? (
          <img src={spotify!.albumArt} alt="" className="mp-album" />
        ) : (
          <div className="mp-dot" />
        )}
        {isActive && <>
          <div className="mp-ring mp-ring-1" />
          <div className="mp-ring mp-ring-2" />
        </>}
      </div>
      <div className="mp-info">
        <span className="mp-title">{displayTitle}</span>
        {displayArtist && <span className="mp-artist">{displayArtist}</span>}
      </div>
    </div>
  );
}
