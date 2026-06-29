"use client";

/**
 * Semi-transparent rotating glass cube built with pure CSS 3D transforms.
 * Wrapped in a float animation so it bobs gently while spinning.
 */
export default function FloatingCube() {
  return (
    <div className="scene animate-float" aria-hidden="true">
      <div className="cube animate-spincube">
        <div className="cube__face cube__face--front" />
        <div className="cube__face cube__face--back" />
        <div className="cube__face cube__face--right" />
        <div className="cube__face cube__face--left" />
        <div className="cube__face cube__face--top" />
        <div className="cube__face cube__face--bottom" />
      </div>
    </div>
  );
}
