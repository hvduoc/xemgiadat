/**
 * Core app types & interfaces
 */

export interface ParcelProperties {
  OBJECTID: number;
  MaXa: string;
  SoThuTuThua: number;
  SoHieuToBanDo: number;
  DiaChi: string;
  DienTich: number;
  KyHieuMucDichSuDung: string;
  TenChu: string;
}

export interface ParcelFeature {
  id: number;
  type: 'Feature';
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  properties: ParcelProperties;
}

export interface SelectedParcel {
  feature: ParcelFeature;
  lngLat: [number, number];
  centroid: [number, number];
}

export interface ListingInput {
  parcel_objectid: number;
  maxa: string;
  title: string;
  description: string;
  price: number;
  currency: 'VND';
  images: string[];
  created_at: Date;
  updated_at: Date;
  status: 'ACTIVE';
  area: number;
  address: string;
  lat: number;
  lng: number;
  user_uid?: string | null;
}

export interface ListingRecord extends ListingInput {
  id: string;
}
