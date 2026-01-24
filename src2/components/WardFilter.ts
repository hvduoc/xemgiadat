/**
 * Ward filter component - MaXa dropdown selector
 */
export class WardFilter {
  private element: HTMLElement | null = null;
  private onFilterChange: ((maXa: string | null) => void) | null = null;
  private wardCodes: Array<{ code: string; label: string }> = [];

  constructor(onFilterChange?: (maXa: string | null) => void) {
    this.onFilterChange = onFilterChange || null;
    this.initWardCodes();
    this.create();
  }

  /**
   * Initialize ward codes mapping (56 wards in Đà Nẵng)
   * Format: MaXa -> Vietnamese name
   */
  private initWardCodes() {
    // Liên Chiểu
    const lienChieu = [
      { code: '490101', label: 'Liên Chiểu - Hòa Hiệp Bắc' },
      { code: '490102', label: 'Liên Chiểu - Hòa Hiệp Nam' },
      { code: '490103', label: 'Liên Chiểu - Tam Thăng' },
      { code: '490104', label: 'Liên Chiểu - Vinh Trung' },
      { code: '490105', label: 'Liên Chiểu - Vinh Quang' },
      { code: '490106', label: 'Liên Chiểu - An Khê' },
      { code: '490107', label: 'Liên Chiểu - Nại Hiên Đông' },
      { code: '490108', label: 'Liên Chiểu - Cẩm An' },
      { code: '490109', label: 'Liên Chiểu - Khuê Mỹ' },
      { code: '490110', label: 'Liên Chiểu - Nại Hiên Tây' },
      { code: '490111', label: 'Liên Chiểu - Hòa Khánh Bắc' },
      { code: '490112', label: 'Liên Chiểu - Hòa Khánh Nam' },
    ];

    // Thanh Khê
    const thanhKhe = [
      { code: '490201', label: 'Thanh Khê - Chính Gián' },
      { code: '490202', label: 'Thanh Khê - Thắng Lợi' },
      { code: '490203', label: 'Thanh Khê - Tân Chính' },
      { code: '490204', label: 'Thanh Khê - Phước Bình' },
      { code: '490205', label: 'Thanh Khê - Thanh Bình' },
      { code: '490206', label: 'Thanh Khê - Hoa Cương' },
      { code: '490207', label: 'Thanh Khê - Phước Mỹ' },
      { code: '490208', label: 'Thanh Khê - Thanh Mỹ' },
      { code: '490209', label: 'Thanh Khê - Tân Kiểng' },
      { code: '490210', label: 'Thanh Khê - Tây Thạnh' },
      { code: '490211', label: 'Thanh Khê - Quảng Việt' },
      { code: '490212', label: 'Thanh Khê - Hoà Cương' },
      { code: '490213', label: 'Thanh Khê - Hoà Khương' },
      { code: '490214', label: 'Thanh Khê - Hoà An' },
      { code: '490215', label: 'Thanh Khê - Hoà Vang' },
      { code: '490216', label: 'Thanh Khê - Quảng An' },
    ];

    // Hải Châu
    const haiChau = [
      { code: '490301', label: 'Hải Châu - Bạch Đằng' },
      { code: '490302', label: 'Hải Châu - Thạch Thang' },
      { code: '490303', label: 'Hải Châu - Thanh Bình' },
      { code: '490304', label: 'Hải Châu - Phước Ninh' },
      { code: '490305', label: 'Hải Châu - Bình Hiên' },
      { code: '490306', label: 'Hải Châu - Hàng Bái' },
      { code: '490307', label: 'Hải Châu - Lê Lợi' },
      { code: '490308', label: 'Hải Châu - Ngô Mây' },
      { code: '490309', label: 'Hải Châu - Hòa Cường' },
      { code: '490310', label: 'Hải Châu - Bình Thuận' },
      { code: '490311', label: 'Hải Châu - Thạch Thị Thanh' },
      { code: '490312', label: 'Hải Châu - Toàn Phúc' },
      { code: '490313', label: 'Hải Châu - Cảnh Dương' },
      { code: '490314', label: 'Hải Châu - Nơi Sỹ' },
      { code: '490315', label: 'Hải Châu - Nại Hiên' },
      { code: '490316', label: 'Hải Châu - Bàu Vàng' },
      { code: '490317', label: 'Hải Châu - Bàu Ổ' },
      { code: '490318', label: 'Hải Châu - Phước Hải' },
      { code: '490319', label: 'Hải Châu - Hòa Minh' },
      { code: '490320', label: 'Hải Châu - Cầu Sắt' },
      { code: '490321', label: 'Hải Châu - Bàu Uất' },
    ];

    // Ngũ Hành Sơn
    const nguHanhSon = [
      { code: '490401', label: 'Ngũ Hành Sơn - Mỹ An' },
      { code: '490402', label: 'Ngũ Hành Sơn - Mỹ Khê' },
      { code: '490403', label: 'Ngũ Hành Sơn - Thọ Quang' },
      { code: '490404', label: 'Ngũ Hành Sơn - Phước Mỹ' },
      { code: '490405', label: 'Ngũ Hành Sơn - Khuê Mỹ' },
      { code: '490406', label: 'Ngũ Hành Sơn - Mân Thái' },
    ];

    // Sơn Trà
    const sonTra = [
      { code: '490001', label: 'Sơn Trà - Bình An' },
      { code: '490002', label: 'Sơn Trà - Nước Ngọt' },
      { code: '490003', label: 'Sơn Trà - Thọ Quang' },
      { code: '490004', label: 'Sơn Trà - Phước Sơn' },
      { code: '490005', label: 'Sơn Trà - Tân Hương' },
    ];

    this.wardCodes = [
      { code: '', label: '-- Chọn Xã/Phường --' },
      ...sonTra,
      ...lienChieu,
      ...thanhKhe,
      ...haiChau,
      ...nguHanhSon,
    ];
  }

  /**
   * Create filter dropdown HTML
   */
  private create() {
    this.element = document.createElement('div');
    this.element.id = 'ward-filter';
    this.element.className = 'absolute top-4 right-4 z-30';

    const selectOptions = this.wardCodes
      .map((w) => `<option value="${w.code}">${w.label}</option>`)
      .join('');

    this.element.innerHTML = `
      <select id="ward-select" class="px-3 py-2 rounded-lg shadow-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
        ${selectOptions}
      </select>
    `;

    document.body.appendChild(this.element);

    // Change handler
    const select = this.element.querySelector('#ward-select') as HTMLSelectElement;
    if (select) {
      select.addEventListener('change', (e) => {
        const maXa = (e.target as HTMLSelectElement).value;
        this.onFilterChange?.(maXa || null);
      });
    }
  }

  /**
   * Get selected MaXa
   */
  public getSelectedMaXa(): string | null {
    const select = this.element?.querySelector('#ward-select') as HTMLSelectElement;
    const value = select?.value;
    return value ? value : null;
  }

  /**
   * Reset filter
   */
  public reset() {
    const select = this.element?.querySelector('#ward-select') as HTMLSelectElement;
    if (select) {
      select.value = '';
    }
  }

  /**
   * Destroy component
   */
  public destroy() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}
