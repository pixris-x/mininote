function normalizeShareMaxVisits(rawMaxVisits) {
  if (rawMaxVisits === undefined || rawMaxVisits === null || rawMaxVisits === '') {
    return { value: null }
  }

  const maxVisits = Number(rawMaxVisits)
  if (!Number.isInteger(maxVisits)) {
    return { error: '访问次数必须是整数' }
  }

  // 0 视为不限次数
  if (maxVisits === 0) {
    return { value: null }
  }

  if (maxVisits < 0) {
    return { error: '访问次数不能小于 0' }
  }

  if (maxVisits > 1000000) {
    return { error: '访问次数过大，请设置更合理的值' }
  }

  return { value: maxVisits }
}

function isShareExpired(shareExpiresAt) {
  return Boolean(shareExpiresAt && new Date(shareExpiresAt) < new Date())
}

function isShareLimitReached(shareMaxVisits, shareVisitCount) {
  if (shareMaxVisits === null || shareMaxVisits === undefined) return false
  const maxVisits = Number(shareMaxVisits)
  const visitCount = Number(shareVisitCount || 0)
  if (!Number.isFinite(maxVisits)) return false
  return visitCount >= maxVisits
}

function getShareUnavailableResponse(plan) {
  if (isShareExpired(plan.share_expires_at)) {
    return {
      status: 410,
      body: { success: false, message: '分享链接已过期', expired: true }
    }
  }

  if (isShareLimitReached(plan.share_max_visits, plan.share_visit_count)) {
    return {
      status: 410,
      body: { success: false, message: '分享链接访问次数已达上限', exhausted: true }
    }
  }

  return null
}

async function consumeShareVisit(db, planId) {
  const result = await db.query(
    `UPDATE plans
     SET share_visit_count = share_visit_count + 1,
         share_last_visited_at = NOW()
     WHERE id = $1
       AND (share_max_visits IS NULL OR share_visit_count < share_max_visits)
     RETURNING share_visit_count, share_max_visits, share_last_visited_at`,
    [planId]
  )

  return result.rows[0] || null
}

module.exports = {
  normalizeShareMaxVisits,
  getShareUnavailableResponse,
  consumeShareVisit
}
