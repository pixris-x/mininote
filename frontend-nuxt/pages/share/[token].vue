<template>
  <MigrationPlaceholder title="计划分享" :description="`分享页面迁移中，Token=${route.params.token}`" />
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })
const route = useRoute()
useHead({ title: '计划分享 - Mini Note' })
</script>
