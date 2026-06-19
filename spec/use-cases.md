# Use Cases

## System Setup

| Functionality | Primary actor | Outcome |
| --- | --- | --- |
| Create super admin | Initial operator | Bootstrap global administrator user and role. |
| Seed master access | Super admin | Create/update master modules and permissions. |
| Create company | Super admin | Register tenant company. |
| Create departments | Super/company admin | Create company departments. |
| Create users | Admin | Add users scoped to company/department and optionally email credentials. |
| Assign roles/access | Admin | Attach a role or recompute access. |
| Suspend users/company | Admin | Disable access without deleting historical records. |

## Document Management

| Functionality | Primary actor | Outcome |
| --- | --- | --- |
| Create controlled document | Department user | Pending document record. |
| Upload document file | Department user | Uploaded document revision with file URL and metadata. |
| Review/reject/approve/disapprove | Reviewer/approver | Controlled document state transition and audit metadata. |
| Replace uploaded document | Author | New revision for rejected/disapproved/pending documents. |
| Create change request | Department user | Request tied to document or uploaded document. |
| Create/send forms | Authorized user | Form template and assigned departments. |
| Submit form response | Assigned user | Form record with answers. |
| Verify/comment response | Verifier | Verified/rejected response with comments. |

## Food Safety

| Functionality | Primary actor | Outcome |
| --- | --- | --- |
| Define product | Food safety team | Product specification. |
| Create HACCP team | Food safety lead | Team with members and approval state. |
| Define process | Food safety team | Process flow and process details. |
| Create food safety plan | Food safety team | Plan records linked to product/process. |
| Create decision tree | Food safety team | Decisions used for CCP evaluation. |
| Conduct HACCP | HACCP team | Hazard analysis with severity/probability and controls. |
| Approve/disapprove | Approver | Finalized or returned records. |

## Internal Audit

| Functionality | Primary actor | Outcome |
| --- | --- | --- |
| Register process owner | Audit admin | Process responsibility map. |
| Register auditor | Audit admin | Auditor profile/document record. |
| Create yearly audit plan | Audit admin | High-level audit schedule. |
| Create monthly audit plan | Audit admin | Monthly execution schedule. |
| Create checklist | Auditor | Checklist questions and approval state. |
| Conduct audit | Auditor | Answer set/evidence for checklist. |
| Generate report | Auditor | Report linked to conducted audit. |
| Create corrective action | Responsible owner | Follow-up action linked to report. |

## Competency Management

| Functionality | Primary actor | Outcome |
| --- | --- | --- |
| Add employee | HR/training admin | Employee record and credentials/profile behavior. |
| Add trainer | Training admin | Trainer record and optional processed documents. |
| Add training | Training admin | Training material/library item. |
| Create yearly plan | Training admin | Annual training schedule by month/week. |
| Create monthly plan | Training admin | Concrete monthly training schedule from yearly plan. |
| Assign employee | Training admin | Employee assigned to monthly training. |
| Update status/upload evidence | Trainer/admin | Attendance/completion status and images. |
| Personal requisition | Department user | Request for new/replacement personnel. |

## Maintenance Program

| Functionality | Primary actor | Outcome |
| --- | --- | --- |
| Register machinery | Maintenance admin | Machine asset record. |
| Register equipment | Maintenance admin | Equipment asset record. |
| Create calibration record | Maintenance admin | Calibration certificate/record for equipment. |
| Create preventive maintenance | Maintenance admin | Scheduled/completed PM record. |
| Create work request | Department user | Maintenance request against machine. |
| Accept/reject/complete request | Maintenance user | Work request lifecycle update. |

## Supplier Management

| Functionality | Primary actor | Outcome |
| --- | --- | --- |
| Create supplier | Procurement/quality user | Supplier record and linked user/profile behavior. |
| Read supplier(s) | Authorized user | Supplier details by department or ID. |
| Approve/disapprove supplier | Approver | Supplier qualification status. |
| Delete supplier(s) | Admin | Remove supplier records and related access. |

## Review Meetings

| Functionality | Primary actor | Outcome |
| --- | --- | --- |
| Add meeting participant | Management admin | Participant record and user/profile behavior. |
| Create notification | Meeting organizer | Meeting notice with agenda and participant emails. |
| Create MRM | Meeting organizer | Management review meeting discussion/actions. |
| Read/delete records | Authorized user | Meeting records by department or ID. |

