<template>
  <div class="exchange-page">
    <PageHeader
      title="交换方案查询与对接"
      subtitle="涵盖 APP-06 查询方案对接助手、加密方案同步查询 (POST /openapi/v1/exchange-query) 与业务实体查询"
    />

    <el-tabs v-model="tab" @tab-change="onTabChange">
      <el-tab-pane label="查询方案对接助手 (APP-06)" name="assistant" />
      <el-tab-pane label="加密方案同步查询 (POST /exchange-query)" name="encrypted" />
      <el-tab-pane label="业务实体与状态查询" name="direct" />
    </el-tabs>

    <!-- Tab 1: APP-06 查询方案对接助手 -->
    <div v-if="tab === 'assistant'" class="panel body">
      <div class="assistant-flow space-y-6">
        <div class="bg-emerald-50/50 p-4 rounded-lg border border-emerald-100 text-xs text-emerald-900 leading-relaxed">
          <strong>对接助手说明：</strong>选择租户、项目、来源系统、密钥及已绑定的已发布方案，自动读取方案字段定义并生成合规明文请求。可一键执行报文加密，并直接向平台发起加密方案查询。
        </div>

        <!-- Cascading Selectors -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <el-form-item label="1. 所选租户" required>
            <el-select v-model="selectedTenantId" placeholder="选择租户" filterable style="width: 100%" @change="onTenantChange">
              <el-option v-for="t in tenantOptions" :key="t.tenantId" :label="t.tenantName + ' (' + t.tenantCode + ')'" :value="t.tenantId" />
            </el-select>
          </el-form-item>

          <el-form-item label="2. 项目空间" required>
            <el-select v-model="selectedProjectId" placeholder="选择项目空间" filterable style="width: 100%" @change="onProjectChange">
              <el-option v-for="p in projectOptions" :key="p.projectSpaceId" :label="p.projectName + ' (' + p.projectCode + ')'" :value="p.projectSpaceId" />
            </el-select>
          </el-form-item>

          <el-form-item label="3. 来源系统" required>
            <el-select v-model="selectedSourceId" placeholder="选择来源系统" filterable style="width: 100%" @change="onSourceChange">
              <el-option v-for="s in sourceOptions" :key="s.sourceSystemId" :label="s.sourceSystemName + ' (' + s.sourceSystemCode + ')'" :value="s.sourceSystemId" />
            </el-select>
          </el-form-item>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <el-form-item label="4. 来源系统密钥" required>
            <el-select v-model="selectedKeyId" placeholder="选择加密密钥" filterable style="width: 100%">
              <el-option v-for="k in keyOptions" :key="k.id" :label="k.keyAlias + ' (' + k.keyAlgorithm + ' - ' + k.keyType + ')'" :value="k.id" />
            </el-select>
          </el-form-item>

          <el-form-item label="5. 已授权查询方案" required>
            <el-select v-model="selectedProfileId" placeholder="选择查询方案" filterable style="width: 100%" @change="onProfileChange">
              <el-option v-for="pf in profileOptions" :key="pf.id" :label="(pf.profileName || pf.name || pf.profileCode) + ' (' + pf.profileCode + ')'" :value="pf.id" />
            </el-select>
          </el-form-item>

          <el-form-item label="6. 方案发布版本" required>
            <el-select v-model="selectedVersionId" placeholder="选择发布版本" filterable style="width: 100%" @change="onVersionChange">
              <el-option v-for="v in versionOptions" :key="v.id" :label="'v' + v.version + ' [' + v.status + ']'" :value="v.id" />
            </el-select>
          </el-form-item>
        </div>

        <!-- Profile Definition Fields -->
        <div v-if="profileDefinition" class="bg-gray-50 p-4 rounded border border-gray-200">
          <div class="flex items-center justify-between mb-2">
            <span class="font-semibold text-sm text-gray-800">方案字段定义 (GET /profile-definition)</span>
            <el-tag size="small" type="success">{{ profileDefinition.fields?.length || 0 }} 个输出字段</el-tag>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div v-for="f in profileDefinition.fields || []" :key="f.fieldCode || f.targetPath" class="p-2 bg-white rounded border border-gray-100">
              <span class="text-gray-500 font-mono">{{ f.targetPath || f.fieldCode }}:</span>
              <span class="ml-1 text-gray-800 font-medium">{{ f.fieldName || f.displayName || f.fieldCode }}</span>
            </div>
          </div>
        </div>

        <!-- Business Query Parameters -->
        <div class="bg-white p-4 rounded border border-gray-200">
          <div class="font-semibold text-sm text-gray-800 mb-3">查询入参配置 (Query Parameters)</div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <el-form-item label="批次编号 (batchNo)">
              <el-input v-model="queryParamsForm.batchNo" placeholder="如: B20260301-01" />
            </el-form-item>
            <el-form-item label="饮片监管代码 (pieceCode)">
              <el-input v-model="queryParamsForm.pieceCode" placeholder="如: YP202603-998" />
            </el-form-item>
            <el-form-item label="追溯码 / 盒码 (traceCode)">
              <el-input v-model="queryParamsForm.traceCode" placeholder="如: BOX-20260301-001" />
            </el-form-item>
          </div>
          <div class="flex gap-3 mt-2">
            <el-button type="primary" :loading="generating" @click="generateExample">生成明文请求信封</el-button>
            <el-button type="success" :disabled="!plaintextRequest" :loading="encrypting" @click="encryptExample">模拟请求加密 (SM4/RSA)</el-button>
            <el-button type="warning" :disabled="!encryptedPayload" :loading="executing" @click="sendEncryptedQuery">发送加密同步查询 (POST /exchange-query)</el-button>
          </div>
        </div>

        <!-- Generated Plaintext Request -->
        <div v-if="plaintextRequest" class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-semibold text-sm text-gray-800">明文请求信封 (POST /exchange-query/integration-assistant/request-examples)</span>
            <el-button link size="small" type="primary" @click="copyText(JSON.stringify(plaintextRequest, null, 2))">复制明文</el-button>
          </div>
          <pre class="json-box mono">{{ JSON.stringify(plaintextRequest, null, 2) }}</pre>
        </div>

        <!-- Encrypted Request Envelope -->
        <div v-if="encryptedPayload" class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-semibold text-sm text-emerald-800">加密后密文与信封 (POST /exchange-query/integration-assistant/request-examples/encrypt)</span>
            <el-button link size="small" type="primary" @click="copyText(JSON.stringify(encryptedPayload, null, 2))">复制密文</el-button>
          </div>
          <pre class="json-box mono text-emerald-300 bg-gray-900">{{ JSON.stringify(encryptedPayload, null, 2) }}</pre>
        </div>

        <!-- Encrypted Query Result -->
        <div v-if="queryExecutionResult" class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-semibold text-sm text-blue-800">平台返回的加密查询业务结果 (POST /openapi/v1/exchange-query)</span>
            <el-tag size="small" type="success">查询成功</el-tag>
          </div>
          <pre class="json-box mono bg-emerald-950 text-white">{{ JSON.stringify(queryExecutionResult, null, 2) }}</pre>
        </div>
      </div>
    </div>

    <!-- Tab 2: Encrypted Direct Query -->
    <div v-else-if="tab === 'encrypted'" class="panel body">
      <div class="mb-4 text-xs text-gray-500">
        对接方通过外部系统或对接助手取得加密信封后，可直接向平台的 <code>POST /openapi/v1/exchange-query</code> 接口发起加密同步查询，返回可信存证与追溯结果。
      </div>
      <el-form label-position="top">
        <el-form-item label="方案代码 (profileCode)">
          <el-input v-model="manualQuery.profileCode" placeholder="SH-PIECE-TRACE" style="max-width: 320px" />
        </el-form-item>
        <el-form-item label="加密查询载荷 (JSON 或 Base64 密文)">
          <el-input v-model="manualQuery.payload" type="textarea" :rows="6" placeholder='{"encryptedPayload": "...", "envelope": {...}}' />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="executing" @click="submitManualEncryptedQuery">执行加密查询</el-button>
          <el-button @click="fillSamplePayload">填入示例密文</el-button>
        </el-form-item>
      </el-form>

      <div v-if="queryExecutionResult" class="mt-4 space-y-2">
        <div class="font-semibold text-sm text-gray-800">查询响应内容</div>
        <pre class="json-box mono">{{ JSON.stringify(queryExecutionResult, null, 2) }}</pre>
      </div>
    </div>

    <!-- Tab 3: Direct Entity & Status Query (Legacy) -->
    <div v-else class="panel body">
      <el-tabs v-model="kind" @tab-change="directResult = null">
        <el-tab-pane label="业务对象" name="objects" />
        <el-tab-pane label="事件" name="events" />
        <el-tab-pane label="事件处理状态" name="status" />
        <el-tab-pane label="已发布元数据" name="metadata" />
      </el-tabs>

      <el-form label-position="top" class="query-grid mt-4" @submit.prevent="queryDirect">
        <el-form-item :label="kind === 'metadata' ? '规范包代码' : '查询 ID'" required>
          <el-input v-model="directId" />
        </el-form-item>
        <el-form-item v-if="kind === 'metadata'" label="版本（可选）">
          <el-input v-model="directVersion" />
        </el-form-item>
        <template v-else>
          <el-form-item label="项目空间 ID" required>
            <el-input v-model="directParams.projectSpaceId" />
          </el-form-item>
          <el-form-item label="访问用途" required>
            <el-input v-model="directParams.purposeCode" />
          </el-form-item>
          <el-form-item label="主体类型" required>
            <el-select v-model="directParams.subjectType">
              <el-option v-for="v in ['EVENT','OBJECT','BATCH']" :key="v" :value="v" :label="v" />
            </el-select>
          </el-form-item>
          <el-form-item label="主体 ID" required>
            <el-input v-model="directParams.subjectId" />
          </el-form-item>
          <el-form-item label="展开项（可选）">
            <el-input v-model="directParams.expand" />
          </el-form-item>
        </template>
        <el-form-item>
          <el-button type="primary" :icon="Search" :loading="loadingDirect" @click="queryDirect">查询</el-button>
        </el-form-item>
      </el-form>

      <el-descriptions v-if="directResult" :column="1" border class="mt-4">
        <el-descriptions-item v-for="(value, key) in directResult" :key="key" :label="String(key)">
          <pre>{{ format(value) }}</pre>
        </el-descriptions-item>
      </el-descriptions>
      <el-empty v-else description="暂无查询结果" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import PageHeader from '@/components/common/PageHeader.vue';
import { exchangeAssistantApi } from '@/api/integration';
import { exchangeApi } from '@/api/exchange';
import { exchangeConfigApi, type ConfigRecord } from '@/api/exchangeConfig';
import { apiErrorMessage } from '@/api/client';

const tab = ref<'assistant' | 'encrypted' | 'direct'>('assistant');

// Assistant Cascading State
const tenantOptions = ref<any[]>([]);
const projectOptions = ref<any[]>([]);
const sourceOptions = ref<any[]>([]);
const keyOptions = ref<any[]>([]);
const profileOptions = ref<any[]>([]);
const versionOptions = ref<any[]>([]);
const profileDefinition = ref<any>(null);

const selectedTenantId = ref('');
const selectedProjectId = ref('');
const selectedSourceId = ref('');
const selectedKeyId = ref('');
const selectedProfileId = ref('');
const selectedVersionId = ref('');

const queryParamsForm = reactive({
  batchNo: 'B20260301-01',
  pieceCode: 'YP202603-998',
  traceCode: 'BOX-20260301-001'
});

const plaintextRequest = ref<any>(null);
const encryptedPayload = ref<any>(null);
const queryExecutionResult = ref<any>(null);

const generating = ref(false);
const encrypting = ref(false);
const executing = ref(false);

// Manual Encrypted Query Form
const manualQuery = reactive({
  profileCode: 'SH-PIECE-TRACE',
  payload: ''
});

// Legacy direct query
const kind = ref<'objects' | 'events' | 'status' | 'metadata'>('objects');
const directId = ref('');
const directVersion = ref('');
const loadingDirect = ref(false);
const directResult = ref<ConfigRecord | null>(null);
const directParams = reactive({
  projectSpaceId: localStorage.getItem('tcmirp_project_space_id') || '',
  purposeCode: localStorage.getItem('tcmirp_purpose_code') || 'TRACE',
  subjectType: 'OBJECT',
  subjectId: '',
  expand: ''
});

onMounted(async () => {
  await loadAssistantTenants();
});

function onTabChange(newTab: string) {
  if (newTab === 'assistant' && !tenantOptions.value.length) {
    void loadAssistantTenants();
  }
}

async function loadAssistantTenants() {
  try {
    const res = await exchangeAssistantApi.tenants({ page: 1, size: 50 });
    tenantOptions.value = res.records || [];
    if (tenantOptions.value.length > 0) {
      selectedTenantId.value = tenantOptions.value[0].tenantId;
      await onTenantChange(selectedTenantId.value);
    }
  } catch (error) {
    ElMessage.error(apiErrorMessage(error, '获取租户列表失败'));
  }
}

async function onTenantChange(tenantId: string) {
  selectedProjectId.value = '';
  selectedSourceId.value = '';
  selectedKeyId.value = '';
  selectedProfileId.value = '';
  selectedVersionId.value = '';
  profileDefinition.value = null;
  plaintextRequest.value = null;
  encryptedPayload.value = null;
  if (!tenantId) return;

  try {
    const [pRes, sRes] = await Promise.all([
      exchangeAssistantApi.projects({ tenantId, page: 1, size: 50 }),
      exchangeAssistantApi.sources({ tenantId, page: 1, size: 50 })
    ]);
    projectOptions.value = pRes.records || [];
    sourceOptions.value = sRes.records || [];

    if (projectOptions.value.length > 0) {
      selectedProjectId.value = projectOptions.value[0].projectSpaceId;
    }
    if (sourceOptions.value.length > 0) {
      selectedSourceId.value = sourceOptions.value[0].sourceSystemId;
      await onSourceChange(selectedSourceId.value);
    }
  } catch (error) {
    ElMessage.error(apiErrorMessage(error, '获取项目或来源系统失败'));
  }
}

async function onProjectChange() {
  if (selectedSourceId.value) {
    await onSourceChange(selectedSourceId.value);
  }
}

async function onSourceChange(sourceId: string) {
  selectedKeyId.value = '';
  selectedProfileId.value = '';
  selectedVersionId.value = '';
  profileDefinition.value = null;
  if (!sourceId) return;

  try {
    const [kRes, pfRes] = await Promise.all([
      exchangeAssistantApi.keys({ sourceSystemId: sourceId, page: 1, size: 50 }),
      exchangeAssistantApi.profiles({ sourceSystemId: sourceId, page: 1, size: 50 })
    ]);
    keyOptions.value = kRes.records || [];
    profileOptions.value = pfRes.records || [];

    if (keyOptions.value.length > 0) {
      selectedKeyId.value = keyOptions.value[0].id;
    }
    if (profileOptions.value.length > 0) {
      selectedProfileId.value = profileOptions.value[0].id;
      await onProfileChange(selectedProfileId.value);
    }
  } catch (error) {
    ElMessage.error(apiErrorMessage(error, '获取密钥或授权方案失败'));
  }
}

async function onProfileChange(profileId: string) {
  selectedVersionId.value = '';
  profileDefinition.value = null;
  if (!profileId) return;

  try {
    const vRes = await exchangeAssistantApi.profileVersions({ profileId, page: 1, size: 50 });
    versionOptions.value = vRes.records || [];
    if (versionOptions.value.length > 0) {
      selectedVersionId.value = versionOptions.value[0].id;
      await onVersionChange(selectedVersionId.value);
    }
  } catch (error) {
    ElMessage.error(apiErrorMessage(error, '获取方案发布版本失败'));
  }
}

async function onVersionChange(versionId: string) {
  if (!versionId) return;
  try {
    profileDefinition.value = await exchangeAssistantApi.profileDefinition({ profileVersionId: versionId });
  } catch (error) {
    ElMessage.error(apiErrorMessage(error, '获取方案定义失败'));
  }
}

async function generateExample() {
  if (!selectedTenantId.value || !selectedProjectId.value || !selectedSourceId.value || !selectedProfileId.value || !selectedVersionId.value) {
    return ElMessage.warning('请选择租户、项目、来源系统、方案和版本');
  }
  generating.value = true;
  try {
    const example = await exchangeAssistantApi.requestExample({
      tenantId: selectedTenantId.value,
      projectSpaceId: selectedProjectId.value,
      sourceSystemId: selectedSourceId.value,
      sourceSystemKeyId: selectedKeyId.value,
      profileId: selectedProfileId.value,
      profileVersionId: selectedVersionId.value,
      queryParameters: { ...queryParamsForm }
    });
    plaintextRequest.value = example;
    ElMessage.success('明文请求信封已成功生成');
  } catch (error) {
    ElMessage.error(apiErrorMessage(error, '生成样例请求失败'));
  } finally {
    generating.value = false;
  }
}

async function encryptExample() {
  if (!plaintextRequest.value) return ElMessage.warning('请先生成明文请求');
  encrypting.value = true;
  try {
    const enc = await exchangeAssistantApi.encryptExample({
      tenantId: selectedTenantId.value,
      sourceSystemId: selectedSourceId.value,
      keyId: selectedKeyId.value,
      plaintext: plaintextRequest.value
    });
    encryptedPayload.value = enc;
    manualQuery.payload = JSON.stringify(enc, null, 2);
    ElMessage.success('请求模拟加密成功');
  } catch (error) {
    ElMessage.error(apiErrorMessage(error, '模拟加密失败'));
  } finally {
    encrypting.value = false;
  }
}

async function sendEncryptedQuery() {
  if (!encryptedPayload.value) return ElMessage.warning('请先加密请求信封');
  executing.value = true;
  try {
    const res = await exchangeApi.executeEncryptedQuery({
      profileCode: manualQuery.profileCode,
      ...encryptedPayload.value
    });
    queryExecutionResult.value = res;
    ElMessage.success('加密同步查询成功');
  } catch (error) {
    ElMessage.error(apiErrorMessage(error, '加密查询失败'));
  } finally {
    executing.value = false;
  }
}

function fillSamplePayload() {
  manualQuery.payload = JSON.stringify({
    profileCode: 'SH-PIECE-TRACE',
    version: '1.0.0',
    keyId: 'KEY_2026_01',
    encryptedPayload: 'BASE64_CIPHERTEXT_SIMULATION_9018241',
    envelope: {
      keyId: '1',
      encryptedKey: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...',
      timestamp: Date.now()
    }
  }, null, 2);
}

async function submitManualEncryptedQuery() {
  if (!manualQuery.payload.trim()) return ElMessage.warning('请输入加密载荷');
  let parsed: any;
  try {
    parsed = JSON.parse(manualQuery.payload);
  } catch {
    parsed = { encryptedPayload: manualQuery.payload.trim() };
  }
  executing.value = true;
  try {
    const res = await exchangeApi.executeEncryptedQuery({
      profileCode: manualQuery.profileCode,
      ...parsed
    });
    queryExecutionResult.value = res;
    ElMessage.success('加密查询成功');
  } catch (error) {
    ElMessage.error(apiErrorMessage(error, '查询失败'));
  } finally {
    executing.value = false;
  }
}

function copyText(val: string) {
  navigator.clipboard.writeText(val).then(() => {
    ElMessage.success('已复制到剪贴板');
  });
}

const format = (value: unknown) => typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '-');

async function queryDirect() {
  if (!directId.value.trim()) {
    ElMessage.warning('请输入查询标识');
    return;
  }
  if (kind.value !== 'metadata' && (!/^\d+$/.test(directId.value.trim()) || !/^\d+$/.test(directParams.projectSpaceId) || !/^\d+$/.test(directParams.subjectId) || !directParams.purposeCode.trim())) {
    ElMessage.warning('请填写数字 ID、项目空间、主体和访问用途');
    return;
  }
  loadingDirect.value = true;
  directResult.value = null;
  try {
    directResult.value = kind.value === 'metadata'
      ? await exchangeConfigApi.metadata(directId.value.trim(), directVersion.value)
      : await exchangeConfigApi.query(kind.value, directId.value.trim(), { ...directParams, expand: directParams.expand || undefined, includeRaw: false });
  } catch (e) {
    ElMessage.error(apiErrorMessage(e, '查询失败'));
  } finally {
    loadingDirect.value = false;
  }
}
</script>

<style scoped>
.body {
  padding: 16px;
}
.query-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0 16px;
}
.json-box {
  margin: 0;
  padding: 12px;
  background: #f8fafc;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  max-height: 280px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  margin: 0;
}
@media (max-width: 900px) {
  .query-grid {
    grid-template-columns: 1fr;
  }
}
</style>
