# 🧠 CiudadanoDigital_API
API principal del proyecto Sapien - Ciudadano Digital.

## 🚀 Configuración del entorno
### 1. Clonar repositorio:
```bash
git clone https://github.com/erickguerra22/CiudadanoDigital_API
cd CiudadanoDigital_API
```

### 2. Instalar dependencias de Node.js
```bash
npm install
```

### 3. Crear y activar el entorno virtual de Python
🔹 En Linux / macOS:
```bash
python3 -m venv ciudadano_digital
source ciudadano_digital/bin/activate
```
🔹 En Windows (PowerShell):
```bash
python -m venv ciudadano_digital
.\ciudadano_digital\Scripts\activate
```

### 4. Instalar dependencias de Python
```bash
pip install -r requirements.txt
```

### 5. Configurar variables de entorno
Crea un archivo `.env` en la raíz del proyecto siguiendo el formato de ejemplo en `.env.example`.
Este archivo debe contener:
-  Ruta absoluta completa donde estará el proyecto (termina con directorio `API`).
- URL de conexión a la base de datos (el proyecto sugiere utilizar PostgreSQL).
- Clave *JWT* para generación de *tokens*.
- Configuración *Pinecone*: API_KEY, región, nombre del índice.
- Configuración OpenAI: API_KEY, modelo de embeddings, modelo LLM.
- Configuración de emails: correo electrónico y contraseña de aplicación.
- Configuración de bucket *S3*: credenciales de AWS (ACCES_KEY, SECRET_KEY), región, nombre del bucket.
### 6. Inicializar la base de datos
Ejecuta el script SQL que crea la estructura inicial de tablas:
```bash
psql -U <usuario> -d <base_de_datos> -f db/tables.sql
```

💡 Si se cambia el gestor de base de datos (MySQL, Oracle etc.) el comando anterior deberá ser adaptado.


## ⚙️ Ejecución del servidor
🔹 Modo desarrollo (con detección automática de cambios)
```bash
npm run dev
```
🔹 Modo producción
```
npm run start
```

## 🧩 Tecnologías principales

Node.js – Servidor backend principal  
Express.js – Framework para rutas y controladores  
Python – Servicios auxiliares de procesamiento y comunicación con Pinecone/OpenAI  
PostgreSQL – Base de datos principal  
AWS S3 – Almacenamiento de documentos  
Pinecone – Base vectorial para búsqueda semántica  
OpenAI API – Procesamiento de lenguaje y generación de embeddings
