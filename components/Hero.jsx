"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import FloatingCube from "./FloatingCube";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};
const item = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};

export default function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // parallax: text drifts up, cube drifts down at a different speed
  const textY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const cubeY = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-28"
    >
      {/* glass ring */}
      <motion.div
        style={{ y: cubeY }}
        className="pointer-events-none absolute right-[8%] top-1/2 hidden -translate-y-1/2 lg:block"
      >
        <FloatingCube />
        <div className="absolute -inset-24 -z-10 rounded-full border border-white/10" />
        <div className="absolute -inset-40 -z-10 rounded-full border border-white/5" />
      </motion.div>

      <motion.div
        style={{ y: textY, opacity: fade }}
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto max-w-3xl text-center lg:mx-0 lg:text-left"
      >
        <motion.p
          variants={item}
          className="mb-5 inline-block rounded-full glass px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-slate-300"
        >
          Interior · Architecture · Exterior
        </motion.p>

        <motion.h1
          variants={item}
          className="font-display text-5xl leading-[1.05] sm:text-6xl md:text-7xl"
        >
          Where space
          <br />
          becomes <span className="gradient-text">emotion</span>
        </motion.h1>

        <motion.p
          variants={item}
          className="mx-auto mt-6 max-w-xl text-lg text-slate-300 lg:mx-0"
        >
          Elysian designs immersive residential and commercial environments —
          translating light, material and form into spaces that feel alive.
        </motion.p>

        <motion.div variants={item} className="mt-9 flex flex-wrap justify-center gap-4 lg:justify-start">
          <a href="#portfolio" className="btn-glass px-7 py-3 text-sm font-medium">
            Explore our world
          </a>
          <a href="#contact" className="px-7 py-3 text-sm font-medium text-slate-300 transition-colors hover:text-white">
            Book a consultation →
          </a>
        </motion.div>
      </motion.div>

      {/* scroll cue */}
      <motion.div
        style={{ opacity: fade }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-500"
      >
        <div className="flex h-10 w-6 items-start justify-center rounded-full border border-white/20 p-1.5">
          <motion.span
            className="h-2 w-1 rounded-full bg-white/60"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>
    </section>
  );
}
