# Sequence Diagrams

## Login And Access Payload

```mermaid
sequenceDiagram
  participant Client
  participant UserController
  participant UserService
  participant DB as MongoDB
  Client->>UserController: POST /users/login
  UserController->>UserService: userLogin(userName, password)
  UserService->>DB: Find user by userName and populate company/department/role
  UserService->>UserService: Validate password, suspension, company status
  UserService->>UserService: Build access payload from role modules and derived modules
  UserService-->>Client: user fields + token + access
```

## Protected Endpoint

```mermaid
sequenceDiagram
  participant Client
  participant Guards
  participant Controller
  participant Service
  participant DB
  Client->>Guards: Request with Bearer token
  Guards->>DB: Load user and role
  Guards->>Guards: Check module and permission key
  Guards->>Controller: Allow request
  Controller->>Service: Delegate DTO/params
  Service->>DB: Business query/mutation
  DB-->>Service: Saved/read document
  Service-->>Client: API response
```

## Generic Approval Workflow

```mermaid
stateDiagram-v2
  [*] --> Pending: create/update
  Pending --> Reviewed: review
  Reviewed --> Approved: approve
  Reviewed --> Rejected: reject
  Pending --> Disapproved: disapprove
  Rejected --> Pending: replace/update/resubmit
  Disapproved --> Pending: update/resubmit when module allows
  Approved --> [*]
```

Used by documents, uploaded documents, forms, change requests, food safety records, HACCP records, checklist records, suppliers, and related approval-capable modules. Some modules use a simpler `Pending -> Approved/Disapproved` flow.

## Document Control

```mermaid
sequenceDiagram
  participant Author
  participant API
  participant DocService
  participant Storage as Cloudinary/File Buffer
  participant DB
  Author->>API: Create document/upload/form/change request
  API->>DocService: Validate DTO and file
  DocService->>Storage: Upload or process PDF when needed
  DocService->>DB: Save Pending record
  Reviewer->>API: Review or reject
  API->>DocService: Update status and comments
  Approver->>API: Approve or disapprove
  DocService->>DB: Persist final decision metadata
```

## Food Safety HACCP

```mermaid
flowchart TD
  Product[Product definition] --> Team[HACCP team]
  Product --> Process[Process flow and details]
  Process --> FSP[Food safety plan]
  Process --> Decision[Decision tree]
  Team --> HACCP[Conduct HACCP]
  Decision --> HACCP
  FSP --> HACCP
  HACCP --> Approval[Approve or disapprove]
```

## Internal Audit

```mermaid
flowchart TD
  Owners[Process owners] --> YearPlan[Yearly audit plan]
  Auditors[Internal auditors] --> MonthPlan[Monthly audit plan]
  YearPlan --> MonthPlan
  Checklist[Checklist] --> Conduct[Conduct audits]
  MonthPlan --> Conduct
  Conduct --> Reports[Reports]
  Reports --> Corrective[Corrective actions]
```

## Maintenance

```mermaid
flowchart TD
  Machines[Machines] --> PM[Preventive maintenance records]
  Machines --> WR[Work requests]
  WR --> Accept[Accept]
  WR --> Reject[Reject]
  Accept --> Complete[Complete]
  Equipment[Equipment] --> Calibration[Calibration records]
```

## Competency Management

```mermaid
flowchart TD
  Employees[Employees] --> Requisition[Personal requisitions]
  Trainers[Trainers] --> Training[Training library]
  Training --> Yearly[Yearly training plan]
  Yearly --> Monthly[Monthly training plan]
  Monthly --> Assign[Assign employees]
  Assign --> Status[Update training status]
  Status --> Evidence[Upload images/evidence]
```

## Review Meetings

```mermaid
flowchart TD
  Participants[Meeting participants] --> Notification[Meeting notification]
  Notification --> Email[Email attendees]
  Notification --> MRM[MRM record]
  MRM --> Agenda[Agenda discussion/actions]
  MRM --> Followup[Email discussion updates]
```

