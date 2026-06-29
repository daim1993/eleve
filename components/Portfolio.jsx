"use client";

import Reveal from "./Reveal";

const projects = [
  { name: "Aurora Penthouse", tag: "Interior", g: "from-violet-500/40 to-fuchsia-500/20" },
  { name: "Meridian Facade", tag: "Exterior", g: "from-sky-500/40 to-blue-600/20" },
  { name: "Lumen Retail", tag: "Interior", g: "from-pink-500/40 to-rose-500/20" },
  { name: "Skyline Terrace", tag: "Exterior", g: "from-indigo-500/40 to-violet-500/20" },
  { name: "Atelier Office", tag: "Interior", g: "from-cyan-500/40 to-teal-500/20" },
  { name: "Verde Courtyard", tag: "Exterior", g: "from-emerald-500/40 to-green-600/20" },
];

export default function Portfolio() {
  return (
    <section id="portfolio" className="relative z-10 mx-auto max-w-6xl px-6 py-28">
      <Reveal>
        <div className="mb-14 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-slate-400">Selected work</p>
            <h2 className="font-display text-4xl md:text-5xl">
              Recent <span className="gradient-text">projects</span>
            </h2>
          </div>
          <a href="#contact" className="btn-glass px-6 py-2.5 text-sm">View all projects</a>
        </div>
      </Reveal>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p, i) => (
          <Reveal key={p.name} delay={(i % 3) * 0.1}>
            <div className="group relative aspect-[4/5] overflow-hidden rounded-3xl glass">
              {/* image placeholder gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${p.g} transition-transform duration-700 group-hover:scale-110`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

              {/* base label */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-widest backdrop-blur">
                  {p.tag}
                </span>
                <h3 className="mt-3 font-display text-2xl">{p.name}</h3>
              </div>

              {/* hover overlay */}
              <div className="absolute inset-0 flex flex-col justify-center gap-3 bg-black/40 p-6 text-center opacity-0 backdrop-blur-md transition-opacity duration-500 group-hover:opacity-100">
                <h3 className="font-display text-2xl">{p.name}</h3>
                <p className="text-sm text-slate-200">
                  A study in light, material and proportion — crafted end to end by the Elysian studio.
                </p>
                <span className="mx-auto mt-2 inline-flex items-center gap-2 text-sm text-white">
                  View case study →
                </span>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
