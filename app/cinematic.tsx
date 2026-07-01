"use client";

// Слой визуальной "премиальности": плавный скролл, курсор-реактивное свечение,
// tilt-эффект на карточках. Никакой тяжёлой 3D-графики — только Framer Motion
// и Lenis, чтобы сайт кофейни оставался быстрым на мобильном интернете.

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import Lenis from "lenis";

/** Инерционный плавный скролл на весь сайт. Монтируется один раз в корне. */
export function SmoothScroll() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return null;
}

/** Мягкое свечение, следующее за курсором — ощущение "живого" интерфейса. */
export function CursorGlow() {
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const sx = useSpring(x, { damping: 30, stiffness: 200, mass: 0.5 });
  const sy = useSpring(y, { damping: 30, stiffness: 200, mass: 0.5 });

  useEffect(() => {
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [x, y]);

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[1] hidden h-[560px] w-[560px] rounded-full sm:block"
      style={{
        translateX: sx,
        translateY: sy,
        x: "-50%",
        y: "-50%",
        background:
          "radial-gradient(circle, rgba(232,162,61,0.10) 0%, rgba(63,182,168,0.06) 45%, transparent 70%)",
      }}
    />
  );
}

/** Параллакс-обёртка: слегка сдвигает содержимое в сторону курсора. strength в px. */
export function MouseParallax({
  children,
  strength = 18,
  className = "",
}: {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { damping: 20, stiffness: 120 });
  const sy = useSpring(y, { damping: 20, stiffness: 120 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width - 0.5;
      const relY = (e.clientY - rect.top) / rect.height - 0.5;
      x.set(relX * strength);
      y.set(relY * strength);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [strength, x, y]);

  return (
    <motion.div ref={ref} style={{ x: sx, y: sy }} className={className}>
      {children}
    </motion.div>
  );
}

/** Карточка с лёгким 3D-наклоном под курсором + бликом. */
export function TiltCard({
  children,
  className = "",
  max = 6,
}: {
  children: React.ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const glowX = useMotionValue(50);
  const glowY = useMotionValue(50);
  const srx = useSpring(rx, { damping: 18, stiffness: 220 });
  const sry = useSpring(ry, { damping: 18, stiffness: 220 });

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    ry.set((px - 0.5) * max * 2);
    rx.set((0.5 - py) * max * 2);
    glowX.set(px * 100);
    glowY.set(py * 100);
  }

  function onMouseLeave() {
    rx.set(0);
    ry.set(0);
    setHovered(false);
  }

  const bg = useTransform([glowX, glowY], ([gx, gy]) =>
    `radial-gradient(circle at ${gx}% ${gy}%, rgba(232,162,61,0.14), transparent 60%)`
  );

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={onMouseLeave}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 800 }}
      className={`relative ${className}`}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
        style={{ background: bg, opacity: hovered ? 1 : 0 }}
      />
      {children}
    </motion.div>
  );
}
