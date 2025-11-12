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
SIMILARITY_THRESHOLD = os.getenv("SIMILARITY_THRESHOLD", 0.35)

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


def retrieve_context(query: str, category_filter: str=None, top_k: int=TOP_K, edad:int=None):
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
        
        min_age = meta.get("minAge")
        max_age = meta.get("maxAge")
        if edad is not None:
            try:
                min_age = int(min_age) if min_age is not None else None
                max_age = int(max_age) if max_age is not None else None
            except (ValueError, TypeError):
                min_age = max_age = None

            if min_age is not None and max_age is not None:
                if not (min_age <= edad <= max_age):
                    continue

            elif min_age is not None and edad < min_age:
                continue
            elif max_age is not None and edad > max_age:
                continue
        
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


def build_rag_prompt(question: str, context_fragments: list, historial:list, resumen:str, edad:int):
    """Construye el prompt combinando contexto y pregunta."""
    context_text = "\n\n".join(context_fragments)
    prompt = f"""
Eres un asistente educativo que utiliza el método socrático para guiar a un estudiante de {edad} años.

Puedes razonar y guiar únicamente a partir de los conceptos presentes en el contexto,
historial y resumen, aunque la situación exacta del usuario no esté escrita.
No inventes datos ni generalices fuera de la información disponible.

PRIORIDAD DE RESPUESTA:
1. Si la pregunta es un saludo, agradecimiento o despedida (por ejemplo: "hola", "gracias", "adiós", "buenas", "cómo estás"), responde de forma amable y breve, sin usar el formato del resto de respuestas y sin incluir ningún tipo de pregunta si no hay contexto para hacerlo (Evita preguntas como "¿Cómo estás?").
2. Si el CONTEXTO está vacío o no está relacionado con la pregunta, responde exactamente:
   "No puedo responder."
3. Solo si hay información directamente relacionada con la pregunta, elabora tu respuesta con el formato establecido.

DEFINICIÓN:
Se considera “relacionado con el contexto” únicamente si los temas principales o palabras clave de la pregunta
aparecen o guardan conexión directa con los conceptos del CONTEXTO, HISTORIAL o RESUMEN.

Está prohibido inferir o inventar información no explícitamente presente.

---

HISTORIAL:
{historial if (len(context_text)> 0) else "VACÍO"}

RESUMEN:
{resumen if (len(context_text)> 0) else "VACÍO"}

CONTEXTO:
{context_text if len(context_text) > 0 else "VACÍO"}

PREGUNTA:
{question}

---

Formato de respuesta (solo si hay contexto relacionado):
Un análisis breve basado en el contexto (1-2 frases)
::Preguntas:: con hasta 3 preguntas socráticas redactadas desde primera persona
  (Ejemplo: ¿Cómo puedo yo aplicar esto en mi vida diaria?)

Idioma: español.
IMPORTANTE: Adapta tu redacción para responder a una persona de {edad} años.
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


def rag_query(question: str, category: str=None, historial: list=[], edad: int=13, resumen: str=None):
    """Pipeline completo RAG: recuperar contexto, generar prompt, obtener respuesta."""
    context_fragments, sources = retrieve_context(question, category_filter=category,edad=edad)
    
    new_resumen = get_new_resumen(historial) if len(historial) >= 5 else None
    
    prompt = build_rag_prompt(question, context_fragments, historial, resumen, edad)
    answer = ask_llm(prompt)
    return [answer, sources, new_resumen]
