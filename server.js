import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(bodyParser.json());
app.use(express.urlencoded());
app.use(cors());
app.set("view engine", "ejs");

// Set the views directory
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));

import userRoutes from "./routes/user.js";
import driverRoutes from './routes/driver.js';
import adminRoutes from './routes/admin.js';

app.use("/api/user", userRoutes);
app.use("/api/driver", driverRoutes);
app.use("/api/admin", adminRoutes);

app.get("/success", (req, res) => {
    res.render("success");
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));