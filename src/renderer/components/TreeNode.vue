<template>
  <div
    class="tree-node-wrapper"
    @click="$emit('select', item)"
  >
    <div
      class="tree-node-row"
      :style="{ paddingLeft: depth * 16 + 8 + 'px' }"
      :class="{ active: item.path === activePath }"
      @contextmenu.prevent="$emit('contextmenu', $event, item)"
    >
      <!-- Expand icon -->
      <span class="expand-icon" v-if="item.isDirectory">
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          :style="{ transform: item.expanded ? 'rotate(90deg)' : '', transition: 'transform 0.15s' }"
        >
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </span>
      <span class="expand-icon placeholder" v-else></span>

      <!-- File/Folder icon -->
      <span class="node-icon">
        <svg v-if="item.isDirectory" width="14" height="14" viewBox="0 0 24 24" fill="none"
          :stroke="item.expanded ? 'var(--mawu-accent)' : 'var(--mawu-text-muted)'" stroke-width="1.5">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
        </svg>
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mawu-text-secondary)" stroke-width="1.5">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/>
        </svg>
      </span>

      <!-- Name -->
      <span class="node-name">{{ item.name }}</span>
    </div>

    <!-- Children -->
    <div class="tree-children" v-if="item.isDirectory && item.expanded && item.children">
      <TreeNode
        v-for="child in item.children"
        :key="child.path"
        :item="child"
        :depth="depth + 1"
        :active-path="activePath"
        :clipboard="clipboard"
        @select="$emit('select', $event)"
        @contextmenu="$emit('contextmenu', $event, $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  item: any
  depth: number
  activePath: string | null
  clipboard: any
}>()

defineEmits(['select', 'contextmenu'])
</script>

<style scoped>
.tree-node-wrapper {
  user-select: none;
}

.tree-node-row {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding-right: 8px;
  cursor: pointer;
  transition: background 0.1s;
  border-radius: 0;
}

.tree-node-row:hover {
  background: var(--mawu-bg-hover);
}

.tree-node-row.active {
  background: rgba(0, 212, 255, 0.06);
  border-right: 2px solid var(--mawu-accent);
}

.expand-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--mawu-text-muted);
}

.expand-icon.placeholder {
  width: 16px;
}

.node-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.node-name {
  font-size: 13px;
  color: var(--mawu-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
