export async function fetchBCVRate(): Promise<number> {
  try {
    const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
      next: { revalidate: 3600 } // Cache 1 hour
    });
    if (!res.ok) throw new Error('Failed to fetch BCV rate');
    const data = await res.json();
    return data.promedio ?? 0;
  } catch (error) {
    console.error('Error fetching BCV:', error);
    return 0;
  }
}
