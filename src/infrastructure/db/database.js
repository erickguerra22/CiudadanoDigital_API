import { Pool } from "pg";
import config from 'config';

const connectionUri = config.get('connection_uri');

let pool;

export async function initDb() {
  if (pool) return pool;

  try {
    pool = new Pool({
      connectionString: connectionUri,
      ssl: {
        rejectUnauthorized: false,
      },
      idleTimeoutMillis: 60000,
      max: 10,
    });

    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();

    console.log("✅ Conexión a PostgreSQL inicializada y validada");

    return pool;
  } catch (err) {
    console.error("❌ Error al inicializar conexión a PostgreSQL:", err.message);
    throw err;
  }
}

export async function getConnection() {
  try {
    if (!pool) {
      await initDb();
    }
    return await pool.connect();
  } catch (err) {
    console.error("❌ Error obteniendo conexión:", err.message);
    throw err;
  }
}

export async function closeDb() {
  try {
    if (pool) {
      await pool.end();
      console.log("🛑 Pool de conexiones a PostgreSQL cerrado");
    }
  } catch (err) {
    console.error("⚠️ Error al cerrar la conexión:", err.message);
  }
}
