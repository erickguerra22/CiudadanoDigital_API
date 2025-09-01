import config from 'config';
import app from '../app.js';

const port = config.get('port');
app.listen(port, () => {
    console.log(`Servidor corriendo en puerto ${port}.`);
});
