"use client";

// Декоративный 3D-объект в hero: вращающаяся бутылка DOFFA Cold Brew
// («эксклюзив сезона») с кольцом текста вокруг. Three.js и GSAP грузятся
// динамически внутри эффекта, компонент монтируется через next/dynamic(ssr:false)
// в page.tsx — вес библиотек уходит в отдельный чанк.
//
// Рендерится только когда: секция во вьюпорте (IntersectionObserver), браузер
// поддерживает WebGL и пользователь не просил уменьшить анимацию. Иначе — пустой
// div, остальной hero работает как обычно. Текстуры (этикетка и текст-кольцо)
// рисуются на canvas в рантайме — внешних файлов не нужно.

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

// --- Текстура этикетки Cold Brew (мятный фон, «COLD BREW», маскот-чашка с ножками) ---
function makeLabelTexture(THREE: ThreeModule) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 256;
  const g = c.getContext("2d")!;
  const SAGE = "#b9cec9";
  const INK = "#14201c";
  g.fillStyle = SAGE;
  g.fillRect(0, 0, c.width, c.height);

  // Две панели брендинга (спереди и сзади) — что-то читается при любом повороте.
  const panel = (cx: number) => {
    g.save();
    g.translate(cx, 0);
    g.textAlign = "center";
    g.fillStyle = INK;
    g.font = "800 62px Arial, sans-serif";
    g.fillText("COLD", 0, 78);
    g.fillText("BREW", 0, 138);
    // Маскот: чашка с торчащими ножками и кедами.
    g.strokeStyle = INK;
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(-34, 150); g.lineTo(-40, 190); g.lineTo(40, 190); g.lineTo(34, 150); // чашка (трапеция)
    g.stroke();
    g.beginPath(); g.ellipse(48, 172, 12, 8, 0, 0, Math.PI * 2); g.stroke(); // ручка
    g.beginPath();
    g.moveTo(-14, 172); g.lineTo(-16, 205); g.moveTo(14, 172); g.lineTo(16, 205); // ножки
    g.stroke();
    g.beginPath(); g.ellipse(-18, 210, 10, 6, 0, 0, Math.PI * 2); g.ellipse(18, 210, 10, 6, 0, 0, Math.PI * 2); g.fill(); // кеды
    g.font = "700 18px Arial, sans-serif";
    g.fillText("100% ARABICA · 330 ml", 0, 232);
    g.font = "800 20px Arial, sans-serif";
    g.fillText("DOFFA · EST 2021", 0, 34);
    g.restore();
  };
  panel(256);
  panel(768);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// --- Текстура текст-кольца: золотое «ЭКСКЛЮЗИВ СЕЗОНА · DOFFA COLD BREW ·» ---
function makeRingTexture(THREE: ThreeModule) {
  const c = document.createElement("canvas");
  c.width = 2048;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, c.width, c.height);
  g.fillStyle = "#c5a46e";
  g.font = "800 60px Arial, sans-serif";
  g.textBaseline = "middle";
  const text = "ЭКСКЛЮЗИВ СЕЗОНА   ·   DOFFA COLD BREW   ·   ";
  const unit = g.measureText(text).width;
  let x = 0;
  while (x < c.width) {
    g.fillText(text, x, c.height / 2 + 4);
    x += unit;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
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
    let scrollTween: ReturnType<GsapModule["to"]> | null = null;
    const disposables: { dispose: () => void }[] = [];

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
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 20);
      camera.position.z = 3.4;

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(size, size);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.domElement.style.display = "block";
      container.appendChild(renderer.domElement);

      // Свет для физматериалов.
      scene.add(new THREE.AmbientLight(0xffffff, 0.75));
      const key = new THREE.DirectionalLight(0xfff2df, 1.4);
      key.position.set(2, 3, 4);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xc5a46e, 0.8);
      rim.position.set(-3, 1, -2);
      scene.add(rim);

      const bottle = new THREE.Group();

      // Профиль бутылки (радиус, высота) → LatheGeometry.
      const pts = [
        [0.0, 0.0], [0.52, 0.0], [0.52, 1.55], [0.5, 1.63],
        [0.3, 1.86], [0.17, 2.03], [0.17, 2.35],
      ].map(([x, y]) => new THREE.Vector2(x, y));
      const glassGeo = new THREE.LatheGeometry(pts, 48);
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0xdfeae6, roughness: 0.12, metalness: 0.0,
        transparent: true, opacity: 0.28, depthWrite: false,
      });
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.renderOrder = 2;
      bottle.add(glass);
      disposables.push(glassGeo, glassMat);

      // Колд-брю внутри (нижняя часть).
      const liqGeo = new THREE.CylinderGeometry(0.49, 0.49, 1.02, 40);
      const liqMat = new THREE.MeshStandardMaterial({ color: 0x2a1206, roughness: 0.35, metalness: 0.1 });
      const liquid = new THREE.Mesh(liqGeo, liqMat);
      liquid.position.y = 0.53;
      liquid.renderOrder = 0;
      bottle.add(liquid);
      disposables.push(liqGeo, liqMat);

      // Этикетка (мятная, с брендингом) — обёрнута вокруг корпуса.
      const labelTex = makeLabelTexture(THREE);
      const labelGeo = new THREE.CylinderGeometry(0.535, 0.535, 0.8, 48, 1, true);
      const labelMat = new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.65, metalness: 0.0 });
      const label = new THREE.Mesh(labelGeo, labelMat);
      label.position.y = 0.9;
      label.renderOrder = 1;
      bottle.add(label);
      disposables.push(labelGeo, labelMat, labelTex);

      // Крышка (серебристая).
      const capGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.22, 32);
      const capMat = new THREE.MeshStandardMaterial({ color: 0xd2d2d2, roughness: 0.35, metalness: 0.7 });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = 2.44;
      bottle.add(cap);
      disposables.push(capGeo, capMat);

      // Центрируем и масштабируем бутылку.
      const SCALE = 0.62;
      bottle.scale.setScalar(SCALE);
      bottle.position.y = -1.2 * SCALE;
      scene.add(bottle);

      // Текст-кольцо вокруг бутылки.
      const ringTex = makeRingTexture(THREE);
      const ringGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.22, 64, 1, true);
      const ringMat = new THREE.MeshBasicMaterial({
        map: ringTex, transparent: true, side: THREE.DoubleSide, depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = -0.15;
      scene.add(ring);
      disposables.push(ringGeo, ringMat, ringTex);

      const renderLoop = () => {
        bottle.rotation.y += 0.012;   // бутылка крутится
        ring.rotation.y -= 0.006;     // текст-кольцо крутится навстречу
        renderer!.render(scene, camera);
        frameId = requestAnimationFrame(renderLoop);
      };
      frameId = requestAnimationFrame(renderLoop);

      // Лёгкий наклон, привязанный к прогрессу скролла hero-секции.
      const heroSection = container.closest("section");
      scrollTween = gsap.to(bottle.rotation, {
        z: Math.PI * 0.18, x: Math.PI * 0.12,
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
      for (const d of disposables) d.dispose();
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
    };
  }, [inView]);

  return <div ref={containerRef} aria-hidden className={`pointer-events-none ${className}`} />;
}
