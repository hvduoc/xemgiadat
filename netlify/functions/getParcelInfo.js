const fetch = require('node-fetch');

exports.handler = async (event) => {
  const soTo = event.queryStringParameters.soTo;
  const soThua = event.queryStringParameters.soThua;

  if (!soTo || !soThua) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Thiếu tham số soTo hoặc soThua" })
    };
  }

  const whereClause = `"Số hiệu tờ bản đồ" = ${soTo} AND "Số thửa" = ${soThua}`;
  const baseUrl = `https://gisportal.danang.gov.vn/server/rest/services/DiaChinh/DaNangLand_DiaChinh/MapServer/0/query`;

  const params = new URLSearchParams({
    returnGeometry: "true",
    where: whereClause,
    outSR: "4326",
    outFields: "*",
    f: "json"
  });

  try {
    const response = await fetch(`${baseUrl}?${params.toString()}`);
    const data = await response.json();

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Lỗi gọi MapServer", details: error.message })
    };
  }
};
