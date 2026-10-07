/* ═══════════════════════════════════════════════════════════════
   TRANSPORTES SILVA EXPRESS · Interacciones y animaciones
   Dependencias (CDN, con degradación elegante si fallan):
     · GSAP + ScrollTrigger  → progreso ligado al scroll (sin listeners de scroll)
     · Lenis                 → scroll suave
   Todo lo demás es JavaScript nativo.

   ÍNDICE
   01 Configuración y utilidades · 02 WhatsApp · 03 Textos partidos y reveal
   04 Preloader · 05 Scroll suave y anclas · 06 Header y menú
   07 Hero (parallax + red de nodos) · 08 Contadores · 09 Manifiesto
   10 Cartas apiladas · 11 Proceso horizontal · 12 Parallax de imágenes
   13 Bento, botones magnéticos · 14 Mapa de rutas · 15 CTA canvas
   16 Misión/visión · 17 FAQ · 18 Formulario → WhatsApp · 19 Arranque
═══════════════════════════════════════════════════════════════ */
(() => {
    'use strict';

    /* ───────── 01 CONFIGURACIÓN Y UTILIDADES ───────── */

    // Número principal de WhatsApp (formato internacional, sin "+"). Cámbialo aquí y se
    // actualizan todos los botones con data-wa y el formulario.
    const WA_NUMBER = '524423633383';

    const root = document.documentElement;
    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
    const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const rand = (a, b) => a + Math.random() * (b - a);

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

    window.__tse = true; // avisa al script del <head> que app.js cargó
    const hasST = !!(window.gsap && window.ScrollTrigger);
    if (hasST) {
        gsap.registerPlugin(ScrollTrigger);
        ScrollTrigger.config({ ignoreMobileResize: true });
    }

    /** Ejecuta cb(visible) cada vez que el elemento entra o sale del viewport. */
    const watch = (el, cb, margin = '120px') => {
        if (!el) return;
        new IntersectionObserver(([e]) => cb(e.isIntersecting), { rootMargin: margin }).observe(el);
    };

    /** Prepara un canvas a densidad de pantalla y avisa cuando cambia de tamaño. */
    const fitCanvas = (cv, sizeEl, onResize) => {
        const ctx = cv.getContext('2d');
        const state = { ctx, w: 0, h: 0, dpr: 1 };
        const apply = (initial) => {
            const r = sizeEl.getBoundingClientRect();
            state.dpr = Math.min(window.devicePixelRatio || 1, 2);
            state.w = Math.max(1, r.width);
            state.h = Math.max(1, r.height);
            cv.width = Math.round(state.w * state.dpr);
            cv.height = Math.round(state.h * state.dpr);
            ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
            if (onResize && !initial) onResize(state);
        };
        let t;
        new ResizeObserver(() => { clearTimeout(t); t = setTimeout(apply, 120); }).observe(sizeEl);
        apply(true);
        return state;
    };

    /** Bucle de animación que solo corre mientras `active()` sea verdadero. */
    const loop = (draw, active) => {
        let raf = 0, last = performance.now();
        const frame = (now) => {
            const dt = Math.min(now - last, 50);
            last = now;
            draw(now, dt);
            raf = active() ? requestAnimationFrame(frame) : 0;
        };
        return {
            start() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } },
            stop() { cancelAnimationFrame(raf); raf = 0; }
        };
    };

    /* ───────── 02 WHATSAPP ───────── */
    const waUrl = (msg) => `https://wa.me/${WA_NUMBER}` + (msg ? `?text=${encodeURIComponent(msg)}` : '');
    $$('[data-wa]').forEach(a => { a.href = waUrl(a.dataset.wa); });

    /* ───────── 03 TEXTOS PARTIDOS Y REVEAL ───────── */

    /** Parte el texto de un elemento en palabras conservando <em>, <br>, etc. */
    const splitWords = (el, make) => {
        const words = [];
        const tmp = document.createElement('div');
        const walk = (node, parent) => {
            node.childNodes.forEach(ch => {
                if (ch.nodeType === 3) {
                    ch.textContent.split(/(\s+)/).forEach(tok => {
                        if (!tok) return;
                        if (/^\s+$/.test(tok)) { parent.appendChild(document.createTextNode(' ')); return; }
                        const w = make(tok, words.length);
                        words.push(w.inner || w);
                        parent.appendChild(w);
                    });
                } else if (ch.nodeType === 1) {
                    const clone = ch.cloneNode(false);
                    parent.appendChild(clone);
                    walk(ch, clone);
                }
            });
        };
        walk(el, tmp);
        el.replaceChildren(...tmp.childNodes);
        return words;
    };

    const heroEls = $$('.hero [data-reveal], .hero [data-split]');

    if (!reduced) {
        $$('[data-split]').forEach(el => {
            el.setAttribute('aria-label', el.textContent.trim().replace(/\s+/g, ' '));
            splitWords(el, (tok, i) => {
                const outer = document.createElement('span');
                outer.className = 'sp-w';
                outer.setAttribute('aria-hidden', 'true');
                const inner = document.createElement('span');
                inner.className = 'sp-i';
                inner.style.setProperty('--wi', i);
                inner.textContent = tok;
                outer.appendChild(inner);
                outer.inner = inner;
                return outer;
            });
        });
    }

    const revealIO = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (!e.isIntersecting) return;
            e.target.classList.add('is-in');
            revealIO.unobserve(e.target);
        });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });

    $$('[data-reveal], [data-split]').forEach(el => {
        if (reduced) el.classList.add('is-in');
        else if (!el.closest('.hero')) revealIO.observe(el);
    });

    const revealHero = () => heroEls.forEach(el => el.classList.add('is-in'));

    /* ───────── 04 PRELOADER ───────── */
    const loader = $('#loader');
    const loaderBar = $('#loader-bar');
    const loaderCount = $('#loader-count');

    const finishLoader = () => {
        root.classList.remove('is-loading');
        root.classList.add('is-ready');
        initScroll();
        revealHero();
        if (hasST) ScrollTrigger.refresh();
        setTimeout(() => loader && loader.remove(), 1300);
    };

    const runLoader = () => {
        if (!loader) { finishLoader(); return; }
        const MIN = reduced ? 500 : 2100;
        const t0 = performance.now();
        let ready = false;
        let finishing = 0; // marca de tiempo en que empieza el tramo final
        let done = false;

        const settle = () => { ready = true; };
        Promise.all([
            document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(),
            new Promise(res => (document.readyState === 'complete' ? res() : addEventListener('load', res, { once: true })))
        ]).then(settle);
        setTimeout(settle, 4500); // nunca bloquear la página más de 4.5 s

        let shown = 0;
        const frame = (now) => {
            const el = now - t0;
            // avance suave hasta 90 % mientras carga; el tramo final llega a 100 %
            let target = Math.min(el / MIN, 1);
            target = 1 - Math.pow(1 - target, 2.2);
            target *= 0.9;
            if (ready && el >= MIN) {
                if (!finishing) finishing = now;
                target = 0.9 + 0.1 * clamp((now - finishing) / 450);
            }
            shown = Math.max(shown, target);
            loaderBar.style.transform = `scaleX(${shown})`;
            loaderCount.textContent = Math.round(shown * 100);

            if (shown >= 1 && !done) {
                done = true;
                loader.classList.add('is-leaving');
                setTimeout(() => {
                    loader.classList.add('is-done');
                    finishLoader();
                }, reduced ? 0 : 380);
                return;
            }
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    };

    /* ───────── 05 SCROLL SUAVE Y ANCLAS ───────── */
    let lenis = null;

    function initScroll() {
        if (reduced || !window.Lenis || lenis) return;
        lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
        if (hasST) {
            lenis.on('scroll', ScrollTrigger.update);
            gsap.ticker.add(t => lenis.raf(t * 1000));
            gsap.ticker.lagSmoothing(0);
        } else {
            const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
            requestAnimationFrame(raf);
        }
    }

    $$('a[href^="#"]').forEach(a => {
        a.addEventListener('click', (e) => {
            const id = a.getAttribute('href');
            if (!id || id.length < 2) return;
            const target = $(id);
            if (!target) return;
            e.preventDefault();
            const wasOpen = menuOpen;
            if (wasOpen) setMenu(false);
            const go = () => {
                if (lenis) lenis.scrollTo(target, { offset: id === '#inicio' ? 0 : -78, duration: 1.5 });
                else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
            };
            wasOpen ? setTimeout(go, 60) : go();
            history.replaceState(null, '', id);
        });
    });

    /* ───────── 06 HEADER Y MENÚ ───────── */
    const header = $('.site-header');
    const progressBar = $('#progress');
    const burger = $('#burger');
    const menu = $('#menu');
    let menuOpen = false;
    let navHidden = false;

    function setMenu(open) {
        if (!menu || !burger) return;
        menuOpen = open;
        menu.classList.toggle('is-open', open);
        menu.setAttribute('aria-hidden', String(!open));
        burger.setAttribute('aria-expanded', String(open));
        burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
        root.classList.toggle('menu-open', open);
        if (lenis) open ? lenis.stop() : lenis.start();
        if (open) setTimeout(() => $('a', menu) && $('a', menu).focus({ preventScroll: true }), 400);
        else burger.focus({ preventScroll: true });
    }
    if (burger) burger.addEventListener('click', () => setMenu(!menuOpen));
    addEventListener('keydown', (e) => {
        if (!menuOpen) return;
        if (e.key === 'Escape') { setMenu(false); return; }
        if (e.key !== 'Tab') return;
        const f = [burger, ...$$('a', menu)];
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    });
    matchMedia('(min-width: 1100px)').addEventListener('change', (m) => { if (m.matches && menuOpen) setMenu(false); });

    // Estado del header según el scroll (vía ScrollTrigger, sin listener de scroll propio)
    if (hasST && header) {
        ScrollTrigger.create({
            start: 0, end: 'max',
            onUpdate: (self) => {
                const y = self.scroll();
                header.classList.toggle('is-scrolled', y > 40);
                if (progressBar) progressBar.style.transform = `scaleX(${self.progress})`;
                if (menuOpen) return;
                if (y > 280 && self.direction === 1) navHidden = true;
                else if (self.direction === -1 || y <= 280) navHidden = false;
                header.classList.toggle('is-hidden', navHidden);
            }
        });
    } else if (header) {
        header.classList.add('is-scrolled');
    }

    // Enlace activo según la sección visible
    (() => {
        const links = $$('.nav__links a');
        const map = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
        const io = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                const a = map.get(e.target.id);
                if (a && e.isIntersecting) { links.forEach(l => l.classList.remove('is-active')); a.classList.add('is-active'); }
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
    })();

    /* ───────── 07 HERO ───────── */

    // 07a · Parallax por capas + deriva constante (se mueve aunque no haya mouse)
    (() => {
        const hero = $('.hero');
        const stage = $('[data-stage]');
        if (!hero || !stage || reduced) return;
        const items = $$('[data-depth]', stage).map(el => ({ el, d: parseFloat(el.dataset.depth) || 0 }));
        const main = $('.stage__main', stage);
        let tx = 0, ty = 0, cx = 0, cy = 0, on = true;
        const t0 = performance.now();

        if (finePointer) {
            hero.addEventListener('pointermove', (e) => {
                const r = hero.getBoundingClientRect();
                tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
                ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
            }, { passive: true });
            hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
        }

        const L = loop((now) => {
            const t = (now - t0) / 1000;
            cx = lerp(cx, tx + Math.sin(t * 0.55) * 0.4, 0.06);
            cy = lerp(cy, ty + Math.cos(t * 0.42) * 0.32, 0.06);
            for (const { el, d } of items) {
                let tf = `translate3d(${(cx * d).toFixed(2)}px, ${(cy * d).toFixed(2)}px, 0)`;
                if (el === main) tf += ` rotateY(${(cx * 5).toFixed(2)}deg) rotateX(${(-cy * 4).toFixed(2)}deg)`;
                el.style.transform = tf;
            }
        }, () => on);
        watch(hero, (v) => { on = v; v ? L.start() : L.stop(); }, '0px');
        L.start();
    })();

    // 07b · Red de nodos y paquetes viajando entre ellos (logística en movimiento)
    (() => {
        const cv = $('#hero-canvas');
        if (!cv) return;
        let nodes = [], packets = [], on = true, nextPacket = 0;
        const mouse = { x: -999, y: -999 };
        const LINK = () => (S.w < 700 ? 110 : 150);

        const seed = (s) => {
            const n = clamp(Math.round((s.w * s.h) / 17000), 24, 78);
            nodes = Array.from({ length: n }, () => ({
                x: rand(0, s.w), y: rand(0, s.h),
                vx: rand(-0.018, 0.018), vy: rand(-0.014, 0.014),
                r: Math.random() < 0.12 ? rand(3, 4.2) : rand(1.3, 2.4)
            }));
            packets = [];
        };
        const S = fitCanvas(cv, cv.parentElement, (s) => { seed(s); if (reduced) draw(performance.now(), 0); });
        const ctx = S.ctx;
        seed(S);

        const draw = (now, dt) => {
            const { w, h } = S;
            const link = LINK();
            ctx.clearRect(0, 0, w, h);

            for (const p of nodes) {
                p.x += p.vx * dt; p.y += p.vy * dt;
                if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
                if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
            }

            ctx.lineWidth = 1;
            for (let i = 0; i < nodes.length; i++) {
                const a = nodes[i];
                for (let j = i + 1; j < nodes.length; j++) {
                    const b = nodes[j];
                    const dx = a.x - b.x, dy = a.y - b.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 > link * link) continue;
                    const al = (1 - Math.sqrt(d2) / link) * 0.2;
                    ctx.strokeStyle = `rgba(7,137,26,${al.toFixed(3)})`;
                    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                }
                const mx = a.x - mouse.x, my = a.y - mouse.y;
                const md = Math.hypot(mx, my);
                if (md < 170) {
                    ctx.strokeStyle = `rgba(7,137,26,${((1 - md / 170) * 0.45).toFixed(3)})`;
                    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
                }
            }

            for (const p of nodes) {
                ctx.fillStyle = p.r > 2.8 ? 'rgba(7,137,26,.75)' : 'rgba(7,137,26,.5)';
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
                if (p.r > 2.8) {
                    ctx.strokeStyle = 'rgba(7,137,26,.25)';
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 4 + Math.sin(now / 700 + p.x) * 1.5, 0, 6.2832); ctx.stroke();
                }
            }

            if (reduced) return;

            if (now > nextPacket && packets.length < 8) {
                const a = nodes[(Math.random() * nodes.length) | 0];
                let best = null, bd = Infinity;
                for (const b of nodes) {
                    if (b === a) continue;
                    const d = Math.hypot(a.x - b.x, a.y - b.y);
                    if (d < link && d > 30 && d + Math.random() * 50 < bd) { bd = d; best = b; }
                }
                if (best) packets.push({ a, b: best, t: 0, sp: rand(0.0007, 0.0013) });
                nextPacket = now + rand(260, 620);
            }
            packets = packets.filter(k => k.t < 1);
            for (const k of packets) {
                k.t += k.sp * dt;
                const e = k.t * k.t * (3 - 2 * k.t);
                const x = lerp(k.a.x, k.b.x, e), y = lerp(k.a.y, k.b.y, e);
                const g = ctx.createRadialGradient(x, y, 0, x, y, 12);
                g.addColorStop(0, 'rgba(60,219,102,.55)'); g.addColorStop(1, 'rgba(60,219,102,0)');
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 12, 0, 6.2832); ctx.fill();
                ctx.fillStyle = '#07891A'; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 6.2832); ctx.fill();
            }
        };

        if (reduced) { draw(performance.now(), 0); return; }
        const hero = cv.parentElement.parentElement;
        const L = loop(draw, () => on);
        if (finePointer) {
            hero.addEventListener('pointermove', (e) => {
                const r = cv.getBoundingClientRect();
                mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
            }, { passive: true });
            hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
        }
        watch(hero, (v) => { on = v; v ? L.start() : L.stop(); }, '0px');
        L.start();
    })();

    /* ───────── 08 CONTADORES ───────── */
    (() => {
        const nums = $$('[data-count]');
        const host = $('.stats');
        if (!nums.length || !host || reduced) return;
        nums.forEach(b => { b.textContent = '0'; });
        const io = new IntersectionObserver(([e]) => {
            if (!e.isIntersecting) return;
            io.disconnect();
            nums.forEach(b => {
                const target = +b.dataset.count, t0 = performance.now(), D = 1900;
                const step = (now) => {
                    const p = clamp((now - t0) / D);
                    b.textContent = Math.round(target * (1 - Math.pow(1 - p, 4)));
                    if (p < 1) requestAnimationFrame(step);
                };
                requestAnimationFrame(step);
            });
        }, { threshold: 0.35 });
        io.observe(host);
    })();

    /* ───────── 09 MANIFIESTO (palabras que se encienden con el scroll) ───────── */
    if (hasST && !reduced) {
        const pin = $('#manifesto');
        const txt = $('#manifesto-text');
        if (pin && txt) {
            const words = splitWords(txt, (tok) => {
                const s = document.createElement('span');
                s.className = 'mw';
                s.textContent = tok;
                return s;
            });
            const paint = (p) => {
                const q = clamp((p - 0.04) / 0.8) * words.length;
                words.forEach((w, i) => w.style.setProperty('--on', clamp(q - i).toFixed(3)));
            };
            paint(0);
            ScrollTrigger.create({
                trigger: pin, start: 'top top', end: 'bottom bottom',
                onUpdate: (self) => paint(self.progress)
            });
        }
    }

    /* ───────── 10 CARTAS APILADAS ───────── */
    if (hasST && !reduced) {
        const cards = $$('[data-svc]');
        cards.forEach((card, i) => {
            const next = cards[i + 1];
            if (!next) return;
            const stickyTop = () => parseFloat(getComputedStyle(next).top) || 90;
            ScrollTrigger.create({
                trigger: next,
                start: 'top bottom',
                end: () => `top ${stickyTop()}px`,
                invalidateOnRefresh: true,
                onUpdate: (self) => {
                    const p = self.progress;
                    card.style.transform = `scale(${(1 - 0.05 * p).toFixed(4)})`;
                    card.style.setProperty('--t', p.toFixed(3));
                }
            });
        });
    }

    /* ───────── 11 PROCESO · RECORRIDO HORIZONTAL ───────── */
    (() => {
        const sec = $('#proceso');
        const track = $('#process-track');
        if (!sec || !track || !hasST || reduced) return;
        const steps = $$('.step', track);
        const fill = $('#road-fill');
        const marker = $('#road-marker');
        const road = $('.road', sec);
        const desktop = matchMedia('(min-width: 1024px) and (min-height: 600px)');
        let st = null;

        const teardown = () => {
            if (st) { st.kill(); st = null; }
            sec.classList.remove('is-pinned');
            sec.style.height = '';
            track.style.transform = '';
            steps.forEach(s => s.style.removeProperty('--f'));
        };

        const setup = () => {
            teardown();
            if (!desktop.matches) return;
            sec.classList.add('is-pinned');
            const vw = innerWidth;
            const dist = Math.max(0, track.scrollWidth - vw);
            sec.style.height = `${innerHeight + dist}px`;
            const roadW = road ? road.offsetWidth : 0;

            const paint = (p) => {
                const x = -dist * p;
                track.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
                fill.style.transform = `scaleX(${p.toFixed(4)})`;
                marker.style.transform = `translate3d(${(p * roadW).toFixed(1)}px,0,0)`;
                steps.forEach(s => {
                    const c = s.offsetLeft + s.offsetWidth / 2 + x;
                    s.style.setProperty('--f', clamp(1 - Math.abs(c - vw / 2) / (vw * 0.55)).toFixed(3));
                });
            };
            paint(0);
            st = ScrollTrigger.create({
                trigger: sec, start: 'top top', end: 'bottom bottom',
                onUpdate: (self) => paint(self.progress)
            });
        };

        setup();
        let t;
        addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { setup(); ScrollTrigger.refresh(); }, 260); });
    })();

    /* ───────── 12 PARALLAX DE IMÁGENES ───────── */
    if (hasST && !reduced) {
        $$('img[data-parallax]').forEach(img => {
            const box = img.parentElement;
            const k = parseFloat(img.dataset.parallax) || 0.05;
            ScrollTrigger.create({
                trigger: box, start: 'top bottom', end: 'bottom top',
                onUpdate: (self) => {
                    img.style.translate = `0 ${((self.progress - 0.5) * 2 * k * box.offsetHeight).toFixed(1)}px`;
                }
            });
        });
    }

    /* ───────── 13 BENTO Y BOTONES MAGNÉTICOS ───────── */
    $$('[data-spot]').forEach(c => {
        c.addEventListener('pointermove', (e) => {
            const r = c.getBoundingClientRect();
            c.style.setProperty('--mx', `${e.clientX - r.left}px`);
            c.style.setProperty('--my', `${e.clientY - r.top}px`);
        });
    });

    if (finePointer && !reduced) {
        $$('[data-magnetic]').forEach(el => {
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                const x = e.clientX - r.left, y = e.clientY - r.top;
                el.style.setProperty('--px', `${x}px`);
                el.style.setProperty('--py', `${y}px`);
                el.style.translate = `${((x / r.width - 0.5) * 10).toFixed(1)}px ${((y / r.height - 0.5) * 8).toFixed(1)}px`;
            });
            el.addEventListener('pointerleave', () => { el.style.translate = ''; });
        });
    }

    /* ───────── 14 MAPA DE RUTAS (México en puntos, rutas desde Querétaro) ───────── */
    const MAP = {"cols":99,"rows":84,"aspect":1.1779,"cities":{"Querétaro":[0.5847,0.6063],"Tijuana":[0.0387,0.0423],"Hermosillo":[0.1989,0.179],"Chihuahua":[0.3794,0.2375],"Culiacán":[0.2689,0.3568],"Monterrey":[0.6004,0.3568],"Guadalajara":[0.4006,0.5965],"Ciudad de México":[0.5912,0.6985],"Puebla":[0.6483,0.7191],"Veracruz":[0.7293,0.6974],"Oaxaca":[0.6952,0.8427],"Tuxtla":[0.8517,0.8644],"Mérida":[0.8886,0.5846],"Cancún":[0.9834,0.6063],"Tampico":[0.6924,0.4978]},"grid":["##########.........................................................................................","##########.........................................................................................",".###########.......................................................................................",".#############.....................................................................................",".###############..............####.................................................................",".########..#######...........#########.............................................................","..#######...########.........##########............................................................","..########...###########################...........................................................","..########...############################..........................................................","..#######....#############################.........................................................","...######.....############################.........................................................","...#######....############################........###..............................................","....########..#############################......######............................................",".....########..#############################....########...........................................","......#######.################################..#########..........................................","......######..###########################################..........................................",".......#####....#########################################..........................................",".......#####.....#########################################.........................................","..##..#######.....#########################################........................................","..###########.....#########################################........................................","..###########.......########################################.......................................","...##########.......#########################################......................................","....##########......##########################################.....................................",".....##########......#########################################.....................................",".....##########.......#########################################....................................","......##########.......#########################################...................................",".......##########......############################################................................","........#########.....################################################.............................",".........########.....##################################################...........................",".........#########...##################################################............................",".........########.....#################################################............................","..........#######......################################################............................",".........########.......##############################################.............................",".........########........#############################################.............................",".........########.........############################################.............................","...........######..........###########################################.............................","...........#######.........###########################################.............................",".............#####.........###########################################.............................","..............######........#########################################..............................","...............######........########################################..............................","................#####........########################################..............................",".................#####........#######################################..............................","..................####........#######################################..............................","..................####........######################################...............................","..................###.........######################################...............................","..............................######################################...............................","...............................#####################################...............................","...............................######################################.....................######...","..............................#######################################..................############","...............................######################################...............##############.","...............................######################################..............###############.","..............................########################################.............###############.","..............................#########################################............##############..",".............................##########################################............##############..","............................###########################################...........###############..","............................############################################.........################..",".............................############################################........################..","..............................###########################################.......#################..","..............................###########################################.....##################...","................................##########################################...###################...",".................................###############################################################...","...................................#############################################################...","....................................#########################################################.#....",".....................................#######################################################..#....","......................................######################################################.......",".......................................####################################################........",".........................................#################################################.........","............................................##############################################.........","..............................................###########################################..........","................................................#########################################..........","..................................................#########################################........","....................................................#########################################......","......................................................########################################.....","........................................................######################################.....","..........................................................###################################......","............................................................##############...###############.......","..............................................................##########.......############........",".................................................................#####...........#########.........","...................................................................#.............########..........","..................................................................................######...........","...................................................................................#####...........","....................................................................................####...........",".....................................................................................##............","......................................................................................#............"]};

    (() => {
        const box = $('#map');
        const cv = $('#map-canvas');
        const labels = $('#map-labels');
        if (!box || !cv) return;

        const HUB = 'Querétaro';
        // etiqueta visible en móvil (key), lado de la etiqueta (left/down)
        const META = {
            'Querétaro': { key: 1 }, 'Tijuana': { key: 1 }, 'Monterrey': { key: 1 },
            'Mérida': { key: 1, left: 1 }, 'Oaxaca': { key: 1 },
            'Ciudad de México': { left: 1 }, 'Puebla': { down: 1 }, 'Guadalajara': { left: 1 },
            'Cancún': { down: 1 }
        };
        const hub = MAP.cities[HUB];
        const aspect = MAP.aspect;

        // Etiquetas HTML sobre el canvas
        Object.entries(MAP.cities).forEach(([name, [x, y]]) => {
            const m = META[name] || {};
            const pin = document.createElement('div');
            pin.className = 'map__pin' + (name === HUB ? ' map__pin--hub' : '') + (m.key ? ' map__pin--key' : '')
                + (m.left ? ' map__pin--left' : '') + (m.down ? ' map__pin--down' : '');
            pin.style.left = `${x * 100}%`;
            pin.style.top = `${y * 100}%`;
            pin.innerHTML = `<span class="pin__t">${name}</span>`;
            labels.appendChild(pin);
        });

        // Puntos (matriz) con su distancia al hub para la onda expansiva
        const dots = [];
        MAP.grid.forEach((row, ry) => {
            for (let cx = 0; cx < row.length; cx++) {
                if (row[cx] !== '#') continue;
                const x = (cx + 0.5) / MAP.cols, y = (ry + 0.5) / MAP.rows;
                dots.push({ x, y, d: Math.hypot((x - hub[0]) * aspect, y - hub[1]) });
            }
        });

        let routes = [], cities = [], prog = reduced ? 1 : 0, started = reduced, on = false;
        const SAMPLES = 56;
        const GAIN = 1.9;     // cuánto "sobra" de progreso para que la última ruta también termine
        let stagger = 0.06;   // desfase entre rutas

        const build = (s) => {
            const px = (n) => [n[0] * s.w, n[1] * s.h];
            const H = px(hub);
            cities = Object.entries(MAP.cities).map(([name, n]) => ({ name, p: px(n), hub: name === HUB }));
            stagger = 0.9 / Math.max(1, cities.length - 1);
            routes = cities.filter(c => !c.hub).map((c, i) => {
                const dx = c.p[0] - H[0], dy = c.p[1] - H[1];
                const len = Math.hypot(dx, dy) || 1;
                let nx = -dy / len, ny = dx / len;
                if (ny > 0) { nx = -nx; ny = -ny; }          // la curva siempre se abomba hacia arriba
                const bow = len * 0.26;
                const C = [(H[0] + c.p[0]) / 2 + nx * bow, (H[1] + c.p[1]) / 2 + ny * bow];
                const pts = [];
                for (let k = 0; k <= SAMPLES; k++) {
                    const t = k / SAMPLES, u = 1 - t;
                    pts.push([u * u * H[0] + 2 * u * t * C[0] + t * t * c.p[0], u * u * H[1] + 2 * u * t * C[1] + t * t * c.p[1]]);
                }
                return { pts, off: (i * 0.173) % 1, sp: 0.00006 + (i % 4) * 0.000012 };
            });
        };

        const S = fitCanvas(cv, box, (s) => { build(s); if (reduced || !on) paint(performance.now()); });
        const ctx = S.ctx;
        build(S);
        paint(performance.now());

        function paint(now) {
            const { w, h } = S;
            const t = now / 1000;
            ctx.clearRect(0, 0, w, h);
            const cell = w / MAP.cols;

            // 1 · matriz de puntos con onda desde Querétaro
            for (const d of dots) {
                const ph = d.d * 9 - t * 1.05;
                const ring = Math.max(0, Math.sin(ph)); const r3 = ring * ring * ring;
                const a = 0.3 + r3 * 0.6;
                ctx.fillStyle = r3 > 0.08 ? `rgba(60,219,102,${a.toFixed(3)})` : `rgba(132,206,152,${a.toFixed(3)})`;
                ctx.beginPath();
                ctx.arc(d.x * w, d.y * h, cell * (0.23 + r3 * 0.12), 0, 6.2832);
                ctx.fill();
            }

            // 2 · rutas (se dibujan al entrar) y camiones circulando
            routes.forEach((r, k) => {
                const local = clamp(prog * GAIN - k * stagger);
                const n = Math.floor(local * SAMPLES);
                if (n < 2) return;
                ctx.lineWidth = 1.4;
                ctx.strokeStyle = 'rgba(60,219,102,.5)';
                ctx.beginPath(); ctx.moveTo(r.pts[0][0], r.pts[0][1]);
                for (let i = 1; i <= n; i++) ctx.lineTo(r.pts[i][0], r.pts[i][1]);
                ctx.stroke();
                if (local < 1) return;
                const u = (r.off + t * 1000 * r.sp) % 1;
                for (let g = 0; g < 7; g++) {
                    const idx = Math.max(0, Math.floor((u - g * 0.012 + 1) % 1 * SAMPLES));
                    const p = r.pts[idx];
                    ctx.fillStyle = `rgba(120,255,160,${(0.9 - g * 0.13).toFixed(2)})`;
                    ctx.beginPath(); ctx.arc(p[0], p[1], 2.8 - g * 0.3, 0, 6.2832); ctx.fill();
                }
                const hd = r.pts[Math.floor(u * SAMPLES)];
                const g2 = ctx.createRadialGradient(hd[0], hd[1], 0, hd[0], hd[1], 11);
                g2.addColorStop(0, 'rgba(60,219,102,.55)'); g2.addColorStop(1, 'rgba(60,219,102,0)');
                ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(hd[0], hd[1], 11, 0, 6.2832); ctx.fill();
            });

            // 3 · ciudades con pulso
            cities.forEach((c, i) => {
                const ap = c.hub ? 1 : clamp((prog * GAIN - (i - 1) * stagger - 0.82) * 6);
                if (ap <= 0) return;
                const pulse = (t * 0.6 + i * 0.37) % 1;
                ctx.strokeStyle = `rgba(60,219,102,${((1 - pulse) * 0.55 * ap).toFixed(3)})`;
                ctx.lineWidth = 1.2;
                ctx.beginPath(); ctx.arc(c.p[0], c.p[1], (c.hub ? 7 : 4) + pulse * (c.hub ? 20 : 11), 0, 6.2832); ctx.stroke();
                ctx.fillStyle = c.hub ? '#FFFFFF' : '#3CDB66';
                ctx.beginPath(); ctx.arc(c.p[0], c.p[1], (c.hub ? 5.2 : 3) * ap, 0, 6.2832); ctx.fill();
                if (c.hub) {
                    ctx.strokeStyle = 'rgba(60,219,102,.9)'; ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.arc(c.p[0], c.p[1], 8.5, 0, 6.2832); ctx.stroke();
                }
            });
        }

        if (reduced) { paint(0); return; }
        const L = loop((now, dt) => {
            if (started && prog < 1) prog = Math.min(1, prog + dt / 3400);
            paint(now);
        }, () => on);
        watch(box, (v) => { on = v; if (v) { started = true; L.start(); } else L.stop(); }, '80px');
    })();

    /* ───────── 15 CTA · LUCES DE CARRETERA ───────── */
    (() => {
        const cv = $('#cta-canvas');
        if (!cv) return;
        let streaks = [], dust = [], on = false;
        const seed = (s) => {
            const n = s.w < 700 ? 12 : 22;
            streaks = Array.from({ length: n }, () => ({
                x: rand(0, s.w), y: rand(s.h * 0.08, s.h * 0.95),
                len: rand(70, 260), sp: rand(0.05, 0.22), th: rand(1, 2.2),
                amber: Math.random() < 0.28
            }));
            dust = Array.from({ length: s.w < 700 ? 24 : 46 }, () => ({
                x: rand(0, s.w), y: rand(0, s.h), r: rand(0.6, 1.8), sp: rand(0.006, 0.02), ph: rand(0, 6.28)
            }));
        };
        const S = fitCanvas(cv, cv.parentElement, (s) => { seed(s); if (reduced || !on) draw(0, 0); });
        const ctx = S.ctx;
        seed(S);
        draw(0, 0);

        function draw(now, dt) {
            const { w, h } = S;
            ctx.clearRect(0, 0, w, h);
            ctx.lineCap = 'round';
            for (const s of streaks) {
                if (!reduced) { s.x -= s.sp * dt; if (s.x + s.len < 0) { s.x = w + rand(0, 200); s.y = rand(h * 0.08, h * 0.95); } }
                const g = ctx.createLinearGradient(s.x, 0, s.x + s.len, 0);
                const c = s.amber ? '255,178,55' : '60,219,102';
                g.addColorStop(0, `rgba(${c},0)`); g.addColorStop(1, `rgba(${c},${s.amber ? 0.5 : 0.42})`);
                ctx.strokeStyle = g; ctx.lineWidth = s.th;
                ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + s.len, s.y); ctx.stroke();
            }
            for (const d of dust) {
                if (!reduced) { d.y -= d.sp * dt; if (d.y < -4) { d.y = h + 4; d.x = rand(0, w); } }
                ctx.fillStyle = `rgba(190,255,215,${(0.2 + 0.2 * Math.sin(now / 900 + d.ph)).toFixed(3)})`;
                ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.2832); ctx.fill();
            }
        }
        if (reduced) return;
        const L = loop(draw, () => on);
        watch(cv.parentElement, (v) => { on = v; v ? L.start() : L.stop(); }, '60px');
    })();

    /* ───────── 16 MISIÓN / VISIÓN ───────── */
    (() => {
        const panels = $$('.mv__panel');
        const activate = (p) => panels.forEach(x => x.classList.toggle('is-active', x === p));
        panels.forEach(p => {
            p.addEventListener('pointerenter', () => { if (finePointer) activate(p); });
            p.addEventListener('focus', () => activate(p));
            p.addEventListener('click', () => activate(p));
        });
    })();

    /* ───────── 17 FAQ ───────── */
    (() => {
        const items = $$('.faq__item');
        const set = (item, open) => {
            item.classList.toggle('is-open', open);
            $('button', item).setAttribute('aria-expanded', String(open));
        };
        items.forEach(item => {
            $('button', item).addEventListener('click', () => {
                const open = !item.classList.contains('is-open');
                items.forEach(i => set(i, i === item ? open : false));
                if (hasST) setTimeout(() => ScrollTrigger.refresh(), 700);
            });
        });
        if (items[0]) set(items[0], true);
    })();

    /* ───────── 18 FORMULARIO → WHATSAPP ───────── */
    (() => {
        const form = $('#quote-form');
        if (!form) return;
        const status = $('#form-status');
        const btn = $('#form-submit');
        const label = $('.btn__label', btn);
        const original = label.textContent;

        const rules = {
            nombre: (v) => (v.trim().length >= 3 ? '' : 'Escribe tu nombre completo.'),
            tel: (v) => (v.replace(/\D/g, '').length >= 8 ? '' : 'Escribe un teléfono o WhatsApp válido.'),
            unidad: (v) => (v ? '' : 'Elige el tipo de unidad que necesitas.')
        };
        const check = (name) => {
            const input = form.elements[name];
            const msg = rules[name](input.value);
            const field = input.closest('.field');
            field.classList.toggle('is-invalid', !!msg);
            input.setAttribute('aria-invalid', String(!!msg));
            $('#e-' + name).textContent = msg;
            return !msg;
        };
        Object.keys(rules).forEach(n => {
            const input = form.elements[n];
            input.addEventListener('blur', () => check(n));
            input.addEventListener('input', () => { if (input.closest('.field').classList.contains('is-invalid')) check(n); });
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const results = Object.keys(rules).map(check);
            if (results.includes(false)) {
                const first = Object.keys(rules).find(n => rules[n](form.elements[n].value));
                form.elements[first].focus();
                status.textContent = 'Revisa los campos marcados para continuar.';
                return;
            }
            const f = (n) => form.elements[n].value.trim();
            const lines = ['Hola, quiero cotizar con Transportes Silva Express.', ''];
            lines.push(`Nombre: ${f('nombre')}`);
            if (f('empresa')) lines.push(`Empresa: ${f('empresa')}`);
            lines.push(`Teléfono: ${f('tel')}`);
            lines.push(`Tipo de unidad: ${f('unidad')}`);
            if (f('origen')) lines.push(`Origen: ${f('origen')}`);
            if (f('destino')) lines.push(`Destino: ${f('destino')}`);
            if (f('detalles')) lines.push(`Detalles de la carga: ${f('detalles')}`);
            const url = waUrl(lines.join('\n'));

            btn.disabled = true;
            label.textContent = 'Abriendo WhatsApp…';
            status.textContent = '';
            const win = window.open(url, '_blank', 'noopener');
            setTimeout(() => {
                btn.disabled = false;
                label.textContent = original;
                status.innerHTML = win
                    ? 'Listo. Abrimos WhatsApp con tu solicitud.'
                    : `Toca <a class="link-arrow" href="${url}" target="_blank" rel="noopener">aquí para abrir WhatsApp</a> con tu solicitud.`;
                if (win) form.reset();
            }, 700);
        });
    })();

    /* ───────── 19 ARRANQUE ───────── */
    const year = $('#year');
    if (year) year.textContent = new Date().getFullYear();

    // Tooltip del botón flotante: aparece una vez, unos segundos
    (() => {
        const wa = $('#wa-float');
        if (!wa) return;
        setTimeout(() => { wa.classList.add('show-tip'); setTimeout(() => wa.classList.remove('show-tip'), 5200); }, 9000);
    })();

    runLoader();
    addEventListener('load', () => { if (hasST) ScrollTrigger.refresh(); });
})();
