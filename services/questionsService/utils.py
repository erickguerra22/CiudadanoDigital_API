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
SIMILARITY_THRESHOLD = os.getenv("SIMILARITY_THRESHOLD", 0.8)

openaiClient = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
pineconeClient = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pineconeClient.Index(INDEX_NAME)


def classify_query_category(query: str, categories=list) -> str:
    prompt = f"""
    Clasifica la siguiente pregunta en una de estas categorías:
    {categories}
    Si no coincide con ninguna, sugiere una nueva.
    Responde SOLO con el nombre de la categoría.

    Pregunta: {query}
    """
    try:
        response = openaiClient.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content.strip()
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
        filter=filter_obj,
        namespace="ciudadania"
    )
    
    if not results.matches and category_filter:
        results = index.query(
            vector=query_emb,
            top_k=top_k,
            include_metadata=True,
            namespace="ciudadania"
        )
        
    if not results.matches or all(float(m["score"]) < float(SIMILARITY_THRESHOLD) for m in results.matches):
        return [[], []]

    context_fragments = []
    sources = []
    for match in results.get("matches", []):
        meta = match["metadata"]
        fragment_text = meta.get("text", "")
        source = meta.get("source", "Desconocido")
        year = meta.get("year", "")
        author = meta.get("author", "")
        category = meta.get("category", "")
        
        try:
            year_int = int(year)
        except (ValueError, TypeError):
            year_int = None
        
        if year_int is not None:
            sources.append(f"{source} ({author}, {year_int})")
        else:
            sources.append(f"{source} ({author})")
            
        context_fragments.append(
            f"[{category}] {fragment_text} (Fuente: {source}, {author}, {year})"
        )
    return [context_fragments, sources]


def build_rag_prompt(question: str, context_fragments: list, historial:list, resumen:str):
    """Construye el prompt combinando contexto y pregunta."""
    context_text = "\n\n".join(context_fragments)
    prompt = f"""
Eres un asistente educativo usando método socrático para estudiantes de 14 a 20 años.

Puedes razonar y guiar a partir de los conceptos presentes en el contexto,
historial y resumen, aunque la situación exacta del usuario no esté escrita.
No inventes datos, pero sí puedes guiar la reflexión con ideas generales.

Siempre debes poder responder saludos, agradecimientos o despedidas de forma amable y breve, sin 
incurrir a mayor información ni aplicar el formato del resto de respuestas.
(Ejemplo: "¡Hola! ¿Cómo estás?", "Gracias a ti", "Hasta pronto").

Fuera de esos casos, si la pregunta no está directamente relacionada con el contexto,
responde exactamente:
"No puedo responder."

Está prohibido inventar o inferir contenido fuera del contexto.

HISTORIAL:
{historial}

RESUMEN:
{resumen}

CONTEXTO:
{context_text}

Pregunta:
{question}

Formato de respuesta:
- Análisis breve basado en contexto (1-2 frases)
- ::Preguntas:: con hasta 3 preguntas socráticas que deben estar redactadas desde primera persona, no como si se estuvieran preguntando a alguien más (Ejemplo: ¿Cómo puedo yo implementar lo que me dices?)

Idioma: español.
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


def get_chat_name(question:str):
    """Define el nombre del chat si no se ha definido"""
    prompt = f"""
    Tengo esta pregunta: {question}
    NO la respondas.
    Dame un nombre breve y claro para el chat.
    Responde SOLO el nombre.
    """
    try:
        return ask_llm(prompt)
    except Exception:
        return "Nuevo Chat"


def get_new_resumen(historial:list):
    prompt = f"""Resume de forma compacta los siguientes mensajes: 
    {historial}"""
    return ask_llm(prompt)


def rag_query(question: str, category: str=None, historial: list=[], resumen: str=None):
    """Pipeline completo RAG: recuperar contexto, generar prompt, obtener respuesta."""
    context_fragments, sources = retrieve_context(question, category_filter=category)
    
    new_resumen = get_new_resumen(historial) if len(historial) >= 5 else None
    
    prompt = build_rag_prompt(question, context_fragments, historial, resumen)
    answer = ask_llm(prompt)
    return [answer, sources, new_resumen]
