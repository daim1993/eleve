"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Reveal from "./Reveal";

const quotes = [
  {
    text: "Elysian didn't decorate our home — they understood how we wanted to feel in it. Every room breathes.",
    name: "Anaïs R.",
    role: "Penthouse owner, Lisbon",
  },
  {
    text: "The facade they designed completely redefined our building's presence on the street. Bold, but timeless.",
    name: "Marcus T.",
    role: "Developer, Rotterdam",
  },
  {
    text: "Working with the studio felt effortless. They balanced light, material and budget without a single compromise.",
    name: "Priya N.",
    role: "Retail founder, Singapore",
  },
];

export default function Testimonials() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setI((v) => (v + 1) % quotes.length), 5000);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <section id="testimonials" className="relative z-10 mx-auto max-w-4xl px-6 py-28 text-center">
      <Reveal>
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-slate-400">Client voices</p>
        <h2 className="font-display text-4xl md:text-5xl">
          Spaces that <span className="gradient-text">stay with you</span>
        </h2>
      </Reveal>

      <Reveal delay={0.15}>
        <div
          className="glass-strong relative mt-12 overflow-hidden rounded-3xl p-10 md:p-14"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <span className="absolute left-6 top-2 font-display text-7xl text-white/10">“</span>
          <div className="relative min-h-[170px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="font-display text-xl leading-relaxed md:text-2xl">
                  {quotes[i].text}
                </p>
                <div className="mt-7 flex items-center justify-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-gradient-to-br from-glassviolet to-glassblue" />
                  <div className="text-left">
                    <p className="font-medium">{quotes[i].name}</p>
                    <p className="text-sm text-slate-400">{quotes[i].role}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-8 flex justify-center gap-2">
            {quotes.map((_, idx) => (
              <button
                key={idx}
                aria-label={`Show testimonial ${idx + 1}`}
                onClick={() => setI(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === i ? "w-8 bg-glassviolet" : "w-2 bg-white/25 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
