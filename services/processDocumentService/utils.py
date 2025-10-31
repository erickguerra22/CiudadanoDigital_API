import hashlib
import os
from uuid import uuid4
from openai import OpenAI
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pinecone import Pinecone, ServerlessSpec
from datetime import datetime
import mimetypes
import docx
from dotenv import load_dotenv
import fitz
import re

# CONFIGURACIÓN INICIAL
load_dotenv()

EMBEDDING_MODEL = "text-embedding-3-small"
INDEX_NAME = "ciudadano-digital"
BATCH_SIZE = 100

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
pinecone_client = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))


# INICIALIZA PICONE Y VERIFICA EXISTENCIA DEL ÍNDICE
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
    return pc.Index(INDEX_NAME)


index = init_pinecone()


# FUNCIONES AUXILIARES
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


def already_indexed(sha1_hash: str) -> bool:
    """Verifica si un hash ya está en el índice (indexación incremental)."""
    query = index.query(
        vector=[0.0] * 1536,  # vector vacío ficticio
        top_k=1,
        filter={"sha1": {"$eq": sha1_hash}}
    )
    return len(query.get("matches", [])) > 0


# LIMPIEZA Y PROCESAMIENTO PREVIO
def segment_text(text: str):
    """Divide texto en fragmentos semánticamente coherentes."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=120,
        length_function=len,
        separators=["\n\n", "\n", ". ", "? ", "! ", "; ", ", ", " "]
    )
    
    chunks = splitter.split_text(text)
    chunks = [c for c in chunks if len(c.split()) >= 20]
    return splitter.split_text(text)


def clean_text(text: str) -> str:
    """Limpieza que preserva estructura de párrafos."""
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = '\n'.join(line.strip() for line in text.split('\n'))
    text = re.sub(r' +', ' ', text)
    return text.strip()


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


# INDEXACIÓN DEL DOCUMENTO
def process_and_index_document(file_path: str, source_title: str, institution: str, year: int, identifier: str):
    """Procesa e indexa un documento completo en Pinecone."""
    category = "General"

    text = extract_text_from_file(file_path)
    clean = clean_text(text)
    fragments = segment_text(clean)

    batch = []
    for _, frag in enumerate(fragments):
        sha1_hash = hashlib.sha1(frag.encode("utf-8")).hexdigest()

        # Evita reindexar fragmentos duplicados
        if already_indexed(sha1_hash):
            # Fragmento ya indexado, omitido.
            continue
        
        if not frag.strip():
            # Fragmento vacío, omitido.
            continue

        category = classify_category(frag)

        # Crear embedding
        emb = openai_client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=frag
        ).data[0].embedding

        metadata = {
            "document_id": identifier,
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

    
# ELIMINAR DOCUMENTO
def delete_document(identifier: str):
    """Elimina todos los fragmentos asociados a un documento en Pinecone."""
    try:
        index.delete(filter={"document_id": {"$eq": identifier}})
        return {"success": True, "deleted_document": identifier, "error":None}
    except Exception as e:
        return {"success": False, "error": str(e), "deleted_document": None}
