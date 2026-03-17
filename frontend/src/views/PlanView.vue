<template>
    <AppLayout>
        <div class="plans-page" :class="{ 'mobile-show-detail': mobileShowDetail }">

            <!-- ── 左侧面板：计划列表 ── -->
            <aside class="plans-sidebar">
                <div class="plans-sidebar-header">
                    <h2 class="sidebar-title">🎯 我的计划</h2>
                    <div class="sidebar-header-actions">
                        <button class="btn btn-ghost btn-sm" @click="openShareLookup" title="查看分享行程">🔗</button>
                        <button class="btn btn-primary btn-sm" @click="openPlanModal()">＋ 新建</button>
                    </div>
                </div>

                <!-- 过滤 -->
                <div class="plan-filters">
                    <button v-for="f in planFilters" :key="f.value" class="filter-btn"
                        :class="{ active: activeFilter === f.value }" @click="activeFilter = f.value">{{ f.label
                        }}</button>
                </div>

                <!-- 加载中 -->
                <div v-if="planStore.loading && !planStore.plans.length" class="loading-center">
                    <div class="loading-spinner"></div>
                </div>

                <!-- 空状态 -->
                <div v-else-if="filteredPlans.length === 0" class="plans-empty">
                    <span>📋</span>
                    <p>还没有计划哦～</p>
                </div>

                <!-- 计划卡片列表 -->
                <div v-else class="plan-list">
                    <div v-for="plan in filteredPlans" :key="plan.id" class="plan-card"
                        :data-plan-id="plan.id"
                        :class="{ active: currentPlanId === plan.id }"
                        :style="{ borderLeftColor: plan.color === '#FFFFFF' ? 'var(--theme-primary)' : plan.color }"
                        @click="selectPlan(plan.id)">
                        <div class="plan-card-top">
                            <span class="plan-card-icon">{{ plan.icon }}</span>
                            <div class="plan-card-info">
                                <div class="plan-card-title">
                                    {{ plan.title }}
                                    <span v-if="plan.role === 'collaborator'" class="plan-role-badge">🤝 协作</span>
                                </div>
                                <div class="plan-card-desc">{{ plan.role === 'collaborator' ? `来自 ${plan.owner_name}` : (plan.description || '暂无描述') }}</div>
                            </div>
                            <div class="plan-card-actions">
                                <button class="btn btn-ghost btn-icon-sm" @click.stop="openPlanModal(plan)"
                                    title="编辑">✏️</button>
                                <button v-if="plan.role !== 'collaborator'" class="btn btn-ghost btn-icon-sm" @click.stop="confirmDeletePlan(plan)"
                                    title="删除">🗑️</button>
                                <button v-if="plan.role === 'collaborator'" class="btn btn-ghost btn-icon-sm" @click.stop="leavePlan(plan)"
                                    title="退出协作">🚪</button>
                            </div>
                        </div>
                        <div class="plan-card-bottom">
                            <span class="plan-status-badge" :class="`status-${plan.status}`">
                                {{ statusLabel[plan.status] }}
                            </span>
                            <div class="plan-progress-wrap">
                                <div class="plan-progress-bar">
                                    <div class="plan-progress-fill" :style="{ width: progressPct(plan) + '%' }"></div>
                                </div>
                                <span class="plan-progress-text">{{ plan.done_steps }}/{{ plan.total_steps }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            <!-- ── 右侧面板：时间线 ── -->
            <main class="plans-main" ref="mainRef">
                <!-- 移动端返回按钮 -->
                <button class="mobile-back-btn" @click="goBackToList">← 返回列表</button>

                <!-- 未选择计划 -->
                <div v-if="!currentPlanId" class="timeline-empty">
                    <span class="timeline-empty-icon">🎯</span>
                    <h3>选择一个计划</h3>
                    <p>从左侧选择计划，或新建一个开始你的旅程 🌸</p>
                </div>

                <template v-else>
                    <!-- 计划标题栏 -->
                    <div class="timeline-header">
                        <div class="timeline-header-left">
                            <span class="timeline-plan-icon">{{ planStore.currentPlan?.icon }}</span>
                            <div class="timeline-header-info">
                                <h2 class="timeline-plan-title">{{ planStore.currentPlan?.title }}</h2>
                                <p v-if="planStore.currentPlan?.description" class="timeline-plan-desc">
                                    {{ planStore.currentPlan?.description }}
                                </p>
                            </div>
                        </div>
                        <div class="timeline-header-actions">
                            <button class="btn btn-primary btn-sm" @click="openStepModal()">＋ 添加步骤</button>
                            <button v-if="planStore.currentPlan?.role !== 'collaborator'" class="btn btn-ghost btn-sm" @click="openCollabModal()" title="管理协作者">🤝 协作</button>
                            <button v-if="planStore.currentPlan?.role !== 'collaborator'" class="btn btn-ghost btn-sm" @click="openShareModal()" title="分享计划">🔗 分享</button>
                        </div>
                    </div>

                    <!-- 加载中 -->
                    <div v-if="planStore.loading" class="loading-center">
                        <div class="loading-spinner"></div>
                        <p>加载中...</p>
                    </div>

                    <!-- 空状态 -->
                    <div v-else-if="!planStore.currentPlan?.steps?.length" class="timeline-empty">
                        <span class="timeline-empty-icon">📋</span>
                        <h3>暂无步骤</h3>
                        <p>点击「添加步骤」开始规划你的第一步 ✨</p>
                    </div>

                    <!-- 时间线 -->
                    <div v-else class="timeline" ref="timelineRef">
                        <div v-for="(step, idx) in planStore.currentPlan.steps" :key="step.id" :data-step-id="step.id"
                            class="timeline-item"
                            :class="[`step-${step.status}`, { 'step-flash': flashStepId === step.id }]">
                            <!-- 时间线竖线 + 节点 -->
                            <div class="timeline-line">
                                <div class="timeline-dot" :class="[`dot-${step.status}`, 'dot-clickable']"
                                    :title="step.status === 'completed' ? '点击取消完成' : '点击标记完成'"
                                    @click="quickToggleStep(step)">
                                    {{ stepStatusIcon[step.status] }}
                                </div>
                                <div v-if="idx < planStore.currentPlan.steps.length - 1" class="timeline-connector">
                                </div>
                            </div>

                            <!-- 步骤卡片 -->
                            <div class="timeline-card">
                                <div class="timeline-card-header">
                                    <div class="timeline-card-title-row">
                                        <span class="timeline-step-num">第 {{ idx + 1 }} 步</span>
                                        <!-- 特殊标识 badge -->
                                        <span v-if="step.badge" class="step-badge" :style="badgeStyle(step)">
                                            {{ step.badge }}
                                        </span>
                                    </div>
                                    <div class="timeline-card-actions">
                                        <!-- 上移/下移 -->
                                        <button v-if="idx > 0" class="btn btn-ghost btn-icon-sm"
                                            @click="moveStep(idx, -1)" title="上移">↑</button>
                                        <button v-if="idx < planStore.currentPlan.steps.length - 1"
                                            class="btn btn-ghost btn-icon-sm" @click="moveStep(idx, 1)"
                                            title="下移">↓</button>
                                        <button class="btn btn-ghost btn-icon-sm" @click="openStepModal(step)"
                                            title="编辑">✏️</button>
                                        <button class="btn btn-ghost btn-icon-sm" @click="confirmDeleteStep(step)"
                                            title="删除">🗑️</button>
                                    </div>
                                </div>

                                <h3 class="timeline-card-title">{{ step.title }}</h3>
                                <div v-if="step.description" class="timeline-card-desc-wrap">
                                    <p class="timeline-card-desc"
                                        :class="{ 'is-clamped': isDescLong(step) && !isDescExpanded(step) }">{{
                                            step.description }}</p>
                                    <button v-if="isDescLong(step)" class="desc-toggle-btn"
                                        @click.stop="toggleDesc(step)">
                                        {{ isDescExpanded(step) ? '▲ 收起' : '▼ 展开' }}
                                    </button>
                                </div>

                                <!-- 地图导航按钮 -->
                                <div v-if="step.location" class="step-map-links">
                                    <span class="step-map-label">📍 {{ step.location }}</span>
                                    <div class="step-map-btns">
                                        <a :href="`https://uri.amap.com/search?keyword=${encodeURIComponent(step.location)}&src=mini-note&callnative=1`"
                                            target="_blank" rel="noopener noreferrer" class="map-btn map-btn--amap"
                                            title="高德地图">
                                            <svg viewBox="0 0 24 24" fill="none">
                                                <path
                                                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                                                    fill="currentColor" />
                                            </svg>
                                            高德
                                        </a>
                                        <a :href="`http://api.map.baidu.com/geocoder?address=${encodeURIComponent(step.location)}&output=html&src=mini-note`"
                                            target="_blank" rel="noopener noreferrer" class="map-btn map-btn--baidu"
                                            title="百度地图">
                                            <svg viewBox="0 0 24 24" fill="none">
                                                <path
                                                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                                                    fill="currentColor" />
                                            </svg>
                                            百度
                                        </a>
                                        <a :href="`https://apis.map.qq.com/uri/v1/search?keyword=${encodeURIComponent(step.location)}&referer=mini-note`"
                                            target="_blank" rel="noopener noreferrer" class="map-btn map-btn--tencent"
                                            title="腾讯地图">
                                            <svg viewBox="0 0 24 24" fill="none">
                                                <path
                                                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                                                    fill="currentColor" />
                                            </svg>
                                            腾讯
                                        </a>
                                    </div>
                                </div>

                                <!-- 多图网格 -->
                                <div v-if="stepImgList(step).length" class="step-img-grid"
                                    :class="`grid-${Math.min(3, stepImgList(step).length)}`">
                                    <div v-for="(url, i) in stepImgList(step).slice(0, 3)" :key="i"
                                        class="step-img-cell" @click.stop="openPreview(stepImgList(step), i)">
                                        <img :src="url" alt="" />
                                        <div v-if="i === 2 && stepImgList(step).length > 3" class="img-more-overlay">
                                            +{{ stepImgList(step).length - 3 }}
                                        </div>
                                    </div>
                                </div>

                                <div class="timeline-card-footer">
                                    <!-- 开始日期 -->
                                    <span v-if="step.start_date" class="step-start">
                                        🗓️ {{ formatDate(step.start_date) }}
                                    </span>
                                    <!-- 截止日期 -->
                                    <span v-if="step.due_date" class="step-due" :class="{ overdue: isOverdue(step) }">
                                        📅 {{ formatDate(step.due_date) }}
                                    </span>
                                    <span v-if="step.completed_at" class="step-completed-at">
                                        ✅ {{ formatDate(step.completed_at) }}
                                    </span>

                                    <!-- 状态切换 -->
                                    <div class="step-status-group">
                                        <button v-for="s in stepStatuses" :key="s.value" class="step-status-btn"
                                            :class="{ active: step.status === s.value }" :title="s.label"
                                            @click="changeStepStatus(step, s.value)">{{ s.icon }}</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 全部完成庆祝横幅 -->
                    <div v-if="planStore.currentPlan?.steps?.length > 0 && planStore.currentPlan.steps.filter(s => s.status !== 'skipped').length > 0 && planStore.currentPlan.steps.filter(s => s.status !== 'skipped').every(s => s.status === 'completed')"
                        class="all-done-banner">
                        🎉 所有步骤已完成！超棒！
                    </div>

                    <!-- 时间线末尾添加步骤行 -->
                    <div class="timeline-add-row" @click="openStepModal()">
                        <div class="timeline-add-dot">+</div>
                        <div class="timeline-add-label">添加步骤</div>
                    </div>
                </template>
            </main>

            <!-- 返回顶部按钟 -->
            <Transition name="back-top-fade">
                <button v-if="showBackToTop" class="back-to-top-btn" @click="scrollToTop" title="返回顶部">
                    &#8679;
                </button>
            </Transition>
        </div>

        <!-- ── 图片预览 ── -->
        <div v-if="previewState.show" class="img-preview-overlay" @click="previewState.show = false"
            @touchstart.passive="onPreviewTouchStart" @touchend.passive="onPreviewTouchEnd">
            <img :src="previewState.imgs[previewState.index]" class="img-preview" @click.stop />
            <div v-if="previewState.index > 0" class="preview-zone preview-zone--prev"
                @click.stop="previewState.index--">
                <span class="preview-zone-arrow">❮</span>
            </div>
            <div v-if="previewState.index < previewState.imgs.length - 1" class="preview-zone preview-zone--next"
                @click.stop="previewState.index++">
                <span class="preview-zone-arrow">❯</span>
            </div>
            <div v-if="previewState.imgs.length > 1" class="preview-counter">{{ previewState.index + 1 }} / {{
                previewState.imgs.length }}</div>
            <button class="preview-close" @click.stop="previewState.show = false">✕</button>
        </div>

        <!-- ── 计划 Modal ── -->
        <div v-if="showPlanModal" class="modal-overlay" @click.self="showPlanModal = false">
            <div class="modal">
                <div class="modal-header">
                    <h3>{{ editingPlan?.id ? '编辑计划' : '新建计划' }}</h3>
                    <button class="btn btn-ghost btn-icon" @click="showPlanModal = false">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>图标</label>
                        <div class="emoji-picker">
                            <button v-for="e in planIcons" :key="e" class="emoji-btn"
                                :class="{ active: planForm.icon === e }" @click="planForm.icon = e">{{ e }}</button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>计划名称 <span class="required">*</span></label>
                        <input v-model="planForm.title" class="form-input" placeholder="给你的计划取个名字" maxlength="100" />
                    </div>
                    <div class="form-group">
                        <label>描述</label>
                        <textarea v-model="planForm.description" class="form-input form-textarea"
                            placeholder="计划的目标或说明（可选）" rows="2" />
                    </div>
                    <div class="form-group">
                        <label>颜色标记</label>
                        <div class="color-picker">
                            <button v-for="c in planColors" :key="c" class="color-dot"
                                :class="{ active: planForm.color === c }" :style="{ background: c }"
                                @click="planForm.color = c"></button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>状态</label>
                        <div class="status-select">
                            <button v-for="s in planStatuses" :key="s.value" class="status-option"
                                :class="{ active: planForm.status === s.value }" @click="planForm.status = s.value">{{
                                    s.icon }}
                                {{ s.label }}</button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost" @click="showPlanModal = false">取消</button>
                    <button class="btn btn-primary" :disabled="!planForm.title.trim()" @click="savePlan">
                        {{ editingPlan?.id ? '保存' : '创建' }}
                    </button>
                </div>
            </div>
        </div>

        <!-- ── 步骤 Modal ── -->
        <div v-if="showStepModal" class="modal-overlay" @keydown.ctrl.enter="saveStep">
            <div class="modal modal-lg" tabindex="-1">
                <div class="modal-header">
                    <h3>{{ editingStep?.id ? '编辑步骤' : '添加步骤' }}</h3>
                    <button class="btn btn-ghost btn-icon" @click="showStepModal = false">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>步骤标题 <span class="required">*</span></label>
                        <input v-model="stepForm.title" class="form-input" placeholder="这一步要做什么？" maxlength="200" />
                    </div>
                    <div class="form-group">
                        <label>详细描述</label>
                        <textarea v-model="stepForm.description" class="form-input form-textarea"
                            placeholder="详细说明、思路、资料链接等..." rows="3" />
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>特殊标识</label>
                            <div class="badge-presets">
                                <button v-for="b in badgePresets" :key="b.label" class="badge-preset-btn"
                                    :class="{ active: stepForm.badge === b.label }" :style="stepForm.badge === b.label
                                        ? { borderColor: b.color, background: b.color, color: '#fff' }
                                        : { borderColor: b.color, color: b.color }"
                                    @click="stepForm.badge = b.label; stepForm.badge_color = b.color">{{ b.label
                                    }}</button>
                                <button class="badge-preset-btn clear-badge"
                                    @click="stepForm.badge = ''; stepForm.badge_color = ''">清除</button>
                            </div>
                            <input v-model="stepForm.badge" class="form-input mt-8" placeholder="或输入自定义标识..."
                                maxlength="20" />
                        </div>
                    </div>

                    <div class="form-row-dates">
                        <div class="form-group">
                            <label>开始日期</label>
                            <AppDatePicker v-model="stepForm.start_date" placeholder="选择开始日期" />
                        </div>
                        <div class="form-group">
                            <label>截止日期</label>
                            <AppDatePicker v-model="stepForm.due_date" placeholder="选择截止日期" />
                        </div>
                    </div>

                    <div class="form-group">
                        <label>状态</label>
                        <div class="status-select">
                            <button v-for="s in stepStatuses" :key="s.value" class="status-option"
                                :class="{ active: stepForm.status === s.value }" @click="stepForm.status = s.value">{{
                                    s.icon }}
                                {{ s.label }}</button>
                        </div>
                    </div>

                    <!-- 多图上传（最多9张） -->
                    <div class="form-group">
                        <label>📍 地点地址 <span class="form-label-hint">支持条目名、地址、地标居民地址等</span></label>
                        <input v-model="stepForm.location" class="form-input" placeholder="例：北京天安门、上海赛克巴孙大道100号..."
                            maxlength="200" />
                    </div>

                    <!-- 多图上传（最多9张） -->
                    <div class="form-group">
                        <label>配图 <span class="form-label-hint">最多9张</span></label>
                        <div class="img-upload-grid">
                            <!-- 已上传完成的图 -->
                            <div v-for="(url, i) in stepForm.image_urls" :key="`done-${i}`" class="img-grid-cell">
                                <img :src="url" alt="" @click="openPreview(stepForm.image_urls, i)" />
                                <button class="img-cell-remove" @click="removeImage(i)">✕</button>
                            </div>
                            <!-- 上传中的占位图 -->
                            <div v-for="item in uploadingItems" :key="item.id" class="img-grid-cell img-grid-uploading">
                                <img :src="item.localUrl" alt="" />
                                <div class="img-cell-mask">
                                    <div class="loading-spinner"></div>
                                </div>
                            </div>
                            <!-- 添加按钮 -->
                            <button v-if="stepForm.image_urls.length + uploadingItems.length < 9" class="img-add-cell"
                                @click="$refs.imgInput.click()">
                                <span>📷</span>
                                <p>添加图片</p>
                            </button>
                        </div>
                        <input ref="imgInput" type="file" accept="image/*" multiple hidden @change="handleImgUpload" />
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost" @click="showStepModal = false">取消</button>
                    <button class="btn btn-primary" :disabled="!stepForm.title.trim() || uploading" @click="saveStep">
                        {{ editingStep?.id ? '保存' : '添加' }}
                    </button>
                </div>
            </div>
        </div>

        <!-- ── 分享弹窗 ── -->
        <Teleport to="body">
            <div v-if="showShareModal" class="share-modal-overlay" @click.self="showShareModal = false">
                <div class="share-modal">
                    <div class="share-modal-header">
                        <h3>🔗 分享计划</h3>
                        <button class="modal-close" @click="showShareModal = false">✕</button>
                    </div>
                    <div class="share-tabs">
                        <button :class="['share-tab', { active: shareTab === 'link' }]" @click="shareTab = 'link'">🔗
                            分享链接</button>
                        <button :class="['share-tab', { active: shareTab === 'image' }]" @click="shareTab = 'image'">🖼️
                            生成图片</button>
                    </div>

                    <div v-if="shareTab === 'link'" class="share-panel">
                        <p class="share-desc">生成一个带访问码的分享链接，访问者需要输入正确的4位访问码才能查看。</p>

                        <!-- 已有链接：显示链接 + 访问码 -->
                        <template v-if="shareToken">
                            <div class="share-link-box">
                                <span class="share-link-text">{{ shareUrl }}</span>
                                <button class="btn btn-primary btn-sm" @click="copyShareLink">{{ copied ? '✅ 已复制' : '复制'
                                    }}</button>
                            </div>
                            <div v-if="sharePin" class="share-pin-box">
                                <span class="share-pin-label">🔑 访问码</span>
                                <span class="share-pin-value">{{ sharePin }}</span>
                                <button class="btn btn-ghost btn-sm" @click="copySharePin">{{ copiedPin ? '✅' : '复制'
                                    }}</button>
                            </div>
                            <div v-if="shareExpiresAt" class="share-expires-tip">
                                ⏰ 过期时间：{{ formatExpiresAt(shareExpiresAt) }}
                            </div>
                            <div v-else class="share-expires-tip">⏰ 永久有效</div>
                        </template>

                        <!-- 未生成：过期时间选择器 -->
                        <div v-if="!shareToken" class="share-expires-row">
                            <label class="share-expires-label">过期时间</label>
                            <div class="share-expires-btns">
                                <button v-for="opt in expiresOptions" :key="opt.value"
                                    :class="['share-expires-btn', { active: shareExpiresIn === opt.value }]"
                                    @click="shareExpiresIn = opt.value">{{ opt.label }}</button>
                            </div>
                        </div>

                        <div class="share-link-actions">
                            <button v-if="!shareToken" class="btn btn-primary" :disabled="shareLoading"
                                @click="generateShareToken">
                                {{ shareLoading ? '生成中...' : '生成分享链接' }}
                            </button>
                            <button v-if="shareToken" class="btn btn-ghost btn-sm" :disabled="shareLoading"
                                @click="regenerateShareToken">
                                {{ shareLoading ? '重新生成中...' : '🔄 重新生成' }}
                            </button>
                            <button v-if="shareToken" class="btn btn-ghost btn-sm share-revoke-btn"
                                :disabled="shareLoading" @click="revokeShareToken">
                                {{ shareLoading ? '撤销中...' : '撤销链接' }}
                            </button>
                        </div>
                    </div>

                    <div v-if="shareTab === 'image'" class="share-panel">
                        <p class="share-desc">将当前计划步骤列表截图保存为 PNG 图片。</p>
                        <button class="btn btn-primary" :disabled="exportingImage" @click="exportAsImage">
                            {{ exportingImage ? '生成中...' : '📸 生成并下载图片' }}
                        </button>
                    </div>
                </div>
            </div>
        </Teleport>

        <!-- ── 查看分享行程弹窗 ── -->
        <Teleport to="body">
            <div v-if="showShareLookup" class="share-lookup-overlay" @click.self="showShareLookup = false">
                <div class="share-lookup-modal">
                    <div class="share-lookup-header">
                        <h3>🔗 查看分享行程</h3>
                        <button class="modal-close" @click="showShareLookup = false">✕</button>
                    </div>
                    <div class="share-lookup-body">
                        <p class="share-lookup-hint">粘贴好友发给你的分享链接，即可查看行程内容</p>
                        <div class="share-lookup-input-row">
                            <input v-model="shareLookupUrl" class="form-input" placeholder="https://…/share/…"
                                @keydown.enter="goToShare" @input="shareLookupError = ''" />
                            <button class="btn btn-ghost btn-sm share-lookup-clip-btn" :disabled="clipReading"
                                title="从剪贴板读取" @click="readFromClipboard">{{ clipReading ? '读取中…' : '📋' }}</button>
                        </div>
                        <p v-if="shareLookupError" class="share-lookup-error">{{ shareLookupError }}</p>
                    </div>
                    <div class="share-lookup-footer">
                        <button class="btn btn-ghost" @click="showShareLookup = false">取消</button>
                        <button class="btn btn-primary" :disabled="!shareLookupUrl.trim()"
                            @click="goToShare">前往查看</button>
                    </div>
                </div>
            </div>
        </Teleport>

        <!-- ── 协作者管理弹窗 ── -->
        <Teleport to="body">
            <div v-if="showCollabModal" class="collab-overlay" @click.self="showCollabModal = false">
                <div class="collab-modal">
                    <div class="collab-header">
                        <h3>🤝 协作者管理</h3>
                        <button class="modal-close" @click="showCollabModal = false">✕</button>
                    </div>
                    <div class="collab-body">
                        <div class="collab-invite-row">
                            <input
                                v-model="collabUsername"
                                class="form-input"
                                placeholder="输入用户名邀请…"
                                @keydown.enter="inviteCollaborator"
                            />
                            <button
                                class="btn btn-primary btn-sm"
                                :disabled="!collabUsername.trim() || collabLoading"
                                @click="inviteCollaborator"
                            >{{ collabLoading ? '邀请中…' : '邀请' }}</button>
                        </div>
                        <p v-if="collabError" class="collab-error">{{ collabError }}</p>

                        <div class="collab-list" v-if="planStore.currentPlan?.collaborators?.length">
                            <div v-for="c in planStore.currentPlan.collaborators" :key="c.id" class="collab-item">
                                <div class="collab-avatar" :style="{ background: c.avatar_color || '#ccc' }">
                                    {{ (c.nickname || c.username || '?').charAt(0).toUpperCase() }}
                                </div>
                                <div class="collab-info">
                                    <span class="collab-name">{{ c.nickname || c.username }}</span>
                                    <span class="collab-sub">@{{ c.username }}</span>
                                </div>
                                <button class="btn btn-ghost btn-icon-sm" @click="removeCollaborator(c)" title="移除">✕</button>
                            </div>
                        </div>
                        <div v-else class="collab-empty">
                            <p>还没有协作者，邀请好友一起编辑计划吧</p>
                        </div>
                    </div>
                </div>
            </div>
        </Teleport>

    </AppLayout>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import AppDatePicker from '@/components/AppDatePicker.vue'
import { usePlanStore } from '@/stores/plans'
import { uploadApi, planApi } from '@/api'
import { toast } from '@/utils/toast'
import { showConfirm } from '@/utils/alert'
import dayjs from 'dayjs'
import html2canvas from 'html2canvas'

const planStore = usePlanStore()
const router = useRouter()
const route = useRoute()

// ── 常量 ────────────────────────────────────────────────────────
const planFilters = [
    { label: '全部', value: '' },
    { label: '进行中', value: 'active' },
    { label: '已完成', value: 'completed' },
    { label: '已暂停', value: 'paused' }
]
const planStatuses = [
    { value: 'active', label: '进行中', icon: '🚀' },
    { value: 'paused', label: '已暂停', icon: '⏸️' },
    { value: 'completed', label: '已完成', icon: '✅' }
]
const stepStatuses = [
    { value: 'pending', label: '待开始', icon: '⬜' },
    { value: 'in_progress', label: '进行中', icon: '🔄' },
    { value: 'completed', label: '已完成', icon: '✅' },
    { value: 'skipped', label: '已跳过', icon: '⏭️' }
]
const stepStatusIcon = { pending: '⬜', in_progress: '🔄', completed: '✅', skipped: '⏭️' }
const statusLabel = { active: '进行中', paused: '已暂停', completed: '已完成' }
const planColors = ['#FFFFFF', '#FFD6E0', '#D4F5E9', '#E4E8F8', '#FFE8D6', '#FFF8D6', '#D6EEFF', '#DCEDC8']
const planIcons = ['🎯', '🚀', '💡', '📚', '💪', '🌱', '✨', '🏆', '🎨', '🔬', '🌍', '❤️']
const badgePresets = [
    { label: '里程碑', color: '#FF85A1' },
    { label: '重要', color: '#FF7675' },
    { label: '关键', color: '#e17055' },
    { label: '可选', color: '#74b9ff' },
    { label: '待定', color: '#b2bec3' }
]

// ── 状态 ────────────────────────────────────────────────────────
const activeFilter = ref('')
const currentPlanId = ref(null)
const showPlanModal = ref(false)
const showStepModal = ref(false)
const showShareModal = ref(false)
const shareTab = ref('link')
const shareToken = ref('')
const sharePin = ref('')
const shareExpiresAt = ref(null)
const shareExpiresIn = ref(7) // 天数，0 = 永久
const shareLoading = ref(false)
const copied = ref(false)
const copiedPin = ref(false)
const exportingImage = ref(false)
const shareUrl = computed(() => shareToken.value ? `${window.location.origin}/share/${shareToken.value}` : '')
const editingPlan = ref(null)
const editingStep = ref(null)
const previewState = ref({ show: false, imgs: [], index: 0 })
const timelineRef = ref(null)
const flashStepId = ref(null)
const mainRef = ref(null)
const showBackToTop = ref(false)
const mobileShowDetail = ref(false)

// \u2500\u2500 \u67e5\u770b\u5206\u4eab\u884c\u7a0b \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
const showShareLookup = ref(false)
const shareLookupUrl = ref('')
const shareLookupError = ref('')
const clipReading = ref(false)

// ── 协作者管理 ────────────────────────────
const showCollabModal = ref(false)
const collabUsername = ref('')
const collabError = ref('')
const collabLoading = ref(false)

function handleMainScroll() {
    showBackToTop.value = window.scrollY > 300
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
}

// \u2500\u2500 \u67e5\u770b\u5206\u4eab\u884c\u7a0b \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function openShareLookup() {
    shareLookupUrl.value = ''
    shareLookupError.value = ''
    showShareLookup.value = true
    // \u5c1d\u8bd5\u81ea\u52a8\u8bfb\u53d6\u526a\u8d34\u677f
    tryAutoReadClipboard()
}

async function tryAutoReadClipboard() {
    if (!navigator.clipboard?.readText) return
    try {
        const text = await navigator.clipboard.readText()
        const trimmed = (text || '').trim()
        if (trimmed && (trimmed.includes('/share/') || /^[a-f0-9]{60,}$/.test(trimmed))) {
            shareLookupUrl.value = trimmed
        }
    } catch (_) { /* \u6743\u9650\u88ab\u62d2\uff0c\u9759\u9ed8\u5931\u8d25 */ }
}

async function readFromClipboard() {
    if (!navigator.clipboard?.readText) {
        shareLookupError.value = '\u6d4f\u89c8\u5668\u4e0d\u652f\u6301\u8bfb\u53d6\u526a\u8d34\u677f'
        return
    }
    clipReading.value = true
    try {
        const text = await navigator.clipboard.readText()
        if (text?.trim()) {
            shareLookupUrl.value = text.trim()
            shareLookupError.value = ''
        }
    } catch (_) {
        shareLookupError.value = '\u526a\u8d34\u677f\u8bfb\u53d6\u88ab\u62d2\u7edd\uff0c\u8bf7\u624b\u52a8\u7c98\u8d34'
    } finally {
        clipReading.value = false
    }
}

function parseShareToken(url) {
    if (!url) return null
    const trimmed = url.trim()
    // \u5b8c\u6574 URL \u6216\u8def\u5f84\uff1a https://xxx.com/share/TOKEN \u6216 /share/TOKEN
    const match = trimmed.match(/\/share\/([a-f0-9]{60,})/)
    if (match) return match[1]
    // \u88f8 token\uff08\u81f3\u5c11 60 \u4f4d\u5341\u516d\u8fdb\u5236\uff09
    if (/^[a-f0-9]{60,}$/.test(trimmed)) return trimmed
    return null
}

function goToShare() {
    const token = parseShareToken(shareLookupUrl.value)
    if (!token) {
        shareLookupError.value = '\u94fe\u63a5\u683c\u5f0f\u4e0d\u6b63\u786e\uff0c\u8bf7\u68c0\u67e5\u540e\u91cd\u8bd5'
        return
    }
    showShareLookup.value = false
    router.push(`/share/${token}`)
}

const expandedDescs = ref(new Set())
const DESC_LIMIT = 120
function isDescLong(step) { return (step.description || '').length > DESC_LIMIT }
function isDescExpanded(step) { return expandedDescs.value.has(step.id) }
function toggleDesc(step) {
    const s = expandedDescs.value
    s.has(step.id) ? s.delete(step.id) : s.add(step.id)
    expandedDescs.value = new Set(s)
}
const uploadingItems = ref([]) // [{ id, localUrl }]
const uploading = computed(() => uploadingItems.value.length > 0)

const planForm = ref({ title: '', description: '', color: '#FFFFFF', icon: '🎯', status: 'active' })
const stepForm = ref({ title: '', description: '', status: 'pending', badge: '', badge_color: '', image_urls: [], start_date: '', due_date: '', location: '' })

// ── 计算 ────────────────────────────────────────────────────────
const filteredPlans = computed(() =>
    activeFilter.value
        ? planStore.plans.filter(p => p.status === activeFilter.value)
        : planStore.plans
)

// ── 生命周期 ────────────────────────────────────────────────────
onMounted(async () => {
    await planStore.fetchPlans()
    const qPlan = route.query.plan
    const qStep = route.query.step
    if (qPlan) {
        await selectPlan(Number(qPlan))
        await nextTick()
        const planCard = document.querySelector(`[data-plan-id="${qPlan}"]`)
        planCard?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        if (qStep) {
            const stepEl = document.querySelector(`[data-step-id="${qStep}"]`)
            if (stepEl) {
                stepEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
                flashStepId.value = Number(qStep)
                setTimeout(() => { flashStepId.value = null }, 2000)
            }
        }
    }
    window.addEventListener('scroll', handleMainScroll, { passive: true })
})

onUnmounted(() => {
    window.removeEventListener('scroll', handleMainScroll)
})

// ── 方法 ────────────────────────────────────────────────────────
function progressPct(plan) {
    if (!plan.total_steps || plan.total_steps === 0) return 0
    return Math.round((plan.done_steps / plan.total_steps) * 100)
}

function formatDate(d) {
    if (!d) return ''
    const parsed = dayjs(d)
    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : ''
}

function isOverdue(step) {
    return step.due_date && step.status !== 'completed' && dayjs(step.due_date).isBefore(dayjs(), 'day')
}

function badgeStyle(step) {
    if (step.badge_color) return { background: step.badge_color + '22', color: step.badge_color, borderColor: step.badge_color }
    return {}
}

async function selectPlan(id) {
    currentPlanId.value = id
    await planStore.fetchPlan(id)
    mobileShowDetail.value = true
}

function goBackToList() {
    mobileShowDetail.value = false
}

// 计划 Modal
function openPlanModal(plan = null) {
    editingPlan.value = plan
    planForm.value = plan
        ? { title: plan.title, description: plan.description, color: plan.color, icon: plan.icon, status: plan.status }
        : { title: '', description: '', color: '#FFFFFF', icon: '🎯', status: 'active' }
    showPlanModal.value = true
}

async function savePlan() {
    if (!planForm.value.title.trim()) return
    try {
        if (editingPlan.value?.id) {
            await planStore.updatePlan(editingPlan.value.id, planForm.value)
            toast.success('计划已更新 ✨')
        } else {
            const res = await planStore.createPlan(planForm.value)
            toast.success('计划已创建 🎯')
            await selectPlan(res.data.id)
        }
        showPlanModal.value = false
    } catch (e) {
        toast.error(e.message)
    }
}

async function confirmDeletePlan(plan) {
    const ok = await showConfirm(`确定删除计划「${plan.title}」及其所有步骤吗？`, {
        title: '删除计划',
        icon: '🗑️',
        confirmText: '删除',
        variant: 'danger',
    })
    if (!ok) return
    try {
        await planStore.deletePlan(plan.id)
        if (currentPlanId.value === plan.id) currentPlanId.value = null
        toast.success('计划已删除')
    } catch (e) {
        toast.error(e.message)
    }
}

// 步骤 Modal
function openStepModal(step = null) {
    editingStep.value = step
    uploadingItems.value = []
    const imgs = step ? (Array.isArray(step.image_urls) && step.image_urls.length
        ? [...step.image_urls]
        : (step.image_url ? [step.image_url] : [])) : []
    stepForm.value = step
        ? {
            title: step.title || '',
            description: step.description || '',
            status: step.status || 'pending',
            badge: step.badge || '',
            badge_color: step.badge_color || '',
            image_urls: imgs,
            start_date: step.start_date ? formatDate(step.start_date) : '',
            due_date: step.due_date ? formatDate(step.due_date) : '',
            location: step.location || ''
        }
        : { title: '', description: '', status: 'pending', badge: '', badge_color: '', image_urls: [], start_date: '', due_date: '', location: '' }
    showStepModal.value = true
}

async function saveStep() {
    if (!stepForm.value.title.trim()) return
    try {
        if (editingStep.value?.id) {
            await planStore.updateStep(editingStep.value.id, stepForm.value)
            toast.success('步骤已更新 ✨')
        } else {
            const res = await planStore.createStep({ plan_id: currentPlanId.value, ...stepForm.value })
            toast.success('步骤已添加 🌸')
            // 滚动到新步骤并高亮闪烁
            await nextTick()
            const newId = res?.data?.id
            if (newId) {
                const el = document.querySelector(`[data-step-id="${newId}"]`)
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                flashStepId.value = newId
                setTimeout(() => { flashStepId.value = null }, 1200)
            }
        }
        showStepModal.value = false
    } catch (e) {
        toast.error(e.message)
    }
}

async function changeStepStatus(step, status) {
    try {
        await planStore.updateStep(step.id, { status })
    } catch (e) {
        toast.error(e.message)
    }
}

async function quickToggleStep(step) {
    const newStatus = step.status === 'completed' ? 'pending' : 'completed'
    try {
        await planStore.updateStep(step.id, { status: newStatus })
    } catch (e) {
        toast.error(e.message)
    }
}

// ── 协作者 ──────────────────────────────────────────────────────
function openCollabModal() {
    collabUsername.value = ''
    collabError.value = ''
    showCollabModal.value = true
}

async function inviteCollaborator() {
    if (!collabUsername.value.trim() || collabLoading.value) return
    collabError.value = ''
    collabLoading.value = true
    try {
        const res = await planApi.addCollaborator(currentPlanId.value, collabUsername.value.trim())
        if (!planStore.currentPlan.collaborators) planStore.currentPlan.collaborators = []
        planStore.currentPlan.collaborators.push(res.data)
        collabUsername.value = ''
        toast.success('已邀请协作者 🤝')
    } catch (e) {
        collabError.value = e.message
    } finally {
        collabLoading.value = false
    }
}

async function removeCollaborator(user) {
    const ok = await showConfirm(`确定移除协作者「${user.nickname || user.username}」吗？`, {
        title: '移除协作者',
        confirmText: '移除',
        variant: 'danger'
    })
    if (!ok) return
    try {
        await planApi.removeCollaborator(currentPlanId.value, user.id)
        planStore.currentPlan.collaborators = planStore.currentPlan.collaborators.filter(c => c.id !== user.id)
        toast.success('已移除协作者')
    } catch (e) {
        toast.error(e.message)
    }
}

async function leavePlan(plan) {
    const ok = await showConfirm(`确定退出协作计划「${plan.title}」吗？`, {
        title: '退出协作',
        confirmText: '退出',
        variant: 'danger'
    })
    if (!ok) return
    try {
        await planApi.leave(plan.id)
        planStore.plans = planStore.plans.filter(p => p.id !== plan.id)
        if (currentPlanId.value === plan.id) currentPlanId.value = null
        toast.success('已退出协作')
    } catch (e) {
        toast.error(e.message)
    }
}

// ── 分享功能 ────────────────────────────────────────────────────
function openShareModal() {
    shareTab.value = 'link'
    copied.value = false
    copiedPin.value = false
    sharePin.value = ''
    shareExpiresAt.value = null
    shareExpiresIn.value = 7
    // 如果当前计划已有 token，直接展示链接（但不显示 PIN，因为 PIN 只在生成时返回一次）
    shareToken.value = planStore.currentPlan?.share_token || ''
    if (shareToken.value) {
        shareExpiresAt.value = planStore.currentPlan?.share_expires_at ?? null
        sharePin.value = planStore.currentPlan?.share_pin || ''
    }
    showShareModal.value = true
}

async function generateShareToken() {
    shareLoading.value = true
    try {
        const res = await planApi.share(currentPlanId.value, { expiresIn: shareExpiresIn.value })
        shareToken.value = res.token
        sharePin.value = res.pin
        shareExpiresAt.value = res.expiresAt
        if (planStore.currentPlan) {
            planStore.currentPlan.share_token = res.token
            planStore.currentPlan.share_expires_at = res.expiresAt
            planStore.currentPlan.share_pin = res.pin
        }
    } catch (e) {
        toast.error(e.message)
    } finally {
        shareLoading.value = false
    }
}

async function regenerateShareToken() {
    const ok = await showConfirm('重新生成将产生新的链接和访问码，原链接立即失效，确定吗？', { title: '重新生成', confirmText: '重新生成', variant: 'danger' })
    if (!ok) return
    shareToken.value = ''
    sharePin.value = ''
    shareExpiresIn.value = 7
}

async function revokeShareToken() {
    const ok = await showConfirm('撤销后此链接将立即失效，确定吗？', { title: '撤销分享', confirmText: '撤销', variant: 'danger' })
    if (!ok) return
    shareLoading.value = true
    try {
        await planApi.unshare(currentPlanId.value)
        shareToken.value = ''
        sharePin.value = ''
        shareExpiresAt.value = null
        if (planStore.currentPlan) planStore.currentPlan.share_token = null
        if (planStore.currentPlan) planStore.currentPlan.share_expires_at = null
        if (planStore.currentPlan) planStore.currentPlan.share_pin = null
        toast.success('分享链接已撤销')
    } catch (e) {
        toast.error(e.message)
    } finally {
        shareLoading.value = false
    }
}

async function copyShareLink() {
    try {
        await navigator.clipboard.writeText(shareUrl.value)
        copied.value = true
        setTimeout(() => { copied.value = false }, 2000)
    } catch {
        toast.error('复制失败，请手动复制')
    }
}

async function copySharePin() {
    try {
        await navigator.clipboard.writeText(sharePin.value)
        copiedPin.value = true
        setTimeout(() => { copiedPin.value = false }, 2000)
    } catch {
        toast.error('复制失败，请手动复制')
    }
}

const expiresOptions = [
    { label: '1天', value: 1 },
    { label: '7天', value: 7 },
    { label: '30天', value: 30 },
    { label: '永久', value: 0 },
]

function formatExpiresAt(dateStr) {
    if (!dateStr) return '永久'
    return dayjs(dateStr).format('YYYY-MM-DD HH:mm')
}

async function exportAsImage() {
    exportingImage.value = true
    const plan = planStore.currentPlan
    if (!plan) { exportingImage.value = false; return }

    try {
        const statusIcon = { pending: '⬜', in_progress: '🔄', completed: '✅', skipped: '⏭️' }
        const doneCnt = plan.steps.filter(s => s.status === 'completed').length
        const pct = plan.steps.length ? Math.round(doneCnt / plan.steps.length * 100) : 0

        // ── 构建离屏容器，样式与 ShareView 保持一致 ──────────────
        const root = document.createElement('div')
        root.style.cssText = `
            position:fixed; left:-9999px; top:0;
            width:720px; background:#fafafa;
            font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
            padding:0 0 40px; box-sizing:border-box;
        `

        // Header
        const header = document.createElement('div')
        header.style.cssText = `
            display:flex; align-items:center; justify-content:space-between;
            padding:14px 28px; background:#fff;
            border-bottom:1px solid #f0f0f0; margin-bottom:0;
        `
        header.innerHTML = `
            <div style="display:flex;align-items:center;gap:6px;font-weight:700;font-size:16px;">
                <span style="font-size:18px;">🌸</span> Mini Note
            </div>
            <span style="font-size:12px;color:#aaa;">${dayjs().format('YYYY-MM-DD')} 导出</span>
        `

        // Plan header block
        const planHeader = document.createElement('div')
        planHeader.style.cssText = `
            display:flex; align-items:flex-start; gap:14px;
            padding:24px 28px 20px; background:#fff;
            border-bottom:1px solid #f0f0f0; flex-wrap:wrap;
        `
        planHeader.innerHTML = `
            <span style="font-size:40px;line-height:1;">${plan.icon || '🎯'}</span>
            <div style="flex:1;">
                <div style="font-size:20px;font-weight:800;color:#222;margin-bottom:4px;">${plan.title}</div>
                ${plan.description ? `<div style="font-size:13px;color:#888;">${plan.description}</div>` : ''}
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;min-width:130px;">
                <div style="width:130px;height:6px;background:#f0f0f0;border-radius:3px;overflow:hidden;">
                    <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#f9a8d4,#ec4899);border-radius:3px;"></div>
                </div>
                <span style="font-size:12px;color:#aaa;">${doneCnt} / ${plan.steps.length} 完成</span>
            </div>
        `

        // Steps
        const timeline = document.createElement('div')
        timeline.style.cssText = `padding:20px 28px 0; display:flex; flex-direction:column; gap:0;`

        for (let i = 0; i < plan.steps.length; i++) {
            const step = plan.steps[i]
            const isCompleted = step.status === 'completed'

            const row = document.createElement('div')
            row.style.cssText = `display:flex; gap:12px; position:relative;`

            // connecting line
            if (i < plan.steps.length - 1) {
                const line = document.createElement('div')
                line.style.cssText = `
                    position:absolute; left:15px; top:34px; bottom:-16px;
                    width:2px; background:#f0f0f0; z-index:0;
                `
                row.appendChild(line)
            }

            // dot
            const dot = document.createElement('div')
            dot.style.cssText = `
                width:30px; height:30px; border-radius:50%; flex-shrink:0;
                background:${isCompleted ? '#d4f5e9' : '#fff'};
                border:2px solid ${isCompleted ? '#27ae60' : '#e8e8e8'};
                display:flex; align-items:center; justify-content:center;
                font-size:12px; margin-top:4px; position:relative; z-index:1;
            `
            dot.textContent = statusIcon[step.status] || '⬜'

            // card
            const card = document.createElement('div')
            card.style.cssText = `
                flex:1; background:#fff; border:1px solid #f0f0f0;
                border-radius:10px; padding:12px 14px; margin-bottom:16px;
                opacity:${isCompleted ? '0.75' : '1'};
            `

            // card head
            let headHtml = `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                    <span style="font-weight:600;font-size:14px;color:#222;
                        ${isCompleted ? 'text-decoration:line-through;color:#aaa;' : ''}">
                        ${step.title}
                    </span>
            `
            if (step.badge) {
                const bc = step.badge_color || '#888'
                headHtml += `
                    <span style="font-size:11px;padding:2px 8px;border-radius:20px;
                        background:${bc}22;color:${bc};border:1px solid ${bc}44;">
                        ${step.badge}
                    </span>`
            }
            headHtml += `</div>`

            if (step.description) {
                headHtml += `<p style="font-size:13px;color:#888;margin:4px 0 8px;line-height:1.6;">${step.description}</p>`
            }

            // dates
            const dates = []
            if (step.start_date) dates.push(`🗓️ 开始：${dayjs(step.start_date).format('YYYY-MM-DD')}`)
            if (step.due_date) {
                const overdue = step.status !== 'completed' && dayjs(step.due_date).isBefore(dayjs(), 'day')
                dates.push(`<span style="color:${overdue ? '#e17055' : '#aaa'};">📅 截止：${dayjs(step.due_date).format('YYYY-MM-DD')}</span>`)
            }
            if (dates.length) {
                headHtml += `<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px;font-size:11px;color:#aaa;">${dates.join('')}</div>`
            }

            // location
            if (step.location) {
                headHtml += `<div style="font-size:12px;color:#aaa;margin-bottom:8px;">📍 ${step.location}</div>`
            }

            card.innerHTML = headHtml

            row.appendChild(dot)
            row.appendChild(card)
            timeline.appendChild(row)
        }

        root.appendChild(header)
        root.appendChild(planHeader)
        root.appendChild(timeline)
        document.body.appendChild(root)

        await new Promise(r => setTimeout(r, 200)) // 等待图片渲染

        const canvas = await html2canvas(root, {
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#fafafa',
            scale: 2,
            width: 720,
            windowWidth: 720
        })

        document.body.removeChild(root)

        const link = document.createElement('a')
        link.download = `${plan.title || '计划'}-${dayjs().format('YYYYMMDD')}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
        toast.success('图片已生成并下载 🎉')
    } catch (e) {
        toast.error('生成图片失败: ' + e.message)
    } finally {
        exportingImage.value = false
    }
}

async function confirmDeleteStep(step) {
    const ok = await showConfirm(`确定删除步骤「${step.title}」吗？`, {
        title: '删除步骤',
        icon: '🗑️',
        confirmText: '删除',
        variant: 'danger',
    })
    if (!ok) return
    try {
        await planStore.deleteStep(step.id)
        toast.success('步骤已删除')
    } catch (e) {
        toast.error(e.message)
    }
}

async function moveStep(idx, dir) {
    const steps = planStore.currentPlan.steps
    const target = idx + dir
    if (target < 0 || target >= steps.length) return
        ;[steps[idx], steps[target]] = [steps[target], steps[idx]]
    const items = steps.map((s, i) => ({ id: s.id, sort_order: i }))
    await planStore.reorderSteps(items)
}

/** 用 Canvas 将图片压缩到 50% 画质后返回 Blob */
function compressImage(file, quality = 0.5) {
    return new Promise((resolve) => {
        const img = new Image()
        const url = URL.createObjectURL(file)
        img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.naturalWidth
            canvas.height = img.naturalHeight
            canvas.getContext('2d').drawImage(img, 0, 0)
            URL.revokeObjectURL(url)
            const mime = file.type === 'image/png' ? 'image/jpeg' : (file.type || 'image/jpeg')
            canvas.toBlob((blob) => resolve(blob), mime, quality)
        }
        img.src = url
    })
}

/** 打开图片预览轮播 */
function openPreview(imgs, index = 0) {
    previewState.value = { show: true, imgs: [...imgs], index }
}

// 图片预览触摸滑动
let _previewTouchX = 0
function onPreviewTouchStart(e) { _previewTouchX = e.touches[0].clientX }
function onPreviewTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - _previewTouchX
    if (Math.abs(dx) < 50) return
    const p = previewState.value
    if (dx < 0 && p.index < p.imgs.length - 1) p.index++
    if (dx > 0 && p.index > 0) p.index--
}

/** 删除已上传图片 */
function removeImage(i) {
    stepForm.value.image_urls.splice(i, 1)
}

/** 从 step 对象取多图列表（兼容旧 image_url 单图字段） */
function stepImgList(step) {
    if (Array.isArray(step.image_urls) && step.image_urls.length) return step.image_urls
    if (step.image_url) return [step.image_url]
    return []
}

async function handleImgUpload(e) {
    const files = Array.from(e.target.files)
    const remainSlots = 9 - stepForm.value.image_urls.length - uploadingItems.value.length
    const toProcess = files.slice(0, remainSlots)
    if (!toProcess.length) { e.target.value = ''; return }

    for (const file of toProcess) {
        const localUrl = URL.createObjectURL(file)
        const itemId = `${Date.now()}-${Math.random()}`
        uploadingItems.value.push({ id: itemId, localUrl })

        compressImage(file, 0.5).then(async (compressed) => {
            try {
                const ext = file.type === 'image/png' ? '.jpg' : (file.name.match(/\.[^.]+$/)?.[0] ?? '.jpg')
                const compressedFile = new File([compressed], file.name.replace(/\.[^.]+$/, ext), { type: compressed.type })
                const res = await uploadApi.image(compressedFile)
                stepForm.value.image_urls.push(res.data?.url || res.url)
            } catch {
                toast.error('图片上传失败')
            } finally {
                URL.revokeObjectURL(localUrl)
                uploadingItems.value = uploadingItems.value.filter(it => it.id !== itemId)
            }
        })
    }
    e.target.value = ''
}
</script>

<style scoped>
/* ── 页面布局 ── */
.plans-page {
    display: flex;
    height: 100%;
    min-height: calc(100vh - 60px);
    gap: 0;
}

/* ── 左侧 Sidebar ── */
.plans-sidebar {
    width: 300px;
    min-width: 260px;
    border-right: 1px solid var(--color-border);
    background: var(--color-surface);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding: 20px 16px;
    gap: 12px;
    scrollbar-width: none;
}

.plans-sidebar::-webkit-scrollbar {
    display: none;
}

.plans-sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.sidebar-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-text);
}

.plan-filters {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

/* ── 计划卡片 ── */
.plan-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.plan-card {
    border: 1.5px solid var(--color-border);
    border-left: 4px solid var(--theme-primary);
    border-radius: var(--radius-md);
    padding: 12px;
    cursor: pointer;
    transition: all var(--transition);
    background: var(--color-surface);
}

.plan-card:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-1px);
}

.plan-card.active {
    background: var(--theme-primary-light);
    border-color: var(--theme-primary-dark);
}

.plan-card-top {
    display: flex;
    gap: 8px;
    align-items: flex-start;
}

.plan-card-icon {
    font-size: 1.4rem;
    flex-shrink: 0;
}

.plan-card-info {
    flex: 1;
    min-width: 0;
}

.plan-card-title {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.plan-card-desc {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    margin-top: 2px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.plan-card-actions {
    display: flex;
    gap: 2px;
    opacity: 0;
    transition: opacity var(--transition);
}

.plan-card:hover .plan-card-actions {
    opacity: 1;
}

.plan-card-bottom {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 10px;
}

.plan-status-badge {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: var(--radius-full);
    white-space: nowrap;
}

.status-active {
    background: #d4f5e9;
    color: #27ae60;
}

.status-completed {
    background: var(--theme-primary-light);
    color: var(--theme-primary-dark);
}

.status-paused {
    background: #ffeaa7;
    color: #e17055;
}

.plan-progress-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
}

.plan-progress-bar {
    flex: 1;
    height: 5px;
    background: var(--color-border);
    border-radius: var(--radius-full);
    overflow: hidden;
}

.plan-progress-fill {
    height: 100%;
    background: var(--theme-primary-dark);
    border-radius: var(--radius-full);
    transition: width 0.3s ease;
}

.plan-progress-text {
    font-size: 0.7rem;
    color: var(--color-text-secondary);
    white-space: nowrap;
}

.plans-empty {
    text-align: center;
    padding: 40px 0;
    color: var(--color-text-secondary);
    font-size: 0.9rem;
}

.plans-empty span {
    font-size: 2rem;
    display: block;
    margin-bottom: 8px;
}

/* ── 右侧主区域 ── */
.plans-main {
    flex: 1;
    padding: 24px;
    overflow-y: auto;
    min-width: 0;
    scrollbar-width: none;
}

.plans-main::-webkit-scrollbar {
    display: none;
}

.timeline-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    color: var(--color-text-secondary);
    text-align: center;
    gap: 12px;
}

.timeline-empty-icon {
    font-size: 3rem;
}

.timeline-empty h3 {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text);
}

/* ── 时间线顶部信息 ── */
.timeline-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 28px;
    gap: 16px;
    flex-wrap: wrap;
}

.timeline-header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}

.timeline-header-left {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    flex: 1;
    min-width: 0;
}

.timeline-plan-icon {
    font-size: 2rem;
    flex-shrink: 0;
}

.timeline-plan-title {
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--color-text);
}

.timeline-plan-desc {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    margin-top: 4px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.timeline-header-info {
    min-width: 0;
}

/* ── 时间线 ── */
.timeline {
    display: flex;
    flex-direction: column;
    gap: 0;
}

.timeline-item {
    display: flex;
    gap: 16px;
    position: relative;
}

.timeline-line {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    width: 36px;
}

.timeline-dot {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    border: 2px solid var(--color-border);
    background: var(--color-surface);
    flex-shrink: 0;
    z-index: 1;
    transition: all var(--transition);
}

.dot-clickable {
    cursor: pointer;
}

.dot-clickable:hover {
    transform: scale(1.15);
    box-shadow: 0 0 0 4px var(--theme-primary-light);
}

.dot-pending {
    border-color: var(--color-border);
    background: var(--color-bg);
}

.dot-in_progress {
    border-color: #74b9ff;
    background: #d6eeff;
}

.dot-completed {
    border-color: var(--theme-primary-dark);
    background: var(--theme-primary-light);
}

.dot-skipped {
    border-color: var(--color-text-light);
    background: #f0f0f0;
}

.timeline-connector {
    width: 2px;
    flex: 1;
    min-height: 20px;
    background: var(--color-border);
    margin: 4px 0;
}

/* ── 步骤卡片 ── */
.timeline-card {
    flex: 1;
    min-width: 0;
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 16px;
    margin-bottom: 16px;
    background: var(--color-surface);
    transition: box-shadow var(--transition);
}

.timeline-card:hover {
    box-shadow: var(--shadow-md);
}

.step-completed .timeline-card {
    opacity: 0.75;
}

.step-skipped .timeline-card {
    opacity: 0.55;
}

.timeline-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
}

.timeline-card-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.timeline-step-num {
    font-size: 0.72rem;
    color: var(--color-text-secondary);
    font-weight: 500;
}

.step-badge {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: var(--radius-full);
    border: 1.5px solid var(--theme-primary-dark);
    color: var(--theme-primary-dark);
    background: var(--theme-primary-light);
}

.timeline-card-actions {
    display: flex;
    gap: 2px;
    opacity: 0;
    transition: opacity var(--transition);
}

.timeline-card:hover .timeline-card-actions {
    opacity: 1;
}

.timeline-card-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 6px;
}

.timeline-card-desc-wrap {
    margin-bottom: 10px;
}

.timeline-card-desc {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    line-height: 1.6;
    white-space: pre-wrap;
    margin: 0;
    overflow: hidden;
}

.timeline-card-desc.is-clamped {
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
    white-space: normal;
}

.desc-toggle-btn {
    margin-top: 4px;
    font-size: 0.75rem;
    color: var(--theme-primary-dark);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    font-weight: 600;
    transition: opacity 0.15s;
}

.desc-toggle-btn:hover {
    opacity: 0.7;
}

/* ── 时间线卡片多图网格 ── */
.step-img-grid {
    display: grid;
    gap: 3px;
    border-radius: var(--radius-sm);
    overflow: hidden;
    margin-bottom: 10px;
    cursor: zoom-in;
}

.step-img-grid.grid-1,
.step-img-grid.grid-2,
.step-img-grid.grid-3 {
    grid-template-columns: repeat(3, 1fr);
}

.step-img-cell {
    position: relative;
    aspect-ratio: 1;
    width: auto;
    height: auto;
    overflow: hidden;
    background: var(--color-border);
}

.step-img-cell img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform var(--transition);
}

.step-img-cell:hover img {
    transform: scale(1.04);
}

/* QQ 空间风格的 +N 遮罩 */
.img-more-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.52);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.6rem;
    font-weight: 800;
    color: #fff;
    letter-spacing: -1px;
}

.timeline-card-footer {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 8px;
}

.step-due {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
}

.step-due.overdue {
    color: #e17055;
    font-weight: 600;
}

.step-start {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
}

.step-completed-at {
    font-size: 0.75rem;
    color: #27ae60;
}

.step-status-group {
    margin-left: auto;
    display: flex;
    gap: 4px;
}

.step-status-btn {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    font-size: 0.85rem;
    cursor: pointer;
    border: 1.5px solid transparent;
    background: var(--color-bg);
    transition: all var(--transition);
}

.step-status-btn:hover {
    border-color: var(--theme-primary);
}

.step-status-btn.active {
    border-color: var(--theme-primary-dark);
    background: var(--theme-primary-light);
}

/* ── 按钮尺寸 ── */
.btn-sm {
    padding: 6px 14px;
    font-size: 0.82rem;
}

.btn-icon-sm {
    width: 28px;
    height: 28px;
    padding: 0;
    font-size: 0.85rem;
    border-radius: var(--radius-sm);
}

/* ── Modal ── */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 16px;
}

.modal {
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    width: 100%;
    max-width: 460px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: var(--shadow-lg);
    scrollbar-width: none;
}

.modal::-webkit-scrollbar {
    display: none;
}

.modal-lg {
    max-width: 560px;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 20px 0;
}

.modal-header h3 {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--color-text);
}

.modal-body {
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 0 20px 20px;
}

/* ── 表单 ── */
.form-group label {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--color-text-secondary);
}

.required {
    color: var(--theme-primary-dark);
}

.form-input {
    width: 100%;
    padding: 10px 12px;
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 0.9rem;
    font-family: inherit;
    transition: border-color var(--transition);
}

.form-input:focus {
    outline: none;
    border-color: var(--theme-primary-dark);
}

.form-textarea {
    resize: vertical;
    min-height: 72px;
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.form-row-dates {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
}

.mt-8 {
    margin-top: 8px;
}

/* Emoji Picker */
.emoji-picker {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.emoji-btn {
    width: 36px;
    height: 36px;
    font-size: 1.2rem;
    border-radius: var(--radius-sm);
    background: var(--color-bg);
    border: 1.5px solid transparent;
    cursor: pointer;
    transition: all var(--transition);
}

.emoji-btn:hover {
    border-color: var(--theme-primary);
}

.emoji-btn.active {
    border-color: var(--theme-primary-dark);
    background: var(--theme-primary-light);
}

/* Color Picker */
.color-picker {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.color-dot {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 2.5px solid transparent;
    cursor: pointer;
    transition: all var(--transition);
}

.color-dot:hover {
    transform: scale(1.15);
}

.color-dot.active {
    border-color: var(--theme-primary-dark);
    transform: scale(1.15);
}

/* Status Select */
.status-select {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.status-option {
    padding: 6px 12px;
    border-radius: var(--radius-full);
    font-size: 0.82rem;
    cursor: pointer;
    border: 1.5px solid var(--color-border);
    background: var(--color-bg);
    transition: all var(--transition);
}

.status-option:hover {
    border-color: var(--theme-primary);
}

.status-option.active {
    border-color: var(--theme-primary-dark);
    background: var(--theme-primary-light);
    font-weight: 600;
}

/* Badge Presets */
.badge-presets {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.badge-preset-btn {
    padding: 4px 10px;
    border-radius: var(--radius-full);
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    border: 1.5px solid var(--color-border);
    background: var(--color-bg);
    transition: all var(--transition);
}

.badge-preset-btn.active {
    font-weight: 700;
}

.clear-badge {
    color: var(--color-text-secondary);
}

.form-label-hint {
    font-size: 0.72rem;
    font-weight: 400;
    color: var(--color-text-light);
    margin-left: 4px;
}

/* ── 多图上传网格 ── */
.img-upload-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
}

.img-grid-cell {
    position: relative;
    aspect-ratio: 1;
    border-radius: var(--radius-sm);
    overflow: hidden;
    background: var(--color-border);
}

.img-grid-cell img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    cursor: zoom-in;
}

.img-grid-uploading {
    opacity: 0.65;
}

.img-cell-mask {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(2px);
}

.img-cell-remove {
    position: absolute;
    top: 3px;
    right: 3px;
    width: 18px;
    height: 18px;
    background: rgba(0, 0, 0, 0.55);
    color: white;
    border-radius: 50%;
    font-size: 10px;
    cursor: pointer;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
}

.img-add-cell {
    aspect-ratio: 1;
    border: 2px dashed var(--color-border);
    border-radius: var(--radius-sm);
    background: none;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    color: var(--color-text-secondary);
    font-size: 0.72rem;
    font-family: inherit;
    transition: border-color var(--transition), color var(--transition);
}

.img-add-cell span {
    font-size: 1.4rem;
}

.img-add-cell:hover {
    border-color: var(--theme-primary-dark);
    color: var(--theme-primary-dark);
}

/* ── 图片预览轮播 ── */
.img-preview-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.92);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 20px;
}

.img-preview {
    max-width: min(80vw, 900px);
    max-height: 80vh;
    object-fit: contain;
    border-radius: var(--radius-md);
    user-select: none;
    pointer-events: none;
}

/* 左右全高度点击区 -- 手指友好大面积 */
.preview-zone {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 22vw;
    max-width: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s;
}

.preview-zone--prev {
    left: 0;
}

.preview-zone--next {
    right: 0;
}

.preview-zone:hover {
    background: rgba(255, 255, 255, 0.06);
}

.preview-zone-arrow {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(4px);
    color: #fff;
    font-size: 1.3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1.5px solid rgba(255, 255, 255, 0.25);
    transition: background 0.15s, transform 0.15s;
}

.preview-zone:hover .preview-zone-arrow {
    background: rgba(0, 0, 0, 0.65);
    transform: scale(1.1);
}

.preview-counter {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    color: white;
    font-size: 13px;
    padding: 4px 16px;
    border-radius: var(--radius-full);
    pointer-events: none;
    letter-spacing: 0.05em;
}

.preview-close {
    position: absolute;
    top: 14px;
    right: 14px;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    border: 1.5px solid rgba(255, 255, 255, 0.3);
    color: white;
    font-size: 1rem;
    width: 40px;
    height: 40px;
    cursor: pointer;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background var(--transition);
    z-index: 10;
}

.preview-close:hover {
    background: rgba(255, 255, 255, 0.2);
}

.preview-close:hover {
    background: rgba(255, 255, 255, 0.32);
}

/* ── 移动端返回按钮 ── */
.mobile-back-btn {
    display: none;
}

/* ── 响应式：移动端 ── */
@media (max-width: 768px) {
    .plans-page {
        flex-direction: column;
        height: calc(100vh - 72px);
        overflow: hidden;
        position: relative;
    }

    .plans-sidebar {
        width: 100%;
        min-width: unset;
        border-right: none;
        flex: 1;
        max-height: none;
        padding: 16px;
        overflow-y: auto;
    }

    .plans-main {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: var(--color-bg);
        z-index: 10;
        padding: 16px;
        overflow-y: auto;
        transform: translateX(100%);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .mobile-show-detail .plans-main {
        transform: translateX(0);
    }

    .mobile-back-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: none;
        border: none;
        color: var(--theme-primary-dark);
        font-size: 15px;
        font-weight: 600;
        padding: 8px 0;
        margin-bottom: 8px;
        cursor: pointer;
    }

    .sidebar-title {
        font-size: 1rem;
    }

    .timeline-header {
        flex-direction: column;
        gap: 12px;
    }

    .form-row {
        grid-template-columns: 1fr;
    }

    .timeline-card-actions {
        opacity: 1;
    }

    .plan-card-actions {
        opacity: 1;
    }
}

/* ── 地图导航 ── */
.step-map-links {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 6px 0 4px;
    padding: 8px 10px;
    background: var(--theme-primary-light);
    border-radius: var(--radius-sm);
    border-left: 3px solid var(--theme-primary);
}

.step-map-label {
    font-size: 12px;
    color: var(--color-text-secondary);
    line-height: 1.4;
    word-break: break-all;
}

.step-map-btns {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.map-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    text-decoration: none;
    transition: opacity 0.15s, transform 0.1s;
    line-height: 1;
    /* button reset */
    border: none;
    cursor: pointer;
    font-family: inherit;
}

.map-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
}

.map-btn svg {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
}

.map-btn:hover {
    opacity: 0.85;
    transform: translateY(-1px);
}

.map-btn:active {
    transform: scale(0.97);
}

.map-btn--amap {
    background: #1aad19;
    color: #fff;
}

.map-btn--baidu {
    background: #3385ff;
    color: #fff;
}

.map-btn--tencent {
    background: #07C160;
    color: #fff;
}

/* ── 全部完成庆祝带 ── */
.all-done-banner {
    text-align: center;
    padding: 14px 20px;
    background: linear-gradient(135deg, #fff0f6, #ffe4f0);
    border: 1.5px solid var(--theme-primary);
    border-radius: var(--radius-lg);
    color: var(--theme-primary-dark);
    font-weight: 700;
    font-size: 0.95rem;
    margin-bottom: 24px;
    animation: popIn 0.3s ease;
}

/* ── 新步骤闪烁高亮 ── */
@keyframes stepFlash {

    0%,
    100% {
        box-shadow: none;
    }

    30% {
        box-shadow: 0 0 0 4px rgba(236, 72, 153, 0.35);
        background: #fff0f6;
    }

    60% {
        box-shadow: 0 0 0 2px rgba(236, 72, 153, 0.2);
    }
}

.step-flash>.timeline-card {
    animation: stepFlash 1.2s ease;
}

/* ── 时间线末尾添加行 ── */
.timeline-add-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0 24px;
    cursor: pointer;
    opacity: 0.45;
    transition: opacity 0.15s;
}

.timeline-add-row:hover {
    opacity: 1;
}

.timeline-add-dot {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px dashed var(--theme-primary-dark);
    color: var(--theme-primary-dark);
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.15s;
}

.timeline-add-row:hover .timeline-add-dot {
    background: var(--theme-primary-light);
}

.timeline-add-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--theme-primary-dark);
}

/* ── 分享弹窗 ── */
.share-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
    backdrop-filter: blur(4px);
}

.share-modal {
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    width: 420px;
    max-width: 90vw;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
    overflow: hidden;
    animation: modalSlideIn 0.2s ease;
}

.share-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 20px;
    border-bottom: 1px solid var(--color-border);
}

.share-modal-header h3 {
    font-size: 1rem;
    font-weight: 700;
    margin: 0;
}

.share-tabs {
    display: flex;
    border-bottom: 1px solid var(--color-border);
}

.share-tab {
    flex: 1;
    padding: 10px;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: all 0.15s;
}

.share-tab.active {
    color: var(--theme-primary-dark);
    border-bottom-color: var(--theme-primary-dark);
}

.share-panel {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.share-desc {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    line-height: 1.6;
    margin: 0;
}

.share-link-box {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--color-bg);
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: 8px 12px;
}

.share-link-text {
    flex: 1;
    font-size: 0.78rem;
    color: var(--color-text-secondary);
    word-break: break-all;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.share-link-actions {
    display: flex;
    gap: 8px;
}

.share-revoke-btn {
    color: #e17055;
    border-color: #e1705544;
}

.share-revoke-btn:hover {
    background: #e1705522;
    border-color: #e17055;
}

/* PIN 访问码展示 */
.share-pin-box {
    display: flex;
    align-items: center;
    gap: 10px;
    background: linear-gradient(135deg, #fff0f5, #f0f0ff);
    border: 1.5px dashed var(--theme-primary);
    border-radius: var(--radius-md);
    padding: 12px 16px;
}

.share-pin-label {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    flex-shrink: 0;
}

.share-pin-value {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: 8px;
    color: var(--theme-primary-dark);
    font-family: 'Courier New', monospace;
    flex: 1;
}

/* 过期时间提示 */
.share-expires-tip {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
}

/* 过期时间选择器 */
.share-expires-row {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.share-expires-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text-secondary);
}

.share-expires-btns {
    display: flex;
    gap: 6px;
}

.share-expires-btn {
    flex: 1;
    padding: 7px 0;
    font-size: 0.8rem;
    font-weight: 600;
    border: 1.5px solid var(--color-border);
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all var(--transition);
    font-family: inherit;
}

.share-expires-btn.active {
    border-color: var(--theme-primary);
    background: var(--theme-primary-light);
    color: var(--theme-primary-dark);
}

.share-expires-btn:hover:not(.active) {
    border-color: var(--theme-primary);
    color: var(--theme-primary-dark);
}

/* ── 返回顶部按钮 ── */
.back-to-top-btn {
    position: fixed;
    right: 28px;
    bottom: 32px;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--theme-primary);
    color: #fff;
    border: none;
    font-size: 1.4rem;
    line-height: 1;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(236, 72, 153, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s, box-shadow 0.15s;
    z-index: 900;
}

@media (max-width: 767px) {
    .back-to-top-btn {
        bottom: 80px;
    }
}

.back-to-top-btn:hover {
    transform: translateY(-3px) scale(1.08);
    box-shadow: 0 6px 20px rgba(236, 72, 153, 0.45);
}

.back-top-fade-enter-active,
.back-top-fade-leave-active {
    transition: opacity 0.2s, transform 0.2s;
}

.back-top-fade-enter-from,
.back-top-fade-leave-to {
    opacity: 0;
    transform: translateY(12px) scale(0.85);
}

/* ── 侧边栏标题操作区 ── */
.sidebar-header-actions {
    display: flex;
    align-items: center;
    gap: 6px;
}

/* ── 查看分享行程弹窗 ── */
.share-lookup-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
    backdrop-filter: blur(4px);
}

.share-lookup-modal {
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    width: 400px;
    max-width: 92vw;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
    overflow: hidden;
    animation: modalSlideIn 0.2s ease;
}

.share-lookup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 20px;
    border-bottom: 1px solid var(--color-border);
}

.share-lookup-header h3 {
    font-size: 1rem;
    font-weight: 700;
    margin: 0;
}

.share-lookup-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.share-lookup-hint {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    margin: 0;
    line-height: 1.6;
}

.share-lookup-input-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.share-lookup-input-row .form-input {
    flex: 1;
    min-width: 0;
}

.share-lookup-clip-btn {
    flex-shrink: 0;
    font-size: 1rem;
}

.share-lookup-error {
    font-size: 0.82rem;
    color: #e17055;
    margin: 0;
}

.share-lookup-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 14px 20px;
    border-top: 1px solid var(--color-border);
}

/* ── 协作角色标识 ── */
.plan-role-badge {
    display: inline-block;
    font-size: 0.7rem;
    padding: 1px 6px;
    border-radius: 10px;
    background: #e4e8f8;
    color: #6c5ce7;
    font-weight: 600;
    margin-left: 6px;
    vertical-align: middle;
}

/* ── 协作者弹窗 ── */
.collab-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1100;
    backdrop-filter: blur(4px);
}

.collab-modal {
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    width: 400px;
    max-width: 92vw;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
    overflow: hidden;
    animation: modalSlideIn 0.2s ease;
}

.collab-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 20px;
    border-bottom: 1px solid var(--color-border);
}

.collab-header h3 {
    font-size: 1rem;
    font-weight: 700;
    margin: 0;
}

.collab-body {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.collab-invite-row {
    display: flex;
    gap: 8px;
}

.collab-invite-row .form-input {
    flex: 1;
    min-width: 0;
}

.collab-error {
    font-size: 0.82rem;
    color: #e17055;
    margin: 0;
}

.collab-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 260px;
    overflow-y: auto;
}

.collab-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: var(--color-bg);
}

.collab-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 700;
    font-size: 0.8rem;
    flex-shrink: 0;
}

.collab-info {
    flex: 1;
    min-width: 0;
}

.collab-name {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--color-text);
}

.collab-sub {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    margin-left: 6px;
}

.collab-empty {
    text-align: center;
    padding: 16px;
    color: var(--color-text-secondary);
    font-size: 0.85rem;
}
</style>
