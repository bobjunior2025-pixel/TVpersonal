import React, { useState, useRef, useEffect } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, RotateCcw, Maximize, Sliders, Type, Check, X, SkipForward } from 'lucide-react';
import { VideoContent, Subtitle } from '../data';

interface VideoPlayerProps {
  content: VideoContent;
  episodeIndex?: number;
  onClose: () => void;
  onNextEpisode?: () => void;
}

export default function VideoPlayer({ content, episodeIndex, onClose, onNextEpisode }: VideoPlayerProps) {
  const currentTitle = episodeIndex !== undefined && content.episodes 
    ? `${content.title} - ${content.episodes[episodeIndex].title}`
    : content.title;

  const currentVideoUrl = episodeIndex !== undefined && content.episodes
    ? content.episodes[episodeIndex].videoUrl
    : content.videoUrl;

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [audioTrack, setAudioTrack] = useState<'pt' | 'en'>('pt');
  const [subtitleLanguage, setSubtitleLanguage] = useState<'off' | 'pt' | 'en'>('pt');
  const [subtitleSize, setSubtitleSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [subtitleBg, setSubtitleBg] = useState<boolean>(true);
  const [showControls, setShowControls] = useState(true);
  const [currentSubtitleText, setCurrentSubtitleText] = useState<string>('');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  // Auto-hide controls timer
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showSettingsMenu) {
        setShowControls(false);
      }
    }, 4000);
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, showSettingsMenu]);

  // Handle Play / Pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(e => console.log('Auto-play blocked or error: ', e));
    }
    setIsPlaying(!isPlaying);
  };

  // Handle Progress Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const newTime = parseFloat(e.target.value);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Format Time (HH:MM:SS or MM:SS)
  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = Math.floor(secs % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle Volume Change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const newVol = parseFloat(e.target.value);
    videoRef.current.volume = newVol;
    setVolume(newVol);
    setIsMuted(newVol === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    videoRef.current.muted = nextMute;
    setIsMuted(nextMute);
  };

  // Handle Playback Speed
  const handleSpeedChange = (rate: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  };

  // Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error('Erro ao ativar tela cheia:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Tracks time updates to synchronize subtitles
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    // Sync subtitles
    if (subtitleLanguage === 'off' || !content.subtitles) {
      setCurrentSubtitleText('');
      return;
    }

    const currentSub = content.subtitles.find(sub => time >= sub.time && time <= sub.end);
    if (currentSub) {
      setCurrentSubtitleText(subtitleLanguage === 'pt' ? currentSub.textPt : currentSub.textEn);
    } else {
      setCurrentSubtitleText('');
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  // Hotkeys: Space (Play/Pause), M (Mute), Right/Left arrow (seek 10s)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'm':
          toggleMute();
          break;
        case 'arrowright':
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, duration);
            resetControlsTimeout();
          }
          break;
        case 'arrowleft':
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0);
            resetControlsTimeout();
          }
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'escape':
          onClose();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, duration, isMuted]);

  // Handle HLS (.m3u8) streams vs regular MP4 videos
  useEffect(() => {
    let hls: Hls | null = null;
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (currentVideoUrl) {
      const isM3u8 = currentVideoUrl.endsWith('.m3u8') || currentVideoUrl.includes('m3u8') || currentVideoUrl.includes('playlist');
      
      if (isM3u8) {
        if (Hls.isSupported()) {
          hls = new Hls({
            maxMaxBufferLength: 10,
            enableWorker: true,
            lowLatencyMode: true
          });
          hls.loadSource(currentVideoUrl);
          hls.attachMedia(videoElement);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            videoElement.play().catch(e => console.log('HLS play blocked:', e));
          });
        } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
          videoElement.src = currentVideoUrl;
          videoElement.play().catch(e => console.log('Native HLS play blocked:', e));
        }
      } else {
        videoElement.src = currentVideoUrl;
        videoElement.play().catch(e => console.log('MP4 play blocked:', e));
      }
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [currentVideoUrl]);

  return (
    <div 
      id="video-player-root"
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center overflow-hidden select-none font-sans"
      onMouseMove={resetControlsTimeout}
      onClick={() => setShowSettingsMenu(false)}
    >
      {/* Cinematic Ambient Glow in Background */}
      <div 
        id="player-glow"
        className="absolute inset-0 transition-all duration-1000 ease-in-out pointer-events-none opacity-20 filter blur-[120px]"
        style={{
          background: `radial-gradient(circle, rgba(239, 68, 68, 0.4) 0%, rgba(0, 0, 0, 1) 75%)`
        }}
      />

      {/* Actual HTML Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full max-h-screen object-contain z-10"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
        }}
        autoPlay
      />

      {/* Subtitles Overlay */}
      {currentSubtitleText && (
        <div 
          id="player-subtitles"
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 text-center pointer-events-none w-11/12 max-w-3xl"
        >
          <span 
            className={`
              inline-block rounded-lg px-4 py-2 font-medium tracking-wide leading-relaxed drop-shadow-lg text-white
              ${subtitleSize === 'sm' ? 'text-sm md:text-base' : ''}
              ${subtitleSize === 'md' ? 'text-base md:text-xl' : ''}
              ${subtitleSize === 'lg' ? 'text-lg md:text-3xl font-semibold' : ''}
              ${subtitleBg ? 'bg-black/75 backdrop-blur-sm' : 'bg-transparent text-yellow-300'}
            `}
          >
            {currentSubtitleText}
          </span>
        </div>
      )}

      {/* Top Bar Controls (Header) */}
      <div 
        id="player-top-bar"
        className={`
          absolute top-0 left-0 right-0 z-30 p-6 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center transition-all duration-300
          ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5 pointer-events-none'}
        `}
      >
        <div className="flex items-center space-x-4">
          <button 
            id="btn-player-back"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/15 text-gray-300 hover:text-white transition cursor-pointer"
            title="Voltar"
          >
            <X size={24} />
          </button>
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-red-500">ASSISTINDO AGORA</span>
            <h1 className="text-lg md:text-xl font-bold text-white tracking-tight">{currentTitle}</h1>
          </div>
        </div>

        {/* Info label about shortcuts */}
        <div className="hidden md:flex items-center space-x-3 text-xs text-gray-400 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/5">
          <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white font-mono">Espaço</kbd> Play/Pause</span>
          <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white font-mono">←/→</kbd> 10s</span>
          <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white font-mono">F</kbd> Tela Cheia</span>
        </div>
      </div>

      {/* Play/Pause Giant Central Indicator (visible on hover/pause) */}
      {!isPlaying && (
        <button 
          id="btn-player-center-play"
          onClick={togglePlay}
          className="absolute z-20 p-6 rounded-full bg-red-600/90 text-white hover:bg-red-500 hover:scale-110 shadow-2xl transition duration-300"
        >
          <Play size={40} className="ml-1" />
        </button>
      )}

      {/* Bottom Control Bar */}
      <div 
        id="player-bottom-bar"
        className={`
          absolute bottom-0 left-0 right-0 z-30 p-6 bg-gradient-to-t from-black/90 to-transparent flex flex-col space-y-4 transition-all duration-300
          ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5 pointer-events-none'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Seek Track Bar */}
        <div className="flex items-center space-x-4">
          <span className="text-xs font-mono text-gray-300 w-12 text-right">
            {formatTime(currentTime)}
          </span>
          <div className="relative flex-grow group py-2">
            <input
              id="player-seek-slider"
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-red-600 hover:h-2 transition-all duration-150"
            />
            {/* Visual Progress Highlight */}
            <div 
              className="absolute left-0 top-[11px] h-1 bg-red-600 rounded-lg pointer-events-none group-hover:h-2 transition-all duration-150"
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
            />
          </div>
          <span className="text-xs font-mono text-gray-300 w-12">
            {formatTime(duration)}
          </span>
        </div>

        {/* Primary Controls Row */}
        <div className="flex justify-between items-center">
          {/* Left Controls: Play, 10s Back, Volume, Next Episode */}
          <div className="flex items-center space-x-4 md:space-x-6">
            <button
              id="btn-player-play-pause"
              onClick={togglePlay}
              className="p-2 rounded-full hover:bg-white/10 text-white transition duration-200 cursor-pointer"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>

            <button
              id="btn-player-rewind"
              onClick={() => {
                if (videoRef.current) videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0);
              }}
              className="p-2 rounded-full hover:bg-white/10 text-white transition duration-200 cursor-pointer"
              title="Voltar 10s"
            >
              <RotateCcw size={20} />
            </button>

            {onNextEpisode && (
              <button
                id="btn-player-next-ep"
                onClick={onNextEpisode}
                className="p-2 rounded-full hover:bg-white/10 text-white transition duration-200 cursor-pointer"
                title="Próximo Episódio"
              >
                <SkipForward size={20} />
              </button>
            )}

            {/* Volume Area */}
            <div className="flex items-center space-x-2 group">
              <button
                id="btn-player-mute"
                onClick={toggleMute}
                className="p-2 rounded-full hover:bg-white/10 text-white transition duration-200 cursor-pointer"
              >
                {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                id="player-volume-slider"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-0 group-hover:w-20 focus:w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white transition-all duration-300 overflow-hidden"
              />
            </div>
          </div>

          {/* Right Controls: Subtitle Options, Speeds, Screen Size */}
          <div className="flex items-center space-x-4">
            {/* Quick Subtitle Toggle */}
            <button
              id="btn-player-sub-toggle"
              onClick={() => {
                setSubtitleLanguage(prev => {
                  if (prev === 'off') return 'pt';
                  if (prev === 'pt') return 'en';
                  return 'off';
                });
              }}
              className={`p-2 rounded-full hover:bg-white/10 transition duration-200 cursor-pointer flex items-center space-x-1 ${subtitleLanguage !== 'off' ? 'text-red-500' : 'text-white'}`}
              title="Alternar Legendas (PT/EN/Off)"
            >
              <Type size={20} />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {subtitleLanguage === 'off' ? 'OFF' : subtitleLanguage}
              </span>
            </button>

            {/* Config Menu Trigger */}
            <div className="relative">
              <button
                id="btn-player-settings"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSettingsMenu(!showSettingsMenu);
                }}
                className={`p-2 rounded-full hover:bg-white/10 text-white transition duration-200 cursor-pointer ${showSettingsMenu ? 'bg-white/10 text-red-400' : ''}`}
                title="Ajustes de Áudio, Legendas e Velocidade"
              >
                <Sliders size={20} />
              </button>

              {/* Popover Settings Panel */}
              {showSettingsMenu && (
                <div 
                  id="player-settings-menu"
                  className="absolute bottom-12 right-0 bg-zinc-950/95 border border-zinc-800 p-5 rounded-xl w-72 shadow-2xl backdrop-blur-xl z-40 text-white space-y-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-xs font-bold uppercase text-red-500 tracking-wider pb-1 border-b border-zinc-800">Ajustes de Exibição</h3>
                  
                  {/* Audio Track Selector */}
                  <div className="space-y-1.5">
                    <span className="text-xs text-gray-400 block font-medium">Idioma do Áudio</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setAudioTrack('pt')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center justify-between ${audioTrack === 'pt' ? 'bg-red-600 border-red-500' : 'border-zinc-800 hover:bg-white/5'}`}
                      >
                        Português (Dub)
                        {audioTrack === 'pt' && <Check size={12} />}
                      </button>
                      <button
                        onClick={() => setAudioTrack('en')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center justify-between ${audioTrack === 'en' ? 'bg-red-600 border-red-500' : 'border-zinc-800 hover:bg-white/5'}`}
                      >
                        Inglês (Orig)
                        {audioTrack === 'en' && <Check size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* Playback Rate */}
                  <div className="space-y-1.5">
                    <span className="text-xs text-gray-400 block font-medium">Velocidade de Reprodução</span>
                    <div className="grid grid-cols-4 gap-1">
                      {[0.5, 1, 1.5, 2].map(speed => (
                        <button
                          key={speed}
                          onClick={() => handleSpeedChange(speed)}
                          className={`py-1 rounded text-[11px] font-mono border ${playbackRate === speed ? 'bg-zinc-800 border-zinc-600 text-red-400' : 'border-zinc-900 hover:bg-white/5 text-gray-300'}`}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subtitle Customizations */}
                  <div className="space-y-2 pt-2 border-t border-zinc-900">
                    <span className="text-xs text-gray-400 block font-medium">Tamanho da Legenda</span>
                    <div className="grid grid-cols-3 gap-1">
                      {(['sm', 'md', 'lg'] as const).map(size => (
                        <button
                          key={size}
                          onClick={() => setSubtitleSize(size)}
                          className={`py-1 rounded text-[10px] uppercase font-bold border ${subtitleSize === size ? 'bg-zinc-800 border-zinc-600 text-red-400' : 'border-zinc-900 hover:bg-white/5 text-gray-300'}`}
                        >
                          {size === 'sm' ? 'Pequeno' : size === 'md' ? 'Médio' : 'Grande'}
                        </button>
                      ))}
                    </div>

                    <label className="flex items-center justify-between text-xs text-gray-300 pt-1 cursor-pointer">
                      <span>Fundo Escuro nas Legendas</span>
                      <input
                        type="checkbox"
                        checked={subtitleBg}
                        onChange={(e) => setSubtitleBg(e.target.checked)}
                        className="rounded bg-zinc-900 border-zinc-700 text-red-600 focus:ring-red-500"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            <button
              id="btn-player-fullscreen"
              onClick={toggleFullscreen}
              className="p-2 rounded-full hover:bg-white/10 text-white transition duration-200 cursor-pointer"
              title="Tela Cheia"
            >
              <Maximize size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
