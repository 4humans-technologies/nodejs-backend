const fetch = require('node-fetch');

/**
 * 
 * @param {String} base 
 * @returns 
 */
exports.getExchangeRate = async (base, currency) =>{
    const response = await (await fetch(process.env.EXCHANGE_RATE_URL + base)).json();
    return response.rates[currency];
}