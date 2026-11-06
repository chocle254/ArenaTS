import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-[background-color,border-color,color,transform,box-shadow,filter] duration-200 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "btn-shine border-0 bg-[linear-gradient(180deg,hsl(var(--primary-2)),hsl(var(--primary)))] text-primary-foreground shadow-[0_8px_24px_-10px_hsl(var(--primary)/0.8),inset_0_1px_0_hsl(0_0%_100%/0.25)] hover:brightness-110 hover:shadow-[0_12px_32px_-10px_hsl(var(--primary)/0.95),inset_0_1px_0_hsl(0_0%_100%/0.3)]",
        gold:
          "btn-shine border-0 bg-[linear-gradient(180deg,hsl(46_100%_70%),hsl(var(--gold-2)))] text-[hsl(30_60%_10%)] shadow-[0_8px_24px_-10px_hsl(var(--gold)/0.7),inset_0_1px_0_hsl(0_0%_100%/0.45)] hover:brightness-105 hover:shadow-[0_12px_32px_-10px_hsl(var(--gold)/0.85),inset_0_1px_0_hsl(0_0%_100%/0.5)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_8px_24px_-12px_hsl(var(--destructive)/0.8)] hover:brightness-110",
        outline:
          "border border-white/10 bg-white/[0.03] backdrop-blur-md hover:border-white/20 hover:bg-white/[0.07] hover:text-foreground",
        secondary:
          "border border-white/[0.06] bg-white/[0.06] text-secondary-foreground hover:bg-white/[0.1]",
        ghost: "hover:bg-white/[0.06] hover:text-foreground",
        link: "text-primary-soft underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3.5 text-xs",
        lg: "h-12 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
