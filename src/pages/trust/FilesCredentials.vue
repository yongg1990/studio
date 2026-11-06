<template>
  <div class="trust-page">
    <PageHeader title="文件上传与凭证" subtitle="租户范围文件上传、元数据查询与下载 (APP-01 上传文件) 及脱敏凭证管理">
      <template #actions>
        <el-button v-if="tab === 'tenant-files'" type="primary" @click="openUploadDialog">上传文件</el-button>
        <el-button v-else-if="tab === 'credentials'" type="primary" @click="openCreate">登记凭证</el-button>
        <el-button v-else type="primary" @click="openCreate">创建上传会话</el-button>
        <el-button @click="refreshCurrentTab">刷新</el-button>
      </template>
    </PageHeader>

    <el-tabs v-model="tab" @tab-change="onTabChange">
      <el-tab-pane label="租户文件 (APP-01 上传文件)" name="tenant-files" />
      <el-tab-pane label="脱敏凭证" name="credentials" />
      <el-tab-pane label="文件上传会话 (Legacy)" name="files" />
    </el-tabs>

    <!-- Tab 1: Tenant Files (APP-01 上传文件) -->
    <div v-if="tab === 'tenant-files'" class="panel body">
      <div class="filter-row flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div class="flex items-center gap-2 flex-wrap">
          <el-input v-model="fileFilters.keyword" placeholder="搜索文件名 / 文件 ID" clearable style="width: 220px" @keyup.enter="loadTenantFiles" />
          <el-select v-model="fileFilters.templateType" placeholder="模板类型" clearable style="width: 160px" @change="loadTenantFiles">
            <el-option label="全部类型" value="" />
            <el-option label="数据元模板 (DATA_ELEMENT)" value="DATA_ELEMENT" />
            <el-option label="方案模板 (PROFILE)" value="PROFILE" />
            <el-option label="质检凭据 (QUALITY_EVIDENCE)" value="QUALITY_EVIDENCE" />
            <el-option label="通用文件 (GENERAL)" value="GENERAL" />
          </el-select>
          <el-button type="primary" :loading="loadingFiles" @click="loadTenantFiles">查询</el-button>
          <el-button @click="resetFileFilters">重置</el-button>
        </div>
        <div class="text-xs text-gray-500">
          支持直接下载文件内容、查询文件元数据并用于数据元导入
        </div>
      </div>

      <el-table v-loading="loadingFiles" :data="tenantFileList" stripe border style="width: 100%">
        <el-table-column prop="fileId" label="文件 ID" min-width="160">
          <template #default="{ row }">
            <span class="mono text-xs font-semibold text-emerald-800">{{ row.fileId || row.id }}</span>
            <el-button link size="small" type="primary" class="ml-1" @click="copyText(row.fileId || row.id)">复制</el-button>
          </template>
        </el-table-column>
        <el-table-column prop="fileName" label="文件名" min-width="180">
          <template #default="{ row }">
            <div class="font-medium text-gray-900">{{ row.fileName || row.name }}</div>
            <div class="text-xs text-gray-400">{{ row.contentType || 'application/octet-stream' }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="templateType" label="模板类型" width="160">
          <template #default="{ row }">
            <el-tag size="small" :type="row.templateType === 'DATA_ELEMENT' ? 'success' : 'info'">
              {{ row.templateType || 'GENERAL' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="templateVersion" label="模板版本" width="110">
          <template #default="{ row }">
            <span class="text-xs text-gray-600">{{ row.templateVersion || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="fileSize" label="大小" width="110">
          <template #default="{ row }">
            <span class="text-xs text-gray-600">{{ formatFileSize(row.fileSize || row.sizeBytes) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="上传时间" min-width="150">
          <template #default="{ row }">
            <span class="text-xs text-gray-500">{{ row.createdAt || row.uploadTime || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" :loading="downloadingId === (row.fileId || row.id)" @click="handleDownloadContent(row)">下载内容</el-button>
            <el-button link size="small" @click="handleViewMetadata(row)">元数据</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- Tab 2: Credentials -->
    <div v-else-if="tab === 'credentials'" class="panel body">
      <div class="toolbar">
        <el-input v-model="lookupId" placeholder="凭证 ID" clearable style="max-width:300px" />
        <el-button type="primary" :loading="loading" @click="lookup">查询</el-button>
      </div>
      <el-descriptions v-if="result" :column="1" border style="margin-top:16px">
        <el-descriptions-item v-for="(value, key) in result" :key="key" :label="String(key)">
          <pre>{{ format(value) }}</pre>
        </el-descriptions-item>
      </el-descriptions>
      <el-empty v-else description="输入凭证 ID 查询，或点击上方「登记凭证」" />
    </div>

    <!-- Tab 3: Legacy Upload Session -->
    <div v-else class="panel body">
      <div class="toolbar">
        <el-input v-model="lookupId" placeholder="文件 ID 或上传会话 ID" clearable style="max-width:300px" />
        <el-button type="primary" :loading="loading" @click="lookup">查询</el-button>
        <el-switch v-model="sessionLookup" active-text="按会话查询" inactive-text="按文件查询" />
      </div>
      <el-alert type="info" :closable="false" title="创建会话后按返回的上传 URL 传输文件，取得对象版本或 ETag 后确认完成。" />
      <el-descriptions v-if="result" :column="1" border style="margin-top:16px">
        <el-descriptions-item v-for="(value, key) in result" :key="key" :label="String(key)">
          <pre>{{ format(value) }}</pre>
        </el-descriptions-item>
      </el-descriptions>
      <el-empty v-else description="输入 ID 查询，或创建会话" />
      <UploadSessionTransfer v-if="sessionLookup && result?.uploadUrl" :key="lookupId" :upload-url="String(result.uploadUrl)" @uploaded="objectVersion=$event" />
      <div v-if="sessionLookup && result" class="toolbar mt-4">
        <el-input v-model="objectVersion" placeholder="对象版本或 ETag" style="max-width:280px" />
        <el-button type="primary" :loading="saving" @click="complete">确认上传完成</el-button>
      </div>
    </div>

    <!-- Upload File Dialog (APP-01 上传文件) -->
    <el-dialog v-model="uploadDialogVisible" title="上传租户文件 (APP-01)" width="520px" :close-on-click-modal="false">
      <el-form label-position="top">
        <el-form-item label="选择文件" required>
          <input ref="fileInputRef" type="file" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer" @change="onFileSelected" />
          <div v-if="selectedFile" class="text-xs text-gray-500 mt-1">
            已选择: {{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})
          </div>
        </el-form-item>
        <el-form-item label="模板类型 (templateType)">
          <el-select v-model="uploadForm.templateType" style="width: 100%">
            <el-option label="数据元模板 (DATA_ELEMENT)" value="DATA_ELEMENT" />
            <el-option label="方案模板 (PROFILE)" value="PROFILE" />
            <el-option label="质检凭据 (QUALITY_EVIDENCE)" value="QUALITY_EVIDENCE" />
            <el-option label="通用文件 (GENERAL)" value="GENERAL" />
          </el-select>
        </el-form-item>
        <el-form-item label="模板版本 (templateVersion)">
          <el-input v-model="uploadForm.templateVersion" placeholder="例如: 1.0.0" />
        </el-form-item>
        <el-form-item label="备注说明">
          <el-input v-model="uploadForm.remark" placeholder="文件用途或业务说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="uploadDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="uploading" :disabled="!selectedFile" @click="submitUploadFile">开始上传</el-button>
      </template>
    </el-dialog>

    <!-- Metadata Drawer -->
    <el-drawer v-model="metadataDrawerVisible" title="文件元数据详情 (GET /tenant-access/files/{id})" size="480px">
      <div v-if="activeMetadata" class="space-y-4">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="文件 ID"><span class="mono font-bold">{{ activeMetadata.fileId || activeMetadata.id }}</span></el-descriptions-item>
          <el-descriptions-item label="文件名">{{ activeMetadata.fileName }}</el-descriptions-item>
          <el-descriptions-item label="内容类型">{{ activeMetadata.contentType }}</el-descriptions-item>
          <el-descriptions-item label="文件大小">{{ formatFileSize(activeMetadata.fileSize || activeMetadata.sizeBytes) }}</el-descriptions-item>
          <el-descriptions-item label="模板类型">{{ activeMetadata.templateType || '-' }}</el-descriptions-item>
          <el-descriptions-item label="模板版本">{{ activeMetadata.templateVersion || '-' }}</el-descriptions-item>
          <el-descriptions-item label="SHA-256 摘要"><span class="mono text-xs break-all">{{ activeMetadata.sha256 || activeMetadata.contentDigest || '-' }}</span></el-descriptions-item>
          <el-descriptions-item label="上传人">{{ activeMetadata.uploader || activeMetadata.createdBy || '-' }}</el-descriptions-item>
          <el-descriptions-item label="上传时间">{{ activeMetadata.createdAt || activeMetadata.uploadTime || '-' }}</el-descriptions-item>
        </el-descriptions>
        <div class="mt-4 flex gap-2">
          <el-button type="primary" :loading="downloadingId === (activeMetadata.fileId || activeMetadata.id)" @click="handleDownloadContent(activeMetadata)">下载该文件</el-button>
          <el-button @click="copyText(activeMetadata.fileId || activeMetadata.id)">复制文件 ID</el-button>
        </div>
      </div>
    </el-drawer>

    <!-- Legacy Dialog -->
    <el-dialog v-model="dialogVisible" :title="tab === 'files' ? '创建上传会话' : '登记脱敏凭证'" width="620px" destroy-on-close>
      <el-form v-if="tab === 'files'" label-position="top">
        <el-form-item label="文件名" required><el-input v-model="fileForm.fileName" /></el-form-item>
        <el-form-item label="内容类型" required><el-input v-model="fileForm.contentType" placeholder="application/pdf" /></el-form-item>
        <el-form-item label="文件字节数"><el-input v-model="fileForm.sizeBytes" /></el-form-item>
        <el-form-item label="SHA-256 摘要"><el-input v-model="fileForm.contentDigest" placeholder="sha256:..." /></el-form-item>
        <el-form-item label="业务用途" required>
          <el-select v-model="fileForm.businessPurpose">
            <el-option v-for="value in ['QUALITY_EVIDENCE','TRACE_EVIDENCE','BATCH_INPUT']" :key="value" :label="value" :value="value" />
          </el-select>
        </el-form-item>
        <el-form-item label="存储范围" required>
          <el-select v-model="fileForm.storageScope">
            <el-option label="租户私有" value="TENANT_PRIVATE" />
            <el-option label="共享交换" value="SHARED_EXCHANGE" />
          </el-select>
        </el-form-item>
        <el-form-item label="安全级别">
          <el-select v-model="fileForm.securityClass">
            <el-option v-for="value in ['PUBLIC','INTERNAL','SENSITIVE','STRICT_SENSITIVE']" :key="value" :label="value" :value="value" />
          </el-select>
        </el-form-item>
      </el-form>
      <el-form v-else label-position="top">
        <el-form-item label="凭证类型" required><el-input v-model="credentialForm.credentialType" /></el-form-item>
        <el-form-item label="签发方主体 ID" required><el-input v-model="credentialForm.issuerPartyId" /></el-form-item>
        <el-form-item label="持有方主体 ID" required><el-input v-model="credentialForm.subjectPartyId" /></el-form-item>
        <el-form-item label="凭证号不可逆摘要" required><el-input v-model="credentialForm.credentialNoHash" /></el-form-item>
        <el-form-item label="生效时间"><el-date-picker v-model="credentialForm.validFrom" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" /></el-form-item>
        <el-form-item label="失效时间"><el-date-picker v-model="credentialForm.validTo" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" /></el-form-item>
        <el-form-item label="非敏感属性 JSON"><JsonEditor v-model="attributesText" :rows="5" label="非敏感属性 JSON" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import PageHeader from '@/components/common/PageHeader.vue';
import JsonEditor from '@/components/common/JsonEditor.vue';
import UploadSessionTransfer from '@/components/common/UploadSessionTransfer.vue';
import { extendedServices } from '@/api/extendedServices';
import { apiErrorMessage } from '@/api/client';

const tab = ref<'tenant-files' | 'credentials' | 'files'>('tenant-files');
const lookupId = ref('');
const sessionLookup = ref(true);
const objectVersion = ref('');
const result = ref<Record<string, unknown> | null>(null);
const loading = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);

// APP-01 Tenant Files State
const tenantFileList = ref<any[]>([]);
const loadingFiles = ref(false);
const fileFilters = reactive({ keyword: '', templateType: '' });
const uploadDialogVisible = ref(false);
const uploading = ref(false);
const selectedFile = ref<File | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const uploadForm = reactive({ templateType: 'DATA_ELEMENT', templateVersion: '1.0.0', remark: '' });
const downloadingId = ref('');
const metadataDrawerVisible = ref(false);
const activeMetadata = ref<any>(null);

const fileForm = reactive({
  fileName: '',
  contentType: 'application/pdf',
  sizeBytes: '',
  contentDigest: '',
  businessPurpose: 'QUALITY_EVIDENCE',
  storageScope: 'TENANT_PRIVATE',
  securityClass: 'INTERNAL',
});
const credentialForm = reactive({
  credentialType: '',
  issuerPartyId: '',
  subjectPartyId: '',
  credentialNoHash: '',
  validFrom: '',
  validTo: '',
});
const attributesText = ref('{}');

watch([tab, sessionLookup], () => {
  result.value = null;
  lookupId.value = '';
  objectVersion.value = '';
}, { flush: 'sync' });

onMounted(() => {
  void loadTenantFiles();
});

function onTabChange(newTab: string) {
  if (newTab === 'tenant-files') {
    void loadTenantFiles();
  }
}

function refreshCurrentTab() {
  if (tab.value === 'tenant-files') {
    void loadTenantFiles();
  } else if (lookupId.value) {
    void lookup();
  }
}

async function loadTenantFiles() {
  loadingFiles.value = true;
  try {
    const list = await extendedServices.listFiles({
      templateType: fileFilters.templateType || undefined,
    });
    let filtered = list;
    if (fileFilters.keyword.trim()) {
      const kw = fileFilters.keyword.trim().toLowerCase();
      filtered = list.filter((f: any) =>
        (f.fileName && f.fileName.toLowerCase().includes(kw)) ||
        (f.fileId && String(f.fileId).toLowerCase().includes(kw))
      );
    }
    tenantFileList.value = filtered;
  } catch (error) {
    ElMessage.error(apiErrorMessage(error, '加载文件列表失败'));
  } finally {
    loadingFiles.value = false;
  }
}

function resetFileFilters() {
  fileFilters.keyword = '';
  fileFilters.templateType = '';
  void loadTenantFiles();
}

function openUploadDialog() {
  selectedFile.value = null;
  if (fileInputRef.value) fileInputRef.value.value = '';
  uploadDialogVisible.value = true;
}

function onFileSelected(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0];
  }
}

async function submitUploadFile() {
  if (!selectedFile.value) return ElMessage.warning('请选择要上传的文件');
  uploading.value = true;
  try {
    const res = await extendedServices.uploadFile(selectedFile.value, {
      templateType: uploadForm.templateType,
      templateVersion: uploadForm.templateVersion,
      remark: uploadForm.remark,
    });
    ElMessage.success(`文件上传成功，文件 ID: ${res.fileId || res.id}`);
    uploadDialogVisible.value = false;
    await loadTenantFiles();
  } catch (error) {
    ElMessage.error(apiErrorMessage(error, '上传失败'));
  } finally {
    uploading.value = false;
  }
}

async function handleDownloadContent(row: any) {
  const id = row.fileId || row.id;
  if (!id) return;
  downloadingId.value = id;
  try {
    const blob = await extendedServices.downloadFileContent(id);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = row.fileName || `file_${id}.bin`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    ElMessage.success('开始下载文件');
  } catch (error) {
    ElMessage.error(apiErrorMessage(error, '下载文件失败'));
  } finally {
    downloadingId.value = '';
  }
}

async function handleViewMetadata(row: any) {
  const id = row.fileId || row.id;
  try {
    const meta = await extendedServices.getFileMetadata(id);
    activeMetadata.value = meta;
    metadataDrawerVisible.value = true;
  } catch (error) {
    ElMessage.error(apiErrorMessage(error, '获取元数据失败'));
  }
}

function copyText(val: string | number) {
  navigator.clipboard.writeText(String(val)).then(() => {
    ElMessage.success('已复制到剪贴板');
  });
}

function formatFileSize(bytes?: number | string) {
  if (!bytes) return '0 B';
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

const format = (value: unknown) => typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '-');
function openCreate() { dialogVisible.value = true; }

async function lookup() {
  if (!/^\d+$/.test(lookupId.value.trim())) {
    ElMessage.warning('请输入数字字符串 ID');
    return;
  }
  loading.value = true;
  try {
    result.value = tab.value === 'credentials'
      ? await extendedServices.getCredential(lookupId.value)
      : sessionLookup.value
        ? await extendedServices.getUploadSession(lookupId.value)
        : await extendedServices.getFile(lookupId.value);
  } catch (e) {
    result.value = null;
    ElMessage.error(apiErrorMessage(e, '查询失败'));
  } finally {
    loading.value = false;
  }
}

async function submit() {
  saving.value = true;
  try {
    if (tab.value === 'files') {
      if (!fileForm.fileName.trim() || !fileForm.contentType.trim()) {
        ElMessage.warning('请填写文件名和内容类型');
        return;
      }
      const session = await extendedServices.createUploadSession({
        ...fileForm,
        sizeBytes: fileForm.sizeBytes || undefined,
        contentDigest: fileForm.contentDigest || undefined,
      });
      sessionLookup.value = true;
      result.value = session;
      lookupId.value = session.uploadSessionId;
      objectVersion.value = '';
    } else {
      if (!credentialForm.credentialType || !/^\d+$/.test(credentialForm.issuerPartyId) || !/^\d+$/.test(credentialForm.subjectPartyId) || !credentialForm.credentialNoHash) {
        ElMessage.warning('请填写凭证类型、主体 ID 和摘要');
        return;
      }
      result.value = await extendedServices.createCredential({
        ...credentialForm,
        validFrom: credentialForm.validFrom || undefined,
        validTo: credentialForm.validTo || undefined,
        attributes: JSON.parse(attributesText.value),
      });
      lookupId.value = String(result.value.id || result.value.credentialId || '');
    }
    dialogVisible.value = false;
    ElMessage.success('提交成功');
  } catch (e) {
    ElMessage.error(apiErrorMessage(e, '提交失败，请检查 JSON 和请求字段'));
  } finally {
    saving.value = false;
  }
}

async function complete() {
  if (!lookupId.value || !objectVersion.value.trim()) {
    ElMessage.warning('请输入会话 ID 和对象版本');
    return;
  }
  saving.value = true;
  try {
    const file = await extendedServices.completeUpload(lookupId.value, objectVersion.value.trim());
    sessionLookup.value = false;
    result.value = file;
    lookupId.value = String(file.fileId || file.id || '');
    ElMessage.success('完成确认已提交');
  } catch (e) {
    ElMessage.error(apiErrorMessage(e, '确认失败'));
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.body {
  padding: 16px;
}
.toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  margin: 0;
}
</style>
