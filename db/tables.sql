CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DROP TABLE IF EXISTS Documento;
DROP TABLE IF EXISTS Sesion;
DROP TABLE IF EXISTS CodigoRecuperacion;
DROP TABLE IF EXISTS Mensaje;
DROP TABLE IF EXISTS Chat;
DROP TABLE IF EXISTS Usuario;
CREATE TABLE Usuario (
    userId SERIAL PRIMARY KEY,
    email VARCHAR(254) UNIQUE NOT NULL,
    names VARCHAR(100) NOT NULL,
    lastnames VARCHAR(100) NOT NULL,
    birthdate DATE,
    phoneCode VARCHAR(4),
    phoneNumber VARCHAR(12),
    password VARCHAR(128) NOT NULL,
    CONSTRAINT unique_phone UNIQUE (phoneCode, phoneNumber)
);

CREATE TABLE Chat (
    chatId SERIAL PRIMARY KEY,
    userId INT NOT NULL,
    fechaInicio TIMESTAMPTZ DEFAULT NOW(),
    nombre VARCHAR(100),
    CONSTRAINT fk_chat_usuario FOREIGN KEY (userId)
        REFERENCES Usuario(userId)
        ON DELETE CASCADE
);

CREATE TABLE Mensaje (
    messageId SERIAL PRIMARY KEY,
    chatId INT NOT NULL,
    source VARCHAR(20) NOT NULL CHECK (source IN ('user', 'assistant')),
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_mensaje_chat FOREIGN KEY (chatId)
        REFERENCES Chat(chatId)
        ON DELETE CASCADE
);

ALTER TABLE Mensaje
ALTER COLUMN chatId DROP NOT NULL;

ALTER TABLE Mensaje ADD COLUMN IF NOT EXISTS asigned BOOLEAN default false;

CREATE TABLE Sesion (
    userId INT,
	deviceId VARCHAR(255) NOT NULL,
	refreshToken VARCHAR(255) NOT NULL,
	createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	expiresAt TIMESTAMPTZ NOT NULL, 
	revoked BOOLEAN NOT NULL DEFAULT FALSE,
	CONSTRAINT fk_sesion_usuario FOREIGN KEY (userId)
        REFERENCES Usuario(userId)
        ON DELETE SET NULL
);
ALTER TABLE Sesion ADD COLUMN IF NOT EXISTS revokedAt TIMESTAMP;

ALTER TABLE Sesion
ADD COLUMN IF NOT EXISTS refreshId UUID NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE Sesion
ADD CONSTRAINT IF NOT EXISTS pk_sesion PRIMARY KEY (refreshId);

CREATE TABLE CodigoRecuperacion (
    userId INT PRIMARY KEY,
    codeHash VARCHAR(255) NOT NULL,
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expiresAt TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_codRec_usuario FOREIGN KEY (userId)
        REFERENCES Usuario(userId)
        ON DELETE CASCADE
);

CREATE TABLE Documento (
    documentId SERIAL PRIMARY KEY,
    userId INT,
    source VARCHAR(50) NOT NULL CHECK (source IN ('user', 'system', 'external')),
    category VARCHAR(50),
    document_url TEXT NOT NULL,
    CONSTRAINT fk_documento_usuario FOREIGN KEY (userId)
        REFERENCES Usuario(userId)
        ON DELETE SET NULL
);