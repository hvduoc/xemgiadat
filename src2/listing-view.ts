import "./styles/index.css";
import { ListingService } from "./services/ListingService";

const listingService = new ListingService();

function getLink(id: string) {
  return `${window.location.origin}/v2-dist/listing.html?id=${id}`;
}

function renderError(app: HTMLElement, message: string) {
  app.innerHTML = `<div class="p-6 bg-red-50 text-red-700 rounded-lg">${message}</div>`;
}

async function renderListing(app: HTMLElement, id: string) {
  app.innerHTML = '<div class="text-sm text-gray-500">Đang tải listing...</div>';
  try {
    const listing = await listingService.getListing(id);
    if (!listing) {
      renderError(app, `Không tìm thấy listing với id ${id}`);
      return;
    }

    const createdAt = (listing as any).created_at?.toDate?.() || new Date();
    const link = getLink(listing.id);
    const encoded = encodeURIComponent(link);
    const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encoded}`;
    const whatsapp = `https://wa.me/?text=${encoded}`;
    const directions = `https://www.google.com/maps/dir/?api=1&destination=${listing.lat},${listing.lng}`;
    const streetview = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${listing.lat},${listing.lng}`;

    const imagesSection = (listing.images || []).length
      ? `<div class="grid grid-cols-2 gap-3">${listing.images
          .map((url: string) => `<img src="${url}" alt="listing" class="w-full h-40 object-cover rounded-lg border" />`)
          .join("")}</div>`
      : '<p class="text-gray-500">Chưa có ảnh</p>';

    app.innerHTML = `
      <div class="bg-white rounded-xl shadow-lg p-6 space-y-4">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs text-gray-500">Listing ID: ${listing.id}</p>
            <h1 class="text-2xl font-bold">${listing.title}</h1>
            <p class="text-lg text-indigo-700 font-semibold mt-1">${listing.price.toLocaleString()} VND</p>
            <p class="text-sm text-gray-500">Trạng thái: ${listing.status}</p>
          </div>
          <div class="text-right text-sm text-gray-500">${createdAt.toLocaleString()}</div>
        </div>

        <div class="space-y-2">
          <h2 class="text-lg font-semibold">Thông tin thửa</h2>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div><span class="text-gray-500">OBJECTID:</span> ${listing.parcel_objectid}</div>
            <div><span class="text-gray-500">Mã xã:</span> ${listing.maxa}</div>
            <div><span class="text-gray-500">Diện tích:</span> ${listing.area?.toLocaleString()} m²</div>
            <div><span class="text-gray-500">Địa chỉ:</span> ${listing.address || "(Chưa có)"}</div>
          </div>
        </div>

        <div>
          <h2 class="text-lg font-semibold mb-2">Mô tả</h2>
          <p class="text-gray-700 whitespace-pre-line">${listing.description || "(Chưa có mô tả)"}</p>
        </div>

        <div>
          <h2 class="text-lg font-semibold mb-2">Ảnh</h2>
          ${imagesSection}
        </div>

        <div class="space-y-2">
          <h2 class="text-lg font-semibold">Chia sẻ & Điều hướng</h2>
          <div class="flex items-center gap-2 text-sm">
            <input id="share-link" class="flex-1 border rounded px-2 py-1" value="${link}" readonly />
            <button id="copy-link" class="px-3 py-1 bg-indigo-600 text-white rounded">Copy</button>
          </div>
          <div class="flex flex-wrap gap-2 text-sm">
            <a class="px-3 py-1 rounded bg-blue-600 text-white" href="${facebook}" target="_blank" rel="noopener">Facebook</a>
            <a class="px-3 py-1 rounded bg-green-600 text-white" href="${whatsapp}" target="_blank" rel="noopener">WhatsApp</a>
            <button id="zalo-share" class="px-3 py-1 rounded bg-orange-500 text-white">Zalo (copy link)</button>
            <a class="px-3 py-1 rounded bg-gray-800 text-white" href="${directions}" target="_blank" rel="noopener">Directions</a>
            <a class="px-3 py-1 rounded bg-gray-700 text-white" href="${streetview}" target="_blank" rel="noopener">Street View</a>
          </div>
          <p class="text-xs text-gray-500">Zalo chưa hỗ trợ web share, hãy dán link sau khi copy.</p>
        </div>
      </div>
    `;

    const copyBtn = document.getElementById("copy-link");
    copyBtn?.addEventListener("click", async () => {
      await navigator.clipboard.writeText(link);
      (copyBtn as HTMLButtonElement).textContent = "Đã copy";
      setTimeout(() => ((copyBtn as HTMLButtonElement).textContent = "Copy"), 1500);
    });

    const zaloBtn = document.getElementById("zalo-share");
    zaloBtn?.addEventListener("click", async () => {
      await navigator.clipboard.writeText(link);
      (zaloBtn as HTMLButtonElement).textContent = "Đã copy";
      setTimeout(() => ((zaloBtn as HTMLButtonElement).textContent = "Zalo (copy link)"), 1500);
    });
  } catch (err: any) {
    console.error(err);
    renderError(app, err?.message || 'Không thể tải listing');
  }
}

(function bootstrap() {
  const app = document.getElementById("listing-app");
  if (!app) return;
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    renderError(app, "Thiếu tham số id cho listing.");
    return;
  }
  renderListing(app, id);
})();
