function parseNotesListOptions(query = {}) {
  const pageRaw = query.page
  const limitRaw = query.limit

  const hasPagination = pageRaw !== undefined || limitRaw !== undefined
  const pageNum = Math.max(1, parseInt(pageRaw, 10) || 1)
  const limitNum = Math.min(100, Math.max(1, parseInt(limitRaw, 10) || 20))
  const offset = (pageNum - 1) * limitNum

  return {
    hasPagination,
    pageNum,
    limitNum,
    offset
  }
}

function buildNotesWhereClause(query = {}) {
  let whereClause = `
      WHERE user_id = $1
    `
  const params = []
  let paramIdx = 2

  if (query.archived === 'true') {
    whereClause += ' AND is_archived = TRUE'
  } else {
    whereClause += ' AND is_archived = FALSE'
  }

  if (query.pinned === 'true') {
    whereClause += ' AND is_pinned = TRUE'
  }

  if (query.search?.trim()) {
    whereClause += ` AND (title ILIKE $${paramIdx} OR content ILIKE $${paramIdx})`
    params.push(`%${query.search.trim()}%`)
    paramIdx++
  }

  if (query.tag) {
    whereClause += ` AND $${paramIdx} = ANY(tags)`
    params.push(query.tag)
    paramIdx++
  }

  return {
    whereClause,
    params,
    paramIdx
  }
}

function buildNotesListMeta(total, pageNum, limitNum) {
  const safeTotal = Number(total) || 0
  const safeLimit = Math.max(1, Number(limitNum) || 1)
  const pages = Math.max(1, Math.ceil(safeTotal / safeLimit))

  return {
    total: safeTotal,
    page: Number(pageNum) || 1,
    limit: safeLimit,
    pages
  }
}

module.exports = {
  parseNotesListOptions,
  buildNotesWhereClause,
  buildNotesListMeta
}
