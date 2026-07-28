const FORGE_DEFAULT_BASE_URL = "https://forge-gateway-api.fly.dev/v1"
const OMNIROUTE_DEFAULT_BASE_URL = "http://localhost:20128/v1"

function normalizeBaseUrl(url) {
  return url.replace(/\/+$/, "")
}

export function isOmniRouteConfigured() {
  return Boolean(
    process.env.OMNIROUTE_BASE_URL ||
      process.env.OMNIROUTE_HOSTPORT ||
      process.env.OMNIROUTE_API_KEY ||
      process.env.OMNIROUTE_MODEL
  )
}

export function getOmniRouteBaseUrl() {
  if (process.env.OMNIROUTE_BASE_URL) {
    return normalizeBaseUrl(process.env.OMNIROUTE_BASE_URL)
  }

  if (process.env.OMNIROUTE_HOSTPORT) {
    return normalizeBaseUrl(`http://${process.env.OMNIROUTE_HOSTPORT}/v1`)
  }

  return OMNIROUTE_DEFAULT_BASE_URL
}

export function getForgeBaseUrl() {
  return normalizeBaseUrl(process.env.FORGE_BASE_URL || FORGE_DEFAULT_BASE_URL)
}
