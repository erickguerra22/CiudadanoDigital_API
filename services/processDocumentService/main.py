import sys
import os
import hashlib
from uuid import uuid4
from openai import OpenAI
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pinecone import Pinecone, ServerlessSpec
from datetime import datetime
import mimetypes
import docx
from dotenv import load_dotenv
import fitz  # PyMuPDF
import json

load_dotenv()

# =============================
# CONFIGURACIÓN GENERAL
# =============================
EMBEDDING_MODEL = "text-embedding-3-small"
INDEX_NAME = "ciudadano-digital"
BATCH_SIZE = 100

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
pinecone_client = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))


def init_pinecone():
    api_key = os.getenv("PINECONE_API_KEY")
    if not api_key:
        raise ValueError("No se encontró la variable de entorno PINECONE_API_KEY")

    pc = Pinecone(api_key=api_key)
    existing_indexes = [idx.name for idx in pc.list_indexes()]
    if INDEX_NAME not in existing_indexes:
        pc.create_index(
            name=INDEX_NAME,
            dimension=1536,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1")
        )
        # ✅ Índice '{INDEX_NAME}' creado.
    return pc.Index(INDEX_NAME)


index = init_pinecone()

# =============================
# FUNCIONES DE PROCESAMIENTO
# =============================


def extract_text_from_file(file_path: str) -> str:
    """Extrae texto sin importar el tipo de archivo."""
    mime_type, _ = mimetypes.guess_type(file_path)
    if mime_type == "application/pdf":
        text = ""
        with fitz.open(file_path) as pdf:
            for page in pdf:
                text += page.get_text()
        return text

    elif mime_type in ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"]:
        doc = docx.Document(file_path)
        return "\n".join([p.text for p in doc.paragraphs])

    elif mime_type.startswith("text/"):
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()

    else:
        raise ValueError(f"Tipo de archivo no soportado: {file_path}")


def clean_text(text: str) -> str:
    """Limpieza ligera del texto."""
    text = text.replace("\n", " ").replace("\r", " ")
    text = " ".join(text.split())  # colapsa espacios múltiples
    return text.strip()


def segment_text(text: str):
    """Divide texto en fragmentos semánticamente coherentes."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=120,
        separators=["\n\n", ".", ";", ":", "?", "!"]
    )
    return splitter.split_text(text)


def classify_category(fragment: str) -> str:
    """Clasifica automáticamente el fragmento en 1 de 6 categorías."""
    prompt = f"""
    Clasifica el siguiente texto en una de las categorías:
    [Ética, Civismo, Convivencia, Responsabilidad, Justicia, Participación ciudadana].
    Responde SOLO con el nombre de la categoría.

    Texto: {fragment[:500]}
    """
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}]
        )
        category = response.choices[0].message.content.strip()
        if category not in ["Ética", "Civismo", "Convivencia", "Responsabilidad", "Justicia", "Participación ciudadana"]:
            category = "General"
        return category
    except Exception:
        return "General"


def compute_sha1(content: str) -> str:
    """Devuelve un hash único del texto para detectar duplicados."""
    return hashlib.sha1(content.encode("utf-8")).hexdigest()


def already_indexed(sha1_hash: str) -> bool:
    """Verifica si un hash ya está en el índice (indexación incremental)."""
    query = index.query(
        vector=[0.0] * 1536,  # vector vacío ficticio
        top_k=1,
        filter={"sha1": {"$eq": sha1_hash}}
    )
    return len(query.get("matches", [])) > 0

# =============================
# FUNCIÓN PRINCIPAL
# =============================


def process_and_index_document(file_path: str, source_title: str, institution: str, year: int):
    """Procesa e indexa un documento completo en Pinecone."""
    category = "General"

    # 📄 Procesando: {file_path}
    text = extract_text_from_file(file_path)
    clean = clean_text(text)
    fragments = segment_text(clean)

    batch = []
    for i, frag in enumerate(fragments):
        sha1_hash = compute_sha1(frag)

        # Evita reindexar fragmentos duplicados
        if already_indexed(sha1_hash):
            # ⏩ Fragmento {i} ya indexado, omitido.
            continue
        
        if not frag.strip():
            # ⚠️ Fragmento {i} vacío, omitido.
            continue

        category = classify_category(frag)

        # Crear embedding
        emb = openai_client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=frag
        ).data[0].embedding

        metadata = {
            "text": frag,
            "source": source_title,
            "institution": institution,
            "year": year,
            "category": category,
            "sha1": sha1_hash,
            "uploaded_at": datetime.now().isoformat()
        }

        batch.append({"id": str(uuid4()), "values": emb, "metadata": metadata})

        if len(batch) >= BATCH_SIZE:
            index.upsert(vectors=batch)
            batch = []

    if batch:
        index.upsert(vectors=batch)
        
    return {
        "success": True,
        "category":category
    }

    # ✅ Documento '{source_title}' indexado con éxito.

# =============================
# FUNCIÓN DE BÚSQUEDA / RETRIEVAL
# =============================


def retrieve_context(query: str, category_filter: str=None, top_k: int=5):
    """Busca fragmentos relevantes en Pinecone."""
    query_emb = openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=query
    ).data[0].embedding

    filter_obj = {"category": {"$eq": category_filter}} if category_filter else None

    results = index.query(
        vector=query_emb,
        top_k=top_k,
        include_metadata=True,
        filter=filter_obj
    )

    return [
        {
            "score": match["score"],
            "category": match["metadata"].get("category"),
            "source": match["metadata"].get("source"),
            "year": match["metadata"].get("year"),
            "institution": match["metadata"].get("institution"),
            "text": match["metadata"].get("text")
        }
        for match in results.get("matches", [])
    ]

    
def classify_query_category(query: str) -> str:
    prompt = f"""
    Clasifica la siguiente pregunta en una de estas categorías:
    [Ética, Civismo, Convivencia, Responsabilidad, Justicia, Participación ciudadana].
    Responde SOLO con el nombre de la categoría.

    Pregunta: {query}
    """
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}]
        )
        category = response.choices[0].message.content.strip()
        if category not in ["Ética", "Civismo", "Convivencia", "Responsabilidad", "Justicia", "Participación ciudadana"]:
            category = None  # o "General"
        return category
    except Exception:
        return None

# =============================
# USO DE EJEMPLO
# =============================


if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("Por favor, proporciona el año del documento ('S/F' si no lo tienes).")
        sys.exit(1)
    if len(sys.argv) < 4:
        print("Por favor, proporciona el autor del documento ('S/D' si no lo tienes).")
        sys.exit(1)
    if len(sys.argv) < 3:
        print("Por favor, proporciona el nombre del documento.")
        sys.exit(1)
    if len(sys.argv) < 2:
        print("Por favor, proporciona la ruta al documento.")
        sys.exit(1)

    filePath = sys.argv[1]
    fileName = sys.argv[2]
    author = sys.argv[3]
    year = sys.argv[4]
    
    result = process_and_index_document(
        file_path=filePath,
        source_title=fileName,
        institution=author,
        year=year
    )
    
    print(json.dumps(result))
