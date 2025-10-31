import sys
import json
from utils import *


def main(identifier: str):
    return delete_document(identifier)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Por favor, proporciona el identificador del documento.")
        sys.exit(1)

    identifier = sys.argv[1]
    
    result = main(identifier)
    
    print(json.dumps(result))
    
