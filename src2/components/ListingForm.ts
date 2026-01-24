import { ListingService } from '../services/ListingService';
import type { ParcelFeature } from '../types';

export class ListingForm {
  private overlay: HTMLElement | null = null;
  private formEl: HTMLFormElement | null = null;
  private scrollContainer: HTMLElement | null = null;
  private service: ListingService;
  private currentParcel: ParcelFeature | null = null;
  private centroid: [number, number] | null = null;
  private lastBodyOverflow: string | null = null;
  private lastHtmlOverflow: string | null = null;
  private visualViewportHandler: (() => void) | null = null;

  constructor(service: ListingService) {
    this.service = service;
    this.render();
  }

  private render() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'listing-modal';
    // Modal stretches full viewport on mobile; scroll is contained inside the dialog body
    this.overlay.className = 'fixed inset-0 z-50 hidden bg-black/50 flex items-start md:items-center justify-center p-4';
    this.overlay.innerHTML = `
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl relative my-6 md:my-10 flex flex-col" role="dialog" aria-modal="true" aria-labelledby="listing-title" tabindex="-1" style="max-height: calc(var(--vvh, 100dvh) - 1rem); max-height: calc(100dvh - 1rem);">
        <button class="absolute top-3 right-3 text-gray-500 hover:text-gray-700 z-10" id="listing-close">✕</button>
        <!-- Header (title) -->
        <div class="flex-none px-6 pt-6 pb-2">
          <h2 class="text-2xl font-bold mb-1" id="listing-title">Đăng tin bất động sản</h2>
          <p class="text-sm text-gray-500">Gắn liền với thửa đất đã chọn</p>
        </div>
        <!-- Scrollable body: flex-1 min-h-0 ensures it shrinks and can scroll -->
        <div class="flex-1 min-h-0 overflow-y-auto overscroll-contain" data-listing-scroll style="-webkit-overflow-scrolling: touch;">
          <div class="px-6">
            <form id="listing-form" class="space-y-4">
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Tiêu đề</label>
                <input type="text" name="title" required class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Nhập tiêu đề tin" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Giá (VND)</label>
                <input type="number" name="price" min="0" step="1000" required class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Nhập giá" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Mô tả</label>
                <textarea name="description" rows="4" class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Thông tin chi tiết về thửa đất"></textarea>
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Ảnh (tùy chọn)</label>
                <input type="file" name="images" accept="image/*" multiple class="w-full text-sm" />
                <p class="text-xs text-gray-400 mt-1">Ảnh sẽ được lưu vào Firebase Storage</p>
              </div>
              <div class="text-sm text-gray-500 pb-6" id="listing-status" aria-live="polite"></div>
            </form>
          </div>
        </div>
        <!-- Footer (CTA): flex-none sticky, outside scroll area -->
        <div class="flex-none border-t border-gray-200 bg-white flex items-center justify-end space-x-3 p-6" style="padding-bottom: calc(1.5rem + env(safe-area-inset-bottom));">
          <button type="button" id="listing-cancel" class="px-4 py-2 min-h-[44px] min-w-[44px] rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Hủy</button>
          <button type="submit" form="listing-form" class="px-4 py-2 min-h-[44px] min-w-[44px] rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700" id="listing-submit">Đăng tin</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);

    this.formEl = this.overlay.querySelector('#listing-form') as HTMLFormElement;
    this.scrollContainer = this.overlay.querySelector('[data-listing-scroll]') as HTMLElement;
    const closeBtns = [
      this.overlay.querySelector('#listing-close'),
      this.overlay.querySelector('#listing-cancel'),
    ];
    closeBtns.forEach((btn) => btn?.addEventListener('click', () => this.hide()));
    this.formEl?.addEventListener('submit', (e) => this.handleSubmit(e));
    this.overlay.addEventListener('click', (e) => this.handleOverlayClick(e));
  }

  public open(parcel: ParcelFeature, centroid: [number, number]) {
    this.currentParcel = parcel;
    this.centroid = centroid;
    if (!this.overlay) return;
    this.lockBodyScroll();
    this.setupVisualViewport();
    this.resetForm();
    this.overlay.classList.remove('hidden');
    document.addEventListener('keydown', this.handleKeyDown);
    this.overlay.addEventListener('focusin', this.handleFocusIn);
    setTimeout(() => {
      this.focusInitialField();
      this.logDiagnostics();
    }, 50);
  }

  public hide() {
    this.overlay?.classList.add('hidden');
    this.unlockBodyScroll();
    this.teardownVisualViewport();
    document.removeEventListener('keydown', this.handleKeyDown);
    this.overlay?.removeEventListener('focusin', this.handleFocusIn);
  }

  private resetForm() {
    if (!this.formEl || !this.currentParcel) return;
    const title = this.formEl.querySelector('input[name="title"]') as HTMLInputElement;
    const price = this.formEl.querySelector('input[name="price"]') as HTMLInputElement;
    const desc = this.formEl.querySelector('textarea[name="description"]') as HTMLTextAreaElement;
    const status = this.formEl.querySelector('#listing-status') as HTMLElement;
    if (title) title.value = `Tin thửa ${this.currentParcel.properties.OBJECTID}`;
    if (price) price.value = '';
    if (desc) desc.value = this.currentParcel.properties.DiaChi || '';
    if (status) status.textContent = '';
  }

  private async handleSubmit(event: Event) {
    event.preventDefault();
    if (!this.formEl || !this.currentParcel || !this.centroid) return;

    const submitBtn = this.formEl.querySelector('#listing-submit') as HTMLButtonElement;
    const status = this.formEl.querySelector('#listing-status') as HTMLElement;
    const title = (this.formEl.querySelector('input[name="title"]') as HTMLInputElement).value.trim();
    const priceInput = this.formEl.querySelector('input[name="price"]') as HTMLInputElement;
    const description = (this.formEl.querySelector('textarea[name="description"]') as HTMLTextAreaElement).value.trim();
    const filesInput = this.formEl.querySelector('input[name="images"]') as HTMLInputElement;
    const files = filesInput?.files ? Array.from(filesInput.files) : [];

    const price = Number(priceInput.value || '0');
    if (!title || Number.isNaN(price)) {
      status.textContent = 'Vui lòng nhập tiêu đề và giá hợp lệ.';
      this.scrollFieldIntoView(!title ? titleInput : priceInput);
      (!title ? titleInput : priceInput).focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="inline-flex items-center gap-2"><span class="h-4 w-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin"></span>Đang lưu...</span>';
    status.textContent = 'Đang tải ảnh và lưu Firestore...';

    try {
      const imageUrls = await this.service.uploadImages(files);
      const listingId = await this.service.createListing({
        parcel_objectid: this.currentParcel.properties.OBJECTID,
        maxa: this.currentParcel.properties.MaXa,
        title,
        description,
        price,
        currency: 'VND',
        images: imageUrls,
        area: this.currentParcel.properties.DienTich,
        address: this.currentParcel.properties.DiaChi,
        lat: this.centroid[1],
        lng: this.centroid[0],
      });

      const link = `${window.location.origin}/v2-dist/listing.html?id=${listingId}`;
      status.innerHTML = `
        <div class="mt-3 p-3 rounded-lg bg-green-50 text-green-800">
          ✅ Đăng tin thành công. <a class="underline font-semibold" href="${link}" target="_blank" rel="noopener">Mở tin</a>
        </div>
      `;
      this.renderShareSection(link, this.centroid);
    } catch (err: any) {
      console.error('[ListingForm] Failed to create listing', err);
      status.textContent = `Lỗi: ${err?.message || 'Không thể lưu tin'}`;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Đăng tin';
    }
  }

  private handleOverlayClick(event: MouseEvent) {
    if (event.target === this.overlay) {
      this.hide();
    }
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      this.hide();
      return;
    }
    if (event.key === 'Tab') {
      this.trapFocus(event);
    }
  };

  private handleFocusIn = (event: FocusEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target || !this.scrollContainer) return;
    requestAnimationFrame(() => {
      try {
        target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
      } catch (err) {
        console.warn('[ListingForm] scrollIntoView failed', err);
      }
    });
  };

  private focusInitialField() {
    if (!this.overlay) return;
    const firstInput = this.overlay.querySelector('input, textarea, select, button') as HTMLElement | null;
    (firstInput || this.overlay).focus();
  }

  private trapFocus(event: KeyboardEvent) {
    if (!this.overlay) return;
    const focusableSelectors = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(this.overlay.querySelectorAll<HTMLElement>(focusableSelectors)).filter(
      (el) => el.offsetParent !== null
    );
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private scrollFieldIntoView(field: HTMLElement | null) {
    if (!field || !this.scrollContainer) return;
    const container = this.scrollContainer;
    const fieldRect = field.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const footerReserve = 120; // approximate CTA height + safe-area padding
    if (fieldRect.bottom > containerRect.bottom - footerReserve) {
      const offset = fieldRect.bottom - containerRect.bottom + container.scrollTop + footerReserve;
      container.scrollTo({ top: offset, behavior: 'smooth' });
    } else if (fieldRect.top < containerRect.top) {
      const offset = container.scrollTop - (containerRect.top - fieldRect.top) - 24;
      container.scrollTo({ top: offset, behavior: 'smooth' });
    }
  }

  private lockBodyScroll() {
    this.lastBodyOverflow = document.body.style.overflow;
    this.lastHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }

  private unlockBodyScroll() {
    if (this.lastBodyOverflow !== null) {
      document.body.style.overflow = this.lastBodyOverflow;
      this.lastBodyOverflow = null;
    } else {
      document.body.style.removeProperty('overflow');
    }
    if (this.lastHtmlOverflow !== null) {
      document.documentElement.style.overflow = this.lastHtmlOverflow;
      this.lastHtmlOverflow = null;
    } else {
      document.documentElement.style.removeProperty('overflow');
    }
  }

  private setupVisualViewport() {
    if (!('visualViewport' in window)) return;
    let rafId: number | null = null;
    this.visualViewportHandler = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const vvh = (window as any).visualViewport?.height;
        if (vvh) {
          document.documentElement.style.setProperty('--vvh', `${vvh}px`);
        }
      });
    };
    (window as any).visualViewport?.addEventListener('resize', this.visualViewportHandler);
    this.visualViewportHandler(); // Set initial value
    // Store rafId in closure; cleanup cancels if pending
    (this as any)._vvhRafId = () => rafId;
    (this as any)._vvhRafCancel = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
  }

  private teardownVisualViewport() {
    if (this.visualViewportHandler && 'visualViewport' in window) {
      (window as any).visualViewport?.removeEventListener('resize', this.visualViewportHandler);
      if ((this as any)._vvhRafCancel) {
        (this as any)._vvhRafCancel();
      }
      this.visualViewportHandler = null;
      document.documentElement.style.removeProperty('--vvh');
    }
  }

  private logDiagnostics() {
    console.log('[ListingForm] Modal diagnostics:');
    console.log('  Source: V2 ListingForm.ts');
    console.log('  Path:', window.location.pathname);
    if (this.overlay && this.scrollContainer) {
      const dialog = this.overlay.querySelector('[role="dialog"]') as HTMLElement;
      const footer = this.overlay.querySelector('.sticky') as HTMLElement;
      console.log('  Dialog clientHeight:', dialog?.clientHeight);
      console.log('  Scroll container clientHeight:', this.scrollContainer.clientHeight);
      console.log('  Scroll container scrollHeight:', this.scrollContainer.scrollHeight);
      console.log('  Footer height:', footer?.offsetHeight);
      console.log('  Has scrollbar:', this.scrollContainer.scrollHeight > this.scrollContainer.clientHeight ? '✅ YES' : '❌ NO');

      // One-line verify for commanders
      const cta = this.overlay.querySelector('#listing-submit') as HTMLElement;
      const ctaRect = cta?.getBoundingClientRect();
      const dialogRect = dialog?.getBoundingClientRect();
      const footerRect = footer?.getBoundingClientRect();
      const footerVisible = footerRect && dialogRect ? (footerRect.bottom <= dialogRect.bottom ? 'yes' : 'no') : 'unknown';
      const ctaSize = ctaRect ? `${Math.round(ctaRect.width)}x${Math.round(ctaRect.height)}` : 'unknown';
      console.log(
        `[VERIFY MODAL] viewport=${window.innerWidth}x${window.innerHeight} scroll=${this.scrollContainer.scrollHeight}/${this.scrollContainer.clientHeight} footerVisible=${footerVisible} ctaSize=${ctaSize}`
      );
    }
  }

  private renderShareSection(link: string, centroid: [number, number]) {
    if (!this.formEl) return;
    const status = this.formEl.querySelector('#listing-status');
    if (!status) return;

    const [lng, lat] = centroid;
    const encodedLink = encodeURIComponent(link);
    const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`;
    const whatsapp = `https://wa.me/?text=${encodedLink}`;
    const directions = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    const streetview = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;

    const container = document.createElement('div');
    container.className = 'mt-4 space-y-2 text-sm';
    container.innerHTML = `
      <div class="flex items-center space-x-2">
        <input readonly class="flex-1 rounded border px-2 py-1 text-xs" value="${link}" />
        <button class="px-3 py-1 rounded bg-indigo-600 text-white text-xs" id="listing-copy">Copy link</button>
      </div>
      <div class="flex flex-wrap gap-2 text-xs">
        <a class="px-3 py-1 rounded bg-blue-600 text-white" href="${facebook}" target="_blank" rel="noopener">Facebook</a>
        <a class="px-3 py-1 rounded bg-green-600 text-white" href="${whatsapp}" target="_blank" rel="noopener">WhatsApp</a>
        <button class="px-3 py-1 rounded bg-orange-500 text-white" id="listing-zalo">Zalo (copy link)</button>
        <a class="px-3 py-1 rounded bg-gray-800 text-white" href="${directions}" target="_blank" rel="noopener">Directions</a>
        <a class="px-3 py-1 rounded bg-gray-700 text-white" href="${streetview}" target="_blank" rel="noopener">Street View</a>
      </div>
      <p class="text-gray-500">Zalo chưa có web share, hãy dán link sau khi copy.</p>
    `;

    const copyBtn = container.querySelector('#listing-copy');
    copyBtn?.addEventListener('click', async () => {
      await navigator.clipboard.writeText(link);
      (copyBtn as HTMLButtonElement).textContent = 'Đã copy';
      setTimeout(() => ((copyBtn as HTMLButtonElement).textContent = 'Copy link'), 1500);
    });

    const zaloBtn = container.querySelector('#listing-zalo');
    zaloBtn?.addEventListener('click', async () => {
      await navigator.clipboard.writeText(link);
      (zaloBtn as HTMLButtonElement).textContent = 'Đã copy';
      setTimeout(() => ((zaloBtn as HTMLButtonElement).textContent = 'Zalo (copy link)'), 1500);
    });

    status.appendChild(container);
  }
}
