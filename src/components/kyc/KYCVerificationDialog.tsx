import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Check, 
  ChevronRight, 
  CreditCard, 
  FileText, 
  Loader2, 
  ScanFace, 
  ShieldCheck, 
  UploadCloud, 
  UserSquare2,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface KYCVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type KYCStep = 'intro' | 'id_upload' | 'face_scan' | 'processing' | 'success' | 'rejected';

export default function KYCVerificationDialog({ open, onOpenChange }: KYCVerificationDialogProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState<KYCStep>('intro');
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [faceCaptured, setFaceCaptured] = useState(false);
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('intro');
        setIdFrontFile(null);
        setIdBackFile(null);
        setSelfieBlob(null);
        setFaceCaptured(false);
        stopCamera();
      }, 300);
    } else {
      // If they already have a status, skip to the relevant screen if not unverified
      if (profile?.kyc_status === 'pending') setStep('processing');
      if (profile?.kyc_status === 'verified') setStep('success');
      if (profile?.kyc_status === 'rejected') {
        setRejectionReason(profile.kyc_rejection_reason || 'Identity verification failed. Please try again.');
        setStep('rejected');
      }
    }
  }, [open, profile]);

  // Refresh profile when dialog opens so the latest status is reflected
  useEffect(() => {
    if (open) {
      refreshProfile?.();
    }
  }, [open]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const cameraErrorMessage = (err: unknown) => {
    const name = (err as { name?: string })?.name;
    switch (name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return 'Camera access was denied. Please allow camera permissions for this site in your browser settings and try again.';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'No camera was found on this device.';
      case 'NotReadableError':
      case 'TrackStartError':
        return 'Your camera is already in use by another application. Close it and try again.';
      case 'SecurityError':
        return 'Camera access requires a secure (https) connection.';
      default:
        return 'Could not access camera. Please check permissions and try again.';
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Capture button stays disabled until the video actually has
        // frame data (videoWidth/Height), otherwise a capture attempt
        // produces a blank/zero-size image and silently "does nothing".
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
          setVideoReady(true);
        };
      }
      setCameraActive(true);
    } catch (err) {
      console.error('Error accessing camera:', err);
      toast.error(cameraErrorMessage(err));
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setVideoReady(false);
  };

  const captureFace = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      toast.error('Camera is still starting up — give it a second and try again.');
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      toast.error('Could not capture photo on this device/browser.');
      return;
    }

    // The preview is mirrored (-scale-x-100) so it feels like a mirror;
    // un-mirror the actual captured frame so the saved photo is natural.
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error('Could not capture photo, please try again.');
        return;
      }
      setSelfieBlob(blob);
      setFaceCaptured(true);
      setTimeout(() => {
        stopCamera();
        setStep('processing');
        submitVerification(blob);
      }, 1200);
    }, 'image/jpeg', 0.92);
  };

  const handleIdFrontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setIdFrontFile(file);
  };

  const handleIdBackUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setIdBackFile(file);
  };

  const submitVerification = async (selfie: Blob) => {
    setIsUploading(true);

    try {
      if (!user) throw new Error('Not authenticated');
      if (!idFrontFile || !idBackFile) throw new Error('Both sides of your ID are required');

      // Fixed per-user paths (upsert) so a resubmission cleanly replaces
      // the previous documents rather than orphaning old files.
      const uploadDoc = async (file: Blob, name: string, contentType: string) => {
        const path = `${user.id}/${name}`;
        const { error: uploadError } = await supabase.storage
          .from('kyc-documents')
          .upload(path, file, { upsert: true, contentType });
        if (uploadError) throw uploadError;
        return path;
      };

      const [frontPath, backPath, selfiePath] = await Promise.all([
        uploadDoc(idFrontFile, 'id-front.jpg', idFrontFile.type || 'image/jpeg'),
        uploadDoc(idBackFile, 'id-back.jpg', idBackFile.type || 'image/jpeg'),
        uploadDoc(selfie, 'selfie.jpg', 'image/jpeg'),
      ]);

      const { error } = await supabase
        .from('profiles')
        .update({
          kyc_status: 'pending',
          kyc_rejection_reason: null,
          kyc_id_front_path: frontPath,
          kyc_id_back_path: backPath,
          kyc_selfie_path: selfiePath,
          kyc_submitted_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw new Error(error.message);
      await refreshProfile();
      setStep('processing');
      toast.success('Documents submitted! Pending admin review.');
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during verification');
      setStep('id_upload');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-full max-w-[calc(100%-2rem)] p-0 overflow-hidden bg-card border-border">
        <div className="flex flex-col h-full max-h-[85vh]">
          {/* Header */}
          <div className="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-background z-10">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="h-5 w-5" />
              <h2 className="font-semibold">Identity Verification</h2>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6 overflow-y-auto min-h-0 flex-1 relative">
            <AnimatePresence mode="wait">
              {step === 'intro' && (
                <motion.div
                  key="intro"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <UserSquare2 className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold">Verify Your Identity</h3>
                    <p className="text-sm text-muted-foreground">
                      To comply with AML/KYC regulations and ensure a safe wagering environment, 
                      we need to verify you are at least 18 years old.
                    </p>
                  </div>

                  <div className="space-y-3 bg-muted/30 p-4 rounded-xl text-sm">
                    <div className="flex gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="font-medium">1. Government ID</p>
                        <p className="text-muted-foreground text-xs">Driver's license, passport, or national ID</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <ScanFace className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="font-medium">2. Face Scan</p>
                        <p className="text-muted-foreground text-xs">A quick selfie to match your ID</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-[11px] text-muted-foreground text-center">
                    By proceeding, you agree to our Terms & Conditions regarding identity verification.
                    Documents are securely stored and retained for up to 60 months as required by law.
                  </div>

                  <Button className="w-full" onClick={() => setStep('id_upload')}>
                    Start Verification
                  </Button>
                </motion.div>
              )}

              {step === 'id_upload' && (
                <motion.div
                  key="id_upload"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-semibold">Upload ID Document</h3>
                    <p className="text-sm text-muted-foreground">
                      Please upload clear photos of the front and back of your government-issued ID.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Front of ID</p>
                      <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-muted/30 transition-colors relative cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={handleIdFrontUpload}
                        />
                        {idFrontFile ? (
                          <div className="space-y-2">
                            <div className="w-10 h-10 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto">
                              <Check className="h-5 w-5" />
                            </div>
                            <p className="text-sm font-medium text-primary">Front Uploaded</p>
                            <p className="text-xs text-muted-foreground">{idFrontFile.name}</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <UploadCloud className="h-8 w-8 text-muted-foreground mx-auto" />
                            <p className="text-sm font-medium">Click to upload front</p>
                            <p className="text-xs text-muted-foreground">JPEG, PNG up to 10MB</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Back of ID</p>
                      <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-muted/30 transition-colors relative cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={handleIdBackUpload}
                        />
                        {idBackFile ? (
                          <div className="space-y-2">
                            <div className="w-10 h-10 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto">
                              <Check className="h-5 w-5" />
                            </div>
                            <p className="text-sm font-medium text-primary">Back Uploaded</p>
                            <p className="text-xs text-muted-foreground">{idBackFile.name}</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <UploadCloud className="h-8 w-8 text-muted-foreground mx-auto" />
                            <p className="text-sm font-medium">Click to upload back</p>
                            <p className="text-xs text-muted-foreground">JPEG, PNG up to 10MB</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 text-xs text-muted-foreground items-start bg-muted/50 p-3 rounded-lg">
                    <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p>Make sure all corners are visible, text is readable, and there is no glare blocking your face or details.</p>
                  </div>

                  <Button
                    className="w-full"
                    disabled={!idFrontFile || !idBackFile}
                    onClick={() => setStep('face_scan')}
                  >
                    Continue
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </motion.div>
              )}

              {step === 'face_scan' && (
                <motion.div
                  key="face_scan"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-semibold">Face Verification</h3>
                    <p className="text-sm text-muted-foreground">
                      Position your face in the oval to match it with your ID.
                    </p>
                  </div>

                  <div className="relative aspect-[3/4] bg-black rounded-2xl overflow-hidden mx-auto max-w-[280px]">
                    {!cameraActive && !faceCaptured ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
                        <Camera className="h-10 w-10 text-white/50 mb-4" />
                        <p className="text-white text-sm mb-4">Camera access required</p>
                        <Button onClick={startCamera} size="sm" variant="secondary">Enable Camera</Button>
                      </div>
                    ) : (
                      <>
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          playsInline 
                          muted 
                          className="absolute inset-0 w-full h-full object-cover -scale-x-100"
                        />
                        {/* Oval overlay */}
                        <div className="absolute inset-0 z-10 pointer-events-none" style={{
                          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
                          borderRadius: '50%',
                          width: '70%',
                          height: '60%',
                          top: '20%',
                          left: '15%'
                        }}></div>
                        
                        {/* Scanning animation overlay */}
                        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                          <div className="w-full h-1 bg-primary/80 blur-[2px] animate-[scan_2s_ease-in-out_infinite]" />
                        </div>
                      </>
                    )}
                    
                    {faceCaptured && (
                      <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm z-30 flex items-center justify-center">
                        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center animate-bounce">
                          <Check className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-center">
                    <Button 
                      size="lg" 
                      className="rounded-full w-16 h-16 p-0 shadow-lg border-4 border-background"
                      onClick={captureFace}
                      disabled={!cameraActive || !videoReady || faceCaptured}
                    >
                      {cameraActive && !videoReady && !faceCaptured ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <Camera className="h-6 w-6" />
                      )}
                    </Button>
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                </motion.div>
              )}

              {step === 'processing' && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-10 space-y-6 text-center h-full"
                >
                  <div className="relative">
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                      <ShieldCheck className="h-10 w-10 text-muted-foreground" />
                    </div>
                    {isUploading && (
                      <svg className="absolute inset-0 w-full h-full animate-spin text-primary" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="75 225" />
                      </svg>
                    )}
                  </div>
                  
                  <div className="space-y-2 max-w-[280px]">
                    <h3 className="text-xl font-semibold">
                      {profile?.kyc_status === 'pending' ? 'Application Under Review' : 'Analyzing Documents'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {profile?.kyc_status === 'pending' 
                        ? 'Your identity documents have been submitted and are pending manual review by our admin team. This usually takes 1-2 business days.' 
                        : 'We are extracting data and running biometric matching. This usually takes less than a minute.'}
                    </p>
                  </div>
                  
                  {profile?.kyc_status === 'pending' && (
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                      Return to Wallet
                    </Button>
                  )}
                </motion.div>
              )}

              {step === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-8 space-y-6 text-center"
                >
                  <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-2">
                    <Check className="h-10 w-10" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">Identity Verified</h3>
                    <p className="text-sm text-muted-foreground">
                      Your identity has been successfully verified. You now have full access to withdrawals and platform features.
                    </p>
                  </div>
                  
                  <Button className="w-full" onClick={() => onOpenChange(false)}>
                    Continue
                  </Button>
                </motion.div>
              )}

              {step === 'rejected' && (
                <motion.div
                  key="rejected"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-8 space-y-6 text-center"
                >
                  <div className="w-20 h-20 bg-destructive/20 text-destructive rounded-full flex items-center justify-center mb-2">
                    <X className="h-10 w-10" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">Verification Failed</h3>
                    <p className="text-sm text-muted-foreground">
                      {rejectionReason || 'We were unable to verify your identity. Please ensure your document is valid, clearly visible, and that you are 18 or older.'}
                    </p>
                  </div>
                  
                  <div className="w-full flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                      Close
                    </Button>
                    <Button className="flex-1" onClick={() => setStep('id_upload')}>
                      Try Again
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Custom scan animation styles */}
        <style>{`
          @keyframes scan {
            0% { transform: translateY(-100px); }
            50% { transform: translateY(300px); }
            100% { transform: translateY(-100px); }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
