<template>
  <MigrationPlaceholder title="日历记事" description="日历页迁移中。" />
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
useHead({ title: '日历记事' })
</script>
