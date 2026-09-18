"""Application Insights client — distributed traces, availability, and performance."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

from azure.identity import DefaultAzureCredential
from azure.monitor.query import LogsQueryClient, LogsQueryStatus

from app.config import settings

logger = logging.getLogger(__name__)

_credential = DefaultAzureCredential()


def _logs_client() -> LogsQueryClient:
    return LogsQueryClient(_credential)


def _format_ts(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def _rows_to_dicts(table) -> list[dict]:
    columns = [c.name for c in table.columns]
    return [
        {col: (str(val) if val is not None else None) for col, val in zip(columns, row)}
        for row in table.rows
    ]


def _run_kql(kql: str) -> list[dict]:
    client = _logs_client()
    workspace = settings.azure_log_analytics_workspace_id
    logger.debug("App Insights KQL against workspace %s:\n%s", workspace, kql)
    response = client.query_workspace(workspace_id=workspace, query=kql, timespan=None)
    if response.status == LogsQueryStatus.SUCCESS:
        return _rows_to_dicts(response.tables[0]) if response.tables else []
    logger.error("App Insights KQL partial/failure: %s", response.partial_error)
    return _rows_to_dicts(response.partial_data[0]) if response.partial_data else []


# ---------------------------------------------------------------------------
# Distributed traces
# ---------------------------------------------------------------------------

_TRACES_KQL = """
AppTraces
| where TimeGenerated between (datetime('{start}') .. datetime('{end}'))
| where SeverityLevel >= 2
| project TimeGenerated, Message, SeverityLevel, OperationId,
          AppRoleName, OperationName
| order by TimeGenerated desc
| take 25
"""

_END_TO_END_KQL = """
let ops = AppRequests
| where TimeGenerated between (datetime('{start}') .. datetime('{end}'))
| where Success == false
| distinct OperationId;
union AppRequests, AppDependencies, AppExceptions, AppTraces
| where OperationId in (ops)
| project TimeGenerated, ItemType = itemType, Name, OperationId,
          AppRoleName, DurationMs, Success, SeverityLevel
| order by OperationId, TimeGenerated asc
| take 100
"""

_AVAILABILITY_KQL = """
AppAvailabilityResults
| where TimeGenerated between (datetime('{start}') .. datetime('{end}'))
| project TimeGenerated, Name, Success, DurationMs, Location,
          Message, OperationId
| order by TimeGenerated desc
| take 25
"""

_PERF_COUNTERS_KQL = """
AppPerformanceCounters
| where TimeGenerated between (datetime('{start}') .. datetime('{end}'))
| where Name in ("\\Processor(_Total)\\% Processor Time",
                 "\\Memory\\Available MBytes",
                 "\\ASP.NET Applications(__Total__)\\Requests/Sec")
| project TimeGenerated, Name, Value, AppRoleName
| order by TimeGenerated desc
| take 50
"""


async def query_traces(fired_at: str, window_minutes: int = 5) -> list[dict]:
    """Return warning/error traces around the alert time."""
    center = datetime.fromisoformat(fired_at.replace("Z", "+00:00"))
    start = center - timedelta(minutes=window_minutes)
    end = center + timedelta(minutes=window_minutes)
    kql = _TRACES_KQL.format(start=_format_ts(start), end=_format_ts(end))
    return _run_kql(kql)


async def query_end_to_end_transactions(
    fired_at: str, window_minutes: int = 5
) -> list[dict]:
    """Return full transaction traces for failed operations."""
    center = datetime.fromisoformat(fired_at.replace("Z", "+00:00"))
    start = center - timedelta(minutes=window_minutes)
    end = center + timedelta(minutes=window_minutes)
    kql = _END_TO_END_KQL.format(start=_format_ts(start), end=_format_ts(end))
    return _run_kql(kql)


async def query_availability(fired_at: str, window_minutes: int = 5) -> list[dict]:
    """Return availability test results around the alert time."""
    center = datetime.fromisoformat(fired_at.replace("Z", "+00:00"))
    start = center - timedelta(minutes=window_minutes)
    end = center + timedelta(minutes=window_minutes)
    kql = _AVAILABILITY_KQL.format(start=_format_ts(start), end=_format_ts(end))
    return _run_kql(kql)


async def query_performance_counters(
    fired_at: str, window_minutes: int = 5
) -> list[dict]:
    """Return performance counter data around the alert time."""
    center = datetime.fromisoformat(fired_at.replace("Z", "+00:00"))
    start = center - timedelta(minutes=window_minutes)
    end = center + timedelta(minutes=window_minutes)
    kql = _PERF_COUNTERS_KQL.format(start=_format_ts(start), end=_format_ts(end))
    return _run_kql(kql)
