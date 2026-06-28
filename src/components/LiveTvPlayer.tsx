import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { LiveChannel } from '../data';
import { Shield, AlertTriangle, Loader2, RefreshCw, Tv } from 'lucide-react';

interface LiveTvPlayerProps {
  channel: LiveChannel;
}

export default function LiveTvPlayer({ channel }: LiveTvPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playbackState, setPlaybackState] = useState<'loading' | 'playing' | 'error'>('loading');
  const [isUsingProxy, setIsUsingProxy] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [retryCount, setRetryCount] = useState<number>(0);

  useEffect(() => {
    let hls: Hls | null = null;
    const videoElement = videoRef.current;
    if (!videoElement) return;

    setPlaybackState('loading');
    setErrorMessage('');

    const originalUrl = channel.videoUrl;
    // If the URL is insecure (http://), it WILL be blocked by Mixed Content.
    // So we MUST automatically proxy it.
    const mustUseProxy = originalUrl.startsWith('http://');
    const targetUrl = mustUseProxy 
      ? `/api/iptv/proxy?url=${encodeURIComponent(originalUrl)}` 
      : originalUrl;

    setIsUsingProxy(mustUseProxy);

    const initPlayer = (url: string, usingProxyNow: boolean) => {
      const isM3u8 = url.endsWith('.m3u8') || url.includes('m3u8') || url.includes('playlist') || url.includes('/api/iptv/proxy');

      if (isM3u8) {
        if (Hls.isSupported()) {
          if (hls) {
            hls.destroy();
          }
          
          hls = new Hls({
            maxMaxBufferLength: 10,
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 5
          });

          hls.loadSource(url);
          hls.attachMedia(videoElement);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setPlaybackState('playing');
            videoElement.play().catch(e => {
              console.log('Live TV Autoplay prevented. Trying to play muted:', e);
              videoElement.muted = true;
              videoElement.play().catch(err => console.log('Play failed even when muted:', err));
            });
          });

          hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
              console.warn('Fatal HLS error encountered:', data);
              
              // If we haven't tried the proxy yet, and we got a network error, let's switch to the proxy fallback!
              if (!usingProxyNow) {
                console.log('Direct playback failed. Retrying with backend secure proxy stream...');
                setIsUsingProxy(true);
                hls?.destroy();
                initPlayer(`/api/iptv/proxy?url=${encodeURIComponent(originalUrl)}`, true);
              } else {
                // Already tried proxy and failed, or failed on proxy
                setPlaybackState('error');
                setErrorMessage(data.details || 'Erro de sinal de transmissão');
                hls?.destroy();
              }
            }
          });
        } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
          videoElement.src = url;
          videoElement.play()
            .then(() => setPlaybackState('playing'))
            .catch(e => {
              console.log('Live TV Native HLS play blocked:', e);
              if (!usingProxyNow) {
                setIsUsingProxy(true);
                initPlayer(`/api/iptv/proxy?url=${encodeURIComponent(originalUrl)}`, true);
              } else {
                setPlaybackState('error');
                setErrorMessage('Navegador não conseguiu processar a transmissão nativamente.');
              }
            });
        }
      } else {
        videoElement.src = url;
        videoElement.play()
          .then(() => setPlaybackState('playing'))
          .catch(e => {
            console.log('Live TV MP4 play blocked:', e);
            setPlaybackState('error');
            setErrorMessage('Formato de vídeo incompatível.');
          });
      }
    };

    initPlayer(targetUrl, mustUseProxy);

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [channel.videoUrl, retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  return (
    <div className="relative w-full h-full bg-black group select-none flex items-center justify-center">
      {/* Real Video Element */}
      <video
        ref={videoRef}
        className={`w-full h-full object-contain bg-black transition-opacity duration-300 ${
          playbackState === 'playing' ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
        }`}
        autoPlay
        controls
        playsInline
      />

      {/* Overlay: Loading State */}
      {playbackState === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 text-white p-4 space-y-4 z-10">
          <div className="relative flex items-center justify-center">
            <Loader2 className="animate-spin text-red-500 h-10 w-10" />
            <Tv className="absolute h-4 w-4 text-white" />
          </div>
          <div className="text-center space-y-1 max-w-md">
            <p className="text-sm font-bold tracking-wide">Sintonizando Canal de TV...</p>
            <p className="text-[10px] text-gray-500 font-mono truncate max-w-xs">{channel.name}</p>
            {isUsingProxy && (
              <p className="text-[10px] text-emerald-400 font-mono bg-emerald-950/40 border border-emerald-900/30 px-2.5 py-0.5 rounded-full inline-block mt-2">
                🛡️ Modo Proxy Seguro Ativado
              </p>
            )}
          </div>
        </div>
      )}

      {/* Overlay: Error State */}
      {playbackState === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 text-white p-6 text-center space-y-4 z-10 border border-zinc-850">
          <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-full">
            <AlertTriangle className="text-red-500 h-8 w-8 animate-pulse" />
          </div>
          <div className="space-y-2 max-w-md">
            <h4 className="text-sm font-black text-white">Sinal Offline ou Incompatível</h4>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Não foi possível sintonizar este canal. O link original pode estar temporariamente fora do ar, com limitação de banda ou requer conexões específicas.
            </p>
            <div className="p-2.5 bg-zinc-900/50 rounded-xl text-[9px] text-gray-400 text-left font-mono break-all border border-zinc-850/50">
              <span className="text-red-400 font-bold">Link original:</span> {channel.videoUrl}
            </div>
            <p className="text-[9px] text-gray-500">
              💡 <em>Tentamos redirecionar via Proxy Seguro HTTPS para contornar restrições de CORS e navegador, mas o servidor transmissor não respondeu.</em>
            </p>
          </div>
          <button
            onClick={handleRetry}
            className="flex items-center space-x-2 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold px-4 py-2 rounded-xl transition cursor-pointer"
          >
            <RefreshCw size={11} />
            <span>Tentar Novamente</span>
          </button>
        </div>
      )}

      {/* Persistent Badge: Active Proxy Shield Overlay */}
      {playbackState === 'playing' && isUsingProxy && (
        <div className="absolute top-4 right-4 bg-emerald-500/90 backdrop-blur-md text-zinc-950 font-bold text-[9px] px-2.5 py-1 rounded-lg shadow-md border border-emerald-400/30 flex items-center space-x-1.5 uppercase tracking-wider z-10 pointer-events-none transition opacity-70 hover:opacity-100">
          <Shield size={10} className="fill-current" />
          <span>Proxy Seguro</span>
        </div>
      )}
    </div>
  );
}
