"use client";

import { motion, type Variants } from "framer-motion";
import clsx from "clsx";
import type { HomepageBlock } from "@/lib/cms-client";
import {
  animationVariants,
  blockStyleToCss,
  blockVisibilityClass,
  getStylesFromProps,
} from "@/lib/block-styles";

type Props = {
  block: HomepageBlock;
  children: React.ReactNode;
  preview?: boolean;
};

/** Full-bleed sections must not get CMS max-width / side padding — that breaks mobile. */
const FULL_BLEED = new Set(["hero", "insurance"]);

export default function AnimatedBlock({ block, children, preview = false }: Props) {
  const styles = getStylesFromProps(block.props ?? {});
  const isFullBleed = FULL_BLEED.has(block.type);
  const css = isFullBleed ? undefined : blockStyleToCss(styles);
  const vis = blockVisibilityClass(styles);

  if (styles.animation === "none" || isFullBleed) {
    return (
      <div
        className={clsx(vis, preview && "pointer-events-none", isFullBleed && "w-full max-w-full overflow-x-clip")}
        style={css}
      >
        {children}
      </div>
    );
  }

  const variants = animationVariants(styles.animation, styles.animation_intensity ?? 70) as Variants;

  return (
    <motion.div
      className={clsx(vis, preview && "pointer-events-none", "w-full max-w-full min-w-0")}
      style={css}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: !preview, margin: "-60px", amount: 0.15 }}
      variants={variants}
    >
      {children}
    </motion.div>
  );
}
