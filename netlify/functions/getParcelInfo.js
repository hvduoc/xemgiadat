exports.handler = async (event) => {
  const soTo = event.queryStringParameters.soTo;
  const soThua = event.queryStringParameters.soThua;

  if (!soTo || !soThua) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Thiếu tham số soTo hoặc soThua" }),
    };
  }

  const whereClause = `"Số hiệu tờ bản đồ" = ${soTo} AND "Số thửa" = ${soThua}`;
  const queryUrl = `https://gisportal.danang.gov.vn/server/rest/services/DiaChinh/DaNangLand_DiaChinh/MapServer/0/query`;

  const params = new URLSearchParams({
    where: whereClause,
    returnGeometry: "true",
    outFields: "*",
    outSR: "4326",
    f: "json",
  });

  try {
    const response = await fetch(`${queryUrl}?${params.toString()}`);
    const json = await response.json();
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(json),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Fetch thất bại", details: err.message }),
    };
  }
};
