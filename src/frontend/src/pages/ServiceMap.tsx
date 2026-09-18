import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Card from 'react-bootstrap/Card';
import Badge from 'react-bootstrap/Badge';
import {
  ReactFlow, Controls, Background, MiniMap,
  useNodesState, useEdgesState,
  MarkerType, BackgroundVariant,
  Handle, Position,
} from '@xyflow/react';
import type { Node, Edge, NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useServices, useServiceDetail } from '@/api/services';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { PageHeader } from '@/components/common/PageHeader';
import { Settings, RefreshCw, Layers, ExternalLink } from 'lucide-react';
import type { ServiceMapNode as SMNode, ServiceMapEdge as SMEdge, AzureResourceCategory } from '@/types/azure';

/* ── Azure service-type badge map ──────────────────────────────── */

interface BadgeStyle { label: string; bg: string }

const AZURE_TYPE: Record<string, BadgeStyle> = {
  'microsoft.compute/virtualmachines':             { label: 'VM',    bg: '#0078D4' },
  'microsoft.compute/virtualmachinescalesets':     { label: 'VMSS',  bg: '#0078D4' },
  'microsoft.containerservice/managedclusters':    { label: 'AKS',   bg: '#326CE5' },
  'microsoft.web/sites':                           { label: 'App',   bg: '#0078D4' },
  'microsoft.web/serverfarms':                     { label: 'Plan',  bg: '#005BA1' },
  'microsoft.web/staticsites':                     { label: 'SWA',   bg: '#0078D4' },
  'microsoft.app/containerapps':                   { label: 'CA',    bg: '#005BA1' },
  'microsoft.app/managedenvironments':             { label: 'CAEnv', bg: '#003A6C' },
  'microsoft.apimanagement/service':               { label: 'APIM',  bg: '#0078D4' },
  'microsoft.sql/servers':                         { label: 'SQL',   bg: '#B91C1C' },
  'microsoft.sql/servers/databases':               { label: 'SQL',   bg: '#B91C1C' },
  'microsoft.documentdb/databaseaccounts':         { label: 'CDB',   bg: '#6A0DAD' },
  'microsoft.dbforpostgresql/flexibleservers':     { label: 'PG',    bg: '#336791' },
  'microsoft.dbformysql/flexibleservers':          { label: 'MySQL', bg: '#00758F' },
  'microsoft.cache/redis':                         { label: 'Redis', bg: '#DC382D' },
  'microsoft.storage/storageaccounts':             { label: 'STG',   bg: '#0078D4' },
  'microsoft.servicebus/namespaces':               { label: 'SBus',  bg: '#E34F26' },
  'microsoft.eventhub/namespaces':                 { label: 'EHub',  bg: '#E34F26' },
  'microsoft.eventgrid/topics':                    { label: 'EGrid', bg: '#E34F26' },
  'microsoft.network/virtualnetworks':             { label: 'VNet',  bg: '#0072C6' },
  'microsoft.network/privateendpoints':            { label: 'PE',    bg: '#0072C6' },
  'microsoft.network/applicationgateways':         { label: 'AGW',   bg: '#0072C6' },
  'microsoft.network/loadbalancers':               { label: 'LB',    bg: '#0072C6' },
  'microsoft.network/frontdoors':                  { label: 'AFD',   bg: '#0072C6' },
  'microsoft.cdn/profiles':                        { label: 'CDN',   bg: '#0072C6' },
  'microsoft.insights/components':                 { label: 'AppI',  bg: '#7C3AED' },
  'microsoft.operationalinsights/workspaces':      { label: 'LA',    bg: '#7C3AED' },
  'microsoft.cognitiveservices/accounts':          { label: 'CogSvc',bg: '#00A4EF' },
  'microsoft.machinelearningservices/workspaces':  { label: 'AML',   bg: '#00A4EF' },
  'microsoft.search/searchservices':               { label: 'Srch',  bg: '#0078D4' },
  'microsoft.keyvault/vaults':                     { label: 'KV',    bg: '#0078D4' },
  'microsoft.containerregistry/registries':        { label: 'ACR',   bg: '#0078D4' },
};

const CATEGORY_COLOR: Record<AzureResourceCategory, string> = {
  compute:    '#F97316',
  web:        '#3B82F6',
  data:       '#8B5CF6',
  ai:         '#EC4899',
  messaging:  '#EAB308',
  network:    '#06B6D4',
  storage:    '#10B981',
  monitoring: '#6366F1',
  other:      '#64748B',
};

const HEALTH_COLOR: Record<string, string> = {
  healthy: '#16A34A', degraded: '#D97706', incident: '#DC2626', unknown: '#94A3B8',
};

function getBadge(type: string): BadgeStyle {
  const lower = type.toLowerCase();
  if (AZURE_TYPE[lower]) return AZURE_TYPE[lower];
  const prefix = Object.keys(AZURE_TYPE).find(k => lower.startsWith(k));
  return prefix ? AZURE_TYPE[prefix] : { label: (type.split('/').pop() ?? 'res').slice(0, 4).toUpperCase(), bg: '#64748B' };
}

function azurePortalUrl(rawId: string) {
  return `https://portal.azure.com/#resource${rawId}`;
}

/* ── Azure official service icons (benc-uk/icon-collection via jsDelivr) ── */

const _IC = 'https://cdn.jsdelivr.net/gh/benc-uk/icon-collection@master/azure-cds/';

const AZURE_ICON_URL: Record<string, string> = {
  // Compute
  'microsoft.compute/virtualmachines':             `${_IC}compute-21-Virtual-Machine.svg`,
  'microsoft.compute/virtualmachinescalesets':     `${_IC}compute-34-VM-Scale-Sets.svg`,
  'microsoft.containerservice/managedclusters':    `${_IC}containers-101-Kubernetes-Services.svg`,
  // Web / App
  'microsoft.web/sites':                           `${_IC}web-41-App-Services.svg`,
  'microsoft.web/serverfarms':                     `${_IC}web-46-App-Service-Plans.svg`,
  'microsoft.web/staticsites':                     `${_IC}web-41-App-Services.svg`,
  'microsoft.app/containerapps':                   `${_IC}containers-104-Container-Instances.svg`,
  'microsoft.app/managedenvironments':             `${_IC}containers-104-Container-Instances.svg`,
  'microsoft.apimanagement/service':               `${_IC}web-42-API-Management-Services.svg`,
  // Data
  'microsoft.sql/servers':                         `${_IC}databases-132-SQL-Server.svg`,
  'microsoft.sql/servers/databases':               `${_IC}databases-130-SQL-Database.svg`,
  'microsoft.documentdb/databaseaccounts':         `${_IC}databases-121-Azure-Cosmos-DB.svg`,
  'microsoft.dbforpostgresql/flexibleservers':     `${_IC}databases-131-Azure-Database-PostgreSQL-Server.svg`,
  'microsoft.dbformysql/flexibleservers':          `${_IC}databases-122-Azure-Database-MySQL-Server.svg`,
  'microsoft.cache/redis':                         `${_IC}databases-137-Cache-Redis.svg`,
  // Storage
  'microsoft.storage/storageaccounts':             `${_IC}storage-86-Storage-Accounts.svg`,
  // Messaging
  'microsoft.servicebus/namespaces':               `${_IC}integration-214-Azure-Service-Bus.svg`,
  'microsoft.eventhub/namespaces':                 `${_IC}analytics-144-Event-Hubs.svg`,
  'microsoft.eventgrid/topics':                    `${_IC}integration-206-Event-Grid-Topics.svg`,
  // Network
  'microsoft.network/virtualnetworks':             `${_IC}networking-61-Virtual-Networks.svg`,
  'microsoft.network/applicationgateways':         `${_IC}networking-76-Application-Gateways.svg`,
  'microsoft.network/loadbalancers':               `${_IC}networking-62-Load-Balancers.svg`,
  'microsoft.network/frontdoors':                  `${_IC}networking-73-Front-Doors.svg`,
  'microsoft.cdn/profiles':                        `${_IC}networking-78-CDN-Profiles.svg`,
  // Monitoring
  'microsoft.insights/components':                 `${_IC}devops-262-Application-Insights.svg`,
  'microsoft.operationalinsights/workspaces':      `${_IC}analytics-151-Log-Analytics-Workspaces.svg`,
  // AI / Cognitive
  'microsoft.cognitiveservices/accounts':          `${_IC}machinelearning-162-Cognitive-Services.svg`,
  'microsoft.machinelearningservices/workspaces':  `${_IC}machinelearning-166-Machine-Learning-Service-Workspaces.svg`,
  'microsoft.search/searchservices':               `${_IC}web-44-Search-Services.svg`,
  // Security
  'microsoft.keyvault/vaults':                     `${_IC}security-245-Key-Vaults.svg`,
  // Containers
  'microsoft.containerregistry/registries':        `${_IC}containers-105-Container-Registries.svg`,
};

function getAzureIconUrl(type: string): string | null {
  const lower = type.toLowerCase();
  if (AZURE_ICON_URL[lower]) return AZURE_ICON_URL[lower];
  const prefix = Object.keys(AZURE_ICON_URL).find(k => lower.startsWith(k));
  return prefix ? AZURE_ICON_URL[prefix] : null;
}

/* ── Custom React Flow node ────────────────────────────────────── */

const COL_W = 220;
const ROW_H = 120;
const PAD   = 60;

function ServiceNode(props: NodeProps) {
  const node    = props.data as unknown as SMNode;
  const sel     = props.selected ?? false;
  const badge   = getBadge(node.type);
  const iconUrl = getAzureIconUrl(node.type);
  const cat     = CATEGORY_COLOR[node.category] ?? '#64748B';
  const health  = HEALTH_COLOR[node.health]     ?? '#94A3B8';
  const isApp   = node.layer === 'app';
  const [iconErr, setIconErr] = useState(false);

  return (
    <div style={{
      width: 195,
      padding: '9px 10px 9px 17px',
      borderRadius: 10,
      position: 'relative',
      background: '#ffffff',
      border: `${sel ? 2.5 : 1.5}px ${isApp ? 'dashed' : 'solid'} ${sel ? cat : '#dee2e6'}`,
      boxShadow: sel
        ? `0 0 0 4px ${cat}28, 0 6px 20px rgba(0,0,0,.14)`
        : '0 2px 8px rgba(0,0,0,.08)',
      transition: 'box-shadow .15s, border-color .15s',
      cursor: 'grab',
    }}>
      <Handle type="target" position={Position.Left}  style={{ opacity: 0, width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0, width: 8, height: 8 }} />

      {/* Category accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 5,
        borderRadius: '10px 0 0 10px', background: cat, opacity: 0.82,
      }} />

      {/* Main row: icon · text · indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>

        {/* Azure service icon (with text-badge fallback) */}
        <div style={{ width: 30, height: 30, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {iconUrl && !iconErr ? (
            <img
              src={iconUrl}
              alt={badge.label}
              width={28} height={28}
              onError={() => setIconErr(true)}
              style={{ objectFit: 'contain', display: 'block' }}
            />
          ) : (
            <span style={{
              background: badge.bg, color: '#fff', fontSize: 8, fontWeight: 700,
              borderRadius: 3, padding: '3px 4px', letterSpacing: '.02em',
              textAlign: 'center', lineHeight: 1.2, display: 'block',
            }}>
              {badge.label}
            </span>
          )}
        </div>

        {/* Name + type + region */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: '#0f172a', lineHeight: 1.25,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {node.label}
          </div>
          <div style={{
            fontSize: 8.5, color: '#64748B', marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {node.type.split('/').slice(1).join('/') || node.type}
          </div>
          {node.region && (
            <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 1 }}>{node.region}</div>
          )}
        </div>

        {/* Right-side indicators (stacked vertically) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <div style={{
            width: 9, height: 9, borderRadius: '50%', background: health,
            border: '1.5px solid #fff', boxShadow: `0 0 0 1.5px ${health}60`,
          }} title={node.health} />
          {node.has_telemetry && (
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366F1', opacity: .85 }} title="Telemetry active" />
          )}
          {node.raw_id && (
            <a
              href={azurePortalUrl(node.raw_id)}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in Azure Portal"
              onClick={e => e.stopPropagation()}
              style={{ display: 'inline-flex', color: '#0078D4', opacity: .6, lineHeight: 1 }}
            >
              <ExternalLink size={9} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

const NODE_TYPES = { service: ServiceNode };

/* ── Data converters ───────────────────────────────────────────── */

function toRfNodes(smNodes: SMNode[]): Node[] {
  return smNodes.map(n => ({
    id:       n.id,
    type:     'service',
    position: { x: PAD + n.col * COL_W, y: PAD + n.row * ROW_H },
    data:     n as unknown as Record<string, unknown>,
  }));
}

function toRfEdges(smEdges: SMEdge[]): Edge[] {
  return smEdges.map((e, i) => {
    const isNet = e.edge_kind === 'network';
    const color = isNet ? '#94A3B8' : '#818CF8';
    return {
      id:       `e${i}`,
      source:   e.from,
      target:   e.to,
      type:     'smoothstep',
      animated: !isNet,
      label:    e.label ?? undefined,
      labelStyle:         { fontSize: 9, fill: color, fontWeight: 600 },
      labelBgStyle:       { fill: '#fff', fillOpacity: .9 },
      labelBgPadding:     [3, 4] as [number, number],
      labelBgBorderRadius: 3,
      style: {
        stroke: color, strokeWidth: isNet ? 1.5 : 2,
        strokeDasharray: isNet ? '6 4' : undefined,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 14, height: 14 },
    };
  });
}

/* ── Main component ────────────────────────────────────────────── */

export default function ServiceMap() {
  const { data, isLoading, error, refetch, isFetching } = useServices();
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const { data: detail, isLoading: detailLoading } = useServiceDetail(selectedId);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    if (!data) return;
    setNodes(toRfNodes(data.nodes));
    setEdges(toRfEdges(data.edges));
  }, [data, setNodes, setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedId(prev => prev === node.id ? null : node.id);
  }, []);

  const onPaneClick = useCallback(() => setSelectedId(null), []);

  if (isLoading) return <LoadingSpinner />;
  if (error)     return <ErrorAlert error={error} />;
  if (!data)     return null;

  if (!data.configured) {
    return (
      <div>
        <PageHeader title="Service Map" subtitle="Azure resource topology + application dependencies" />
        <Card>
          <Card.Body className="text-center py-5">
            <Settings size={40} className="text-muted mb-3" />
            <h5>Azure not configured</h5>
            <p className="text-muted mb-4">Connect your Azure subscription in Settings to see real resources.</p>
            <Link to="/settings" className="btn btn-primary btn-sm">Go to Settings</Link>
          </Card.Body>
        </Card>
      </div>
    );
  }

  if (data.nodes.length === 0) {
    return (
      <div>
        <PageHeader title="Service Map" subtitle="Azure resource topology + application dependencies" />
        <Card>
          <Card.Body className="text-center py-5">
            <Layers size={40} className="text-muted mb-3" />
            <h5>No resources found</h5>
            <p className="text-muted">
              Resource group <code>{data.resource_group}</code> is empty or the Service Principal lacks Reader access.
            </p>
          </Card.Body>
        </Card>
      </div>
    );
  }

  const selectedNode = data.nodes.find(n => n.id === selectedId) ?? null;
  const connectedEdges = selectedNode
    ? data.edges.filter(e => e.from === selectedNode.id || e.to === selectedNode.id)
    : [];

  return (
    <div>
      <PageHeader
        title="Service Map"
        subtitle={`${data.resource_group} · ${data.nodes.length} resources · ${new Date(data.generated_at).toLocaleTimeString()}`}
      />

      <div className="row g-3">
        {/* ── Canvas ─────────────────────────────────────────────── */}
        <div className={selectedNode ? 'col-lg-8' : 'col-12'}>
          <Card style={{ overflow: 'hidden' }}>
            <Card.Header className="d-flex justify-content-between align-items-center py-2">
              <div className="d-flex align-items-center gap-3 small text-muted">
                <LegendItem line color="#818CF8" label="Telemetry" />
                <LegendItem line color="#94A3B8" dashed label="Network link" />
                <LegendItem dot color="#16A34A" label="Healthy" />
                <LegendItem dot color="#6366F1" label="Telemetry active" />
              </div>
              <button
                className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw size={12} className={isFetching ? 'spin' : ''} />
                Refresh
              </button>
            </Card.Header>

            <div style={{ height: 580 }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={NODE_TYPES}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                fitView
                fitViewOptions={{ padding: 0.18 }}
                minZoom={0.15}
                maxZoom={2.5}
                deleteKeyCode={null}
                selectionKeyCode={null}
                multiSelectionKeyCode={null}
                panOnScroll={false}
                zoomOnScroll={true}
                zoomOnPinch={true}
                panOnDrag={true}
                style={{ background: '#f8fafc' }}
              >
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={20} size={1.2} color="#cbd5e1"
                />
                <Controls
                  showInteractive={false}
                  style={{ bottom: 16, left: 16, top: 'auto' }}
                />
                <MiniMap
                  nodeColor={n => CATEGORY_COLOR[(n.data as unknown as SMNode).category] ?? '#64748B'}
                  nodeStrokeWidth={2}
                  maskColor="rgba(248,250,252,0.75)"
                  style={{ bottom: 16, right: 16, top: 'auto', height: 110, width: 160, border: '1px solid #e2e8f0', borderRadius: 8 }}
                  pannable
                  zoomable
                />
              </ReactFlow>
            </div>

            {data.edges.length === 0 && (
              <Card.Footer className="text-muted small py-2">
                No connections found. Private endpoint links appear automatically; telemetry links require a Log Analytics workspace ID in Settings.
              </Card.Footer>
            )}
          </Card>
        </div>

        {/* ── Detail panel ───────────────────────────────────────── */}
        {selectedNode && (
          <div className="col-lg-4">
            <Card style={{ fontSize: '0.8rem' }}>
              <Card.Header className="py-2 d-flex align-items-center gap-2" style={{ flexWrap: 'nowrap' }}>
                <ServiceBadge type={selectedNode.type} />
                <span className="fw-semibold small text-truncate">{selectedNode.label}</span>
                <Badge bg="secondary" style={{ fontSize: '0.6rem', flexShrink: 0 }}>{selectedNode.layer}</Badge>
                {selectedNode.raw_id && (
                  <a
                    href={azurePortalUrl(selectedNode.raw_id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-outline-primary ms-auto d-flex align-items-center gap-1"
                    style={{ fontSize: '0.68rem', height: 26, padding: '0 8px', flexShrink: 0 }}
                    title={selectedNode.raw_id}
                  >
                    <ExternalLink size={11} />
                    Azure Portal
                  </a>
                )}
                <div style={{
                  width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
                  marginLeft: selectedNode.raw_id ? 4 : 'auto',
                  background: HEALTH_COLOR[selectedNode.health],
                  boxShadow: `0 0 0 2px ${HEALTH_COLOR[selectedNode.health]}50`,
                }} />
              </Card.Header>

              <Card.Body style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 300px)' }}>
                {detailLoading ? (
                  <div className="text-center py-3"><LoadingSpinner /></div>
                ) : (
                  <>
                    <DetailSection title="Overview">
                      <DetailRow label="Type"           value={detail?.type ?? selectedNode.type} />
                      {(detail?.region ?? selectedNode.region) && (
                        <DetailRow label="Region"       value={(detail?.region ?? selectedNode.region)!} />
                      )}
                      {detail?.resource_group && (
                        <DetailRow label="Resource Group" value={detail.resource_group} />
                      )}
                      <DetailRow label="Category"       value={selectedNode.category} />
                      {selectedNode.raw_id && (
                        <div className="mt-1 mb-1">
                          <div className="text-muted mb-1" style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>ARM ID</div>
                          <code style={{ fontSize: '0.62rem', wordBreak: 'break-all', color: 'var(--bs-secondary-color)' }}>
                            {selectedNode.raw_id}
                          </code>
                        </div>
                      )}
                    </DetailSection>

                    {detail?.tags && Object.keys(detail.tags).length > 0 && (
                      <DetailSection title="Tags">
                        {Object.entries(detail.tags).map(([k, v]) => (
                          <DetailRow key={k} label={k} value={v} />
                        ))}
                      </DetailSection>
                    )}

                    {selectedNode.has_telemetry && detail?.telemetry && (
                      <DetailSection title="Telemetry (24 h)">
                        <DetailRow label="Requests"     value={detail.telemetry.request_count.toLocaleString()} />
                        <DetailRow label="Avg duration" value={`${detail.telemetry.avg_duration_ms.toFixed(1)} ms`} />
                        <DetailRow label="Failure rate" value={`${(detail.telemetry.failure_rate * 100).toFixed(2)}%`} />
                      </DetailSection>
                    )}

                    {detail?.properties && Object.keys(detail.properties).length > 0 && (
                      <DetailSection title="Properties">
                        {Object.entries(detail.properties).slice(0, 12).map(([k, v]) => (
                          <DetailRow key={k} label={k} value={String(v ?? '')} />
                        ))}
                      </DetailSection>
                    )}

                    <DetailSection title={`Connections (${connectedEdges.length})`}>
                      {connectedEdges.length === 0
                        ? <span className="text-muted">No connections</span>
                        : connectedEdges.map(e => {
                            const otherId  = e.from === selectedNode.id ? e.to   : e.from;
                            const dir      = e.from === selectedNode.id ? '→' : '←';
                            const other    = data.nodes.find(n => n.id === otherId);
                            const isNet    = e.edge_kind === 'network';
                            return (
                              <div
                                key={`${e.from}-${e.to}`}
                                className="d-flex align-items-center gap-2 py-1"
                                style={{ borderBottom: '1px solid var(--bs-border-color)', fontSize: '0.78rem' }}
                              >
                                <span style={{ color: isNet ? '#94A3B8' : '#818CF8', fontWeight: 700, fontSize: 10 }}>{dir}</span>
                                {other && <ServiceBadge type={other.type} />}
                                <span className="fw-medium text-truncate">{other?.label ?? otherId}</span>
                                {e.label && (
                                  <span className="text-muted ms-auto" style={{ fontSize: '0.7rem', flexShrink: 0 }}>
                                    {e.label}
                                  </span>
                                )}
                                {isNet && (
                                  <span style={{ fontSize: 8.5, color: '#64748B', background: '#f1f5f9', borderRadius: 3, padding: '1px 4px', flexShrink: 0 }}>
                                    network
                                  </span>
                                )}
                              </div>
                            );
                          })
                      }
                    </DetailSection>
                  </>
                )}
              </Card.Body>
            </Card>
          </div>
        )}

        {/* ── Empty right panel hint ──────────────────────────────── */}
        {!selectedNode && (
          <div className="col-12">
            <div className="d-flex align-items-center gap-3 p-3 rounded" style={{ background: 'var(--bs-tertiary-bg)', fontSize: '0.8rem', color: 'var(--bs-secondary-color)' }}>
              <span>Click any node to inspect its details.</span>
              <span className="ms-auto d-flex gap-3">
                {Object.entries(CATEGORY_COLOR).slice(0, 6).map(([cat, color]) => (
                  <span key={cat} className="d-flex align-items-center gap-1">
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block' }} />
                    <span>{cat}</span>
                  </span>
                ))}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Small helper components ───────────────────────────────────── */

function ServiceBadge({ type }: { type: string }) {
  const { label, bg } = getBadge(type);
  const iconUrl = getAzureIconUrl(type);
  const [err, setErr] = useState(false);

  return iconUrl && !err ? (
    <img
      src={iconUrl}
      alt={label}
      width={20} height={20}
      onError={() => setErr(true)}
      style={{ objectFit: 'contain', flexShrink: 0, display: 'block' }}
    />
  ) : (
    <span style={{
      background: bg, color: '#fff', fontSize: 8.5, fontWeight: 700,
      borderRadius: 3, padding: '1px 5px', letterSpacing: '.03em', flexShrink: 0,
    }}>
      {label}
    </span>
  );
}

function LegendItem({ line, dot, color, dashed, label }: { line?: boolean; dot?: boolean; color: string; dashed?: boolean; label: string }) {
  return (
    <div className="d-flex align-items-center gap-1">
      {dot
        ? <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
        : <svg width={22} height={8} style={{ flexShrink: 0 }}>
            <line x1={0} y1={4} x2={22} y2={4} stroke={color} strokeWidth={line ? 2 : 1.5} strokeDasharray={dashed ? '5 3' : undefined} />
          </svg>
      }
      <span>{label}</span>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div style={{
        fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '.08em', color: 'var(--bs-secondary-color)',
        marginBottom: 4, paddingBottom: 4, borderBottom: '1px solid var(--bs-border-color)',
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="d-flex gap-2 py-1" style={{ borderBottom: '1px solid var(--bs-border-color)', fontSize: '0.78rem' }}>
      <span className="text-muted" style={{ minWidth: 108, flexShrink: 0 }}>{label}</span>
      <span className="fw-medium text-truncate" title={value}>{value || '—'}</span>
    </div>
  );
}
