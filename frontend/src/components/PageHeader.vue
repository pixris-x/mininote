<template>
  <div class="page-header">
    <div class="header-top">
      <div class="header-heading">
        <h1 class="page-title">
          <component :is="icon" v-if="icon" class="title-icon" :size="20" />
          <span>{{ title }}</span>
        </h1>
        <slot name="subtitle">
          <p v-if="subtitle" class="page-sub">{{ subtitle }}</p>
        </slot>
      </div>
      <div v-if="$slots.actions" class="header-actions">
        <slot name="actions" />
      </div>
    </div>
    <slot />
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  icon: { type: [Object, Function], default: null }
})
</script>

<style scoped lang="scss" src="@/assets/styles/components/PageHeader.scss"></style>
