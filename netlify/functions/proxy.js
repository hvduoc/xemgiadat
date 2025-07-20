// Đường dẫn file: netlify/functions/proxy.js

// Dùng node-fetch để gọi API từ server
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    // URL gốc của máy chủ Sở TNMT
    const GIS_URL = "https://gisportal.danang.gov.vn/server/rest/services/DiaChinh/DaNangLand_DiaChinh/MapServer";

    // Lấy phần đuôi của URL mà client yêu cầu
    // Dựa trên rule của bạn, chúng ta sẽ thay thế '/proxy/'
    // Ví dụ: nếu client gọi '/proxy/export?bbox=...' thì `path` sẽ là 'export?bbox=...'
    const path = event.path.replace('/proxy/', '');
    
    // Ghép lại để có URL đầy đủ tới máy chủ GIS
    const fullUrl = `${GIS_URL}/${path}`;

    try {
        const response = await fetch(fullUrl, {
            headers: {
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0"
            }
        });

        // Lấy dữ liệu dưới dạng text để đảm bảo không làm thay đổi định dạng gốc (JSON hoặc image)
        const data = await response.text(); 

        return {
            statusCode: 200,
            headers: {
                // Quan trọng: Cho phép mọi tên miền truy cập vào proxy của BẠN
                "Access-Control-Allow-Origin": "*",
                "Content-Type": response.headers.get('content-type') || 'application/json',
            },
            body: data,
        };
    } catch (error) {
        console.error("Proxy Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch GIS data via proxy' }),
        };
    }
};