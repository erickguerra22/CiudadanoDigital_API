import os
from openai import OpenAI
from pinecone import Pinecone
from dotenv import load_dotenv

dotenv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../.env'))
load_dotenv(dotenv_path)

EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
LLM_MODEL = os.getenv("OPENAI_LLM_MODEL", "gpt-4o-mini")
INDEX_NAME = os.getenv("PINECONE_INDEX", "ciudadano-digital")
TOP_K = int(os.getenv("PINECONE_TOP_K", 5))

openaiClient = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
pineconeClient = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pineconeClient.Index(INDEX_NAME)


def classify_query_category(query: str, categories=["Ética", " Civismo", "Convivencia", "Responsabilidad", "Justicia", "Participación ciudadana"]) -> str:
    prompt = f"""
    Clasifica la siguiente pregunta en una de estas categorías:
    {categories}.
    Responde SOLO con el nombre de la categoría.

    Pregunta: {query}
    """
    try:
        response = openaiClient.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}]
        )
        category = response.choices[0].message.content.strip()
        return category
    except Exception:
        return None


def retrieve_context(query: str, category_filter: str=None, top_k: int=TOP_K):
    """Recupera fragmentos relevantes desde Pinecone para RAG."""
    query_emb = openaiClient.embeddings.create(
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

    context_fragments = []
    sources = []
    for match in results.get("matches", []):
        meta = match["metadata"]
        fragment_text = meta.get("text", "")
        source = meta.get("source", "Desconocido")
        year = meta.get("year", "")
        institution = meta.get("institution", "")
        category = meta.get("category", "")
        sources.append(source)
        context_fragments.append(
            f"[{category}] {fragment_text} (Fuente: {source}, {institution}, {year})"
        )
    return [context_fragments, sources]


def build_rag_prompt(question: str, context_fragments: list):
    """Construye el prompt combinando contexto y pregunta."""
    context_text = "\n\n".join(context_fragments)
    prompt = f"""
Usa el siguiente contexto para responder a la pregunta de manera clara y completa. 
Si el contexto no responde, simplemente dí que no puedes responder.

Contexto:
{context_text}

Pregunta:
{question}

Respuesta:
"""
    return prompt


def ask_llm(prompt: str):
    """Envía el prompt al LLM y devuelve la respuesta."""
    response = openaiClient.chat.completions.create(
        model=LLM_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2
    )
    return response.choices[0].message.content.strip()


def rag_query(question: str, category: str=None,):
    """Pipeline completo RAG: recuperar contexto, generar prompt, obtener respuesta."""
    [context_fragments, sources] = retrieve_context(question, category_filter=category)
    if not context_fragments:
        return ["⚠️ No hay información suficiente en la base de datos para responder esta pregunta.", []]
    prompt = build_rag_prompt(question, context_fragments)
    answer = ask_llm(prompt)
    return [answer, sources]
