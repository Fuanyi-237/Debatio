'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

const glassButtonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-glass-gradient border border-white/10 text-white hover:bg-white/[0.12] hover:border-white/20 shadow-glass-sm',
        primary:
          'bg-primary-600 border border-primary-500 text-white hover:bg-primary-500 hover:shadow-glow-primary',
        pro: 'bg-debate-pro/20 border border-debate-pro/40 text-debate-pro-light hover:bg-debate-pro/30 hover:shadow-glow-pro',
        con: 'bg-debate-con/20 border border-debate-con/40 text-debate-con-light hover:bg-debate-con/30 hover:shadow-glow-con',
        ghost: 'hover:bg-white/5 hover:text-white text-white/70',
        outline:
          'border border-white/20 bg-transparent text-white hover:bg-white/5 hover:border-white/30',
        subtle:
          'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white',
        destructive:
          'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof glassButtonVariants> {
  asChild?: boolean
}

const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(glassButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
GlassButton.displayName = 'GlassButton'

export { GlassButton, glassButtonVariants }
