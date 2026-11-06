import { request } from './client';
import type { EventSchemaField, EventSchemaReferenceRule } from './events';
import type { SourceSystemManagement } from './governance';

export interface PageResult<T> { records: T[]; total: string; page: string; size: string }
export interface SourceSystemKey {
  id: string; tenantId: string; sourceSystemId: string;
  keyAlgorithm: 'RSA' | 'SM2'; dataAlgorithm: 'SM4' | 'AES';
  publicKey: string; clientPublicKey: string; status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string; updatedAt?: string;
}
export interface KeyCreateRequest {
  keyAlgorithm: 'RSA' | 'SM2'; dataAlgorithm: 'SM4' | 'AES'; clientPublicKey: string;
}
export interface EventAuthorization {
  tenantId: string; projectSpaceId: string; projectStatus: string;
  eventType: string; eventName: string; eventTypeStatus: string;
  authorized: boolean; authorizationStatus?: 'ACTIVE' | 'INACTIVE';
  validFrom?: string; validTo?: string; lockVersion?: number;
}
export interface AuthorizationItem { eventType: string; validFrom?: string; validTo?: string }
export interface IntegrationSelection {
  tenantId: string; projectSpaceId: string; sourceSystemId: string;
  sourceSystemKeyId: string; eventType: string; schemaVersion: string;
}
export interface IntegrationIssue { path?: string; code?: string; message?: string }
export interface IntegrationValidation {
  valid: boolean; errors: IntegrationIssue[]; requiredInputs: IntegrationIssue[]; scope?: string;
}
export interface IntegrationSchema {
  id: string; eventType: string; schemaVersion: string; status: string; contentDigest?: string;
  fields: EventSchemaField[]; referenceRules: EventSchemaReferenceRule[];
}
export interface IntegrationExample {
  endpoint: string; method: string; plaintextRequest: Record<string, unknown>;
  sdkConfig: Record<string, unknown>; fields: EventSchemaField[];
  referenceRules: EventSchemaReferenceRule[]; schemaDigest: string;
  validation: IntegrationValidation;
}
export interface TenantOption { tenantId: string; tenantName: string; tenantCode: string }
export interface ProjectOption { projectSpaceId: string; projectName: string; projectCode: string; status: string }
export type OptionQuery = Record<string, string | number | undefined>;
const assistant = '/ingestion-governance/integration-assistant';
const exchangeAssistant = '/exchange-query/integration-assistant';
const authorizationPath = (tenantId: string, projectSpaceId: string) =>
  `/openapi/v1/event-fact/event-type-authorizations/tenants/${encodeURIComponent(tenantId)}/project-spaces/${encodeURIComponent(projectSpaceId)}/event-types`;

export const sourceKeysApi = {
  list(params: { tenantId?: string; sourceSystemId?: string; status: SourceSystemKey['status']; page?: number; size?: number }): Promise<SourceSystemKey[]> {
    return request.get<any, any>('/openapi/v1/source-systems-keys', { params }).then(res => res?.records || (Array.isArray(res) ? res : []));
  },
  create(sourceSystemId: string, data: KeyCreateRequest & { tenantId?: string }): Promise<SourceSystemKey> {
    const tenantId = data.tenantId || localStorage.getItem('tcmirp_tenant_id') || '1';
    return request.post('/openapi/v1/source-systems-keys', {
      tenantId,
      sourceSystemId,
      keyAlgorithm: data.keyAlgorithm,
      dataAlgorithm: data.dataAlgorithm,
      clientPublicKey: data.clientPublicKey
    });
  },
  createForTenant(tenantId: string, sourceSystemId: string, data: KeyCreateRequest): Promise<SourceSystemKey> {
    return request.post('/openapi/v1/source-systems-keys', {
      tenantId,
      sourceSystemId,
      keyAlgorithm: data.keyAlgorithm,
      dataAlgorithm: data.dataAlgorithm,
      clientPublicKey: data.clientPublicKey
    });
  },
  changeStatus(sourceSystemId: string, keyId: string, status: SourceSystemKey['status'], tenantId?: string): Promise<SourceSystemKey> {
    const tid = tenantId || localStorage.getItem('tcmirp_tenant_id') || '1';
    return request.post('/openapi/v1/source-systems-keys/status', {
      tenantId: tid,
      sourceSystemId,
      keyId,
      status
    });
  }
};

export const eventAuthorizationsApi = {
  list(tenantId: string, projectSpaceId: string): Promise<EventAuthorization[]> {
    return request.get(authorizationPath(tenantId, projectSpaceId));
  },
  save(tenantId: string, projectSpaceId: string, eventTypes: AuthorizationItem[]): Promise<EventAuthorization[]> {
    return request.post(authorizationPath(tenantId, projectSpaceId), { eventTypes });
  }
};

export const integrationApi = {
  tenants(params: OptionQuery): Promise<PageResult<TenantOption>> { return request.get(`${assistant}/tenants`, { params }); },
  projects(params: OptionQuery): Promise<PageResult<ProjectOption>> { return request.get(`${assistant}/project-spaces`, { params }); },
  sources(params: OptionQuery): Promise<PageResult<SourceSystemManagement>> { return request.get(`${assistant}/source-systems`, { params }); },
  keys(params: OptionQuery): Promise<PageResult<SourceSystemKey>> { return request.get(`${assistant}/source-system-keys`, { params }); },
  events(params: OptionQuery): Promise<PageResult<EventAuthorization>> { return request.get(`${assistant}/event-types`, { params }); },
  schemas(params: OptionQuery): Promise<PageResult<IntegrationSchema>> { return request.get(`${assistant}/schemas`, { params }); },
  example(data: IntegrationSelection & { sampleEventJson?: string; idempotencyKey?: string }): Promise<IntegrationExample> {
    return request.post(`${assistant}/request-examples`, data);
  },
  encrypt(data: any): Promise<any> {
    return request.post(`${assistant}/request-examples/encrypt`, data);
  },
  validate(plaintextRequest: string): Promise<IntegrationValidation> {
    return request.post(`${assistant}/validate`, { plaintextRequest });
  }
};

// APP-06 查询方案对接助手
export const exchangeAssistantApi = {
  tenants(params: OptionQuery): Promise<PageResult<TenantOption>> { return request.get(`${exchangeAssistant}/tenants`, { params }); },
  projects(params: OptionQuery): Promise<PageResult<ProjectOption>> { return request.get(`${exchangeAssistant}/project-spaces`, { params }); },
  sources(params: OptionQuery): Promise<PageResult<SourceSystemManagement>> { return request.get(`${exchangeAssistant}/source-systems`, { params }); },
  keys(params: OptionQuery): Promise<PageResult<SourceSystemKey>> { return request.get(`${exchangeAssistant}/source-system-keys`, { params }); },
  profiles(params: OptionQuery): Promise<PageResult<any>> { return request.get(`${exchangeAssistant}/profiles`, { params }); },
  profileVersions(params: OptionQuery): Promise<PageResult<any>> { return request.get(`${exchangeAssistant}/profile-versions`, { params }); },
  profileDefinition(params: { profileVersionId: string }): Promise<any> {
    return request.get(`${exchangeAssistant}/profile-definition`, { params });
  },
  requestExample(data: {
    tenantId: string;
    projectSpaceId: string;
    sourceSystemId: string;
    sourceSystemKeyId: string;
    profileId: string;
    profileVersionId: string;
    queryParameters?: Record<string, any>;
  }): Promise<any> {
    return request.post(`${exchangeAssistant}/request-examples`, data);
  },
  encryptExample(data: any): Promise<any> {
    return request.post(`${exchangeAssistant}/request-examples/encrypt`, data);
  }
};
