import { useState, useRef } from "react";

const COMPETENCIES = [
  {
    id: "history",
    label: "History",
    subtitle: "U.S. & Texas",
    icon: "🏛️",
    color: "#C0392B",
    description: "Colonial America through modern U.S. history, Texas history from Indigenous peoples through statehood, and historical thinking skills.",
    topics: ["Colonial & Revolutionary Era", "Civil War & Reconstruction", "20th Century U.S.", "Texas History & Statehood", "Historical Thinking Skills"],
  },
  {
    id: "geography",
    label: "Geography & Culture",
    subtitle: "People, Place & Environment",
    icon: "🌎",
    color: "#1A5276",
    description: "Five themes of geography, physical and human geography, cultural regions, map skills, and human-environment interaction.",
    topics: ["Five Themes of Geography", "Physical Geography", "Human Geography & Migration", "Map & Globe Skills", "Cultural Regions"],
  },
  {
    id: "government",
    label: "Government & Citizenship",
    subtitle: "Civics & Democratic Principles",
    icon: "⚖️",
    color: "#1E8449",
    description: "Structure of U.S. and Texas government, constitutional principles, rights and responsibilities of citizens, and democratic participation.",
    topics: ["U.S. Constitution & Bill of Rights", "Branches of Government", "Texas Government", "Citizenship & Rights", "Democratic Participation"],
  },
  {
    id: "economics",
    label: "Economics & STS",
    subtitle: "Economics & Science/Technology/Society",
    icon: "📊",
    color: "#7D6608",
    description: "Basic economic concepts, free enterprise, the role of science and technology in society, and personal financial literacy.",
    topics: ["Supply & Demand", "Free Enterprise System", "Personal Financial Literacy", "Science & Technology in Society", "Global Interdependence"],
  },
];

// ─────────────────────────────────────────────────────────────
// REPLACE this URL with your own Google Form prefill link.
// See the setup guide (Google-Form-Setup-Guide.docx) for instructions.
// ─────────────────────────────────────────────────────────────
const GOOGLE_FORM_BASE_URL = "https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform";

// Field entry IDs from your Google Form — replace after creating the form.
const FORM_FIELDS = {
  competency: "entry.111111111",   // "Competency" field
  topic:      "entry.222222222",   // "Topic" field
  section:    "entry.333333333",   // "Section" (Review / Quiz / Resources)
  detail:     "entry.444444444",   // "What seems incorrect?"
};

function buildReportUrl(competency, topic, section) {
  const params = new URLSearchParams({
    [FORM_FIELDS.competency]: competency,
    [FORM_FIELDS.topic]: topic,
    [FORM_FIELDS.section]: section,
    usp: "pp_url",
  });
  return `${GOOGLE_FORM_BASE_URL}?${params.toString()}`;
}

function ReportButton({ competency, topic, section, style = {} }) {
  const url = buildReportUrl(competency, topic, section);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title="Report a content error"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 12,
        color: "#8A9BAB",
        textDecoration: "none",
        border: "1px solid #2A3A4A",
        borderRadius: 4,
        padding: "4px 10px",
        background: "transparent",
        cursor: "pointer",
        transition: "all 0.15s",
        ...style,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = "#F0E8DC"; e.currentTarget.style.borderColor = "#8A9BAB"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "#8A9BAB"; e.currentTarget.style.borderColor = "#2A3A4A"; }}
    >
      ⚑ Report error
    </a>
  );
}

// Calls YOUR secure backend — API key never touches the browser
async function callAPI(prompt, type) {
  const res = await fetch("/api/study", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, type }),
  });
  if (!res.ok) throw new Error("API error");
  const data = await res.json();
  return data.text;
}

export default function App() {
  const [stage, setStage] = useState("home");
  const [selectedComp, setSelectedComp] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [reviewContent, setReviewContent] = useState("");
  const [quizData, setQuizData] = useState([]);
  const [resources, setResources] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState("review");
  const [keyTakeaways, setKeyTakeaways] = useState([]);
  const [error, setError] = useState(null);

  const comp = COMPETENCIES.find((c) => c.id === selectedComp);

  async function loadStudyContent(compId, topic) {
    setLoading(true);
    setError(null);
    setReviewContent("");
    setQuizData([]);
    setResources("");
    setKeyTakeaways([]);
    setAnswers({});
    setSubmitted(false);
    setActiveTab("review");

    const compLabel = COMPETENCIES.find((c) => c.id === compId)?.label;

    try {
      setLoadingMsg("Generating content review…");
      const review = await callAPI(
        `Generate a REVIEW for TExES 391 Social Studies topic: "${topic}" under competency "${compLabel}". Write for teacher candidates preparing for the EC-6 exam.`,
        "review"
      );
      const takeaways = [];
      const cleaned = review.replace(/KEY_TAKEAWAY:\s*(.+)/g, (_, t) => {
        takeaways.push(t.trim());
        return "";
      }).trim();
      setReviewContent(cleaned);
      setKeyTakeaways(takeaways);

      setLoadingMsg("Building quiz questions…");
      const quizRaw = await callAPI(
        `Generate QUIZ questions for TExES 391 Social Studies topic: "${topic}" under competency "${compLabel}". Return only the JSON array.`,
        "quiz"
      );
      try {
        const clean = quizRaw.replace(/```json|```/g, "").trim();
        setQuizData(JSON.parse(clean));
      } catch { setQuizData([]); }

      setLoadingMsg("Finding study resources…");
      const res = await callAPI(
        `Generate RESOURCES for TExES 391 Social Studies topic: "${topic}" under competency "${compLabel}".`,
        "resources"
      );
      setResources(res);
    } catch (e) {
      setError("Something went wrong loading content. Please try again.");
    }

    setLoading(false);
    setStage("study");
  }

  function handleSelectTopic(compId, topic) {
    setSelectedComp(compId);
    setSelectedTopic(topic);
    loadStudyContent(compId, topic);
  }

  function handleAnswer(qIdx, optIdx) {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  }

  function handleSubmitQuiz() {
    if (Object.keys(answers).length < quizData.length) return;
    setSubmitted(true);
    setActiveTab("results");
  }

  const score = submitted ? quizData.filter((q, i) => answers[i] === q.correct).length : 0;

  function parseResources(raw) {
    return raw.split("\n").filter((l) => l.startsWith("RESOURCE:")).map((l) => {
      const parts = l.replace("RESOURCE:", "").split("|").map((s) => s.trim());
      return { title: parts[0], url: parts[1], desc: parts[2] };
    });
  }

  const resourceList = resources ? parseResources(resources) : [];

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0F1923; }

        .header {
          border-bottom: 2px solid #2A3A4A;
          padding: 16px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #0A1219;
          flex-wrap: wrap;
          gap: 10px;
        }

        .main-home {
          max-width: 900px;
          margin: 0 auto;
          padding: 48px 24px;
        }

        .comp-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .study-main {
          max-width: 820px;
          margin: 0 auto;
          padding: 32px 24px;
        }

        .tab-bar {
          background: #141F2B;
          border-left: 1px solid #2A3A4A;
          border-right: 1px solid #2A3A4A;
          display: flex;
          border-bottom: 2px solid #2A3A4A;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .tab-content {
          background: #141F2B;
          border: 1px solid #2A3A4A;
          border-top: none;
          border-radius: 0 0 10px 10px;
          padding: 28px;
          min-height: 400px;
        }

        .spinner {
          width: 60px; height: 60px;
          border: 3px solid #2A3A4A;
          border-radius: 50%;
          margin: 0 auto 24px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .btn-back {
          background: transparent;
          border: 1px solid #2A3A4A;
          color: #8A9BAB;
          padding: 6px 14px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          font-family: inherit;
          white-space: nowrap;
        }

        .topic-btn {
          background: #0F1923;
          border: 1px solid #2A3A4A;
          color: #C8BEB4;
          padding: 8px 12px;
          text-align: left;
          cursor: pointer;
          border-radius: 0 4px 4px 0;
          font-size: 13px;
          font-family: inherit;
          transition: all 0.15s;
          width: 100%;
        }
        .topic-btn:hover { background: #1A2A3A; color: #F0E8DC; }

        @media (max-width: 640px) {
          .header { padding: 12px 16px; }
          .main-home { padding: 24px 16px; }
          .comp-grid { grid-template-columns: 1fr; gap: 16px; }
          .study-main { padding: 16px 12px; }
          .tab-content { padding: 18px 14px; }
          h1 { font-size: 26px !important; }
          .results-score { font-size: 48px !important; }
          .results-btns { flex-direction: column !important; }
          .results-btns button { width: 100%; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#0F1923", fontFamily: "'Georgia','Times New Roman',serif", color: "#E8E0D5" }}>

        {/* Header */}
        <header className="header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#C0392B,#E74C3C)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🎓</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#F0E8DC" }}>TExES 391 Social Studies</div>
              <div style={{ fontSize: 11, color: "#8A9BAB", letterSpacing: "0.08em", textTransform: "uppercase" }}>Core Subjects EC-6 · Study Guide</div>
            </div>
          </div>
          {stage !== "home" && (
            <button className="btn-back" onClick={() => setStage("home")}>← All Topics</button>
          )}
        </header>

        {/* Home */}
        {stage === "home" && (
          <main className="main-home">
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h1 style={{ fontSize: 38, fontWeight: 700, color: "#F0E8DC", lineHeight: 1.2, marginBottom: 12 }}>
                Social Studies Exam Prep
              </h1>
              <p style={{ color: "#8A9BAB", fontSize: 16, maxWidth: 520, margin: "0 auto" }}>
                Choose a competency, then select a topic to begin your guided review, practice quiz, and curated resources.
              </p>
            </div>
            <div className="comp-grid">
              {COMPETENCIES.map((c) => (
                <div key={c.id} style={{ background: "#141F2B", border: "1px solid #2A3A4A", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ background: c.color, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 24 }}>{c.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>{c.label}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>{c.subtitle}</div>
                    </div>
                  </div>
                  <div style={{ padding: "16px 20px" }}>
                    <p style={{ fontSize: 13, color: "#8A9BAB", marginBottom: 14, lineHeight: 1.5 }}>{c.description}</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {c.topics.map((topic) => (
                        <button key={topic} className="topic-btn"
                          style={{ borderLeft: `3px solid ${c.color}` }}
                          onClick={() => handleSelectTopic(c.id, topic)}>
                          {topic} →
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </main>
        )}

        {/* Loading */}
        {loading && (
          <main style={{ maxWidth: 600, margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
            <div className="spinner" style={{ borderTopColor: comp?.color || "#C0392B" }} />
            <div style={{ fontSize: 18, color: "#F0E8DC", marginBottom: 8 }}>Preparing your study session</div>
            <div style={{ fontSize: 14, color: "#8A9BAB" }}>{loadingMsg}</div>
            <div style={{ marginTop: 16, fontSize: 13, color: "#4A5A6A" }}>Topic: {selectedTopic}</div>
          </main>
        )}

        {/* Error */}
        {error && !loading && (
          <main style={{ maxWidth: 500, margin: "60px auto", padding: "0 24px", textAlign: "center" }}>
            <div style={{ background: "#2B0D0D", border: "1px solid #C0392B", borderRadius: 8, padding: 24, color: "#F1948A", fontSize: 15 }}>
              {error}
              <div style={{ marginTop: 16 }}>
                <button onClick={() => { setError(null); setStage("home"); }} style={{ background: "#C0392B", border: "none", color: "#fff", padding: "8px 18px", borderRadius: 4, cursor: "pointer", fontFamily: "inherit" }}>
                  Back to Topics
                </button>
              </div>
            </div>
          </main>
        )}

        {/* Study */}
        {stage === "study" && !loading && !error && comp && (
          <main className="study-main">
            <div style={{ background: comp.color, borderRadius: "10px 10px 0 0", padding: "20px 28px", display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 28 }}>{comp.icon}</span>
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>
                  {comp.label} · {comp.subtitle}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{selectedTopic}</div>
              </div>
            </div>

            <div className="tab-bar">
              {["review", "quiz", submitted ? "results" : null, "resources"].filter(Boolean).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  background: activeTab === tab ? "#0F1923" : "transparent",
                  border: "none",
                  borderBottom: activeTab === tab ? `2px solid ${comp.color}` : "2px solid transparent",
                  color: activeTab === tab ? "#F0E8DC" : "#8A9BAB",
                  padding: "12px 18px",
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "inherit",
                  textTransform: "capitalize",
                  letterSpacing: "0.04em",
                  fontWeight: activeTab === tab ? 700 : 400,
                  marginBottom: -2,
                  whiteSpace: "nowrap",
                }}>
                  {tab === "results" ? `Results (${score}/${quizData.length})` : tab}
                </button>
              ))}
            </div>

            <div className="tab-content">

              {/* Review */}
              {activeTab === "review" && (
                <div>
                  <div style={{ lineHeight: 1.8, fontSize: 15, color: "#C8BEB4", whiteSpace: "pre-wrap" }}>{reviewContent}</div>
                  {keyTakeaways.length > 0 && (
                    <div style={{ marginTop: 28, background: "#0F1923", border: `1px solid ${comp.color}`, borderRadius: 8, padding: "18px 22px" }}>
                      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: comp.color, fontWeight: 700, marginBottom: 12 }}>Key Takeaways</div>
                      {keyTakeaways.map((t, i) => (
                        <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 14, color: "#C8BEB4" }}>
                          <span style={{ color: comp.color, flexShrink: 0 }}>▸</span><span>{t}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <ReportButton competency={comp.label} topic={selectedTopic} section="Content Review" />
                    <button onClick={() => setActiveTab("quiz")} style={{ background: comp.color, border: "none", color: "#fff", padding: "10px 22px", borderRadius: 5, cursor: "pointer", fontSize: 14, fontFamily: "inherit", fontWeight: 600 }}>
                      Take the Quiz →
                    </button>
                  </div>
                </div>
              )}

              {/* Quiz */}
              {activeTab === "quiz" && (
                <div>
                  {quizData.length === 0
                    ? <div style={{ color: "#8A9BAB", textAlign: "center", padding: 40 }}>Quiz unavailable. Try reloading the topic.</div>
                    : <>
                      {quizData.map((q, qi) => {
                        return (
                          <div key={qi} style={{ marginBottom: 32 }}>
                            <div style={{ fontSize: 15, fontWeight: 600, color: "#F0E8DC", marginBottom: 14, lineHeight: 1.5 }}>
                              <span style={{ color: comp.color }}>{qi + 1}. </span>{q.question}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {q.options.map((opt, oi) => {
                                const isSelected = answers[qi] === oi;
                                const isCorrect = oi === q.correct;
                                let bg = "#0F1923", border = "1px solid #2A3A4A", color = "#C8BEB4";
                                if (submitted) {
                                  if (isCorrect) { bg = "#0D2B1A"; border = "1px solid #1E8449"; color = "#A9DFBF"; }
                                  else if (isSelected) { bg = "#2B0D0D"; border = "1px solid #C0392B"; color = "#F1948A"; }
                                } else if (isSelected) {
                                  bg = "#1A2A3A"; border = `1px solid ${comp.color}`; color = "#F0E8DC";
                                }
                                return (
                                  <button key={oi} onClick={() => handleAnswer(qi, oi)} style={{ background: bg, border, color, padding: "10px 14px", textAlign: "left", borderRadius: 5, cursor: submitted ? "default" : "pointer", fontSize: 14, fontFamily: "inherit", transition: "all 0.15s", lineHeight: 1.4, width: "100%" }}>
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                            {submitted && (
                              <div style={{ marginTop: 12, background: "#0A1219", border: "1px solid #2A3A4A", borderRadius: 5, padding: "12px 16px", fontSize: 13, color: "#8A9BAB", lineHeight: 1.6 }}>
                                <span style={{ color: "#F0E8DC", fontWeight: 600 }}>Explanation: </span>{q.explanation}
                              </div>
                            )}
                            <div style={{ marginTop: 8, textAlign: "right" }}>
                              <ReportButton
                                competency={comp.label}
                                topic={selectedTopic}
                                section={`Quiz – Question ${qi + 1}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {!submitted && (
                        <button onClick={handleSubmitQuiz} disabled={Object.keys(answers).length < quizData.length}
                          style={{ background: Object.keys(answers).length < quizData.length ? "#2A3A4A" : comp.color, border: "none", color: "#fff", padding: "12px 28px", borderRadius: 5, cursor: Object.keys(answers).length < quizData.length ? "not-allowed" : "pointer", fontSize: 15, fontFamily: "inherit", fontWeight: 600 }}>
                          Submit Answers ({Object.keys(answers).length}/{quizData.length} answered)
                        </button>
                      )}
                    </>
                  }
                </div>
              )}

              {/* Results */}
              {activeTab === "results" && submitted && (
                <div style={{ textAlign: "center" }}>
                  <div className="results-score" style={{ fontSize: 64, fontWeight: 700, color: score === quizData.length ? "#1E8449" : score >= quizData.length * 0.75 ? comp.color : "#C0392B", lineHeight: 1, marginBottom: 8 }}>
                    {score}/{quizData.length}
                  </div>
                  <div style={{ fontSize: 18, color: "#C8BEB4", marginBottom: 6 }}>
                    {score === quizData.length ? "Perfect score! 🎉" : score >= quizData.length * 0.75 ? "Strong performance!" : score >= quizData.length * 0.5 ? "Good effort — review the explanations." : "Keep studying — you've got this."}
                  </div>
                  <div style={{ fontSize: 13, color: "#8A9BAB", marginBottom: 28 }}>
                    {Math.round((score / quizData.length) * 100)}% correct on {selectedTopic}
                  </div>
                  <div className="results-btns" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                    <button onClick={() => setActiveTab("quiz")} style={{ background: "#0F1923", border: "1px solid #2A3A4A", color: "#C8BEB4", padding: "10px 20px", borderRadius: 5, cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>Review Answers</button>
                    <button onClick={() => setActiveTab("resources")} style={{ background: comp.color, border: "none", color: "#fff", padding: "10px 20px", borderRadius: 5, cursor: "pointer", fontSize: 14, fontFamily: "inherit", fontWeight: 600 }}>Study Resources →</button>
                    <button onClick={() => setStage("home")} style={{ background: "#0F1923", border: "1px solid #2A3A4A", color: "#C8BEB4", padding: "10px 20px", borderRadius: 5, cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>Try Another Topic</button>
                  </div>
                </div>
              )}

              {/* Resources */}
              {activeTab === "resources" && (
                <div>
                  <div style={{ fontSize: 13, color: "#8A9BAB", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <span>Curated resources for <strong style={{ color: "#C8BEB4" }}>{selectedTopic}</strong></span>
                    <ReportButton competency={comp.label} topic={selectedTopic} section="Resources" />
                  </div>
                  {resourceList.length > 0 ? resourceList.map((r, i) => (
                    <div key={i} style={{ background: "#0F1923", border: "1px solid #2A3A4A", borderLeft: `3px solid ${comp.color}`, borderRadius: "0 6px 6px 0", padding: "14px 18px", marginBottom: 12 }}>
                      <div style={{ fontWeight: 600, color: "#F0E8DC", fontSize: 14, marginBottom: 4 }}>{r.title}</div>
                      {r.url && <div style={{ fontSize: 12, color: comp.color, marginBottom: 6, wordBreak: "break-all" }}>{r.url}</div>}
                      <div style={{ fontSize: 13, color: "#8A9BAB", lineHeight: 1.5 }}>{r.desc}</div>
                    </div>
                  )) : (
                    <div style={{ color: "#8A9BAB", whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.7 }}>{resources}</div>
                  )}
                </div>
              )}

            </div>
          </main>
        )}
      </div>
    </>
  );
}
