import { request } from './client';
import { mockProjections } from './mockData';
import type { ExchangeProjection } from '@/types';

export interface ExchangeFieldRule {
  id: string | number;
  datasetId: string | number;
  targetPath: string;
  dataElement: string;
  sourceSelector: string;
  transform: string;
  required: boolean;
  requiredPolicy?: string;
  missingStrategy: string;
  valueDomain: string;
  securityLevel: string;
  ordinal?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExchangeProfile {
  id: string | number;
  profileCode: string;
  name: string;
  profileOwner: string;
  scenarioCode: string;
  status: 'ACTIVE' | 'INACTIVE' | string;
  createdAt?: string;
  updatedAt?: string;
  version: string;
  dataset: string;
  rules: ExchangeFieldRule[];
  datasets: any[];
}

const mockProfiles: ExchangeProfile[] = [{
  id: 'PROF-01', profileCode: 'SH-PIECE-TRACE', name: '上海中药饮片互认追溯规范包',
  profileOwner: '上海长三角中药饮片互认联盟', scenarioCode: 'PIECE_TRACE', version: '1.2.0',
  dataset: 'PIECE_TRACE_DATASET', datasets: [], status: 'ACTIVE', createdAt: '2026-03-01 09:00:00', updatedAt: '2026-08-01 10:30:00',
  rules: [
    { id: 1, datasetId: 1, targetPath: '$.payload.batchNo', dataElement: 'DE_BATCH_NO', sourceSelector: 'batchNo', transform: 'DIRECT_PASS', required: true, missingStrategy: 'REJECT', valueDomain: 'GB/T 31774', securityLevel: 'PUBLIC' },
    { id: 2, datasetId: 1, targetPath: '$.payload.insuranceCode', dataElement: 'DE_NHSA_CODE', sourceSelector: 'medicalInsurancePieceCode', transform: 'FORMAT_16_DIGIT', required: true, missingStrategy: 'REJECT', valueDomain: '16位国家医保代码', securityLevel: 'SENSITIVE' }
  ]
}];

function mapRule(item: any): ExchangeFieldRule {
  return {
    id: item.id, datasetId: item.datasetId, targetPath: item.targetPath, dataElement: item.dataElementCode,
    sourceSelector: item.sourceSelector,
    transform: typeof item.transformJson === 'string' ? item.transformJson : JSON.stringify(item.transformJson || {}),
    required: item.requiredPolicy === 'REQUIRED', requiredPolicy: item.requiredPolicy, missingStrategy: item.missingPolicy, valueDomain: item.valueSetCode,
    securityLevel: item.securityClass, ordinal: item.ordinal, createdAt: item.createdAt, updatedAt: item.updatedAt
  };
}

async function hydrateProfile(item: any): Promise<ExchangeProfile> {
  let versions: any[] = [];
  try {
    const versionsResponse: any = await request.get(`/openapi/v1/exchange-query/profiles/${item.id}/versions`);
    versions = Array.isArray(versionsResponse) ? versionsResponse : (versionsResponse?.records || []);
  } catch {
    versions = [];
  }
  const version = versions.find(v => v.status === 'PUBLISHED') || versions[0];
  let fields: any[] = [];
  if (version?.id) {
    try {
      const fieldsRes: any = await request.get(`/openapi/v1/exchange-query/profile-versions/${version.id}/fields`);
      fields = Array.isArray(fieldsRes) ? fieldsRes : (fieldsRes?.records || []);
    } catch {
      fields = [];
    }
  }
  return {
    id: item.id, profileCode: item.profileCode, name: item.profileName, profileOwner: item.profileOwner,
    scenarioCode: item.scenarioCode, status: item.status, createdAt: item.createdAt, updatedAt: item.updatedAt,
    version: version?.version || '', dataset: item.scenarioCode || '',
    datasets: [], rules: Array.isArray(fields) ? fields.map(mapRule) : []
  };
}

export const exchangeApi = {
  async getProfiles(params?: { profileCode?: string; limit?: number; page?: number; size?: number }): Promise<ExchangeProfile[]> {
    const res: any = await request.get('/openapi/v1/exchange-query/profiles', {
      params: {
        profileCode: params?.profileCode || undefined,
        size: params?.limit || params?.size || 50,
        page: params?.page || 1
      }
    });
    const list = Array.isArray(res) ? res : (res?.records || []);
    return Promise.all(list.map(hydrateProfile));
  },

  async createProfile(data: { profileCode: string; profileName: string; profileOwner: string; scenarioCode: string; status: string }): Promise<any> {
    return request.post('/openapi/v1/exchange-query/profiles', data);
  },

  async updateProfile(id: string | number, data: { profileCode: string; profileName: string; profileOwner: string; scenarioCode: string; status: string }): Promise<any> {
    return request.post(`/openapi/v1/exchange-query/profiles/${id}`, data);
  },

  async copyProfile(data: { sourceProfileVersionId: string; targetProfileCode: string; targetProfileName: string; targetProfileOwner: string; scenarioCode: string }): Promise<any> {
    return request.post('/openapi/v1/exchange-query/profiles/copy', data);
  },

  async getProfileVersions(id: string | number): Promise<any[]> {
    const res: any = await request.get(`/openapi/v1/exchange-query/profiles/${id}/versions`);
    return Array.isArray(res) ? res : (res?.records || []);
  },

  async createProfileVersion(data: { profileId: string; sourceSchemaId: string; version: string; description?: string }): Promise<any> {
    return request.post('/openapi/v1/exchange-query/profile-versions', data);
  },

  async getProfileVersion(id: string | number): Promise<any> {
    return request.get(`/openapi/v1/exchange-query/profile-versions/${id}`);
  },

  async testProfileVersion(id: string | number): Promise<any> {
    return request.post(`/openapi/v1/exchange-query/profile-versions/${id}/test`);
  },

  async publishProfileVersion(id: string | number): Promise<any> {
    return request.post(`/openapi/v1/exchange-query/profile-versions/${id}/publish`);
  },

  async retireProfileVersion(id: string | number): Promise<any> {
    return request.post(`/openapi/v1/exchange-query/profile-versions/${id}/retire`);
  },

  async copyProfileVersion(id: string | number, targetVersion: string): Promise<any> {
    return request.post(`/openapi/v1/exchange-query/profile-versions/${id}/copy`, { targetVersion });
  },

  async importFields(versionId: string | number, sourceSchemaFieldIds: string[]): Promise<any> {
    return request.post(`/openapi/v1/exchange-query/profile-versions/${versionId}/fields/import`, { sourceSchemaFieldIds });
  },

  async getSourceFields(versionId: string | number): Promise<any[]> {
    const res: any = await request.get(`/openapi/v1/exchange-query/profile-versions/${versionId}/source-fields`);
    return Array.isArray(res) ? res : (res?.records || []);
  },

  async getProfileFields(versionId: string | number): Promise<any[]> {
    const res: any = await request.get(`/openapi/v1/exchange-query/profile-versions/${versionId}/fields`);
    return Array.isArray(res) ? res : (res?.records || []);
  },

  async createProfileField(data: any): Promise<any> {
    return request.post('/openapi/v1/exchange-query/profile-fields', data);
  },

  async updateProfileField(fieldId: string | number, data: any): Promise<any> {
    return request.post(`/openapi/v1/exchange-query/profile-fields/${fieldId}`, data);
  },

  async deleteProfileField(fieldId: string | number): Promise<any> {
    return request.get(`/openapi/v1/exchange-query/profile-fields/${fieldId}/delete`);
  },

  async getProfileVersionParams(versionId: string | number): Promise<any[]> {
    const res: any = await request.get(`/openapi/v1/exchange-query/profile-versions/${versionId}/params`);
    return Array.isArray(res) ? res : (res?.records || []);
  },

  async createProfileVersionParam(versionId: string | number, data: any): Promise<any> {
    return request.post(`/openapi/v1/exchange-query/profile-versions/${versionId}/params`, data);
  },

  async updateProfileVersionParam(versionId: string | number, paramId: string | number, data: any): Promise<any> {
    return request.put(`/openapi/v1/exchange-query/profile-versions/${versionId}/params/${paramId}`, data);
  },

  async deleteProfileVersionParam(versionId: string | number, paramId: string | number): Promise<any> {
    return request.get(`/openapi/v1/exchange-query/profile-versions/${versionId}/params/${paramId}/delete`);
  },

  // APP-06 查询方案授权绑定管理
  async createBinding(data: { projectSpaceId: string; profileVersionId: string; targetSourceSystemId: string; status: string; deliveryConfigJson: any }): Promise<any> {
    return request.post('/openapi/v1/exchange-query/bindings', data);
  },

  async updateBinding(id: string | number, data: any): Promise<any> {
    return request.post(`/openapi/v1/exchange-query/bindings/${id}`, data);
  },

  async getProjectBindings(projectId: string | number): Promise<any[]> {
    const res: any = await request.get(`/openapi/v1/exchange-query/projects/${projectId}/bindings`);
    return Array.isArray(res) ? res : (res?.records || []);
  },

  async getVersionBindings(versionId: string | number, params?: { projectSpaceId?: string; targetSourceSystemId?: string; status?: string; page?: number; size?: number }): Promise<any> {
    return request.get(`/openapi/v1/exchange-query/profile-versions/${versionId}/bindings`, { params });
  },

  async getProjections(params?: { query?: string; profileCode?: string }): Promise<ExchangeProjection[]> {
    return mockProjections.filter(p => {
      if (params?.profileCode && p.profileCode !== params.profileCode) return false;
      if (!params?.query) return true;
      const q = params.query.toLowerCase();
      return p.projectionNo.toLowerCase().includes(q) || p.profileName.toLowerCase().includes(q) || p.profileCode.toLowerCase().includes(q);
    });
  },

  async createProjection(payload: {
    projectSpaceId?: string | number;
    profileCode: string; profileVersion?: string; subjectType?: string; subjectIds?: Array<number | string>;
    datasetCodes?: string[]; asOfTime?: string; deliveryMode?: string;
  }): Promise<any> {
    const projectSpaceId = String(payload.projectSpaceId || localStorage.getItem('tcmirp_project_space_id') || localStorage.getItem('tcmirp_project_id') || '1');
    return request.post('/exchange-query/projections', {
      projectSpaceId, profileCode: payload.profileCode, profileVersion: payload.profileVersion || '1.0.0',
      subjectType: payload.subjectType || 'BATCH', subjectIds: (payload.subjectIds || []).map(String),
      datasetCodes: payload.datasetCodes || [], asOfTime: payload.asOfTime || undefined,
      deliveryMode: payload.deliveryMode || 'QUERY_ONLY'
    }, { headers: {
      'X-Idempotency-Key': `PROJECTION-${Date.now()}`,
      'X-Purpose-Code': 'EXCHANGE_OUTPUT'
    } });
  },

  async getProjection(id: string | number, params: {
    projectSpaceId?: string | number; purposeCode?: string; includeOutput?: boolean; includeValidationDetails?: boolean;
  } = {}): Promise<any> {
    return request.get(`/exchange-query/projections/${id}`, { params: {
      projectSpaceId: String(params.projectSpaceId || localStorage.getItem('tcmirp_project_space_id') || '1'),
      purposeCode: params.purposeCode || localStorage.getItem('tcmirp_purpose_code') || 'TRACE',
      includeOutput: params.includeOutput ?? true, includeValidationDetails: params.includeValidationDetails ?? true
    } });
  },

  async executeEncryptedQuery(data: any): Promise<any> {
    return request.post('/openapi/v1/exchange-query', data);
  }
};
