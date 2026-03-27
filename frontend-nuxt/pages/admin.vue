<template>
  <MigrationPlaceholder title="管理面板" description="管理面板迁移中。" />
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'admin'] })
useHead({ title: '管理面板 - Mini Note' })
</script>
