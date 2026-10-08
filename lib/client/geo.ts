/** One-off position, resolving null on denial / timeout (location is a soft signal, never a gate). */
export function getPositionOnce(timeoutMs = 6000): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}

/** Position only if the browser already has permission — never triggers a prompt. */
export async function getPositionIfGranted(): Promise<{ lat: number; lng: number } | null> {
  try {
    const status = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
    if (status?.state !== "granted") return null;
  } catch {
    return null;
  }
  return getPositionOnce(3000);
}
