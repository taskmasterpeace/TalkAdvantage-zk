import { NextRequest, NextResponse } from "next/server";
import { ragService } from '@/lib/services/rag-service';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "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";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "mistralai/mistral-7b-instruct";

// Build the system prompt for the LLM
function buildSystemPrompt(contextPack: any) {
  console.log('contextPack', contextPack);
  const date = new Date().toLocaleDateString();
  return `You are Talk Advantage, a cutting-edge AI presentation assistant designed to give ${contextPack.name} a strategic edge in live interactions with ${contextPack.person}, their ${contextPack.personRelationship}. Today is ${date}.
The primary goal is ${contextPack.goal}, and the secondary goal is ${contextPack.subGoals[0]}.
Use the following document context for reference:
${contextPack.document_context || contextPack.document || 'no document'}

Core Behaviors:
- Identity: You are a tactical interaction partner, guiding ${contextPack.name} through a 2x2 grid of topic cards with talking points to achieve ${contextPack.goal} and ${contextPack.goal_secondary}.
- Conversation Tracking: Monitor the real-time transcript to track the conversation's position to steer it towards the goals, using hotlink (trigger) words to detect user's progress or pivots. You allow movement forward (advancing topics) or backward (revisiting prior cards). Prioritize most recent things.
- Style Rules: Adapt to the tone from the interaction. Because the user is expected to use these as talking points, we need no emojis. Avoid lists unless specified in card format. After analyzing the spoken transcript, try to mimic the user's tone and use it for the talking points
- Reflection: Before generating or updating cards, confirm: Does this align with ${contextPack.goal}, ${contextPack.subGoals[0]}, and medium specificity?
- Positional Reinforcement: Every 500 tokens, restate: "Guide ${contextPack.name} toward ${contextPack.goal} and ${contextPack.subGoals[0]} with ${contextPack.person}."
- Follow-up: Provide no additional commentary`;
}

// Build the user prompt for initial card generation
function buildUserPromptInit(contextPack: any) {
  return `Generate an opening statement and 4 conversation topic cards to guide ${contextPack.name}'s presentation with ${contextPack.person}, their ${contextPack.personRelationship}, toward the primary goal of ${contextPack.goal} and secondary goal of ${contextPack.subGoals[0]}. Use ${contextPack.document_context || contextPack.document || 'no document'} (if provided) and medium specificity (3 bullets, 100-200 words).

IMPORTANT: For each card, you MUST return:
{
  "topic": "string",
  "hotlinks": ["word1", "word2", "word3"], // Hotlink words must NOT contain hyphens or special characters. Use only single, common English words.
  "content": {
    "paragraph": "string",
    "bullets": ["bullet1", "bullet2", "bullet3"],
    "expansion": "string"
  },
  "state": "base",
  "position": "start"
}
- Do NOT use hotlink words with hyphens or spaces or special characters. Use only single, common English words.
- Do NOT return a single string for content.
- Do NOT leave bullets empty.
- If unsure, invent plausible bullets.
- Respond ONLY with valid JSON, no markdown, no commentary.

Opening Statement Requirements:
- Start with "Welcome ${contextPack.name}!"
- Include the primary goal: ${contextPack.goal}
- Include the secondary goal: ${contextPack.subGoals[0]}
- Keep it concise (2-3 sentences)
- Make it engaging and professional
- No placeholders or undefined values

Card Requirements:
- Each card represents a unique path toward the goals, enabling forward progress or revisiting prior topics.
- Include 3 unique hotlink (trigger) words per card (beginning, middle, end): Professional, commonly used, no overlap across cards any hotlink word, distinct semantic fields.
- Format each card:
  Topic: [3-word max]
  msut be 3 Hotlink Words: [word1], [word2], [word3]
  Paragraph: [1-2 sentences summarizing the topic, tailored to medium specificity]
  Base Talking Points: [3 bullets, 1-2 sentences each]
  Expansion Plan: [1-2 sentence paragraph outlining next steps for this topic]
- Skip greetings; focus on substantive, goal-driven content.
- Anticipate transitions, enabling pivots to other cards or revisiting prior ones.
- Reflect: Do these cards align with ${contextPack.goal}, ${contextPack.subGoals[0]}, and medium specificity?

Output Format:
{
  "opening": "string",
  "cards": [
    {
      "topic": "string",
      "hotlinks": ["word1", "word2", "word3"],
      "content": {
        "paragraph": "string",
        "bullets": ["bullet1", "bullet2", "bullet3"],
        "expansion": "string"
      },
      "state": "base",
      "position": "start"
    }
  ]
}
Respond ONLY with valid JSON. Do not include any commentary, markdown, or explanation.`;
}

// Build the user prompt for card update
function buildUserPromptUpdate(transcript: any, currentCards: any, contextPack: any) {
  return `Current Conversation State:
${transcript.slice(-500)}

Active Cards:
${JSON.stringify(currentCards, null, 2)}

IMPORTANT: For each card, you MUST return:
{
  "topic": "string",
  "hotlinks": ["word1", "word2", "word3"], // Hotlink words must NOT contain hyphens,spaces or special characters. Use only single, common English words.
  "content": {
    "paragraph": "string",
    "bullets": ["bullet1", "bullet2", "bullet3"],
    "expansion": "string"
  }
  "state": "base|elongated|split",
  "position": "start|end"
}
- Do NOT use hotlink words with hyphens or special characters. Use only single, common English words no overlap across cards any hotlink, distinct semantic fields
- must be 3 Hotlink Words: [word1], [word2], [word3]
- Do NOT return a single string for content.
- Do NOT leave bullets empty.
- If unsure, invent plausible bullets.
- Respond ONLY with valid JSON, no markdown, no commentary.


Update Rules:

1. If 2 triggers are detected from any card:
   - Elongate the matching card.
   - Replace cards with (0 or 1 triggers with new related subtopics from the most recently which has 2 triggers triggered card).
   - Each card must have exactly 3 hotlink words: [word1], [word2], [word3]

2. On third or more triggers from a card:
   - If multiple cards are 3+ triggered simultaneously, pick the **most recently triggered** one.
   - Split that card into 2 refined cards:
     - Card 1: Keep original title,original hotlinks, original triggers,original  paragraph,original bullets.
     - Card 2: A **closely related subtopic**.
       - Title: max 3 words (e.g., "Mock Interview Tips")
       - 3 new hotlink words (no special characters or hyphens)
       - A new paragraph and 3 logical bullet points
   - 🎯 Goal: Card 2 must logically follow from Card 1.
   - Always return exactly 4 cards in the "updated_cards" array.
   - Replace or reuse other cards as needed to maintain 4 total.

3. Recursive Subtopic Splitting:
   - If a subtopic card (e.g., Card 2) reaches 3+ triggers:
     - Apply same split logic recursively.
     - Maintain a logical relation chain: A → B → C...
     - Always preserve a 4-card layout.

4. Split Placement Strategy (Cyclic):
   - If Card 1 splits → subtopic replaces Card 2, 3
   - If Card 2 splits → subtopic replaces Card 3 and 4
   - If Card 3 splits → subtopic replaces Card 4
   - If Card 4 splits → subtopic replaces Card 1 and 2

5. Topic Shift Detection:
   - If no trigger means 0 triggermatches are found for 30 seconds in any card:
     - Generate a completely new set of 4 cards based on:
       - Goal: ${contextPack.goal}
       - Subgoal: ${contextPack.subGoals[0]}
       - Document context ${contextPack.document_context}

OUTPUT FORMAT:
{
  "updated_cards": [{
    "topic": "string",
    "hotlinks": ["w1","w2","w3"],
    "content": {
      "paragraph": "string",
      "bullets": ["bullet1", "bullet2", "bullet3"],
      "expansion": "string"
    },
    "state": "base|elongated|split",
    "position": "start|end"
  }],
  "visual_cues": {
    "growth_factor": 1.0-2.0,
    "priority": 0-3
  }
}
Respond ONLY with valid JSON. Do not include any commentary, markdown, or explanation.`;
}

// Helper to ensure all card fields are filled
function ensureCardFields(card: any) {
  return {
    topic: card.topic || "Untitled Topic",
    hotlinks: card.hotlinks || ["trigger1", "trigger2", "trigger3"],

    triggers: Array.isArray(card.triggers) 
      ? card.triggers
      : card.hotlinks ? card.hotlinks : ["trigger1", "trigger2", "trigger3"],
    content: {
      paragraph: card.content?.paragraph || "No summary provided.",
      bullets: Array.isArray(card.content?.bullets) && card.content.bullets.length >= 3
        ? card.content.bullets.filter((b: string) => b && b.trim()).slice(0, 3)
        : ["Bullet 1", "Bullet 2", "Bullet 3"],
      expansion: card.content?.expansion || "Further details to be discussed."
    },
    state: card.state || "base",
    position: card.position || "start"
  };
}

export async function POST(req: NextRequest) {
  try {
    const { transcript, contextPack, action, currentCards, model, userId } = await req.json();
    if (!transcript || !contextPack) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // --- Use knowledge base for document context ---
    let document_context = '';
    const transcriptKeywords = transcript
    .toLowerCase()
    .split(/\W+/)
    .filter((word: string) => word.length > 2 && !word.includes('-'));
    const query = transcriptKeywords.join(' ')||contextPack?.goal;
    console.log('query', query,contextPack.userId);

    const relevantChunks = await ragService.getRelevantContext(query, contextPack.userId, 3);
    if (relevantChunks.length > 0) {
      document_context = relevantChunks.map(chunk => chunk.content).join('\n\n');

    }
  
    // ---
    const systemPrompt = buildSystemPrompt({ ...contextPack, document_context });
    console.log('systemPrompt', systemPrompt);
    let userPrompt = '';
    if (action === 'init') {
      userPrompt = buildUserPromptInit({ ...contextPack, document_context });
    } else if (action === 'update') {
      userPrompt = buildUserPromptUpdate(transcript, currentCards, { ...contextPack, document_context });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    // Call the LLM
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://talkadvantage.ai',
        'X-Title': 'TalkAdvantage'
      },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
          { role: 'user', content: `Here is the current conversation transcript:\n\n${transcript}` }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenRouter API error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to generate talking points');
    }
    const data = await response.json();
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from OpenRouter');
    }
    // Parse the response content
    const content = data.choices[0].message.content;
    let talkingPoints;
    try {
      talkingPoints = JSON.parse(content);
    } catch (e) {
      talkingPoints = content.split('\n').filter(Boolean);
    }
    // Warn if LLM returned only a string for content
    if (talkingPoints && Array.isArray(talkingPoints.updated_cards)) {
      talkingPoints.updated_cards.forEach((card: any, idx: number) => {
        if (typeof card.content === 'string') {
          console.warn(`LLM returned string for content in card ${idx}:`, card.content);
        }
      });
    }
    if (talkingPoints && Array.isArray(talkingPoints.cards)) {
      talkingPoints.cards.forEach((card: any, idx: number) => {
        if (typeof card.content === 'string') {
          console.warn(`LLM returned string for content in card ${idx}:`, card.content);
        }
      });
    }
    // Guarantee output shape for init and update actions
    if (talkingPoints.opening && Array.isArray(talkingPoints.cards)) {
      return NextResponse.json({
        opening: talkingPoints.opening,
        cards: talkingPoints.cards.map(ensureCardFields)
      });
    } else if (talkingPoints.updated_cards) {
      // Ensure always 4 cards in updated_cards
      let updatedCards = talkingPoints.updated_cards.map(ensureCardFields);
      if (updatedCards.length < 4 && Array.isArray(currentCards)) {
        // Fill with previous cards if available, or with default placeholders
        const needed = 4 - updatedCards.length;
        for (let i = 0; i < needed; i++) {
          if (currentCards[i]) {
            updatedCards.push(ensureCardFields(currentCards[i]));
          } else {
            updatedCards.push(ensureCardFields({}));
          }
        }
      } else if (updatedCards.length > 4) {
        updatedCards = updatedCards.slice(0, 4);
      }
      return NextResponse.json({
        updated_cards: updatedCards,
        visual_cues: typeof talkingPoints.visual_cues === 'object' && talkingPoints.visual_cues !== null ? talkingPoints.visual_cues : { growth_factor: 1.0, priority: 0 }
      });
    } else {
      return NextResponse.json({ opening: '', cards: [] });
    }
  } catch (error) {
    console.error('Error generating talking points:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to generate talking points' }, { status: 500 });
  }
}
