const test = require('node:test')
const assert = require('node:assert/strict')
const {
  parseNotesListOptions,
  buildNotesWhereClause,
  buildNotesListMeta
} = require('../utils/notes-list-query')

test('parseNotesListOptions: 未传分页参数时不分页，使用默认值', () => {
  const result = parseNotesListOptions({})
  assert.equal(result.hasPagination, false)
  assert.equal(result.pageNum, 1)
  assert.equal(result.limitNum, 20)
  assert.equal(result.offset, 0)
})

test('parseNotesListOptions: 传入非法参数时自动兜底', () => {
  const result = parseNotesListOptions({ page: '-9', limit: '0' })
  assert.equal(result.hasPagination, true)
  assert.equal(result.pageNum, 1)
  assert.equal(result.limitNum, 20)
  assert.equal(result.offset, 0)
})

test('parseNotesListOptions: limit 超过上限时裁剪到 100', () => {
  const result = parseNotesListOptions({ page: '3', limit: '999' })
  assert.equal(result.pageNum, 3)
  assert.equal(result.limitNum, 100)
  assert.equal(result.offset, 200)
})

test('buildNotesWhereClause: 默认只查未归档', () => {
  const { whereClause, params, paramIdx } = buildNotesWhereClause({})
  assert.match(whereClause, /is_archived = FALSE/)
  assert.equal(params.length, 0)
  assert.equal(paramIdx, 2)
})

test('buildNotesWhereClause: archived + pinned + search + tag 组合', () => {
  const { whereClause, params, paramIdx } = buildNotesWhereClause({
    archived: 'true',
    pinned: 'true',
    search: '  会议纪要  ',
    tag: '工作'
  })

  assert.match(whereClause, /is_archived = TRUE/)
  assert.match(whereClause, /is_pinned = TRUE/)
  assert.match(whereClause, /\(title ILIKE \$2 OR content ILIKE \$2\)/)
  assert.match(whereClause, /\$3 = ANY\(tags\)/)
  assert.deepEqual(params, ['%会议纪要%', '工作'])
  assert.equal(paramIdx, 4)
})

test('buildNotesListMeta: 正常计算分页信息', () => {
  const meta = buildNotesListMeta('51', 2, 20)
  assert.deepEqual(meta, {
    total: 51,
    page: 2,
    limit: 20,
    pages: 3
  })
})

test('buildNotesListMeta: 零数据时 pages 仍为 1', () => {
  const meta = buildNotesListMeta(0, 1, 20)
  assert.deepEqual(meta, {
    total: 0,
    page: 1,
    limit: 20,
    pages: 1
  })
})
