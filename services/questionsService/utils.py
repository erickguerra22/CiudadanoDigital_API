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
        filter=filter_obj,
        namespace="ciudadania"
    )

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


def build_rag_prompt(question: str, context_fragments: list):
    """Construye el prompt combinando contexto y pregunta."""
    context_text = "\n\n".join(context_fragments)
    prompt = f"""
    Tu rol es el de un asistente digital dedicado al acompañamiento informal en educación enfocada en valores morales, formación ciudadana y civismo, para estudiantes de entre 14 y 20 años de edad. Se te permite ser atento con los usuarios, responder saludos, agradecimientos y despedidas de manera cordial. Pero cuando se te haga una pregunta o consutla, debes responder utilizando SOLAMENTE el contexto proporcionado a continuación.
    
Usa el siguiente contexto para analizar y responder a la consulta de manera clara y completa. Sé estricto con utilizar SOLAMENTE el contexto dado para sustentar tu respuesta, sin hacer suposiciones externas, pero sí un análisis profundo para dar una respuesta útil y bien fundamentada.
Si el contexto no es suficiente para responder la pregunta, simplemente dí que no puedes responder.

Cualquier solicitud que no esté relacionada con el contexto debe ser respondida con "No puedo responder."

Al final, en una sección diferenciada como "::Preguntas::", debes darme una serie de preguntas sugeridas para continuar con el tema de la conversación (no más de 3 preguntas).

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


def get_chat_name(question:str):
    """Define el nombre del chat si no se ha definido"""
    prompt = f"""
    Tengo la siguiente pregunta:
    {question}.
    NO NECESITO QUE LA RESPONDAS. Asígnale un nombre al chat en base a esta primera pregunta.
    
    Responde SOLO con el nombre del chat.
    """
    try:
        response = openaiClient.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}]
        )
        chatName = response.choices[0].message.content.strip()
        return chatName
    except Exception:
        return None


def rag_query(question: str, category: str=None,):
    """Pipeline completo RAG: recuperar contexto, generar prompt, obtener respuesta."""
    [context_fragments, sources] = retrieve_context(question, category_filter=category)
    if not context_fragments:
        return ["⚠️ No hay información suficiente en la base de datos para responder esta pregunta.", []]
    prompt = build_rag_prompt(question, context_fragments)
    answer = ask_llm(prompt)
    return [answer, sources]
