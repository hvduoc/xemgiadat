// netlify/functions/proxy.js
const fetch = require('node-fetch');

exports.handler = async function(event) {
  try {
    // Lấy phần URL sau "/proxy" để nối vào domain gốc
    const proxiedPath = event.rawUrl.split("/proxy")[1];
    const targetUrl = `https://gisportal.danang.gov.vn${proxiedPath}`;

    // Gửi yêu cầu đến máy chủ gốc
    const response = await fetch(targetUrl);
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
