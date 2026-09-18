import Badge from 'react-bootstrap/Badge';

const variantMap: Record<string, string> = {
  Sev0: 'danger',
  Sev1: 'warning',
  Sev2: 'primary',
  Sev3: 'info',
  Sev4: 'secondary',
};

export function SeverityBadge({ severity }: { severity: string }) {
  return <Badge bg={variantMap[severity] ?? 'secondary'}>{severity}</Badge>;
}
