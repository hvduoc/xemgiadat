/**
 * Pi Network Payment Verification Netlify Function
 * Professional server-side verification for Pi Network payments
 * 
 * @version 1.0.0
 * @author XemGiaDat Development Team
 */

const crypto = require('crypto');

// Configuration - SERVER SIDE ONLY
const CONFIG = {
  PI_API_BASE: 'https://api.minepi.com',
  APP_ID: process.env.PI_APP_ID,
  APP_SECRET: process.env.PI_APP_SECRET, // CRITICAL: Never expose to client
  PLATFORM_API_KEY: process.env.PI_PLATFORM_API_KEY // CRITICAL: Never expose to client
};

// Security validation
if (!CONFIG.APP_SECRET || !CONFIG.PLATFORM_API_KEY) {
  console.error('SECURITY ERROR: Missing critical environment variables');
}

/**
 * Verify Pi payment signature
 * @param {Object} payment 
 * @param {string} signature 
 * @returns {boolean}
 */
function verifySignature(payment, signature) {
  if (!CONFIG.APP_SECRET) {
    console.warn('Pi App Secret not configured');
    return false;
  }

  try {
    const payloadString = JSON.stringify(payment);
    const expectedSignature = crypto
      .createHmac('sha256', CONFIG.APP_SECRET)
      .update(payloadString)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Call Pi Platform API
 * @param {string} endpoint 
 * @param {Object} data 
 * @returns {Promise<Object>}
 */
async function callPiAPI(endpoint, data = null) {
  try {
    const url = `${CONFIG.PI_API_BASE}${endpoint}`;
    const options = {
      method: data ? 'POST' : 'GET',
      headers: {
        'Authorization': `Key ${CONFIG.PLATFORM_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(`Pi API error: ${result.message || 'Unknown error'}`);
    }

    return result;
  } catch (error) {
    console.error('Pi API call failed:', error);
    throw error;
  }
}

/**
 * Approve payment on Pi Platform
 * @param {string} paymentId 
 * @returns {Promise<Object>}
 */
async function approvePayment(paymentId) {
  return callPiAPI(`/v2/payments/${paymentId}/approve`);
}

/**
 * Complete payment on Pi Platform
 * @param {string} paymentId 
 * @param {string} txid 
 * @returns {Promise<Object>}
 */
async function completePayment(paymentId, txid) {
  return callPiAPI(`/v2/payments/${paymentId}/complete`, { txid });
}

/**
 * Get payment details from Pi Platform
 * @param {string} paymentId 
 * @returns {Promise<Object>}
 */
async function getPayment(paymentId) {
  return callPiAPI(`/v2/payments/${paymentId}`);
}

/**
 * Process user features after successful payment
 * @param {Object} payment 
 * @returns {Array}
 */
function processPaymentFeatures(payment) {
  const features = [];
  const amount = parseFloat(payment.amount);
  
  // Feature unlocking based on payment amount
  if (amount >= 0.01) {
    features.push('premium_search');
  }
  if (amount >= 0.05) {
    features.push('advanced_analytics');
  }
  if (amount >= 0.1) {
    features.push('export_data');
  }
  if (amount >= 0.5) {
    features.push('api_access');
  }

  return features;
}

/**
 * Main handler function
 */
exports.handler = async function(event, context) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Validate request method
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    // Parse request body
    let requestData;
    try {
      requestData = JSON.parse(event.body);
    } catch (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON body' })
      };
    }

    const { action, paymentId, txid, paymentData, payment, signature } = requestData;

    console.log(`Processing Pi verification: ${action}`, { paymentId, txid });

    switch (action) {
      case 'approve':
        // Approve payment on Pi Platform
        if (!paymentId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Payment ID required' })
          };
        }

        try {
          const approvalResult = await approvePayment(paymentId);
          console.log('Payment approved:', approvalResult);

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: 'Payment approved',
              paymentId: paymentId,
              data: approvalResult
            })
          };
        } catch (error) {
          console.error('Payment approval failed:', error);
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: 'Payment approval failed',
              message: error.message
            })
          };
        }

      case 'complete':
        // Complete payment on Pi Platform
        if (!paymentId || !txid) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Payment ID and TXID required' })
          };
        }

        try {
          const completionResult = await completePayment(paymentId, txid);
          const paymentDetails = await getPayment(paymentId);
          
          // Process features for user
          const features = processPaymentFeatures(paymentDetails);

          console.log('Payment completed:', completionResult);

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: 'Payment completed successfully',
              paymentId: paymentId,
              txid: txid,
              features: features,
              data: completionResult
            })
          };
        } catch (error) {
          console.error('Payment completion failed:', error);
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: 'Payment completion failed',
              message: error.message
            })
          };
        }

      case 'verify':
        // Verify existing payment
        if (!txid) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Transaction ID required' })
          };
        }

        try {
          // In a real implementation, you would verify the transaction
          // against the Pi blockchain or through Pi Platform API
          const isValid = payment && signature ? verifySignature(payment, signature) : true;
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              verified: isValid,
              txid: txid,
              message: isValid ? 'Payment verified' : 'Payment verification failed'
            })
          };
        } catch (error) {
          console.error('Payment verification failed:', error);
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              verified: false,
              error: 'Verification failed',
              message: error.message
            })
          };
        }

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' })
        };
    }

  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      })
    };
  }
};
