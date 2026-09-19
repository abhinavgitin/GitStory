'use client';

import React, { useEffect, useRef } from 'react';

interface Node {
    x: number;
    y: number;
    vx: number;
    vy: number;
    baseX: number;
    baseY: number;
    radius: number;
    label: string;
    pulse: number;
}

interface ConstellationGridProps {
    title?: string;
    description?: string;
    children?: React.ReactNode;
    className?: string;
}

export default function ConstellationGrid({
    children,
    className = "relative w-full overflow-hidden select-none bg-zinc-950",
}: ConstellationGridProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        let animationFrameId: number;
        let width = 0;
        let height = 0;

        // Mouse velocity & inertial tracking
        const mouse = {
            x: -1000,
            y: -1000,
            prevX: -1000,
            prevY: -1000,
            vx: 0,
            vy: 0,
            radius: 200,
        };

        let nodes: Node[] = [];

        const updateDimensions = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = container.clientWidth || window.innerWidth;
            height = container.clientHeight || window.innerHeight;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.scale(dpr, dpr);
            initNodes();
        };

        const handleMouseMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        };

        const handleMouseLeave = () => {
            mouse.x = -1000;
            mouse.y = -1000;
        };

        const initNodes = () => {
            nodes = [];
            // Optimal spacing for responsive performance across tall layouts
            const spacing = Math.max(65, Math.min(85, Math.floor(width / 22)));
            const cols = Math.ceil(width / spacing) + 1;
            const rows = Math.ceil(height / spacing) + 1;

            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    const x = i * spacing;
                    const y = j * spacing;
                    nodes.push({
                        x,
                        y,
                        vx: 0,
                        vy: 0,
                        baseX: x,
                        baseY: y,
                        radius: Math.random() * 1.1 + 1.1,
                        label: `${(i * 7).toString(16).toUpperCase()}:${(j * 11).toString(16).toUpperCase()}`,
                        pulse: Math.random() * Math.PI * 2,
                    });
                }
            }
        };

        updateDimensions();

        // Use ResizeObserver so canvas adjusts smoothly if content height changes dynamically
        let resizeObserver: ResizeObserver | null = null;
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(() => {
                updateDimensions();
            });
            resizeObserver.observe(container);
        }

        window.addEventListener('resize', updateDimensions);
        container.addEventListener('mousemove', handleMouseMove);
        container.addEventListener('mouseleave', handleMouseLeave);

        let lastTime = performance.now();

        const render = (now: number) => {
            const dt = Math.min((now - lastTime) / 1000, 0.05);
            lastTime = now;

            // Mouse velocity calculation
            mouse.vx = (mouse.x - mouse.prevX) / (dt * 1000 || 1);
            mouse.vy = (mouse.y - mouse.prevY) / (dt * 1000 || 1);
            mouse.prevX = mouse.x;
            mouse.prevY = mouse.y;

            const speed = Math.sqrt(mouse.vx * mouse.vx + mouse.vy * mouse.vy);

            const bgColor = '#09090b';
            const nodeColor = '255, 255, 255';
            const accentColor = '56, 189, 248'; // Sky Cyan Accent

            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, width, height);

            // Node Physics Engine (Hooke's Law Spring-Mass-Damping system)
            const SPRING_K = 18;
            const DAMPING = 0.82;

            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];
                n.pulse += dt * 3;

                // Mouse distance vectors
                const dx = mouse.x - n.x;
                const dy = mouse.y - n.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Dynamic shockwave repulsion based on cursor speed
                if (dist < mouse.radius && dist > 0) {
                    const power = (1 - dist / mouse.radius);
                    const force = power * (1500 + speed * 150);
                    const angle = Math.atan2(dy, dx);

                    n.vx -= Math.cos(angle) * force * dt;
                    n.vy -= Math.sin(angle) * force * dt;
                }

                // Restoring force
                const homeDx = n.baseX - n.x;
                const homeDy = n.baseY - n.y;

                n.vx += homeDx * SPRING_K * dt;
                n.vy += homeDy * SPRING_K * dt;

                n.vx *= DAMPING;
                n.vy *= DAMPING;

                n.x += n.vx * dt * 60;
                n.y += n.vy * dt * 60;
            }

            // Draw Connections (Distance Culling)
            const MAX_CONN_DIST = 75;
            const MAX_CONN_DIST_SQ = MAX_CONN_DIST * MAX_CONN_DIST;

            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];

                for (let j = i + 1; j < nodes.length; j++) {
                    const n2 = nodes[j];
                    const ndx = n.x - n2.x;
                    const ndy = n.y - n2.y;
                    const distSq = ndx * ndx + ndy * ndy;

                    if (distSq < MAX_CONN_DIST_SQ) {
                        const nDist = Math.sqrt(distSq);
                        const alpha = (1 - nDist / MAX_CONN_DIST) * 0.12;

                        ctx.strokeStyle = `rgba(${nodeColor}, ${alpha})`;
                        ctx.lineWidth = 0.6;
                        ctx.beginPath();
                        ctx.moveTo(n.x, n.y);
                        ctx.lineTo(n2.x, n2.y);
                        ctx.stroke();
                    }
                }
            }

            // Render Node Points & Interactive Highlights
            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];
                const dx = mouse.x - n.x;
                const dy = mouse.y - n.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const isNear = dist < mouse.radius;

                const baseAlpha = isNear ? 0.95 : 0.22 + Math.sin(n.pulse) * 0.08;

                if (isNear) {
                    ctx.fillStyle = `rgba(${accentColor}, 0.95)`;
                    ctx.shadowColor = `rgba(${accentColor}, 0.8)`;
                    ctx.shadowBlur = 8;
                } else {
                    ctx.fillStyle = `rgba(${nodeColor}, ${baseAlpha})`;
                    ctx.shadowBlur = 0;
                }

                const currentRadius = isNear ? n.radius * 1.5 : n.radius;

                ctx.beginPath();
                ctx.arc(n.x, n.y, Math.max(0.5, currentRadius), 0, Math.PI * 2);
                ctx.fill();

                // Spatial Radar Rings on proximity
                if (dist < 85) {
                    const pulseRing = ((n.pulse * 20) % 30) + 4;
                    const ringAlpha = (1 - pulseRing / 34) * 0.35;

                    ctx.strokeStyle = `rgba(${accentColor}, ${ringAlpha})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(n.x, n.y, pulseRing, 0, Math.PI * 2);
                    ctx.stroke();

                    ctx.font = '9px "JetBrains Mono", ui-monospace, monospace';
                    ctx.fillStyle = `rgba(${accentColor}, 0.85)`;
                    ctx.fillText(n.label, n.x + 10, n.y - 10);
                }
            }

            animationFrameId = requestAnimationFrame(render);
        };

        animationFrameId = requestAnimationFrame(render);

        return () => {
            cancelAnimationFrame(animationFrameId);
            if (resizeObserver) resizeObserver.disconnect();
            window.removeEventListener('resize', updateDimensions);
            container.removeEventListener('mousemove', handleMouseMove);
            container.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, []);

    return (
        <div ref={containerRef} className={className}>
            {/* Ambient canvas background */}
            <canvas ref={canvasRef} className="absolute inset-0 block pointer-events-none z-0" />

            {/* Seamless gradient transition overlays */}
            <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-zinc-950 via-zinc-950/50 to-transparent pointer-events-none z-[1]" />
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent pointer-events-none z-[1]" />

            {/* Seamless Content Wrapper */}
            <div className="relative z-10 w-full">
                {children}
            </div>
        </div>
    );
}
