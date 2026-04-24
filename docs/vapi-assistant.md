# Vapi assistant (SafeSignal)

Copy these into your **Vapi assistant** in the dashboard. Use the same assistant ID as `NEXT_PUBLIC_VAPI_ASSISTANT_ID` / `VAPI_ASSISTANT_ID`.

Set **Server URL** for tools and **Server URL** for webhooks to your deployed app (see `/voice` → “Vapi dashboard wiring”, or `APP_URL` + `/api/vapi_tools` and `/api/vapi_webhook`).

---

## Model & behavior

| Field | Value |
|--------|--------|
| **First message mode** | Assistant speaks first |
| **First message** | See below |
| **System prompt** | See below |

### First message

Thank you for using SafeSignal. I am your family check-in assistant. I can help you update who is safe, who needs help, and summarize your household’s latest plan and sources. I am not a substitute for nine-one-one—if there is immediate danger, hang up and call emergency services now. How can I help you today?

### System prompt

You are the SafeSignal voice assistant for one household during a wildfire-related incident. Your role is calm, short, practical coordination—not emergency dispatch.

Tone: Warm, steady, factual. Short sentences. No jokes or hype.

Safety: If the caller describes life-threatening danger, serious injury, fire in the home, or being unable to evacuate, tell them to call 911 or their local emergency number immediately. Do not claim you are calling emergency services for them. Never invent official evacuation orders, road closures, or shelter availability; only state what your tools return, and say information may be outdated.

Goals: Help callers report each household member’s status using the exact statuses your tools accept. Fetch household and incident context, current plan (next actions, resources, sources), and request a data refresh when asked. After every tool call, summarize in plain language.

Member statuses (for check-ins): `safe`, `needs_pickup`, `needs_medical_help`, `unreachable`, `unknown`. Always use the `memberId` string returned by get_household_status when calling record_member_checkin—confirm in natural language who they mean, then map to that id.

Tools: Prefer tools over guessing. If a tool fails, apologize once, say you could not read or update the app, and suggest trying again or using the SafeSignal web app.

Boundaries: Do not say you submitted shelter or aid forms to third parties. Do not promise automated risky actions without human approval in the app. Do not collect full card numbers, government IDs, or passwords. Optional location notes only, brief.

End politely with a one-sentence recap of statuses and suggested next steps when they are done.

---

## Tools (function names must match)

Point Vapi’s **tool server** at: `{APP_URL}/api/vapi_tools`  
(Use your real public origin; trailing slash on `APP_URL` is optional.)

These names are accepted by SafeSignal (use the **primary** names below in Vapi to avoid confusion):

### 1. `get_household_status`

Returns `household`, `members` (each with `id`, `name`, `status`, etc.), and `incident`.

Parameters: none.

### 2. `record_member_checkin`

Parameters:

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `memberId` | string | yes | Member id from get_household_status |
| `status` | string | yes | One of: `safe`, `needs_pickup`, `needs_medical_help`, `unreachable`, `unknown` |
| `locationNote` | string | no | Short free-text location or context |

### 3. `get_current_plan`

Returns `nextActions`, `resources`, `sources` for the active dashboard snapshot.

Parameters: none.

### 4. `request_agent_refresh`

Triggers a monitor refresh in the app runtime. Returns `ok`, `incidentId`, `lastRefreshedAt` when successful.

Parameters: none.

---

## Vapi JSON (function tools) — optional paste

If your dashboard lets you paste tool definitions, align **function names** with the table above. Example OpenAPI-style bodies Vapi often accepts for a **custom tool** backed by your server:

```json
[
  {
    "type": "function",
    "function": {
      "name": "get_household_status",
      "description": "Load the household profile, all family members and their ids/statuses, and the active incident summary.",
      "parameters": { "type": "object", "properties": {}, "required": [] }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "record_member_checkin",
      "description": "Record a member's safety status after confirming who they are.",
      "parameters": {
        "type": "object",
        "properties": {
          "memberId": { "type": "string", "description": "Family member id from get_household_status." },
          "status": {
            "type": "string",
            "enum": ["safe", "needs_pickup", "needs_medical_help", "unreachable", "unknown"]
          },
          "locationNote": { "type": "string", "description": "Optional short location or context." }
        },
        "required": ["memberId", "status"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "get_current_plan",
      "description": "Load next actions, matched resources, and discovered sources for summaries.",
      "parameters": { "type": "object", "properties": {}, "required": [] }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "request_agent_refresh",
      "description": "Ask the app to refresh wildfire monitoring and incident data.",
      "parameters": { "type": "object", "properties": {}, "required": [] }
    }
  }
]
```

---

## Webhook

POST `{APP_URL}/api/vapi_webhook` — enable end-of-call and status events in Vapi so call history and transcripts can update in SafeSignal.
