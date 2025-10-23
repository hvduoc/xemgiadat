const fetch = require('node-fetch');

// Simple Mapbox proxy for Netlify Functions.
// - Expects MAPBOX_TOKEN in environment variables (set in Netlify dashboard).
// - Supports mode=geocode (query or lat/lng), mode=tilequery (lat,lng) and mode=tiles (z,x,y)
// - Restricts by Origin header to the production domain; allow localhost for local dev.

exports.handler = async (event) => {
  const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;
  if (!MAPBOX_TOKEN) return { statusCode: 500, body: 'MAPBOX_TOKEN not configured' };

  const origin = (event.headers.origin || event.headers.referer || '').toLowerCase();
  const allowedOrigins = [
    'https://xemgiadat.com',
    'https://www.xemgiadat.com',
    'http://localhost',
    'http://localhost:8888',
    'http://127.0.0.1'
  ];

  // Allow local development when NETLIFY_DEV=true
  const isDev = process.env.NETLIFY_DEV === 'true';
  if (!isDev && origin && !allowedOrigins.some(o => origin.startsWith(o))) {
    return { statusCode: 403, body: 'Forbidden' };
  }

  const qs = event.queryStringParameters || {};
  const mode = qs.mode;

  try {
    if (mode === 'geocode') {
      // Either reverse by lat/lng or forward by query
      if (qs.lat && qs.lng) {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(qs.lng)},${encodeURIComponent(qs.lat)}.json?language=vi&access_token=${MAPBOX_TOKEN}`;
        const resp = await fetch(url);
        const text = await resp.text();
        return { statusCode: resp.status, headers: { 'Content-Type': 'application/json' }, body: text };
      }
      if (qs.query) {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(qs.query)}.json?language=vi&autocomplete=${qs.autocomplete||'true'}&access_token=${MAPBOX_TOKEN}`;
        const resp = await fetch(url);
        const text = await resp.text();
        return { statusCode: resp.status, headers: { 'Content-Type': 'application/json' }, body: text };
      }
      return { statusCode: 400, body: 'Missing geocode parameters' };
    }

    if (mode === 'tilequery') {
      const { lat, lng, limit } = qs;
      if (!lat || !lng) return { statusCode: 400, body: 'Missing lat/lng' };
      // tileset hardcoded for now to your public tileset
      const tileset = 'hvduoc.danang_parcels_final';
      const url = `https://api.mapbox.com/v4/${tileset}/tilequery/${encodeURIComponent(lng)},${encodeURIComponent(lat)}.json?limit=${limit||1}&access_token=${MAPBOX_TOKEN}`;
      const resp = await fetch(url);
      const text = await resp.text();
      return { statusCode: resp.status, headers: { 'Content-Type': 'application/json' }, body: text };
    }

    if (mode === 'tiles') {
      const { z, x, y } = qs;
      if (z == null || x == null || y == null) return { statusCode: 400, body: 'Missing z/x/y' };
      const tileset = 'hvduoc.danang_parcels_final';
      const url = `https://api.mapbox.com/v4/${tileset}/${z}/${x}/${y}.mvt?access_token=${MAPBOX_TOKEN}`;
      const resp = await fetch(url);
      const arrayBuffer = await resp.arrayBuffer();
      const body = Buffer.from(arrayBuffer).toString('base64');
      const contentType = resp.headers.get('content-type') || 'application/vnd.mapbox-vector-tile';
      return { statusCode: 200, isBase64Encoded: true, headers: { 'Content-Type': contentType }, body };
    }

    if (mode === 'static') {
      // Return a static map image for OG usage proxied through server
      const { lat, lng, width, height, zoom } = qs;
      const w = Math.min(1280, parseInt(width) || 800);
      const h = Math.min(1280, parseInt(height) || 600);
      const z = parseInt(zoom) || 18;
      if (!lat || !lng) return { statusCode: 400, body: 'Missing lat/lng' };
      const style = 'mapbox/streets-v11';
      const url = `https://api.mapbox.com/styles/v1/${style}/static/pin-s+ff0000(${encodeURIComponent(lng)},${encodeURIComponent(lat)})/${encodeURIComponent(lng)},${encodeURIComponent(lat)},${z}/${w}x${h}?access_token=${MAPBOX_TOKEN}`;
      const resp = await fetch(url);
      const arrayBuffer = await resp.arrayBuffer();
      const body = Buffer.from(arrayBuffer).toString('base64');
      const contentType = resp.headers.get('content-type') || 'image/png';
      return { statusCode: 200, isBase64Encoded: true, headers: { 'Content-Type': contentType }, body };
    }

    return { statusCode: 400, body: 'Unknown mode' };
  } catch (err) {
    return { statusCode: 500, body: 'Proxy error: ' + (err && err.message || String(err)) };
  }
};
