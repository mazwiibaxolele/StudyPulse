/**
 * AI Service — Groq API integration
 * Single app-wide key via environment variable.
 */

import { STUDY_METHODS } from '../types';
import type { Module, StudySession, Mark } from '../types';

// ─── API Key ─────────────────────────────────────────────────

function getApiKey(): string {
  return import.meta.env.VITE_GROQ_API_KEY ?? '';
}

export function hasApiKey(): boolean {
  return getApiKey().trim().length > 0;
}

// ─── Context Builder ─────────────────────────────────────────

export interface StudyContext {
  modules: Module[];
  sessions: StudySession[];
  marks: Mark[];
}

function buildSystemPrompt(ctx: StudyContext): string {
  const moduleList = ctx.modules.map(m => `- ${m.name}${m.code ? ` (${m.code})` : ''}`).join('\n');

  const totalHours = ctx.sessions.reduce((a, s) => a + (s.durationMins || 0), 0) / 60;
  const totalSessions = ctx.sessions.length;

  const methodDist: Record<string, number> = {};
  ctx.sessions.forEach(s => {
    methodDist[s.studyMethod] = (methodDist[s.studyMethod] || 0) + 1;
  });
  const methodSummary = Object.entries(methodDist)
    .sort(([, a], [, b]) => b - a)
    .map(([method, count]) => `- ${STUDY_METHODS[method as keyof typeof STUDY_METHODS]?.label ?? method}: ${count} sessions`)
    .join('\n');

  const marksPerModule = ctx.modules.map(mod => {
    const modMarks = ctx.marks.filter(m => m.moduleId === mod.id);
    if (modMarks.length === 0) return null;
    const avg = modMarks.reduce((a, m) => a + m.percentage, 0) / modMarks.length;
    const recent = modMarks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return `- ${mod.name}: avg ${avg.toFixed(1)}%, ${modMarks.length} assessments (latest: ${recent[0]?.title} ${recent[0]?.percentage.toFixed(1)}%)`;
  }).filter(Boolean).join('\n');

  const hoursPerModule = ctx.modules.map(mod => {
    const modSessions = ctx.sessions.filter(s => s.moduleId === mod.id);
    const hours = modSessions.reduce((a, s) => a + (s.durationMins || 0), 0) / 60;
    if (hours === 0) return null;
    return `- ${mod.name}: ${hours.toFixed(1)} hours across ${modSessions.length} sessions`;
  }).filter(Boolean).join('\n');

  const recentSessions = ctx.sessions
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 10)
    .map(s => {
      const mod = ctx.modules.find(m => m.id === s.moduleId);
      const method = STUDY_METHODS[s.studyMethod]?.label ?? s.studyMethod;
      return `- ${new Date(s.startedAt).toLocaleDateString()}: ${mod?.name ?? 'Unknown'}, ${method}, ${s.durationMins}min, ${s.pomodorosDone} pomodoros${s.focusRating ? `, focus: ${s.focusRating}/5` : ''}`;
    })
    .join('\n');

  return `You are StudyPulse AI Coach — a friendly, knowledgeable study advisor built into a study analytics app. You help students study more effectively by analysing their actual study data and giving evidence-based advice.

YOUR PERSONALITY:
- Encouraging but honest — celebrate progress, but don't sugar-coat when methods aren't working
- Concise and actionable — students are busy, give practical advice they can use immediately
- Data-driven — reference their actual numbers when making recommendations
- Knowledgeable about learning science — active recall, spaced repetition, Feynman technique, interleaving, etc.

STUDENT'S DATA:
${ctx.modules.length > 0 ? `\nModules:\n${moduleList}` : '\nNo modules added yet.'}
${totalSessions > 0 ? `\nStudy Stats:\n- Total study time: ${totalHours.toFixed(1)} hours across ${totalSessions} sessions` : '\nNo study sessions recorded yet.'}
${methodSummary ? `\nStudy Methods Used:\n${methodSummary}` : ''}
${hoursPerModule ? `\nHours Per Module:\n${hoursPerModule}` : ''}
${marksPerModule ? `\nMarks Per Module:\n${marksPerModule}` : '\nNo marks recorded yet.'}
${recentSessions ? `\nRecent Sessions (latest first):\n${recentSessions}` : ''}

GUIDELINES:
- When the student asks about their performance, reference their actual marks and study hours
- When recommending study methods, explain WHY based on learning science research
- If they're using mostly re-reading, gently suggest active recall or Feynman technique
- If you notice a correlation between method and marks, point it out
- Keep responses focused — use bullet points and bold text for key points
- If there's not enough data, say so and encourage them to log more sessions
- Never make up data — only reference what's in their profile above
- Use markdown formatting: **bold** for emphasis, bullet points for lists`;
}

// ─── Groq API Call ─────────────────────────────────────────

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface ChatHistoryItem {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function sendToAI(
  userMessage: string,
  chatHistory: ChatHistoryItem[],
  context: StudyContext,
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Groq API key is not configured.');
  }

  const systemPrompt = buildSystemPrompt(context);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory,
    { role: 'user', content: userMessage }
  ];

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: messages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 429) {
      throw new Error('Rate limit reached. Wait a moment and try again.');
    }
    throw new Error(`AI error: ${err?.error?.message ?? `Status ${response.status}`}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error('No response from AI. Please try again.');
  }

  return text;
}
