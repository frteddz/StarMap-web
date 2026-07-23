import { generateStarField, renderCanvas, StarData } from './stars';

export class App {
  private el: HTMLElement;
  private canvas: HTMLCanvasElement;
  private currentData: StarData | null = null;

  constructor(el: HTMLElement) {
    this.el = el;
    this.canvas = document.createElement('canvas');
  }

  init() {
    this.renderLayout();
    this.generate();
  }

  private renderLayout() {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    this.el.innerHTML = `
      <header>
        <h1>✦ StarMap</h1>
        <p class="subtitle">Your personal night sky poster</p>
      </header>
      <div class="controls">
        <div class="control-group">
          <label for="date-input">Date</label>
          <input type="text" id="date-input" value="${mm}/${dd}" placeholder="MM/DD" maxlength="5" />
        </div>
        <div class="control-group">
          <label for="hemi-select">Hemisphere</label>
          <select id="hemi-select">
            <option value="Northern">Northern</option>
            <option value="Southern">Southern</option>
          </select>
        </div>
        <button class="generate-btn" id="gen-btn">Generate</button>
        <button class="download-btn" id="dl-btn">⬇ Download PNG</button>
      </div>
      <div class="canvas-wrap" id="canvas-wrap"></div>
    `;

    const wrap = this.el.querySelector('#canvas-wrap')!;
    wrap.appendChild(this.canvas);

    this.el.querySelector('#gen-btn')!.addEventListener('click', () => this.generate());
    this.el.querySelector('#dl-btn')!.addEventListener('click', () => this.download());

    const dateInput = this.el.querySelector('#date-input') as HTMLInputElement;
    dateInput.addEventListener('input', () => {
      const val = dateInput.value.replace(/[^0-9/]/g, '');
      dateInput.value = val;
      if (val.length === 2 && !val.includes('/')) {
        dateInput.value = val + '/';
      }
    });
  }

  private getDate(): string {
    const input = (this.el.querySelector('#date-input') as HTMLInputElement).value.trim();
    if (/^\d{1,2}\/\d{1,2}$/.test(input)) return input;
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
  }

  private getHemisphere(): string {
    return (this.el.querySelector('#hemi-select') as HTMLSelectElement).value;
  }

  private generate() {
    const date = this.getDate();
    const hemi = this.getHemisphere();
    this.currentData = generateStarField(date, hemi);

    const wrap = this.el.querySelector('#canvas-wrap')! as HTMLElement;
    const rect = wrap.getBoundingClientRect();
    if (rect.width === 0) {
      requestAnimationFrame(() => this.renderCanvasData());
    } else {
      this.renderCanvasData();
    }
  }

  private renderCanvasData() {
    if (!this.currentData) return;
    const wrap = this.el.querySelector('#canvas-wrap')! as HTMLElement;
    wrap.appendChild(this.canvas);
    renderCanvas(this.canvas, this.currentData);
  }

  private download() {
    if (!this.currentData) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width * dpr;
    const h = rect.height * dpr;

    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    const ctx = offscreen.getContext('2d')!;

    ctx.fillStyle = '#0b0c0c';
    ctx.fillRect(0, 0, w, h);

    const data = this.currentData;
    for (const star of data.stars) {
      const sx = star.x * w;
      const sy = star.y * h;
      ctx.beginPath();
      ctx.arc(sx, sy, star.radius * dpr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(251, 225, 52, 0.5)';
    ctx.lineWidth = 1 * dpr;
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

    ctx.font = `${12 * dpr}px "Segoe UI", system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(224, 224, 224, 0.7)';
    ctx.textAlign = 'center';
    for (const con of data.constellations) {
      let cx = 0, cy = 0;
      for (const idx of con.stars) {
        cx += data.stars[idx].x;
        cy += data.stars[idx].y;
      }
      cx = (cx / con.stars.length) * w;
      cy = (cy / con.stars.length) * h + 18 * dpr;
      ctx.fillText(con.label, cx, cy);
    }

    const seedText = `${new Date().getFullYear()} · Night Sky Map`;
    ctx.font = `${10 * dpr}px "Segoe UI", system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(138, 138, 138, 0.5)';
    ctx.textAlign = 'right';
    ctx.fillText(seedText, w - 12 * dpr, h - 10 * dpr);

    offscreen.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'starmap.png';
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }
}
