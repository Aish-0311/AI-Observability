FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml main.py ./
RUN pip install --no-cache-dir \
    "fastapi>=0.115,<1" \
    "uvicorn[standard]>=0.32,<1" \
    "azure-monitor-opentelemetry>=1.6,<2" \
    "opentelemetry-instrumentation-fastapi>=0.48b0"

COPY . .

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
