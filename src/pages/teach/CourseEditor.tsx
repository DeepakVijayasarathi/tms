import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CalendarPlus, Check, ChevronDown, ChevronRight, Flag, Plus, Sparkles, Target, Trash2, UserPlus, Video } from "lucide-react";
import type { MilestoneKind } from "@/components/Syllabus";
import { api, del, patch, post } from "@/lib/api";
import { dateTime, money } from "@/lib/format";
import { Badge, Button, Card, IconTile, CardHeader, Empty, ErrorNote, Field, Input, Select, Spinner, StatusBadge, Table, Tabs, Td, Textarea, cx } from "@/components/ui";
import { canEnter, useNow, type SessionStatus } from "@/lib/classes";

type QKind = "SingleChoice" | "MultipleChoice" | "TrueFalse";
interface Lesson { id: string; title: string; order: number; kind: string; content: string; mediaUrl?: string; durationMinutes: number; isPreview: boolean }
interface Question { id: string; kind: QKind; prompt: string; explanation?: string; points: number; status: "Draft" | "Approved"; aiGenerated: boolean; options: { id: string; text: string; isCorrect: boolean }[] }
interface Draft {
  id: string; slug: string; title: string; summary: string; description: string; category: string; level: string;
  priceMinor: number; currency: string; status: string; visibility: string; tenantId: string;
  draft: { id: string; number: number; minSessionsAttended: number; certificateValidityMonths?: number; learningOutcomes?: string; prerequisites?: string; vivaEnabled?: boolean; vivaPassMarkPercent?: number; vivaQuestionCount?: number };
  publishedVersion?: number;
  modules: { id: string; title: string; order: number; week?: number | null; objectives?: string | null; lessons: Lesson[] }[];
  milestones: { id: string; title: string; description?: string | null; order: number; kind: MilestoneKind; moduleId?: string | null; assessmentId?: string | null; requiredCount: number; dueDays?: number | null }[];
  assessments: { id: string; title: string; passMarkPercent: number; timeLimitMinutes?: number; maxAttempts: number; shuffleQuestions: boolean; questions: Question[] }[];
}

export function CourseEditor() {
  const { courseId } = useParams();
  const qc = useQueryClient();
  const draft = useQuery({ queryKey: ["draft", courseId], queryFn: () => api<Draft>(`/courses/${courseId}/draft`) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["draft", courseId] });
  const [params] = useSearchParams();
  const [tab, setTab] = useState<"details" | "curriculum" | "syllabus" | "milestones" | "assessment" | "sessions" | "interest">(params.get("tab") === "interest" ? "interest" : "curriculum");

  const publish = useMutation({ mutationFn: () => post(`/courses/${courseId}/publish`), onSuccess: refresh });

  if (draft.isLoading) return <Spinner />;
  if (!draft.data) return <ErrorNote error={draft.error} />;
  const d = draft.data;
  const pendingAi = d.assessments.flatMap((a) => a.questions).filter((q) => q.status === "Draft").length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/teach" className="text-sm text-ink-mute hover:underline">← Teach</Link>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">{d.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-mute">
            <StatusBadge status={d.status} />
            <span>Editing draft v{d.draft.number}{d.publishedVersion && ` · live version v${d.publishedVersion}`}</span>
            {d.status === "Published" && <Link to={`/courses/${d.slug}`} className="text-brand-700 hover:underline">View live page</Link>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button loading={publish.isPending} onClick={() => publish.mutate()} disabled={pendingAi > 0}>
            Publish v{d.draft.number}
          </Button>
          {pendingAi > 0 && <span className="text-xs text-amber-700">Review {pendingAi} AI draft question(s) first</span>}
          <ErrorNote error={publish.error} />
        </div>
      </div>
      <p className="mb-4 rounded-lg bg-slate-100 px-4 py-2.5 text-sm text-ink-soft">
        Learners already enrolled keep the version they enrolled in. Your changes reach new learners when you publish.
      </p>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "curriculum", label: "Curriculum" },
          { value: "syllabus", label: "Syllabus" },
          { value: "milestones", label: `Milestones${d.milestones.length ? ` (${d.milestones.length})` : ""}` },
          { value: "assessment", label: "Assessment" },
          { value: "details", label: "Details" },
          { value: "sessions", label: <span className="flex items-center gap-1.5"><Video className="h-4 w-4" aria-hidden />Live classes</span> },
          { value: "interest", label: <span className="flex items-center gap-1.5"><UserPlus className="h-4 w-4" aria-hidden />Interested</span> },
        ]}
      />
      {tab === "details" && <Details d={d} onSaved={refresh} />}
      {tab === "curriculum" && <Curriculum d={d} onChange={refresh} />}
      {tab === "syllabus" && <SyllabusEditor d={d} onChange={refresh} />}
      {tab === "milestones" && <MilestonesEditor d={d} onChange={refresh} />}
      {tab === "assessment" && <Assessments d={d} onChange={refresh} />}
      {tab === "sessions" && <Sessions courseId={d.id} />}
      {tab === "interest" && <Interested courseId={d.id} slug={d.slug} published={d.status === "Published"} />}
    </div>
  );
}

function Details({ d, onSaved }: { d: Draft; onSaved: () => void }) {
  const [f, setF] = useState({
    title: d.title, summary: d.summary, description: d.description, category: d.category, level: d.level,
    price: String(d.priceMinor / 100), visibility: d.visibility,
    minSessionsAttended: String(d.draft.minSessionsAttended), validity: d.draft.certificateValidityMonths ? String(d.draft.certificateValidityMonths) : "",
    vivaEnabled: d.draft.vivaEnabled ? "yes" : "no", vivaPassMark: String(d.draft.vivaPassMarkPercent ?? 70), vivaQuestions: String(d.draft.vivaQuestionCount ?? 4),
  });
  const save = useMutation({
    mutationFn: () => patch(`/courses/${d.id}`, {
      title: f.title, summary: f.summary, description: f.description, category: f.category, level: f.level,
      priceMinor: Math.round(parseFloat(f.price || "0") * 100), visibility: f.visibility,
      minSessionsAttended: parseInt(f.minSessionsAttended || "0"),
      certificateValidityMonths: f.validity ? parseInt(f.validity) : undefined,
      clearCertificateValidity: !f.validity,
      vivaEnabled: f.vivaEnabled === "yes", vivaPassMarkPercent: parseInt(f.vivaPassMark || "70"), vivaQuestionCount: parseInt(f.vivaQuestions || "4"),
    }),
    onSuccess: onSaved,
  });
  const bind = (k: keyof typeof f) => ({ value: f[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value }) });

  return (
    <Card className="p-5">
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Title"><Input {...bind("title")} /></Field></div>
        <div className="sm:col-span-2"><Field label="Summary"><Input {...bind("summary")} /></Field></div>
        <div className="sm:col-span-2"><Field label="Description"><Textarea rows={5} {...bind("description")} /></Field></div>
        <Field label="Category"><Input {...bind("category")} /></Field>
        <Field label="Level"><Select {...bind("level")}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></Select></Field>
        <Field label="Price (₹, GST inclusive)" hint={`Currently ${d.priceMinor ? money(d.priceMinor) : "free"}`}><Input type="number" min="0" {...bind("price")} /></Field>
        <Field label="Visibility"><Select {...bind("visibility")}><option value="Public">Public marketplace</option><option value="TenantOnly">Members of my organization only</option></Select></Field>
        <Field label="Live sessions required for certificate"><Input type="number" min="0" {...bind("minSessionsAttended")} /></Field>
        <Field label="Certificate validity (months)" hint="Leave blank for no expiry"><Input type="number" min="1" {...bind("validity")} /></Field>
        <div className="grid gap-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 sm:col-span-2 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <div className="font-semibold text-ink">AI interview (viva)</div>
            <div className="text-sm text-ink-mute">A conversational test run by Gemini from your lessons. When on, learners must pass it to get the certificate.</div>
          </div>
          <Field label="AI interview"><Select {...bind("vivaEnabled")}><option value="no">Off</option><option value="yes">Required for certificate</option></Select></Field>
          <Field label="Pass mark (%)"><Input type="number" min="1" max="100" {...bind("vivaPassMark")} disabled={f.vivaEnabled !== "yes"} /></Field>
          <Field label="Main questions" hint="2–8, plus follow-ups"><Input type="number" min="2" max="8" {...bind("vivaQuestions")} disabled={f.vivaEnabled !== "yes"} /></Field>
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button type="submit" loading={save.isPending}>Save details</Button>
          {save.isSuccess && <span className="text-sm text-emerald-700">Saved</span>}
          <ErrorNote error={save.error} />
        </div>
      </form>
    </Card>
  );
}

function Curriculum({ d, onChange }: { d: Draft; onChange: () => void }) {
  const [moduleTitle, setModuleTitle] = useState("");
  const addModule = useMutation({ mutationFn: () => post(`/courses/${d.id}/modules`, { title: moduleTitle }), onSuccess: () => { setModuleTitle(""); onChange(); } });
  const delModule = useMutation({ mutationFn: (id: string) => del(`/modules/${id}`), onSuccess: onChange });

  return (
    <div className="space-y-4">
      {d.modules.length === 0 && <Card><Empty title="No modules yet">Modules group related lessons. Add one below.</Empty></Card>}
      {d.modules.map((m, i) => (
        <Card key={m.id}>
          <CardHeader title={`${i + 1}. ${m.title}`} subtitle={`${m.lessons.length} lessons`} action={
            <Button size="sm" variant="ghost" onClick={() => confirm(`Delete module "${m.title}" and its lessons?`) && delModule.mutate(m.id)} aria-label="Delete module"><Trash2 className="h-4 w-4" /></Button>
          } />
          <div className="divide-y divide-slate-100">
            {m.lessons.map((l) => <LessonRow key={l.id} lesson={l} onChange={onChange} />)}
          </div>
          <NewLesson moduleId={m.id} onAdded={onChange} />
        </Card>
      ))}
      <form onSubmit={(e) => { e.preventDefault(); addModule.mutate(); }} className="flex gap-2">
        <Input placeholder="New module title" value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} required className="max-w-sm" />
        <Button type="submit" variant="secondary" loading={addModule.isPending}><Plus className="h-4 w-4" aria-hidden /> Add module</Button>
      </form>
    </div>
  );
}

function LessonRow({ lesson, onChange }: { lesson: Lesson; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(lesson);
  useEffect(() => setF(lesson), [lesson]);
  const save = useMutation({ mutationFn: () => patch(`/lessons/${lesson.id}`, f), onSuccess: onChange });
  const remove = useMutation({ mutationFn: () => del(`/lessons/${lesson.id}`), onSuccess: onChange });

  return (
    <div className="px-5 py-3">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 text-left text-sm">
        {open ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronRight className="h-4 w-4" aria-hidden />}
        <span className="flex-1 font-medium">{lesson.title}</span>
        {lesson.isPreview && <Badge tone="blue">Free preview</Badge>}
        <span className="text-ink-mute">{lesson.durationMinutes} min</span>
      </button>
      {open && (
        <div className="mt-3 grid gap-3 pl-6 sm:grid-cols-3">
          <div className="sm:col-span-2"><Field label="Title"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field></div>
          <Field label="Minutes"><Input type="number" min="1" value={f.durationMinutes} onChange={(e) => setF({ ...f, durationMinutes: parseInt(e.target.value || "0") })} /></Field>
          <div className="sm:col-span-3">
            <Field label="Lesson content" hint="Blank lines separate paragraphs. Also used to ground the AI tutor and AI question drafts.">
              <Textarea rows={10} value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} />
            </Field>
          </div>
          <div className="sm:col-span-2"><Field label="Video or resource URL (optional)"><Input value={f.mediaUrl ?? ""} onChange={(e) => setF({ ...f, mediaUrl: e.target.value })} /></Field></div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={f.isPreview} onChange={(e) => setF({ ...f, isPreview: e.target.checked })} /> Free preview</label>
          <div className="flex items-center gap-2 sm:col-span-3">
            <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>Save lesson</Button>
            <Button size="sm" variant="danger" onClick={() => confirm("Delete this lesson?") && remove.mutate()}>Delete</Button>
            <ErrorNote error={save.error ?? remove.error} />
          </div>
        </div>
      )}
    </div>
  );
}

function NewLesson({ moduleId, onAdded }: { moduleId: string; onAdded: () => void }) {
  const [title, setTitle] = useState("");
  const add = useMutation({ mutationFn: () => post(`/modules/${moduleId}/lessons`, { title, kind: "Text", durationMinutes: 10 }), onSuccess: () => { setTitle(""); onAdded(); } });
  return (
    <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="flex gap-2 border-t border-slate-100 px-5 py-3">
      <Input placeholder="New lesson title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <Button type="submit" size="sm" variant="secondary" loading={add.isPending}><Plus className="h-4 w-4" aria-hidden /> Lesson</Button>
    </form>
  );
}

function Assessments({ d, onChange }: { d: Draft; onChange: () => void }) {
  const create = useMutation({ mutationFn: () => post(`/courses/${d.id}/assessments`, { title: "Final assessment" }), onSuccess: onChange });
  if (d.assessments.length === 0)
    return (
      <Card>
        <Empty title="No assessment yet">
          <p className="mb-3">Learners must pass every assessment to earn the certificate.</p>
          <Button loading={create.isPending} onClick={() => create.mutate()}>Add an assessment</Button>
        </Empty>
      </Card>
    );
  return <div className="space-y-6">{d.assessments.map((a) => <AssessmentEditor key={a.id} a={a} onChange={onChange} />)}</div>;
}

function AssessmentEditor({ a, onChange }: { a: Draft["assessments"][number]; onChange: () => void }) {
  const [settings, setSettings] = useState({ passMarkPercent: a.passMarkPercent, timeLimitMinutes: a.timeLimitMinutes ?? 0, maxAttempts: a.maxAttempts, shuffleQuestions: a.shuffleQuestions });
  const saveSettings = useMutation({ mutationFn: () => patch(`/assessments/${a.id}`, settings), onSuccess: onChange });
  const [aiCount, setAiCount] = useState(3);
  const [focus, setFocus] = useState("");
  const generate = useMutation({ mutationFn: () => post<{ created: number }>("/ai/question-drafts", { assessmentId: a.id, count: aiCount, focus }), onSuccess: onChange });
  const approve = useMutation({ mutationFn: (id: string) => post(`/questions/${id}/approve`), onSuccess: onChange });
  const remove = useMutation({ mutationFn: (id: string) => del(`/questions/${id}`), onSuccess: onChange });
  const [adding, setAdding] = useState(false);

  return (
    <>
      <Card>
        <CardHeader title={a.title} subtitle={`${a.questions.length} questions`} />
        <div className="grid gap-4 p-5 sm:grid-cols-5">
          <Field label="Pass mark %"><Input type="number" min="1" max="100" value={settings.passMarkPercent} onChange={(e) => setSettings({ ...settings, passMarkPercent: +e.target.value })} /></Field>
          <Field label="Time limit (min)" hint="0 = untimed"><Input type="number" min="0" value={settings.timeLimitMinutes} onChange={(e) => setSettings({ ...settings, timeLimitMinutes: +e.target.value })} /></Field>
          <Field label="Max attempts"><Input type="number" min="1" value={settings.maxAttempts} onChange={(e) => setSettings({ ...settings, maxAttempts: +e.target.value })} /></Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={settings.shuffleQuestions} onChange={(e) => setSettings({ ...settings, shuffleQuestions: e.target.checked })} /> Shuffle</label>
          <div className="self-end"><Button variant="secondary" loading={saveSettings.isPending} onClick={() => saveSettings.mutate()}>Save settings</Button></div>
        </div>
      </Card>

      <Card className="border-violet-200 bg-violet-50/40">
        <div className="flex flex-wrap items-end gap-3 p-5">
          <Sparkles className="mb-2 h-5 w-5 text-violet-600" aria-hidden />
          <div className="min-w-48 flex-1">
            <p className="font-medium">Draft questions with AI</p>
            <p className="text-sm text-ink-mute">Written from your lesson content. Drafts never reach learners until you approve them.</p>
          </div>
          <Field label="How many"><Input type="number" min="1" max="10" value={aiCount} onChange={(e) => setAiCount(+e.target.value)} className="w-20" /></Field>
          <Field label="Focus (optional)"><Input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="e.g. handling duplicates" /></Field>
          <Button loading={generate.isPending} onClick={() => generate.mutate()}>Generate drafts</Button>
          <div className="w-full">
            <ErrorNote error={generate.error} />
            {generate.data && <p className="text-sm text-violet-800">Added {generate.data.created} draft question(s) below for review.</p>}
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {a.questions.map((q, i) => (
          <Card key={q.id} className={cx("p-5", q.status === "Draft" && "border-amber-300")}>
            <div className="flex flex-wrap items-start gap-2">
              <p className="flex-1 font-medium">{i + 1}. {q.prompt}</p>
              {q.aiGenerated && <Badge tone="violet">AI</Badge>}
              <Badge>{q.kind.replace(/([a-z])([A-Z])/g, "$1 $2")}</Badge>
              {q.status === "Draft" && <Badge tone="amber">Needs review</Badge>}
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              {q.options.map((o) => (
                <li key={o.id} className={cx("flex items-center gap-2", o.isCorrect ? "font-medium text-emerald-700" : "text-ink-soft")}>
                  {o.isCorrect ? <Check className="h-4 w-4" aria-label="Correct" /> : <span className="w-4" />} {o.text}
                </li>
              ))}
            </ul>
            {q.explanation && <p className="mt-2 text-sm text-ink-mute">{q.explanation}</p>}
            <div className="mt-3 flex gap-2">
              {q.status === "Draft" && <Button size="sm" onClick={() => approve.mutate(q.id)}>Approve</Button>}
              <Button size="sm" variant="danger" onClick={() => confirm("Delete this question?") && remove.mutate(q.id)}>Delete</Button>
            </div>
          </Card>
        ))}
      </div>
      {adding ? <QuestionForm assessmentId={a.id} onDone={() => { setAdding(false); onChange(); }} /> : (
        <Button variant="secondary" onClick={() => setAdding(true)}><Plus className="h-4 w-4" aria-hidden /> Write a question</Button>
      )}
    </>
  );
}

function QuestionForm({ assessmentId, onDone }: { assessmentId: string; onDone: () => void }) {
  const [kind, setKind] = useState<QKind>("SingleChoice");
  const [prompt, setPrompt] = useState("");
  const [explanation, setExplanation] = useState("");
  const [options, setOptions] = useState([{ text: "", isCorrect: true }, { text: "", isCorrect: false }, { text: "", isCorrect: false }]);
  useEffect(() => {
    if (kind === "TrueFalse") setOptions([{ text: "True", isCorrect: true }, { text: "False", isCorrect: false }]);
  }, [kind]);
  const save = useMutation({ mutationFn: () => post(`/assessments/${assessmentId}/questions`, { kind, prompt, explanation, options }), onSuccess: onDone });
  const mark = (i: number) => setOptions(options.map((o, j) => ({ ...o, isCorrect: kind === "MultipleChoice" ? (j === i ? !o.isCorrect : o.isCorrect) : j === i })));

  const submit = (e: FormEvent) => { e.preventDefault(); save.mutate(); };
  return (
    <Card className="p-5">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
          <Field label="Question"><Input required value={prompt} onChange={(e) => setPrompt(e.target.value)} /></Field>
          <Field label="Type">
            <Select value={kind} onChange={(e) => setKind(e.target.value as QKind)}>
              <option value="SingleChoice">Single choice</option>
              <option value="MultipleChoice">Multiple choice</option>
              <option value="TrueFalse">True / false</option>
            </Select>
          </Field>
        </div>
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium text-ink-soft">Options — tick the correct answer{kind === "MultipleChoice" && "s"}</legend>
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type={kind === "MultipleChoice" ? "checkbox" : "radio"} name="correct" checked={o.isCorrect} onChange={() => mark(i)} aria-label={`Option ${i + 1} correct`} />
              <Input value={o.text} disabled={kind === "TrueFalse"} onChange={(e) => setOptions(options.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} placeholder={`Option ${i + 1}`} />
            </div>
          ))}
          {kind !== "TrueFalse" && <Button type="button" size="sm" variant="ghost" onClick={() => setOptions([...options, { text: "", isCorrect: false }])}>+ Option</Button>}
        </fieldset>
        <Field label="Explanation (shown after the answer key is released)"><Input value={explanation} onChange={(e) => setExplanation(e.target.value)} /></Field>
        <div className="flex items-center gap-2">
          <Button type="submit" loading={save.isPending}>Add question</Button>
          <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
          <ErrorNote error={save.error} />
        </div>
      </form>
    </Card>
  );
}

interface Session { id: string; title: string; description?: string; startsAt: string; endsAt: string; status: SessionStatus; location?: string; capacity: number; registered: number; present: number }

function Sessions({ courseId }: { courseId: string }) {
  const qc = useQueryClient();
  const now = useNow();
  const sessions = useQuery({ queryKey: ["sessions", courseId], queryFn: () => api<Session[]>(`/courses/${courseId}/sessions`) });
  const [f, setF] = useState({ title: "", description: "", startsAt: "", durationMinutes: 60, location: "", capacity: 50 });
  const [openId, setOpenId] = useState<string | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["sessions", courseId] }); qc.invalidateQueries({ queryKey: ["my-classes"] }); };
  const create = useMutation({
    mutationFn: () => {
      const start = new Date(f.startsAt);
      return post(`/courses/${courseId}/sessions`, {
        title: f.title, description: f.description || null, startsAt: start.toISOString(),
        endsAt: new Date(start.getTime() + f.durationMinutes * 60000).toISOString(), location: f.location || null, capacity: f.capacity,
      });
    },
    onSuccess: () => { setF({ ...f, title: "", description: "", startsAt: "" }); refresh(); },
  });
  const cancel = useMutation({ mutationFn: (id: string) => post(`/sessions/${id}/cancel`), onSuccess: refresh });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader icon={CalendarPlus} title="Schedule a live class" subtitle="Runs in the built-in video classroom. Learners join from 15 minutes before and are marked present automatically." />
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="grid gap-4 p-5 sm:grid-cols-3">
          <div className="sm:col-span-3"><Field label="Title"><Input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Live Q&A: week 2" /></Field></div>
          <div className="sm:col-span-3"><Field label="What you'll cover (optional)"><Textarea className="min-h-16" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field></div>
          <Field label="Starts"><Input type="datetime-local" required value={f.startsAt} onChange={(e) => setF({ ...f, startsAt: e.target.value })} /></Field>
          <Field label="Duration (min)"><Input type="number" min="15" step="5" value={f.durationMinutes} onChange={(e) => setF({ ...f, durationMinutes: +e.target.value })} /></Field>
          <Field label="Seats"><Input type="number" min="1" value={f.capacity} onChange={(e) => setF({ ...f, capacity: +e.target.value })} /></Field>
          <div className="sm:col-span-3"><Field label="In-person room (optional)" hint="Leave blank for an online-only class."><Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></Field></div>
          <div className="flex items-center gap-3 sm:col-span-3"><Button type="submit" loading={create.isPending}>Schedule class</Button><ErrorNote error={create.error} /></div>
        </form>
      </Card>
      <Card>
        <CardHeader icon={Video} title="Classes" />
        {!sessions.data?.length ? <Empty icon={Video} title="No classes scheduled" /> : (
          <ul className="divide-y divide-slate-100">
            {sessions.data.map((s) => {
              const startable = canEnter({ ...s, isHost: true }, now);
              return (
                <li key={s.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setOpenId(openId === s.id ? null : s.id)} aria-expanded={openId === s.id}>
                      {openId === s.id ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2 font-semibold">{s.title}<StatusBadge status={s.status} /></span>
                        <span className="block text-sm text-ink-mute">{dateTime(s.startsAt)} · {s.location ?? "Online"} · {s.status === "Scheduled" ? `${s.registered}/${s.capacity} registered` : `${s.present} attended`}</span>
                      </span>
                    </button>
                    {startable && (
                      <Link to={`/classes/${s.id}/room`} className={cx("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-white", s.status === "Live" ? "bg-red-600 hover:bg-red-700" : "bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700")}>
                        <Video className="h-4 w-4" aria-hidden />{s.status === "Live" ? "Rejoin" : "Start class"}
                      </Link>
                    )}
                    {s.status === "Scheduled" && (
                      <Button size="sm" variant="ghost" loading={cancel.isPending && cancel.variables === s.id} onClick={() => { if (confirm(`Cancel "${s.title}"?`)) cancel.mutate(s.id); }}>Cancel</Button>
                    )}
                  </div>
                  {openId === s.id && <Attendance sessionId={s.id} />}
                </li>
              );
            })}
          </ul>
        )}
        <div className="px-5 pb-3"><ErrorNote error={cancel.error} /></div>
      </Card>
    </div>
  );
}

function Attendance({ sessionId }: { sessionId: string }) {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["attendance", sessionId], queryFn: () => api<{ userId: string; fullName: string; email: string; status: string; joinedAt?: string; leftAt?: string }[]>(`/sessions/${sessionId}/attendance`) });
  const mark = useMutation({
    mutationFn: (b: { userId: string; status: string }) => post(`/sessions/${sessionId}/attendance`, b),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance", sessionId] }),
  });
  if (!list.data?.length) return <p className="py-3 pl-7 text-sm text-ink-mute">No learners yet. Learners appear here when they save a seat or join.</p>;
  return (
    <div className="mt-3">
      <Table head={["Learner", "Status", "Joined", ""]}>
        {list.data.map((a) => (
          <tr key={a.userId}>
            <Td>{a.fullName}<div className="text-xs text-ink-mute">{a.email}</div></Td>
            <Td><StatusBadge status={a.status} /></Td>
            <Td className="text-ink-mute">{a.joinedAt ? dateTime(a.joinedAt) : "—"}</Td>
            <Td className="space-x-2 text-right">
              <Button size="sm" variant="secondary" onClick={() => mark.mutate({ userId: a.userId, status: "Present" })}>Present</Button>
              <Button size="sm" variant="ghost" onClick={() => mark.mutate({ userId: a.userId, status: "Absent" })}>Absent</Button>
            </Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

interface SyllabusProposal {
  learningOutcomes: string[];
  prerequisites: string[];
  modules: { moduleId: string; week: number; objectives: string[] }[];
  milestones: { title: string; description: string; kind: MilestoneKind; moduleId?: string | null; assessmentId?: string | null; requiredCount: number; dueDays: number }[];
}

function SyllabusEditor({ d, onChange }: { d: Draft; onChange: () => void }) {
  const [f, setF] = useState({ learningOutcomes: d.draft.learningOutcomes ?? "", prerequisites: d.draft.prerequisites ?? "" });
  const [proposal, setProposal] = useState<SyllabusProposal | null>(null);
  const [planKey, setPlanKey] = useState(0);
  const save = useMutation({ mutationFn: () => patch(`/courses/${d.id}`, f), onSuccess: onChange });
  const draftAi = useMutation({ mutationFn: () => post<SyllabusProposal>(`/courses/${d.id}/syllabus-draft`), onSuccess: setProposal });
  const apply = useMutation({
    mutationFn: async (pr: SyllabusProposal) => {
      const next = { learningOutcomes: pr.learningOutcomes.join("\n"), prerequisites: pr.prerequisites.join("\n") };
      await patch(`/courses/${d.id}`, next);
      for (const m of pr.modules) await patch(`/modules/${m.moduleId}`, { week: m.week, objectives: m.objectives.join("\n") });
      for (const ms of pr.milestones) await post(`/courses/${d.id}/milestones`, ms);
      return next;
    },
    onSuccess: (next) => { setF(next); setProposal(null); setPlanKey((k) => k + 1); onChange(); },
  });
  const moduleTitle = (id?: string | null) => d.modules.find((m) => m.id === id)?.title;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-brand-50 px-5 py-4">
        <IconTile icon={Sparkles} tone="violet" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-ink">Plan this course with Gemini</div>
          <div className="text-sm text-ink-soft">Drafts outcomes, prerequisites, a weekly plan and milestones from your lessons. You review before anything is saved.</div>
        </div>
        <Button variant="dark" loading={draftAi.isPending} onClick={() => draftAi.mutate()}><Sparkles className="h-4 w-4" aria-hidden />Draft with Gemini</Button>
        <div className="w-full"><ErrorNote error={draftAi.error} /></div>
      </div>

      {proposal && (
        <Card className="border-violet-200">
          <CardHeader icon={Sparkles} title="Gemini's proposal" subtitle="Applying adds the milestones and replaces the outcomes, prerequisites and weekly plan." action={
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setProposal(null)}>Discard</Button>
              <Button loading={apply.isPending} onClick={() => apply.mutate(proposal)}><Check className="h-4 w-4" aria-hidden />Apply to draft</Button>
            </div>
          } />
          <div className="grid gap-5 px-5 pb-5 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-bold text-ink-soft">Learning outcomes</h3>
              <ul className="space-y-1.5 text-sm text-ink-soft">{proposal.learningOutcomes.map((o) => <li key={o} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />{o}</li>)}</ul>
              <h3 className="mb-2 mt-4 text-sm font-bold text-ink-soft">Prerequisites</h3>
              <ul className="space-y-1 text-sm text-ink-soft">{proposal.prerequisites.map((o) => <li key={o}>• {o}</li>)}</ul>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-bold text-ink-soft">Weekly plan</h3>
              <ul className="space-y-2 text-sm">{proposal.modules.map((m) => <li key={m.moduleId}><span className="font-semibold text-ink">Week {m.week} · {moduleTitle(m.moduleId)}</span><div className="text-ink-mute">{m.objectives.join(" · ")}</div></li>)}</ul>
              <h3 className="mb-2 mt-4 text-sm font-bold text-ink-soft">Milestones</h3>
              <ol className="space-y-1.5 text-sm">{proposal.milestones.map((m, i) => <li key={i}><span className="font-semibold text-ink">{i + 1}. {m.title}</span> <span className="text-ink-mute">— {KIND_LABEL[m.kind]}{m.kind === "CompleteModule" ? `: ${moduleTitle(m.moduleId)}` : m.kind === "AttendClasses" ? ` (${m.requiredCount})` : ""} · day {m.dueDays}</span></li>)}</ol>
            </div>
            <div className="md:col-span-2"><ErrorNote error={apply.error} /></div>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader icon={Target} title="Course syllabus" subtitle="Shown on the course page and to enrolled learners. One item per line." />
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="grid gap-4 px-5 pb-5 md:grid-cols-2">
          <Field label="Learning outcomes" hint="What learners will be able to do after the course.">
            <Textarea className="min-h-40" value={f.learningOutcomes} onChange={(e) => setF({ ...f, learningOutcomes: e.target.value })} placeholder={"Frame an answerable analysis question\nClean a messy dataset"} />
          </Field>
          <Field label="Prerequisites" hint="What learners should know before starting.">
            <Textarea className="min-h-40" value={f.prerequisites} onChange={(e) => setF({ ...f, prerequisites: e.target.value })} placeholder="Basic Python" />
          </Field>
          <div className="flex items-center gap-3 md:col-span-2"><Button type="submit" loading={save.isPending}>Save syllabus</Button>{save.isSuccess && <span className="text-sm text-emerald-700">Saved to draft</span>}<ErrorNote error={save.error} /></div>
        </form>
      </Card>
      <Card>
        <CardHeader icon={CalendarDays} title="Weekly plan" subtitle="Assign each module to a week and list what learners should get out of it." />
        <div className="space-y-3 px-5 pb-5">
          {d.modules.length === 0 ? <Empty title="Add modules in the Curriculum tab first" /> : d.modules.map((m) => <ModulePlan key={`${m.id}-${planKey}-${m.week ?? ""}-${m.objectives ?? ""}`} m={m} onChange={onChange} />)}
        </div>
      </Card>
    </div>
  );
}

function ModulePlan({ m, onChange }: { m: Draft["modules"][number]; onChange: () => void }) {
  const [f, setF] = useState({ week: m.week ? String(m.week) : "", objectives: m.objectives ?? "" });
  const save = useMutation({
    mutationFn: () => patch(`/modules/${m.id}`, { week: f.week ? parseInt(f.week) : undefined, clearWeek: !f.week, objectives: f.objectives }),
    onSuccess: onChange,
  });
  const dirty = f.week !== (m.week ? String(m.week) : "") || f.objectives !== (m.objectives ?? "");
  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 p-4 sm:grid-cols-[120px_1fr_auto] sm:items-start">
      <Field label="Week"><Input type="number" min="1" value={f.week} onChange={(e) => setF({ ...f, week: e.target.value })} placeholder="—" /></Field>
      <Field label={`Objectives · ${m.title}`}><Textarea className="min-h-20" value={f.objectives} onChange={(e) => setF({ ...f, objectives: e.target.value })} placeholder="One objective per line" /></Field>
      <div className="sm:pt-7"><Button size="sm" variant={dirty ? "primary" : "secondary"} disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>Save</Button></div>
      <div className="sm:col-span-3"><ErrorNote error={save.error} /></div>
    </div>
  );
}

const KIND_LABEL: Record<MilestoneKind, string> = { CompleteModule: "Complete a module", PassAssessment: "Pass an assessment", AttendClasses: "Attend live classes" };

function MilestonesEditor({ d, onChange }: { d: Draft; onChange: () => void }) {
  const blank = { title: "", description: "", kind: "CompleteModule" as MilestoneKind, moduleId: "", assessmentId: "", requiredCount: 1, dueDays: "" };
  const [f, setF] = useState(blank);
  const create = useMutation({
    mutationFn: () => post(`/courses/${d.id}/milestones`, {
      title: f.title, description: f.description || null, kind: f.kind,
      moduleId: f.kind === "CompleteModule" ? f.moduleId || d.modules[0]?.id : null,
      assessmentId: f.kind === "PassAssessment" ? f.assessmentId || d.assessments[0]?.id : null,
      requiredCount: f.requiredCount, dueDays: f.dueDays ? parseInt(f.dueDays) : null,
    }),
    onSuccess: () => { setF(blank); onChange(); },
  });
  const remove = useMutation({ mutationFn: (id: string) => del(`/milestones/${id}`), onSuccess: onChange });
  const move = useMutation({ mutationFn: (b: { id: string; order: number }) => patch(`/milestones/${b.id}`, { order: b.order }), onSuccess: onChange });
  const targetName = (m: Draft["milestones"][number]) =>
    m.kind === "CompleteModule" ? d.modules.find((x) => x.id === m.moduleId)?.title
      : m.kind === "PassAssessment" ? d.assessments.find((x) => x.id === m.assessmentId)?.title
        : `${m.requiredCount} live class${m.requiredCount === 1 ? "" : "es"}`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader icon={Flag} title="Milestones" subtitle="Checkpoints learners work towards. They're ticked off automatically from lesson progress, assessment results and live-class attendance." />
        {d.milestones.length === 0 ? <Empty icon={Flag} title="No milestones yet">Add the first one below.</Empty> : (
          <Table head={["#", "Milestone", "Requirement", "Due", ""]}>
            {d.milestones.map((m, i) => (
              <tr key={m.id}>
                <Td className="w-12 font-bold text-ink-mute">{i + 1}</Td>
                <Td><div className="font-semibold text-ink">{m.title}</div>{m.description && <div className="text-[13px] text-ink-mute">{m.description}</div>}</Td>
                <Td className="text-ink-soft">{KIND_LABEL[m.kind]}: <span className="font-medium">{targetName(m) ?? "—"}</span></Td>
                <Td className="whitespace-nowrap text-ink-soft">{m.dueDays != null ? `Day ${m.dueDays}` : "No deadline"}</Td>
                <Td className="whitespace-nowrap text-right">
                  <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => { const prev = d.milestones[i - 1]!; move.mutate({ id: m.id, order: prev.order - 1 }); }} aria-label="Move up">↑</Button>
                  <Button size="sm" variant="ghost" disabled={i === d.milestones.length - 1} onClick={() => { const next = d.milestones[i + 1]!; move.mutate({ id: m.id, order: next.order + 1 }); }} aria-label="Move down">↓</Button>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete "${m.title}"?`)) remove.mutate(m.id); }} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
                </Td>
              </tr>
            ))}
          </Table>
        )}
        <div className="px-5 pb-3"><ErrorNote error={remove.error ?? move.error} /></div>
      </Card>

      <Card>
        <CardHeader icon={Plus} title="Add a milestone" />
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="grid gap-4 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2"><Field label="Title"><Input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Finish week 1" /></Field></div>
          <Field label="Requirement">
            <Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as MilestoneKind })}>
              {(Object.keys(KIND_LABEL) as MilestoneKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </Select>
          </Field>
          {f.kind === "CompleteModule" && (
            <Field label="Module">
              <Select value={f.moduleId} onChange={(e) => setF({ ...f, moduleId: e.target.value })}>
                {d.modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </Select>
            </Field>
          )}
          {f.kind === "PassAssessment" && (
            <Field label="Assessment">
              <Select value={f.assessmentId} onChange={(e) => setF({ ...f, assessmentId: e.target.value })}>
                {d.assessments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
              </Select>
            </Field>
          )}
          {f.kind === "AttendClasses" && <Field label="Classes to attend"><Input type="number" min="1" value={f.requiredCount} onChange={(e) => setF({ ...f, requiredCount: +e.target.value })} /></Field>}
          <div className="sm:col-span-2 lg:col-span-3"><Field label="Description (optional)"><Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field></div>
          <Field label="Due (days after enrolment)" hint="Leave blank for no deadline"><Input type="number" min="0" value={f.dueDays} onChange={(e) => setF({ ...f, dueDays: e.target.value })} /></Field>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
            <Button type="submit" loading={create.isPending}><Plus className="h-4 w-4" aria-hidden />Add milestone</Button>
            <ErrorNote error={create.error} />
          </div>
        </form>
      </Card>
    </div>
  );
}

type InterestStatus = "New" | "Contacted" | "Enrolled" | "Closed";
interface Lead { id: string; name: string; email: string; phone?: string; goal?: string; preferredTime?: string; message?: string; source?: string; status: InterestStatus; createdAt: string; updatedAt: string; hasAccount: boolean }

/** People who registered interest through the shared course link's chat form. */
function Interested({ courseId, slug, published }: { courseId: string; slug: string; published: boolean }) {
  const qc = useQueryClient();
  const leads = useQuery({ queryKey: ["interests", courseId], queryFn: () => api<Lead[]>(`/courses/${courseId}/interests`) });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InterestStatus }) => patch(`/course-interests/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["interests", courseId] }),
  });
  const link = `${window.location.origin}/courses/${slug}?interest=1`;
  const [copied, setCopied] = useState(false);
  const copy = async () => { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <Card>
      <CardHeader icon={UserPlus} title="Interested learners" subtitle="Share the link; people answer a short chat and appear here" />
      <div className="space-y-4 px-5 pb-5">
        {published ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3">
            <code className="min-w-0 flex-1 truncate text-sm text-ink-soft">{link}</code>
            <Button size="sm" variant="secondary" onClick={copy}>{copied ? <><Check className="h-4 w-4" aria-hidden /> Copied</> : "Copy link"}</Button>
          </div>
        ) : (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">Publish the course to get a shareable interest link.</p>
        )}
        <ErrorNote error={leads.error ?? setStatus.error} />
        {leads.isLoading ? <Spinner /> : !leads.data?.length ? (
          <Empty icon={UserPlus} title="No one yet">Share the link above on WhatsApp, LinkedIn or email.</Empty>
        ) : (
          <Table head={["Name", "Contact", "Goal", "Prefers", "Message", "Received", "Status"]}>
            {leads.data.map((l) => (
              <tr key={l.id}>
                <Td><div className="font-medium text-ink">{l.name}</div>{l.hasAccount && <Badge tone="blue">Has account</Badge>}</Td>
                <Td>
                  <a href={`mailto:${l.email}`} className="block text-brand-700 hover:underline">{l.email}</a>
                  {l.phone && <a href={`tel:${l.phone}`} className="block text-ink-mute hover:underline">{l.phone}</a>}
                </Td>
                <Td>{l.goal ?? "—"}</Td>
                <Td>{l.preferredTime ?? "—"}</Td>
                <Td className="max-w-xs whitespace-pre-wrap">{l.message ?? "—"}{l.source && <div className="text-xs text-ink-mute">Ref: {l.source}</div>}</Td>
                <Td className="whitespace-nowrap">{dateTime(l.updatedAt)}</Td>
                <Td>
                  <Select value={l.status} aria-label={`Status for ${l.name}`} onChange={(e) => setStatus.mutate({ id: l.id, status: e.target.value as InterestStatus })}>
                    <option>New</option><option>Contacted</option><option>Enrolled</option><option>Closed</option>
                  </Select>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </Card>
  );
}
