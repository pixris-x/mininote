<template>
    <div class="tiptap-wrapper">
        <!-- 工具栏 -->
        <div class="tiptap-toolbar" v-if="editor && editable">
            <button class="tool-btn" :class="{ active: editor.isActive('bold') }"
                @click="editor.chain().focus().toggleBold().run()" title="加粗">
                <BoldIcon :size="15" />
            </button>
            <button class="tool-btn" :class="{ active: editor.isActive('italic') }"
                @click="editor.chain().focus().toggleItalic().run()" title="斜体">
                <ItalicIcon :size="15" />
            </button>
            <button class="tool-btn" :class="{ active: editor.isActive('underline') }"
                @click="editor.chain().focus().toggleUnderline().run()" title="下划线">
                <UnderlineIcon :size="15" />
            </button>
            <button class="tool-btn" :class="{ active: editor.isActive('strike') }"
                @click="editor.chain().focus().toggleStrike().run()" title="删除线">
                <StrikethroughIcon :size="15" />
            </button>

            <span class="tool-sep"></span>

            <button class="tool-btn" :class="{ active: editor.isActive('heading', { level: 1 }) }"
                @click="editor.chain().focus().toggleHeading({ level: 1 }).run()" title="标题1">
                <Heading1Icon :size="15" />
            </button>
            <button class="tool-btn" :class="{ active: editor.isActive('heading', { level: 2 }) }"
                @click="editor.chain().focus().toggleHeading({ level: 2 }).run()" title="标题2">
                <Heading2Icon :size="15" />
            </button>
            <button class="tool-btn" :class="{ active: editor.isActive('heading', { level: 3 }) }"
                @click="editor.chain().focus().toggleHeading({ level: 3 }).run()" title="标题3">
                <Heading3Icon :size="15" />
            </button>

            <span class="tool-sep"></span>

            <button class="tool-btn" :class="{ active: editor.isActive('bulletList') }"
                @click="editor.chain().focus().toggleBulletList().run()" title="无序列表">
                <ListIcon :size="15" />
            </button>
            <button class="tool-btn" :class="{ active: editor.isActive('orderedList') }"
                @click="editor.chain().focus().toggleOrderedList().run()" title="有序列表">
                <ListOrderedIcon :size="15" />
            </button>
            <button class="tool-btn" :class="{ active: editor.isActive('taskList') }"
                @click="editor.chain().focus().toggleTaskList().run()" title="任务列表">
                <ListChecksIcon :size="15" />
            </button>

            <span class="tool-sep"></span>

            <button class="tool-btn" :class="{ active: editor.isActive('blockquote') }"
                @click="editor.chain().focus().toggleBlockquote().run()" title="引用">
                <QuoteIcon :size="15" />
            </button>
            <button class="tool-btn" :class="{ active: editor.isActive('code') }"
                @click="editor.chain().focus().toggleCode().run()" title="行内代码">
                <CodeIcon :size="15" />
            </button>
            <button class="tool-btn" :class="{ active: editor.isActive('codeBlock') }"
                @click="editor.chain().focus().toggleCodeBlock().run()" title="代码块">
                <SquareCodeIcon :size="15" />
            </button>

            <span class="tool-sep"></span>

            <button class="tool-btn" @click="setLink" :class="{ active: editor.isActive('link') }" title="链接">
                <LinkIcon :size="15" />
            </button>
            <button class="tool-btn" @click="showImgModal = true" title="图片">
                <ImagePlusIcon :size="15" />
            </button>

            <span class="tool-sep"></span>

            <button class="tool-btn" :class="{ active: editor.isActive({ textAlign: 'left' }) }"
                @click="editor.chain().focus().setTextAlign('left').run()" title="左对齐">
                <AlignLeftIcon :size="15" />
            </button>
            <button class="tool-btn" :class="{ active: editor.isActive({ textAlign: 'center' }) }"
                @click="editor.chain().focus().setTextAlign('center').run()" title="居中">
                <AlignCenterIcon :size="15" />
            </button>
            <button class="tool-btn" :class="{ active: editor.isActive({ textAlign: 'right' }) }"
                @click="editor.chain().focus().setTextAlign('right').run()" title="右对齐">
                <AlignRightIcon :size="15" />
            </button>

            <span class="tool-sep"></span>

            <button class="tool-btn" @click="editor.chain().focus().undo().run()" :disabled="!editor.can().undo()"
                title="撤销">
                <Undo2Icon :size="15" />
            </button>
            <button class="tool-btn" @click="editor.chain().focus().redo().run()" :disabled="!editor.can().redo()"
                title="重做">
                <Redo2Icon :size="15" />
            </button>
        </div>

        <!-- 编辑区 -->
        <EditorContent class="tiptap-content" :class="{ 'tiptap-readonly': !editable }" :editor="editor" />

        <!-- 图片上传弹窗 -->
        <Teleport to="body">
            <div v-if="showImgModal" class="img-modal-overlay" @click.self="closeImgModal">
                <div class="img-modal-card">
                    <div class="img-modal-header">
                        <span>插入图片</span>
                        <button class="img-modal-close" @click="closeImgModal">
                            <XIcon :size="14" />
                        </button>
                    </div>

                    <div class="img-modal-tabs">
                        <button :class="['img-tab', imgTab === 'upload' && 'active']"
                            @click="imgTab = 'upload'">上传文件</button>
                        <button :class="['img-tab', imgTab === 'url' && 'active']" @click="imgTab = 'url'">输入链接</button>
                    </div>

                    <div v-if="imgTab === 'upload'">
                        <div class="img-dropzone" :class="{ dragging: isDragging, uploading: imgUploading }"
                            @dragover.prevent="isDragging = true" @dragleave="isDragging = false" @drop.prevent="onDrop"
                            @click="fileInput.click()">
                            <input ref="fileInput" type="file" accept="image/*" multiple style="display:none"
                                @change="onFileChange" />
                            <div v-if="imgUploading" class="dz-uploading">
                                <div class="dz-spinner"></div>
                                <span>上传中...</span>
                            </div>
                            <div v-else class="dz-hint">
                                <ImagePlusIcon :size="15" />
                                <p><u>点击上传</u> 或拖拽图片到此处</p>
                                <p class="dz-sub">支持 JPG / PNG / GIF / WebP，最大 5MB</p>
                            </div>
                        </div>
                        <p v-if="imgError" class="img-error">{{ imgError }}</p>
                    </div>

                    <div v-if="imgTab === 'url'" class="img-url-section">
                        <input v-model="imgUrl" class="img-url-input" placeholder="https://..."
                            @keydown.enter="insertByUrl" />
                        <button class="img-confirm-btn" @click="insertByUrl" :disabled="!imgUrl">插入</button>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent, VueNodeViewRenderer } from '@tiptap/vue-3'
import { Node, mergeAttributes } from '@tiptap/core'
import { uploadApi } from '@/api'
import ResizableImageView from '@/components/ResizableImageView.vue'
import {
    Bold as BoldIcon,
    Italic as ItalicIcon,
    Underline as UnderlineIcon,
    Strikethrough as StrikethroughIcon,
    Heading1 as Heading1Icon,
    Heading2 as Heading2Icon,
    Heading3 as Heading3Icon,
    List as ListIcon,
    ListOrdered as ListOrderedIcon,
    ListChecks as ListChecksIcon,
    Quote as QuoteIcon,
    Code as CodeIcon,
    SquareCode as SquareCodeIcon,
    Link as LinkIcon,
    ImagePlus as ImagePlusIcon,
    AlignLeft as AlignLeftIcon,
    AlignCenter as AlignCenterIcon,
    AlignRight as AlignRightIcon,
    Undo2 as Undo2Icon,
    Redo2 as Redo2Icon,
    X as XIcon
} from 'lucide-vue-next'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'

// 可调整大小的图片扩展
const ResizableImage = Node.create({
    name: 'image',
    group: 'block',
    atom: true,
    draggable: true,
    addAttributes() {
        return {
            src: { default: null },
            alt: { default: null },
            title: { default: null },
            width: { default: null },
        }
    },
    parseHTML() {
        return [{
            tag: 'img[src]',
            getAttrs: el => ({
                src: el.getAttribute('src'),
                alt: el.getAttribute('alt'),
                title: el.getAttribute('title'),
                width: el.getAttribute('width') ? parseInt(el.getAttribute('width')) : null,
            })
        }]
    },
    renderHTML({ HTMLAttributes }) {
        return ['img', mergeAttributes(HTMLAttributes)]
    },
    addNodeView() {
        return VueNodeViewRenderer(ResizableImageView)
    },
})
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Underline from '@tiptap/extension-underline'

const props = defineProps({
    modelValue: { type: String, default: '' },
    placeholder: { type: String, default: '写点什么...' },
    editable: { type: Boolean, default: true }
})

const emit = defineEmits(['update:modelValue', 'change'])

const editor = useEditor({
    content: props.modelValue,
    extensions: [
        StarterKit,
        Underline,
        Placeholder.configure({ placeholder: props.placeholder }),
        ResizableImage,
        Link.configure({ openOnClick: false }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        TextStyle,
        Color,
        TaskList,
        TaskItem.configure({ nested: true }),
    ],
    onUpdate({ editor }) {
        const html = editor.getHTML()
        emit('update:modelValue', html)
        emit('change', html)
    }
})

// 外部数据变化时同步（如加载数据后）
watch(() => props.modelValue, (val) => {
    if (!editor.value) return
    const current = editor.value.getHTML()
    if (val !== current) {
        editor.value.commands.setContent(val || '', false)
    }
})

// editable 变化时同步
watch(() => props.editable, (val) => {
    if (editor.value) editor.value.setEditable(val)
}, { immediate: false })

function setLink() {
    const prev = editor.value.getAttributes('link').href || ''
    const url = window.prompt('输入链接地址', prev)
    if (url === null) return
    if (url === '') {
        editor.value.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
        editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
}

// 图片弹窗状态
const showImgModal = ref(false)
const imgTab = ref('upload')
const imgUrl = ref('')
const imgError = ref('')
const imgUploading = ref(false)
const isDragging = ref(false)
const fileInput = ref(null)

function closeImgModal() {
    showImgModal.value = false
    imgUrl.value = ''
    imgError.value = ''
    isDragging.value = false
    imgTab.value = 'upload'
}

function insertImage(url) {
    editor.value.chain().focus().insertContent({
        type: 'image',
        attrs: { src: url }
    }).run()
    closeImgModal()
}

function insertByUrl() {
    if (imgUrl.value) insertImage(imgUrl.value)
}

async function uploadFiles(files) {
    imgError.value = ''
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!validFiles.length) { imgError.value = '请选择图片文件'; return }
    imgUploading.value = true
    try {
        for (const file of validFiles) {
            const res = await uploadApi.image(file)
            if (res.success) insertImage(res.url)
            else imgError.value = '上传失败'
        }
    } catch (e) {
        imgError.value = e.message || '上传失败'
    } finally {
        imgUploading.value = false
    }
}

function onFileChange(e) {
    uploadFiles(e.target.files)
    e.target.value = ''
}

function onDrop(e) {
    isDragging.value = false
    uploadFiles(e.dataTransfer.files)
}

onBeforeUnmount(() => {
    editor.value?.destroy()
})
</script>

<style scoped lang="scss" src="@/assets/styles/components/TiptapEditor.scss"></style>
