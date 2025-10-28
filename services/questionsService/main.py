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


def main(question: str):
    category = classify_query_category(question)
    [respuesta, referencias] = rag_query(question, category)
    chatName = get_chat_name(question) if(chat == 'undefined') else chat
    return {
        "response": respuesta,
        "reference":", ".join(list(dict.fromkeys(referencias))),
        "question":question,
        "category":category,
        "chatName":chatName,
        }


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Por favor, proporciona el chatId.")
        sys.exit(1)
    if len(sys.argv) < 2:
        print("Por favor, proporciona la pregunta.")
        sys.exit(1)

    question = sys.argv[1]
    chat = sys.argv[2]
    
    response = main(question)
    print(json.dumps(response))
