/**
 * Utility for formatting prices into Denmark Currency (DKK / kr.)
 *
 * Danish retail conventions:
 * - Symbol / suffix: "kr."
 * - Thousands separator: period (.) as per da-DK locale (e.g. 1.399 kr.)
 * - Whole numbers without decimal øre, matching real Danish sneaker stores (Nike Denmark, Unisport, Zalando.dk)
 * - Converts base USD catalog prices to authentic Danish Krone retail values (~7.0 DKK per USD)
 */

export function formatPriceDKK(price) {
  if (price === undefined || price === null || isNaN(price)) {
    return '0 kr.';
  }
  
  const num = Number(price);
  // Scale USD base price to realistic DKK retail value
  const dkkAmount = Math.round(num * 7);
  return `${dkkAmount.toLocaleString('da-DK')} kr.`;
}

export default formatPriceDKK;
