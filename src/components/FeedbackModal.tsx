import { Star, Trophy } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const { user, refreshProfile } = useAuth();
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;

    if (!feedback.trim()) {
      toast.error('Please provide your feedback');
      return;
    }

    if (rating === 0) {
      toast.error('Please rate your experience');
      return;
    }

    setLoading(true);
    try {
      // Submit feedback
      const { error: feedbackError } = await supabase
        .from('user_feedback')
        .insert({
          user_id: user.id,
          feedback_text: feedback.trim(),
          rating: rating
        });

      if (feedbackError) throw feedbackError;

      // Mark feedback as submitted
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ feedback_submitted: true })
        .eq('id', user.id);

      if (profileError) throw profileError;

      await refreshProfile();
      
      toast.success('Thank you for your feedback! Wait for the official launch to continue playing.');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
              <Trophy className="h-8 w-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">Demo Complete!</DialogTitle>
          <DialogDescription className="text-center text-base">
            You've used all your Arena Currency. This was a demo experience to help you understand how ARENA works.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Rating */}
          <div className="space-y-3">
            <Label className="text-base">Rate your experience</Label>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Feedback */}
          <div className="space-y-3">
            <Label htmlFor="feedback" className="text-base">Share your thoughts</Label>
            <Textarea
              id="feedback"
              placeholder="What did you like? What could be improved? Any suggestions for the official launch?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>

          {/* Info Box */}
          <div className="p-4 rounded-lg bg-blue-950/20 border border-blue-500/20">
            <p className="text-sm text-muted-foreground font-light">
              <strong className="text-foreground">What's next?</strong><br />
              Wait for the official ARENA launch to start playing with real funds. We'll notify you via email when we go live!
            </p>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
