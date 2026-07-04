"use client";

// Декоративный 3D-объект в hero: низкополигональный вращающийся каркас,
// синхронизированный со скроллом через GSAP ScrollTrigger. Three.js и GSAP
// грузятся динамически внутри эффекта (а не в теле модуля), а сам компонент
// монтируется через next/dynamic(ssr:false) в page.tsx — так вес обеих
// библиотек уходит в отдельный чанк и не попадает в основной бандл сайта.
//
// Рендерится только когда:
//  - секция реально попала во вьюпорт (IntersectionObserver),
//  - браузер поддерживает WebGL,
//  - пользователь не просил уменьшить анимацию (prefers-reduced-motion).
// Если любое из условий не выполняется — просто пустой div, видео и остальной
// hero работают как обычно.

import { useEffect, useRef, useState } from "react";

type ThreeModule = typeof import("three");
type GsapModule = typeof import("gsap")["gsap"];

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

export function Hero3D({ className = "" }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const container = containerRef.current;
    if (!container) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!hasWebGL()) return;

    let cancelled = false;
    let frameId = 0;
    let renderer: InstanceType<ThreeModule["WebGLRenderer"]> | null = null;
    let geometry: InstanceType<ThreeModule["IcosahedronGeometry"]> | null = null;
    let material: InstanceType<ThreeModule["MeshBasicMaterial"]> | null = null;
    let scrollTween: ReturnType<GsapModule["to"]> | null = null;
    let idleTween: ReturnType<GsapModule["to"]> | null = null;

    (async () => {
      const [THREE, gsapCore, scrollTriggerMod] = await Promise.all([
        import("three"),
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled || !container) return;

      const gsap = gsapCore.gsap;
      gsap.registerPlugin(scrollTriggerMod.ScrollTrigger);

      const size = container.clientWidth || 220;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10);
      camera.position.z = 3.2;

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(size, size);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.domElement.style.display = "block";
      container.appendChild(renderer.domElement);

      geometry = new THREE.IcosahedronGeometry(1.1, 0);
      material = new THREE.MeshBasicMaterial({
        color: 0xe8a23d,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
      });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      const renderLoop = () => {
        renderer!.render(scene, camera);
        frameId = requestAnimationFrame(renderLoop);
      };
      frameId = requestAnimationFrame(renderLoop);

      // Медленное фоновое вращение, чтобы объект не выглядел статичным до скролла.
      idleTween = gsap.to(mesh.rotation, { z: Math.PI * 2, duration: 50, repeat: -1, ease: "none" });

      // Дополнительный доворот, привязанный к прогрессу скролла hero-секции.
      const heroSection = container.closest("section");
      scrollTween = gsap.to(mesh.rotation, {
        y: Math.PI * 2,
        x: Math.PI * 0.5,
        ease: "none",
        scrollTrigger: {
          trigger: heroSection ?? container,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      scrollTween?.scrollTrigger?.kill();
      scrollTween?.kill();
      idleTween?.kill();
      geometry?.dispose();
      material?.dispose();
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
    };
  }, [inView]);

  return <div ref={containerRef} aria-hidden className={`pointer-events-none ${className}`} />;
}
