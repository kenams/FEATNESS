export function getKioskSiteUrl(): string {
  return process.env.NEXT_PUBLIC_KIOSK_SITE_URL?.trim() || "";
}

export function getExpectedKioskId(): string {
  return process.env.NEXT_PUBLIC_KIOSK_ID?.trim() || "";
}

export function hasServiceRoleAuthorization(request: Request): boolean {
  const authorization = request.headers.get("authorization")?.trim() || "";
  const expectedSecret = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

  return Boolean(expectedSecret) && authorization === `Bearer ${expectedSecret}`;
}

export function isSameOriginKioskRequest(request: Request): boolean {
  const kioskSiteUrl = getKioskSiteUrl();
  const origin = request.headers.get("origin")?.trim() || "";
  const referer = request.headers.get("referer")?.trim() || "";

  if (!kioskSiteUrl) {
    return false;
  }

  return origin.startsWith(kioskSiteUrl) || referer.startsWith(kioskSiteUrl);
}

export function isAuthorizedKioskRequest(
  request: Request,
  kioskId?: string | null,
): boolean {
  if (hasServiceRoleAuthorization(request)) {
    return true;
  }

  const expectedKioskId = getExpectedKioskId();

  if (!kioskId || !expectedKioskId || kioskId !== expectedKioskId) {
    return false;
  }

  return isSameOriginKioskRequest(request);
}
