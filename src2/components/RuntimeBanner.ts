/**
 * Runtime Mode Banner
 * Shows current app mode (LEGACY vs V2) + path to avoid confusion
 */
export class RuntimeBanner {
  private banner: HTMLElement | null = null;

  constructor(mode: 'LEGACY' | 'V2', entryPath: string) {
    this.render(mode, entryPath);
  }

  private render(mode: 'LEGACY' | 'V2', entryPath: string) {
    this.banner = document.createElement('div');
    this.banner.id = 'runtime-banner';
    this.banner.className = 'fixed top-2 left-2 z-[9999] px-3 py-1.5 rounded-lg shadow-lg text-xs font-mono flex items-center gap-2 pointer-events-none select-none';
    
    const bgColor = mode === 'V2' ? 'bg-green-600' : 'bg-yellow-600';
    const textColor = 'text-white';
    this.banner.className += ` ${bgColor} ${textColor}`;
    
    this.banner.innerHTML = `
      <span class="font-bold">${mode}</span>
      <span class="opacity-75">|</span>
      <span class="opacity-90">${entryPath}</span>
    `;

    document.body.appendChild(this.banner);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (this.banner) {
        this.banner.style.opacity = '0';
        this.banner.style.transition = 'opacity 0.5s ease';
        setTimeout(() => this.destroy(), 500);
      }
    }, 5000);
  }

  public destroy() {
    if (this.banner) {
      this.banner.remove();
      this.banner = null;
    }
  }
}
