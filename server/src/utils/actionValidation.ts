// Shared Action Taken input rules (L4-BR-05/06, specification.md section 11 date bounds).

export const DESCRIPTION_MIN = 3;
export const DESCRIPTION_MAX = 1000;
export const RESULT_MAX = 1000;
export const FOLLOW_UP_NOTE_MIN = 3;
export const FOLLOW_UP_NOTE_MAX = 500;
export const ATTACHMENT_NOTES_MAX = 500;
export const CLIENT_REQUEST_ID_MAX = 100;

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const MAX_FUTURE_MS = YEAR_MS;
const MAX_PAST_MS = 5 * YEAR_MS;

export interface ActionInput {
  description: string;
  actionAt: Date;
  assigneeId?: number;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
}

function trimmed(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

// Validates a full action payload. For edits, callers merge the stored action with the request
// body first so cross-field rules (follow-up note) see the final state.
export function validateActionInput(body: any, now: Date = new Date()) {
  const errors: Record<string, string> = {};

  const description = trimmed(body.description);
  if (description.length < DESCRIPTION_MIN || description.length > DESCRIPTION_MAX) {
    errors.description = `Description is required (${DESCRIPTION_MIN}-${DESCRIPTION_MAX} characters).`;
  }

  let actionAt = now;
  if (body.actionAt !== undefined && body.actionAt !== null && body.actionAt !== "") {
    const parsed = new Date(body.actionAt);
    if (Number.isNaN(parsed.getTime())) {
      errors.actionAt = "Action date/time is not a valid date.";
    } else if (parsed.getTime() > now.getTime() + MAX_FUTURE_MS || parsed.getTime() < now.getTime() - MAX_PAST_MS) {
      errors.actionAt = "Action date/time must be within 5 years back and 1 year ahead.";
    } else {
      actionAt = parsed;
    }
  }

  let assigneeId: number | undefined;
  if (body.assigneeId !== undefined && body.assigneeId !== null) {
    if (typeof body.assigneeId !== "number" || !Number.isInteger(body.assigneeId) || body.assigneeId < 1) {
      errors.assigneeId = "Assignee must be an active IT Staff member or Administrator.";
    } else {
      assigneeId = body.assigneeId;
    }
  }

  let followUpRequired = false;
  if (body.followUpRequired !== undefined && body.followUpRequired !== null) {
    if (typeof body.followUpRequired !== "boolean") {
      errors.followUpRequired = "Follow-up required must be true or false.";
    } else {
      followUpRequired = body.followUpRequired;
    }
  }

  let followUpNote: string | null = null;
  if (followUpRequired) {
    const note = trimmed(body.followUpNote);
    if (note.length < FOLLOW_UP_NOTE_MIN || note.length > FOLLOW_UP_NOTE_MAX) {
      errors.followUpNote = `Follow-up note is required when follow-up is needed (${FOLLOW_UP_NOTE_MIN}-${FOLLOW_UP_NOTE_MAX} characters).`;
    } else {
      followUpNote = note;
    }
  }

  let attachmentNotes: string | null = null;
  if (body.attachmentNotes !== undefined && body.attachmentNotes !== null) {
    if (typeof body.attachmentNotes !== "string" || body.attachmentNotes.trim().length > ATTACHMENT_NOTES_MAX) {
      errors.attachmentNotes = `Attachment notes must be at most ${ATTACHMENT_NOTES_MAX} characters.`;
    } else {
      attachmentNotes = body.attachmentNotes.trim() || null;
    }
  }

  const value: ActionInput = { description, actionAt, assigneeId, followUpRequired, followUpNote, attachmentNotes };
  return { errors, value };
}

// Returns an error message, or undefined when the completion result is valid (L4-BR-08).
export function validateActionResult(result: unknown): string | undefined {
  const value = trimmed(result);
  if (value.length < 1 || value.length > RESULT_MAX) {
    return `Result is required to complete an action (1-${RESULT_MAX} characters).`;
  }
  return undefined;
}

// Returns an error message, or undefined when the optional idempotency key is acceptable.
export function validateClientRequestId(clientRequestId: unknown): string | undefined {
  if (clientRequestId === undefined || clientRequestId === null) return undefined;
  if (typeof clientRequestId !== "string" || clientRequestId.trim().length < 1 || clientRequestId.length > CLIENT_REQUEST_ID_MAX) {
    return `clientRequestId must be a non-empty string of at most ${CLIENT_REQUEST_ID_MAX} characters.`;
  }
  return undefined;
}

// Returns the integer expectedVersion, or undefined when it is missing/invalid (L4-BR-15).
export function parseExpectedVersion(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 ? value : undefined;
}
