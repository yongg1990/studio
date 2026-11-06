// Swagger /v3/api-docs, 2026-10-19: only groups explicitly marked 可对接.
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export interface ContractEndpoint { method: ApiMethod; path: string; desc: string }
const endpoint = (method: ApiMethod, path: string, desc: string): ContractEndpoint => ({ method, path, desc });
const resource = (path: string, name: string, id = 'id'): ContractEndpoint[] => [
  endpoint('GET', path, `分页查询${name}`), endpoint('POST', path, `创建${name}`),
  endpoint('GET', `${path}/{${id}}`, `查询${name}详情`), endpoint('POST', `${path}/{${id}}`, `更新${name}`)
];
const assistant = '/ingestion-governance/integration-assistant';
const authorization = '/openapi/v1/event-fact/event-type-authorizations/tenants/{tenantId}/project-spaces/{projectSpaceId}/event-types';
export const CONNECTABLE_GROUPS: Record<string, ContractEndpoint[]> = {
  'APP-01 登录认证': [endpoint('POST', '/tenant-access/auth/login', '用户登录'), endpoint('POST', '/tenant-access/auth/logout', '退出登录')],
  'APP-01 租户与访问控制': [
    endpoint('GET', '/tenant-access/tenants', '分页查询租户'), endpoint('POST', '/tenant-access/tenants', '创建租户'),
    endpoint('GET', '/tenant-access/tenants/permitted', '查询当前用户可选租户'),
    endpoint('GET', '/tenant-access/tenants/{id}', '查询租户详情'), endpoint('POST', '/tenant-access/tenants/{id}/update', '更新租户'),
    endpoint('GET', '/tenant-access/tenants/{id}/delete', '删除租户')
  ],
  'APP-01 用户与角色': [
    endpoint('GET', '/tenant-access/users', '查询用户列表'), endpoint('GET', '/tenant-access/users/page', '分页查询用户'),
    endpoint('POST', '/tenant-access/users', '创建用户'), endpoint('GET', '/tenant-access/users/{userId}/roles', '查询已绑定角色'),
    endpoint('POST', '/tenant-access/users/{userId}/roles', '批量绑定角色'), endpoint('POST', '/tenant-access/users/{userId}/roles/delete', '批量解除角色')
  ],
  'APP-01 角色': [
    endpoint('GET', '/tenant-access/roles', '查询角色列表'), endpoint('GET', '/tenant-access/roles/page', '分页查询角色'),
    endpoint('POST', '/tenant-access/roles/tenant', '创建角色'), endpoint('GET', '/tenant-access/roles/{roleId}/permissions', '查询权限树及赋权状态'),
    endpoint('POST', '/tenant-access/roles/{roleId}/permissions', '保存最终权限集合')
  ],
  'APP-01 权限': [
    endpoint('GET', '/tenant-access/permissions', '查询权限'), endpoint('GET', '/tenant-access/permissions/tree', '查询权限树'),
    endpoint('POST', '/tenant-access/permissions', '创建权限'), endpoint('POST', '/tenant-access/permissions/{permissionId}/update', '修改权限'),
    endpoint('GET', '/tenant-access/permissions/{permissionId}/delete', '删除权限')
  ],
  'APP-01 通用字典': [
    endpoint('GET', '/tenant-access/dictionaries', '分页查询字典类型'), endpoint('POST', '/tenant-access/dictionaries', '创建租户字典类型'),
    endpoint('POST', '/tenant-access/dictionaries/{typeId}', '更新租户字典类型'),
    endpoint('GET', '/tenant-access/dictionaries/{dictionaryCode}/items', '分页查询字典项'),
    endpoint('GET', '/tenant-access/dictionaries/{dictionaryCode}/items/active', '查询全部有效字典项'),
    endpoint('POST', '/tenant-access/dictionaries/{dictionaryCode}/items', '创建字典项'),
    endpoint('POST', '/tenant-access/dictionaries/{dictionaryCode}/items/{itemId}', '更新字典项')
  ],
  'APP-01 项目空间': [
    endpoint('GET', '/openapi/v1/project-spaces', '分页查询项目空间'), endpoint('POST', '/openapi/v1/project-spaces', '创建项目空间'),
    endpoint('GET', '/openapi/v1/project-spaces/{id}', '查询项目空间'), endpoint('PATCH', '/openapi/v1/project-spaces/{id}', '更新项目空间')
  ],
  'APP-01 上传文件': [
    endpoint('GET', '/tenant-access/files', '分页查询租户上传文件'),
    endpoint('POST', '/tenant-access/files', '上传文件并保存记录'),
    endpoint('GET', '/tenant-access/files/{id}', '查询文件元数据'),
    endpoint('GET', '/tenant-access/files/{id}/content', '下载上传文件')
  ],
  'APP-02 主体管理': resource('/openapi/v1/parties', '主体'),
  'APP-02 业务对象管理': resource('/openapi/v1/business-objects', '业务对象'),
  'APP-02 饮片品种管理': [...resource('/openapi/v1/decoction-piece-products', '饮片品种'), endpoint('POST', '/openapi/v1/decoction-piece-products/{id}/delete', '停用饮片品种')],
  'APP-02 监管编码体系管理': [
    ...resource('/openapi/v1/code-schemes', '监管编码体系'), endpoint('POST', '/openapi/v1/code-schemes/{id}/delete', '停用编码体系'),
    endpoint('GET', '/openapi/v1/code-schemes/{schemeId}/segments', '查询编码段'), endpoint('POST', '/openapi/v1/code-schemes/{schemeId}/segments', '创建编码段'),
    endpoint('GET', '/openapi/v1/code-schemes/{schemeId}/segments/{segmentId}', '查询编码段详情'),
    endpoint('POST', '/openapi/v1/code-schemes/{schemeId}/segments/{segmentId}', '更新编码段'),
    endpoint('POST', '/openapi/v1/code-schemes/{schemeId}/segments/{segmentId}/delete', '删除编码段'),
    endpoint('POST', '/openapi/v1/code-schemes/validate', '试校验监管编码')
  ],
  'APP-03 来源系统管理': [...resource('/openapi/v1/source-systems', '来源系统'), endpoint('GET', '/openapi/v1/source-systems/tenant', '按所选租户查询可选来源系统')],
  'APP-03 来源系统密钥管理': [
    endpoint('GET', '/openapi/v1/source-systems-keys', '按租户、来源系统和状态查询密钥列表'),
    endpoint('POST', '/openapi/v1/source-systems-keys', '登记对接方公钥并生成平台密钥'),
    endpoint('POST', '/openapi/v1/source-systems-keys/status', '启用或停用某租户某系统的某个来源系统密钥')
  ],
  'APP-03 来源接入与数据治理': [
    endpoint('GET', '/openapi/v1/raw-records', '分页查询原始接入记录'),
    endpoint('GET', '/openapi/v1/raw-records/{rawRecordId}', '查看原始接入记录详情'),
    endpoint('POST', '/openapi/v1/raw-records/{rawRecordId}/replays', '重放治理记录')
  ],
  'APP-03 系统值域映射': [
    endpoint('GET', '/openapi/v1/source-systems/{sourceSystemId}/value-set-mappings', '分页查询系统自有码值映射'),
    endpoint('POST', '/openapi/v1/source-systems/{sourceSystemId}/value-set-mappings', '创建系统自有码值映射'),
    endpoint('POST', '/openapi/v1/source-systems/{sourceSystemId}/value-set-mappings/{valueSetId}/save', '整体保存系统在指定值域下的全部映射'),
    endpoint('POST', '/openapi/v1/source-systems/{sourceSystemId}/value-set-mappings/{id}', '修改或停用系统自有码值映射'),
    endpoint('GET', '/openapi/v1/source-systems/{sourceSystemId}/value-set-mappings/{valueSetId}/items', '列出值域全部标准项及当前系统映射')
  ],
  'APP-03 对接助手': [
    ...['tenants', 'project-spaces', 'source-systems', 'source-system-keys', 'event-types', 'schema-versions', 'schema-fields'].map(path => endpoint('GET', `${assistant}/${path}`, '查询级联配置')),
    endpoint('POST', `${assistant}/request-examples`, '生成明文模板与 SDK 配置'),
    endpoint('POST', `${assistant}/request-examples/encrypt`, '模拟加密请求示例'),
    endpoint('POST', `${assistant}/validate`, '只读校验 SDK 明文')
  ],
  'APP-03 数据元管理': [
    ...resource('/openapi/v1/data-elements', '数据元'),
    endpoint('POST', '/openapi/v1/data-elements/{id}/status', '启用或停用数据元'),
    endpoint('GET', '/openapi/v1/data-elements/import-template', '下载数据元导入模板'),
    endpoint('POST', '/openapi/v1/data-elements/imports', '从已上传文件导入数据元')
  ],
  'APP-03 值域管理': [
    ...resource('/openapi/v1/value-sets', '值域', 'valueSetId'), endpoint('POST', '/openapi/v1/value-sets/{valueSetId}/status', '启用或停用值域'),
    ...resource('/openapi/v1/value-sets/{valueSetId}/items', '代码项', 'itemId'),
    endpoint('POST', '/openapi/v1/value-sets/{valueSetId}/items/{itemId}/status', '启用或停用代码项'),
    endpoint('GET', '/openapi/v1/value-sets/{valueSetId}/items/active', '查询全部有效代码项')
  ],
  'APP-04 事件配置与事实引擎': [
    endpoint('GET', '/openapi/v1/event-fact/events', '分页查询事件'),
    endpoint('GET', '/openapi/v1/event-fact/events/{id}', '查看事件详情')
  ],
  'APP-04 事件类型配置': [
    endpoint('GET', '/openapi/v1/event-fact/event-types', '分页查询事件类型'), endpoint('POST', '/openapi/v1/event-fact/event-types', '创建事件类型'),
    endpoint('GET', '/openapi/v1/event-fact/event-types/{id}', '查询事件类型详情'), endpoint('PUT', '/openapi/v1/event-fact/event-types/{id}', '更新事件类型元数据'),
    endpoint('PATCH', '/openapi/v1/event-fact/event-types/{id}/status', '启用或停用事件类型')
  ],
  'APP-04 事件 Schema 管理': [
    ...resource('/openapi/v1/event-fact/schemas/definitions', 'Schema 草稿'),
    endpoint('POST', '/openapi/v1/event-fact/schemas/definitions/{id}/test', '内部测试 Schema'),
    endpoint('POST', '/openapi/v1/event-fact/schemas/definitions/{id}/publish', '发布 Schema'),
    endpoint('POST', '/openapi/v1/event-fact/schemas/definitions/{id}/fields', '新增 Schema 字段'),
    endpoint('POST', '/openapi/v1/event-fact/schemas/definitions/{id}/fields/{fieldId}', '修改 Schema 字段'),
    endpoint('GET', '/openapi/v1/event-fact/schemas/definitions/{id}/fields/{fieldId}/delete', '删除 Schema 字段'),
    endpoint('POST', '/openapi/v1/event-fact/schemas/definitions/{id}/copy', '复制已发布 Schema 为新版本草稿'),
    endpoint('GET', '/openapi/v1/event-fact/schemas/generators', '查询可用字段生成器'),
    endpoint('POST', '/openapi/v1/event-fact/schemas/test', '测试未保存的 Schema')
  ],
  'APP-04 事件类型授权': [endpoint('GET', authorization, '查询全部事件类型授权状态'), endpoint('POST', authorization, '保存授权目标集合及逐事件有效期')],
  'APP-06 查询方案管理': [
    endpoint('GET', '/openapi/v1/exchange-query/profiles', '查询启用规范包'),
    endpoint('POST', '/openapi/v1/exchange-query/profiles', '创建固定来源业务身份的规范包'),
    endpoint('GET', '/openapi/v1/exchange-query/profiles/{id}', '查询规范方案详情'),
    endpoint('POST', '/openapi/v1/exchange-query/profiles/{id}', '修改规范包'),
    endpoint('POST', '/openapi/v1/exchange-query/profiles/copy', '从指定版本复制独立规范'),
    endpoint('GET', '/openapi/v1/exchange-query/profiles/{id}/versions', '查询规范版本'),
    endpoint('POST', '/openapi/v1/exchange-query/profile-versions', '创建绑定已发布来源 Schema 的查询方案版本草稿'),
    endpoint('GET', '/openapi/v1/exchange-query/profile-versions/{id}', '查询规范版本详情'),
    endpoint('POST', '/openapi/v1/exchange-query/profile-versions/{id}', '修改查询方案版本草稿'),
    endpoint('POST', '/openapi/v1/exchange-query/profile-versions/{id}/test', '校验方案字段树、业务入参、来源关联及转换配置'),
    endpoint('POST', '/openapi/v1/exchange-query/profile-versions/{id}/publish', '发布测试通过的规范版本'),
    endpoint('POST', '/openapi/v1/exchange-query/profile-versions/{id}/retire', '退役已发布方案版本'),
    endpoint('POST', '/openapi/v1/exchange-query/profile-versions/{id}/copy', '复制同方案的新草稿版本'),
    endpoint('POST', '/openapi/v1/exchange-query/profile-versions/{id}/fields/import', '从来源Schema批量导入字段'),
    endpoint('GET', '/openapi/v1/exchange-query/profile-versions/{id}/source-fields', '查询方案版本的可选来源字段'),
    endpoint('GET', '/openapi/v1/exchange-query/profile-versions/{id}/fields', '查询字段规则'),
    endpoint('POST', '/openapi/v1/exchange-query/profile-fields', '创建标准字段来源映射或输出分组'),
    endpoint('GET', '/openapi/v1/exchange-query/profile-fields/{id}', '查询方案字段详情'),
    endpoint('POST', '/openapi/v1/exchange-query/profile-fields/{id}', '修改标准字段来源映射或输出分组'),
    endpoint('GET', '/openapi/v1/exchange-query/profile-fields/{id}/delete', '删除草稿字段'),
    endpoint('GET', '/openapi/v1/exchange-query/profile-versions/{versionId}/params', '查询方案版本业务入参'),
    endpoint('POST', '/openapi/v1/exchange-query/profile-versions/{versionId}/params', '创建方案版本业务入参'),
    endpoint('GET', '/openapi/v1/exchange-query/profile-versions/{versionId}/params/{id}', '查询方案版本业务入参详情'),
    endpoint('PUT', '/openapi/v1/exchange-query/profile-versions/{versionId}/params/{id}', '完整修改方案版本业务入参'),
    endpoint('GET', '/openapi/v1/exchange-query/profile-versions/{versionId}/params/{id}/delete', '删除方案版本业务入参')
  ],
  'APP-06 查询方案授权绑定管理': [
    endpoint('POST', '/openapi/v1/exchange-query/bindings', '创建项目规范绑定'),
    endpoint('POST', '/openapi/v1/exchange-query/bindings/{id}', '修改项目规范绑定'),
    endpoint('GET', '/openapi/v1/exchange-query/projects/{id}/bindings', '查询项目绑定'),
    endpoint('GET', '/openapi/v1/exchange-query/profile-versions/{versionId}/bindings', '按方案版本查询授权绑定')
  ],
  'APP-06 查询方案对接助手': [
    ...['tenants', 'project-spaces', 'source-systems', 'source-system-keys', 'profiles', 'profile-versions'].map(p => endpoint('GET', `/exchange-query/integration-assistant/${p}`, '查询级联配置')),
    endpoint('GET', '/exchange-query/integration-assistant/profile-definition', '读取所选发布版本的字段定义'),
    endpoint('POST', '/exchange-query/integration-assistant/request-examples', '生成Profile查询明文请求信封'),
    endpoint('POST', '/exchange-query/integration-assistant/request-examples/encrypt', '模拟加密Profile查询请求')
  ]
};
const endpointPatterns = Object.values(CONNECTABLE_GROUPS).flat().map(item => ({
  method: item.method,
  pattern: new RegExp('^' + item.path.split('/').map(part => /^\{.+\}$/.test(part)
    ? (part === '{dictionaryCode}' ? '[^/]+' : '-?\\d+')
    : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('/') + '$')
}));
export function isConnectableEndpoint(method: string, path: string): boolean {
  return endpointPatterns.some(item => item.method === method.toUpperCase() && item.pattern.test(path.split('?')[0]));
}
