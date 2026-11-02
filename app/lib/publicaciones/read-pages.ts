/** Complete the listing before applying its client-side brand/date filters. */
export async function readPublicationPages<T extends { id: string }>(
  readPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows = new Map<string, T>()
  const pageSize = 500
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await readPage(from, from + pageSize - 1)
    if (error) throw error
    if (!data) throw new Error('No se pudieron cargar las publicaciones.')
    for (const row of data) rows.set(row.id, row)
    if (data.length < pageSize) return [...rows.values()]
  }
}
