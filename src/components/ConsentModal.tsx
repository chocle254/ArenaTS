
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { formatArenaCurrency } from '@/lib/arena-currency';

interface ConsentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  amount: number;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}

export function ConsentModal({
  open,
  onOpenChange,
  title,
  description,
  amount,
  onConfirm,
  confirmText = 'Agree & Continue',
  cancelText = 'Decline',
  loading = false,
}: ConsentModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-transparent shadow-none">
        <Card className="w-full backdrop-blur-card border-border relative overflow-hidden">
          {/* Gradient Background - matching SignIn styling */}
          <div 
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              background: 'linear-gradient(to right, #2563eb 0%, #9333ea 50%, #2563eb 100%)'
            }}
          />
          
          <div className="relative z-10">
            <CardHeader className="space-y-2 pb-6">
              <CardTitle className="text-3xl font-display text-center gradient-text">
                CONFIRMATION
              </CardTitle>
              <CardDescription className="text-center text-muted-foreground">
                Please confirm the deduction of Arena Currency
              </CardDescription>
            </CardHeader>
            
            <CardContent className="px-8 space-y-6">
              <div className="text-center space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-light text-muted-foreground uppercase tracking-widest">Action</p>
                  <p className="text-xl font-medium text-foreground">{title}</p>
                </div>
                
                <p className="text-sm text-muted-foreground font-light leading-relaxed">
                  {description}
                </p>
                
                <div className="py-4 px-6 rounded-2xl bg-primary/5 border border-primary/10 inline-block mx-auto">
                  <p className="text-xs font-medium text-primary uppercase tracking-widest mb-1">Amount to deduct</p>
                  <p className="text-4xl font-bold font-mono text-primary">
                    {formatArenaCurrency(amount)}
                  </p>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col gap-3 px-8 pb-8 mt-4">
              <Button 
                onClick={onConfirm} 
                className="w-full h-12 text-lg font-semibold sheen-effect"
                disabled={loading}
              >
                {loading ? 'Processing...' : confirmText}
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => onOpenChange(false)}
                className="w-full hover:bg-white/5 text-muted-foreground"
                disabled={loading}
              >
                {cancelText}
              </Button>
            </CardFooter>
          </div>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
