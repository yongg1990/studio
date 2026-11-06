<template>
  <div class="governance-page">
    <PageHeader title="事件与 Schema 配置" subtitle="事件类型定义、Schema 草稿、测试与发布">
      <template #actions>
        <el-button @click="$router.push('/governance/event-authorizations')">事件类型授权</el-button>
        <el-button @click="openCreateEventType">创建事件类型</el-button>
        <el-button type="primary" @click="openSchemaDialog">创建 Schema 草稿</el-button>
      </template>
    </PageHeader>


    <div class="query-bar">
      <el-input v-model="queryForm.eventType" placeholder="事件类型" clearable />
      <el-input v-model="queryForm.schemaVersion" placeholder="Schema 版本" clearable />
      <el-select v-model="queryForm.status" placeholder="Schema 状态" clearable><el-option label="草稿" value="DRAFT" /><el-option label="已测试" value="TESTED" /><el-option label="已发布" value="PUBLISHED" /></el-select>
      <el-button type="primary" :loading="querying" @click="searchSchemas">查询 Schema</el-button>
      <el-button @click="resetQuery">重置</el-button>
    </div>

    <div class="panel">
      <div class="panel-header">Schema 定义</div>
      <el-table :data="schemas" empty-text="暂无 Schema 定义">
        <el-table-column prop="eventType" label="事件类型" min-width="180" class-name="mono" />
        <el-table-column prop="schemaVersion" label="Schema 版本" width="130" class-name="mono" />
        <el-table-column prop="contentDigest" label="内容摘要" min-width="220" class-name="mono" show-overflow-tooltip />
        <el-table-column label="状态" width="110">
          <template #default="{ row }"><StatusTag :code="row.status" /></template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="viewSchema(row)">查看</el-button>
            <el-button v-if="row.status === 'DRAFT'" size="small" link @click="openEditSchema(row)">编辑</el-button>
            <el-button size="small" link @click="openCopyDialog(row)">复制草稿</el-button>
            <el-button size="small" link @click="openTestDialog(row)">测试</el-button>
            <el-button v-if="row.status !== 'PUBLISHED'" size="small" link :loading="publishingKey === schemaKey(row)" @click="publishSchema(row)">发布</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-row"><el-pagination v-model:current-page="schemaPage" :page-size="20" :total="schemaTotal" layout="total, prev, pager, next" @current-change="querySchema" /></div>
    </div>

    <div class="panel result-panel">
      <div class="panel-header">事件类型</div>
      <FilterBar @search="searchEventTypes" @reset="resetEventTypes">
        <el-input v-model="eventFilters.eventType" placeholder="事件类型代码" clearable style="width: 180px" />
        <el-input v-model="eventFilters.scenarioCode" placeholder="场景代码" clearable style="width: 160px" />
        <el-select v-model="eventFilters.status" placeholder="状态" clearable style="width: 140px"><el-option label="启用" value="ACTIVE" /><el-option label="停用" value="INACTIVE" /></el-select>
      </FilterBar>
      <el-table :data="eventTypes" empty-text="暂无事件类型">
        <el-table-column prop="id" label="定义 ID" width="220" class-name="mono" show-overflow-tooltip />
        <el-table-column prop="eventType" label="事件类型" min-width="180" class-name="mono" />
        <el-table-column prop="eventName" label="名称" min-width="180" />
        <el-table-column prop="scenarioCode" label="场景代码" min-width="160" class-name="mono" />
        <el-table-column prop="description" label="说明" min-width="180" show-overflow-tooltip />
        <el-table-column prop="lockVersion" label="锁版本" width="90" />
        <el-table-column prop="updatedAt" label="更新时间" width="175" />
        <el-table-column label="状态" width="110">
          <template #default="{ row }"><StatusTag :code="row.status" /></template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right"><template #default="{ row }">
          <el-button link @click="viewEventType(row)">详情</el-button><el-button link @click="editEventType(row)">编辑</el-button>
          <el-button link @click="toggleEventType(row)">{{ row.status === 'ACTIVE' ? '停用' : '启用' }}</el-button>
        </template></el-table-column>
      </el-table>
      <div class="pagination-row"><el-pagination v-model:current-page="eventPage" :page-size="20" :total="eventTotal" layout="total, prev, pager, next" @current-change="loadEventTypes" /></div>
    </div>
    <el-dialog :model-value="!!eventTypeDetail" title="事件类型详情" width="640px" @close="eventTypeDetail = null">
      <el-descriptions v-if="eventTypeDetail" :column="1" border><el-descriptions-item v-for="(value, key) in eventTypeDetail" :key="key" :label="String(key)">{{ value ?? '-' }}</el-descriptions-item></el-descriptions>
    </el-dialog>

    <el-dialog v-model="eventTypeVisible" :title="editingEventTypeId ? '编辑事件类型' : '创建事件类型'" width="520px" :close-on-click-modal="false">
      <el-form :model="eventTypeForm" label-position="top">
        <el-form-item label="事件类型代码" required><el-input v-model="eventTypeForm.eventType" :disabled="!!editingEventTypeId" maxlength="128" /></el-form-item>
        <el-form-item label="事件类型名称" required><el-input v-model="eventTypeForm.eventName" /></el-form-item>
        <el-form-item label="场景代码" required><el-input v-model="eventTypeForm.scenarioCode" /></el-form-item>
        <el-form-item label="说明"><el-input v-model="eventTypeForm.description" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="eventTypeVisible = false">取消</el-button>
        <el-button type="primary" :loading="creatingEventType" @click="createEventType">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="schemaVisible" :title="editingSchemaId ? '编辑 Schema 草稿' : '创建 Schema 草稿'" width="min(960px, 96vw)" :close-on-click-modal="false">
      <el-form :model="schemaForm" label-position="top">
        <div class="form-grid">
          <el-form-item label="事件类型" required><el-input v-model="schemaForm.eventType" :disabled="!!editingSchemaId" /></el-form-item>
          <el-form-item label="Schema 版本" required><el-input v-model="schemaForm.schemaVersion" :disabled="!!editingSchemaId" /></el-form-item>
        </div>
        <div class="section-heading"><strong>字段列表</strong><el-button size="small" @click="addField">添加字段</el-button></div>
        <div v-for="(field, index) in schemaForm.fields" :key="fieldKeys[index]" class="entry-row">
          <div class="entry-heading"><strong>字段 {{ index + 1 }}</strong><el-button type="danger" link :disabled="schemaForm.fields.length === 1" @click="removeField(index)">移除</el-button></div>
          <div class="form-grid three-columns">
            <el-form-item label="字段代码" required><el-input v-model="field.fieldName" /></el-form-item>
            <el-form-item label="显示名称" required><el-input v-model="field.displayName" /></el-form-item>
            <el-form-item label="数据类型" required><el-select v-model="field.dataType"><el-option v-for="type in dataTypes" :key="type" :label="type" :value="type" /></el-select></el-form-item>
            <el-form-item label="是否必填"><el-switch v-model="field.required" /></el-form-item>
            <template v-if="field.dataType === 'STRING'">
              <el-form-item label="最小长度"><el-input-number v-model="field.minLength" :min="0" :precision="0" controls-position="right" /></el-form-item>
              <el-form-item label="最大长度"><el-input-number v-model="field.maxLength" :min="0" :precision="0" controls-position="right" /></el-form-item>
              <el-form-item label="正则表达式"><el-input v-model="field.pattern" /></el-form-item>
            </template>
            <template v-if="field.dataType === 'INTEGER' || field.dataType === 'DECIMAL'">
              <el-form-item label="最小值"><el-input-number v-model="field.minimum" :precision="field.dataType === 'INTEGER' ? 0 : undefined" controls-position="right" /></el-form-item>
              <el-form-item label="最大值"><el-input-number v-model="field.maximum" :precision="field.dataType === 'INTEGER' ? 0 : undefined" controls-position="right" /></el-form-item>
              <el-form-item label="是否严格大于最小值"><el-switch v-model="field.exclusiveMinimum" /></el-form-item>
              <el-form-item label="是否严格小于最大值"><el-switch v-model="field.exclusiveMaximum" /></el-form-item>
              <el-form-item label="数值步长"><el-input-number v-model="field.multipleOf" :min="0" :precision="field.dataType === 'INTEGER' ? 0 : undefined" controls-position="right" /></el-form-item>
            </template>
            <el-form-item label="数据元代码"><el-input v-model="field.dataElementCode" /></el-form-item>
            <el-form-item label="值域代码"><el-input v-model="field.valueSetCode" /></el-form-item>
            <el-form-item label="值域版本"><el-input v-model="field.valueSetVersion" /></el-form-item>
            <el-form-item label="编码体系代码"><el-input v-model="field.codeSchemeCode" /></el-form-item>
            <el-form-item label="编码体系版本"><el-input v-model="field.codeSchemeVersion" /></el-form-item>
          </div>
          <el-form-item label="字段说明"><el-input v-model="field.description" type="textarea" :rows="2" /></el-form-item>
        </div>
        <div class="section-heading"><strong>引用规则</strong><el-button size="small" @click="addRule">添加规则</el-button></div>
        <div v-for="(rule, index) in schemaForm.referenceRules" :key="ruleKeys[index]" class="entry-row">
          <div class="entry-heading"><strong>规则 {{ index + 1 }}</strong><el-button type="danger" link @click="removeRule(index)">移除</el-button></div>
          <div class="form-grid three-columns">
            <el-form-item label="字段代码" required><el-select v-model="rule.fieldName" filterable><el-option v-for="(field, fieldIndex) in schemaForm.fields" :key="fieldKeys[fieldIndex]" :label="field.fieldName" :value="field.fieldName" /></el-select></el-form-item>
            <el-form-item label="目标类型" required><el-input v-model="rule.targetType" /></el-form-item>
            <el-form-item label="解析命名空间" required><el-input v-model="rule.namespace" /></el-form-item>
            <el-form-item label="是否必需"><el-switch v-model="rule.required" /></el-form-item>
            <el-form-item label="引用不存在策略" required><el-input v-model="rule.onNotFound" /></el-form-item>
            <el-form-item label="引用不唯一策略" required><el-input v-model="rule.onAmbiguous" /></el-form-item>
          </div>
        </div>
        <el-empty v-if="!schemaForm.referenceRules.length" description="暂无引用规则" :image-size="48" />
        <el-alert v-if="draftTestResult" :type="draftTestResult.valid ? 'success' : 'error'" :closable="false" :title="draftTestResult.valid ? '草稿测试通过' : '草稿测试失败'">
          <div v-for="(error, index) in draftTestResult.errors" :key="index">{{ error }}</div>
        </el-alert>
      </el-form>
      <template #footer>
        <el-button @click="schemaVisible = false">取消</el-button>
        <el-button :loading="testingDraft" @click="testUnsavedSchema">测试当前草稿</el-button>
        <el-button type="primary" :loading="creatingSchema" @click="saveSchemaDraft">保存草稿</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="testVisible" title="测试 Schema" width="620px" :close-on-click-modal="false">
      <el-descriptions :column="2" border size="small" style="margin-bottom: 14px">
        <el-descriptions-item label="事件类型">{{ testForm.eventType }}</el-descriptions-item>
        <el-descriptions-item label="版本">{{ testForm.schemaVersion }}</el-descriptions-item>
      </el-descriptions>
      <el-form label-position="top">
        <el-alert type="info" :closable="false" title="测试服务端保存的 Schema 配置；此接口不校验事件 Payload。" />
      </el-form>
      <el-alert v-if="testResult" :type="testResult.valid ? 'success' : 'error'" :closable="false" :title="testResult.valid ? '校验通过' : '校验失败，共 ' + testResult.errors.length + ' 项'">
        <template v-if="!testResult.valid" #default>
          <div v-for="(item, index) in testResult.errors" :key="index">{{ item }}</div>
        </template>
      </el-alert>
      <template #footer>
        <el-button @click="testVisible = false">关闭</el-button>
        <el-button type="primary" :loading="testing" @click="testSchema">执行测试</el-button>
      </template>
    </el-dialog>

    <!-- Copy Schema Dialog -->
    <el-dialog v-model="copyDialogVisible" title="复制 Schema 草稿" width="480px" :close-on-click-modal="false">
      <el-form label-position="top">
        <el-form-item label="原 Schema" required>
          <el-input :model-value="copySource?.eventType + ' (' + copySource?.schemaVersion + ')'" disabled />
        </el-form-item>
        <el-form-item label="目标事件类型" required>
          <el-input v-model="copyForm.targetEventType" placeholder="例如: HARVEST_RAW_EVENT" />
        </el-form-item>
        <el-form-item label="目标 Schema 版本" required>
          <el-input v-model="copyForm.targetSchemaVersion" placeholder="例如: 1.1.0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="copyDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="copying" @click="submitCopySchema">确认复制</el-button>
      </template>
    </el-dialog>

    <!-- Single Field Editor Dialog (2026-10-23 单条提交接口) -->
    <el-dialog v-model="singleFieldVisible" :title="singleFieldForm.fieldId ? '编辑单条字段 (POST /fields/{fieldId})' : '新增单条字段 (POST /fields)'" width="580px" :close-on-click-modal="false">
      <el-form :model="singleFieldForm" label-position="top">
        <div class="grid grid-cols-2 gap-3">
          <el-form-item label="字段代码 (fieldName)" required>
            <el-input v-model="singleFieldForm.fieldName" :disabled="!!singleFieldForm.fieldId" placeholder="例如: batchNo" />
          </el-form-item>
          <el-form-item label="显示名称 (displayName)" required>
            <el-input v-model="singleFieldForm.displayName" placeholder="例如: 批次编号" />
          </el-form-item>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <el-form-item label="数据类型" required>
            <el-select v-model="singleFieldForm.dataType" style="width: 100%">
              <el-option v-for="type in dataTypes" :key="type" :label="type" :value="type" />
            </el-select>
          </el-form-item>
          <el-form-item label="是否必填">
            <el-switch v-model="singleFieldForm.required" active-text="必填" inactive-text="选填" />
          </el-form-item>
        </div>

        <el-form-item label="字段生成器 (可选，来源于平台支持的生成器清单)">
          <el-select v-model="singleFieldForm.generator" clearable placeholder="请选择生成器或留空" style="width: 100%">
            <el-option v-for="gen in availableGenerators" :key="gen.code || gen" :label="(gen.name || gen.code || gen) + ' (' + (gen.code || gen) + ')'" :value="gen.code || gen" />
          </el-select>
        </el-form-item>

        <div class="grid grid-cols-2 gap-3">
          <el-form-item label="关联数据元代码">
            <el-input v-model="singleFieldForm.dataElementCode" placeholder="DE_..." />
          </el-form-item>
          <el-form-item label="关联值域代码">
            <el-input v-model="singleFieldForm.valueSetCode" placeholder="VS_..." />
          </el-form-item>
        </div>

        <el-form-item label="字段描述">
          <el-input v-model="singleFieldForm.description" type="textarea" :rows="2" placeholder="字段业务含义及取值要求" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="singleFieldVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingSingleField" @click="submitSingleField">提交保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="drawerVisible" title="Schema 详情与字段精细管理" size="60%" :close-on-click-modal="false">
      <div v-if="selectedSchema" class="space-y-4">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="事件类型">{{ selectedSchema.eventType }}</el-descriptions-item>
          <el-descriptions-item label="版本">{{ selectedSchema.schemaVersion }}</el-descriptions-item>
          <el-descriptions-item label="状态"><StatusTag :code="selectedSchema.status" /></el-descriptions-item>
          <el-descriptions-item label="乐观锁版本">{{ selectedSchema.lockVersion ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="内容摘要" :span="2"><span class="mono text-xs">{{ selectedSchema.contentDigest || '-' }}</span></el-descriptions-item>
        </el-descriptions>

        <el-tabs v-model="drawerTab">
          <el-tab-pane label="字段列表 (单条提交维护)" name="fields">
            <div class="flex items-center justify-between mb-3">
              <div class="text-xs text-gray-500">2026-10-23规范：草稿状态下支持逐条新增、逐条修改和逐条安全删除字段</div>
              <el-button v-if="selectedSchema.status === 'DRAFT'" type="primary" size="small" @click="openAddSingleField">新增字段</el-button>
            </div>
            <el-table :data="selectedSchema.fields || []" border size="small" stripe>
              <el-table-column prop="fieldName" label="字段代码" min-width="140" class-name="mono" />
              <el-table-column prop="displayName" label="显示名称" min-width="140" />
              <el-table-column prop="dataType" label="类型" width="100" />
              <el-table-column prop="required" label="必填" width="70">
                <template #default="{ row }">
                  <el-tag size="small" :type="row.required ? 'danger' : 'info'">{{ row.required ? '是' : '否' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="generator" label="生成器" width="130">
                <template #default="{ row }">
                  <span class="mono text-xs text-emerald-700">{{ row.generator || '-' }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="dataElementCode" label="数据元" width="130" class-name="mono" />
              <el-table-column v-if="selectedSchema.status === 'DRAFT'" label="操作" width="130" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" size="small" @click="openEditSingleField(row)">编辑</el-button>
                  <el-popconfirm title="确定删除该字段吗？" @confirm="handleDeleteSingleField(row)">
                    <template #reference>
                      <el-button link type="danger" size="small">删除</el-button>
                    </template>
                  </el-popconfirm>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <el-tab-pane label="引用规则" name="rules">
            <el-table :data="selectedSchema.referenceRules || []" border size="small" stripe>
              <el-table-column prop="fieldName" label="字段代码" min-width="130" class-name="mono" />
              <el-table-column prop="targetType" label="目标类型" min-width="130" />
              <el-table-column prop="namespace" label="命名空间" min-width="130" />
              <el-table-column prop="required" label="必填" width="70">
                <template #default="{ row }">{{ row.required ? '是' : '否' }}</template>
              </el-table-column>
              <el-table-column prop="onNotFound" label="缺失策略" min-width="110" />
              <el-table-column prop="onAmbiguous" label="多重引用策略" min-width="110" />
            </el-table>
          </el-tab-pane>

          <el-tab-pane label="Schema JSON" name="json">
            <pre class="json-code mono">{{ formattedSchema }}</pre>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import PageHeader from '@/components/common/PageHeader.vue';
import FilterBar from '@/components/common/FilterBar.vue';
import StatusTag from '@/components/common/StatusTag.vue';
import { apiErrorMessage } from '@/api/client';
import { eventsApi, type SchemaSnapshot, type SchemaTestResult, type EventSchemaField, type EventSchemaReferenceRule, type EventTypeDetail } from '@/api/events';

type EventTypeRow = EventTypeDetail;

const emptySchemaFilters = () => ({ eventType: '', schemaVersion: '', status: '' });
const emptyEventFilters = () => ({ eventType: '', scenarioCode: '', status: '' });
const queryForm = ref(emptySchemaFilters()), appliedSchemaFilters = ref(emptySchemaFilters());
const eventFilters = ref(emptyEventFilters()), appliedEventFilters = ref(emptyEventFilters());
const schemaPage = ref(1), schemaTotal = ref(0), eventPage = ref(1), eventTotal = ref(0);
const paramsFor = (values: Record<string, string>) => Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim()).map(([key, value]) => [key, value.trim()]));
const searchSchemas = () => { appliedSchemaFilters.value = { ...queryForm.value }; schemaPage.value = 1; void querySchema(); };
const searchEventTypes = () => { appliedEventFilters.value = { ...eventFilters.value }; eventPage.value = 1; void loadEventTypes(); };
const resetEventTypes = () => { eventFilters.value = emptyEventFilters(); appliedEventFilters.value = emptyEventFilters(); eventPage.value = 1; void loadEventTypes(); };
const schemas = ref<SchemaSnapshot[]>([]);
const eventTypes = ref<EventTypeRow[]>([]);
const querying = ref(false);
const publishingKey = ref('');

const eventTypeVisible = ref(false);
const editingEventTypeId = ref(''), eventTypeLockVersion = ref(0);
const eventTypeDetail = ref<EventTypeDetail | null>(null);
const creatingEventType = ref(false);
const eventTypeForm = ref({ eventType: '', eventName: '', scenarioCode: '', description: '' });

const schemaVisible = ref(false);
const creatingSchema = ref(false);
const testingDraft = ref(false);
const draftTestResult = ref<SchemaTestResult | null>(null);
const dataTypes = ['STRING', 'INTEGER', 'DECIMAL', 'BOOLEAN', 'DATE', 'DATETIME', 'OBJECT', 'ARRAY'];
const emptyField = (): EventSchemaField => ({ fieldName: '', displayName: '', dataType: 'STRING', required: false });
const emptyRule = (): EventSchemaReferenceRule => ({ fieldName: '', targetType: '', namespace: '', required: false, onNotFound: '', onAmbiguous: '' });
const schemaForm = ref({ eventType: '', schemaVersion: '', fields: [emptyField()], referenceRules: [] as EventSchemaReferenceRule[] });
const editingSchemaId = ref('');
const editingLockVersion = ref<number | null>(null);
const fieldKeys = ref([0]);
const ruleKeys = ref<number[]>([]);
let nextRowKey = 1;
const addField = () => { schemaForm.value.fields.push(emptyField()); fieldKeys.value.push(nextRowKey++); };
const addRule = () => { schemaForm.value.referenceRules.push(emptyRule()); ruleKeys.value.push(nextRowKey++); };
const removeField = (index: number) => { schemaForm.value.fields.splice(index, 1); fieldKeys.value.splice(index, 1); };
const removeRule = (index: number) => { schemaForm.value.referenceRules.splice(index, 1); ruleKeys.value.splice(index, 1); };

const testVisible = ref(false);
const testing = ref(false);
const testForm = ref({ id: '', eventType: '', schemaVersion: '' });
const testResult = ref<SchemaTestResult | null>(null);

const drawerVisible = ref(false);
const selectedSchema = ref<SchemaSnapshot | null>(null);
const formattedSchema = computed(() => {
  if (!selectedSchema.value) return '{}';
  const { schemaJson, ...detail } = selectedSchema.value;
  return JSON.stringify(detail, null, 2);
});

const schemaKey = (row: Pick<SchemaSnapshot, 'eventType' | 'schemaVersion'>) => row.eventType + '@' + row.schemaVersion;

function openCreateEventType() {
  editingEventTypeId.value = ''; eventTypeLockVersion.value = 0;
  eventTypeForm.value = { eventType: '', eventName: '', scenarioCode: '', description: '' }; eventTypeVisible.value = true;
}
async function viewEventType(row: EventTypeRow) {
  try { eventTypeDetail.value = await eventsApi.getEventType(row.id); }
  catch (error) { ElMessage.error(apiErrorMessage(error, '查询事件类型失败')); }
}
async function editEventType(row: EventTypeRow) {
  try {
    const detail = await eventsApi.getEventType(row.id);
    editingEventTypeId.value = detail.id; eventTypeLockVersion.value = detail.lockVersion;
    eventTypeForm.value = { eventType: detail.eventType, eventName: detail.eventName, scenarioCode: detail.scenarioCode, description: detail.description || '' }; eventTypeVisible.value = true;
  } catch (error) { ElMessage.error(apiErrorMessage(error, '加载事件类型失败')); }
}
async function toggleEventType(row: EventTypeRow) {
  try {
    const detail = await eventsApi.getEventType(row.id);
    await eventsApi.setEventTypeStatus(detail.id, detail.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE', detail.lockVersion);
    await loadEventTypes(); ElMessage.success('事件类型状态已更新');
  } catch (error) { ElMessage.error(apiErrorMessage(error, '更新事件类型状态失败')); }
}

const upsertSchema = (schema: SchemaSnapshot) => {
  const index = schemas.value.findIndex(item => schemaKey(item) === schemaKey(schema));
  if (index >= 0) schemas.value.splice(index, 1, schema);
  else schemas.value.unshift(schema);
};

const optionalText = (value?: string) => value?.trim() || undefined;
const numeric = (value?: number) => value == null ? undefined : value;
const normalizeField = (field: EventSchemaField): EventSchemaField => ({
  ...(field.id ? { id: field.id } : {}),
  fieldName: field.fieldName.trim(), displayName: field.displayName.trim(), dataType: field.dataType, required: field.required,
  ...(field.dataType === 'STRING' ? { minLength: numeric(field.minLength), maxLength: numeric(field.maxLength), pattern: optionalText(field.pattern) } : {}),
  ...(['INTEGER', 'DECIMAL'].includes(field.dataType) ? { minimum: numeric(field.minimum), maximum: numeric(field.maximum), exclusiveMinimum: field.exclusiveMinimum, exclusiveMaximum: field.exclusiveMaximum, multipleOf: numeric(field.multipleOf) } : {}),
  description: optionalText(field.description), dataElementCode: optionalText(field.dataElementCode),
  valueSetCode: optionalText(field.valueSetCode), valueSetVersion: optionalText(field.valueSetVersion),
  codeSchemeCode: optionalText(field.codeSchemeCode), codeSchemeVersion: optionalText(field.codeSchemeVersion)
});
const normalizeRule = (rule: EventSchemaReferenceRule): EventSchemaReferenceRule => ({
  ...(rule.id ? { id: rule.id } : {}), fieldName: rule.fieldName.trim(), targetType: rule.targetType.trim(),
  namespace: rule.namespace.trim(), required: rule.required, onNotFound: rule.onNotFound.trim(), onAmbiguous: rule.onAmbiguous.trim()
});
const validateSchema = (fields: EventSchemaField[], rules: EventSchemaReferenceRule[]) => {
  if (!fields.length || fields.some(field => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(field.fieldName) || !field.displayName || !dataTypes.includes(field.dataType))) throw new Error('请填写有效的字段代码、显示名称和数据类型');
  if (new Set(fields.map(field => field.fieldName)).size !== fields.length) throw new Error('字段代码不能重复');
  for (const field of fields) {
    if (field.minLength != null && field.maxLength != null && field.minLength > field.maxLength) throw new Error(`${field.fieldName} 的最小长度不能大于最大长度`);
    if (field.minimum != null && field.maximum != null && field.minimum > field.maximum) throw new Error(`${field.fieldName} 的最小值不能大于最大值`);
    if (field.multipleOf != null && field.multipleOf <= 0) throw new Error(`${field.fieldName} 的数值步长必须大于 0`);
  }
  if (rules.some(rule => !fields.some(field => field.fieldName === rule.fieldName) || !rule.targetType || !rule.namespace || !rule.onNotFound || !rule.onAmbiguous)) throw new Error('引用规则须选择已有字段并填写目标类型、命名空间和处理策略');
};

const querySchema = async () => {
  querying.value = true;
  try {
    const result = await eventsApi.listSchemaDefinitions({ ...paramsFor(appliedSchemaFilters.value), page: schemaPage.value, size: 20 });
    schemas.value = result.records;
    schemaTotal.value = Number(result.total || 0);
  } catch (error) {
    ElMessage.error(apiErrorMessage(error, '查询 Schema 失败'));
  } finally {
    querying.value = false;
  }
};

const resetQuery = () => { queryForm.value = emptySchemaFilters(); appliedSchemaFilters.value = emptySchemaFilters(); schemaPage.value = 1; void querySchema(); };
const loadEventTypes = async () => {
  try {
    const result = await eventsApi.listEventTypes({ ...paramsFor(appliedEventFilters.value), page: eventPage.value, size: 20 });
    eventTypes.value = result.records || [];
    eventTotal.value = Number(result.total || 0);
  } catch (error) { ElMessage.error(apiErrorMessage(error, '查询事件类型失败')); }
};

const createEventType = async () => {
  if (creatingEventType.value) return;
  if (!/^[A-Z][A-Z0-9_]*$/.test(eventTypeForm.value.eventType.trim())) return ElMessage.warning('事件类型代码须为大写字母、数字及下划线');
  const form = eventTypeForm.value;
  if (!form.eventType.trim() || !form.eventName.trim() || !form.scenarioCode.trim()) {
    ElMessage.warning('请填写事件类型、名称和场景代码');
    return;
  }
  creatingEventType.value = true;
  try {
    const data = {
      eventType: form.eventType.trim(),
      eventName: form.eventName.trim(),
      scenarioCode: form.scenarioCode.trim(),
      description: form.description.trim()
    };
    const result = editingEventTypeId.value
      ? await eventsApi.updateEventType(editingEventTypeId.value, { eventName: data.eventName, scenarioCode: data.scenarioCode, description: data.description, lockVersion: eventTypeLockVersion.value })
      : await eventsApi.createEventType(data);
    await loadEventTypes();
    eventTypeVisible.value = false;
    schemaForm.value.eventType = result.eventType;
    ElMessage.success(editingEventTypeId.value ? '事件类型更新成功' : '事件类型创建成功');
  } catch (error) {
    ElMessage.error(apiErrorMessage(error, '创建事件类型失败'));
  } finally {
    creatingEventType.value = false;
  }
};

const openSchemaDialog = () => {
  draftTestResult.value = null;
  editingSchemaId.value = '';
  editingLockVersion.value = null;
  schemaForm.value = {
    eventType: queryForm.value.eventType || schemaForm.value.eventType,
    schemaVersion: queryForm.value.schemaVersion,
    fields: [emptyField()], referenceRules: []
  };
  fieldKeys.value = [nextRowKey++];
  ruleKeys.value = [];
  schemaVisible.value = true;
};
const openEditSchema = async (row: SchemaSnapshot) => {
  try {
    const detail = await eventsApi.getSchemaDefinition(row.id);
    if (detail.status !== 'DRAFT') throw new Error('只有草稿状态可以编辑');
    draftTestResult.value = null;
    editingSchemaId.value = detail.id;
    editingLockVersion.value = detail.lockVersion;
    schemaForm.value = { eventType: detail.eventType, schemaVersion: detail.schemaVersion, fields: detail.fields.map(field => ({ ...field })), referenceRules: detail.referenceRules.map(rule => ({ ...rule })) };
    fieldKeys.value = detail.fields.map(() => nextRowKey++);
    ruleKeys.value = detail.referenceRules.map(() => nextRowKey++);
    schemaVisible.value = true;
  } catch (error) { ElMessage.error(apiErrorMessage(error, '加载 Schema 草稿失败')); }
};

const saveSchemaDraft = async () => {
  if (creatingSchema.value) return;
  const form = schemaForm.value;
  if (!form.eventType.trim() || !form.schemaVersion.trim()) {
    ElMessage.warning('请输入事件类型和 Schema 版本');
    return;
  }
  const fields = form.fields.map(normalizeField);
  const rules = form.referenceRules.map(normalizeRule);
  try {
    validateSchema(fields, rules);
    if (editingSchemaId.value && editingLockVersion.value == null) throw new Error('草稿缺少乐观锁版本，请重新打开编辑');
  } catch (error) {
    ElMessage.warning((error as Error).message);
    return;
  }
  creatingSchema.value = true;
  try {
    const result = editingSchemaId.value
      ? await eventsApi.updateSchemaDraft(editingSchemaId.value, { fields, referenceRules: rules, lockVersion: editingLockVersion.value! })
      : await eventsApi.createSchemaDraft({ eventType: form.eventType.trim(), schemaVersion: form.schemaVersion.trim(), fields, referenceRules: rules });
    upsertSchema(result);
    schemaVisible.value = false;
    ElMessage.success(editingSchemaId.value ? 'Schema 草稿保存成功' : 'Schema 草稿创建成功');
  } catch (error) {
    ElMessage.error(apiErrorMessage(error, '保存 Schema 草稿失败'));
  } finally {
    creatingSchema.value = false;
  }
};

const openTestDialog = (row: SchemaSnapshot) => {
  testResult.value = null;
  testForm.value = { id: row.id, eventType: row.eventType, schemaVersion: row.schemaVersion };
  testVisible.value = true;
};

const testSchema = async () => {
  if (testing.value) return;
  testing.value = true;
  try {
    testResult.value = await eventsApi.testSchemaDefinition(testForm.value.id);
    await querySchema();
  } catch (error) {
    ElMessage.error(apiErrorMessage(error, '测试 Schema 失败'));
  } finally {
    testing.value = false;
  }
};

const publishSchema = async (row: SchemaSnapshot) => {
  if (publishingKey.value) return;
  publishingKey.value = schemaKey(row);
  try {
    const result = await eventsApi.publishEventSchema(row.id);
    upsertSchema(result);
    ElMessage.success('Schema 发布成功');
  } catch (error) {
    ElMessage.error(apiErrorMessage(error, '发布 Schema 失败'));
  } finally {
    publishingKey.value = '';
  }
};

const viewSchema = async (row: SchemaSnapshot) => {
  try {
    selectedSchema.value = await eventsApi.getSchemaDefinition(row.id);
    drawerVisible.value = true;
  } catch (error) {
    ElMessage.error(apiErrorMessage(error, '查询 Schema 失败'));
  }
};

const drawerTab = ref('fields');
const availableGenerators = ref<any[]>([]);

// Copy Schema State
const copyDialogVisible = ref(false);
const copySource = ref<SchemaSnapshot | null>(null);
const copyForm = ref({ targetEventType: '', targetSchemaVersion: '' });
const copying = ref(false);

function openCopyDialog(row: SchemaSnapshot) {
  copySource.value = row;
  copyForm.value = {
    targetEventType: row.eventType,
    targetSchemaVersion: row.schemaVersion + '.copy'
  };
  copyDialogVisible.value = true;
}

async function submitCopySchema() {
  if (!copySource.value) return;
  const { targetEventType, targetSchemaVersion } = copyForm.value;
  if (!targetEventType.trim() || !targetSchemaVersion.trim()) {
    return ElMessage.warning('请填写目标事件类型和版本');
  }
  copying.value = true;
  try {
    const newSchema = await eventsApi.copySchemaDraft(copySource.value.id, {
      targetEventType: targetEventType.trim(),
      targetSchemaVersion: targetSchemaVersion.trim()
    });
    ElMessage.success('Schema 草稿复制成功');
    copyDialogVisible.value = false;
    upsertSchema(newSchema);
    await querySchema();
  } catch (error) {
    ElMessage.error(apiErrorMessage(error, '复制 Schema 失败'));
  } finally {
    copying.value = false;
  }
}

// Single Field CRUD State (2026-10-23 单条提交接口)
const singleFieldVisible = ref(false);
const savingSingleField = ref(false);
const singleFieldForm = ref({
  fieldId: '',
  fieldName: '',
  displayName: '',
  dataType: 'STRING',
  required: false,
  generator: '',
  dataElementCode: '',
  valueSetCode: '',
  description: ''
});

function openAddSingleField() {
  singleFieldForm.value = {
    fieldId: '',
    fieldName: '',
    displayName: '',
    dataType: 'STRING',
    required: false,
    generator: '',
    dataElementCode: '',
    valueSetCode: '',
    description: ''
  };
  singleFieldVisible.value = true;
}

function openEditSingleField(field: any) {
  singleFieldForm.value = {
    fieldId: field.id || field.fieldId || field.fieldName,
    fieldName: field.fieldName,
    displayName: field.displayName || field.fieldName,
    dataType: field.dataType || 'STRING',
    required: !!field.required,
    generator: field.generator || '',
    dataElementCode: field.dataElementCode || '',
    valueSetCode: field.valueSetCode || '',
    description: field.description || ''
  };
  singleFieldVisible.value = true;
}

async function submitSingleField() {
  if (!selectedSchema.value) return;
  const form = singleFieldForm.value;
  if (!form.fieldName.trim() || !form.displayName.trim()) {
    return ElMessage.warning('请填写字段代码和显示名称');
  }
  savingSingleField.value = true;
  try {
    const payload = {
      fieldName: form.fieldName.trim(),
      displayName: form.displayName.trim(),
      dataType: form.dataType,
      required: form.required,
      generator: form.generator || undefined,
      dataElementCode: form.dataElementCode.trim() || undefined,
      valueSetCode: form.valueSetCode.trim() || undefined,
      description: form.description.trim() || undefined,
      lockVersion: selectedSchema.value.lockVersion ?? 0
    };
    if (form.fieldId) {
      await eventsApi.updateSchemaField(selectedSchema.value.id, form.fieldId, payload);
      ElMessage.success('字段更新成功');
    } else {
      await eventsApi.addSchemaField(selectedSchema.value.id, payload);
      ElMessage.success('字段添加成功');
    }
    singleFieldVisible.value = false;
    // reload schema detail
    selectedSchema.value = await eventsApi.getSchemaDefinition(selectedSchema.value.id);
    await querySchema();
  } catch (error) {
    ElMessage.error(apiErrorMessage(error, '保存字段失败'));
  } finally {
    savingSingleField.value = false;
  }
}

async function handleDeleteSingleField(field: any) {
  if (!selectedSchema.value) return;
  const fieldId = field.id || field.fieldId || field.fieldName;
  try {
    await eventsApi.deleteSchemaField(selectedSchema.value.id, fieldId, selectedSchema.value.lockVersion ?? 0);
    ElMessage.success('字段删除成功');
    selectedSchema.value = await eventsApi.getSchemaDefinition(selectedSchema.value.id);
    await querySchema();
  } catch (error) {
    ElMessage.error(apiErrorMessage(error, '删除字段失败'));
  }
}

const testUnsavedSchema = async () => {
  if (testingDraft.value) return;
  draftTestResult.value = null;
  testingDraft.value = true;
  try {
    const form = schemaForm.value;
    if (!form.eventType.trim() || !form.schemaVersion.trim()) throw new Error('请输入事件类型和 Schema 版本');
    const fields = form.fields.map(normalizeField), referenceRules = form.referenceRules.map(normalizeRule);
    validateSchema(fields, referenceRules);
    draftTestResult.value = await eventsApi.testSchemaDraft({ eventType: form.eventType.trim(), schemaVersion: form.schemaVersion.trim(), fields, referenceRules });
  } catch (error) { ElMessage.error(apiErrorMessage(error, '测试当前草稿失败')); }
  finally { testingDraft.value = false; }
};

onMounted(async () => {
  await querySchema();
  await loadEventTypes();
  try {
    availableGenerators.value = await eventsApi.listFieldGenerators();
  } catch (e) {
    console.warn('Failed to load generators', e);
  }
});
</script>

<style scoped>
.query-bar {
  display: grid;
  grid-template-columns: minmax(160px, 1fr) minmax(150px, 1fr) minmax(140px, 0.8fr) auto auto;
  gap: 10px;
  padding: 12px;
  margin-bottom: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.result-panel { margin-top: 12px; }

.panel-header {
  padding: 11px 14px;
  border-bottom: 1px solid var(--color-border);
  font-size: 14px;
  font-weight: 600;
}

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.three-columns { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.section-heading, .entry-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.section-heading { margin: 10px 0; }
.entry-row { padding: 12px 0; border-top: 1px solid var(--color-border); }
.entry-heading { margin-bottom: 8px; }
.entry-row :deep(.el-input-number), .entry-row :deep(.el-select) { width: 100%; }

.json-code {
  margin: 0;
  padding: 14px;
  max-height: calc(100vh - 190px);
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: #202823;
  color: #dce9e2;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.6;
}

@media (max-width: 760px) {
  .query-bar, .form-grid, .three-columns { grid-template-columns: 1fr; }
}
</style>
