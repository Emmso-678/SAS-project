import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("assignments.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('student', 'lecturer'))
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    deadline TEXT NOT NULL,
    totalMarks INTEGER NOT NULL,
    lecturerId INTEGER,
    FOREIGN KEY(lecturerId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignmentId INTEGER NOT NULL,
    studentId INTEGER NOT NULL,
    content TEXT NOT NULL,
    marks INTEGER,
    feedback TEXT,
    submittedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(assignmentId) REFERENCES assignments(id),
    FOREIGN KEY(studentId) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/register", (req, res) => {
    const { name, email, password, role } = req.body;
    try {
      const info = db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)").run(name, email, password, role);
      res.json({ id: info.lastInsertRowid, name, email, role });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?").get(email, password) as any;
    if (user) {
      res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.get("/api/assignments", (req, res) => {
    const assignments = db.prepare("SELECT a.*, u.name as lecturerName FROM assignments a LEFT JOIN users u ON a.lecturerId = u.id").all();
    res.json(assignments);
  });

  app.post("/api/assignments", (req, res) => {
    const { title, description, deadline, totalMarks, lecturerId } = req.body;
    try {
      const info = db.prepare("INSERT INTO assignments (title, description, deadline, totalMarks, lecturerId) VALUES (?, ?, ?, ?, ?)").run(title, description, deadline, totalMarks, lecturerId);
      res.json({ id: info.lastInsertRowid });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/assignments/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM submissions WHERE assignmentId = ?").run(req.params.id);
      db.prepare("DELETE FROM assignments WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/submissions", (req, res) => {
    const { assignmentId, studentId, content } = req.body;
    try {
      const existing = db.prepare("SELECT id FROM submissions WHERE assignmentId = ? AND studentId = ?").get(assignmentId, studentId);
      if (existing) {
        return res.status(400).json({ error: "Already submitted" });
      }
      const info = db.prepare("INSERT INTO submissions (assignmentId, studentId, content) VALUES (?, ?, ?)").run(assignmentId, studentId, content);
      res.json({ id: info.lastInsertRowid });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/submissions/student/:studentId", (req, res) => {
    const submissions = db.prepare(`
      SELECT s.*, a.title as assignmentTitle, a.totalMarks
      FROM submissions s 
      JOIN assignments a ON s.assignmentId = a.id 
      WHERE s.studentId = ?
    `).all(req.params.studentId);
    res.json(submissions);
  });

  app.get("/api/submissions/assignment/:assignmentId", (req, res) => {
    const submissions = db.prepare(`
      SELECT s.*, u.name as studentName 
      FROM submissions s 
      JOIN users u ON s.studentId = u.id 
      WHERE s.assignmentId = ?
    `).all(req.params.assignmentId);
    res.json(submissions);
  });

  app.get("/api/submissions/check/:assignmentId/:studentId", (req, res) => {
    const submission = db.prepare("SELECT * FROM submissions WHERE assignmentId = ? AND studentId = ?").get(req.params.assignmentId, req.params.studentId);
    res.json(submission || null);
  });

  app.put("/api/submissions/:id/grade", (req, res) => {
    const { marks, feedback } = req.body;
    try {
      db.prepare("UPDATE submissions SET marks = ?, feedback = ? WHERE id = ?").run(marks, feedback, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
