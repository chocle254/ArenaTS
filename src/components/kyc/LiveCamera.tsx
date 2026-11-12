import { Camera, Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Takes a photo with the device camera inside the app. There is no file
 * picker, so the picture has to be taken live (no gallery uploads).
 *
 * `guide` draws an outline to help line up the shot:
 *  - 'id': an ID-card frame (back camera)
 *  - 'selfie_with_id': a face oval plus an ID-card frame below it (front camera)
 */
interface LiveCameraProps {
  facing: 'user' | 'environment';
  guide: 'id' | 'selfie_with_id';
  onCapture: (photo: Blob) => void;
  disabled?: boolean;
}

type CamState = 'starting' | 'live' | 'captured' | 'error';

const MAX_WIDTH = 1600;

function cameraError(err: unknown): string {
  const name = (err as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Camera access is blocked. Allow the camera for this site in your browser settings, then tap Try again.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No camera was found on this device. ID checks need a phone or laptop with a camera.';
  }
  if (name === 'NotReadableError') {
    return 'Another app is using the camera. Close it and tap Try again.';
  }
  return 'The camera could not start. Tap Try again.';
}

export function LiveCamera({ facing, guide, onCapture, disabled }: LiveCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CamState>('starting');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    stop();
    setState('starting');
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser cannot open the camera. Use Chrome or Safari on your phone.');
      setState('error');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => {});
      }
      setState('live');
    } catch (err) {
      setError(cameraError(err));
      setState('error');
    }
  }, [facing, stop]);

  useEffect(() => {
    void start();
    return stop;
  }, [start, stop]);

  // Free the preview image when it changes or the camera closes
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview.url);
  }, [preview]);

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // The front camera preview is mirrored for comfort; save the real (unmirrored) image so ID text reads correctly
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stop();
        setPreview({ url: URL.createObjectURL(blob), blob });
        setState('captured');
      },
      'image/jpeg',
      0.85,
    );
  };

  const retake = () => {
    setPreview(null);
    void start();
  };

  return (
    <div className="space-y-3">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-black">
        {state === 'captured' && preview ? (
          <img src={preview.url} alt="Your photo" className="h-full w-full object-cover" />
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={cn('h-full w-full object-cover', facing === 'user' && '-scale-x-100')}
          />
        )}

        {state === 'live' && (
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            {guide === 'selfie_with_id' ? (
              <>
                <div className="absolute left-1/2 top-[8%] h-[46%] w-[52%] -translate-x-1/2 rounded-[50%] border-2 border-white/80" />
                <div className="absolute bottom-[7%] left-1/2 h-[24%] w-[62%] -translate-x-1/2 rounded-lg border-2 border-dashed border-white/80" />
              </>
            ) : (
              <div className="absolute left-1/2 top-1/2 h-[38%] w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-dashed border-white/80" />
            )}
          </div>
        )}

        {state === 'starting' && (
          <div className="absolute inset-0 flex items-center justify-center text-white/80">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        {state === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-white">
            <Camera className="h-8 w-8 text-white/70" />
            <p>{error}</p>
            <Button size="sm" variant="secondary" onClick={() => void start()}>
              Try again
            </Button>
          </div>
        )}
      </div>

      {state === 'captured' && preview ? (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={retake} disabled={disabled}>
            <RefreshCw className="mr-1 h-4 w-4" />
            Retake
          </Button>
          <Button className="flex-1" onClick={() => onCapture(preview.blob)} disabled={disabled}>
            Use this photo
          </Button>
        </div>
      ) : (
        <Button className="w-full" onClick={capture} disabled={state !== 'live' || disabled}>
          <Camera className="mr-1 h-4 w-4" />
          Take photo
        </Button>
      )}
    </div>
  );
}
