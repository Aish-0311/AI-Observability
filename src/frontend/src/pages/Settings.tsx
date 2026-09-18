import { useState, useId } from 'react';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import { PageHeader } from '@/components/common/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useSettings, useSaveSettings, useTestSettings } from '@/api/settings';
import type { AzureConnection } from '@/types/azure';
import {
  User, Plug, Bell, Bot, Sun, Moon, Eye, EyeOff,
  Check, Copy, CheckCircle, AlertCircle, ChevronRight,
  ChevronDown, ChevronUp, Loader, Zap, Activity,
} from 'lucide-react';

type Tab = 'profile' | 'integrations' | 'notifications' | 'ai';

/* ─── Shared primitives ────────────────────────────────────────── */

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div style={{ marginBottom: 'var(--space-5)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--aiops-border)' }}>
      <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--aiops-text)', margin: 0 }}>{title}</h2>
      {description && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--aiops-text-muted)', margin: '4px 0 0' }}>{description}</p>}
    </div>
  );
}

function FieldRow({ label, hint, children, readOnly }: { label: string; hint?: string; children: React.ReactNode; readOnly?: boolean }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '200px 1fr', gap: 'var(--space-6)',
      alignItems: 'start', padding: 'var(--space-4) 0',
      borderBottom: '1px solid var(--aiops-border)',
    }}>
      <div>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--aiops-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {label}
          {readOnly && (
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--aiops-text-subtle)', background: 'var(--aiops-bg-subtle)', border: '1px solid var(--aiops-border)', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Read-only
            </span>
          )}
        </div>
        {hint && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--aiops-text-subtle)', marginTop: 4, lineHeight: 1.5 }}>{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function SaveButton({ saved, onClick }: { saved: boolean; onClick: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
      <Button variant="primary" size="sm" onClick={onClick} style={{ minWidth: 120 }}>
        {saved ? <><Check size={13} /> Saved</> : 'Save changes'}
      </Button>
      {saved && (
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--aiops-success)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <CheckCircle size={13} /> Changes saved
        </span>
      )}
    </div>
  );
}

/* ─── Left nav ─────────────────────────────────────────────────── */

const tabs: { key: Tab; icon: typeof User; label: string; description: string }[] = [
  { key: 'profile',       icon: User, label: 'Profile',       description: 'Personal info & appearance' },
  { key: 'integrations',  icon: Plug, label: 'Integrations',  description: 'API keys & connected services' },
  { key: 'notifications', icon: Bell, label: 'Notifications', description: 'Alert & incident preferences' },
  { key: 'ai',            icon: Bot,  label: 'AI Analysis',   description: 'LLM model & pipeline config' },
];

function SettingsNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav aria-label="Settings sections">
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {tabs.map(t => {
          const isActive = t.key === active;
          return (
            <li key={t.key}>
              <button
                onClick={() => onChange(t.key)}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  background: isActive ? 'var(--aiops-brand-subtle)' : 'transparent',
                  color: isActive ? 'var(--aiops-brand-text)' : 'var(--aiops-text-muted)',
                  transition: 'background-color var(--transition-fast), color var(--transition-fast)',
                  position: 'relative',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--aiops-bg-subtle)'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {isActive && <span style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, background: 'var(--aiops-brand)', borderRadius: '0 2px 2px 0' }} />}
                <div style={{
                  width: 32, height: 32, borderRadius: 'var(--radius-md)', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isActive ? 'var(--aiops-brand-subtle)' : 'var(--aiops-bg-subtle)',
                  border: `1px solid ${isActive ? 'var(--aiops-brand-border)' : 'var(--aiops-border)'}`,
                  color: isActive ? 'var(--aiops-brand)' : 'var(--aiops-text-muted)',
                }}>
                  <t.icon size={15} strokeWidth={2} aria-hidden />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: isActive ? 600 : 500, lineHeight: 1.2 }}>{t.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--aiops-text-subtle)', marginTop: 2, lineHeight: 1.3 }}>{t.description}</div>
                </div>
                {isActive && <ChevronRight size={13} style={{ marginLeft: 'auto', flexShrink: 0, opacity: 0.5 }} aria-hidden />}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ─── Profile tab ──────────────────────────────────────────────── */

function ProfileTab() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 3000); };
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <div>
      <SectionHeader title="Profile & Appearance" description="Manage your personal information and display preferences." />
      <FieldRow label="Avatar" hint="Initials generated from your display name">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--aiops-brand), var(--aiops-brand-hover))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20, border: '3px solid var(--aiops-border)' }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--aiops-text)' }}>{name || 'Unnamed'}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--aiops-text-muted)' }}><span style={{ fontFamily: 'var(--font-mono)' }}>{user?.role}</span> · AIOps Platform</div>
          </div>
        </div>
      </FieldRow>
      <FieldRow label="Display name" hint="Shown in the sidebar and topbar">
        <Form.Control value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder="Your full name" style={{ maxWidth: 320 }} />
      </FieldRow>
      <FieldRow label="Email address" hint="Used for login — cannot be changed here" readOnly>
        <div style={{ display: 'flex', alignItems: 'center', padding: '7px 12px', background: 'var(--aiops-bg-subtle)', border: '1px solid var(--aiops-border)', borderRadius: 'var(--radius-md)', maxWidth: 320, fontSize: 'var(--text-base)', color: 'var(--aiops-text-muted)', fontFamily: 'var(--font-mono)' }}>
          {user?.email}
        </div>
      </FieldRow>
      <FieldRow label="Role" hint="Assigned by your organisation admin" readOnly>
        <span className="chip chip-neutral" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>{user?.role ?? 'sre'}</span>
      </FieldRow>
      <div style={{ marginTop: 'var(--space-6)', marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--aiops-border)' }}>
        <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--aiops-text)', margin: '0 0 2px' }}>Appearance</h3>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--aiops-text-muted)', margin: 0 }}>Choose how the interface looks to you</p>
      </div>
      <FieldRow label="Theme" hint="Persisted in browser storage">
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          {(['light', 'dark'] as const).map(t => (
            <button key={t} onClick={() => setTheme(t)} aria-pressed={theme === t} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '8px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: `2px solid ${theme === t ? 'var(--aiops-brand)' : 'var(--aiops-border)'}`, background: theme === t ? 'var(--aiops-brand-subtle)' : 'var(--aiops-surface)', color: theme === t ? 'var(--aiops-brand-text)' : 'var(--aiops-text-muted)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', fontWeight: theme === t ? 600 : 400, transition: 'all var(--transition-fast)' }}>
              {t === 'light' ? <Sun size={14} aria-hidden /> : <Moon size={14} aria-hidden />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {theme === t && <Check size={12} aria-hidden />}
            </button>
          ))}
        </div>
      </FieldRow>
      <SaveButton saved={saved} onClick={save} />
    </div>
  );
}

/* ─── Integrations tab ─────────────────────────────────────────── */

type TestStatus = 'idle' | 'testing' | 'ok' | 'fail';

interface FieldDef {
  key: string;
  label: string;
  hint: string;
  envVar: string;
  placeholder: string;
  sensitive?: boolean;
  type?: 'text' | 'url' | 'number';
  defaultValue?: string;
}

interface IntegrationDef {
  id: string;
  name: string;
  tagline: string;
  abbr: string;
  color: string;
  docsUrl: string;
  status: 'connected' | 'missing' | 'degraded';
  usedBy: string[];
  groups: { label: string; fields: FieldDef[] }[];
}

const INTEGRATIONS: IntegrationDef[] = [
  {
    id: 'azure',
    name: 'Azure Monitor',
    tagline: 'App Insights · Log Analytics — metrics, traces, dependencies, and KQL queries',
    abbr: 'AZ',
    color: '#0078D4',
    docsUrl: 'https://docs.microsoft.com/en-us/azure/azure-monitor/',
    status: 'connected',
    usedBy: ['Signal Aggregator'],
    groups: [
      {
        label: 'Subscription & workspace',
        fields: [
          { key: 'AZURE_SUBSCRIPTION_ID',           label: 'Subscription ID',          hint: 'Azure subscription that owns the App Insights and Log Analytics resources',             envVar: 'AZURE_SUBSCRIPTION_ID',           placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', type: 'text' },
          { key: 'AZURE_LOG_ANALYTICS_WORKSPACE_ID', label: 'Log Analytics Workspace ID', hint: 'Used for KQL queries via the Azure Monitor REST API',                                envVar: 'AZURE_LOG_ANALYTICS_WORKSPACE_ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', type: 'text' },
        ],
      },
      {
        label: 'Application Insights',
        fields: [
          { key: 'APP_INSIGHTS_APP_ID',  label: 'Application ID', hint: 'Found in App Insights → Configure → API Access → Application ID',        envVar: 'APP_INSIGHTS_APP_ID',  placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', type: 'text' },
          { key: 'APP_INSIGHTS_API_KEY', label: 'API Key',         hint: 'App Insights API key with Read telemetry permissions. Never committed to source control.', envVar: 'APP_INSIGHTS_API_KEY', placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', sensitive: true },
        ],
      },
    ],
  },
  {
    id: 'grafana',
    name: 'Grafana',
    tagline: 'Dashboard panels and Prometheus datasource proxy for metric signals',
    abbr: 'GF',
    color: '#F46800',
    docsUrl: 'https://grafana.com/docs/grafana/latest/developers/http_api/',
    status: 'connected',
    usedBy: ['Signal Aggregator'],
    groups: [
      {
        label: 'Connection',
        fields: [
          { key: 'GRAFANA_ENDPOINT', label: 'Instance URL', hint: 'Base URL of your Grafana instance or Grafana Cloud stack', envVar: 'GRAFANA_ENDPOINT', placeholder: 'https://your-org.grafana.net', type: 'url' },
          { key: 'GRAFANA_ORG_ID',   label: 'Organisation ID', hint: 'Numeric org ID — visible in Grafana → Server Admin → Organisations', envVar: 'GRAFANA_ORG_ID', placeholder: '1', type: 'number', defaultValue: '1' },
        ],
      },
      {
        label: 'Authentication',
        fields: [
          { key: 'GRAFANA_API_KEY', label: 'Service Account Token', hint: 'Grafana service account token with Viewer role. Format: glsa_…', envVar: 'GRAFANA_API_KEY', placeholder: 'glsa_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', sensitive: true },
        ],
      },
    ],
  },
  {
    id: 'prometheus',
    name: 'Prometheus',
    tagline: 'PromQL HTTP API for range and instant metric queries from AKS',
    abbr: 'PM',
    color: '#E6522C',
    docsUrl: 'https://prometheus.io/docs/prometheus/latest/querying/api/',
    status: 'degraded',
    usedBy: ['Signal Aggregator'],
    groups: [
      {
        label: 'Connection',
        fields: [
          { key: 'PROMETHEUS_ENDPOINT', label: 'Endpoint URL', hint: 'Prometheus HTTP API base URL. Leave blank to skip Prometheus signal collection.', envVar: 'PROMETHEUS_ENDPOINT', placeholder: 'http://prometheus.monitoring.svc:9090', type: 'url' },
        ],
      },
      {
        label: 'Optional settings',
        fields: [
          { key: 'PROMETHEUS_SCRAPE_INTERVAL', label: 'Scrape interval', hint: 'Used to align query step with your Prometheus scrape interval',    envVar: 'PROMETHEUS_SCRAPE_INTERVAL', placeholder: '30s',   defaultValue: '30s'  },
          { key: 'PROMETHEUS_QUERY_TIMEOUT',   label: 'Query timeout',   hint: 'Maximum time for a single PromQL query before it is abandoned',    envVar: 'PROMETHEUS_QUERY_TIMEOUT',   placeholder: '30s',   defaultValue: '30s'  },
        ],
      },
    ],
  },
  {
    id: 'github',
    name: 'GitHub',
    tagline: 'Issue creation, commit history enrichment, and suspect commit analysis',
    abbr: 'GH',
    color: '#24292F',
    docsUrl: 'https://docs.github.com/en/rest',
    status: 'connected',
    usedBy: ['Knowledge Enricher', 'GitHub Issue Creator'],
    groups: [
      {
        label: 'Repository',
        fields: [
          { key: 'GITHUB_REPO', label: 'Repository',    hint: 'Full repository path in owner/repo format. Issues are created and commits queried here.', envVar: 'GITHUB_REPO', placeholder: 'contoso/aiops-platform', type: 'text' },
        ],
      },
      {
        label: 'Authentication',
        fields: [
          { key: 'GITHUB_TOKEN', label: 'Personal Access Token', hint: 'Classic PAT or fine-grained token. Required scopes: repo, issues:write, contents:read.', envVar: 'GITHUB_TOKEN', placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', sensitive: true },
        ],
      },
      {
        label: 'Issue settings',
        fields: [
          { key: 'GITHUB_ISSUE_LABEL',         label: 'Base label',          hint: 'Label applied to all AI-generated issues alongside the severity label',     envVar: 'GITHUB_ISSUE_LABEL',         placeholder: 'aiops-auto',    defaultValue: 'aiops-auto'    },
          { key: 'GITHUB_INCIDENT_LABEL',       label: 'Incident label',      hint: 'Secondary label marking the issue as an incident',                          envVar: 'GITHUB_INCIDENT_LABEL',       placeholder: 'incident',      defaultValue: 'incident'      },
          { key: 'GITHUB_AI_GENERATED_LABEL',   label: 'AI-generated label',  hint: 'Distinguishes LLM-created issues from human-created ones',                  envVar: 'GITHUB_AI_GENERATED_LABEL',   placeholder: 'ai-generated',  defaultValue: 'ai-generated'  },
        ],
      },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    tagline: 'Claude LLM — structured JSON output for root cause analysis',
    abbr: 'AN',
    color: '#D4A373',
    docsUrl: 'https://docs.anthropic.com/en/api',
    status: 'missing',
    usedBy: ['Root Cause Analyzer'],
    groups: [
      {
        label: 'Authentication',
        fields: [
          { key: 'ANTHROPIC_API_KEY', label: 'API Key', hint: 'Your Anthropic API key. Keep this secret — it grants full access to your account.', envVar: 'ANTHROPIC_API_KEY', placeholder: 'sk-ant-api03-…', sensitive: true },
        ],
      },
    ],
  },
];

function EnvVarPill({ envVar }: { envVar: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(envVar); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
      <span style={{ fontSize: 10, color: 'var(--aiops-text-subtle)' }}>env:</span>
      <code style={{ fontSize: 10, color: 'var(--aiops-brand)', background: 'var(--aiops-brand-subtle)', padding: '1px 6px', borderRadius: 4, border: '1px solid var(--aiops-brand-border)' }}>
        {envVar}
      </code>
      <button type="button" onClick={copy} aria-label={`Copy ${envVar}`} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--aiops-text-subtle)', display: 'flex', alignItems: 'center' }}>
        {copied ? <Check size={10} style={{ color: 'var(--aiops-success)' }} aria-hidden /> : <Copy size={10} aria-hidden />}
      </button>
    </div>
  );
}

function SecretInput({ field }: { field: FieldDef }) {
  const [show, setShow] = useState(false);
  const id = useId();
  return (
    <div>
      <div style={{ position: 'relative', maxWidth: 400 }}>
        <Form.Control
          id={id}
          type={show ? 'text' : 'password'}
          placeholder={field.placeholder}
          defaultValue={field.defaultValue}
          autoComplete="off"
          style={{ paddingRight: 40, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}
        />
        <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide' : 'Show'}
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--aiops-text-subtle)', padding: 2, display: 'flex', alignItems: 'center' }}>
          {show ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
        </button>
      </div>
      <EnvVarPill envVar={field.envVar} />
    </div>
  );
}

function PlainInput({ field }: { field: FieldDef }) {
  const id = useId();
  return (
    <div>
      <Form.Control
        id={id}
        type={field.type === 'url' ? 'url' : field.type === 'number' ? 'number' : 'text'}
        placeholder={field.placeholder}
        defaultValue={field.defaultValue}
        autoComplete={field.type === 'url' ? 'url' : 'off'}
        style={{ maxWidth: 400, fontFamily: field.type === 'text' && field.placeholder?.includes('-') ? 'var(--font-mono)' : 'var(--font-sans)', fontSize: 'var(--text-sm)' }}
      />
      <EnvVarPill envVar={field.envVar} />
    </div>
  );
}

const statusCfg = {
  connected: { chip: 'chip chip-success', icon: CheckCircle, label: 'Connected' },
  missing:   { chip: 'chip chip-danger',  icon: AlertCircle, label: 'Not configured' },
  degraded:  { chip: 'chip chip-warning', icon: Activity,    label: 'Degraded' },
} as const;

function IntegrationCard({ integration }: { integration: IntegrationDef }) {
  const [open, setOpen] = useState(integration.status !== 'missing' ? true : true);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');

  const runTest = () => {
    setTestStatus('testing');
    setTimeout(() => setTestStatus(integration.status === 'connected' ? 'ok' : 'fail'), 1400);
    setTimeout(() => setTestStatus('idle'), 5000);
  };

  const sc = statusCfg[integration.status];

  return (
    <div style={{ border: '1px solid var(--aiops-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 'var(--space-4)' }}>

      {/* Card header — div instead of button so Test button stays a valid <button> */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); } }}
        style={{
          width: '100%', textAlign: 'left', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
          padding: 'var(--space-4)',
          background: open ? 'var(--aiops-surface)' : 'var(--aiops-bg-subtle)',
          transition: 'background-color var(--transition-fast)',
          userSelect: 'none',
        }}
      >
        {/* Logo tile */}
        <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', flexShrink: 0, background: integration.color + '18', border: `1px solid ${integration.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: integration.color, fontFamily: 'var(--font-mono)' }}>
          {integration.abbr}
        </div>

        {/* Title + tagline */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--aiops-text)' }}>{integration.name}</span>
            <span className={sc.chip} style={{ fontSize: 10 }}>
              <sc.icon size={9} aria-hidden /> {sc.label}
            </span>
            {integration.usedBy.map(a => (
              <span key={a} style={{ fontSize: 10, color: 'var(--aiops-text-subtle)', background: 'var(--aiops-bg-subtle)', border: '1px solid var(--aiops-border)', borderRadius: 4, padding: '1px 6px', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{a}</span>
            ))}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--aiops-text-muted)', marginTop: 2 }}>{integration.tagline}</div>
        </div>

        {/* Test button — stopPropagation so it doesn't toggle the card */}
        <div onClick={e => e.stopPropagation()}>
          <button
            type="button"
            onClick={runTest}
            disabled={testStatus === 'testing'}
            aria-label={`Test ${integration.name} connection`}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--aiops-border)',
              background: testStatus === 'ok' ? 'var(--aiops-success-subtle)' : testStatus === 'fail' ? 'var(--aiops-danger-subtle)' : 'var(--aiops-surface)',
              color: testStatus === 'ok' ? 'var(--aiops-success)' : testStatus === 'fail' ? 'var(--aiops-danger)' : 'var(--aiops-text-muted)',
              fontSize: 'var(--text-xs)', fontWeight: 500, cursor: testStatus === 'testing' ? 'not-allowed' : 'pointer',
              transition: 'all var(--transition-fast)',
              whiteSpace: 'nowrap',
            }}
          >
            {testStatus === 'testing' && <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} aria-hidden />}
            {testStatus === 'ok'      && <CheckCircle size={11} aria-hidden />}
            {testStatus === 'fail'    && <AlertCircle size={11} aria-hidden />}
            {testStatus === 'idle'    && <Zap size={11} aria-hidden />}
            {testStatus === 'testing' ? 'Testing…' : testStatus === 'ok' ? 'Connected' : testStatus === 'fail' ? 'Failed' : 'Test'}
          </button>
        </div>

        {/* Chevron — outside stopPropagation, so clicks bubble up and toggle the card */}
        {open
          ? <ChevronUp size={16} style={{ color: 'var(--aiops-text-subtle)', flexShrink: 0 }} aria-hidden />
          : <ChevronDown size={16} style={{ color: 'var(--aiops-text-subtle)', flexShrink: 0 }} aria-hidden />
        }
      </div>

      {/* Expanded body */}
      {open && (
        <div style={{ borderTop: '1px solid var(--aiops-border)', padding: 'var(--space-5)', background: 'var(--aiops-surface)' }}>
          {integration.groups.map((group, gi) => (
            <div key={group.label} style={{ marginBottom: gi < integration.groups.length - 1 ? 'var(--space-5)' : 0 }}>

              {/* Group header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--aiops-text-subtle)', whiteSpace: 'nowrap' }}>{group.label}</div>
                <div style={{ flex: 1, height: 1, background: 'var(--aiops-border)' }} />
              </div>

              {/* Fields */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {group.fields.map(field => (
                  <div key={field.key} style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 'var(--space-5)', alignItems: 'start' }}>
                    <div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--aiops-text)', lineHeight: 1.3 }}>{field.label}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--aiops-text-subtle)', marginTop: 3, lineHeight: 1.5 }}>{field.hint}</div>
                    </div>
                    <div>
                      {field.sensitive ? <SecretInput field={field} /> : <PlainInput field={field} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Azure (live) integration card ───────────────────────────── */

const EMPTY_AZURE: AzureConnection = {
  tenant_id: '', client_id: '', client_secret: '',
  subscription_id: '', resource_group: '',
  app_insights_resource_name: '', workspace_id: '', region: '',
};

function AzureIntegrationCard() {
  const { data: serverSettings, isLoading } = useSettings();
  const saveMutation = useSaveSettings();
  const testMutation = useTestSettings();
  const [open, setOpen] = useState(true);
  const [form, setForm] = useState<AzureConnection>(EMPTY_AZURE);
  const [showSecret, setShowSecret] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Populate form from server once
  if (!initialized && !isLoading && serverSettings) {
    const az = serverSettings.azure;
    setForm(az
      ? { ...az, client_secret: '' }
      : EMPTY_AZURE);
    setInitialized(true);
  }

  const set = (key: keyof AzureConnection, val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  const status = serverSettings?.last_validation_error ? 'degraded'
    : serverSettings?.last_validated_at ? 'connected'
    : 'missing';

  const handleTest = () => testMutation.mutate({ azure: form });
  const handleSave = () => saveMutation.mutate({ azure: form });

  const testStatus: 'idle' | 'testing' | 'ok' | 'fail' =
    testMutation.isPending ? 'testing'
    : testMutation.data?.ok === true ? 'ok'
    : testMutation.data?.ok === false ? 'fail'
    : 'idle';

  const sc = statusCfg[status];

  return (
    <div style={{ border: '1px solid var(--aiops-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 'var(--space-4)' }}>
      <div
        role="button" tabIndex={0} aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); } }}
        style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4)', background: open ? 'var(--aiops-surface)' : 'var(--aiops-bg-subtle)', transition: 'background-color var(--transition-fast)', userSelect: 'none' }}
      >
        <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', flexShrink: 0, background: '#0078D418', border: '1px solid #0078D430', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#0078D4', fontFamily: 'var(--font-mono)' }}>
          AZ
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--aiops-text)' }}>Azure Application Insights</span>
            <span className={sc.chip} style={{ fontSize: 10 }}>
              <sc.icon size={9} aria-hidden /> {sc.label}
            </span>
            {serverSettings?.last_validated_at && (
              <span style={{ fontSize: 10, color: 'var(--aiops-text-subtle)' }}>
                validated {new Date(serverSettings.last_validated_at).toLocaleTimeString()}
              </span>
            )}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--aiops-text-muted)', marginTop: 2 }}>
            App Insights · Log Analytics · Resource Graph — metrics, traces, dependencies, and KQL queries
          </div>
        </div>
        <div onClick={e => e.stopPropagation()}>
          <button
            type="button" onClick={handleTest}
            disabled={testStatus === 'testing'}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--aiops-border)', background: testStatus === 'ok' ? 'var(--aiops-success-subtle)' : testStatus === 'fail' ? 'var(--aiops-danger-subtle)' : 'var(--aiops-surface)', color: testStatus === 'ok' ? 'var(--aiops-success)' : testStatus === 'fail' ? 'var(--aiops-danger)' : 'var(--aiops-text-muted)', fontSize: 'var(--text-xs)', fontWeight: 500, cursor: testStatus === 'testing' ? 'not-allowed' : 'pointer', transition: 'all var(--transition-fast)', whiteSpace: 'nowrap' }}
          >
            {testStatus === 'testing' && <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} aria-hidden />}
            {testStatus === 'ok' && <CheckCircle size={11} aria-hidden />}
            {testStatus === 'fail' && <AlertCircle size={11} aria-hidden />}
            {testStatus === 'idle' && <Zap size={11} aria-hidden />}
            {testStatus === 'testing' ? 'Testing…' : testStatus === 'ok' ? `Connected (${testMutation.data?.latency_ms}ms)` : testStatus === 'fail' ? 'Failed' : 'Test'}
          </button>
        </div>
        {open ? <ChevronUp size={16} style={{ color: 'var(--aiops-text-subtle)', flexShrink: 0 }} aria-hidden /> : <ChevronDown size={16} style={{ color: 'var(--aiops-text-subtle)', flexShrink: 0 }} aria-hidden />}
      </div>

      {open && (
        <div style={{ borderTop: '1px solid var(--aiops-border)', padding: 'var(--space-5)', background: 'var(--aiops-surface)' }}>
          {/* Auth group */}
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--aiops-text-subtle)' }}>Service Principal (Entra ID)</div>
              <div style={{ flex: 1, height: 1, background: 'var(--aiops-border)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {([
                { key: 'tenant_id',   label: 'Tenant ID',    hint: 'Entra ID tenant (Directory) ID' },
                { key: 'client_id',   label: 'Client ID',    hint: 'App Registration Application (Client) ID' },
              ] as { key: keyof AzureConnection; label: string; hint: string }[]).map(f => (
                <AzureField key={f.key} label={f.label} hint={f.hint} value={form[f.key] ?? ''} onChange={v => set(f.key, v)} />
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 'var(--space-5)', alignItems: 'start' }}>
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--aiops-text)', lineHeight: 1.3 }}>Client Secret</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--aiops-text-subtle)', marginTop: 3 }}>
                    Leave blank to keep the saved secret
                  </div>
                </div>
                <div style={{ position: 'relative', maxWidth: 400 }}>
                  <Form.Control
                    type={showSecret ? 'text' : 'password'}
                    placeholder={serverSettings?.azure?.client_secret === '********' ? '•••••••• (saved)' : 'Enter client secret'}
                    value={form.client_secret}
                    onChange={e => set('client_secret', e.target.value)}
                    autoComplete="off"
                    style={{ paddingRight: 40, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}
                  />
                  <button type="button" onClick={() => setShowSecret(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--aiops-text-subtle)', padding: 2, display: 'flex', alignItems: 'center' }}>
                    {showSecret ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Scope group */}
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--aiops-text-subtle)' }}>Subscription & Resource Group</div>
              <div style={{ flex: 1, height: 1, background: 'var(--aiops-border)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {([
                { key: 'subscription_id', label: 'Subscription ID', hint: 'Azure subscription ID (UUID)' },
                { key: 'resource_group',  label: 'Resource Group',  hint: 'Resource group to show in the Service Map' },
                { key: 'region',          label: 'Region',          hint: 'Optional — e.g. westeurope, eastus' },
              ] as { key: keyof AzureConnection; label: string; hint: string }[]).map(f => (
                <AzureField key={f.key} label={f.label} hint={f.hint} value={form[f.key] ?? ''} onChange={v => set(f.key, v)} />
              ))}
            </div>
          </div>

          {/* App Insights group */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--aiops-text-subtle)' }}>Application Insights</div>
              <div style={{ flex: 1, height: 1, background: 'var(--aiops-border)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {([
                { key: 'workspace_id',               label: 'Log Analytics Workspace ID', hint: 'Required for KQL telemetry queries (UUID)' },
                { key: 'app_insights_resource_name', label: 'App Insights Name',          hint: 'Optional — resource name in the chosen resource group' },
              ] as { key: keyof AzureConnection; label: string; hint: string }[]).map(f => (
                <AzureField key={f.key} label={f.label} hint={f.hint} value={form[f.key] ?? ''} onChange={v => set(f.key, v)} />
              ))}
            </div>
          </div>

          {/* Validation feedback */}
          {(testMutation.data || serverSettings?.last_validation_error) && (
            <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', background: testMutation.data?.ok === false || serverSettings?.last_validation_error ? 'var(--aiops-danger-subtle)' : 'var(--aiops-success-subtle)', border: `1px solid ${testMutation.data?.ok === false || serverSettings?.last_validation_error ? 'var(--aiops-danger-border, #fca5a5)' : 'var(--aiops-success-border, #86efac)'}`, fontSize: 'var(--text-xs)', color: testMutation.data?.ok === false || serverSettings?.last_validation_error ? 'var(--aiops-danger)' : 'var(--aiops-success)' }}>
              {testMutation.data?.ok === false
                ? testMutation.data.error
                : serverSettings?.last_validation_error
                ? serverSettings.last_validation_error
                : testMutation.data?.ok === true
                ? `Connection verified in ${testMutation.data.latency_ms}ms`
                : null}
            </div>
          )}

          {/* Save */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
            <Button
              variant="primary" size="sm"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              style={{ minWidth: 120 }}
            >
              {saveMutation.isPending
                ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                : saveMutation.isSuccess
                ? <><Check size={13} /> Saved</>
                : 'Save changes'}
            </Button>
            {saveMutation.isSuccess && (
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--aiops-success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle size={13} /> Settings saved
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AzureField({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 'var(--space-5)', alignItems: 'start' }}>
      <div>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--aiops-text)', lineHeight: 1.3 }}>{label}</div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--aiops-text-subtle)', marginTop: 3, lineHeight: 1.5 }}>{hint}</div>
      </div>
      <Form.Control
        type="text" value={value} onChange={e => onChange(e.target.value)}
        autoComplete="off"
        style={{ maxWidth: 400, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}
      />
    </div>
  );
}

function IntegrationsTab() {
  const [saved, setSaved] = useState(false);
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 3000); };

  const connected = INTEGRATIONS.filter(i => i.status === 'connected').length;
  const total = INTEGRATIONS.length;

  return (
    <div>
      <SectionHeader
        title="Integrations"
        description="Configure all external data sources and services. Keys set here override environment variables at runtime."
      />

      {/* Summary strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)', background: 'var(--aiops-bg-subtle)', border: '1px solid var(--aiops-border)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {INTEGRATIONS.map(i => {
            const sc = statusCfg[i.status];
            return (
              <div key={i.id} title={`${i.name}: ${sc.label}`} style={{ width: 8, height: 8, borderRadius: '50%', background: i.status === 'connected' ? 'var(--aiops-success)' : i.status === 'degraded' ? 'var(--aiops-warning)' : 'var(--aiops-danger)' }} />
            );
          })}
        </div>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--aiops-text-muted)' }}>
          <strong style={{ color: 'var(--aiops-text)' }}>{connected}/{total}</strong> integrations connected
        </span>
        {INTEGRATIONS.filter(i => i.status === 'missing').map(i => (
          <span key={i.id} className="chip chip-danger" style={{ fontSize: 10 }}>
            <AlertCircle size={9} aria-hidden /> {i.name} missing
          </span>
        ))}
      </div>

      <AzureIntegrationCard />
      {INTEGRATIONS.filter(i => i.id !== 'azure').map(int => <IntegrationCard key={int.id} integration={int} />)}

      <SaveButton saved={saved} onClick={save} />
    </div>
  );
}

/* ─── Notifications tab ────────────────────────────────────────── */

const notifications = [
  { id: 'n-sev0',      label: 'Sev0 incidents',          description: 'Immediate page — critical production impact',  defaultChecked: true,  group: 'Incident alerts' },
  { id: 'n-sev1',      label: 'Sev1 incidents',          description: 'High urgency — significant degradation',       defaultChecked: true,  group: 'Incident alerts' },
  { id: 'n-sev2',      label: 'Sev2 incidents',          description: 'Moderate impact — investigate within 4 hours', defaultChecked: false, group: 'Incident alerts' },
  { id: 'n-pipe',      label: 'Pipeline failures',       description: 'RCA pipeline stage errors or timeouts',        defaultChecked: true,  group: 'Pipeline' },
  { id: 'n-ratelimit', label: 'LLM rate limit errors',   description: 'Anthropic API quota exceeded',                 defaultChecked: true,  group: 'Pipeline' },
  { id: 'n-src',       label: 'Source health changes',   description: 'App Insights, Grafana, or Prometheus degrade', defaultChecked: false, group: 'Sources' },
  { id: 'n-cert',      label: 'TLS certificate expiry',  description: 'Certificate expiring within 14 days',          defaultChecked: true,  group: 'Sources' },
];

function NotificationsTab() {
  const [saved, setSaved] = useState(false);
  const [state, setState] = useState<Record<string, boolean>>(() => Object.fromEntries(notifications.map(n => [n.id, n.defaultChecked])));
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 3000); };
  const groups = [...new Set(notifications.map(n => n.group))];

  return (
    <div>
      <SectionHeader title="Notification Preferences" description="Choose which events trigger alerts for your account." />
      {groups.map((group, gi) => (
        <div key={group} style={{ marginBottom: gi < groups.length - 1 ? 'var(--space-6)' : 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--aiops-text-subtle)', marginBottom: 'var(--space-2)' }}>{group}</div>
          {notifications.filter(n => n.group === group).map(n => (
            <label key={n.id} htmlFor={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'background-color var(--transition-fast)', border: '1px solid transparent' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--aiops-bg-subtle)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Form.Check type="switch" id={n.id} checked={state[n.id]} onChange={e => setState(s => ({ ...s, [n.id]: e.target.checked }))} style={{ marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--aiops-text)' }}>{n.label}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--aiops-text-muted)', marginTop: 2 }}>{n.description}</div>
              </div>
              {state[n.id] && <span className="chip chip-success" style={{ flexShrink: 0 }}>Active</span>}
            </label>
          ))}
        </div>
      ))}
      <SaveButton saved={saved} onClick={save} />
    </div>
  );
}

/* ─── AI Analysis tab ──────────────────────────────────────────── */

const models = [
  { id: 'claude-opus-4-7',   name: 'Claude Opus 4.7',   badge: 'Recommended', description: 'Best accuracy for complex RCA. ~8s avg latency.',  color: 'var(--aiops-success)' },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', badge: 'Faster',       description: 'Good accuracy, ~4s avg latency. High-volume use.', color: 'var(--aiops-brand)'   },
];
const severityOptions = [
  { value: 'Sev0', label: 'Sev0 only',    description: 'Critical production incidents only' },
  { value: 'Sev1', label: 'Sev0 – Sev1',  description: 'Critical and high-severity' },
  { value: 'Sev2', label: 'Sev0 – Sev2',  description: 'Critical, high, and medium (recommended)' },
];
const aiToggles = [
  { id: 'ai-disclaimer', label: 'Hallucination disclaimer',   description: 'Show a caveat on RCA summaries reminding users to verify outputs.',          defaultChecked: true },
  { id: 'ai-hypotheses', label: 'Alternative hypotheses',     description: 'Include 1–3 low-confidence alternative root causes below the primary RCA.',   defaultChecked: true },
  { id: 'ai-reasoning',  label: 'Reasoning chain',            description: 'Show the step-by-step reasoning accordion on incident detail pages.',         defaultChecked: true },
  { id: 'ai-enrichment', label: 'Knowledge enrichment',       description: 'Run Knowledge Enricher to find similar past incidents and suspect commits.',   defaultChecked: true },
];

function AiTab() {
  const [model, setModel] = useState('claude-opus-4-7');
  const [severity, setSeverity] = useState('Sev2');
  const [toggles, setToggles] = useState<Record<string, boolean>>(() => Object.fromEntries(aiToggles.map(t => [t.id, t.defaultChecked])));
  const [saved, setSaved] = useState(false);
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 3000); };

  return (
    <div>
      <SectionHeader title="AI Analysis Settings" description="Configure the LangGraph pipeline behaviour and Claude model parameters." />
      <div style={{ marginBottom: 'var(--space-5)', paddingBottom: 'var(--space-5)', borderBottom: '1px solid var(--aiops-border)' }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--aiops-text)', marginBottom: 'var(--space-3)' }}>LLM Model</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {models.map(m => {
            const active = model === m.id;
            return (
              <button key={m.id} type="button" onClick={() => setModel(m.id)} aria-pressed={active} style={{ textAlign: 'left', cursor: 'pointer', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)', border: `2px solid ${active ? 'var(--aiops-brand)' : 'var(--aiops-border)'}`, background: active ? 'var(--aiops-brand-subtle)' : 'var(--aiops-surface)', transition: 'all var(--transition-fast)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, border: `2px solid ${active ? 'var(--aiops-brand)' : 'var(--aiops-border)'}`, background: active ? 'var(--aiops-brand)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 2 }}>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--aiops-text)', fontFamily: 'var(--font-mono)' }}>{m.name}</span>
                    <span className="chip chip-success" style={{ fontSize: 10 }}>{m.badge}</span>
                  </div>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--aiops-text-muted)' }}>{m.description}</span>
                </div>
                {active && <Check size={16} style={{ color: 'var(--aiops-brand)', flexShrink: 0 }} aria-hidden />}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ marginBottom: 'var(--space-5)', paddingBottom: 'var(--space-5)', borderBottom: '1px solid var(--aiops-border)' }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--aiops-text)', marginBottom: 4 }}>Auto-create GitHub issues for</div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--aiops-text-muted)', marginBottom: 'var(--space-3)' }}>The GitHub Issue Creator stage only runs for incidents at or above this severity.</div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {severityOptions.map(opt => {
            const active = severity === opt.value;
            return (
              <button key={opt.value} type="button" onClick={() => setSeverity(opt.value)} aria-pressed={active} title={opt.description} style={{ padding: '6px 14px', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: `2px solid ${active ? 'var(--aiops-brand)' : 'var(--aiops-border)'}`, background: active ? 'var(--aiops-brand-subtle)' : 'var(--aiops-surface)', color: active ? 'var(--aiops-brand-text)' : 'var(--aiops-text-muted)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: active ? 600 : 400, transition: 'all var(--transition-fast)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {active && <Check size={11} aria-hidden />}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--aiops-text)', marginBottom: 'var(--space-3)' }}>Pipeline options</div>
        {aiToggles.map(t => (
          <label key={t.id} htmlFor={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'background-color var(--transition-fast)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--aiops-bg-subtle)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <Form.Check type="switch" id={t.id} checked={toggles[t.id]} onChange={e => setToggles(s => ({ ...s, [t.id]: e.target.checked }))} style={{ marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--aiops-text)' }}>{t.label}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--aiops-text-muted)', marginTop: 2 }}>{t.description}</div>
            </div>
          </label>
        ))}
      </div>
      <SaveButton saved={saved} onClick={save} />
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────── */

export default function Settings() {
  const [tab, setTab] = useState<Tab>('integrations');
  const panels: Record<Tab, React.ReactNode> = {
    profile:       <ProfileTab />,
    integrations:  <IntegrationsTab />,
    notifications: <NotificationsTab />,
    ai:            <AiTab />,
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your profile, integrations, and pipeline configuration." />
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        <div style={{ background: 'var(--aiops-surface)', border: '1px solid var(--aiops-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)', position: 'sticky', top: 'calc(var(--topbar-h) + var(--space-4))' }}>
          <SettingsNav active={tab} onChange={setTab} />
        </div>
        <div style={{ background: 'var(--aiops-surface)', border: '1px solid var(--aiops-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', minHeight: 400 }}>
          {panels[tab]}
        </div>
      </div>
    </div>
  );
}
