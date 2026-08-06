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
        <label htmlFor={id} className="mb-2 block text-sm font-semibold text-[#0a1628] dark:text-[#dce8f5]">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={clsx(
          "w-full rounded-2xl border border-[#003b8e]/20 bg-white/95 dark:bg-[#0f1f3d]/80 px-4 py-3.5 text-sm text-[#0a1628] dark:text-[#eef4fc] outline-none transition-all",
          "placeholder:text-[#6b8299] focus:border-[#003b8e] focus:ring-4 focus:ring-[#003b8e]/12",
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
