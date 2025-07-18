// netlify/functions/proxy.js
const fetch = require('node-fetch');

exports.handler = async function(event) {
  try {
    // Lấy phần URL sau "/proxy" để nối vào domain gốc    
    const path = event.path.replace("/.netlify/functions/proxy", "");
    const targetUrl = `https://gisportal.danang.gov.vn${path}${event.rawQuery ? `?${event.rawQuery}` : ''}`;


    // Gửi yêu cầu đến máy chủ gốc
    const response = await fetch(targetUrl);
    if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ Response error from target server:", errorText);
    return {
        statusCode: response.status,
        body: JSON.stringify({ message: "Upstream error", error: errorText })
    };
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const arrayBuffer = await response.arrayBuffer();

    return {
      statusCode: response.status,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*"
      },
      body: Buffer.from(arrayBuffer).toString("base64"),
      isBase64Encoded: true
    };
  } catch (err) {
    console.error("Proxy error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Proxy failed", error: err.message })
    };
  }
};
