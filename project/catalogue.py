"""Action classes. The 22 FYP classes (BIZZII repo, branch ali/gate-core, engine/catalogue.py)
plus ONE hackathon extension, publish_post, which exists only so the floor rules F1 and F3 can be shown.

Signature = (target, effect, blast, verifiability). Declared by developers once, never by the model
and never by the owner. Each class also carries the agent that owns it and the plain-language name the
owner sees. The owner never sees a tuple."""

# class -> (signature, agent, label shown to the owner)
CATALOGUE = {
    # ---- Operations agent
    "read_attached_document":     (("internal", "read", "none", "full"),                  "operations", "Read a document attached to a message"),
    "record_correspondence_fact": (("internal", "create", "none", "full"),                "operations", "Record facts from correspondence"),
    "update_client_record":       (("internal", "modify", "none", "full"),                "operations", "Update a client record"),
    "flag_relationship_risk":     (("internal", "create", "none", "partial"),             "operations", "Flag a client as at risk"),
    "notify_owner_unread_file":   (("internal", "communicate", "one_person", "full"),     "operations", "Tell you about a file it could not read"),
    "reply_to_client":            (("client", "communicate", "one_person", "partial"),    "operations", "Reply to a client"),
    "followup_client_no_reply":   (("client", "communicate", "one_person", "partial"),    "operations", "Chase a client who has not replied"),
    # ---- Project Management agent
    "identify_project":           (("internal", "create", "none", "partial"),             "project", "Spot a new project in correspondence"),
    "decompose_project":          (("internal", "create", "none", "partial"),             "project", "Break a project into subtasks"),
    "assign_subtask":             (("teammate", "create", "one_person", "full"),          "project", "Assign a subtask"),
    "reassign_stalled_task":      (("teammate", "modify", "one_person", "full"),          "project", "Reassign a stalled task"),
    "update_task_record":         (("teammate", "modify", "one_person", "full"),          "project", "Update a task record"),
    "notify_teammate_assignment": (("teammate", "communicate", "one_person", "full"),     "project", "Tell a teammate their work changed"),
    # ---- Sales agent
    "record_lead":                (("internal", "create", "none", "partial"),             "sales", "Record a lead"),
    "enrich_lead_record":         (("internal", "read", "none", "partial"),               "sales", "Add detail to a lead"),
    "propose_campaign":           (("internal", "create", "none", "partial"),             "sales", "Propose an outreach campaign"),
    "send_lead_outreach":         (("prospect", "communicate", "one_person", "none"),     "sales", "First contact with a lead"),
    "send_lead_followup":         (("prospect", "communicate", "one_person", "none"),     "sales", "Second contact with a lead"),
    "reply_to_enquiry":           (("prospect", "communicate", "one_person", "partial"),  "sales", "Reply to an enquiry"),
    # ---- Marketing agent
    "draft_content":              (("internal", "create", "none", "partial"),             "marketing", "Draft content"),
    "retain_approved_content":    (("internal", "create", "none", "full"),                "marketing", "Keep approved content"),
    "update_brand_record":        (("internal", "modify", "none", "full"),                "marketing", "Change voice, positioning or claims"),
    # ---- Hackathon extension (not in the FYP catalogue): shows floor rules F1 + F3
    "publish_post":               (("public", "broadcast", "everyone", "none"),           "marketing", "Publish a post publicly"),
}

HACKATHON_EXTENSIONS = {"publish_post"}
INBOUND = {"reply_to_enquiry"}   # the counterparty wrote first, so floor rule F2 does not apply

AGENT_NAMES = {"operations": "Operations", "project": "Project Management", "sales": "Sales", "marketing": "Marketing"}
# external account each agent depends on (onboarding step 'Connect')
AGENT_NEEDS = {"operations": ["email"], "project": ["task_tool"], "sales": ["email"], "marketing": []}

CLASSES = {c: {"sig": v[0]} for c, v in CATALOGUE.items()}
AGENT_OF = {c: v[1] for c, v in CATALOGUE.items()}
LABEL_OF = {c: v[2] for c, v in CATALOGUE.items()}
