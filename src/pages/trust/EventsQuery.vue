<template>
  <div class="trust-page">
    <PageHeader
      title="可信业务事件"
      subtitle="APP-04 事实引擎已治理规范业务事件数据查询与全链追溯"
    >
      <template #actions>
        <el-button @click="loadEvents">刷新列表</el-button>
        <el-button type="primary" @click="router.push('/business/events/new')">+ 上报新事件</el-button>
      </template>
    </PageHeader>

    <FilterBar @search="handleSearch" @reset="handleReset">
      <el-input v-model="filters.eventId" placeholder="事件 ID" style="width: 170px" clearable />
      <el-input v-model="filters.eventType" placeholder="事件类型代码" style="width: 180px" clearable />
      <el-input v-model="filters.sourceBusinessKey" placeholder="来源业务键" style="width: 180px" clearable />
      <el-select v-model="filters.processingStatus" placeholder="处理状态" style="width: 150px" clearable>
        <el-option label="全部状态" value="" />
        <el-option label="已处理 COMPLETED" value="COMPLETED" />
        <el-option label="处理中 PROCESSING" value="PROCESSING" />
        <el-option label="待处理 PENDING" value="PENDING" />
        <el-option label="已拒绝 REJECTED" value="REJECTED" />
      </el-select>
      <el-date-picker
        v-model="dateRange"
        type="datetimerange"
        range-separator="至"
        start-placeholder="发生时间起"
        end-placeholder="发生时间止"
        value-format="YYYY-MM-DD HH:mm:ss"
        style="width: 330px"
      />
    </FilterBar>

    <div class="panel">
      <div class="panel-header">
        <h2>已治理业务事件列表 (共 {{ totalCount }} 条)</h2>
      </div>
      <el-table :data="events" v-loading="loading" @row-click="openDetailDrawer" style="width: 100%; cursor: pointer">
        <el-table-column prop="eventId" label="事件 ID" width="160" class-name="mono">
          <template #default="{ row }">
            <span class="font-semibold text-emerald-800">{{ row.eventId }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="eventType" label="事件类型" min-width="170">
          <template #default="{ row }">
            <div class="font-medium text-gray-800">{{ row.eventTypeName || row.eventType }}</div>
            <div class="text-xs text-gray-400 mono">{{ row.eventType }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="schemaVersion" label="Schema" width="100" class-name="mono" />
        <el-table-column prop="businessKey" label="来源业务键" min-width="160" class-name="mono" show-overflow-tooltip />
        <el-table-column prop="occurredAt" label="发生时间" width="170" />
        <el-table-column prop="payloadDigest" label="Payload 摘要" min-width="200" class-name="mono" show-overflow-tooltip />
        <el-table-column label="处理状态" width="120">
          <template #default="{ row }"><StatusTag :code="row.processStatus || 'COMPLETED'" /></template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click.stop="openDetailDrawer(row)">查看明细</el-button>
            <el-button size="small" link @click.stop="router.push('/trust/lineage?eventId=' + row.eventId)">血缘链图</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="Number(totalCount)"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @current-change="loadEvents"
          @size-change="loadEvents"
        />
      </div>
    </div>

    <!-- Event Detail Drawer -->
    <el-drawer v-model="drawerVisible" title="业务事件详情" size="640px" :close-on-click-modal="false">
      <div v-if="selectedEvent" class="space-y-4">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="事件 ID" :span="2"><span class="mono font-bold">{{ selectedEvent.eventId }}</span></el-descriptions-item>
          <el-descriptions-item label="事件类型">{{ selectedEvent.eventType }}</el-descriptions-item>
          <el-descriptions-item label="Schema 版本">{{ selectedEvent.schemaVersion }}</el-descriptions-item>
          <el-descriptions-item label="来源业务键" :span="2"><span class="mono">{{ selectedEvent.businessKey }}</span></el-descriptions-item>
          <el-descriptions-item label="发生时间">{{ selectedEvent.occurredAt }}</el-descriptions-item>
          <el-descriptions-item label="处理状态"><StatusTag :code="selectedEvent.processStatus || 'COMPLETED'" /></el-descriptions-item>
          <el-descriptions-item label="载荷摘要" :span="2"><span class="mono text-xs break-all">{{ selectedEvent.payloadDigest || '-' }}</span></el-descriptions-item>
        </el-descriptions>

        <div class="mt-4">
          <div class="font-bold text-sm text-gray-700 mb-2">规范载荷数据 (Payload JSON)</div>
          <pre class="bg-gray-900 text-emerald-400 p-4 rounded text-xs overflow-auto max-h-[460px] mono">{{ formattedPayload }}</pre>
        </div>

        <div class="flex justify-end gap-3 pt-3">
          <el-button @click="router.push(`/trust/events/${selectedEvent.eventId}`)">独立详情页面</el-button>
          <el-button type="primary" @click="router.push(`/trust/lineage?eventId=${selectedEvent.eventId}`)">探索事件溯源血缘</el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '@/components/common/PageHeader.vue';
import FilterBar from '@/components/common/FilterBar.vue';
import StatusTag from '@/components/common/StatusTag.vue';
import { eventsApi } from '@/api/events';
import type { TrustEvent } from '@/types';

const router = useRouter();
const loading = ref(false);
const events = ref<TrustEvent[]>([]);
const totalCount = ref('0');
const page = ref(1);
const pageSize = ref(20);
const dateRange = ref<[string, string] | null>(null);

const filters = reactive({
  eventId: '',
  eventType: '',
  sourceBusinessKey: '',
  processingStatus: ''
});

const drawerVisible = ref(false);
const selectedEvent = ref<TrustEvent | null>(null);

const formattedPayload = computed(() => {
  if (!selectedEvent.value?.payload) return '{}';
  return JSON.stringify(selectedEvent.value.payload, null, 2);
});

const loadEvents = async () => {
  loading.value = true;
  try {
    const occurredFrom = dateRange.value?.[0];
    const occurredTo = dateRange.value?.[1];

    if (filters.eventId.trim()) {
      const single = await eventsApi.getTrustEventDetail(filters.eventId.trim());
      events.value = single ? [single] : [];
      totalCount.value = single ? '1' : '0';
    } else {
      const res = await eventsApi.queryEventsPaged({
        eventType: filters.eventType.trim() || undefined,
        sourceBusinessKey: filters.sourceBusinessKey.trim() || undefined,
        processingStatus: filters.processingStatus || undefined,
        occurredFrom: occurredFrom || undefined,
        occurredTo: occurredTo || undefined,
        page: page.value,
        size: pageSize.value
      });

      const records = res.records || [];
      totalCount.value = String(res.total || records.length);
      events.value = records.map((item: any) => ({
        eventId: String(item.id || item.eventId),
        eventType: item.eventType,
        eventTypeName: item.eventType,
        occurredAt: item.occurredAt,
        sourceSystem: String(item.sourceSystemId || ''),
        processStatus: item.processingStatus || 'COMPLETED',
        proofStatus: 'PENDING',
        businessKey: item.sourceBusinessKey,
        payload: typeof item.payloadJson === 'string' ? JSON.parse(item.payloadJson || '{}') : item.payloadJson,
        schemaVersion: item.schemaVersion,
        payloadDigest: item.payloadDigest
      }));
    }
  } catch (err) {
    console.error('Failed to load trust events', err);
    events.value = [];
    totalCount.value = '0';
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  page.value = 1;
  loadEvents();
};

const handleReset = () => {
  filters.eventId = '';
  filters.eventType = '';
  filters.sourceBusinessKey = '';
  filters.processingStatus = '';
  dateRange.value = null;
  page.value = 1;
  loadEvents();
};

const openDetailDrawer = (row: TrustEvent) => {
  selectedEvent.value = row;
  drawerVisible.value = true;
};

onMounted(() => {
  loadEvents();
});
</script>

<style scoped>
.trust-page {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding-bottom: 24px;
}

.panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  background: #fafbfa;
}

.panel-header h2 {
  margin: 0;
  font-size: 14.5px;
  font-weight: 700;
  color: var(--color-ink);
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid var(--color-border);
  background: #fafbfa;
}

.mono {
  font-family: Consolas, Monaco, "Courier New", monospace;
}
</style>
