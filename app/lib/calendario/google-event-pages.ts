type GoogleEventRow = {
  id?: string; summary?: string; status?: string; hangoutLink?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
}

/** Calendar can return fewer than maxResults even when another page exists. */
export async function fetchCalendarPages(url: URL, request: (url: URL) => Promise<Response>) {
  const items: GoogleEventRow[] = []
  const seenPages = new Set<string>()
  try {
    for (let page = 0; page < 20; page++) {
      const res = await request(new URL(url))
      if (!res.ok) return { items, complete: false }
      const data = await res.json()
      items.push(...(data.items ?? []))
      if (!data.nextPageToken) return { items, complete: true }
      if (seenPages.has(data.nextPageToken)) break
      seenPages.add(data.nextPageToken)
      url.searchParams.set('pageToken', data.nextPageToken)
    }
  } catch { /* Keep partial results and report failure to the view. */ }
  return { items, complete: false }
}
