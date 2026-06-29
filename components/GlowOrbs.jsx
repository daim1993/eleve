"use client";

/**
 * Three large blurred color orbs that drift slowly behind the glass layers.
 * Pure CSS animation (defined in tailwind.config.js).
 */
export default function GlowOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -left-40 -top-32 h-[42rem] w-[42rem] rounded-full bg-glassviolet/30 blur-[140px] animate-drift1" />
      <div className="absolute right-[-12rem] top-1/3 h-[38rem] w-[38rem] rounded-full bg-glassblue/25 blur-[150px] animate-drift2" />
      <div className="absolute bottom-[-14rem] left-1/3 h-[40rem] w-[40rem] rounded-full bg-glasspink/25 blur-[150px] animate-drift3" />
    </div>
  );
}
