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

export default function AnimatedBlock({ block, children, preview = false }: Props) {
  const styles = getStylesFromProps(block.props ?? {});
  const css = blockStyleToCss(styles);
  const vis = blockVisibilityClass(styles);

  if (styles.animation === "none") {
    return (
      <div className={clsx(vis, preview && "pointer-events-none")} style={css}>
        {children}
      </div>
    );
  }

  const variants = animationVariants(styles.animation, styles.animation_intensity ?? 70) as Variants;

  return (
    <motion.div
      className={clsx(vis, preview && "pointer-events-none")}
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
