import { ref } from 'vue'

export const alertState = ref(null)
// alertState.value = {
//   type: 'alert' | 'confirm',
//   icon: string,
//   title: string,
//   message: string,
//   confirmText: string,
//   cancelText: string,
//   variant: 'default' | 'danger',
//   resolve: Function,
// }

/**
 * 弹出提示框（仅确认按钮）
 * @param {string} message
 * @param {object} options - { title, icon, confirmText }
 */
export function showAlert(message, options = {}) {
  return new Promise(resolve => {
    const variant = options.variant ?? 'default'
    alertState.value = {
      type: 'alert',
      message,
      title: options.title ?? '提示',
      icon: options.icon ?? (variant === 'danger' ? 'danger' : 'info'),
      confirmText: options.confirmText ?? '好的',
      variant,
      resolve,
    }
  })
}

/**
 * 弹出确认框（确认 / 取消）
 * @param {string} message
 * @param {object} options - { title, icon, confirmText, cancelText, variant }
 * @returns {Promise<boolean>}
 */
export function showConfirm(message, options = {}) {
  return new Promise(resolve => {
    const variant = options.variant ?? 'default'
    alertState.value = {
      type: 'confirm',
      message,
      title: options.title ?? '确认操作',
      icon: options.icon ?? (variant === 'danger' ? 'danger' : 'help'),
      confirmText: options.confirmText ?? '确认',
      cancelText: options.cancelText ?? '取消',
      variant,
      resolve,
    }
  })
}
