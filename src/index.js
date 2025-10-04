import express from "express";
import authRoutes from "./interfaces/http/routes/auth.route.js";
import { initDb } from "./infrastructure/db/database.js";
import { generalConstants } from "./shared/constants/general.js"
import config from 'config';

const port = config.get('port');

const app = express();
app.use(express.json());

await initDb();

// Dependencias
// const dependencies = { transitoRepository: new TransitoRepository(pool) };

// Rutas
app.get(`${generalConstants.apiPath}/`, (req, res) => {
    res.send("API de CIUDADANO DIGITAL");
});
app.use(`${generalConstants.apiPath}/session/`, authRoutes);
// app.use("/transito", transitoRoutes(dependencies));

app.listen(port, () => console.log(`🚀 API corriendo en puerto ${port}`));
