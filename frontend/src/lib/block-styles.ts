import type { CSSProperties } from "react";
import { mergeBlockStyles, type BlockStyleConfig } from "@/lib/block-registry";

/** Map 0–100 slider values to CSS — never widen past the viewport. */
export function blockStyleToCss(styles: BlockStyleConfig): CSSProperties {
  const py = Math.round((styles.padding_y ?? 50) * 1.2);
  const px = Math.min(24, Math.round((styles.padding_x ?? 50) * 0.32));
  const maxW = Math.min(100, 80 + ((styles.max_width ?? 90) / 100) * 20);
  const glass = (styles.glass ?? 65) / 100;
  const radius = Math.round(((styles.border_radius ?? 50) / 100) * 32);

  return {
    paddingTop: `${py}px`,
    paddingBottom: `${py}px`,
    paddingInline: `${px}px`,
    maxWidth: `min(100%, ${maxW}%)`,
    width: "100%",
    marginInline: "auto",
    boxSizing: "border-box",
    ["--block-glass" as string]: String(glass),
    ["--block-radius" as string]: `${radius}px`,
  };
}

export function blockVisibilityClass(styles: BlockStyleConfig): string {
  const parts: string[] = [];
  if (styles.hide_mobile) parts.push("hidden md:block");
  if (styles.hide_desktop) parts.push("md:hidden");
  return parts.join(" ");
}

export function glassStyleFromLevel(level: number): CSSProperties {
  const t = level / 100;
  return {
    backdropFilter: `blur(${8 + t * 16}px) saturate(${1 + t * 0.4})`,
    WebkitBackdropFilter: `blur(${8 + t * 16}px) saturate(${1 + t * 0.4})`,
    background: `rgba(255,255,255,${0.72 + t * 0.22})`,
  };
}

export function animationVariants(
  animation: BlockStyleConfig["animation"],
  intensity: number,
) {
  const d = 0.3 + (intensity / 100) * 0.5;
  const offset = 20 + (intensity / 100) * 40;

  switch (animation) {
    case "fade-in":
      return {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: d } },
      };
    case "slide-up":
      return {
        hidden: { opacity: 0, y: offset },
        visible: { opacity: 1, y: 0, transition: { duration: d, ease: "easeOut" as const } },
      };
    case "slide-right":
      return {
        hidden: { opacity: 0, x: -offset },
        visible: { opacity: 1, x: 0, transition: { duration: d } },
      };
    case "zoom-in":
      return {
        hidden: { opacity: 0, scale: 0.92 },
        visible: { opacity: 1, scale: 1, transition: { duration: d } },
      };
    case "fade-up":
    default:
      return {
        hidden: { opacity: 0, y: offset * 0.7 },
        visible: { opacity: 1, y: 0, transition: { duration: d, ease: "easeOut" as const } },
      };
  }
}

export function getStylesFromProps(props: Record<string, unknown>) {
  return mergeBlockStyles(props);
}
