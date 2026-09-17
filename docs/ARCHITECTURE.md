# FactoryPulse — System Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Stream1 [Data Ingestion & Simulation]
        A[Manufacturing Simulator] -->|500k+ Records| B[Pydantic / Pandas Validator]
        B -->|Corrupt Records| Q[(Quarantine Records Table)]
        B -->|Valid Records| C[Deduplication & Transformation Engine]
        C -->|Dedup Stats| L[ETL Audit Log]
    end

    subgraph Stream2 [PostgreSQL 16 Analytical Warehouse]
        C -->|Bulk Copy & Stream| F1[(fact_production)]
        C -->|Range Partitioning| F2[(fact_sensor_telemetry)]
        C -->|B-Tree Indexing| F3[(fact_downtime)]
        C -->|Dimensional Joins| F4[(fact_quality)]
        F1 & F3 --> MV[mv_daily_machine_oee]
        F1 & F3 & F2 --> RULE_ENGINE[Rule & Anomaly Evaluator]
        RULE_ENGINE --> F5[(fact_alerts)]
        RULE_ENGINE --> INC[(incidents)]
    end

    subgraph Stream3 [FastAPI Intelligence Backend]
        F1 & F2 & F3 & MV <--> API[FastAPI REST Services]
        INC <--> API
        API --> WS[WebSocket Live Broadcast]
    end

    subgraph Stream4 [User Interfaces & BI]
        API <--> REACT[React + TypeScript Incident Console]
        WS --> REACT
        MV & F1 & F2 & F3 <--> SUPERSET[Apache Superset 3.0 BI Hub]
    end
```

## Manufacturing Mathematics

### 1. Overall Equipment Effectiveness (OEE)
$$\text{OEE} = \text{Availability} \times \text{Performance} \times \text{Quality}$$

- **Availability Rate**:
  $$\text{Availability} = \frac{\text{Operating Minutes}}{\text{Planned Production Minutes}} = \frac{\text{Planned Minutes} - \text{Total Downtime Minutes}}{\text{Planned Minutes}}$$

- **Performance Rate**:
  $$\text{Performance} = \min\left(1.0, \frac{\text{Total Units Produced} \times \text{Ideal Cycle Time (sec)}}{\text{Operating Minutes} \times 60}\right)$$

- **Quality Rate**:
  $$\text{Quality} = \frac{\text{Good Units}}{\text{Total Units Produced}} = \frac{\text{Total Units} - \text{Scrap Units} - \text{Rework Units}}{\text{Total Units}}$$

### 2. Reliability Engineering (MTBF & MTTR)
- **MTTR (Mean Time To Repair)**:
  $$\text{MTTR} = \frac{\sum \text{Unplanned Downtime Duration (Hours)}}{\text{Number of Equipment Breakdowns}}$$

- **MTBF (Mean Time Between Failures)**:
  $$\text{MTBF} = \frac{\text{Total Operating Uptime (Hours)}}{\text{Number of Equipment Breakdowns}}$$
  *Calculated in SQL using window lag:*
  ```sql
  LAG(dt.end_time) OVER (PARTITION BY dt.machine_id ORDER BY dt.start_time ASC)
  ```

- **Inherent Availability ($A_i$)**:
  $$A_i = \frac{\text{MTBF}}{\text{MTBF} + \text{MTTR}} \times 100\%$$
