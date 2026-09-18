"""Azure Monitor query helpers — Log Analytics (KQL) and Metrics."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

from azure.identity import DefaultAzureCredential
from azure.monitor.query import LogsQueryClient, MetricsQueryClient, LogsQueryStatus

from app.config import settings

logger = logging.getLogger(__name__)

_credential = DefaultAzureCredential()


def _logs_client() -> LogsQueryClient:
    return LogsQueryClient(_credential)


def _metrics_client() -> MetricsQueryClient:
    return MetricsQueryClient(_credential)


# ---------------------------------------------------------------------------
# KQL templates
# ---------------------------------------------------------------------------

_EXCEPTIONS_KQL = """
AppExceptions
| where TimeGenerated between (datetime('{start}') .. datetime('{end}'))
| project TimeGenerated, ProblemId, ExceptionType, OuterMessage,
          InnermostMessage, StackTrace = substring(Details, 0, 500),
          AppRoleName, OperationId
| order by TimeGenerated desc
| take 25
"""

_FAILED_REQUESTS_KQL = """
AppRequests
| where TimeGenerated between (datetime('{start}') .. datetime('{end}'))
| where Success == false
| project TimeGenerated, Name, ResultCode, DurationMs,
          AppRoleName, OperationId
| order by TimeGenerated desc
| take 25
"""

_DEPENDENCY_FAILURES_KQL = """
AppDependencies
| where TimeGenerated between (datetime('{start}') .. datetime('{end}'))
| where Success == false
| project TimeGenerated, Name, DependencyType = Type, ResultCode,
          DurationMs, Target, AppRoleName, OperationId
| order by TimeGenerated desc
| take 25
"""


def _format_ts(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def _rows_to_dicts(table) -> list[dict]:
    """Convert a LogsTable to a list of row dicts."""
    columns = [c.name for c in table.columns]
    return [
        {col: (str(val) if val is not None else None) for col, val in zip(columns, row)}
        for row in table.rows
    ]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


async def query_exceptions(
    fired_at: str,
    window_minutes: int = 5,
) -> list[dict]:
    """Return recent exceptions around the alert time."""
    center = datetime.fromisoformat(fired_at.replace("Z", "+00:00"))
    start = center - timedelta(minutes=window_minutes)
    end = center + timedelta(minutes=window_minutes)
    kql = _EXCEPTIONS_KQL.format(start=_format_ts(start), end=_format_ts(end))
    return _run_kql(kql)


async def query_failed_requests(
    fired_at: str,
    window_minutes: int = 5,
) -> list[dict]:
    center = datetime.fromisoformat(fired_at.replace("Z", "+00:00"))
    start = center - timedelta(minutes=window_minutes)
    end = center + timedelta(minutes=window_minutes)
    kql = _FAILED_REQUESTS_KQL.format(start=_format_ts(start), end=_format_ts(end))
    return _run_kql(kql)


async def query_dependency_failures(
    fired_at: str,
    window_minutes: int = 5,
) -> list[dict]:
    center = datetime.fromisoformat(fired_at.replace("Z", "+00:00"))
    start = center - timedelta(minutes=window_minutes)
    end = center + timedelta(minutes=window_minutes)
    kql = _DEPENDENCY_FAILURES_KQL.format(start=_format_ts(start), end=_format_ts(end))
    return _run_kql(kql)


async def query_metrics(
    resource_id: str,
    fired_at: str,
    metric_names: list[str] | None = None,
    window_minutes: int = 10,
) -> dict:
    """Query Azure Monitor metrics for a resource around the alert time."""
    if not resource_id:
        return {}
    if metric_names is None:
        metric_names = ["Percentage CPU", "Available Memory Bytes", "Http5xx"]

    center = datetime.fromisoformat(fired_at.replace("Z", "+00:00"))
    start = center - timedelta(minutes=window_minutes)
    end = center + timedelta(minutes=window_minutes)

    client = _metrics_client()
    result: dict = {}
    for name in metric_names:
        try:
            response = client.query_resource(
                resource_uri=resource_id,
                metric_names=[name],
                timespan=(start, end),
            )
            for metric in response.metrics:
                points = []
                for ts in metric.timeseries:
                    for dp in ts.data:
                        points.append(
                            {
                                "timestamp": dp.timestamp.isoformat() if dp.timestamp else None,
                                "average": dp.average,
                                "maximum": dp.maximum,
                                "total": dp.total,
                            }
                        )
                result[metric.name] = points
        except Exception:
            logger.warning("Metric query failed for %s on %s", name, resource_id, exc_info=True)
    return result


# ---------------------------------------------------------------------------
# Internal
# ---------------------------------------------------------------------------


def _run_kql(kql: str) -> list[dict]:
    client = _logs_client()
    workspace = settings.azure_log_analytics_workspace_id
    logger.debug("Running KQL against workspace %s:\n%s", workspace, kql)
    response = client.query_workspace(workspace_id=workspace, query=kql, timespan=None)
    if response.status == LogsQueryStatus.SUCCESS:
        return _rows_to_dicts(response.tables[0]) if response.tables else []
    logger.error("KQL query returned partial/failure: %s", response.partial_error)
    return _rows_to_dicts(response.partial_data[0]) if response.partial_data else []
