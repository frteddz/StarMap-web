export interface Star {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  brightness: number;
}

export interface Constellation {
  stars: number[];
  lines: [number, number][];
  label: string;
}

export interface StarData {
  stars: Star[];
  constellations: Constellation[];
}

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + c;
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const labelNames = [
  'Andromeda', 'Orion', 'Cassiopeia', 'Lyra', 'Cygnus', 'Pegasus',
  'Scorpius', 'Ursa Major', 'Draco', 'Perseus', 'Aquila', 'Gemini',
  'Taurus', 'Leo', 'Virgo', 'Sagittarius', 'Aquarius', 'Pisces',
];

export function generateStarField(date: string, hemisphere: string): StarData {
  const raw = `${date}-${hemisphere}`;
  const seed = hashSeed(raw);
  const rng = seededRandom(seed);

  const starCount = 200;
  const stars: Star[] = [];

  for (let i = 0; i < starCount; i++) {
    stars.push({
      x: rng(),
      y: rng(),
      radius: 0.5 + rng() * 2,
      alpha: 0.3 + rng() * 0.6,
      brightness: rng(),
    });
  }

  const brightnessThreshold = 0.7;
  const brightIndices = stars
    .map((s, i) => ({ s, i }))
    .filter(e => e.s.brightness > brightnessThreshold)
    .map(e => e.i);

  const shuffled = [...brightIndices].sort(() => rng() - 0.5);

  const groupSize = 4;
  const numGroups = Math.min(6, Math.floor(shuffled.length / groupSize));
  const constellations: Constellation[] = [];

  for (let g = 0; g < numGroups; g++) {
    const group = shuffled.slice(g * groupSize, g * groupSize + groupSize);
    if (group.length < 3) continue;
    const lines: [number, number][] = [];
    const take = Math.min(group.length, 5);
    const subset = group.slice(0, take);

    for (let i = 0; i < subset.length - 1; i++) {
      lines.push([subset[i], subset[i + 1]]);
    }
    if (subset.length === 4) {
      lines.push([subset[0], subset[2]]);
    }
    if (subset.length >= 5) {
      lines.push([subset[1], subset[3]]);
    }

    constellations.push({
      stars: subset,
      lines,
      label: labelNames[g % labelNames.length],
    });
  }

  return { stars, constellations };
}

export function renderCanvas(
  canvas: HTMLCanvasElement,
  data: StarData,
) {
  const ctx = canvas.getContext('2d')!;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = rect.width;
  const h = rect.height;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  ctx.fillStyle = '#0b0c0c';
  ctx.fillRect(0, 0, w, h);

  for (const star of data.stars) {
    const sx = star.x * w;
    const sy = star.y * h;
    ctx.beginPath();
    ctx.arc(sx, sy, star.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(251, 225, 52, 0.5)';
  ctx.lineWidth = 1;
  for (const con of data.constellations) {
    for (const [i1, i2] of con.lines) {
      const s1 = data.stars[i1];
      const s2 = data.stars[i2];
      if (!s1 || !s2) continue;
      ctx.beginPath();
      ctx.moveTo(s1.x * w, s1.y * h);
      ctx.lineTo(s2.x * w, s2.y * h);
      ctx.stroke();
    }
  }

  ctx.font = '12px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(224, 224, 224, 0.7)';
  ctx.textAlign = 'center';
  for (const con of data.constellations) {
    let cx = 0, cy = 0;
    for (const idx of con.stars) {
      cx += data.stars[idx].x;
      cy += data.stars[idx].y;
    }
    cx = (cx / con.stars.length) * w;
    cy = (cy / con.stars.length) * h + 18;
    ctx.fillText(con.label, cx, cy);
  }

  const seedText = `${new Date().getFullYear()} · Night Sky Map`;
  ctx.font = '10px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(138, 138, 138, 0.5)';
  ctx.textAlign = 'right';
  ctx.fillText(seedText, w - 12, h - 10);
}
