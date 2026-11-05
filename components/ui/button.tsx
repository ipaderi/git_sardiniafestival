import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("focus-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50", {
  variants: {
    variant: {
      primary: "bg-sea-bright text-ink hover:bg-[#4bd0c2]",
      dark: "bg-ink text-white hover:bg-[#12446b]",
      outline: "border border-slate-200 bg-white text-ink hover:bg-slate-50",
      ghost: "text-ink hover:bg-slate-100",
      coral: "bg-coral text-white hover:bg-[#dc6449]",
    },
    size: { default: "h-11 px-5", sm: "h-9 px-3.5 text-xs", lg: "h-14 px-7 text-base", icon: "size-10 p-0" },
  },
  defaultVariants: { variant: "primary", size: "default" },
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
