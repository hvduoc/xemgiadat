import { ParcelProperties } from '../types';

/**
 * Side panel component for displaying parcel details
 */
export class ParcelPanel {
  private element: HTMLElement | null = null;
  private visible: boolean = false;
  private onCreateListing: ((props: ParcelProperties) => void) | null = null;
  private currentProperties: ParcelProperties | null = null;

  constructor() {
    this.create();
  }

  /**
   * Create panel HTML
   */
  private create() {
    this.element = document.createElement('div');
    this.element.id = 'parcel-panel';
    this.element.className = 'fixed right-0 top-0 w-96 h-full bg-white shadow-lg transform translate-x-full transition-transform duration-300 z-40 overflow-y-auto';
    this.element.innerHTML = `
      <div class="p-6">
        <button id="close-panel" class="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
          ✕
        </button>
        <div id="panel-content"></div>
        <div class="mt-6 pt-4 border-t">
          <button id="create-listing" class="w-full px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700">Đăng tin</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.element);

    // Close button handler
    this.element.querySelector('#close-panel')?.addEventListener('click', () => {
      this.hide();
    });

    // Create listing handler
    this.element.querySelector('#create-listing')?.addEventListener('click', () => {
      if (this.onCreateListing && this.currentProperties) {
        this.onCreateListing(this.currentProperties);
      }
    });
  }

  /**
   * Display parcel info in panel
   */
  public show(properties: ParcelProperties) {
    if (!this.element) return;
    this.currentProperties = properties;

    const content = this.element.querySelector('#panel-content');
    if (!content) return;

    content.innerHTML = `
      <h2 class="text-2xl font-bold mb-4">Thửa Đất</h2>
      
      <div class="space-y-3">
        <div class="border-b pb-2">
          <p class="text-xs text-gray-500 uppercase">Mã Xã</p>
          <p class="text-lg font-semibold">${properties.MaXa}</p>
        </div>
        
        <div class="border-b pb-2">
          <p class="text-xs text-gray-500 uppercase">OBJECTID</p>
          <p class="text-lg font-mono">${properties.OBJECTID}</p>
        </div>
        
        <div class="border-b pb-2">
          <p class="text-xs text-gray-500 uppercase">Số Thứ Tự Thửa</p>
          <p class="text-lg">${properties.SoThuTuThua}</p>
        </div>
        
        <div class="border-b pb-2">
          <p class="text-xs text-gray-500 uppercase">Địa Chỉ</p>
          <p class="text-lg">${properties.DiaChi || 'N/A'}</p>
        </div>
        
        <div class="border-b pb-2">
          <p class="text-xs text-gray-500 uppercase">Diện Tích</p>
          <p class="text-lg font-semibold">${properties.DienTich.toLocaleString()} m²</p>
        </div>
        
        <div class="border-b pb-2">
          <p class="text-xs text-gray-500 uppercase">Mục Đích Sử Dụng</p>
          <p class="text-lg">${properties.KyHieuMucDichSuDung || 'N/A'}</p>
        </div>
        
        <div class="border-b pb-2">
          <p class="text-xs text-gray-500 uppercase">Chủ Sở Hữu</p>
          <p class="text-lg">${properties.TenChu || 'N/A'}</p>
        </div>
        
        <div class="pt-4">
          <p class="text-xs text-gray-500 uppercase">Số Hiệu Tờ Bản Đồ</p>
          <p class="text-lg">${properties.SoHieuToBanDo}</p>
        </div>
      </div>
      
      <div class="mt-6 pt-4 border-t">
        <p class="text-xs text-gray-400">Nguồn: Dữ liệu địa chính Đà Nẵng</p>
      </div>
    `;

    this.element.classList.remove('translate-x-full');
    this.visible = true;
  }

  /**
   * Hide panel
   */
  public hide() {
    if (!this.element) return;
    this.element.classList.add('translate-x-full');
    this.visible = false;
  }

  /**
   * Get visibility state
   */
  public isVisible(): boolean {
    return this.visible;
  }

  /** Register handler when user wants to create a listing */
  public setCreateListingHandler(handler: (props: ParcelProperties) => void) {
    this.onCreateListing = handler;
  }

  /**
   * Destroy panel
   */
  public destroy() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}
