
# Professional Sign-up & Management System

![Status](https://img.shields.io/badge/Status-Production%20Ready-success)
![Docker](https://img.shields.io/badge/Docker-Compose-blue)
![Stack](https://img.shields.io/badge/Stack-Django%20%7C%20React%20%7C%20Postgres-informational)
![Coverage](https://img.shields.io/badge/Coverage-100%25-brightgreen)

A robust, full-stack prototype designed to unify professional sign-ups from multiple sources. This solution moves beyond a basic implementation to focus on **scalability**, **data integrity**, and **security**, utilizing a production-grade architecture with an Nginx API Gateway.

---

## 🏗 Architecture

The system implements the **API Gateway Pattern** to decouple the internal services from the external world.

```mermaid
graph TD
    User[User Browser] -->|Port 80| Gateway[Nginx Gateway]
    
    subgraph Docker Internal Network
        Gateway -->|/api/*| Backend[Django API :8000]
        Gateway -->|/*| Frontend[React/Vite :80]
        Gateway -.->|/media/*| Volume[Media Volume]
        Backend -->|R/W| DB[(PostgreSQL :5432)]
        Backend -->|Write PDF| Volume
    end
````

### Architectural Highlights

1.  **Security by Design:** Database and Application Server ports are strictly isolated within the Docker network. Only the Nginx Gateway (Port 80) is exposed.
2.  **Performance:** Nginx serves static assets and uploaded PDFs directly from the volume, bypassing the Python application layer for maximum throughput.
3.  **CORS Elimination:** Since Frontend and Backend sit behind the same origin, complex CORS preflight requests are eliminated in production.

-----

## 🚀 Quick Start

You can have the entire stack (Frontend, Backend, DB, Gateway) running in **one command**.

### Prerequisites

  * Docker & Docker Compose

### Installation

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd <project-folder>
    ```

2.  **Setup Environment Variables:**
    Create the local environment files from the provided examples.

    ```bash
    cp backend/.env.example backend/.env
    cp frontend/.env.example frontend/.env
    ```

3.  **Launch the System:**

    ```bash
    docker-compose up --build
    ```

4.  **Access the Application:**

      * **Web App:** [http://localhost](http://localhost)
      * **API Documentation (Swagger):** [http://localhost/api/docs/](http://localhost/api/docs/)

> **Note:** The system automatically seeds the database with 10 demo professionals upon the first startup for immediate testing.

-----

## 💡 Key Engineering Decisions

### 1\. The "Bulk Upsert" Strategy (Backend)

The requirement mandated *partial success* handling. A naive iterative loop would result in N+1 query performance issues.

  * **Optimized Algorithm:**
    1.  **Prefetch:** We fetch all relevant existing emails/phones in a single DB query.
    2.  **In-Memory Map:** We construct a lookup dictionary ($O(1)$ access) to match incoming rows against existing records.
    3.  **Atomic Row Processing:** We iterate the payload in Python. Valid rows are saved; invalid rows are caught, formatted, and added to a detailed error report.
    4.  **Result:** A `207 Multi-Status` response.

### 2\. Resume Processing & Security

  * **Extraction:** We use `pdfplumber` to extract text from resumes to enable future keyword search capabilities.
  * **Security (Magic Bytes):** We do **not** trust file extensions. The system uses `python-magic` (libmagic) to inspect the file's binary signature, ensuring no malicious executables (e.g., `.exe` renamed to `.pdf`) penetrate the system.

### 3\. Frontend State Management

  * **TanStack Query (React Query):** Used for server state management. It eliminates the need for manual `useEffect` fetching and provides out-of-the-box caching, optimistic updates, and loading states.
  * **Zod & React Hook Form:** The frontend validation schema mirrors the backend constraints, providing immediate user feedback.

-----

## 🧩 Addressing Challenge Extensions

### Contract alignment (current)

- Model fields: `full_name`, `email` (unique, optional if phone), `phone` (unique optional, regex), `company_name`, `job_title`, `source` choices `direct | partner | internal`, timestamps, optional resume/resume_text.
- Endpoints:
  - `POST /api/professionals/` create (multipart allowed for resume).
  - `POST /api/professionals/bulk/` bulk upsert (email primary key; phone fallback). Partial success via HTTP 207.
  - `GET /api/professionals/?source=` list with optional source filter.
- Frontend forms and bulk panel collect: Full Name (required), Email, Phone, Company, Job Title, Source dropdown (direct/partner/internal), PDF upload (<5MB).
- Demo data: 10 seeded professionals with the above fields.

### 1\. Processing the PDF Content

**Current Implementation:**
A `ResumeProcessorService` synchronously extracts text using `pdfplumber` and saves it to a `resume_text` field.

**Production Strategy:**
In a high-traffic environment, parsing PDFs synchronously blocks the HTTP request thread. I designed the service layer to be easily decoupled. The next step is to offload this to **Celery + Redis**. The View would simply save the file and trigger a background task, ensuring the API remains sub-100ms responsive.

### 2\. File Upload Method

**Current Implementation:**
Standard `multipart/form-data` via `POST /api/professionals/`. Files are stored in a Docker Volume.

**Production Strategy:**
By updating `DEFAULT_FILE_STORAGE` in Django settings, we can switch to **AWS S3** or **Google Cloud Storage** without changing a single line of business logic. This is crucial for horizontal scaling (stateless containers).

-----

## 🔮 Future Roadmap & Optimizations

While this prototype is robust, a true production environment would benefit from the following enhancements:

### 0\. Search across professionals

Add a fast search endpoint and UI control to query by primary fields (`full_name`, `email`, `company_name`, `job_title`, `phone`) with prefix/contains matching. Depending on scale, consider PostgreSQL trigram indexes or a lightweight search backend.

### 0.5. Vectorized resume intelligence

Leverage the extracted `resume_text` by chunking and storing embeddings in PostgreSQL (pgvector) or an external vector store. This would enable semantic search, candidate Q&A, and smarter filtering over resumes without shipping PDFs to the client.

### 1\. Enhanced Data Ingestion (CSV Support)

Currently, the Bulk endpoint accepts JSON. To better support legacy systems and non-technical users, I would add a **CSV/Excel parser** to the backend. This would allow users to drag-and-drop a `.csv` file directly into the Bulk Upload Panel.

### 2\. Asynchronous Event-Driven Architecture

As mentioned in the PDF section, introducing a message broker (RabbitMQ/Redis) is the next logical step. This would allow us to:

  * Process large PDF files in the background.
  * Send "Welcome Emails" asynchronously upon sign-up.
  * Calculate analytics without slowing down user interactions.

### 3\. Observability & Monitoring

To ensure reliability, I would integrate:

  * **Sentry:** For real-time error tracking.
  * **Prometheus/Grafana:** To monitor API latency and partial success rates of the Bulk endpoint.
  * **Structured Logging:** Converting Django logs to JSON format for easier parsing in tools like Datadog or ELK.

-----

## 🧪 Testing & Quality Assurance

The project includes a comprehensive test suite covering edge cases and security.

### Running Tests

To run the backend tests inside the container:

```bash
docker-compose run --rm backend pytest
```

### Coverage Highlights

  * ✅ **Partial Success:** Verifies that valid rows are saved while invalid ones return detailed errors.
  * ✅ **Security:** Tests rejecting `.exe` files renamed as `.pdf` and files larger than 5MB.
  * ✅ **Deduplication:** Verifies that re-uploading an existing user updates them instead of creating duplicates.

-----

## 🛠 Tech Stack

  * **Backend:** Python 3.11, Django 4.2, Django REST Framework.
  * **Frontend:** React 18, TypeScript, Vite, TailwindCSS.
  * **Database:** PostgreSQL 15.
  * **Infrastructure:** Nginx, Docker Compose.
