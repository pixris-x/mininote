<template>
  <main class="page">
    <section class="card space-y-2">
      <h1 class="text-xl font-bold">{{ title }}</h1>
      <p class="text-sm text-[var(--color-text-secondary)]">{{ description }}</p>
      <p class="text-xs text-[var(--color-text-light)]">迁移状态：路由已落位，页面逻辑待迁移。</p>
    </section>
  </main>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()
</script>

