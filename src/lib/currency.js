// Currency formatting utilities

/**
 * Format amount in PKR (Pakistani Rupees)
 * @param {number|string} amount - Amount to format
 * @param {boolean} showDecimals - Whether to show decimal places
 * @returns {string} - Formatted currency string
 */
export function formatPKR(amount, showDecimals = true) {
  const numAmount = parseFloat(amount) || 0
  
  if (showDecimals) {
    return `Rs ${numAmount.toLocaleString('en-PK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }
  
  return `Rs ${Math.round(numAmount).toLocaleString('en-PK')}`
}

/**
 * Currency symbol for PKR
 */
export const CURRENCY_SYMBOL = 'Rs'

/**
 * Currency code
 */
export const CURRENCY_CODE = 'PKR'

export default {
  formatPKR,
  CURRENCY_SYMBOL,
  CURRENCY_CODE,
}







