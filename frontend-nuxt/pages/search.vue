<template>
  <MigrationPlaceholder title="全局搜索" description="全局搜索页面迁移中。" />
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
useHead({ title: '全局搜索 - Mini Note' })
</script>
