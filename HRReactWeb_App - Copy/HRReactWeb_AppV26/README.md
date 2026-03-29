<div align="center">

![HR Platform Banner](./banner.png)

# 🌌 Smart HR Analytics Platform v2.0

### **Premium AI-Powered Human Resources Ecosystem**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.x-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Microservices-Flask-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![OpenAI](https://img.shields.io/badge/AI-OpenAI_GPT_&_Whisper-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](./LICENSE)

---

A full-stack Human Resources ecosystem built with a premium **Professional Glassmorphic** design system. Seamlessly combines specialized AI microservices for resume screening, dynamic live interviews, and predictive employee retention to deliver a world-class HR management experience.

[**Features**](#-features) • [**Tech Stack**](#-tech-stack) • [**Setup Guide**](#-quick-start) • [**File Structure**](#-file-structure) • [**Architecture**](#-system-architecture)

</div>

---

## ✨ Features

### 🎯 Core AI Modules
| Module | Description |
|:---|:---|
| **📄 CV Screening Engine** | AI/ML based Resume parsing & shortlisting driven by Cosine Similarity and automated feature extraction |
| **🎙️ Dynamic Interview Engine** | Real-time audio transcription (Whisper) integrated with GPT-3.5 designed to generate & evaluate role-specific questions on the fly |
| **📉 Employee Retention Manager** | Predictive Random Forest modeling that analyzes employee data to forecast attrition and flight risks |
| **📈 Performance Productivity** | Advanced deep learning (Keras/TensorFlow) tool processing historical data to generate actionable productivity insights |
| **🚀 Master Orchestrator** | Centralized Python bootstrapping (`MasterAPI.py`) controlling independent concurrent AI Flask microservices |
| **📊 Interactive Dashboards** | Live multi-tier React interfaces allowing HR admins and Candidates to monitor assessments seamlessly |

### 📱 Fully Responsive
- **Desktop**: Expansive data tables, floating glass navigations, and split-pane interview portals
- **Mobile**: Collapsible sidebars, stacked layouts, and compact result analytics

---

## 🛠 Tech Stack

### Frontend & Core Backend
| Technology | Purpose |
|:---|:---|
| React.js | Complex UI Interfaces & Dashboards |
| Vanilla CSS | Premium Glassmorphic Styling Elements |
| Node.js & Express | Core application networking & API Gateway |

### AI Ecosystem (Python Microservices)
| Technology | Purpose |
|:---|:---|
| Flask & WebRTC | Microservice architecture and Real-Time Audio Capture |
| OpenAI GPT-3.5 Turbo | Dynamic Interview context generation & evaluation |
| OpenAI Whisper-1 | High-Fidelity Speech-to-Text Transcription |
| Sentence-Transformers | Semantic Vector Embeddings (`all-MiniLM-L6-v2`) |
| Scikit-learn & Pandas | Data manipulation & Random Forest Retentions Modeler |
| Keras & TensorFlow | Deep Learning `.h5` model predictions for Productivity |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+ — [Download](https://nodejs.org/)
- **Python** 3.8+ — [Download](https://www.python.org/)
- **OpenAI API Key** — Add to `.env` inside `Dynamic_Interview/`

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/your-username/hr-analytics-platform.git
cd HRReactWeb_AppV26
```

### 2️⃣ Start the Core Backend
```bash
cd backend
npm install
node server.js
```

### 3️⃣ Start the Frontend
In a new terminal:
```bash
cd frontend
npm install
npm start
```

### 4️⃣ Ignite the AI Microservices
In a third terminal at the root directory, launch all independent Python inference engines simultaneously:
```bash
# Ensure you have installed required python packages:
# pip install flask flask-cors pandas numpy scikit-learn openai sentence-transformers tensorflow keras

python MasterAPI.py
```

> [!IMPORTANT]
> Both the Node servers and Python backend scripts must be running securely. Wait for the `MasterAPI.py` console to log `All APIs started.`. The AI subsystem will remain active until you trigger a Keyboard Interrupt (`Ctrl+C`).

---

## 📁 File Structure

```text
HRReactWeb_AppV26/
├── banner.png
├── README.md
├── MasterAPI.py                  # AI Orchestrator Bootstrapper
├── Run.txt                       # Setup Commands
│
├── frontend/                     # React.js SPA & UI Dashboards
│   ├── src/
│   └── package.json
│
├── backend/                      # Express / Node Server
│   └── server.js
│
├── Cv_Screen/                    # 🤖 AI Module: Resume NLP
│   ├── API.py                    # Flask Gateway
│   ├── Prediction.py             # Inference Script
│   └── dataset/                  
│
├── Dynamic_Interview/            # 🤖 AI Module: Live Interviews
│   ├── api.py                    # Flask Gateway
│   ├── PredictModel.py           # Embeddings & Fraud Check 
│   ├── Research_README.md        # Technical Context for Models
│   └── interviews_store.json     # Embedded Session DB
│
├── Employee_Retention/           # 🤖 AI Module: Attrition Prediction
│   ├── API.py                    # Flask Gateway
│   ├── Employee_Retention.py     # RF ML Construction
│   └── employee_attrition_model.pkl
│
└── Performance_Productivity/     # 🤖 AI Module: Advanced Metrics
    ├── Api.py                    # Flask Gateway
    ├── modelTrain.py             # TensorFlow Training Pipeline
    └── advanced_feedback_model.h5
```

---

## 🏗 System Architecture

```mermaid
graph TD
    User((HR / Candidate)) -->|React SPA| FE[Frontend: React 19]
    FE -->|REST API| BE[Backend: Core Node.js Server]

    subgraph 🧠 AI Microservices Pipeline
        Master((🚀 MasterAPI.py)) -.->|Concurrent Subprocess| CV(📄 CV Analytics)
        Master -.->|Concurrent Subprocess| DI(🎙️ Interview Engine)
        Master -.->|Concurrent Subprocess| ER(📉 Retention Modeler)
        Master -.->|Concurrent Subprocess| PP(📈 Productivity ML)
    end
    
    FE <-->|Direct Local Fetch| CV
    FE <-->|WebRTC Data Transmission| DI
    FE <-->|Dataset Validation| ER
    FE <-->|TensorFlow Inference| PP
    
    DI -->|Generates Questions| OpenAI[OpenAI GPT-3.5]
    DI -->|Transcription| Whisper[OpenAI Whisper-1]
```

---

## 🎨 Design System — "Professional Glassmorphic"

| Element | Implementation |
|:---|:---|
| **Background** | Clean gradients integrating subtle UI blur orbs |
| **Containers** | Translucent overlays with `backdrop-filter` for elevated styling |
| **Typography** | Minimalist readable fonts suited for heavy tabular data |
| **Dashboards** | Card-based component grids optimized for real-time statistical evaluation |

---

<div align="center">

### Revolutionizing Human Capital Management 🚀

**Smart HR Analytics v2.0 — 2026**

Constructed with React, Node.js, and multi-threaded Python AI Inference

</div>
