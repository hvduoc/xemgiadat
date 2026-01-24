/**
 * Search bar component (with demo search functionality)
 */
export class SearchBar {
  private element: HTMLElement | null = null;
  private onSearch: ((query: string) => void) | null = null;

  constructor(onSearch?: (query: string) => void) {
    this.onSearch = onSearch || null;
    this.create();
  }

  /**
   * Create search bar HTML
   */
  private create() {
    this.element = document.createElement('div');
    this.element.id = 'search-bar';
    this.element.className = 'absolute top-4 left-4 z-30 w-80 flex flex-col gap-2';
    this.element.innerHTML = `
      <div>
        <input
          type="text"
          id="search-input"
          placeholder="Tìm kiếm thửa đất (VD: 123/45)..."
          class="w-full px-4 py-2 rounded-lg shadow-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <!-- Bridge buttons to legacy "Đăng tin" -->
      <div class="flex gap-2">
        <button id="v2-dangntin-btn" class="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition">
          📢 Đăng tin (Chế độ đầy đủ)
        </button>
        <button id="v2-help-btn" class="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">
          ℹ️
        </button>
      </div>
    `;

    document.body.appendChild(this.element);

    // Search input handler
    const input = this.element.querySelector('#search-input') as HTMLInputElement;
    if (input && this.onSearch) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.onSearch?.(input.value);
          console.log('[V2 Search] Query:', input.value);
        }
      });
    }

    // Bridge button: Open legacy đăng tin
    const dangTinBtn = this.element.querySelector('#v2-dangntin-btn') as HTMLButtonElement;
    if (dangTinBtn) {
      dangTinBtn.addEventListener('click', () => {
        console.log('[V2] Redirecting to legacy full app for posting listing...');
        window.location.href = '/?mode=post';
      });
    }

    // Help button
    const helpBtn = this.element.querySelector('#v2-help-btn') as HTMLButtonElement;
    if (helpBtn) {
      helpBtn.addEventListener('click', () => {
        alert('🗺️ V2 Shell - Core Features:\n\n✅ Map + Parcels\n✅ Click parcel → see details\n✅ "Đăng tin" → Full app\n\n📢 Full listing feature in legacy mode (click green button)');
      });
    }
  }

  /**
   * Get search input value
   */
  public getValue(): string {
    const input = this.element?.querySelector('#search-input') as HTMLInputElement;
    return input?.value || '';
  }

  /**
   * Clear search input
   */
  public clear() {
    const input = this.element?.querySelector('#search-input') as HTMLInputElement;
    if (input) input.value = '';
  }

  /**
   * Destroy search bar
   */
  public destroy() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}
