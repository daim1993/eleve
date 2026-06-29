"use client";

import Reveal from "./Reveal";

const services = [
  {
    tag: "Interior",
    icon: "◧",
    title: "Spaces that hold you",
    desc: "Residential, office, retail and bespoke lighting design — composed around how you actually live and work.",
    points: ["Residential", "Workplace", "Retail", "Lighting"],
    accent: "from-glassviolet/30",
  },
  {
    tag: "Exterior",
    icon: "◫",
    title: "Form against the sky",
    desc: "Facades, landscaping, rooftops and pergolas engineered to age beautifully and frame their surroundings.",
    points: ["Facades", "Landscape", "Rooftop", "Pergolas"],
    accent: "from-glassblue/30",
  },
];

export default function Services() {
  return (
    <section id="services" className="relative z-10 mx-auto max-w-6xl px-6 py-28">
      <Reveal>
        <div className="mb-14 max-w-2xl">
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-slate-400">What we do</p>
          <h2 className="font-display text-4xl md:text-5xl">
            Two disciplines, <span className="gradient-text">one vision</span>
          </h2>
        </div>
      </Reveal>

      <div className="grid gap-6 md:grid-cols-2">
        {services.map((s, i) => (
          <Reveal key={s.tag} delay={i * 0.12}>
            <div className={`glass glass-hover group relative h-full overflow-hidden rounded-3xl p-8`}>
              <div className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br ${s.accent} to-transparent blur-2xl transition-opacity duration-500 group-hover:opacity-100 opacity-60`} />
              <div className="relative">
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-4xl">{s.icon}</span>
                  <span className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-widest text-slate-300">
                    {s.tag}
                  </span>
                </div>
                <h3 className="font-display text-2xl">{s.title}</h3>
                <p className="mt-3 text-slate-300">{s.desc}</p>

                <ul className="mt-6 flex flex-wrap gap-2">
                  {s.points.map((p) => (
                    <li key={p} className="rounded-full bg-white/5 px-3 py-1 text-sm text-slate-300">
                      {p}
                    </li>
                  ))}
                </ul>

                <a href="#contact" className="mt-7 inline-flex items-center gap-2 text-sm text-white/90 transition-transform group-hover:translate-x-1">
                  Learn more <span aria-hidden>→</span>
                </a>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
