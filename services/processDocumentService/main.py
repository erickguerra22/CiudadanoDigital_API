import sys
import json
from utils import *


def main(filepath: str, filename: str, author: str, year: str, remotepath: str, categories: list, minAge: int, maxAge:int):
    return process_and_index_document(
        file_path=filepath,
        source_title=filename,
        author=author,
        year=year,
        identifier=remotepath,
        categories=categories,
        minAge=minAge,
        maxAge=maxAge
    )


if __name__ == "__main__":    
    raw = sys.stdin.read()
    data = json.loads(raw)
    
    filePath = data.get("filePath")
    fileName = data.get("fileName")
    author = data.get("author")
    year = data.get("year")
    remotePath = data.get("remotePath")
    categories = data.get("categories")
    minAge = data.get("minAge")
    maxAge = data.get("maxAge")
    
    result = main(filePath, fileName, author, year, remotePath, categories, minAge, maxAge)
    
    print(json.dumps(result))
    
