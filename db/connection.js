import { Pool } from 'pg';
import config from 'config';

const connectionUri = config.get('dbConnectionUri');

let pool;

export async function initDb() {
	if (pool) return pool;

	try {
		pool = new Pool({
			connectionString: connectionUri,
			ssl: { rejectUnauthorized: false },
			idleTimeoutMillis: 60000,
			max: 10,
		});

		await pool.query('SELECT 1');
		console.log('✅ Conexión a PostgreSQL inicializada y validada');

		return pool;
	} catch (err) {
		console.error('❌ Error al inicializar conexión a PostgreSQL:', err.message);
		throw err;
	}
}

export async function getConnection() {
	if (!pool) await initDb();
	return pool;
}

export async function closeDb() {
	try {
		if (pool) {
			await pool.end();
			console.log('🛑 Pool de conexiones a PostgreSQL cerrado');
		}
	} catch (err) {
		console.error('⚠️ Error al cerrar la conexión:', err.message);
	}
}
