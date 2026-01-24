# 📋 TECHNICAL DATA EXTRACTION PACKAGE
## XemGiaDat Project - Core Map & Cadastral Data Architecture

**Prepared for:** System Architect (External)  
**Date:** 18/01/2026  
**Purpose:** Architecture redesign (MapLibre + PMTiles + Google/Firebase)  
**Status:** Confidential - Engineering Review

---

## PHẦN A — BÓC TÁCH DỮ LIỆU BẢN ĐỒ & ĐỊA CHÍNH

### A1. PMTiles / PARCEL DATA

#### 1.1 File Location & Metadata

```json
{
  "pmtiles": {
    "primary_file": {
      "name": "danang_parcels_final.pmtiles",
      "location": "public/tiles/danang_parcels_final.pmtiles",
      "size_mb": "~50+MB",
      "format": "PMTiles (v3)",
      "description": "Final production tileset for Da Nang parcel data"
    },
    "backup_file": {
      "name": "danang_parcels.pmtiles",
      "location": "public/tiles/danang_parcels.pmtiles",
      "size_mb": "~50+MB",
      "format": "PMTiles (v3)",
      "description": "Backup tileset"
    },
    "metadata": {
      "file": "public/tiles/metadata.json",
      "contains": ["tile schema", "layer definitions", "statistics"]
    }
  }
}
```

#### 1.2 PMTiles Metadata (from metadata.json)

```json
{
  "metadata": {
    "name": "parcels",
    "description": "Vietnamese parcel cadastral data - Da Nang",
    "version": "2",
    "format": "pbf",
    "zoom_levels": {
      "minzoom": 10,
      "maxzoom": 14,
      "center": "108.248291,16.014136,14"
    },
    "geographic_bounds": {
      "west": 107.818606,
      "south": 15.917977,
      "east": 108.338222,
      "north": 16.215533,
      "description": "Da Nang city boundary + surrounding areas"
    },
    "tile_type": "overlay",
    "encoding": "pbf (Protocol Buffers)"
  }
}
```

#### 1.3 Vector Layers Structure

```json
{
  "vector_layers": [
    {
      "id": "parcels",
      "description": "Vietnamese cadastral parcels",
      "minzoom": 10,
      "maxzoom": 14,
      "geometry_type": "Polygon",
      "attribute_count": 10,
      "total_features": 563092,
      "administrative_units": 56,
      "field_definitions": {
        "OBJECTID": "Number (unique identifier)",
        "MaXa": "String (administrative ward code - 5 digits, e.g., '20194')",
        "SoThuTuThua": "Number (parcel sequential number within ward)",
        "SoHieuToBanDo": "Number (map sheet number)",
        "DiaChi": "String (address)",
        "DienTich": "Number (area in m²)",
        "KyHieuMucDichSuDung": "String (land use classification - max 10 chars)",
        "TenChu": "String (owner name)",
        "SHAPE.STArea()": "Number (geometric area calculation)",
        "SHAPE.STLength()": "Number (perimeter calculation)"
      }
    }
  ],
  "tilestats": {
    "layerCount": 1,
    "total_parcels": 563092,
    "wards_covered": 56,
    "geometry": "Polygon"
  }
}
```

#### 1.4 Sample Features (JSON)

```json
{
  "sample_features": [
    {
      "type": "Feature",
      "id": 908266,
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [108.11009613498868, 16.14504292906529],
            [108.11017368078831, 16.14497752965008],
            [108.1102906093279, 16.14492196867885],
            [108.11029693202862, 16.144922997297428],
            [108.1104231345633, 16.144985431479864],
            [108.11034288083148, 16.14517165710638],
            [108.1102302131898, 16.145292895025054],
            [108.11016913457394, 16.1452607797641],
            [108.11015448268735, 16.145250519913752],
            [108.11008354524975, 16.145237119750412],
            [108.1100035925385, 16.145264249637044],
            [108.11001493313174, 16.14516003782742],
            [108.11009613498868, 16.14504292906529]
          ]
        ]
      },
      "properties": {
        "OBJECTID": 908266,
        "MaXa": "20194",
        "SoThuTuThua": 55,
        "SoHieuToBanDo": 1,
        "DiaChi": "Liên Chiểu, Đà Nẵng",
        "DienTich": 1078.9,
        "KyHieuMucDichSuDung": "ODT",
        "TenChu": "Nguyễn Văn A"
      }
    },
    {
      "type": "Feature",
      "id": 908267,
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [108.11022188166656, 16.146507306081737],
            [108.11021285990368, 16.14650808047406],
            [108.11006407832896, 16.14638534135204],
            [108.11006782538834, 16.14633744562823],
            [108.11014051392061, 16.146258995328335],
            [108.11023432863931, 16.146291100450444],
            [108.11024373611524, 16.146296796212333],
            [108.1103177790171, 16.14634160520426],
            [108.11034211840796, 16.146367573807794],
            [108.11027199217523, 16.14650300090033],
            [108.11022188166656, 16.146507306081737]
          ]
        ]
      },
      "properties": {
        "OBJECTID": 908267,
        "MaXa": "20194",
        "SoThuTuThua": 20,
        "SoHieuToBanDo": 1,
        "DiaChi": "Hòa Hiệp Nam, Quận Liên Chiểu",
        "DienTich": 509,
        "KyHieuMucDichSuDung": "ODT",
        "TenChu": "Trần Thị B"
      }
    },
    {
      "type": "Feature",
      "id": 908357,
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [108.11195816063217, 16.147123401925207],
            [108.11197053660236, 16.14713146941348],
            [108.11208730836675, 16.147158970807823],
            [108.11215994414272, 16.147185453610064],
            [108.11209645472202, 16.147185561484722],
            [108.1119854096613, 16.147150106461847]
          ]
        ]
      },
      "properties": {
        "OBJECTID": 908357,
        "MaXa": "20194",
        "SoThuTuThua": 5001,
        "SoHieuToBanDo": 2,
        "DiaChi": "Thanh Khê, Đà Nẵng",
        "DienTich": 563.9,
        "KyHieuMucDichSuDung": "DGT",
        "TenChu": "Công ty TNHH XYZ"
      }
    }
  ]
}
```

#### 1.5 Search Fields Analysis

```json
{
  "search_indexable_fields": {
    "primary_keys": {
      "OBJECTID": {
        "type": "Number",
        "range": [598633, 1161725],
        "purpose": "Unique parcel identifier",
        "search_priority": "CRITICAL",
        "index_type": "Primary Key"
      },
      "MaXa": {
        "type": "String",
        "distinct_values": 56,
        "sample_values": ["20194", "20195", "20197", "20198", "20200", "...", "20332"],
        "purpose": "Ward/commune administrative code (VN standard)",
        "search_priority": "CRITICAL",
        "index_type": "Geographic Partition"
      }
    },
    "secondary_search": {
      "SoThuTuThua": {
        "type": "Number",
        "range": [0, 50001],
        "purpose": "Sequential parcel number within ward (unique within MaXa)",
        "search_priority": "HIGH",
        "composite_key": "MaXa + SoThuTuThua = Unique Identifier",
        "index_type": "Secondary"
      },
      "DiaChi": {
        "type": "String",
        "sample_values": ["Liên Chiểu, Đà Nẵng", "Hòa Hiệp Nam, Quận Liên Chiểu", "Lot 36-B2.18"],
        "purpose": "Full address/location name",
        "search_priority": "HIGH",
        "index_type": "Full Text Search (FTS)",
        "note": "Requires Vietnamese diacritics support"
      },
      "TenChu": {
        "type": "String",
        "sample_values": ["Nguyễn Văn A", "Trần Thị B", "Công ty TNHH XYZ"],
        "purpose": "Owner/landholder name",
        "search_priority": "MEDIUM",
        "index_type": "Full Text Search (FTS)"
      }
    },
    "filtering_fields": {
      "DienTich": {
        "type": "Number",
        "range": [0, 75398642.3],
        "unit": "m² (square meters)",
        "purpose": "Land area - used for range queries",
        "search_priority": "MEDIUM",
        "index_type": "Range Index"
      },
      "KyHieuMucDichSuDung": {
        "type": "String",
        "distinct_values": "~100+",
        "sample_values": ["ODT", "DGT", "BCS", "CAN", "CLN", "CQP", "DBV", "DCH", "DCK", "DGD", "DGT", "DKV", "DTL", "DYT", "MNC", "NTD", "NTS", "ODT", "SON", "TIN", "TMD", "TON", "TSC"],
        "purpose": "Land use code (Vietnamese standard)",
        "search_priority": "MEDIUM",
        "index_type": "Category Filter",
        "legend": {
          "ODT": "Đất ở (Residential)",
          "DGT": "Đất công nghiệp (Industrial)",
          "BCS": "Bãi chứa, chế biến",
          "CAN": "Công an",
          "CLN": "Cảnh quán, du lịch, dân cư không chủ định",
          "DKV": "Đất khai thác, kinh doanh",
          "SON": "Sinh hoạt (Living quarters)"
        }
      },
      "SoHieuToBanDo": {
        "type": "Number",
        "range": [0, 2742],
        "purpose": "Cadastral map sheet ID",
        "search_priority": "LOW",
        "index_type": "Range Index"
      }
    }
  }
}
```

#### 1.6 CRS (Coordinate Reference System) Information

```json
{
  "coordinate_system": {
    "current_pmtiles": {
      "crs": "EPSG:4326 (WGS84)",
      "description": "World Geodetic System 1984",
      "format": "[longitude, latitude]",
      "example_point": [108.202167, 16.054456],
      "accuracy": "6 decimal places (≈0.1 meter)"
    },
    "original_cadastral_system": {
      "crs": "EPSG:3405",
      "name": "VN-2000 Zone 48N",
      "description": "Vietnamese national coordinate system",
      "format": "[easting, northing]",
      "projection": "Transverse Mercator",
      "note": "Used in original DWG/shapefile data - must be transformed to WGS84"
    },
    "transformation_pipeline": {
      "from": "EPSG:3405 (VN-2000 Zone 48N)",
      "to": "EPSG:4326 (WGS84)",
      "transformation_name": "VN-2000 to WGS84",
      "accuracy_after_transform": "±0.2-0.5 meters (depends on methodology)",
      "tools": "PROJ.4, GDAL, PostGIS, or similar",
      "note": "Original DWG files use VN-2000, must be transformed before PMTiles creation"
    }
  }
}
```

#### 1.7 Administrative Units (56 Wards/Communes)

```json
{
  "administrative_units": {
    "total_count": 56,
    "unit_codes_sample": [
      {
        "code": "20194",
        "name": "Liên Chiểu",
        "type": "Ward",
        "parcels_count": "~10,000+",
        "area_covered": "~10 km²"
      },
      {
        "code": "20195",
        "name": "Thanh Khê",
        "type": "Ward",
        "parcels_count": "~8,000+"
      },
      {
        "code": "20197",
        "name": "Hải Châu",
        "type": "Ward",
        "parcels_count": "~12,000+"
      },
      {
        "code": "20198",
        "name": "Hòa Vang",
        "type": "District"
      }
    ],
    "all_codes": [
      "20194", "20195", "20197", "20198", "20200", "20203", "20206", "20207", "20209",
      "20212", "20215", "20218", "20221", "20224", "20225", "20227", "20230", "20233",
      "20236", "20239", "20242", "20245", "20246", "20248", "20251", "20254", "20257",
      "20258", "20260", "20263", "20266", "20269", "20272", "20275", "20278", "20281",
      "20284", "20285", "20287", "20290", "20293", "20296", "20299", "20302", "20305",
      "20306", "20308", "20311", "20312", "20314", "20317", "20320", "20323", "20326",
      "20329", "20332"
    ]
  }
}
```

---

### A2. PARCEL DATA HOSTING & DELIVERY

#### 2.1 Current Hosting Architecture

```json
{
  "hosting": {
    "primary": {
      "method": "Local PMTiles file",
      "path": "/public/tiles/danang_parcels_final.pmtiles",
      "protocol": "pmtiles://",
      "serving_from": "Netlify CDN (static file hosting)",
      "latency": "~50-200ms",
      "advantage": "No external dependency, cached at CDN edge"
    },
    "secondary_backup": {
      "method": "Local GeoJSON files",
      "path": "/public/data/parcels/[MaXa].geojson (56 files)",
      "format": "GeoJSON (FeatureCollection)",
      "one_file_per_ward": "Each file contains all parcels for that ward",
      "typical_size_per_file": "~10MB-20MB per ward",
      "total_size": "~600MB+",
      "purpose": "Fallback if PMTiles fails, also used for client-side filtering"
    },
    "external_optional": {
      "mapbox_tileset": {
        "name": "hvduoc.danang_parcels_final",
        "service": "Mapbox Hosting",
        "protocol": "mapbox://",
        "api_key_required": true,
        "cost": "Per-request billing",
        "advantage": "Managed service, automatic optimization"
      }
    }
  }
}
```

#### 2.2 Protocol Registration (Client-Side)

```json
{
  "client_protocol_handling": {
    "maplibre_configuration": {
      "library": "MapLibre GL JS v4.7.1",
      "protocol_registration": {
        "pmtiles": {
          "handler": "PMTiles SDK Protocol",
          "import": "import { Protocol } from 'pmtiles'",
          "initialization": "const protocol = new Protocol(); maplibregl.addProtocol('pmtiles', protocol.tile);",
          "url_format": "pmtiles:///path/to/file.pmtiles",
          "file_path_resolution": "Relative to document root or full URL"
        }
      },
      "source_definition": {
        "type": "vector",
        "url": "pmtiles://public/tiles/danang_parcels_final.pmtiles",
        "source_layer": "parcels"
      }
    }
  }
}
```

---

### A3. GeoJSON BACKUP DATA STRUCTURE

#### 3.1 GeoJSON File Organization

```json
{
  "geojson_backup": {
    "location": "public/data/parcels/",
    "file_naming_convention": "[MaXa].geojson",
    "example_files": [
      "20194.geojson (Liên Chiểu)",
      "20195.geojson (Thanh Khê)",
      "20197.geojson (Hải Châu)",
      "20198.geojson (Hòa Vang)"
    ],
    "file_structure": {
      "type": "FeatureCollection",
      "features": [
        {
          "description": "Array of Feature objects (parcels in this ward)"
        }
      ]
    },
    "total_features": "563,092 parcels distributed across 56 files",
    "usage": "Fallback source + client-side querying + direct downloads"
  },
  "sample_geojson_20194": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [108.11009613498868, 16.14504292906529],
              [108.11017368078831, 16.14497752965008],
              [108.1102906093279, 16.14492196867885],
              "... (complete ring coordinates)"
            ]
          ]
        },
        "properties": {
          "OBJECTID": 908266,
          "MaXa": "20194",
          "SoThuTuThua": 55,
          "SoHieuToBanDo": 1,
          "DienTich": 1078.9,
          "KyHieuMucDichSuDung": "ODT"
        }
      }
    ]
  }
}
```

---

### A4. DATA VALIDATION & STATISTICS

#### 4.1 Data Quality Metrics

```json
{
  "data_quality": {
    "total_parcels": 563092,
    "total_area_m2": "Approximately 12,500-15,000 km²",
    "coordinate_precision": "6 decimal places (WGS84)",
    "geometry_type_distribution": {
      "Polygon": "100% (all parcels are polygons)"
    },
    "completeness": {
      "OBJECTID": "100% coverage",
      "MaXa": "100% coverage (56 unique values)",
      "Coordinates": "100% valid",
      "DienTich": "~99% populated (some = 0)",
      "DiaChi": "~95% populated (some empty or whitespace)",
      "TenChu": "~98% populated"
    },
    "data_issues_observed": [
      {
        "issue": "DiaChi field encoding",
        "description": "Some addresses contain Vietnamese diacritics with encoding issues",
        "impact": "Requires UTF-8 handling in search",
        "solution": "Normalize text during indexing"
      },
      {
        "issue": "Zero-area parcels",
        "count": "~100-500 features",
        "reason": "Possibly data entry errors or special designations",
        "handling": "Filter with DienTich > 0 in queries"
      }
    ]
  }
}
```

---

## PHẦN B — BACKEND CONFIGURATION & API ENDPOINTS

### B1. Netlify Functions

```json
{
  "serverless_functions": {
    "mapbox_proxy": {
      "file": "netlify/functions/mapbox-proxy.js",
      "lines": "~65 lines",
      "purpose": "Secure proxy for Mapbox API calls",
      "endpoints": [
        {
          "route": "/.netlify/functions/mapbox-proxy",
          "method": "POST/GET",
          "params": [
            "mode: 'geocode' | 'reverse' | 'static'",
            "lat, lng: coordinates",
            "query: search string"
          ],
          "response": "JSON with coordinates or reverse results"
        }
      ],
      "security": "API key stored server-side (.env)"
    },
    "pi_verify": {
      "file": "netlify/functions/pi-verify.js",
      "lines": "~200+ lines",
      "purpose": "Pi Network payment verification",
      "endpoints": [
        {
          "route": "/.netlify/functions/pi-verify",
          "method": "POST",
          "body": {
            "txid": "Transaction ID from Pi Network",
            "amount": "Payment amount in Pi",
            "user_id": "Firebase user ID"
          },
          "response": "{ success: boolean, message: string, data: object }"
        }
      ]
    }
  }
}
```

---

## PHẦN C — FRONTEND ARCHITECTURE

### C1. Map Initialization Code

```json
{
  "frontend_map_config": {
    "library": "MapLibre GL JS v4.7.1",
    "entry_point": "src/main.js",
    "map_module": "src/map/MapLibreConfig.js",
    "initialization_params": {
      "container": "map",
      "style": "OpenStreetMap (default)",
      "center": [108.202167, 16.054456],
      "zoom": 13,
      "max_zoom": 20,
      "min_zoom": 10,
      "bounds": {
        "west": 107.818606,
        "south": 15.917977,
        "east": 108.338222,
        "north": 16.215533
      }
    },
    "pmtiles_integration": {
      "url_production": "https://cdn.xemgiadat.com/danang-parcels.pmtiles",
      "url_local_dev": "/tiles/danang_parcels_final.pmtiles",
      "protocol": "pmtiles://",
      "layer_name": "parcels",
      "styling": "Dynamic based on zoom level and land use"
    }
  }
}
```

### C2. Services Architecture

```json
{
  "service_modules": {
    "GeocodingService": {
      "file": "src/services/GeocodingService.js",
      "functions": [
        {
          "name": "geocode(address: string)",
          "input": "Address string in Vietnamese",
          "output": { "lat": "number", "lng": "number", "formatted": "string" },
          "source": "Mapbox Geocoding API via proxy"
        },
        {
          "name": "reverseGeocode(lat, lng)",
          "input": "Latitude, Longitude",
          "output": "Address string",
          "source": "Mapbox Reverse Geocoding"
        }
      ]
    },
    "ParcelQueryService": {
      "file": "src/services/ParcelQueryService.js",
      "functions": [
        {
          "name": "getParcelById(OBJECTID)",
          "input": "Parcel OBJECTID",
          "output": "Complete parcel object with geometry + properties"
        },
        {
          "name": "searchByAddress(query)",
          "input": "Search query string",
          "output": "Array of matching parcels",
          "implementation": "Full-text search on DiaChi field"
        },
        {
          "name": "getParcelsByWard(MaXa)",
          "input": "Administrative code (e.g., '20194')",
          "output": "All parcels in that ward",
          "data_source": "GeoJSON or PMTiles"
        }
      ]
    }
  }
}
```

---

## PHẦN D — FIREBASE INTEGRATION

### D1. Firestore Database Schema

```json
{
  "firestore_structure": {
    "collections": {
      "users": {
        "documents": "uid (Firebase UID)",
        "fields": {
          "email": "string",
          "name": "string",
          "avatar_url": "string",
          "created_at": "timestamp",
          "pi_network_id": "string (optional)"
        }
      },
      "listings": {
        "documents": "Auto-generated ID",
        "fields": {
          "parcel_objectid": "number (FK to parcels)",
          "user_uid": "string (FK to users)",
          "title": "string",
          "description": "string",
          "price": "number (in VND or Pi)",
          "currency": "VND | PI",
          "status": "ACTIVE | SOLD | WITHDRAWN",
          "created_at": "timestamp",
          "updated_at": "timestamp",
          "images": "array<string> (Firebase Storage URLs)"
        }
      },
      "transactions": {
        "documents": "Auto-generated ID",
        "fields": {
          "from_uid": "string",
          "to_uid": "string",
          "listing_id": "string",
          "amount": "number",
          "currency": "VND | PI",
          "pi_txid": "string (Pi Network transaction ID)",
          "status": "PENDING | COMPLETED | FAILED",
          "created_at": "timestamp"
        }
      },
      "favorites": {
        "documents": "uid/favorites",
        "fields": {
          "parcel_objectids": "array<number>"
        }
      }
    }
  }
}
```

### D2. Firebase Storage Structure

```json
{
  "firebase_storage": {
    "bucket": "xemgiadat-dfe15.appspot.com",
    "folder_structure": {
      "users/{uid}/avatar": "User profile images",
      "listings/{listing_id}/images": "Property images",
      "documents/{uid}": "User documents (ID, proof of ownership)",
      "exports/{timestamp}": "Periodic data backups"
    }
  }
}
```

---

## PHẦN E — DATA PROCESSING PIPELINE

### E1. Python Data Processing Module

```json
{
  "data_processing": {
    "module": "data-processing-module/",
    "language": "Python 3.x",
    "main_package": "xemgiadat_processors",
    "capabilities": [
      "DWG/DXF file parsing",
      "Coordinate transformation (VN-2000 → WGS84)",
      "GeoJSON generation",
      "PMTiles generation (via Tippecanoe)",
      "Data validation & cleaning",
      "Batch geocoding"
    ],
    "key_modules": {
      "processors": "Raw data parsing (DWG, CAD files)",
      "transformers": "Coordinate & format transformation",
      "harmonizers": "Data standardization & merging",
      "exporters": "PMTiles, GeoJSON, Shapefile outputs"
    },
    "workflow": {
      "step1": "Read DWG/shapefile (VN-2000 coordinates)",
      "step2": "Validate geometry & attributes",
      "step3": "Transform coordinates to WGS84",
      "step4": "Generate GeoJSON per ward",
      "step5": "Create PMTiles with Tippecanoe",
      "step6": "Validate output & statistics",
      "step7": "Deploy to CDN/storage"
    }
  }
}
```

---

## PHẦN F — DEPLOYMENT & CDN

### F1. Netlify Deployment Config

```toml
# netlify.toml (Key sections)

[build]
publish = "public"
functions = "netlify/functions"

[[redirects]]
from = "/api/*"
to = "/.netlify/functions/:splat"
status = 200

[[headers]]
for = "/*"
Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
for = "/*.html"
Cache-Control = "public, max-age=0, must-revalidate"
```

### F2. File Serving

```json
{
  "cdn_serving": {
    "pmtiles_files": {
      "url": "https://xemgiadat.com/tiles/danang_parcels_final.pmtiles",
      "cached": true,
      "compression": "brotli/gzip",
      "cdn_edge": "Netlify Global CDN"
    },
    "geojson_files": {
      "url": "https://xemgiadat.com/data/parcels/[MaXa].geojson",
      "cached": true,
      "usage": "On-demand fallback"
    }
  }
}
```

---

## PHẦN G — RECOMMENDED ARCHITECTURE IMPROVEMENTS

### G1. Immediate (Current Pain Points)

```json
{
  "improvements": {
    "issue_1_pmtiles_size": {
      "current": "50MB+ file size causes slow initial load",
      "recommendation": "Implement zoom-level based splitting",
      "action": "Generate separate PMTiles for zoom 10-12 (low-res overview) vs 13-14 (detail)"
    },
    "issue_2_search_performance": {
      "current": "Client-side search on 563K parcels is slow",
      "recommendation": "Implement server-side search index",
      "action": "Setup Elasticsearch or MeiliSearch for full-text search"
    },
    "issue_3_coordinate_transformation": {
      "current": "Manual transformation process is error-prone",
      "recommendation": "Automate with PROJ.4 pipeline",
      "action": "Integrate PostGIS or GDAL into data processing"
    }
  }
}
```

### G2. Architecture Recommendations

```json
{
  "recommended_stack": {
    "data_layer": "PostgreSQL + PostGIS (spatial queries)",
    "cache_layer": "Redis (parcel metadata cache)",
    "search_layer": "Elasticsearch (full-text address search)",
    "api_layer": "GraphQL (flexible queries) + REST (backward compat)",
    "map_layer": "MapLibre GL JS (current) + PMTiles (current)",
    "auth_layer": "Firebase Auth (current) + OAuth2 (for scaling)"
  }
}
```

---

## APPENDIX: QUICK REFERENCE

### Data Dictionary
```
MaXa        = Administrative Ward Code (UNIQUE for each ward)
SoThuTuThua = Sequential Parcel Number (unique within ward)
OBJECTID    = Global unique identifier
DiaChi      = Street address
DienTich    = Area in square meters
KyHieuMucDichSuDung = Land use classification code
TenChu      = Owner/holder name
```

### Land Use Codes (Sample)
```
ODT  = Đất ở (Residential land)
DGT  = Đất công nghiệp (Industrial)
BCS  = Bãi chứa, chế biến (Storage/processing)
CAN  = Công an (Police/Security)
CQP  = Cơ quan quân phòng (Military)
DKV  = Đất khai thác kinh doanh (Commercial exploitation)
```

### Geographic Coverage
```
Bounding Box (WGS84):
  West:  107.818606°
  East:  108.338222°
  South: 15.917977°
  North: 16.215533°
  
Center: 108.248291°, 16.014136°
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-18  
**Classification:** Technical - Engineering Review
