import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Check, 
  ChevronRight, 
  FileText, 
  Loader2, 
  ScanFace, 
  ShieldCheck, 
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

type KYCStep = 'intro' | 'id_capture' | 'selfie_capture' | 'processing' | 'success' | 'rejected';

export default function KYCVerificationDialog({ open, onOpenChange }: KYCVerificationDialogProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState<KYCStep>('intro');
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('intro');
        setIdFrontFile(null);
        setSelfieFile(null);
      }, 300);
    } else {
      if (profile?.kyc_status === 'pending') setStep('processing');
      if (profile?.kyc_status === 'verified') setStep('success');
      if (profile?.kyc_status === 'rejected') {
        setRejectionReason(profile.kyc_rejection_reason || 'Identity verification failed. Please try again.');
        setStep('rejected');
      }
    }
  }, [open, profile]);

  useEffect(() => {
    if (open) {
      refreshProfile?.();
    }
  }, [open]);

  const handleIdFrontCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdFrontFile(file);
      setStep('selfie_capture');
    }
  };

  const handleSelfieCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelfieFile(file);
      setStep('processing');
      submitVerification(file);
    }
  };

  const submitVerification = async (selfie: File) => {
    setIsUploading(true);

    try {
      if (!user) throw new Error('Not authenticated');
      if (!idFrontFile) throw new Error('A photo of your ID is required');

      const uploadDoc = async (file: File, name: string) => {
        const path = `${user.id}/${name}`;
        const { error: uploadError } = await supabase.storage
          .from('kyc-documents')
          .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
        if (uploadError) throw uploadError;
        return path;
      };

      const [frontPath, selfiePath] = await Promise.all([
        uploadDoc(idFrontFile, 'id-front.jpg'),
        uploadDoc(selfie, 'selfie.jpg'),
      ]);

      const { error } = await supabase
        .from('profiles')
        .update({
          kyc_status: 'pending',
          kyc_rejection_reason: null,
          kyc_id_front_path: frontPath,
          kyc_id_back_path: null,
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
      setStep('id_capture');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-full max-w-[calc(100%-2rem)] p-0 overflow-hidden bg-card border-border">
        <div className="flex flex-col h-full max-h-[85vh]">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-background z-10">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="h-5 w-5" />
              <h2 className="font-semibold">Identity Verification</h2>
            </div>
          </div>

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
                        <p className="text-muted-foreground text-xs">A photo of the front of your driver's license, passport, or national ID</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <ScanFace className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="font-medium">2. Selfie</p>
                        <p className="text-muted-foreground text-xs">A quick photo of your face</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-[11px] text-muted-foreground text-center">
                    By proceeding, you agree to our{' '}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Terms &amp; Conditions</a>
                    {' '}and{' '}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Privacy Policy</a>
                    {' '}regarding identity verification. Documents are securely stored and retained as required by law, and reviewed only for verification purposes.
                  </div>

                  <Button className="w-full" onClick={() => setStep('id_capture')}>
                    Start Verification
                  </Button>
                </motion.div>
              )}

              {step === 'id_capture' && (
                <motion.div
                  key="id_capture"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-semibold">Photograph Your ID</h3>
                    <p className="text-sm text-muted-foreground">
                      Take a clear photo of the front of your government-issued ID.
                    </p>
                  </div>

                  <div>
                    <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-muted/30 transition-colors relative cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleIdFrontCapture}
                      />
                      {idFrontFile ? (
                        <div className="space-y-2">
                          <div className="w-10 h-10 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto">
                            <Check className="h-5 w-5" />
                          </div>
                          <p className="text-sm font-medium text-primary">ID Captured</p>
                          <p className="text-xs text-muted-foreground">{idFrontFile.name}</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Camera className="h-10 w-10 text-muted-foreground mx-auto" />
                          <p className="text-sm font-medium">Tap to open camera</p>
                          <p className="text-xs text-muted-foreground">Front of ID only</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 text-xs text-muted-foreground items-start bg-muted/50 p-3 rounded-lg">
                    <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p>Make sure all corners are visible, text is readable, and there is no glare.</p>
                  </div>

                  <Button
                    className="w-full"
                    disabled={!idFrontFile}
                    onClick={() => setStep('selfie_capture')}
                  >
                    Continue
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </motion.div>
              )}

              {step === 'selfie_capture' && (
                <motion.div
                  key="selfie_capture"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-semibold">Take a Selfie</h3>
                    <p className="text-sm text-muted-foreground">
                      A quick, clear photo of your face.
                    </p>
                  </div>

                  <div>
                    <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-muted/30 transition-colors relative cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        capture="user"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleSelfieCapture}
                      />
                      {selfieFile ? (
                        <div className="space-y-2">
                          <div className="w-10 h-10 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto">
                            <Check className="h-5 w-5" />
                          </div>
                          <p className="text-sm font-medium text-primary">Selfie Captured</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <ScanFace className="h-10 w-10 text-muted-foreground mx-auto" />
                          <p className="text-sm font-medium">Tap to open front camera</p>
                        </div>
                      )}
                    </div>
                  </div>
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
                      {profile?.kyc_status === 'pending' ? 'Application Under Review' : 'Submitting Documents'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {profile?.kyc_status === 'pending' 
                        ? 'Your identity documents have been submitted and are pending manual review by our admin team. This usually takes 1-2 business days.' 
                        : 'Uploading your documents securely.'}
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
                    <Button className="flex-1" onClick={() => setStep('id_capture')}>
                      Try Again
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
