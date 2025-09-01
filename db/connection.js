import pkg from 'pg';
import config from 'config';

const { Pool } = pkg;

const uri = config.get('dbConnectionUri');

const pool = new Pool({
    connectionString: uri,
    ssl: { rejectUnauthorized: false }
});

pool.on('error', (err) => {
    console.error('Error inesperado en el pool de conexión:', err);
});

const connect = async () => {
    try {
        const client = await pool.connect();
        console.info('Conexión a la base de datos exitosa.');
        client.release();
    } catch (err) {
        console.error('Error al conectar a la base de datos:', err);
        process.exit(1);
    }
};

export default connect;
export { pool };
