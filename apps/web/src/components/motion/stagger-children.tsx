"use client";

import { motion, useReducedMotion } from "framer-motion";
import React from "react";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/components/motion/fade-in";

const containerVariants = {
  hidden: {},
  visible: (staggerDelay: number) => ({
    transition: { staggerChildren: staggerDelay },
  }),
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE_OUT },
  },
};

interface StaggerChildrenProps {
  children: React.ReactNode;
  className?: string;
  itemClassName?: string;
  staggerDelay?: number;
}

export function StaggerChildren({
  children,
  className,
  itemClassName,
  staggerDelay = 0.08,
}: StaggerChildrenProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      variants={containerVariants}
      initial={reduce ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      custom={staggerDelay}
      className={cn(className)}
    >
      {React.Children.map(children, (child) => (
        <motion.div variants={itemVariants} className={itemClassName}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
