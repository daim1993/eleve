"use client";

import { useState } from "react";
import Reveal from "./Reveal";

export default function Contact() {
  const [sent, setSent] = useState(false);

  function onSubmit(e) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <section id="contact" className="relative z-10 mx-auto max-w-6xl px-6 py-28">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Studio info */}
        <Reveal>
          <div className="glass flex h-full flex-col justify-between rounded-3xl p-10">
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.3em] text-slate-400">The studio</p>
              <h2 className="font-display text-4xl md:text-5xl">Let's design something unforgettable</h2>
              <p className="mt-5 max-w-md text-slate-300">
                Tell us about your space. We work with clients worldwide on residential,
                commercial and exterior projects of every scale.
              </p>
            </div>

            <div className="mt-10 space-y-3 text-slate-300">
              <p><span className="text-slate-500">Studio</span> — 14 Rua das Flores, Lisbon</p>
              <p><span className="text-slate-500">Email</span> — creative@sentientbyelysian.com</p>
              <p><span className="text-slate-500">Phone</span> — +351 21 000 0000</p>
              <div className="mt-5 flex gap-3">
                {["IG", "Be", "Li", "Pin"].map((s) => (
                  <span key={s} className="grid h-10 w-10 place-items-center rounded-full glass text-sm text-slate-200">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        {/* Form */}
        <Reveal delay={0.12}>
          <form onSubmit={onSubmit} className="glass-strong rounded-3xl p-10">
            <div className="space-y-5">
              <Field label="Name" name="name" placeholder="Your name" />
              <Field label="Email" name="email" type="email" placeholder="you@email.com" />
              <div>
                <label className="mb-2 block text-sm text-slate-300">Project</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Tell us about your space…"
                  className="w-full resize-none rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-slate-100 placeholder-slate-500 outline-none transition focus:border-glassviolet/60 focus:ring-2 focus:ring-glassviolet/30"
                />
              </div>

              <button
                type="submit"
                className="btn-glass w-full bg-gradient-to-r from-glassviolet/20 to-glassblue/20 px-6 py-3.5 font-medium"
              >
                {sent ? "Thank you — we'll be in touch ✦" : "Send message"}
              </button>
            </div>
          </form>
        </Reveal>
      </div>

      <footer className="mt-20 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-sm text-slate-500 md:flex-row">
        <p>© {new Date().getFullYear()} Elysian Studio. All rights reserved.</p>
        <p className="font-display gradient-text">Where space becomes emotion</p>
      </footer>
    </section>
  );
}

function Field({ label, name, type = "text", placeholder }) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-sm text-slate-300">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-slate-100 placeholder-slate-500 outline-none transition focus:border-glassviolet/60 focus:ring-2 focus:ring-glassviolet/30"
      />
    </div>
  );
}
