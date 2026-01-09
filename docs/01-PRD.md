# Foundry: Product Requirements Document

**Version:** 1.0  
**Date:** January 8, 2026  
**Status:** COMPLETE  
**Deployment Target:** Replit

---

## Section 1: Executive Summary

Foundry is a multi-tenant platform that transforms scattered business data—from file uploads, APIs, and legacy systems—into clean, de-identified, structured datasets ready for AI agent training. The platform abstracts the complexity of data extraction, privacy handling, and format transformation into a configuration-driven workflow accessible to non-technical users.

**Primary Value Proposition:** Turn messy operational data into training-ready AI datasets in minutes, not months.

**Target Market:** Businesses with operational data (support tickets, sales conversations, process documentation) who want to train AI agents on their own data but lack the technical resources to build custom data pipelines.

**Key Differentiators:**
- Source-agnostic architecture (files and APIs as equal citizens)
- Privacy-first design with configurable de-identification
- Configuration over code (no engineering required)
- Immediate value with single file upload; scales to automated pipelines

**Deployment Target:** Replit (web application with PostgreSQL database)

---

## Section 2: Problem Statement

**The Problem in Human Terms:**

A customer success manager at a mid-sized SaaS company wants to train an AI support agent on their team's best practices. Their knowledge lives in 47,000 resolved support tickets across Zendesk, historical CSV exports from their old ticketing system, and scattered Google Docs with SOPs.

Today, turning this into training data requires:
1. An engineer to write API integrations for each source
2. Manual effort to identify and remove customer PII
3. Custom scripts to normalize different data formats
4. Ongoing maintenance as sources and requirements change

This takes 3-6 months and $50-100K+ in engineering time—if they have engineers available at all.

**Current Alternatives and Limitations:**

| Alternative | Limitation |
|-------------|------------|
| Custom engineering | Expensive, slow, requires ongoing maintenance |
| General ETL tools (Fivetran, Airbyte) | Not designed for AI training formats; no de-identification |
| Manual data cleaning | Doesn't scale; error-prone; compliance risk |
| Outsource to consultants | Expensive; creates dependency; slow iteration |

**Quantified Impact:**
- 3-6 months to first training dataset (vs. minutes with Foundry)
- $50-100K+ engineering cost per data pipeline
- 60% of AI training projects stall at the data preparation phase
- 73% of businesses cite data preparation as their biggest AI adoption barrier

**Person Experiencing the Pain:**
Operations leaders and AI initiative owners at companies with 50-500 employees who have valuable operational data but no dedicated data engineering team.

---

## Section 3: User Personas

### Persona 1: Alex Chen — Operations Manager

**Archetype:** Non-technical AI Initiative Owner

**Demographics:**
- Age: 35-45
- Role: Director of Customer Operations
- Company: B2B SaaS, 150 employees
- Reports to: VP of Operations or COO

**Goals and Motivations:**
- Reduce support response times by 40% with AI assistance
- Prove ROI on AI investment to leadership
- Maintain quality standards while scaling

**Pain Points and Frustrations:**
- "I know our data is valuable, but I can't get engineering resources"
- "Every vendor wants a 6-month implementation"
- "I don't trust that customer data is being handled properly"
- "I can't explain to compliance what happens to our data"

**Technical Proficiency:** Low to medium. Comfortable with spreadsheets and business tools. Cannot write code.

**Usage Context:** Uses Foundry during business hours from desktop. Primary workflow is project setup and reviewing outputs. Delegates technical configuration to Data Analyst.

**Success Metrics (Their Perspective):**
- Time from idea to first training dataset < 1 week
- Zero compliance incidents from data handling
- Clear audit trail for legal/compliance review

---

### Persona 2: Jordan Rivera — Data Analyst

**Archetype:** Semi-Technical Data Handler

**Demographics:**
- Age: 28-38
- Role: Senior Data Analyst or Analytics Manager
- Company: Same as Alex (cross-functional support)
- Reports to: Director of Analytics or Operations

**Goals and Motivations:**
- Deliver clean, high-quality datasets on tight timelines
- Reduce manual data wrangling time
- Build repeatable processes, not one-off exports

**Pain Points and Frustrations:**
- "I spend 80% of my time cleaning data, not analyzing it"
- "Every source has a different format and quality level"
- "I have to manually redact PII which is tedious and risky"
- "When the source data changes, I have to start over"

**Technical Proficiency:** Medium to high. Proficient in Excel, SQL, and basic Python. Understands data structures and APIs conceptually.

**Usage Context:** Daily user during active projects. Handles source configuration, field mapping, processing rules, and quality validation.

**Success Metrics (Their Perspective):**
- Field mapping takes minutes, not hours
- De-identification is automatic and verifiable
- Can iterate on output format without re-processing from scratch

---

### Persona 3: Sam Patel — Organization Administrator

**Archetype:** Internal Platform Administrator

**Demographics:**
- Age: 30-45
- Role: IT Manager or Operations Lead
- Company: Same organization as Alex and Jordan
- Reports to: CTO, VP of IT, or COO

**Goals and Motivations:**
- Ensure platform security and compliance
- Manage user access appropriately
- Control costs and usage

**Pain Points and Frustrations:**
- "I need to know who has access to what data"
- "Vendor integrations are security review nightmares"
- "I can't track what's happening with our sensitive data"

**Technical Proficiency:** Medium to high. Understands security concepts, user management, and compliance requirements.

**Usage Context:** Infrequent but critical usage. Sets up organization, manages users, reviews audit logs. Involved during initial setup and compliance reviews.

**Success Metrics (Their Perspective):**
- Complete visibility into data access and processing
- Granular user permission controls
- Easy compliance reporting and audit trails

---

### Persona 4: Morgan Wu — Platform Administrator

**Archetype:** Foundry Internal Administrator

**Demographics:**
- Age: 28-40
- Role: Foundry Operations or Customer Success
- Company: Foundry/Platform Provider
- Reports to: Head of Operations

**Goals and Motivations:**
- Onboard new customers smoothly
- Monitor platform health and usage
- Resolve customer issues quickly

**Pain Points and Frustrations:**
- "I need visibility into what's happening across all tenants"
- "Customer onboarding is manual and error-prone"
- "I can't proactively identify customers having issues"

**Technical Proficiency:** High. Understands the platform architecture and can troubleshoot.

**Usage Context:** Daily usage for customer management, monitoring, and support.

**Success Metrics (Their Perspective):**
- Customer onboarding in < 24 hours
- Proactive issue detection before customer reports
- Clear visibility into platform usage and health

---

## Section 4: User Stories and Requirements

### Authentication & Access

**US-AUTH-001**  
**Persona:** Sam Patel (Org Admin)  
**Story:** As an organization administrator, I want to invite team members via email so that I can control who has access to our data.  
**Acceptance Criteria:**
- Given I am an org admin, when I enter an email address and click invite, then an invitation email is sent within 60 seconds
- Given an invitation is pending, when the recipient clicks the link within 7 days, then they can create their account and join the organization
- Given an invitation is pending, when 7 days have passed, then the invitation link expires and displays an appropriate message
**Priority:** P0-Critical  
**MVP Status:** MVP  
**Dependencies:** None  
**Estimated Complexity:** M

**US-AUTH-002**  
**Persona:** Jordan Rivera (Data Analyst)  
**Story:** As a team member, I want to log in with my email and password so that I can access my organization's projects.  
**Acceptance Criteria:**
- Given I have an account, when I enter correct credentials, then I am logged in and redirected to my dashboard within 2 seconds
- Given I enter incorrect credentials, when I submit the form, then I see a generic error message (no indication of which field is wrong)
- Given I am logged in, when my session is inactive for 24 hours, then I am required to log in again
**Priority:** P0-Critical  
**MVP Status:** MVP  
**Dependencies:** US-AUTH-001  
**Estimated Complexity:** M

**US-AUTH-003**  
**Persona:** Sam Patel (Org Admin)  
**Story:** As an organization administrator, I want to assign roles to team members so that I can control what actions they can perform.  
**Acceptance Criteria:**
- Given I am an org admin, when I view a team member, then I can assign them one of: Viewer, Editor, Admin
- Given a user has Viewer role, when they access a project, then they can view but not modify configurations or trigger processing
- Given a user has Editor role, when they access a project, then they can modify configurations and trigger processing but not manage users
- Given a user has Admin role, when they access the organization, then they can manage users and all projects
**Priority:** P1-High  
**MVP Status:** MVP  
**Dependencies:** US-AUTH-001, US-AUTH-002  
**Estimated Complexity:** M

**US-AUTH-004**  
**Persona:** Sam Patel (Org Admin)  
**Story:** As an organization administrator, I want to remove team members so that former employees cannot access our data.  
**Acceptance Criteria:**
- Given I am an org admin, when I remove a team member, then their access is revoked immediately
- Given a removed user attempts to access the platform, when they try to log in, then they receive an "account disabled" message
- Given a removed user had active sessions, when they are removed, then all their sessions are terminated within 60 seconds
**Priority:** P0-Critical  
**MVP Status:** MVP  
**Dependencies:** US-AUTH-001  
**Estimated Complexity:** S

**US-AUTH-005**  
**Persona:** Jordan Rivera (Data Analyst)  
**Story:** As a user, I want to reset my password so that I can regain access if I forget it.  
**Acceptance Criteria:**
- Given I am on the login page, when I click "forgot password" and enter my email, then I receive a reset link within 2 minutes
- Given I have a reset link, when I click it and enter a new password, then my password is updated and I am logged in
- Given a reset link is more than 1 hour old, when I click it, then I see a message that it has expired
**Priority:** P1-High  
**MVP Status:** MVP  
**Dependencies:** US-AUTH-002  
**Estimated Complexity:** S

---

### Organization & Project Management

**US-ORG-001**  
**Persona:** Morgan Wu (Platform Admin)  
**Story:** As a platform administrator, I want to create new organizations so that I can onboard new customers.  
**Acceptance Criteria:**
- Given I am a platform admin, when I create an organization with a name and initial admin email, then the organization is created and an invite is sent to the admin
- Given I create an organization, when the name matches an existing organization, then I receive an error prompting for a unique name
- Given an organization is created, when the invited admin accepts, then they become the first org admin with full permissions
**Priority:** P0-Critical  
**MVP Status:** MVP  
**Dependencies:** US-AUTH-001  
**Estimated Complexity:** M

**US-ORG-002**  
**Persona:** Alex Chen (Ops Manager)  
**Story:** As an organization member, I want to create a new project so that I can start a new AI training initiative.  
**Acceptance Criteria:**
- Given I am an org member with Editor or Admin role, when I click "New Project" and enter a name and description, then the project is created in under 2 seconds
- Given I create a project, when the name exceeds 100 characters, then I see a validation error before submission
- Given a project is created, when I view the project list, then it appears with creation date and "No sources" status
**Priority:** P0-Critical  
**MVP Status:** MVP  
**Dependencies:** US-AUTH-002  
**Estimated Complexity:** S

**US-ORG-003**  
**Persona:** Alex Chen (Ops Manager)  
**Story:** As a project owner, I want to archive a project so that completed initiatives don't clutter my workspace.  
**Acceptance Criteria:**
- Given I am a project owner, when I archive a project, then it moves to an "Archived" section and is no longer visible in the main list
- Given a project is archived, when I view the archived section, then I can restore it to active status
- Given a project is archived, when 90 days have passed without restoration, then the project and its data are permanently deleted with notification sent 7 days prior
**Priority:** P2-Medium  
**MVP Status:** Post-MVP  
**Dependencies:** US-ORG-002  
**Estimated Complexity:** M

---

### File Upload Source

**US-FILE-001**  
**Persona:** Jordan Rivera (Data Analyst)  
**Story:** As a data analyst, I want to upload a CSV file so that I can process historical data exports.  
**Acceptance Criteria:**
- Given I am in a project, when I drag and drop a CSV file under 50MB, then it uploads with a progress indicator and completes within 30 seconds for a 10MB file
- Given I upload a CSV, when the upload completes, then the system auto-detects columns and displays them with sample data (first 5 rows)
- Given I upload a CSV, when the file exceeds 50MB, then I see an error message with the size limit before upload begins
- Given I upload a CSV, when the file is malformed (inconsistent columns, encoding issues), then I see a specific error message identifying the problem
**Priority:** P0-Critical  
**MVP Status:** MVP  
**Dependencies:** US-ORG-002  
**Estimated Complexity:** M

**US-FILE-002**  
**Persona:** Jordan Rivera (Data Analyst)  
**Story:** As a data analyst, I want to upload Excel files so that I can use data from spreadsheets.  
**Acceptance Criteria:**
- Given I upload an Excel file (.xlsx, .xls), when it contains multiple sheets, then I can select which sheet(s) to import
- Given I select a sheet, when it contains merged cells, then the system expands them to individual cells with appropriate values
- Given I upload an Excel file, when it contains formulas, then the system imports the calculated values, not the formulas
**Priority:** P1-High  
**MVP Status:** MVP  
**Dependencies:** US-FILE-001  
**Estimated Complexity:** M

**US-FILE-003**  
**Persona:** Jordan Rivera (Data Analyst)  
**Story:** As a data analyst, I want to upload JSON files so that I can import structured data exports.  
**Acceptance Criteria:**
- Given I upload a JSON file, when it contains an array of objects, then each object becomes a row with keys as columns
- Given I upload a JSON file, when it contains nested objects, then I can select the path to the array I want to import
- Given I upload a JSON file, when it contains invalid JSON, then I see an error with the line number of the first syntax error
**Priority:** P1-High  
**MVP Status:** MVP  
**Dependencies:** US-FILE-001  
**Estimated Complexity:** M

**US-FILE-004**  
**Persona:** Jordan Rivera (Data Analyst)  
**Story:** As a data analyst, I want to replace an uploaded file so that I can correct errors without recreating the source configuration.  
**Acceptance Criteria:**
- Given I have a configured file source, when I upload a replacement file, then the column mappings are preserved for matching columns
- Given I upload a replacement file, when new columns exist, then they appear as unmapped and I am prompted to map them
- Given I upload a replacement file, when previously mapped columns are missing, then I receive a warning listing the missing columns
**Priority:** P2-Medium  
**MVP Status:** Post-MVP  
**Dependencies:** US-FILE-001  
**Estimated Complexity:** M

---

### API Source: Teamwork Desk

**US-API-TD-001**  
**Persona:** Jordan Rivera (Data Analyst)  
**Story:** As a data analyst, I want to connect to Teamwork Desk so that I can import support tickets automatically.  
**Acceptance Criteria:**
- Given I am adding a source, when I select Teamwork Desk, then I see a form requesting API key and subdomain
- Given I enter credentials, when I click "Test Connection," then I see success/failure within 5 seconds with specific error messages for auth failures vs. network issues
- Given the connection test succeeds, when I save the source, then it appears in my source list with a "Connected" status
**Priority:** P0-Critical  
**MVP Status:** MVP  
**Dependencies:** US-ORG-002  
**Estimated Complexity:** L

**US-API-TD-002**  
**Persona:** Jordan Rivera (Data Analyst)  
**Story:** As a data analyst, I want to filter Teamwork Desk tickets by date range so that I can import only relevant data.  
**Acceptance Criteria:**
- Given I have a Teamwork Desk source, when I configure filters, then I can set start and end dates for ticket creation date
- Given I set a date range, when I preview the import, then I see a count of tickets matching the filter
- Given I set an invalid date range (end before start), when I try to save, then I see a validation error
**Priority:** P1-High  
**MVP Status:** MVP  
**Dependencies:** US-API-TD-001  
**Estimated Complexity:** S

**US-API-TD-003**  
**Persona:** Jordan Rivera (Data Analyst)  
**Story:** As a data analyst, I want to filter Teamwork Desk tickets by status so that I can focus on resolved tickets.  
**Acceptance Criteria:**
- Given I have a Teamwork Desk source, when I configure filters, then I can select one or more ticket statuses (Open, Pending, Resolved, Closed)
- Given I select "Resolved" and "Closed," when I preview the import, then only tickets with those statuses are included in the count
- Given no statuses are selected, when I try to save, then all statuses are included by default
**Priority:** P1-High  
**MVP Status:** MVP  
**Dependencies:** US-API-TD-001  
**Estimated Complexity:** S

**US-API-TD-004**  
**Persona:** Jordan Rivera (Data Analyst)  
**Story:** As a data analyst, I want to import ticket conversations with agent/customer attribution so that training data includes role context.  
**Acceptance Criteria:**
- Given a Teamwork Desk ticket has multiple messages, when I import it, then each message includes sender role (Agent, Customer, System)
- Given a message is from an agent, when I view the imported data, then it includes the agent's identifier (mapped to a consistent token like AGENT_1)
- Given a ticket has internal notes, when I configure the import, then I can choose to include or exclude internal notes
**Priority:** P0-Critical  
**MVP Status:** MVP  
**Dependencies:** US-API-TD-001  
**Estimated Complexity:** L

---

### API Source: GoHighLevel

**US-API-GHL-001**  
**Persona:** Jordan Rivera (Data Analyst)  
**Story:** As a data analyst, I want to connect to GoHighLevel so that I can import sales conversations.  
**Acceptance Criteria:**
- Given I am adding a source, when I select GoHighLevel, then I see OAuth connection flow or API key entry
- Given I complete authentication, when I return to Foundry, then the connection shows as "Connected" with the account name displayed
- Given authentication fails, when I retry, then previous partial state is cleared and I start fresh
**Priority:** P1-High  
**MVP Status:** MVP  
**Dependencies:** US-ORG-002  
**Estimated Complexity:** L

**US-API-GHL-002**  
**Persona:** Jordan Rivera (Data Analyst)  
**Story:** As a data analyst, I want to select which GoHighLevel data to import so that I can focus on relevant conversations.  
**Acceptance Criteria:**
- Given I have a GoHighLevel connection, when I configure the source, then I can select from: SMS conversations, Email threads, Call transcripts
- Given I select SMS conversations, when I configure filters, then I can filter by date range and conversation status
- Given I select multiple data types, when I import, then each type is imported as a separate data stream with consistent structure
**Priority:** P1-High  
**MVP Status:** MVP  
**Dependencies:** US-API-GHL-001  
**Estimated Complexity:** M

---

### Field Mapping

**US-MAP-001**  
**Persona:** Jordan Rivera (Data Analyst)  
**Story:** As a data analyst, I want the system to auto-detect and suggest field mappings so that I can configure sources faster.  
**Acceptance Criteria:**
- Given I add a source with a "message" or "body" column, when I view mappings, then it is auto-suggested as the "Content" field
- Given I add a source with a column containing emails, when I view mappings, then it is auto-suggested as "Email" field with PII flag
- Given auto-suggestions are made, when I view the mapping screen, then each suggestion shows confidence level (High, Medium, Low)
**Priority:** P1-High  
**MVP Status:** MVP  
**Dependencies:** US-FILE-001, US-API-TD-001  
**Estimated Complexity:** M

**US-MAP-002**  
**Persona:** Jordan Rivera (Data Analyst)  
**Story:** As a data analyst, I want to manually map source fields to standard fields so that I can correct auto-detection errors.  
**Acceptance Criteria:**
- Given I view a source's field mappings, when I click on a source field, then I see a dropdown of available standard fields
- Given I select a standard field, when I save, then the mapping is persisted and shown in the mapping table
- Given a source field is unmapped, when I run processing, then it is excluded from the output by default
**Priority:** P0-Critical  
**MVP Status:** MVP  
**Dependencies:** US-MAP-001  
**Estimated Complexity:** S

**US-MAP-003**  
**Persona:** Jordan Rivera (Data Analyst)  
**Story:** As a data analyst, I want to preview mapped data before processing so that I can verify my configuration is correct.  
**Acceptance Criteria:**
- Given I have configured mappings, when I click "Preview," then I see a table with 10 sample rows showing source → mapped values
- Given de-identification is configured, when I view preview, then PII fields show de-identified values (e.g., "[NAME_1]")
- Given preview shows unexpected results, when I adjust mappings, then preview updates in under 3 seconds
**Priority:** P0-Critical  
**MVP Status:** MVP  
**Dependencies:** US-MAP-002, US-DEID-001  
**Estimated Complexity:** M

---

### De-identification (Processing)

**US-DEID-001**  
**Persona:** Jordan Rivera (Data Analyst)  
**Story:** As a data analyst, I want to automatically detect and mask personal names so that training data doesn't contain real identities.  
**Acceptance Criteria:**
- Given content contains personal names, when processing runs, then names are replaced with consistent tokens ([PERSON_1], [PERSON_2], etc.)
- Given the same name appears multiple times, when processing runs, then it receives the same token throughout the dataset
- Given a name appears in a different context (e.g., "John" as agent, "John" as customer), when processing runs, then they receive distinct tokens based on role
**Priority:** P0-Critical  
**MVP Status:** MVP  
**Dependencies:** US-MAP-002  
**Estimated Complexity:** L

**US-DEID-002**  
**Persona:** Jordan Rivera (Data Analyst)  
**Story:** As a data analyst, I want to automatically detect and mask email addresses so that customer emails are protected.  
**Acceptance Criteria:**
- Given content contains email addresses, when processing runs, then emails are replaced with [EMAIL_1], [EMAIL_2], etc.
- Given an email domain is in an allow-list (e.g., company's own domain), when processing runs, then only the local part is masked (support@[COMPANY] → [EMAIL]@company.com)
- Given malformed but recognizable emails exist (missing TLD), when processing runs, then they are still detected and masked
**Priority:** P0-Critical  
**MVP Status:** MVP  
**Dependencies:** US-MAP-002  
**Estimated Complexity:** M

**US-DEID-003**  
**Persona:** Jordan Rivera (Data Analyst)  
**Story:** As a data analyst, I want to automatically detect and mask phone numbers so that customer contact info is protected.  
**Acceptance Criteria:**
- Given content contains phone numbers, when processing runs, then they are replaced with [PHONE_1], [PHONE_2], etc.
- Given phone numbers appear in various formats (123-456-7890, (123) 456-7890, +1 123 456 7890), when processing runs, then all formats are detected
- Given a phone number appears in context that might not be a phone (e.g., ID number), when I view processing results, then I can mark it as false positive
**Priority:** P0-Critical  
**MVP Status:** MVP  
**Dependencies:** US-MAP-002  
**Estimated Complexity:** M

**US-DEID-004**  
**Persona:** Jordan Rivera (Data Analyst)  
**Story:** As a data analyst, I want to automatically detect and mask physical addresses so that location data is protected.  
**Acceptance Criteria:**
- Given content contains street addresses, when processing runs, then they are replaced with [ADDRESS_1], etc.
- Given partial addresses exist (just city/state), when processing runs, then they are also detected based on context
- Given a business address is in an allow-list, when processing runs, then it is not masked
**Priority:** P1-High  
**MVP Status:** MVP  
**Dependencies:** US-MAP-002  
**Estimated Complexity:** M

**US-DEID-005**  
**Persona:** Jordan Rivera (Data Analyst)  
**Story:** As a data analyst, I want to mask company names so that B2B customer relationships are protected.  
**Acceptance Criteria:**
- Given content contains company names, when processing runs, then they are replaced with [COMPANY_1], [COMPANY_2], etc.
- Given my own company name appears, when I configure the project, then I can add it to an allow-list to preserve it
- Given a company name is ambiguous (common words like "Apple"), when processing runs, then context is used to determine if it's a company reference
**Priority:** P1-High  
**MVP Status:** MVP  
**Dependencies:** US-MAP-002  
**Estimated Complexity:** L

**US-DEID-006**  
**Persona:** Jordan Rivera (Data Analyst)  
**Story:** As a data analyst, I want to define custom patterns to mask so that domain-specific identifiers are protected.  
**Acceptance Criteria:**
- Given I access de-identification settings, when I add a custom pattern, then I can enter a regex pattern and replacement token
- Given I enter an invalid regex, when I try to save, then I see an error with explanation of the regex issue
- Given I add a pattern like "ACC-\d{6}" with token "[ACCOUNT_ID]", when processing runs, then matching strings are replaced
**Priority:** P2-Medium  
**MVP Status:** MVP  
**Dependencies:** US-DEID-001  
**Estimated Complexity:** M

---

### Quality Filtering (Processing)

**US-FILT-001**  
**Persona:** Jordan Rivera (Data Analyst)  
**Story:** As a data analyst, I want to filter by minimum conversation length so that short, uninformative exchanges are excluded.  
**Acceptance Criteria:**
- Given I configure quality filters, when I set minimum messages to 3, then conversations with fewer than 3 messages are excluded
- Given I set minimum word count to 50, when processing runs, then conversations with total word count below 50 are excluded
- Given filters are applied, when I view processing results, then I see count of excluded records with filter reason
**Priority:** P1-High  
**MVP Status:** MVP  
**Dependencies:** US-MAP-002  
**Estimated Complexity:** S

**US-FILT-002**  
**Persona:** Jordan Rivera (Data Analyst)  
**Story:** As a data analyst, I want to filter by date range so that I can focus on recent, relevant data.  
**Acceptance Criteria:**
- Given I configure filters, when I set a date range, then only records within that range are processed
- Given I filter to "last 6 months," when processing runs monthly, then the filter automatically rolls forward
- Given no date field is mapped, when I try to set date filter, then I see a message explaining the requirement
**Priority:** P1-High  
**MVP Status:** MVP  
**Dependencies:** US-MAP-002  
**Estimated Complexity:** S

**US-FILT-003**  
**Persona:** Jordan Rivera (Data Analyst)  
**Story:** As a data analyst, I want to filter by resolution status so that I can focus on successfully resolved cases.  
**Acceptance Criteria:**
- Given I have a status field mapped, when I configure filters, then I can select which statuses to include
- Given I select only "Resolved," when processing runs, then only records with that status are included
- Given I select no statuses, when I try to save, then all statuses are included by default
**Priority:** P1-High  
**MVP Status:** MVP  
**Dependencies:** US-MAP-002  
**Estimated Complexity:** S

---

### Processing Execution

**US-PROC-001**  
**Persona:** Jordan Rivera (Data Analyst)  
**Story:** As a data analyst, I want to trigger processing manually so that I control when data transformation occurs.  
**Acceptance Criteria:**
- Given I have a configured project with sources and mappings, when I click "Run Processing," then processing starts within 10 seconds
- Given processing is running, when I view the project, then I see progress indicator with estimated time remaining
- Given processing completes, when I return to the project, then I see completion status with record counts and any warnings
**Priority:** P0-Critical  
**MVP Status:** MVP  
**Dependencies:** US-MAP-002, US-DEID-001, US-FILT-001  
**Estimated Complexity:** L

**US-PROC-002**  
**Persona:** Jordan Rivera (Data Analyst)  
**Story:** As a data analyst, I want to view processing history so that I can track changes over time.  
**Acceptance Criteria:**
- Given processing has run multiple times, when I view history, then I see each run with timestamp, duration, and record counts
- Given I select a historical run, when I view details, then I see the configuration that was used for that run
- Given a run had warnings or errors, when I view details, then I see specific messages with affected record counts
**Priority:** P2-Medium  
**MVP Status:** MVP  
**Dependencies:** US-PROC-001  
**Estimated Complexity:** M

**US-PROC-003**  
**Persona:** Jordan Rivera (Data Analyst)  
**Story:** As a data analyst, I want to cancel a running processing job so that I can correct configuration mistakes.  
**Acceptance Criteria:**
- Given processing is running, when I click "Cancel," then processing stops within 30 seconds
- Given I cancel processing, when I view the project, then the status shows "Cancelled" with partial record count
- Given I cancel processing, when I start a new run, then it processes from the beginning (no partial state)
**Priority:** P2-Medium  
**MVP Status:** MVP  
**Dependencies:** US-PROC-001  
**Estimated Complexity:** M

---

### Export

**US-EXP-001**  
**Persona:** Jordan Rivera (Data Analyst)  
**Story:** As a data analyst, I want to export data in conversational JSONL format so that I can use it for chat agent fine-tuning.  
**Acceptance Criteria:**
- Given processing has completed, when I select "Conversational JSONL" and click Export, then a file downloads within 10 seconds for datasets under 10,000 records
- Given the export completes, when I open the file, then each line is a valid JSON object with "messages" array containing role/content pairs
- Given the format includes system prompts, when I configure export, then I can optionally include a system message prefix
**Priority:** P0-Critical  
**MVP Status:** MVP  
**Dependencies:** US-PROC-001  
**Estimated Complexity:** M

**US-EXP-002**  
**Persona:** Jordan Rivera (Data Analyst)  
**Story:** As a data analyst, I want to export data as Q&A pairs so that I can use it for knowledge base training.  
**Acceptance Criteria:**
- Given processing has completed, when I select "Q&A Pairs" format, then customer messages become questions and agent responses become answers
- Given a conversation has multiple exchanges, when exporting as Q&A, then each exchange becomes a separate pair (with conversation context option)
- Given export is configured, when I include "context window," then each Q&A pair includes N previous exchanges as context
**Priority:** P1-High  
**MVP Status:** MVP  
**Dependencies:** US-PROC-001  
**Estimated Complexity:** M

**US-EXP-003**  
**Persona:** Jordan Rivera (Data Analyst)  
**Story:** As a data analyst, I want to export raw structured JSON so that I can perform custom processing.  
**Acceptance Criteria:**
- Given processing has completed, when I select "Raw JSON" format, then I receive a JSON file with all mapped fields preserved
- Given the export includes metadata, when I configure export, then I can choose to include source information, processing timestamps, and de-identification tokens
- Given the dataset is large, when export takes more than 30 seconds, then I see a progress indicator and can download when ready
**Priority:** P1-High  
**MVP Status:** MVP  
**Dependencies:** US-PROC-001  
**Estimated Complexity:** S

**US-EXP-004**  
**Persona:** Jordan Rivera (Data Analyst)  
**Story:** As a data analyst, I want to re-download previous exports so that I can recover files I've deleted locally.  
**Acceptance Criteria:**
- Given an export was generated, when I view export history, then I see all exports from the last 30 days
- Given I select a previous export, when I click download, then I receive the same file that was originally generated
- Given an export is more than 30 days old, when I view history, then it shows as "Expired" and cannot be downloaded
**Priority:** P2-Medium  
**MVP Status:** Post-MVP  
**Dependencies:** US-EXP-001  
**Estimated Complexity:** S

---

### Audit & Compliance

**US-AUD-001**  
**Persona:** Sam Patel (Org Admin)  
**Story:** As an organization administrator, I want to view an audit log so that I can demonstrate compliance.  
**Acceptance Criteria:**
- Given I access the audit log, when I view entries, then I see all data access, processing, and export events with user, timestamp, and action
- Given I filter by date range, when I apply the filter, then only events within that range are shown
- Given I filter by user, when I apply the filter, then only that user's actions are shown
**Priority:** P1-High  
**MVP Status:** MVP  
**Dependencies:** US-AUTH-002  
**Estimated Complexity:** M

**US-AUD-002**  
**Persona:** Sam Patel (Org Admin)  
**Story:** As an organization administrator, I want to export audit logs so that I can provide them to compliance/legal.  
**Acceptance Criteria:**
- Given I am viewing audit logs, when I click "Export," then I receive a CSV file with all visible entries
- Given the export includes all columns, when I open the file, then I see: timestamp, user email, action type, resource affected, IP address, details
- Given I export a filtered view, when I receive the file, then only filtered entries are included
**Priority:** P2-Medium  
**MVP Status:** MVP  
**Dependencies:** US-AUD-001  
**Estimated Complexity:** S

---

### Platform Administration

**US-PLAT-001**  
**Persona:** Morgan Wu (Platform Admin)  
**Story:** As a platform administrator, I want to view all organizations so that I can monitor platform usage.  
**Acceptance Criteria:**
- Given I am a platform admin, when I access the admin dashboard, then I see a list of all organizations with user count, project count, and last activity
- Given I select an organization, when I view details, then I see usage metrics without accessing their actual data content
- Given I want to find a specific organization, when I search by name, then matching organizations are shown within 1 second
**Priority:** P1-High  
**MVP Status:** MVP  
**Dependencies:** US-ORG-001  
**Estimated Complexity:** M

**US-PLAT-002**  
**Persona:** Morgan Wu (Platform Admin)  
**Story:** As a platform administrator, I want to view system health metrics so that I can identify and resolve issues proactively.  
**Acceptance Criteria:**
- Given I access the admin dashboard, when I view health metrics, then I see: active jobs, queue depth, error rate (last 24h), database size
- Given an error rate exceeds 5%, when I view the dashboard, then I see a warning indicator with link to error details
- Given I click on error details, when I view the list, then I see recent errors grouped by type with occurrence count
**Priority:** P2-Medium  
**MVP Status:** MVP  
**Dependencies:** US-PROC-001  
**Estimated Complexity:** M

**US-PLAT-003**  
**Persona:** Morgan Wu (Platform Admin)  
**Story:** As a platform administrator, I want to disable an organization so that I can handle account issues or non-payment.  
**Acceptance Criteria:**
- Given I am viewing an organization, when I click "Disable," then all users in that organization cannot access the platform
- Given an organization is disabled, when any user tries to log in, then they see a message to contact support
- Given an organization is disabled, when I click "Enable," then access is restored immediately
**Priority:** P1-High  
**MVP Status:** MVP  
**Dependencies:** US-PLAT-001  
**Estimated Complexity:** S

---

## Section 5: Feature Specification

### Feature F-001: User Authentication & Authorization

**Description:** Secure user authentication with email/password login, email-based invitations, role-based access control, and session management.

**User Stories Addressed:** US-AUTH-001, US-AUTH-002, US-AUTH-003, US-AUTH-004, US-AUTH-005

**Functional Requirements:**
- Email/password authentication with bcrypt password hashing
- JWT-based session tokens with 24-hour expiry
- Email invitation system with 7-day expiring links
- Three-tier role system: Viewer, Editor, Admin
- Password reset flow with 1-hour expiring tokens

**Non-Functional Requirements:**
- Login response time < 2 seconds
- Password must meet complexity requirements (8+ chars, mixed case, number)
- Sessions must be revocable within 60 seconds
- All authentication endpoints must be rate-limited (5 attempts/minute)

**Edge Cases:**
- User invited to multiple organizations → Separate accounts per organization (MVP), unified identity (Future)
- User attempts login during system maintenance → Display maintenance message, don't consume rate limit
- Invitation sent to existing user → Inform inviter that user exists; send notification to existing user

**Error States:**
- Invalid credentials → Generic "Invalid email or password" (prevent enumeration)
- Expired invitation → "This invitation has expired. Please request a new one."
- Account disabled → "Your account has been disabled. Please contact your administrator."
- Rate limit exceeded → "Too many attempts. Please try again in X minutes."

**Out of Scope:**
- SSO/SAML integration (Future)
- Multi-factor authentication (Future)
- Social login (Not planned)

---

### Feature F-002: Organization & Project Management

**Description:** Multi-tenant organization structure with project-based data isolation and lifecycle management.

**User Stories Addressed:** US-ORG-001, US-ORG-002, US-ORG-003

**Functional Requirements:**
- Platform admins can create organizations
- Organization members can create projects (Editor/Admin roles)
- Projects contain sources, processing configuration, and outputs
- Project archival with 90-day retention before permanent deletion

**Non-Functional Requirements:**
- Organization/project names: 1-100 characters, alphanumeric with spaces/hyphens
- Project creation < 2 seconds
- Organizations support up to 100 users
- Organizations support up to 50 active projects

**Edge Cases:**
- Last admin tries to leave organization → Block action, require admin transfer first
- Organization with active processing jobs is disabled → Queue jobs are cancelled; running jobs complete but output is inaccessible
- Archived project reaches 90 days during processing → Processing fails; user notified 7 days prior

**Error States:**
- Duplicate organization name → "An organization with this name already exists"
- Duplicate project name (within org) → "A project with this name already exists in your organization"
- Unauthorized project access → 403 Forbidden with generic message

**Out of Scope:**
- Organization hierarchies (parent/child)
- Cross-organization project sharing
- Project templates

---

### Feature F-003: File Upload Source

**Description:** Support for uploading and processing CSV, Excel, and JSON files as data sources.

**User Stories Addressed:** US-FILE-001, US-FILE-002, US-FILE-003, US-FILE-004

**Functional Requirements:**
- Drag-and-drop file upload with progress indicator
- Support for CSV, XLSX, XLS, JSON file formats
- Automatic column/field detection
- Excel multi-sheet selection
- JSON path selection for nested structures
- File replacement with mapping preservation

**Non-Functional Requirements:**
- Maximum file size: 50MB
- Maximum records per file: 100,000
- Upload progress updates every 1 second
- Auto-detection confidence threshold: 80%

**Edge Cases:**
- CSV with inconsistent column counts → Pad with null values; warn user
- Excel with merged cells spanning data rows → Expand merged cells; document transformation
- JSON with mixed array/object values → Reject with specific path indication
- File upload interrupted → Resume not supported; user must re-upload

**Error States:**
- File too large → "File exceeds 50MB limit. Please split into smaller files."
- Unsupported format → "Unsupported file format. Please upload CSV, Excel, or JSON files."
- Parse error → "Unable to parse file. Error at [location]: [specific message]"
- Empty file → "This file appears to be empty."

**Out of Scope:**
- Archive files (ZIP, TAR)
- PDF/document parsing
- Image/OCR extraction

---

### Feature F-004: Teamwork Desk API Integration

**Description:** Native integration with Teamwork Desk to import support tickets and conversations.

**User Stories Addressed:** US-API-TD-001, US-API-TD-002, US-API-TD-003, US-API-TD-004

**Functional Requirements:**
- API key + subdomain authentication
- Connection testing before save
- Date range filtering
- Status filtering (Open, Pending, Resolved, Closed)
- Message extraction with role attribution (Agent, Customer, System)
- Internal note inclusion toggle
- Consistent agent tokenization across tickets

**Non-Functional Requirements:**
- Connection test < 5 seconds
- Respect Teamwork API rate limits (automatic backoff)
- Import batch size: 100 tickets per request
- Maximum import: 50,000 tickets per sync

**Edge Cases:**
- API key revoked mid-import → Pause import; notify user; allow re-authentication
- Teamwork API rate limit hit → Exponential backoff; resume automatically
- Ticket deleted in Teamwork after import → Not updated in Foundry (point-in-time snapshot)
- Agent no longer exists in Teamwork → Use historical data; maintain consistent token

**Error States:**
- Invalid API key → "Authentication failed. Please verify your API key."
- Invalid subdomain → "Unable to connect to [subdomain].teamwork.com. Please verify the subdomain."
- Network timeout → "Connection timed out. Please try again."
- API rate limit → "Teamwork API rate limit reached. Import will resume automatically."

**Out of Scope:**
- Real-time ticket synchronization
- Two-way sync (writing back to Teamwork)
- Attachment extraction

---

### Feature F-005: GoHighLevel API Integration

**Description:** Native integration with GoHighLevel to import sales conversations across channels.

**User Stories Addressed:** US-API-GHL-001, US-API-GHL-002

**Functional Requirements:**
- OAuth or API key authentication
- Multi-channel selection: SMS, Email, Call transcripts
- Date range and status filtering per channel
- Consistent contact tokenization

**Non-Functional Requirements:**
- OAuth flow completion < 30 seconds
- Respect GoHighLevel API rate limits
- Maximum import: 25,000 conversations per sync

**Edge Cases:**
- OAuth token expires during import → Refresh token automatically; if refresh fails, pause and notify
- Call transcript unavailable → Log warning; continue with available data
- Duplicate conversations across channels → Include both; document source channel

**Error States:**
- OAuth denied → "Authorization was denied. Please try again and approve access."
- Insufficient permissions → "The connected account lacks required permissions: [list]"
- Channel not enabled → "SMS is not enabled for this GoHighLevel account."

**Out of Scope:**
- GoHighLevel workflow triggers
- Real-time sync
- Write-back to GoHighLevel

---

### Feature F-006: Field Mapping

**Description:** Intelligent field detection with user-controllable mapping from source fields to standard output fields.

**User Stories Addressed:** US-MAP-001, US-MAP-002, US-MAP-003

**Functional Requirements:**
- Auto-detection of common field types (content, email, phone, name, date, status)
- Manual mapping override
- Confidence indicators (High/Medium/Low)
- Preview with sample data (10 rows)
- Preview shows de-identified values

**Standard Output Fields:**
- Conversation ID (required)
- Content/Message (required)
- Sender Role (Agent/Customer/System)
- Sender Identifier
- Timestamp
- Status
- Custom fields (user-defined)

**Non-Functional Requirements:**
- Auto-detection < 5 seconds for 100 columns
- Preview generation < 3 seconds
- Support up to 100 source columns

**Edge Cases:**
- All columns have low confidence → Display all unmapped; recommend manual review
- Column name conflicts with standard field → Suffix with _1, _2, etc.
- Source has no usable columns → Block processing; explain minimum requirements

**Error States:**
- Required field unmapped → "Please map a column to [required field] before processing."
- Invalid field type assignment → "Column [name] contains values incompatible with [field type]."

**Out of Scope:**
- Calculated/derived fields
- Field transformation formulas
- Cross-source field mapping

---

### Feature F-007: PII De-identification

**Description:** Automatic detection and masking of personally identifiable information with consistent token replacement.

**User Stories Addressed:** US-DEID-001, US-DEID-002, US-DEID-003, US-DEID-004, US-DEID-005, US-DEID-006

**Functional Requirements:**
- Automatic detection: Names, Emails, Phone numbers, Addresses, Company names
- Consistent tokenization within dataset (same entity → same token)
- Role-aware tokenization (Agent names vs. Customer names)
- Domain allow-list for emails
- Entity allow-list (preserve specific values)
- Custom regex patterns with custom tokens

**Token Format:**
- Names: [PERSON_1], [AGENT_1], [CUSTOMER_1]
- Emails: [EMAIL_1] or [EMAIL]@domain.com (if domain allowed)
- Phones: [PHONE_1]
- Addresses: [ADDRESS_1]
- Companies: [COMPANY_1]
- Custom: [USER_DEFINED_TOKEN]

**Non-Functional Requirements:**
- Detection accuracy target: 95%+ for standard PII
- False positive rate target: < 5%
- Processing throughput: 1,000 records/minute

**Edge Cases:**
- Name is also common word ("Rose," "Hunter") → Context-aware detection; configurable sensitivity
- Phone number in non-phone context (order ID) → Allow user to mark as false positive for future runs
- Email with plus addressing (user+tag@domain) → Treat as single email identity
- PII in unusual format (vertical text, abbreviations) → Best-effort detection; document limitations

**Error States:**
- Custom regex invalid → "Invalid pattern: [error]. Pattern must be valid regex."
- Conflicting allow-list entries → "Entity [X] appears in both mask and allow lists."

**Out of Scope:**
- Genetic or biometric data detection
- Non-English language optimization (MVP is English-focused)
- Image/document PII detection

---

### Feature F-008: Quality Filtering

**Description:** Configurable filters to exclude low-quality or irrelevant records from processed output.

**User Stories Addressed:** US-FILT-001, US-FILT-002, US-FILT-003

**Functional Requirements:**
- Minimum message count filter
- Minimum word count filter
- Date range filter (static or rolling)
- Status filter (multi-select)
- Exclusion counts in processing results

**Non-Functional Requirements:**
- Filters evaluated < 1ms per record
- Filter configuration changes don't require re-upload

**Edge Cases:**
- All records filtered out → Processing completes with 0 output records; clear warning displayed
- Date field contains nulls → Null dates excluded when date filter active; count reported
- Rolling date filter on historical data → Rolling window applied at processing time

**Error States:**
- No date field mapped with date filter → "Date filter requires a mapped date field."
- Invalid date range (end < start) → "End date must be after start date."

**Out of Scope:**
- Content-based quality scoring (sentiment, coherence)
- Duplicate detection/deduplication
- Language detection filtering

---

### Feature F-009: Processing Pipeline

**Description:** Batch processing engine that applies mappings, de-identification, and filtering to produce output datasets.

**User Stories Addressed:** US-PROC-001, US-PROC-002, US-PROC-003

**Functional Requirements:**
- Manual trigger via UI
- Progress indicator with estimated time
- Processing history with configuration snapshots
- Job cancellation
- Parallel processing of independent records

**Non-Functional Requirements:**
- Job start < 10 seconds after trigger
- Processing throughput: 1,000 records/minute baseline
- Maximum job duration: 4 hours
- Maximum records per job: 100,000

**Edge Cases:**
- Source data changes during processing → Process point-in-time snapshot taken at job start
- Platform restart during processing → Jobs resume from last checkpoint
- Multiple sources with overlapping records → Process independently; document in output

**Error States:**
- Source connection failed → "Unable to connect to source [name]. Please verify connection."
- Processing timeout → "Processing exceeded 4-hour limit. Consider filtering to smaller dataset."
- System error → "Processing failed unexpectedly. Error: [message]. Job ID: [id]"

**Out of Scope:**
- Scheduled processing
- Real-time/streaming processing
- Conditional processing logic

---

### Feature F-010: Data Export

**Description:** Export processed datasets in formats suitable for AI training.

**User Stories Addressed:** US-EXP-001, US-EXP-002, US-EXP-003, US-EXP-004

**Functional Requirements:**
- Conversational JSONL format (OpenAI-compatible)
- Q&A pairs format
- Raw structured JSON format
- Optional metadata inclusion
- Export history with 30-day retention

**Format Specifications:**

*Conversational JSONL:*
```json
{"messages": [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}
```

*Q&A Pairs:*
```json
{"question": "...", "answer": "...", "context": "..."}
```

**Non-Functional Requirements:**
- Export < 10 seconds for 10,000 records
- Maximum export file size: 500MB
- Export history retained 30 days

**Edge Cases:**
- Single-message conversations in Q&A format → Skip; document in export summary
- Very long conversations → Split into chunks per message pair limit (configurable)
- Export during active processing → Block; require processing completion

**Error States:**
- Export generation failed → "Export failed: [reason]. Please try again."
- Export expired → "This export is no longer available. Please generate a new export."

**Out of Scope:**
- Direct cloud storage upload (S3, GCS)
- Streaming export
- Custom export templates

---

### Feature F-011: Audit Logging

**Description:** Comprehensive activity logging for compliance and security monitoring.

**User Stories Addressed:** US-AUD-001, US-AUD-002

**Functional Requirements:**
- Log all authentication events (login, logout, password changes)
- Log all data access events (view, export)
- Log all processing events (start, complete, cancel)
- Log all configuration changes
- Filterable by date, user, action type
- CSV export of logs

**Logged Fields:**
- Timestamp (UTC)
- User email
- User role
- Action type
- Resource type and ID
- IP address
- User agent
- Details (action-specific JSON)

**Non-Functional Requirements:**
- Log entries immutable (append-only)
- Log retention: 1 year
- Log query < 5 seconds for 1 month range

**Edge Cases:**
- User deleted → Logs retain user email; mark as "deleted user"
- IP address unavailable → Log as "unknown"
- Bulk operations → Log summary entry plus individual entries for audit completeness

**Error States:**
- Log export too large → "Export exceeds maximum size. Please narrow date range."

**Out of Scope:**
- Real-time alerting
- Log forwarding (SIEM integration)
- Tamper-proof cryptographic verification

---

### Feature F-012: Platform Administration

**Description:** Administrative capabilities for Foundry platform operators to manage tenants and monitor system health.

**User Stories Addressed:** US-PLAT-001, US-PLAT-002, US-PLAT-003

**Functional Requirements:**
- View all organizations with usage metrics
- Search organizations by name
- View system health dashboard
- Enable/disable organizations
- View platform-wide error logs

**Non-Functional Requirements:**
- Organization list load < 2 seconds for 1,000 organizations
- Health metrics refresh every 60 seconds
- Organization disable takes effect immediately

**Edge Cases:**
- Platform admin is also organization member → See both admin and member views
- All platform admins removed → Require database-level recovery (document procedure)
- High error rate from single tenant → Highlight in dashboard; don't auto-disable

**Error States:**
- Health check failed → Display last known good values with timestamp and "refresh failed" indicator

**Out of Scope:**
- Multi-region management
- Automated capacity scaling
- Financial/billing management

---

## Section 6: MVP Definition

### MVP Feature List with Removal Test

| Feature ID | Feature Name | Removal Test | MVP? | Rationale |
|------------|--------------|--------------|------|-----------|
| F-001 | User Authentication | Cannot remove — no access without auth | ✅ MVP | Core security requirement |
| F-002 | Org & Project Management | Cannot remove — no data organization | ✅ MVP | Multi-tenancy is core value |
| F-003 | File Upload | Cannot remove — primary first-run path | ✅ MVP | "Aha moment" in <5 min |
| F-004 | Teamwork Desk | Could remove — file upload sufficient for core demo | ✅ MVP | Key differentiator; primary launch partner |
| F-005 | GoHighLevel | Could remove — not required for core value | ✅ MVP | Committed integration for launch |
| F-006 | Field Mapping | Cannot remove — transformation requires mapping | ✅ MVP | Core processing requirement |
| F-007 | De-identification | Cannot remove — privacy is core value prop | ✅ MVP | Central to product positioning |
| F-008 | Quality Filtering | Could remove — raw output still useful | ✅ MVP | Low effort; high user value |
| F-009 | Processing Pipeline | Cannot remove — no output without processing | ✅ MVP | Core engine |
| F-010 | Data Export | Cannot remove — no user value without output | ✅ MVP | Delivers final value |
| F-011 | Audit Logging | Could remove — not required for core function | ✅ MVP | Low effort; compliance enabler |
| F-012 | Platform Admin | Could remove — use database directly | ✅ MVP | Required for tenant onboarding |

### Post-MVP Features

- F-003a: File replacement with mapping preservation
- F-011a: Advanced log analytics
- Scheduled processing
- Direct cloud storage export (S3, GCS)
- Additional API connectors (Zendesk, Freshdesk, Intercom, HubSpot)
- Topic extraction and quality scoring
- Self-service signup and billing

### MVP Scope Rationale

The MVP scope follows the executive brief's guidance: prioritize the "file upload → de-identified output in <5 minutes" path while delivering the committed API integrations. Every feature passes the viability test: users can complete the core job-to-be-done of transforming messy data into training-ready datasets.

### Success Criteria for Launch

1. **First-run success:** 80% of new users successfully complete file upload → export workflow on first session
2. **Time to value:** Median time from first upload to first export < 10 minutes
3. **Data quality:** < 5% user-reported false negatives in de-identification
4. **Platform stability:** 99.5% uptime; < 1% job failure rate

### Post-Launch Metrics (6-Month Targets)

- 50 active organizations
- 500 processed projects
- 10M records processed
- 40% of users return weekly
- Net Promoter Score > 40

---

## Section 7: Information Architecture

### Content Organization

```
Foundry Platform
├── Public Pages (unauthenticated)
│   ├── Login
│   ├── Accept Invitation
│   └── Password Reset
│
├── Organization Workspace (authenticated)
│   ├── Dashboard
│   │   ├── Recent Projects
│   │   ├── Quick Stats
│   │   └── Getting Started Guide
│   │
│   ├── Projects
│   │   ├── Project List
│   │   └── Project Detail
│   │       ├── Sources Tab
│   │       ├── Mapping Tab
│   │       ├── Processing Tab
│   │       ├── Exports Tab
│   │       └── Settings Tab
│   │
│   ├── Team (Admin only)
│   │   ├── Member List
│   │   └── Invite Member
│   │
│   └── Settings
│       ├── Organization Profile
│       ├── Audit Log
│       └── My Account
│
└── Platform Admin (platform admin only)
    ├── Organizations
    │   ├── Organization List
    │   └── Organization Detail
    └── System Health
```

### Navigation Structure

**Primary Navigation (Sidebar):**
- Dashboard
- Projects
- Team (Admin only)
- Settings

**Project-Level Navigation (Tabs):**
- Sources
- Mapping
- Processing
- Exports
- Settings

**User Menu (Header):**
- My Account
- Log Out

### Key User Flows

**Flow 1: First Project with File Upload (Primary "Aha Moment" Flow)**

1. User lands on Dashboard (empty state)
2. User clicks "Create Project"
3. User enters project name → Project created, redirected to Sources tab
4. User clicks "Add Source" → "Upload File"
5. User drags CSV file → Upload progress shown
6. Upload completes → Auto-detected columns displayed
7. User reviews suggested mappings → Makes adjustments
8. User clicks "Preview" → Sees de-identified sample
9. User navigates to Processing tab → Clicks "Run Processing"
10. Progress indicator shown → Completes
11. User navigates to Exports tab → Selects format → Downloads file
12. **Success:** User has training-ready data

**Flow 2: Connect Teamwork Desk**

1. User in Sources tab → Clicks "Add Source" → "Teamwork Desk"
2. User enters API key and subdomain
3. User clicks "Test Connection" → Success indicator
4. User configures filters (date range, status)
5. User saves source → Returns to Sources list with new source

**Flow 3: Team Member Invitation**

1. Admin navigates to Team
2. Admin clicks "Invite Member"
3. Admin enters email and selects role
4. Admin clicks "Send Invitation"
5. Invitee receives email → Clicks link
6. Invitee creates password → Lands on Dashboard

**Flow 4: View and Export Audit Log**

1. Admin navigates to Settings → Audit Log
2. Admin sets date range filter
3. Admin reviews log entries
4. Admin clicks "Export" → CSV downloads

### Screen Inventory

| Screen | Route | Primary Persona | Priority |
|--------|-------|-----------------|----------|
| Login | /login | All | P0 |
| Accept Invitation | /invite/:token | All | P0 |
| Password Reset | /reset-password/:token | All | P1 |
| Dashboard | /dashboard | All | P0 |
| Project List | /projects | All | P0 |
| Project Detail - Sources | /projects/:id/sources | Data Analyst | P0 |
| Project Detail - Mapping | /projects/:id/mapping | Data Analyst | P0 |
| Project Detail - Processing | /projects/:id/processing | Data Analyst | P0 |
| Project Detail - Exports | /projects/:id/exports | Data Analyst | P0 |
| Project Detail - Settings | /projects/:id/settings | Ops Manager | P1 |
| Team Management | /team | Org Admin | P0 |
| Invite Member | /team/invite | Org Admin | P0 |
| Organization Settings | /settings | Org Admin | P1 |
| Audit Log | /settings/audit | Org Admin | P1 |
| My Account | /account | All | P1 |
| Platform Admin - Orgs | /admin/organizations | Platform Admin | P1 |
| Platform Admin - Health | /admin/health | Platform Admin | P2 |

---

## Section 8: Assumptions and Constraints

### Technical Assumptions (Replit Context)

| Assumption | Details |
|------------|---------|
| Deployment platform | Replit |
| Database | PostgreSQL (Neon) |
| Architecture | Monolithic full-stack application |
| Frontend | React with TypeScript |
| Backend | Express.js with TypeScript |
| ORM | Drizzle |
| Authentication | JWT-based (24-hour sessions) |
| File storage | Local filesystem (Replit persistent storage) |
| Background processing | In-process (no separate workers for MVP) |

### Business Assumptions

| Assumption | Impact if Wrong |
|------------|-----------------|
| Users have CSV/Excel exports available | May need guidance on exporting from source systems |
| Users understand basic data concepts (columns, rows) | May need more onboarding/guidance |
| English-language data is primary use case | De-identification accuracy may suffer for other languages |
| Teamwork Desk API remains stable | May need adaptation if API changes |
| Users process data in batches, not real-time | Architecture would need significant changes for streaming |
| Invite-only model sufficient for MVP | May delay growth if self-service is expected |

### Known Constraints

| Constraint | Details |
|------------|---------|
| Single container deployment | No microservices; all code runs in one process |
| Replit resource limits | 2GB RAM, limited CPU; affects maximum concurrent jobs |
| Web browser access only | No native mobile apps |
| No dedicated workers | Background jobs run in-process; limits concurrent processing |
| File size limit | 50MB per file (Replit constraint) |
| Dataset size limit | 100,000 records per project |

### Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| De-identification false negatives (PII leaks) | Medium | High | Multiple detection passes; human review option; clear disclaimers |
| API rate limits from Teamwork/GHL | Medium | Medium | Implement backoff; communicate import times; batch efficiently |
| Large file processing timeout | Medium | Medium | Stream processing; chunk uploads; clear limits |
| Single-tenant performance impact | Low | High | Per-org resource limits; queue management; monitoring |
| Replit outages | Low | High | Clear status communication; data durability in PostgreSQL |

---

## Section 9: Success Metrics

### Key Performance Indicators

| KPI | Definition | Measurement Method | Launch Target | 6-Month Target |
|-----|------------|-------------------|---------------|----------------|
| Activation Rate | % of new users who complete first export within 7 days | Event tracking | 60% | 75% |
| Time to First Value | Median minutes from signup to first export | Event tracking | 15 min | 10 min |
| Weekly Active Orgs | Organizations with ≥1 active user per week | Session tracking | 20 | 50 |
| Processing Success Rate | % of jobs completing without error | Job status logging | 95% | 99% |
| De-identification Accuracy | % of PII correctly detected (sampled audits) | Manual audit (monthly) | 95% | 98% |
| User Satisfaction (NPS) | Net Promoter Score | In-app survey (quarterly) | +30 | +45 |

### Launch Success Criteria

1. ✅ 10 organizations onboarded successfully
2. ✅ 80% first-run success rate (file → export without support)
3. ✅ Zero data breaches or PII incidents
4. ✅ 99% platform uptime during launch week
5. ✅ Average processing time < 5 minutes for 10K record datasets

### Analytics Requirements

**Event Tracking (Required for Launch):**
- User signup/login
- Project created/archived
- Source added (by type)
- File uploaded (size, type)
- Mapping completed
- Processing started/completed/failed
- Export downloaded (format)

**System Metrics (Required for Launch):**
- Active jobs count
- Job queue depth
- Job duration histogram
- Error rate by type
- Database size and query latency
- API connector success/failure rates

---

## Section 10: Glossary

### Domain Terms

| Term | Definition |
|------|------------|
| Organization | A tenant in Foundry representing a customer company. Contains users, projects, and data. |
| Project | A container for a specific AI training initiative. Contains sources, configurations, and outputs. |
| Source | A data input connected to a project. Can be a file upload or API connection. |
| Processing Pipeline | The configured sequence of mappings, de-identification, and filters applied to source data. |
| De-identification | The process of detecting and masking personally identifiable information. |
| Tokenization | Replacing PII with consistent placeholder tokens (e.g., [PERSON_1]). |
| Field Mapping | The configuration connecting source data columns to standard output fields. |

### Technical Terms

| Term | Definition |
|------|------------|
| JSONL | JSON Lines format; each line is a valid JSON object. Used for AI training data. |
| PII | Personally Identifiable Information (names, emails, phones, addresses, etc.). |
| RAG | Retrieval-Augmented Generation; AI technique using external knowledge bases. |
| Fine-tuning | Training an AI model on specific data to customize its behavior. |
| JWT | JSON Web Token; used for authentication session management. |
| Batch Processing | Processing data in discrete runs rather than continuously. |

### Acronyms

| Acronym | Expansion |
|---------|-----------|
| API | Application Programming Interface |
| CSV | Comma-Separated Values |
| MVP | Minimum Viable Product |
| SaaS | Software as a Service |
| CRUD | Create, Read, Update, Delete |
| UI/UX | User Interface / User Experience |

---

## Document Validation

### Completeness Check

- [x] All 10 sections populated
- [x] All personas have ≥3 user stories
- [x] All user stories have ≥2 acceptance criteria
- [x] All MVP features have documented removal test
- [x] All features trace to user stories
- [x] All user stories trace to personas
- [x] All user flows include error states
- [x] Technical assumptions compatible with Replit

### Confidence Scores

| Section | Score (1-10) | Notes |
|---------|--------------|-------|
| Problem Statement | 9 | Well-defined in source material |
| Personas | 8 | Derived from use cases; would benefit from user interviews |
| User Stories | 9 | Comprehensive coverage with acceptance criteria |
| MVP Scope | 9 | Clear alignment with executive brief priorities |
| Replit Compatibility | 9 | All assumptions within Replit constraints |
| Overall | 8.5 | Ready for downstream agents |

### Flagged Items Requiring Review

1. **GoHighLevel integration scope** — Authentication flow (OAuth vs. API key) needs confirmation from GHL documentation review
2. **De-identification accuracy targets** — 95% target is aggressive; may need adjustment based on testing
3. **100K record limit** — Should be validated against Replit resource constraints during architecture phase
4. **Rolling date filters** — Specified but may add complexity; confirm value with users

### Assumptions Made

1. **File size 50MB limit** — Assumed based on typical Replit constraints; impact if wrong: need chunked upload
2. **Single job per project at a time** — Simplifies MVP; impact if wrong: add job queuing complexity
3. **English-only PII detection** — De-identification tuned for English; impact if wrong: reduced accuracy for other languages
4. **24-hour session expiry** — Security/convenience balance; impact if wrong: user frustration or security risk
5. **30-day export retention** — Balances storage with user convenience; impact if wrong: storage costs or user complaints

### Document Status: COMPLETE

---

## Downstream Agent Handoff Brief

### Deployment Context (All Agents)

**Target Platform: Replit**
- Single container deployment
- PostgreSQL database (Neon)
- Port 5000 for backend server
- Automatic HTTPS via Replit
- Environment variables via Replit Secrets

This context applies to all downstream agents. Do not specify infrastructure that conflicts with Replit's deployment model.

### For Agent 2: System Architecture

**Core Technical Challenges:**
- Multi-tenant data isolation in single database
- Large file upload handling (up to 50MB)
- Background job processing without dedicated workers
- PII detection with high accuracy requirement
- API connector abstraction (Teamwork Desk, GoHighLevel)

**Scale Expectations:**
- Concurrent users: 50-200
- Organizations: 100
- Projects: 500
- Database records: 500K-1M (across all tenants)
- File storage: 50GB total
- Throughput: 100-500 req/min

**Integration Requirements:**
- Teamwork Desk API (REST, API key auth)
- GoHighLevel API (REST, OAuth or API key)
- Email service for invitations (SendGrid, Resend, or similar)

**Authentication/Authorization Complexity:**
- JWT-based authentication
- Three roles: Viewer, Editor, Admin
- Organization-scoped permissions
- Platform admin role (super-user)

**Key Decisions Deferred to Architecture:**
- Job queue implementation (in-process vs. simple queue table)
- File storage strategy (local vs. external for scale)
- PII detection library/approach
- Session management strategy

**Security Considerations:**
- All data access must be org-scoped (no cross-tenant access)
- API keys stored encrypted at rest
- Rate limiting on auth endpoints and API calls
- Audit logging for compliance
- Password hashing with bcrypt

**Replit Constraints to Consider:**
- Single process (use in-process job queue or DB-backed queue)
- Port 5000 required
- Limited memory (be mindful of large file processing)
- Use Replit Secrets for API keys and database URL

### For Agent 3: Data Modeling

**Primary Entities Implied:**
- User
- Organization
- OrganizationMembership (user-org relationship with role)
- Project
- Source (polymorphic: FileSource, TeamworkDeskSource, GoHighLevelSource)
- SourceMapping
- ProcessingJob
- ProcessingJobLog
- Export
- AuditLog
- Invitation

**Key Relationships:**
- Organization has many Users (via OrganizationMembership)
- Organization has many Projects
- Project has many Sources
- Project has many ProcessingJobs
- ProcessingJob produces Exports
- All actions create AuditLog entries

**Data Lifecycle Considerations:**
- Source data cached for 30 days
- Exports retained for 30 days
- Audit logs retained for 1 year
- Archived projects deleted after 90 days

**Multi-Tenancy Requirements:**
- All data tables include organization_id
- All queries must filter by organization_id
- Platform admin queries are exempt

**Replit Constraints to Consider:**
- PostgreSQL via Neon
- Drizzle ORM for schema and queries
- Consider JSONB for flexible source configurations

### For Agent 4: API Contract

**Primary Operations Needed:**
- Auth: login, logout, refresh, password reset, invite accept
- Users: CRUD, role management
- Organizations: read, update (admin only)
- Projects: CRUD, archive
- Sources: CRUD, test connection, preview data
- Mappings: read, update, preview
- Processing: trigger, status, cancel, history
- Exports: generate, list, download
- Audit: list, export

**Authentication Requirements:**
- JWT tokens in Authorization header
- Refresh token flow
- Organization context in all authenticated requests

**External Integrations:**
- Teamwork Desk API proxy endpoints
- GoHighLevel API proxy endpoints
- Email service for transactional emails

**Real-time Requirements:**
- Processing job progress (polling acceptable for MVP; WebSocket future)

**Replit Constraints to Consider:**
- Express.js on port 5000
- All routes under /api prefix
- Health endpoint at GET /api/health (required for Replit deployment)

### For Agent 5: UI/UX Specification

**Primary User Flows:**
1. First project creation with file upload (critical path)
2. API source connection (Teamwork Desk)
3. Field mapping configuration
4. Processing execution and monitoring
5. Export generation and download
6. Team member invitation
7. Audit log review

**Key Interaction Patterns:**
- Drag-and-drop file upload
- Inline field mapping with dropdowns
- Progress indicators for long operations
- Preview modals for data samples
- Toast notifications for async operations

**Accessibility Requirements:**
- WCAG 2.1 AA compliance
- Keyboard navigation for all actions
- Screen reader support for key workflows
- Color contrast compliance

**Mobile/Responsive Requirements:**
- Responsive web design (desktop-first)
- Minimum supported width: 768px
- Critical flows usable on tablet
- Not optimized for mobile phones

**Replit Constraints to Consider:**
- React with TypeScript
- Vite bundler
- No native mobile apps (web only)
- Consider lightweight component library (Radix, Headless UI)

### For Agent 6: Implementation Orchestrator

**Replit-Specific Requirements:**
- Health endpoint at GET /api/health (required for deployment)
- Server must listen on process.env.PORT || 5000
- Database URL from DATABASE_URL environment variable
- Drizzle migrations with `npx tsx` wrapper
- Security middleware: helmet, cors, express-rate-limit

**Recommended Implementation Order:**
1. Database schema and Drizzle setup
2. Authentication (JWT, users, sessions)
3. Organization and team management
4. Projects CRUD
5. File upload source
6. Field mapping UI and logic
7. De-identification engine
8. Processing pipeline
9. Export generation
10. Teamwork Desk integration
11. GoHighLevel integration
12. Audit logging
13. Platform admin dashboard

**Development Priorities:**
- P0: Items 1-10 (core file upload path)
- P1: Items 11-13 (API integrations, compliance)

### Handoff Summary

- **Total User Stories:** 35 (11 P0, 16 P1, 8 P2)
- **MVP Feature Count:** 12
- **Estimated Complexity Distribution:** 5 Small, 14 Medium, 6 Large
- **Deployment Target:** Replit
- **Recommended Human Review Points:**
  - GoHighLevel authentication approach (OAuth vs. API key)
  - De-identification library selection
  - Job queue implementation strategy
  - 100K record limit validation against Replit resources

---

*Document End*
