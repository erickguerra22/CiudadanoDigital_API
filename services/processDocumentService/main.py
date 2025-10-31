import sys
import json
from utils import *


def main(filepath: str, filename: str, author: str, year: str, remotepath: str):
    return process_and_index_document(
        file_path=filepath,
        source_title=filename,
        institution=author,
        year=year,
        identifier=remotepath
    )


if __name__ == "__main__":
    if len(sys.argv) < 6:
        print("Por favor, proporciona la ruta remota del documento.")
        sys.exit(1)
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
    remotePath = sys.argv[5]
    
    result = main(filePath, fileName, author, year, remotePath)
    
    print(json.dumps(result))
    
