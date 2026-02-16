// Simple gateway detection helpers used by multi-gateway logic

export const GatewayType = {
  STRIPE: "stripe",
  PAYPAL: "paypal",
  BRAINTREE: "braintree",
  ADYEN: "adyen",
  SQUARE: "square",
  CHECKOUT: "checkout",
  UNKNOWN: "unknown",
};

export function detectGatewayFromLocation() {
  const host = (window.location.hostname || "").toLowerCase();
  const path = (window.location.pathname || "").toLowerCase();

  if (host.includes("stripe.com")) return GatewayType.STRIPE;
  if (host.includes("paypal.com") || host.includes("braintreepayments.com"))
    return GatewayType.PAYPAL;
  if (host.includes("braintreegateway.com")) return GatewayType.BRAINTREE;
  if (host.includes("adyen.com")) return GatewayType.ADYEN;
  if (host.includes("squareup.com")) return GatewayType.SQUARE;
  if (host.includes("checkout.com")) return GatewayType.CHECKOUT;

  // Heuristic: generic "checkout" or "payment" paths
  if (/checkout|payment/.test(path)) {
    // Prefer Stripe if host hints at it
    if (/stripe/.test(host)) return GatewayType.STRIPE;
  }

  return GatewayType.UNKNOWN;
}

export function isStripe() {
  return detectGatewayFromLocation() === GatewayType.STRIPE;
}

