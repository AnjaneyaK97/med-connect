import re
import logging
from typing import Dict, Any
from app.core.config import settings

logger = logging.getLogger("knowledge_service")

# Starter Clinical Guidelines Knowledge Base
STARTER_MEDICAL_GUIDELINES = [
    {
        "guideline_id": "GL-CARD-001",
        "title": "AHA/ACC Clinical Practice Guideline for Evaluation and Diagnosis of Chest Pain",
        "category": "Cardiology",
        "section": "Evaluation & Risk Stratification",
        "content": (
            "Chest pain should be classified as cardiac, possible cardiac, or noncardiac. "
            "Patients presenting with acute chest discomfort radiating to the left arm, jaw, or shoulder, "
            "accompanied by diaphoresis, dyspnea, or nausea require immediate 12-lead ECG and serial cardiac troponin. "
            "Avoid NSAIDs in acute myocardial infarction. Aspirin 324 mg chewed should be administered immediately "
            "if acute coronary syndrome is suspected, unless contraindications exist."
        ),
    },
    {
        "guideline_id": "GL-PULM-002",
        "title": "ATS/CDC Practice Guidelines for Acute Bronchitis and Lower Respiratory Symptoms",
        "category": "Pulmonology",
        "section": "Diagnostic Criteria and Management",
        "content": (
            "Acute bronchitis is predominantly viral (90% of cases). Routine antibiotic treatment is not recommended "
            "for acute bronchitis in immunocompetent adults without chronic pulmonary disease. "
            "Symptomatic management includes adequate oral hydration, honey or dextromethorphan for cough suppression, "
            "and short-acting beta-agonists (albuterol) only when documented bronchospasm or wheezing is present. "
            "Chest radiography is indicated if vitals demonstrate tachypnea (>24/min), tachycardia (>100 bpm), or fever >38°C."
        ),
    },
    {
        "guideline_id": "GL-INF-003",
        "title": "IDSA Clinical Practice Guideline for the Diagnosis and Treatment of Acute Pharyngitis",
        "category": "Infectious Disease",
        "section": "Centor Assessment & Treatment",
        "content": (
            "Evaluation of sore throat should utilize the modified Centor criteria: absence of cough (+1), swollen/tender "
            "anterior cervical nodes (+1), temperature >38°C (+1), and tonsillar exudates (+1). "
            "Patients scoring >=3 warrant rapid antigen detection testing (RADT) for Group A Streptococcus prior to antibiotic therapy. "
            "Viral pharyngitis should be managed with supportive analgesia (acetaminophen or ibuprofen) and salt-water gargles."
        ),
    },
    {
        "guideline_id": "GL-NEUR-004",
        "title": "American Headache Society Guidelines for the Acute Treatment of Migraine and Tension Headaches",
        "category": "Neurology",
        "section": "Classification & Red Flags",
        "content": (
            "Headache evaluation must exclude secondary etiologies using the SNOOP mnemonic (Systemic symptoms, Neurological signs, "
            "Onset sudden/thunderclap, Older age, Pattern change). "
            "Uncomplicated tension-type headache responds to first-line NSAIDs (ibuprofen 400-800 mg) or acetaminophen. "
            "Migraine attacks respond best to early administration of specific abortive medications (triptans) and antiemetics."
        ),
    },
    {
        "guideline_id": "GL-MSK-005",
        "title": "AAOS Clinical Practice Guidelines for Acute Ankle Sprains and Musculoskeletal Strains",
        "category": "Musculoskeletal",
        "section": "Ottawa Rules & Conservative Management",
        "content": (
            "Apply the Ottawa Ankle Rules to determine need for radiography: bone tenderness along the posterior 6 cm of the lateral or medial malleolus, "
            "or inability to bear weight immediately and in the clinic for 4 steps. "
            "Grade I and II lateral ankle sprains are managed with conservative PRICE protocol (Protection, Rest, Ice, Compression, Elevation) "
            "and early protected weight bearing with functional bracing."
        ),
    },
]

class KnowledgeService:
    _chroma_client = None
    _collection = None

    @classmethod
    def get_collection(cls):
        """Initializes connection to ChromaDB or prepares in-memory clinical index."""
        if cls._collection is None:
            try:
                import chromadb
                cls._chroma_client = chromadb.HttpClient(
                    host=settings.CHROMA_HOST,
                    port=settings.CHROMA_PORT,
                )
                cls._collection = cls._chroma_client.get_or_create_collection(
                    name="medical_guidelines"
                )
                # Ingest starter guidelines if empty
                if cls._collection.count() == 0:
                    cls.ingest_starter_guidelines()
            except Exception as e:
                logger.warning(f"ChromaDB connection unavailable ({e}); using internal semantic knowledge engine.")
                cls._collection = "INTERNAL_ENGINE"

        return cls._collection

    @classmethod
    def ingest_starter_guidelines(cls):
        """Ingests baseline clinical guidelines into ChromaDB."""
        coll = cls.get_collection()
        if coll != "INTERNAL_ENGINE" and hasattr(coll, "add"):
            try:
                ids = [g["guideline_id"] for g in STARTER_MEDICAL_GUIDELINES]
                documents = [g["content"] for g in STARTER_MEDICAL_GUIDELINES]
                metadatas = [
                    {
                        "title": g["title"],
                        "category": g["category"],
                        "section": g["section"],
                    }
                    for g in STARTER_MEDICAL_GUIDELINES
                ]
                coll.add(ids=ids, documents=documents, metadatas=metadatas)
                logger.info(f"Ingested {len(ids)} clinical guidelines into ChromaDB.")
            except Exception as ex:
                logger.error(f"Error ingesting into ChromaDB: {ex}")

    @classmethod
    def query_guidelines(cls, query_text: str, top_k: int = 2) -> Dict[str, Any]:
        """
        Retrieves relevant medical guidelines matching patient symptoms,
        with relevance scoring and confidence threshold gating.
        """
        coll = cls.get_collection()

        # If ChromaDB collection is live
        if coll != "INTERNAL_ENGINE" and hasattr(coll, "query"):
            try:
                res = coll.query(query_texts=[query_text], n_results=top_k)
                docs = res.get("documents", [[]])[0]
                metas = res.get("metadatas", [[]])[0]
                distances = res.get("distances", [[]])[0] if res.get("distances") else [0.3] * len(docs)

                citations = []
                for idx, doc in enumerate(docs):
                    meta = metas[idx] if idx < len(metas) else {}
                    dist = distances[idx] if idx < len(distances) else 0.3
                    sim_score = max(0.1, round(1.0 - dist, 2))

                    citations.append({
                        "guideline_id": meta.get("guideline_id", f"GL-{idx+1}"),
                        "title": meta.get("title", "Clinical Guideline"),
                        "category": meta.get("category", "Medicine"),
                        "section": meta.get("section", "Standard Protocol"),
                        "excerpt": doc[:250] + "...",
                        "relevance_score": sim_score,
                    })

                confidence = "HIGH" if any(c["relevance_score"] >= 0.65 for c in citations) else "LOW"
                return {
                    "citations": citations,
                    "confidence": confidence,
                    "notice": None if confidence == "HIGH" else "No high-confidence clinical guideline retrieved for this presentation. Note draft generated from standard medical reference.",
                }
            except Exception as e:
                logger.error(f"ChromaDB query error: {e}")

        # Resilient Semantic Scoring Engine (fallback / unit tests)
        tokens = set(re.findall(r"\w+", query_text.lower()))
        scored_guidelines = []

        for g in STARTER_MEDICAL_GUIDELINES:
            doc_tokens = set(re.findall(r"\w+", (g["title"] + " " + g["category"] + " " + g["content"]).lower()))
            overlap = len(tokens.intersection(doc_tokens))
            score = round(min(0.95, overlap / max(1, len(tokens) * 0.5)), 2)

            if score > 0.15:
                scored_guidelines.append((score, g))

        scored_guidelines.sort(key=lambda x: x[0], reverse=True)
        top_matches = scored_guidelines[:top_k]

        citations = []
        for score, g in top_matches:
            citations.append({
                "guideline_id": g["guideline_id"],
                "title": g["title"],
                "category": g["category"],
                "section": g["section"],
                "excerpt": g["content"][:240] + "...",
                "relevance_score": score,
            })

        # If no specific matches, return general reference
        if not citations:
            citations.append({
                "guideline_id": "GL-GEN-000",
                "title": "General Telemedicine Clinical Practice Standard",
                "category": "General Practice",
                "section": "Standard Ambulatory Care",
                "excerpt": "Standard outpatient evaluation guidelines for acute complaints with non-urgent presentation.",
                "relevance_score": 0.45,
            })

        confidence = "HIGH" if any(c["relevance_score"] >= 0.60 for c in citations) else "LOW"

        return {
            "citations": citations,
            "confidence": confidence,
            "notice": None if confidence == "HIGH" else "No high-confidence clinical guideline retrieved for this presentation. Note draft generated from standard medical reference.",
        }
