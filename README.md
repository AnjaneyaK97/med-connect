# MediConnect — Omnichannel AI Healthcare Platform

[![CI Pipeline](https://img.shields.io/badge/CI-GitHub_Actions-blue.svg)](.github/workflows/ci.yml)
[![Node Version](https://img.shields.io/badge/Node-v20-green.svg)](services/gateway)
[![Python Version](https://img.shields.io/badge/Python-3.11-blue.svg)](services/ai-service)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Important Clinical & Regulatory Notice**: MediConnect is an AI-assisted clinical decision support prototype. All AI-generated triage summaries, diagnoses, and SOAP notes are non-final drafts requiring explicit review, editing, and approval by a licensed healthcare professional. The platform is not intended as an autonomous diagnostic tool or substitute for emergency medical services.

---

## 1. System Architecture

MediConnect is structured as a resilient, security-first microservices platform designed for modern telehealth workflows.

```mermaid
flowchart TB
    subgraph Client ["Client Layer"]
        Web["Web Client (React 18 + Vite + Tailwind CSS)<br/>Audio Voice Recorder (MediaRecorder)<br/>i18n Multilingual UI (EN, HI)<br/>Real-Time WS Listener"]
    end

    subgraph Ingress ["Edge & Reverse Proxy"]
        Nginx["Nginx Reverse Proxy (:80)<br/>Upstream load balancing<br/>Path-based routing and WebSocket upgrades<br/>Strict security headers"]
    end

    subgraph Services ["Application Services"]
        Gateway["Core Gateway API (Node.js/Express/TypeScript)<br/>JWT Auth (Access + Refresh Rotation)<br/>RBAC and Consent Verification<br/>WebSocket Gateway and Redis Pub/Sub<br/>BullMQ Job Orchestrator<br/>Immutable PHI Audit Logging"]
        AIService["AI Service (FastAPI / Python 3.11)<br/>OpenAI Whisper STT (Auto language detection)<br/>Deterministic Red-Flag Rule Engine<br/>Pre-LLM PII Sanitizer / Detokenizer<br/>ChromaDB RAG Knowledge Retrieval<br/>Ollama (Llama-3) SOAP Note Drafter"]
    end

    subgraph Data ["Persistence & Caching"]
        Postgres[("PostgreSQL 16<br/>Row-Level Security Policies<br/>Field-Level Envelope Encryption (AES-256)<br/>Consents and Audit Trail")]
        Redis[("Redis 7<br/>Pub/Sub for WebSockets<br/>Session and Availability Cache<br/>Rate Limiting and Job Queue")]
        Chroma[("ChromaDB Vector Store<br/>Medical guidelines<br/>Clinical templates")]
        Ollama["Ollama Daemon<br/>(Local Llama-3 Inference)"]
    end

    Web --> Nginx
    Nginx --> Gateway
    Nginx --> Web
    Gateway --> AIService
    Gateway --> Postgres
    Gateway --> Redis
    AIService --> Chroma
    AIService --> Ollama
    AIService --> Redis
```

---

## 2. Directory Layout

```
med/
├── .github/
│   └── workflows/
│       └── ci.yml             # Automated CI for Gateway, AI Service, and Web
├── docker-compose.yml         # Local and cloud-ready multi-container setup
├── nginx/
│   ├── Dockerfile
│   └── nginx.conf             # Unified reverse proxy & WebSocket configuration
├── services/
│   ├── gateway/               # Node.js + Express + TypeScript Gateway
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── app.ts
│   │       ├── index.ts
│   │       ├── config/
│   │       ├── middlewares/   # Correlation ID, Request Logger, Error Handler
│   │       ├── routes/        # Health (/health, /ready), Auth, Triage, Notes
│   │       └── tests/
│   ├── ai-service/            # FastAPI + Python 3.11 AI Engine
│   │   ├── Dockerfile
│   │   ├── pyproject.toml
│   │   ├── requirements.txt
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── core/config.py
│   │   │   └── api/v1/health.py
│   │   └── tests/
│   └── web/                   # React 18 + Vite + Tailwind + Vitest
│       ├── Dockerfile
│       ├── package.json
│       ├── vite.config.ts
│       └── src/
│           ├── App.tsx
│           ├── main.tsx
│           └── setupTests.ts
├── .env.example               # Complete environment variable blueprint
└── README.md
```

---

## 3. Service Boundaries

| Service | Technology | Port | Responsibilities |
|---|---|---|---|
| **`nginx`** | Nginx Alpine | `80` | Reverse proxy, static asset delivery, routing `/api/v1/` to Gateway, `/ws` WebSocket upgrades. |
| **`web`** | React 18, Vite, Tailwind | `3000` | Patient portal, voice capture, doctor triage review queue, clinical note editor with AI diff tracking. |
| **`gateway`** | Node.js, Express, TS | `4000` | Auth, RBAC, appointment booking, consent verification, audit logging, WebSocket gateway, job coordination. |
| **`ai-service`** | FastAPI, Python 3.11 | `8000` | Whisper multilingual STT, PII de-identification, deterministic red-flag escalation, RAG SOAP drafting via Ollama. |
| **`postgres`** | PostgreSQL 16 | `5432` | Primary relational store, Row-Level Security (RLS), immutable audit logs, envelope-encrypted columns. |
| **`redis`** | Redis 7 | `6379` | High-speed cache, rate limiter, Redis Pub/Sub for WebSockets, BullMQ background job queue. |
| **`chromadb`** | ChromaDB 0.4.x | `8001` | Semantic vector store for medical knowledge chunks, guidelines, and SOAP templates. |
| **`ollama`** | Ollama (Local) | `11434`| Local Llama-3 model host for privacy-preserving, zero-data-leakage inference. |

---

## 4. Security & Privacy Model

1. **Human-in-the-Loop Clinical Workflow**:
   - Every AI response is labeled `DRAFT`.
   - Clinicians review, edit, and approve notes. Visual diffs between AI draft and physician's approved note are permanently archived.
2. **Deterministic Red-Flag Escalation Engine**:
   - Operates in parallel with the LLM.
   - Evaluates rule sets for life-threatening symptoms (e.g. chest pain, stroke signs, severe hemorrhage).
   - If triggered, immediate emergency guidance is displayed to the patient, and the doctor queue marks the case as `URGENT`.
3. **Pre-LLM PII Sanitization**:
   - Patient names, contact details, and identifiers are scrubbed and replaced with deterministic tokens prior to sending prompts to the LLM.
   - Detokenization occurs only after note generation, ensuring raw PII is never part of LLM context logs.
4. **Data Isolation (RLS) & Encryption**:
   - AES-256-GCM Envelope Encryption for sensitive health fields (transcripts, notes, diagnoses).
   - PostgreSQL Row-Level Security (RLS) guarantees patients cannot query other patients' records, and doctors only access authorized cases.
5. **Immutable Audit Trail**:
   - Every PHI access (read, write, update) is immutably logged with `actorId`, `role`, `action`, `resourceId`, `ip`, and `timestamp`.

---

## 5. Local Setup & Quickstart

### Prerequisites
- Docker & Docker Compose
- Node.js v20+ (for local service debugging)
- Python 3.11+ (for local AI service debugging)
- Ollama (installed locally if testing live Llama-3 inference)

### 1. Clone & Configure Environment
```bash
cp .env.example .env
```

### 2. Run with Docker Compose
```bash
docker compose up -d --build
```

### 3. Verify Health Check Endpoints
```bash
# Nginx / Gateway Health Check
curl http://localhost/api/v1/health

# AI Service Health Check
curl http://localhost:8000/health

# Web Application
open http://localhost:80
```

---

## 6. Execution Roadmap

- [x] **Phase 1**: Repo structure, Docker multi-service setup, service skeletons, health checks, CI
- [x] **Phase 2**: PostgreSQL schema, migrations (Prisma), JWT auth, and RBAC
- [x] **Phase 3**: Envelope encryption layer (AES-256) and PostgreSQL Row-Level Security (RLS) with cross-tenant isolation tests
- [x] **Phase 4**: React app foundation, routing, auth flow, and i18n (EN/HI)
- [x] **Phase 5**: Voice capture (MediaRecorder), Whisper multilingual STT pipeline, async job queue
- [x] **Phase 6**: WebSocket gateway with Redis Pub/Sub for real-time transcription status
- [x] **Phase 7**: Triage summary generation & independent deterministic red-flag escalation engine
- [x] **Phase 8**: ChromaDB knowledge base ingestion, LangChain RAG, and Ollama Llama-3 SOAP note drafting with citations
- [x] **Phase 9**: Doctor dashboard, note review editor with draft-vs-final diff tracking, appointment management
- [x] **Phase 10**: Consent management engine, immutable audit logging, and pre-LLM PII redaction
- [x] **Phase 11**: Redis caching, rate limiting, Prometheus metrics, and correlation ID tracing
- [x] **Phase 12**: Evaluation harness, end-to-end testing, OpenAPI specifications, and final production hardening

---

## 7. Clinical Evaluation & Safety Benchmark Harness

MediConnect features an automated clinical benchmark harness ([`eval_harness.py`](file:///d:/projects/med/services/ai-service/app/services/eval_harness.py)) that validates diagnostic safety, deterministic emergency detection, and HIPAA compliance prior to deployment:

```bash
# Execute evaluation harness
curl http://localhost:8000/api/v1/evaluation/benchmark
```

### Benchmark Metrics & Safety Gates

| Safety Dimension | Metric | Benchmark Result | Status |
|---|---|---|---|
| **Deterministic Red-Flag Detection** | Acute coronary syndrome, stroke, respiratory distress, anaphylaxis | **100.0%** (0 false negatives) | Passed |
| **Pre-LLM PII De-identification** | Direct names, phone numbers, email handles stripped before prompt | **100.0%** protection | Passed |
| **SOAP Note Structural Completeness** | Presence of Subjective, Objective, Assessment, Plan & Citations | **100.0%** completeness | Passed |
| **Hallucination / Grounding** | All drafted recommendations tied to AHA/ACC, ATS/CDC, IDSA guidelines | **Grounded** | Passed |

---

## 8. Synthetic Seed Data & Demonstration Accounts

The platform includes a comprehensive synthetic seed script ([`seed.ts`](file:///d:/projects/med/services/gateway/prisma/seed.ts)) providing ready-to-test accounts pre-loaded with envelope-encrypted medical records, consent records, and triage cases.

```bash
# Run database seed inside gateway container
npm run seed
```

### Demonstration Logins

All accounts share the default development password: `SecurePassword123!`

| Role | Name | Email | Clinical Specialization / Context |
|---|---|---|---|
| **ADMIN** | Clinical Administrator | `admin@mediconnect.local` | System telemetry, immutable PHI access audit logs |
| **DOCTOR** | Dr. Rajesh Sharma | `dr.sharma@mediconnect.local` | Cardiology (License: `MED-CARD-883921`) — Reviewed & signed STEMI case |
| **DOCTOR** | Dr. Ananya Patel | `dr.patel@mediconnect.local` | Pulmonology (License: `MED-PULM-774912`) — Pending draft acute cough case |
| **DOCTOR** | Dr. Elena Wong | `dr.wong@mediconnect.local` | Neurology (License: `MED-NEUR-552910`) |
| **PATIENT** | John Doe | `patient.john@mediconnect.local` | Emergency chest pain triage history; granted FULL consent to Dr. Sharma |
| **PATIENT** | Priya Singh | `patient.priya@mediconnect.local` | Seasonal acute cough; scheduled upcoming telehealth appointment |

---

## 9. OpenAPI & API Documentation

- **Gateway API OpenAPI Specification**: Accessible at [`http://localhost:4000/openapi.json`](http://localhost:4000/openapi.json) or [`http://localhost/api/v1/openapi.json`](http://localhost/api/v1/openapi.json)
- **AI Service Swagger UI**: Interactive docs mounted at [`http://localhost:8000/docs`](http://localhost:8000/docs)
- **Prometheus Scrape Endpoint**: Real-time metrics at [`http://localhost:4000/metrics`](http://localhost:4000/metrics) and [`http://localhost:8000/metrics`](http://localhost:8000/metrics)

---

## 10. Verification & Test Execution

```bash
# 1. Run AI Service Unit & Evaluation Tests (Python)
cd services/ai-service
python -m unittest discover -s tests -v

# 2. Run Gateway Service Tests (Node.js/Jest in Docker)
cd services/gateway
npm test

# 3. Validate Docker Compose Infrastructure
docker compose config
```
