// Vercel serverless function: POST /api/chat  → { reply }
// Set GEMINI_API_KEY in your Vercel project's environment variables.
// Without a key the endpoint returns 503 and the site falls back to its built-in answers.

const RESUME = `
Name: Manvi Mittal — Full Stack Software Engineer, Saharanpur, Uttar Pradesh, India.
Contact: manviamittal7@gmail.com | +91 9317942591 | linkedin.com/in/mittalmanvi | github.com/mittalmanvi27-cpu
Summary: 1+ year building production web apps and REST APIs with React (Next.js), TypeScript, JavaScript, Node.js, Java and SQL.
Skills: JavaScript, TypeScript, Java, Python, SQL, HTML5, CSS3; React, React Spectrum, Next.js, Tailwind CSS;
Node.js, Express.js, REST API design, authentication, Gemini API; MySQL (schema design, query optimization, indexing);
Microsoft Azure, Docker, Vercel, CI/CD, Google Cloud fundamentals, Git; Agile, Scrum, code review, unit testing;
DSA, OOP, System Design, Distributed Systems.
Experience:
- Software Engineer, Ezentech India Pvt. Ltd., Saharanpur (Sep 2025 – Present): shipped a calibration monitoring web app with
  automated alerts (60% fewer missed calibration schedules); replaced spreadsheets with REST API services (40% better record
  accuracy, 55% lower processing time); built a digital inspection system replacing paper quality checks; real-time dashboards
  with automated notifications; code reviews, debugging, production issues, tests and docs.
- Software Engineer, Cloud Infotech (Jun 2025 – Aug 2025): features across distributed storage, indexing and querying,
  improving query response time; scoped technical designs; two-week Agile sprints.
Projects:
- NewsLens (Python, scikit-learn, FastAPI) — explainable news-topic classifier over 6 topics. TF-IDF with 3 models compared by
  5-fold CV; Complement Naive Bayes won (CV macro-F1 0.877), tuned with GridSearchCV. Test accuracy 86.4%, macro-F1 0.863 on
  2,282 held-out docs. Returns ranked probabilities and the keywords behind each prediction. FastAPI /api/v1 routes,
  batch inference, SQLite history & stats, pytest, Docker, GitHub Actions CI.
- Ramaya Grand (Next.js, React, TypeScript, Vercel) — luxury venue & events website, live at ramaya-ten.vercel.app.
  Inquiry form, hero video, galleries, CI/CD on Vercel.
- AI Legal Assistant (Next.js 15, React 19, TypeScript, Gemini 2.0 Flash, MongoDB) — multi-turn chats with saved history,
  prompt library, 20 prompts/day limit, PDF/Word export, Razorpay plans, WorkOS auth. Source: github.com/mittalmanvi27-cpu/ai-project
Education: B.E. Computer Science & Engineering, Chitkara University (2021–2025). Ram Krishna Mehta Inter College (2018–2021).
Certifications: JavaScript, Software Engineering, DBMS, Intro to Cybersecurity, Intro to Blockchain; Web Developer Intern at
Bharat Intern; Student Trainee, Google Cloud.
Availability: open to full-stack / frontend / backend engineering roles.
`;

const SYSTEM = `You are "Manvi's AI twin", a friendly assistant on Manvi Mittal's portfolio website.
Answer questions from recruiters and visitors about Manvi using ONLY the résumé below. Refer to her as "Manvi" or "she".
Keep answers short (2–4 sentences), warm and professional. You may use **bold** for key facts.
If something isn't in the résumé, say you don't know and suggest emailing manviamittal7@gmail.com.
Politely decline unrelated requests.

RÉSUMÉ:
${RESUME}`;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ error: "AI backend not configured" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const message = String(body.message || "").slice(0, 500);
  if (!message) return res.status(400).json({ error: "Empty message" });

  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
  const contents = [
    ...history.map((h) => ({ role: h.role === "model" ? "model" : "user", parts: [{ text: String(h.text).slice(0, 800) }] })),
    { role: "user", parts: [{ text: message }] },
  ];

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents,
        generationConfig: { temperature: 0.5, maxOutputTokens: 300 },
      }),
    });
    if (!r.ok) return res.status(502).json({ error: "Upstream error" });
    const data = await r.json();
    const reply = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
    if (!reply) return res.status(502).json({ error: "Empty reply" });
    return res.status(200).json({ reply });
  } catch {
    return res.status(500).json({ error: "Request failed" });
  }
};
