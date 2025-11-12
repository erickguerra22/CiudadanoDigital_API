import os
from openai import OpenAI
from pinecone import Pinecone
from dotenv import load_dotenv
import sys
import json
from utils import *

dotenv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../.env'))
load_dotenv(dotenv_path)

EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
LLM_MODEL = os.getenv("OPENAI_LLM_MODEL", "gpt-4o-mini")
INDEX_NAME = os.getenv("PINECONE_INDEX", "ciudadano-digital")
TOP_K = os.getenv("PINECONE_TOP_K", 5)


def main(question, categories, historial, resumen, chat, edad):
    category = classify_query_category(question, categories)
    chatName = chat if chat != "undefined" else get_chat_name(question)
    
    respuesta, referencias, nuevo_resumen = rag_query(question, category, historial, edad, resumen)
    return {
        "response": respuesta,
        "reference": None if respuesta == "No puedo responder." else ";;; ".join(list(dict.fromkeys(referencias))),
        "question":question,
        "category":category,
        "chatName":chatName,
        "resumen":nuevo_resumen
        }


if __name__ == "__main__":
    raw = sys.stdin.read()
    data = json.loads(raw)

    question = data.get("question")
    chat = data.get("chat")
    categories = data.get("categories", [])
    historial = data.get("historial", [])
    resumen = data.get("resumen")
    edad = int(data.get("edad"))

    response = main(question, categories, historial, resumen, chat, edad)
    print(json.dumps(response))