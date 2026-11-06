<template>
  <div class="governance-page">
    <PageHeader
      title="字段与值域映射工作台"
      subtitle="APP-03 来源系统自有码值与平台标准值域对齐维护，及事件映射预检试算"
    >
      <template #actions>
        <template v-if="activeTab === 'valueSetMappings'">
          <el-button @click="loadValueSetItems">刷新映射表</el-button>
          <el-button @click="openCreateMappingDialog">+ 新建自有码值映射</el-button>
          <el-button type="primary" :loading="savingBatch" @click="saveAllMappings">整体保存值域映射</el-button>
        </template>
        <template v-else>
          <el-button type="primary" :loading="prechecking" @click="runPrecheck">执行预检</el-button>
        </template>
      </template>
    </PageHeader>

    <el-tabs v-model="activeTab" class="mb-3">
      <el-tab-pane label="系统值域映射维护" name="valueSetMappings" />
      <el-tab-pane label="字段映射试算与预检" name="precheck" />
    </el-tabs>

    <!-- TAB 1: System Value Set Mappings -->
    <div v-if="activeTab === 'valueSetMappings'">
      <div class="query-bar mb-3">
        <el-form :inline="true" label-position="left">
          <el-form-item label="来源系统 ID" required>
            <el-input v-model="mappingSourceSysId" placeholder="来源系统 ID" style="width: 180px" @change="loadValueSetItems" />
          </el-form-item>
          <el-form-item label="标准值域 ID" required>
            <el-input v-model="mappingValueSetId" placeholder="标准值域 ID" style="width: 180px" @change="loadValueSetItems" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loadingMappings" @click="loadValueSetItems">加载标准项与映射</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="panel">
        <div class="panel-header flex justify-between items-center">
          <h2>系统自有码值与标准项映射表 ({{ mappingRows.length }} 项)</h2>
          <span class="text-xs text-gray-500">双击单元格或点击编辑可直接调整系统自有码值</span>
        </div>
        <el-table :data="mappingRows" v-loading="loadingMappings" style="width: 100%" border>
          <el-table-column prop="itemCode" label="标准项代码" width="160" class-name="mono font-semibold" />
          <el-table-column prop="itemName" label="标准项名称" min-width="180" />
          <el-table-column label="系统自有码值 (systemItemCode)" min-width="180">
            <template #default="{ row }">
              <el-input v-model="row.systemItemCode" placeholder="如: KG / G / PACK" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="系统自有名称 (systemItemName)" min-width="180">
            <template #default="{ row }">
              <el-input v-model="row.systemItemName" placeholder="如: 公斤 / 克" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="映射模式" width="150">
            <template #default="{ row }">
              <el-select v-model="row.mappingMode" size="small" style="width: 100%">
                <el-option label="直接对应 DIRECT" value="DIRECT" />
                <el-option label="字典转换 DICTIONARY" value="DICTIONARY" />
                <el-option label="规则转换 RULE" value="RULE" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="映射状态" width="120">
            <template #default="{ row }">
              <el-select v-model="row.status" size="small" style="width: 100%">
                <el-option label="启用 ACTIVE" value="ACTIVE" />
                <el-option label="停用 INACTIVE" value="INACTIVE" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="单项保存" width="110" fixed="right">
            <template #default="{ row }">
              <el-button size="small" link type="primary" @click="saveSingleRow(row)">保存单条</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- Add Single Mapping Dialog -->
      <el-dialog v-model="createMappingVisible" title="创建系统自有码值映射" width="520px" :close-on-click-modal="false">
        <el-form :model="mappingForm" label-position="top">
          <el-form-item label="标准值域 ID" required><el-input v-model="mappingForm.valueSetId" /></el-form-item>
          <el-form-item label="标准代码项代码"><el-input v-model="mappingForm.standardItemCode" placeholder="选填，映射的标准项" /></el-form-item>
          <el-form-item label="系统自有码值" required><el-input v-model="mappingForm.systemItemCode" /></el-form-item>
          <el-form-item label="系统自有名称" required><el-input v-model="mappingForm.systemItemName" /></el-form-item>
          <el-form-item label="映射模式" required>
            <el-select v-model="mappingForm.mappingMode" style="width: 100%">
              <el-option label="DIRECT - 直接对应" value="DIRECT" />
              <el-option label="DICTIONARY - 字典转换" value="DICTIONARY" />
              <el-option label="RULE - 规则转换" value="RULE" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态" required>
            <el-select v-model="mappingForm.status" style="width: 100%">
              <el-option label="ACTIVE - 启用" value="ACTIVE" />
              <el-option label="INACTIVE - 停用" value="INACTIVE" />
            </el-select>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="createMappingVisible = false">取消</el-button>
          <el-button type="primary" :loading="savingSingle" @click="confirmCreateMapping">确认提交</el-button>
        </template>
      </el-dialog>
    </div>

    <!-- TAB 2: Field Mapping Precheck -->
    <div v-if="activeTab === 'precheck'">
      <el-form :model="form" label-position="top" class="precheck-form">
        <el-form-item label="映射配置代码" required><el-input v-model="form.mappingProfileCode" placeholder="如: MP_WMS_TO_WAREHOUSED" /></el-form-item>
        <el-form-item label="映射配置版本" required><el-input v-model="form.mappingProfileVersion" placeholder="如: 1.0.0" /></el-form-item>
        <el-form-item label="来源系统 ID" required><el-input v-model="form.sourceSystemId" placeholder="数字 ID 字符串" /></el-form-item>
        <el-form-item label="目标事件类型" required><el-input v-model="form.targetEventType" placeholder="如: WAREHOUSED" /></el-form-item>
        <el-form-item label="目标 Schema 版本" required><el-input v-model="form.targetSchemaVersion" placeholder="如: 1.0.0" /></el-form-item>
        <el-form-item label="警告阻断"><el-switch v-model="form.failOnWarning" /></el-form-item>
        <el-form-item label="来源 JSON 样例" required class="sample-input"><JsonEditor v-model="sampleJson" :rows="8" label="来源 JSON 样例" /></el-form-item>
      </el-form>

      <div v-if="previewResult" class="mapping-workbench-grid">
        <div class="column-panel">
          <div class="panel-head">来源 JSON 结构树</div>
          <div class="tree-list"><div v-for="key in sampleKeys" :key="key" class="tree-node">{{ key }}</div></div>
        </div>

        <div class="column-panel">
          <div class="panel-head">预检问题 ({{ previewIssues.length }})</div>
          <div class="table-wrapper">
            <table class="rule-table">
              <thead>
                <tr>
                  <th>字段路径</th>
                  <th>规则码</th>
                  <th>错误码</th>
                  <th>消息</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(issue, idx) in previewIssues" :key="idx"><td>{{ issue.fieldPath }}</td><td>{{ issue.ruleCode }}</td><td>{{ issue.errorCode }}</td><td>{{ issue.message }}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="column-panel">
          <div class="panel-head">预检响应</div>
          <div class="preview-box">
            <el-descriptions :column="1" size="small" border>
              <el-descriptions-item label="预检结果">
                <StatusTag :code="previewResult.passed ? 'COMPLETED' : 'FAILED'" :label="previewResult.passed ? '通过' : '未通过'" />
              </el-descriptions-item>
              <el-descriptions-item label="映射事件类型">{{ previewResult.mappedEventType || '-' }}</el-descriptions-item>
              <el-descriptions-item label="映射配置版本">{{ previewResult.mappingProfileVersion || '-' }}</el-descriptions-item>
              <el-descriptions-item label="目标 Schema 版本">{{ previewResult.targetSchemaVersion || '-' }}</el-descriptions-item>
              <el-descriptions-item label="治理票据 ID">
                <span class="mono">{{ (previewResult.governanceTickets || []).join(', ') || '-' }}</span>
              </el-descriptions-item>
            </el-descriptions>
            <div class="json-code mono">{{ previewJsonText }}</div>

            <div v-if="previewIssues.length > 0" class="error-notice">
              <div v-for="(iss, idx) in previewIssues" :key="idx" style="margin-bottom: 8px;">
                <strong>规则问题 [{{ iss.ruleCode || iss.errorCode }}]:</strong>
                <p><code>{{ iss.fieldPath }}</code> {{ iss.message }}</p>
              </div>
            </div>
            <div v-else class="success-notice" style="background: #eef7f2; border: 1px solid #c2e2cf; border-radius: 4px; padding: 10px; font-size: 12px; margin-top: 12px; color: #0e5f40;">
              {{ previewResult.passed ? '预检通过' : '预检未通过' }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import PageHeader from '@/components/common/PageHeader.vue';
import JsonEditor from '@/components/common/JsonEditor.vue';
import StatusTag from '@/components/common/StatusTag.vue';
import { governanceApi, type MappingIssue } from '@/api/governance';
import { apiErrorMessage } from '@/api/client';

const activeTab = ref<'valueSetMappings' | 'precheck'>('valueSetMappings');

// Value Set Mappings state
const mappingSourceSysId = ref(localStorage.getItem('tcmirp_source_system_id') || '1');
const mappingValueSetId = ref('1');
const loadingMappings = ref(false);
const savingBatch = ref(false);
const savingSingle = ref(false);
const createMappingVisible = ref(false);

interface MappingRow {
  itemCode: string;
  itemName: string;
  systemItemCode: string;
  systemItemName: string;
  mappingMode: 'DIRECT' | 'DICTIONARY' | 'RULE';
  status: 'ACTIVE' | 'INACTIVE';
  mappingId?: string;
}

const mappingRows = ref<MappingRow[]>([]);

const mappingForm = ref({
  valueSetId: '1',
  standardItemCode: '',
  systemItemCode: '',
  systemItemName: '',
  mappingMode: 'DIRECT' as const,
  status: 'ACTIVE' as const
});

const loadValueSetItems = async () => {
  if (!mappingSourceSysId.value.trim() || !mappingValueSetId.value.trim()) {
    ElMessage.warning('请输入来源系统 ID 和标准值域 ID');
    return;
  }
  loadingMappings.value = true;
  try {
    const items = await governanceApi.getSourceSystemValueSetItems(
      mappingSourceSysId.value.trim(),
      mappingValueSetId.value.trim()
    );
    mappingRows.value = (items || []).map((item: any) => ({
      itemCode: item.itemCode || item.code || '',
      itemName: item.itemName || item.name || '',
      systemItemCode: item.systemItemCode || item.systemCode || '',
      systemItemName: item.systemItemName || item.systemName || '',
      mappingMode: item.mappingMode || 'DIRECT',
      status: item.status || 'ACTIVE',
      mappingId: item.id
    }));
  } catch (err) {
    console.error('Failed to load mapping items', err);
    ElMessage.error(apiErrorMessage(err, '加载系统值域映射项失败'));
  } finally {
    loadingMappings.value = false;
  }
};

const saveAllMappings = async () => {
  if (!mappingSourceSysId.value.trim() || !mappingValueSetId.value.trim()) return;
  savingBatch.value = true;
  try {
    await governanceApi.saveAllSystemValueSetMappings(
      mappingSourceSysId.value.trim(),
      mappingValueSetId.value.trim(),
      {
        mappings: mappingRows.value.filter(r => r.systemItemCode.trim()).map(r => ({
          systemItemCode: r.systemItemCode.trim(),
          systemItemName: r.systemItemName.trim() || r.systemItemCode.trim(),
          standardItemCode: r.itemCode,
          mappingMode: r.mappingMode,
          status: r.status
        }))
      }
    );
    ElMessage.success('系统值域全部映射保存成功');
    await loadValueSetItems();
  } catch (err) {
    ElMessage.error(apiErrorMessage(err, '整体保存值域映射失败'));
  } finally {
    savingBatch.value = false;
  }
};

const saveSingleRow = async (row: MappingRow) => {
  if (!row.systemItemCode.trim()) {
    ElMessage.warning('请填写系统自有码值');
    return;
  }
  try {
    if (row.mappingId) {
      await governanceApi.updateSystemValueSetMapping(mappingSourceSysId.value.trim(), row.mappingId, {
        valueSetId: mappingValueSetId.value.trim(),
        systemItemCode: row.systemItemCode.trim(),
        systemItemName: row.systemItemName.trim() || row.systemItemCode.trim(),
        standardItemCode: row.itemCode,
        mappingMode: row.mappingMode,
        status: row.status
      });
    } else {
      await governanceApi.createSystemValueSetMapping(mappingSourceSysId.value.trim(), {
        valueSetId: mappingValueSetId.value.trim(),
        systemItemCode: row.systemItemCode.trim(),
        systemItemName: row.systemItemName.trim() || row.systemItemCode.trim(),
        standardItemCode: row.itemCode,
        mappingMode: row.mappingMode,
        status: row.status
      });
    }
    ElMessage.success(`标准项 [${row.itemCode}] 映射已保存`);
    await loadValueSetItems();
  } catch (err) {
    ElMessage.error(apiErrorMessage(err, '保存映射失败'));
  }
};

const openCreateMappingDialog = () => {
  mappingForm.value = {
    valueSetId: mappingValueSetId.value.trim() || '1',
    standardItemCode: '',
    systemItemCode: '',
    systemItemName: '',
    mappingMode: 'DIRECT',
    status: 'ACTIVE'
  };
  createMappingVisible.value = true;
};

const confirmCreateMapping = async () => {
  if (!mappingForm.value.valueSetId || !mappingForm.value.systemItemCode) {
    ElMessage.warning('请填写值域 ID 和系统自有码值');
    return;
  }
  savingSingle.value = true;
  try {
    await governanceApi.createSystemValueSetMapping(mappingSourceSysId.value.trim(), {
      valueSetId: mappingForm.value.valueSetId.trim(),
      systemItemCode: mappingForm.value.systemItemCode.trim(),
      systemItemName: mappingForm.value.systemItemName.trim() || mappingForm.value.systemItemCode.trim(),
      standardItemCode: mappingForm.value.standardItemCode.trim() || undefined,
      mappingMode: mappingForm.value.mappingMode,
      status: mappingForm.value.status
    });
    ElMessage.success('创建自有码值映射成功');
    createMappingVisible.value = false;
    await loadValueSetItems();
  } catch (err) {
    ElMessage.error(apiErrorMessage(err, '创建映射失败'));
  } finally {
    savingSingle.value = false;
  }
};

// Precheck state
const form = ref({
  mappingProfileCode: 'MP_WMS_TO_WAREHOUSED',
  mappingProfileVersion: '1.0.0',
  sourceSystemId: localStorage.getItem('tcmirp_source_system_id') || '1',
  targetEventType: 'WAREHOUSED',
  targetSchemaVersion: '1.0.0',
  failOnWarning: false
});
const sampleJson = ref('{\n  "batchNo": "B20260301-01",\n  "warehouseCode": "WH-SH-01",\n  "inboundNo": "IN-2026-009",\n  "quantity": 1000,\n  "unitCode": "kg"\n}');
const sampleKeys = ref<string[]>([]);
const prechecking = ref(false);
const previewResult = ref<any>(null);
const previewIssues = ref<MappingIssue[]>([]);

const previewJsonText = computed(() => JSON.stringify(previewResult.value, null, 2));

const runPrecheck = async () => {
  if (form.value.sourceSystemId && !/^-?\d+$/.test(form.value.sourceSystemId)) {
    ElMessage.warning('来源系统 ID 必须是数字字符串');
    return;
  }
  if (!form.value.mappingProfileCode || !form.value.mappingProfileVersion || !form.value.sourceSystemId || !form.value.targetEventType || !form.value.targetSchemaVersion) {
    ElMessage.warning('请填写映射和目标事件信息');
    return;
  }
  let sample: Record<string, any>;
  try {
    sample = JSON.parse(sampleJson.value);
    if (!sample || Array.isArray(sample) || typeof sample !== 'object') throw new Error();
  } catch {
    ElMessage.warning('来源样例必须是 JSON 对象');
    return;
  }
  sampleKeys.value = Object.keys(sample);
  prechecking.value = true;
  try {
    const res = await governanceApi.testMappingProfile({
      ...form.value,
      sourceSample: sample,
      dryRun: true
    });
    previewResult.value = res;
    previewIssues.value = res.issues || [];
    if (res.passed) {
      ElMessage.success('OpenAPI 预检通过！映射生成事件数据结构合规。');
    } else {
      ElMessage.warning(`预检未通过，发现 ${res.issues?.length || 0} 项问题`);
    }
  } catch (e) {
    ElMessage.error(apiErrorMessage(e, '执行预检失败'));
  } finally {
    prechecking.value = false;
  }
};

onMounted(() => {
  loadValueSetItems();
});
</script>

<style scoped>
.query-bar {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 12px 16px 0;
}

.panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: hidden;
}

.panel-header {
  padding: 10px 14px;
  font-weight: 600;
  font-size: 13.5px;
  background: #f7f9f8;
  border-bottom: 1px solid var(--color-border);
}

.mapping-workbench-grid {
  display: grid;
  grid-template-columns: 210px 1fr 320px;
  height: calc(100vh - 240px);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: 6px;
  overflow: hidden;
  margin-top: 14px;
}
.precheck-form { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0 12px; }
.sample-input { grid-column: 1 / -1; }
@media (max-width: 900px) { .precheck-form { grid-template-columns: 1fr; } .mapping-workbench-grid { grid-template-columns: 1fr; height: auto; } }

.column-panel {
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
}

.column-panel:last-child {
  border-right: 0;
}

.panel-head {
  padding: 10px 14px;
  font-weight: 600;
  font-size: 13px;
  background: #f7f9f8;
  border-bottom: 1px solid var(--color-border);
}

.tree-list {
  padding: 8px 0;
  overflow-y: auto;
}

.tree-node {
  padding: 8px 14px;
  font-size: 13px;
  font-family: Consolas, monospace;
}

.table-wrapper {
  flex: 1;
  overflow-y: auto;
}

.rule-table {
  width: 100%;
  border-collapse: collapse;
}

.rule-table th {
  background: #f0f6f4;
  color: #244b49;
  font-weight: 700;
  padding: 8px 12px;
  font-size: 12px;
  border-bottom: 1px solid #e3ece9;
  text-align: left;
}

.rule-table td {
  padding: 8px 12px;
  font-size: 12px;
  border-bottom: 1px solid #e3ece9;
}

.rule-table tbody tr:hover td { background: #f5faf8; }

.preview-box {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.json-code {
  background: #202823;
  color: #dce9e2;
  border-radius: 4px;
  padding: 12px;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.error-notice {
  border-left: 3px solid var(--color-danger);
  background: #fff5f4;
  padding: 10px;
  font-size: 12px;
  border-radius: 0 4px 4px 0;
}

.error-notice p {
  margin: 4px 0 0;
  color: var(--color-danger);
}

.mono {
  font-family: Consolas, Monaco, "Courier New", monospace;
}
</style>
