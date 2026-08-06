import clsx from "clsx";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
};

const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={clsx(
        "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed",
        size === "sm" && "rounded-xl px-4 py-2 text-sm",
        size === "md" && "rounded-2xl px-6 py-3 text-sm",
        size === "lg" && "rounded-2xl px-8 py-4 text-base",
        variant === "primary" &&
          "gradient-shomal text-white shadow-lg shadow-shomal-primary/25 hover:shadow-xl hover:shadow-shomal-primary/30 hover:-translate-y-0.5",
        variant === "secondary" &&
          "bg-white text-shomal-primary shadow-md hover:shadow-lg hover:-translate-y-0.5",
        variant === "outline" &&
          "border-2 border-white/40 text-white hover:bg-white/10 backdrop-blur-sm",
        variant === "ghost" &&
          "text-shomal-primary hover:bg-shomal-primary/5",
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
export default Button;
