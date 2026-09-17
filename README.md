# 🎫 AI-Powered Support Ticket Management System

An intelligent, multi-role IT service management and customer support platform powered by AI automated resolution, real-time ticket dispatch, intelligent department routing, and omnichannel notifications.

---

## 🌟 Key Highlights & Portals

### 🧑‍💻 1. Customer Self-Service Portal
- **AI Instant Resolution**: Real-time AI knowledge search that analyzes ticket context and suggests verified solutions before escalation.
- **Ticket Lifecycle Management**: Create tickets with priority levels, categories, and attachments.
- **Interactive Timeline**: Real-time conversation thread between customers, AI assistants, and human support agents.

### 🛠️ 2. Agent Portal & AI Workbench
- **Smart Work Queue**: Intelligent ticket routing based on agent availability status (`Available`, `Busy`, `Offline`) and department expertise.
- **AI Solution Validation**: AI drafts recommended resolutions for agent review, modification, or one-click approval.
- **Collaborative Support**: Ticket hold, transfer, and multi-tier resolution workflows.

### 📊 3. Manager & Team Lead Portal
- **Workload Balancing**: Live visual dashboard of departmental workloads and active agent assignments.
- **SLA & Escalation Monitoring**: Proactive SLA tracking with color-coded urgency and auto-escalation.
- **Reassignment Controls**: Seamless manual ticket reassignment across department specialists.

### ⚡ 4. Admin Portal & System Governance
- **User & Role Management**: Multi-role access control (`Admin`, `Manager`, `Agent`, `Customer`).
- **AI Email Automation Gateway**: Built-in cloud email delivery supporting **Resend** and **Brevo** HTTPS APIs for automatic notification on creation, assignment, and resolution.
- **System Audit & Analytics**: Comprehensive metric reporting and audit logging.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS, React Router v7, Recharts, React Icons, Axios |
| **Backend** | Python 3.13 / Django 6.0, Django REST Framework, SimpleJWT |
| **Database** | MongoDB (PyMongo), SQLite3 / PostgreSQL (`dj-database-url`, `psycopg2`) |
| **Integrations** | Gemini AI / LLM Resolution, Cloud Email APIs (Resend, Brevo), `pypdf` |
| **Deployment** | Vercel (Frontend), Render (Backend via `Procfile` / `render.yaml`) |

---

## 📁 Repository Structure

```text
ai_support_ticket_management/
├── client/                     # Frontend Application (React + Vite)
│   ├── src/
│   │   ├── components/         # Reusable UI components & modals
│   │   ├── context/            # AuthContext & Session state management
│   │   ├── layouts/            # Dashboard layouts and sidebar navigation
│   │   ├── pages/              # Portal pages (Customer, Agent, Manager, Admin)
│   │   ├── routes/             # App routing and Role-based Protected Routes
│   │   └── services/           # Axios API services & endpoints
│   ├── package.json
│   └── vite.config.js
│
├── server/                     # Backend Application (Django + DRF)
│   ├── apps/
│   │   └── support/            # Support ticketing logic, models, views, and routing
│   │       ├── department_assignment.py # Smart auto-assignment engine
│   │       ├── email_service.py         # HTTPS email dispatch (Resend/Brevo)
│   │       ├── models.py                # Database models
│   │       └── views.py                 # REST API viewsets & AI endpoints
│   ├── config/                 # Django settings and root URLs
│   ├── manage.py
│   ├── requirements.txt
│   └── Procfile
│
├── render.yaml                 # Render backend deployment configuration
├── vercel.json                 # Vercel frontend deployment configuration
└── README.md
```

---

## 🚀 Getting Started Locally

### Prerequisites
- **Node.js** (v18.0 or higher)
- **Python** (v3.10 or higher)
- **Git**

---

### 1. Backend Setup (Django)

```bash
# Navigate to the backend directory
cd server

# Create and activate a Python virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
python manage.py migrate

# (Optional) Seed demo master data
python populate_image1_dataset.py

# Start the Django development server
python manage.py runserver 8000
```
The backend API will be available at `http://127.0.0.1:8000`.

---

### 2. Frontend Setup (React + Vite)

```bash
# In a new terminal, navigate to the frontend directory
cd client

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
The application will launch at `http://localhost:5173`.

---

## ⚙️ Environment Configuration

### Backend (`server/.env`)
Create a `.env` file in the `server/` directory:
```env
DEBUG=True
SECRET_KEY=your-django-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1,.onrender.com

# Optional Cloud Email Gateway
RESEND_API_KEY=your-resend-api-key
BREVO_API_KEY=your-brevo-api-key

# Database (Optional - defaults to SQLite/MongoDB)
DATABASE_URL=sqlite:///db.sqlite3
MONGODB_URI=your-mongodb-connection-string
```

---

## 🚢 Deployment

- **Frontend (Vercel)**: Configured via [vercel.json](file:///Users/apple/Downloads/ai_support_ticket_management-main/vercel.json) for automatic SPA routing and single-command deployment.
- **Backend (Render)**: Configured via [render.yaml](file:///Users/apple/Downloads/ai_support_ticket_management-main/render.yaml) and [Procfile](file:///Users/apple/Downloads/ai_support_ticket_management-main/server/Procfile) utilizing `gunicorn config.wsgi:application`.

---

## 👥 Authors & Contributors

- **Lead Developer**: [Sourish3605](https://github.com/Sourish3605)
- **Contributors**: [Premalatha-08-30](https://github.com/Premalatha-08-30), [Devipriya](https://github.com/Devipriya), [Simran](https://github.com/Simran)

---

## 📄 License

This project is licensed under the MIT License.
