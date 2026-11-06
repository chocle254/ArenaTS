import type React from 'react';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

/** App toasts. Always dark (the app has no light theme), above the bottom nav. */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="top-center"
      closeButton
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:glass-float group-[.toaster]:text-foreground group-[.toaster]:border-white/10 group-[.toaster]:shadow-[0_20px_50px_-16px_hsl(232_60%_2%/0.9)] group-[.toaster]:rounded-2xl',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-semibold',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
