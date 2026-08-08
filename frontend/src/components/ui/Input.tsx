import clsx from "clsx";
import { InputHTMLAttributes, forwardRef } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

const Input = forwardRef<HTMLInputElement, Props>(
  ({ className, label, error, id, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-2 block text-sm font-semibold text-foreground">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={clsx(
          "w-full rounded-2xl border border-shomal-border bg-surface px-4 py-3.5 text-sm text-foreground outline-none transition-all font-sans",
          "placeholder:text-muted focus:border-shomal-primary focus:ring-4 focus:ring-[#003b8e]/12",
          error && "border-red-400 focus:border-red-400 focus:ring-red-100",
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  ),
);
Input.displayName = "Input";
export default Input;
