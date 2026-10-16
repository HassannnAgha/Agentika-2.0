/**
 * The action classes as the owner sees them on the review screen.
 *
 * PROVISIONAL. The authority is platform/src/bizzii/engine/catalogue.py, which
 * the report describes as 22 classes over 37 handlers but which is still an
 * empty stub. Until it is frozen this list carries only the classes written
 * down somewhere: AC-1 to AC-9 from requirements-v3.md, plus the two the
 * console already shows (record facts, record a lead). Replace this array when
 * the catalogue lands; nothing else on the screen needs to change.
 *
 * The owner never sees a signature tuple (§5, Effect Signature Assignment), so
 * none is stored here. `ceiling` is the best route the class can ever reach,
 * read off its documented signature by the routing rules in
 * gate-methodology.md §7:
 *
 *   escalation  a floor rule fires (R1 public and not fully reversible,
 *               R2 a prospect who has not contacted us), so it is never earned
 *   recall      earnable, but not fully reversible, so it is held briefly first
 *   automatic   earnable and fully reversible
 */

export const AGENTS = {
  operations: { name: 'Operations', needs: ['email'] },
  project: { name: 'Project Management', needs: ['task_tool'] },
  sales: { name: 'Sales', needs: ['email'] },
  marketing: { name: 'Marketing', needs: [] },
};

export const CONNECTIONS = {
  email: {
    name: 'Email account',
    note: "Read the owner's correspondence and send approved replies",
    scopes: ['Read messages and threads', 'Send a message you have approved'],
  },
  task_tool: {
    name: 'Task management tool',
    note: 'Record approved tasks and read their progress back',
    scopes: ['Create and update tasks', 'Read task status changes'],
  },
};

export const CLASSES = [
  { ref: '—', agent: 'operations', name: 'Record facts from correspondence', ceiling: 'automatic' },
  { ref: 'AC-4', agent: 'operations', name: 'Flag a client as at risk', ceiling: 'automatic' },
  { ref: 'AC-5', agent: 'operations', name: 'Update a client record', ceiling: 'automatic' },
  { ref: 'AC-6', agent: 'operations', name: 'Email an existing client', ceiling: 'recall' },
  { ref: 'AC-2', agent: 'project', name: 'Create subtasks', ceiling: 'automatic' },
  { ref: 'AC-1', agent: 'project', name: 'Assign a task', ceiling: 'automatic' },
  { ref: 'AC-3', agent: 'project', name: 'Reassign a stalled task', ceiling: 'automatic' },
  { ref: '—', agent: 'sales', name: 'Record a lead', ceiling: 'automatic' },
  { ref: 'AC-8', agent: 'sales', name: 'Reply to an enquiry', ceiling: 'recall' },
  { ref: 'AC-7', agent: 'sales', name: 'First contact with a prospect', ceiling: 'escalation' },
  { ref: 'AC-9', agent: 'marketing', name: 'Publish content', ceiling: 'escalation' },
];

export const CEILING_TEXT = {
  automatic: 'Can be carried out automatically once earned',
  recall: 'Can run after a short recall window once earned',
  escalation: 'Never earned — held for you by a fixed rule',
};
