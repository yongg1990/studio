<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <span class="sidebar-header-title">功能导航</span>
    </div>

    <el-menu
      :default-active="activePath"
      class="sidebar-menu"
      :router="true"
      unique-opened
    >
      <!-- 1. Workspace -->
      <el-menu-item index="/workspace">
        <el-icon><DataBoard /></el-icon>
        <span class="menu-name">{{ workspaceMenu.title }}</span>
      </el-menu-item>

      <!-- Section: 对接规范体系 (按 01-06 序号排列) -->
      <div class="menu-section-divider">
        <span>规范文档对接目录 (01-06)</span>
      </div>

      <el-sub-menu v-for="group in specMenuGroups" :key="group.index" :index="group.index">
        <template #title>
          <el-icon v-if="group.icon"><component :is="group.icon" /></el-icon>
          <span class="group-title">{{ group.title }}</span>
        </template>
        <el-menu-item
          v-for="item in group.items"
          :key="item.path"
          :index="item.path"
        >
          <span class="menu-name">{{ item.title }}</span>
        </el-menu-item>
      </el-sub-menu>

      <!-- Section: 平台基础与协同业务 (未提取的原有菜单) -->
      <div class="menu-section-divider">
        <span>平台基础与业务协同</span>
      </div>

      <el-sub-menu v-for="group in legacyMenuGroups" :key="group.index" :index="group.index">
        <template #title>
          <el-icon><component :is="group.icon" /></el-icon>
          <span class="group-title">{{ group.title }}</span>
        </template>
        <el-menu-item
          v-for="item in group.items"
          :key="item.path"
          :index="item.path"
        >
          <span class="menu-name">{{ item.title }}</span>
        </el-menu-item>
      </el-sub-menu>
    </el-menu>

    <!-- Sidebar Compliance & Spec Footer -->
    <div class="sidebar-footer">
      <div class="footer-spec-title">标准规范支撑</div>
      <div class="spec-pills">
        <span class="spec-pill">GB/T 31774</span>
        <span class="spec-pill">国家16位医保码</span>
        <span class="spec-pill">OpenAPI 3.1</span>
      </div>
      <div class="footer-meta">中药互通互认平台 · 事实引擎与交换中心</div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { getPageApiInfo } from '@/config/pageApiRegistry';
import {
  DataBoard,
  Files,
  Document,
  List,
  Switch,
  Platform,
  Key,
  Operation,
  Service,
  Cpu,
  Tickets,
  Lock,
  Share,
  Link,
  Promotion,
  Goods,
  OfficeBuilding,
  Connection,
  Tools
} from '@element-plus/icons-vue';

const route = useRoute();
const activePath = computed(() => route.fullPath || route.path);

const workspaceMenu = {
  title: '工作台',
  path: '/workspace',
  hasApi: false,
  apiPath: ''
};

// 1. 对接文档栏菜单 (按照 APP-01 -> APP-03 -> APP-04 -> APP-06 序号严格排列)
const specMenuDefinitions = [
  // APP-01
  {
    order: '01',
    title: '上传文件',
    index: 'spec-01-files',
    icon: Files,
    items: [
      { title: '租户文件目录与查询', path: '/trust/files-credentials?tab=tenant-files' },
      { title: '文件上传与元数据', path: '/trust/files-credentials?tab=tenant-files&action=upload' }
    ]
  },

  // APP-03
  {
    order: '03',
    title: '数据元管理',
    index: 'spec-03-data-elements',
    icon: Document,
    items: [
      { title: '数据元目录查询与维护', path: '/governance/standards?section=elements' },
      { title: '从已上传文件导入数据元', path: '/governance/standards?section=elements&action=import' }
    ]
  },
  {
    order: '03',
    title: '值域管理',
    index: 'spec-03-valuesets',
    icon: List,
    items: [
      { title: '值域代码集定义', path: '/governance/standards?section=valuesets' },
      { title: '代码项明细与有效项', path: '/governance/standards?section=valuesets' }
    ]
  },
  {
    order: '03',
    title: '系统值域映射',
    index: 'spec-03-mappings',
    icon: Switch,
    items: [
      { title: '自有码值映射维护', path: '/governance/mappings?tab=valueSetMappings' },
      { title: '字段映射试算与预检', path: '/governance/mappings?tab=precheck' }
    ]
  },
  {
    order: '03',
    title: '来源系统管理',
    index: 'spec-03-sources',
    icon: Platform,
    items: [
      { title: '来源系统注册与维护', path: '/governance/sources' }
    ]
  },
  {
    order: '03',
    title: '来源系统密钥管理',
    index: 'spec-03-source-keys',
    icon: Key,
    items: [
      { title: '系统密钥登记与证书', path: '/governance/source-keys' }
    ]
  },
  {
    order: '03',
    title: '来源接入与数据治理',
    index: 'spec-03-batches',
    icon: Operation,
    items: [
      { title: '原始接入记录与重放', path: '/governance/batches?tab=rawRecords' },
      { title: '接入批次任务管理', path: '/governance/batches?tab=batchJobs' }
    ]
  },
  {
    order: '03',
    title: '事件对接助手',
    index: 'spec-03-assistant',
    icon: Service,
    items: [
      { title: '事件上报对接助手', path: '/governance/integration-assistant' }
    ]
  },

  // APP-04
  {
    order: '04',
    title: '事件配置与事实引擎',
    index: 'spec-04-event-facts',
    icon: Cpu,
    items: [
      { title: '已治理事实事件查询', path: '/trust/events' }
    ]
  },
  {
    order: '04',
    title: '事件 Schema 管理',
    index: 'spec-04-schemas',
    icon: Tickets,
    items: [
      { title: 'Schema 定义与单字段管理', path: '/governance/events' }
    ]
  },
  {
    order: '04',
    title: '事件类型授权',
    index: 'spec-04-authorizations',
    icon: Lock,
    items: [
      { title: '租户项目事件授权', path: '/governance/event-authorizations' }
    ]
  },

  // APP-06
  {
    order: '06',
    title: '交换方案管理',
    index: 'spec-06-profiles',
    icon: Share,
    items: [
      { title: '互通规范方案列表', path: '/exchange/profiles' },
      { title: '规范版本与规则配置', path: '/exchange/profile-config' }
    ]
  },
  {
    order: '06',
    title: '查询方案授权绑定管理',
    index: 'spec-06-bindings',
    icon: Link,
    items: [
      { title: '项目与方案授权绑定', path: '/exchange/profile-config?kind=binding' }
    ]
  },
  {
    order: '06',
    title: '查询方案对接助手',
    index: 'spec-06-exchange-assistant',
    icon: Promotion,
    items: [
      { title: '方案查询明文与模拟加密', path: '/exchange/queries?tab=assistant' },
      { title: '加密方案同步查询', path: '/exchange/queries?tab=encrypted' }
    ]
  }
];

// 2. 未提取的原有菜单（保留在原位置）
const legacyMenuDefinitions = [
  {
    title: '业务协同场景',
    index: 'legacy-business',
    icon: Goods,
    items: [
      { title: '田间种植', path: '/business/field' },
      { title: '加工与质量', path: '/business/process-quality' },
      { title: '饮片赋码', path: '/business/coding' },
      { title: '供销交割', path: '/business/supply' },
      { title: '处方代煎', path: '/business/decoction' },
      { title: '通用事件录入', path: '/business/events/new' }
    ]
  },
  {
    title: '主数据中心',
    index: 'legacy-master-data',
    icon: OfficeBuilding,
    items: [
      { title: '主体', path: '/master-data/parties' },
      { title: '标识命名空间', path: '/master-data/identifier-namespaces' },
      { title: '业务对象登记', path: '/master-data/objects' },
      { title: '标识绑定', path: '/master-data/identifier-bindings' },
      { title: '监管编码主数据', path: '/master-data/code-schemes' },
      { title: '饮片品种管理', path: '/master-data/decoction-pieces' }
    ]
  },
  {
    title: '可信存证与血缘',
    index: 'legacy-trust',
    icon: Connection,
    items: [
      { title: '血缘分析图谱', path: '/trust/lineage' },
      { title: '证据文件', path: '/trust/evidence' },
      { title: '脱敏凭证', path: '/trust/files-credentials?tab=credentials' },
      { title: '存证单与 Merkle', path: '/trust/proofs' },
      { title: '治理异常案卷', path: '/governance/cases' }
    ]
  },
  {
    title: '数据物化与交付',
    index: 'legacy-exchange-delivery',
    icon: Share,
    items: [
      { title: '互通投影与交付', path: '/exchange/projections' },
      { title: '业务实体与状态查询', path: '/exchange/queries?tab=direct' }
    ]
  },
  {
    title: '平台配置与组织权限',
    index: 'legacy-platform',
    icon: Tools,
    items: [
      { title: '租户管理', path: '/settings/tenants' },
      { title: '角色与权限', path: '/settings/roles' },
      { title: '通用字典', path: '/settings/dictionaries' },
      { title: '用户管理', path: '/settings/users' },
      { title: '项目协同空间', path: '/settings/tenant-project' },
      { title: '前置节点部署', path: '/settings/deployments-edge' },
      { title: '订阅与异步任务', path: '/operations/subscriptions-jobs' },
      { title: '审计与告警', path: '/operations/audit-alerts' }
    ]
  }
];

const enrichItems = (items: Array<{ title: string; path: string }>) => items.map(item => ({
  ...item,
  hasApi: !!getPageApiInfo(item.path.split('?')[0]),
  apiPath: getPageApiInfo(item.path.split('?')[0])?.apiPath || ''
}));

const specMenuGroups = computed(() => specMenuDefinitions.map(group => ({
  ...group,
  items: enrichItems(group.items)
})));

const legacyMenuGroups = computed(() => legacyMenuDefinitions.map(group => ({
  ...group,
  items: enrichItems(group.items)
})));
</script>

<style scoped>
.sidebar {
  width: 252px;
  flex-shrink: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbfa 100%);
  border-right: 1px solid #d2e2de;
}
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--color-border-subtle);
  background: transparent;
}
.sidebar-header-title {
  color: var(--color-muted);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.sidebar-menu {
  flex: 1;
  border-right: none;
  padding: 5px 0 12px;
}
.menu-section-divider {
  padding: 12px 14px 4px;
  font-size: 10px;
  font-weight: 750;
  color: #7d9692;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
.menu-name, .group-title {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
:deep(.el-menu) {
  background: transparent;
  border-right: 0;
}
:deep(.el-sub-menu__title) {
  height: 42px;
  margin: 2px 8px 0;
  padding-left: 12px !important;
  border-radius: 6px;
  color: #435e5a;
  font-size: 13px;
  font-weight: 650;
  line-height: 42px;
}
:deep(.el-sub-menu__title:hover) {
  background: #eef7f5;
  color: var(--color-brand);
}
:deep(.el-menu-item) {
  display: flex !important;
  align-items: center !important;
  height: 38px;
  margin: 1px 8px;
  padding-left: 32px !important;
  padding-right: 12px !important;
  border-radius: 6px;
  color: #556e6b;
  font-size: 12.5px;
  line-height: 38px;
}
:deep(.el-menu-item:hover) {
  background: #eef7f5;
  color: var(--color-brand);
}
:deep(.el-menu-item.is-active) {
  color: var(--color-brand) !important;
  font-weight: 700;
  background: linear-gradient(90deg, #e2f4f0, #eff9f7);
  border-right: 0;
  box-shadow: inset 3px 0 var(--color-brand), 0 2px 7px rgba(15, 118, 110, 0.08);
}
:deep(.el-sub-menu .el-menu) {
  background: transparent;
}
:deep(.el-menu-item .el-icon), :deep(.el-sub-menu__title .el-icon) {
  color: #79a19b;
  font-size: 16px;
  margin-right: 6px;
}
:deep(.el-menu-item.is-active .el-icon), :deep(.el-sub-menu.is-opened > .el-sub-menu__title .el-icon) {
  color: var(--color-brand);
}
.sidebar-footer {
  flex-shrink: 0;
  padding: 14px 16px;
  border-top: 1px solid var(--color-border);
  background: rgba(239, 247, 245, 0.72);
}
.footer-spec-title {
  margin-bottom: 6px;
  color: #58716d;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.2px;
}
.spec-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}
.spec-pill {
  padding: 2px 5px;
  border: 1px solid #c5e1db;
  border-radius: 4px;
  background: #eaf6f3;
  color: #18776d;
  font-size: 9px;
  font-weight: 700;
}
.footer-meta {
  color: #8da6a1;
  font-size: 9.5px;
}
@media (max-width: 900px) {
  .sidebar {
    width: 220px;
  }
}
</style>
