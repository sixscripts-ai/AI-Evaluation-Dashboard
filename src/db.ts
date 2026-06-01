import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  EvalSuite, EvalCase, EvidenceSource, EvalRun, 
  EvalResult, Regression, ServerState, AssertionResult 
} from './types.js';

let currentDirname = '';
try {
  if (typeof __dirname !== 'undefined') {
    currentDirname = __dirname;
  } else {
    currentDirname = path.dirname(fileURLToPath(import.meta.url));
  }
} catch (e) {
  currentDirname = path.dirname(fileURLToPath(import.meta.url));
}

const STORE_PATH = path.join(currentDirname, 'db-store.json');

// Core helper to generate clean IDs
export function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 11)}`;
}

// Default initial seed state
function getSeedData(): ServerState {
  const suites: EvalSuite[] = [];
  const cases: EvalCase[] = [];
  const sources: EvidenceSource[] = [];
  const runs: EvalRun[] = [];
  const results: EvalResult[] = [];
  const regressions: Regression[] = [];

  const now = new Date();
  const subDays = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();

  // Suite 1: GhostSSH Role Matching
  const s1Id = 'suite_ghostssh';
  suites.push({
    id: s1Id,
    name: 'GhostSSH Role Matching',
    description: 'Validates SSH access rules, permission evaluation based on public keys, expired sessions, and role level mapping.',
    project: 'SecOps Gateway v4',
    systemType: 'classification',
    status: 'active',
    createdAt: subDays(10),
    updatedAt: subDays(10),
  });

  // Suite 1 - Case 1: DevOps SSH access
  const c1_1 = 'case_ssh_devops';
  cases.push({
    id: c1_1,
    suiteId: s1Id,
    name: 'Allow DevOps SSH access with valid public key',
    input: `Access Request:\nUser: sally_devops\nKey: ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... / devops-prod\nGateway: prod-db-01\nToken_Validity: valid`,
    expectedOutput: 'Approved access. Role mapped to devops-admin with full shell permissions.',
    requiredEvidence: 'sally_devops belongs to the active active-devops-group database record.',
    tags: ['ssh', 'devops', 'security', 'role-map'],
    difficulty: 'easy',
    notes: 'Primary verification path for active directory sync.',
    isActive: true,
    createdAt: subDays(10),
    updatedAt: subDays(10)
  });

  sources.push({
    id: 'src_ssh_1',
    caseId: c1_1,
    title: 'Active Directory User Registry SecOps Gateway',
    sourceType: 'dataset',
    url: 'https://internal.secops.local/registry/sally',
    excerpt: 'sally_devops holds active credentials for production bastions and cluster endpoints under permission groups: active-devops-group.',
    createdAt: subDays(10),
    updatedAt: subDays(10)
  });

  // Suite 1 - Case 2: Finance Intern
  const c1_2 = 'case_ssh_intern';
  cases.push({
    id: c1_2,
    suiteId: s1Id,
    name: 'Reject intern access to secure database cluster',
    input: `Access Request:\nUser: bob_intern\nKey: ssh-rsa AAAAB3NzaC1yc... / intern-finance\nGateway: prod-db-01\nToken_Validity: valid`,
    expectedOutput: 'Access Denied. Reason: Insufficient permissions for database cluster gateway.',
    requiredEvidence: 'bob_intern restricted from prod cluster databases due to internship policy Section 4.',
    tags: ['rejection', 'least-privilege', 'database'],
    difficulty: 'medium',
    notes: 'Crucial for compliance compliance audit requirements.',
    isActive: true,
    createdAt: subDays(10),
    updatedAt: subDays(10)
  });

  sources.push({
    id: 'src_ssh_2',
    caseId: c1_2,
    title: 'SecOps Intern Security Guidelines v2.4',
    sourceType: 'document',
    excerpt: 'Section 4: Interns are restricted from direct root shell access to production databases. Mapped to staging-readonly-shell if requested.',
    createdAt: subDays(10),
    updatedAt: subDays(10)
  });

  // Suite 1 - Case 3: Read-only Auditor
  const c1_3 = 'case_ssh_auditor';
  cases.push({
    id: c1_3,
    suiteId: s1Id,
    name: 'Grant read-only security auditor role on bastion host',
    input: `Access Request:\nUser: alice_auditor\nKey: ssh-ed25519 AAAAC1... / audit-global\nGateway: bastion-01\nToken_Validity: valid`,
    expectedOutput: 'Approved access. Role mapped to security-auditor-readonly. Commands are logged to firewall audit log.',
    requiredEvidence: 'alice_auditor has audit clearance certificate G-992 and audit role.',
    tags: ['auditor', 'bastion', 'compliance'],
    difficulty: 'medium',
    isActive: true,
    createdAt: subDays(10),
    updatedAt: subDays(10)
  });

  sources.push({
    id: 'src_ssh_3',
    caseId: c1_3,
    title: 'Auditing Clearence and Gateway Privileges Guide',
    sourceType: 'document',
    excerpt: 'Staff with active G-992 certificate must be routed to security-auditor-readonly shell on all main ingress bastion bastions.',
    createdAt: subDays(10),
    updatedAt: subDays(10)
  });

  // Suite 1 - Case 4: Expired JWT Token
  const c1_4 = 'case_ssh_expired';
  cases.push({
    id: c1_4,
    suiteId: s1Id,
    name: 'Reject DevOps access due to expired session token',
    input: `Access Request:\nUser: sally_devops\nKey: ssh-ed25519 AAAAC3NzaC... / devops-prod\nGateway: prod-db-01\nToken_Validity: expired`,
    expectedOutput: 'Access Denied. Reason: Token has expired. Please run kinit to refresh keys.',
    requiredEvidence: 'Session token expired error code ERR_AUTH_EXP.',
    tags: ['expirations', 'token', 'error-handling'],
    difficulty: 'hard',
    isActive: true,
    createdAt: subDays(10),
    updatedAt: subDays(10)
  });

  sources.push({
    id: 'src_ssh_4',
    caseId: c1_4,
    title: 'SSO Session Lifecycle Policy',
    sourceType: 'document',
    excerpt: 'Whenever gateway encounters state "expired", it triggers ERR_AUTH_EXP and redirects terminal terminal session back to Kerberos authenticate.',
    createdAt: subDays(10),
    updatedAt: subDays(10)
  });


  // Suite 2: ICT Knowledge Engine Retrieval
  const s2Id = 'suite_ict_knowledge';
  suites.push({
    id: s2Id,
    name: 'ICT Knowledge Engine Retrieval',
    description: 'Evaluates vector database retrieval, search grounding, documentation grounding, and correct procedures on VPN, LDAP, and VMs.',
    project: 'Enterprise Assistance Portal',
    systemType: 'rag',
    status: 'active',
    createdAt: subDays(9),
    updatedAt: subDays(9),
  });

  // Case 2-1: VPN Configuration on MacOS
  const c2_1 = 'case_ict_vpn';
  cases.push({
    id: c2_1,
    suiteId: s2Id,
    name: 'Retrieve Mac VPN configuration settings',
    input: 'How do I configure the WireGuard VPN client on MacOS Sequoia for high-security zones?',
    expectedOutput: 'Set Server endpoint to wg.sec.corp.com:51820, Protocol UDP, DNS to 10.0.80.5, and import corporate-private.conf key profile.',
    requiredEvidence: 'wg.sec.corp.com:51820 with private configuration profile is mandatory.',
    tags: ['vpn', 'macos', 'wireguard'],
    difficulty: 'easy',
    isActive: true,
    createdAt: subDays(9),
    updatedAt: subDays(9)
  });

  sources.push({
    id: 'src_ict_1',
    caseId: c2_1,
    title: 'Sec.Corp VPN Internal Setup Instructions',
    sourceType: 'note',
    excerpt: 'Mac WireGuard configurations must point to dns 10.0.80.5, remote endpoint: wg.sec.corp.com:51820. Profile corporate-private.conf must be used.',
    createdAt: subDays(9),
    updatedAt: subDays(9)
  });

  // Case 2-2: LDAP Reset Policy
  const c2_2 = 'case_ict_ldap';
  cases.push({
    id: c2_2,
    suiteId: s2Id,
    name: 'Lookup LDAP password requirements',
    input: 'What is the password dynamic requirement and reset rotation period for central LDAP?',
    expectedOutput: 'Minimum 16 characters, must include numbers, special characters, mixed case, and reset mandatory every 90 days.',
    requiredEvidence: 'Reset mandatory every 90 days and minimum length of 16 characters.',
    tags: ['ldap', 'password-policy', 'active-directory'],
    difficulty: 'easy',
    isActive: true,
    createdAt: subDays(9),
    updatedAt: subDays(9)
  });

  sources.push({
    id: 'src_ict_2',
    caseId: c2_2,
    title: 'Global Security Standard ICT-SEC-201',
    sourceType: 'document',
    excerpt: 'Central AD / LDAP accounts must rotate passwords every 90 days. Complexity requires 16 characters minimum, mixing case, digits, and specials.',
    createdAt: subDays(9),
    updatedAt: subDays(9)
  });

  // Case 2-3: Server temperature limits
  const c2_3 = 'case_ict_temp';
  cases.push({
    id: c2_3,
    suiteId: s2Id,
    name: 'Server room temperature thresholds',
    input: 'What are the red and amber alerts for Server Room 2B thermal guidelines?',
    expectedOutput: 'Amber alert triggers at 25°C, Red alert/automatic power-down of dev rack initiated at 30°C.',
    requiredEvidence: 'Amber Alert 25C, Red Alert 30C with system shutdowns.',
    tags: ['hardware', 'datacenter', 'thermal'],
    difficulty: 'medium',
    isActive: true,
    createdAt: subDays(9),
    updatedAt: subDays(9)
  });

  sources.push({
    id: 'src_ict_3',
    caseId: c2_3,
    title: 'Datacenter climate parameters (SR-2B)',
    sourceType: 'dataset',
    excerpt: 'Room 2B guidelines: standard ranges (18-22°C). Amber thermal alert at 25°C. Critical Red warning at 30°C demands emergency VM migrations and dev-rack downing.',
    createdAt: subDays(9),
    updatedAt: subDays(9)
  });

  // Case 2-4: VM Decommission procedures
  const c2_4 = 'case_ict_vm';
  cases.push({
    id: c2_4,
    suiteId: s2Id,
    name: 'Find Virtual Machine decommission steps',
    input: 'List the exact steps to retire an inactive VMware cluster VM in our registry.',
    expectedOutput: '1. Backup snapshot. 2. Remove DNS records. 3. Delete VM storage volume. 4. Release static IP allocation. 5. Archive logs.',
    requiredEvidence: 'Required actions: Snapshot backups, DNS cleanup, drive deletion, static IP releasing, and log archival.',
    tags: ['vmware', 'decommission', 'cloud'],
    difficulty: 'hard',
    isActive: true,
    createdAt: subDays(9),
    updatedAt: subDays(9)
  });

  sources.push({
    id: 'src_ict_4',
    caseId: c2_4,
    title: 'Asset Lifecycle Playbook: Decommissioning',
    sourceType: 'code',
    excerpt: 'Step-by-step decommission process: snapshot backup VM -> de-register DNS A-records -> purge VMFS folders -> return static ip range to pool -> logs zipped and shipped.',
    createdAt: subDays(9),
    updatedAt: subDays(9)
  });


  // Suite 3: Campus Compass Source-Grounded Answers
  const s3Id = 'suite_campus_compass';
  suites.push({
    id: s3Id,
    name: 'Campus Compass Source-Grounded Answers',
    description: 'Checks conversational groundness for students regarding course prerequisites, campus facilities, medical center hours, and grading policies.',
    project: 'Student Support bot v1.1',
    systemType: 'rag',
    status: 'active',
    createdAt: subDays(8),
    updatedAt: subDays(8),
  });

  // Case 3-1: Prerequisites Quantum Mechanics
  const c3_1 = 'case_campus_quantum';
  cases.push({
    id: c3_1,
    suiteId: s3Id,
    name: 'Quantum Physics prerequisites checklist',
    input: 'What are the required prerequisites to enroll in Advanced Quantum Mechanics (PHY-301)?',
    expectedOutput: 'Must complete Intro Classical Mechanics (PHY-201) and Multi-variable Calculus (MAT-203), both with a letter grade of C- or better.',
    requiredEvidence: 'PHY-201 and MAT-203 with minimum grade of C- are essential.',
    tags: ['physics', 'enrollment', 'degree-plan'],
    difficulty: 'easy',
    isActive: true,
    createdAt: subDays(8),
    updatedAt: subDays(8)
  });

  sources.push({
    id: 'src_campus_1',
    caseId: c3_1,
    title: 'Course Catalog 2025-2026 Department of Physics',
    sourceType: 'url',
    url: 'https://campus.edu/courses/physics',
    excerpt: 'PHY-301 Advanced Quantum Mechanics: prerequisites: PHY-201 (Classical Mech) & MAT-203 (Multi Calc) passed with grade C- or above.',
    createdAt: subDays(8),
    updatedAt: subDays(8)
  });

  // Case 3-2: Parking permit
  const c3_2 = 'case_campus_parking';
  cases.push({
    id: c3_2,
    suiteId: s3Id,
    name: 'Parking permits and fees',
    input: 'Where can I buy a student parking permit, and what is its price for a single semester?',
    expectedOutput: 'Buy online on student portal or at Campus Police desk (Building 1A). Single semester permit costs $180, valid in Lot G, R, and S.',
    requiredEvidence: 'Online student portal or Building 1A, costing $180 per semester.',
    tags: ['parking', 'fees', 'nexus'],
    difficulty: 'easy',
    isActive: true,
    createdAt: subDays(8),
    updatedAt: subDays(8)
  });

  sources.push({
    id: 'src_campus_2',
    caseId: c3_2,
    title: 'Campus Parking Services Rules & Costs',
    sourceType: 'document',
    excerpt: 'Parking passes can be bought at Parking office (Bld 1A) or portal. Cost of standard semester-long student coupon is $180 (renewed in Fall/Spring). Valid in Yellow lots (G, R, S).',
    createdAt: subDays(8),
    updatedAt: subDays(8)
  });

  // Case 3-3: Student Health services
  const c3_3 = 'case_campus_health';
  cases.push({
    id: c3_3,
    suiteId: s3Id,
    name: 'Weekend Medical Center open hours',
    input: 'What are the operating hours for the Campus Medical Center on Saturday and Sunday?',
    expectedOutput: 'Saturday open from 9:00 AM to 1:00 PM for urgent care only. Sunday closed.',
    requiredEvidence: 'Saturday 9:00 AM - 1:00 PM (urgent care), Sunday closed.',
    tags: ['health', 'hours', 'accommodations'],
    difficulty: 'medium',
    isActive: true,
    createdAt: subDays(8),
    updatedAt: subDays(8)
  });

  sources.push({
    id: 'src_campus_3',
    caseId: c3_3,
    title: 'Campus Health and Recreation Timetable',
    sourceType: 'note',
    excerpt: 'Medical services: Mon-Fri 8am-7pm. Sat 9am-1pm (strictly walk-in Urgent Care). Sun closed. For emergency dial 911 or call Campus Patrol.',
    createdAt: subDays(8),
    updatedAt: subDays(8)
  });

  // Case 3-4: Grade Appeal
  const c3_4 = 'case_campus_appeal';
  cases.push({
    id: c3_4,
    suiteId: s3Id,
    name: 'Grade Appeal process time constraints',
    input: 'What is the deadline and process of filing a Grade Appeal for a computer science course?',
    expectedOutput: 'Must submit a formal appeal package using Grade-Appeal-Form within 14 calendar days of final grades release, first presenting it to the instructing professor.',
    requiredEvidence: '14 calendar days of final grades release and submission of Grade-Appeal-Form.',
    tags: ['policies', 'grades', 'ombuds'],
    difficulty: 'hard',
    isActive: true,
    createdAt: subDays(8),
    updatedAt: subDays(8)
  });

  sources.push({
    id: 'src_campus_4',
    caseId: c3_4,
    title: 'Academic Grievance Statutes Sec 7.2',
    sourceType: 'document',
    excerpt: 'Students wishing to dispute a grade must file the official Grade-Appeal-Form. Deadline to present to advisor & professor is exactly 14 calendar days from grade publication.',
    createdAt: subDays(8),
    updatedAt: subDays(8)
  });


  // RUNS AND RESULTS HISTORIES (at least 2 per suite)
  // Include one improved run, and one regressed run across the suites.
  
  // ===================== SUITE 1 (GHOSTSSH ROLE MATCHING) =====================
  // Run 1 - Baseline v1.0.0 (High latency, some fails)
  const r1_1_id = 'run_ssh_v100';
  runs.push({
    id: r1_1_id,
    suiteId: s1Id,
    modelName: 'gemini-2.5-flash',
    systemVersion: 'v1.0.0-git-829d',
    status: 'completed',
    startedAt: subDays(6),
    completedAt: subDays(6),
    averageScore: 68.75,
    passCount: 2,
    partialCount: 1,
    failCount: 1,
    averageLatencyMs: 1450,
    notes: 'Initial production baseline audit with older system integration logic.',
    createdAt: subDays(6),
    updatedAt: subDays(6)
  });

  // Result Sally (c1_1) in Run 1 (Pass)
  results.push({
    id: 'res_ssh_r1_1',
    runId: r1_1_id,
    caseId: c1_1,
    actualOutput: 'SSH access approved.Sally DevOps is mapped into devops-admin with full interactive shell capabilities.',
    status: 'pass',
    score: 100,
    latencyMs: 980,
    evidenceMatched: true,
    evidenceCoverageScore: 95,
    assertions: [
      { id: 'as_1', type: 'outputIncludes', status: 'pass', expected: 'Approved access', actual: 'Approved access', explanation: 'Output contains Approved access' },
      { id: 'as_2', type: 'latencyLessThanMs', status: 'pass', expected: '1500', actual: '980', explanation: 'Latency within threshold of 1500ms' }
    ],
    notes: 'Successfully mapped DevOps permissions.',
    createdAt: subDays(6),
    updatedAt: subDays(6)
  });

  // Result Bob Intern (c1_2) in Run 1 (Partial) - Intern rejected but failed to match all requirements
  results.push({
    id: 'res_ssh_r1_2',
    runId: r1_1_id,
    caseId: c1_2,
    actualOutput: 'Access Denied. User bob_intern does not have standard authorization credentials.',
    status: 'partial',
    score: 70,
    latencyMs: 1350,
    evidenceMatched: false,
    evidenceCoverageScore: 40,
    assertions: [
      { id: 'as_3', type: 'outputIncludes', status: 'pass', expected: 'Access Denied', actual: 'Access Denied', explanation: 'Successfully denied access.' },
      { id: 'as_4', type: 'evidenceIncludes', status: 'fail', expected: 'Section 4', actual: 'None', explanation: 'Fails to list appropriate guidelines reference.' }
    ],
    notes: 'Missing policy section citation.',
    createdAt: subDays(6),
    updatedAt: subDays(6)
  });

  // Result Alice Auditor (c1_3) in Run 1 (Pass)
  results.push({
    id: 'res_ssh_r1_3',
    runId: r1_1_id,
    caseId: c1_3,
    actualOutput: 'Approved access. Role mapped to security-auditor-readonly on bastion host. Audit trace is logging to network firewall.',
    status: 'pass',
    score: 100,
    latencyMs: 1120,
    evidenceMatched: true,
    evidenceCoverageScore: 90,
    assertions: [
      { id: 'as_5', type: 'outputIncludes', status: 'pass', expected: 'security-auditor-readonly', actual: 'security-auditor-readonly', explanation: 'Properly matched role' },
      { id: 'as_6', type: 'evidenceIncludes', status: 'pass', expected: 'G-992', actual: 'G-992 certificate', explanation: 'Properly verified identity certificate' }
    ],
    createdAt: subDays(6),
    updatedAt: subDays(6)
  });

  // Result Expired (c1_4) in Run 1 (Fail) - Server crashed on exp request
  results.push({
    id: 'res_ssh_r1_4',
    runId: r1_1_id,
    caseId: c1_4,
    actualOutput: 'Access Denied. Terminal internal exception encountered.',
    status: 'fail',
    score: 5,
    latencyMs: 2350,
    failureReason: 'System logged standard exception instead of explicit user prompt instruction.',
    evidenceMatched: false,
    evidenceCoverageScore: 0,
    assertions: [
      { id: 'as_7', type: 'outputIncludes', status: 'fail', expected: 'expired', actual: 'denied', explanation: 'Does not instruct user on token expiry' },
      { id: 'as_8', type: 'outputIncludes', status: 'fail', expected: 'kinit', actual: 'None', explanation: 'Did not advise user on how to renew' }
    ],
    createdAt: subDays(6),
    updatedAt: subDays(6)
  });


  // ===================== RUN 2: SUITE 1 Run 2 -> IMPROVED RUN (v1.0.1) =====================
  // Improved run - Almost everything passes, scores go up, latency drop
  const r1_2_id = 'run_ssh_v101';
  runs.push({
    id: r1_2_id,
    suiteId: s1Id,
    modelName: 'gemini-2.5-flash',
    systemVersion: 'v1.0.1-git-9cd3',
    status: 'completed',
    startedAt: subDays(3),
    completedAt: subDays(3),
    averageScore: 93.75, // (100 + 85 + 100 + 90) / 4 = 93.75
    passCount: 3,
    partialCount: 1,
    failCount: 0,
    averageLatencyMs: 820,
    notes: 'Hotfix applied to secure token handler and error feedback pipelines.',
    createdAt: subDays(3),
    updatedAt: subDays(3)
  });

  // Sally c1_1 (Pass)
  results.push({
    id: 'res_ssh_r2_1',
    runId: r1_2_id,
    caseId: c1_1,
    actualOutput: 'Approved access. Role mapped to devops-admin with full shell permissions. Mapped User sally_devops.',
    status: 'pass',
    score: 100,
    latencyMs: 650,
    evidenceMatched: true,
    evidenceCoverageScore: 100,
    assertions: [
      { id: 'as_9', type: 'outputIncludes', status: 'pass', expected: 'Approved access', actual: 'Approved access', explanation: 'Matches permission' }
    ],
    createdAt: subDays(3),
    updatedAt: subDays(3)
  });

  // Bob Intern c1_2 (Partial but improved)
  results.push({
    id: 'res_ssh_r2_2',
    runId: r1_2_id,
    caseId: c1_2,
    actualOutput: 'Access Denied. Mapped restricted profile due to Section 4 intern guidelines.',
    status: 'partial',
    score: 85,
    latencyMs: 710,
    evidenceMatched: true,
    evidenceCoverageScore: 80,
    assertions: [
      { id: 'as_10', type: 'outputIncludes', status: 'pass', expected: 'Access Denied', actual: 'Access Denied', explanation: 'Access denied' },
      { id: 'as_11', type: 'evidenceIncludes', status: 'pass', expected: 'Section 4', actual: 'Section 4', explanation: 'Includes section citation' }
    ],
    createdAt: subDays(3),
    updatedAt: subDays(3)
  });

  // Alice Auditor c1_3 (Pass)
  results.push({
    id: 'res_ssh_r2_3',
    runId: r1_2_id,
    caseId: c1_3,
    actualOutput: 'Approved access. Role mapped to security-auditor-readonly. Firewall registers active clearance G-992 certificate audit trace.',
    status: 'pass',
    score: 100,
    latencyMs: 840,
    evidenceMatched: true,
    evidenceCoverageScore: 92,
    assertions: [
      { id: 'as_12', type: 'outputIncludes', status: 'pass', expected: 'security-auditor-readonly', actual: 'security-auditor-readonly', explanation: 'Matched role' }
    ],
    createdAt: subDays(3),
    updatedAt: subDays(3)
  });

  // Expired c1_4 (Pass now! Huge improvement)
  results.push({
    id: 'res_ssh_r2_4',
    runId: r1_2_id,
    caseId: c1_4,
    actualOutput: 'Access Denied. Reason: Token has expired. Please run kinit to log back and authenticate.',
    status: 'pass',
    score: 90,
    latencyMs: 1080,
    evidenceMatched: true,
    evidenceCoverageScore: 85,
    assertions: [
      { id: 'as_13', type: 'outputIncludes', status: 'pass', expected: 'expired', actual: 'expired', explanation: 'Explicitly outputs explanation' },
      { id: 'as_14', type: 'outputIncludes', status: 'pass', expected: 'kinit', actual: 'kinit', explanation: 'Advised client on kinit command' }
    ],
    createdAt: subDays(3),
    updatedAt: subDays(3)
  });



  // ===================== SUITE 2 (ICT KNOWLEDGE ENGINE RETRIEVAL) =====================
  // Run 1 - Baseline v1.0.0 (Decent scores, fast latency)
  const r2_1_id = 'run_ict_v100';
  runs.push({
    id: r2_1_id,
    suiteId: s2Id,
    modelName: 'gemini-2.5-flash',
    systemVersion: 'v1.1.0-alpha',
    status: 'completed',
    startedAt: subDays(5),
    completedAt: subDays(5),
    averageScore: 90.0, // (100 + 100 + 90 + 70)/4 = 90
    passCount: 3,
    partialCount: 1,
    failCount: 0,
    averageLatencyMs: 910,
    notes: 'Baseline release using hybrid vector retrieval.',
    createdAt: subDays(5),
    updatedAt: subDays(5)
  });

  results.push({
    id: 'res_ict_r1_1',
    runId: r2_1_id,
    caseId: c2_1,
    actualOutput: 'To configure on Sequoia: WireGuard endpoint: wg.sec.corp.com:51820. DNS: 10.0.80.5. Import profile corporate-private.conf with high security policies.',
    status: 'pass',
    score: 100,
    latencyMs: 820,
    evidenceMatched: true,
    evidenceCoverageScore: 100,
    assertions: [
      { id: 'as_15', type: 'outputIncludes', status: 'pass', expected: 'wg.sec.corp.com:51820', actual: 'wg.sec.corp.com:51820', explanation: 'Found endpoint' }
    ],
    createdAt: subDays(5),
    updatedAt: subDays(5)
  });

  results.push({
    id: 'res_ict_r1_2',
    runId: r2_1_id,
    caseId: c2_2,
    actualOutput: 'LDAP standards require passwords of at least 16 characters with case mixing. Rotation policy mandates password reset mandatory every 90 days.',
    status: 'pass',
    score: 100,
    latencyMs: 780,
    evidenceMatched: true,
    evidenceCoverageScore: 100,
    assertions: [
      { id: 'as_16', type: 'outputIncludes', status: 'pass', expected: '16 characters', actual: '16 characters', explanation: 'Matches length limit' },
      { id: 'as_17', type: 'outputIncludes', status: 'pass', expected: '90 days', actual: '90 days', explanation: 'Matches rotation' }
    ],
    createdAt: subDays(5),
    updatedAt: subDays(5)
  });

  results.push({
    id: 'res_ict_r1_3',
    runId: r2_1_id,
    caseId: c2_3,
    actualOutput: 'Thermal thresholds: Amber level at 25°C. Critical Red warning occurs at 30°C and triggers server auto power down.',
    status: 'pass',
    score: 90,
    latencyMs: 920,
    evidenceMatched: true,
    evidenceCoverageScore: 90,
    assertions: [
      { id: 'as_18', type: 'outputIncludes', status: 'pass', expected: '25°C', actual: '25°C', explanation: 'Correct amber warning' },
      { id: 'as_19', type: 'outputIncludes', status: 'pass', expected: '30°C', actual: '30°C', explanation: 'Shutdowns are logged' }
    ],
    createdAt: subDays(5),
    updatedAt: subDays(5)
  });

  results.push({
    id: 'res_ict_r1_4',
    runId: r2_1_id,
    caseId: c2_4,
    actualOutput: 'Decommission steps: 1. Snapshot backup. 2. Purge DNS parameters. 3. Delete VMware disk volume. 4. Zip the system logs.',
    status: 'partial',
    score: 70,
    latencyMs: 1120,
    evidenceMatched: true,
    evidenceCoverageScore: 75,
    assertions: [
      { id: 'as_20', type: 'outputIncludes', status: 'pass', expected: 'Snapshot', actual: 'Snapshot backup', explanation: 'Matched snapshot' },
      { id: 'as_21', type: 'outputIncludes', status: 'fail', expected: 'IP allocation', actual: 'None', explanation: 'Did not specify releasing IP addresses back to pool' }
    ],
    createdAt: subDays(5),
    updatedAt: subDays(5)
  });


  // ===================== RUN 2: SUITE 2 Run 2 -> REGRESSED RUN (v1.1.1) =====================
  // Regressed run - In Search engine indexing, retrieval broke, latency exploded and some results failed!
  const r2_2_id = 'run_ict_v111';
  runs.push({
    id: r2_2_id,
    suiteId: s2Id,
    modelName: 'gemini-2.5-flash',
    systemVersion: 'v1.1.1-git-341e',
    status: 'completed',
    startedAt: subDays(2),
    completedAt: subDays(2),
    averageScore: 56.25, // (100 + 45 + 50 + 30)/4 = 56.25 - Huge drop from 90!
    passCount: 1,
    partialCount: 1,
    failCount: 2,
    averageLatencyMs: 1840, // Exploded from 910ms! (more than 50% increase)
    notes: 'Retrieval vector indexing update deployment with unoptimized query parser.',
    createdAt: subDays(2),
    updatedAt: subDays(2)
  });

  // VPN c2_1 (Pass still)
  results.push({
    id: 'res_ict_r2_1',
    runId: r2_2_id,
    caseId: c2_1,
    actualOutput: 'Sequoia WG Setup: remote endpoint: wg.sec.corp.com:51820 with corporate-private.conf. DNS 10.0.80.5.',
    status: 'pass',
    score: 100,
    latencyMs: 910,
    evidenceMatched: true,
    evidenceCoverageScore: 100,
    assertions: [
      { id: 'as_22', type: 'outputIncludes', status: 'pass', expected: 'wg.sec.corp.com:51820', actual: 'wg.sec.corp.com:51820', explanation: 'Proper domain match' }
    ],
    createdAt: subDays(2),
    updatedAt: subDays(2)
  });

  // LDAP c2_2 (Fled from Pass to Fail - Score dropped by 55 points, evidenceMatched lost!)
  // REGRESSION 1: Score drop + Status Downgrade + Evidence Lost!
  results.push({
    id: 'res_ict_r2_2',
    runId: r2_2_id,
    caseId: c2_2,
    actualOutput: 'LDAP Reset Policy: Change password under personal workspace as desired. No strict length bounds enforced in light tier.',
    status: 'fail',
    score: 45,
    latencyMs: 1450, // Latency spiked
    evidenceMatched: false,
    evidenceCoverageScore: 10,
    assertions: [
      { id: 'as_23', type: 'outputIncludes', status: 'fail', expected: '16 characters', actual: 'No strict limits', explanation: 'Failed to specify minimum character requirement' },
      { id: 'as_24', type: 'outputIncludes', status: 'fail', expected: '90 days', actual: 'None', explanation: 'Failed to specify password expiration rotation policy' }
    ],
    failureReason: 'Model produced stale/incorrect cache output. Completely missing requirements.',
    createdAt: subDays(2),
    updatedAt: subDays(2)
  });

  regressions.push({
    id: 'reg_ict_1',
    runId: r2_2_id,
    caseId: c2_2,
    previousResultId: 'res_ict_r1_2',
    regressionType: 'status_downgrade',
    severity: 'high',
    description: 'Case status regressed from PASS (100) to FAIL (45). Model did not output the 16 character minimum or 90 day rotation period, resulting in evidence loss.',
    createdAt: subDays(2)
  });

  // Temperature c2_3 (Spiked in latency - exceeded 50% and went beyond threshold)
  // REGRESSION 2: Latency spike! Spiked from 920ms to 2400ms! (160% increase)
  results.push({
    id: 'res_ict_r2_3',
    runId: r2_2_id,
    caseId: c2_3,
    actualOutput: 'Thermal Alerts: Amber indicates 25°C threshold. Red triggers system shutdowns at 30°C.',
    status: 'partial',
    score: 50,
    latencyMs: 2400, // MASSIVE latency spike
    evidenceMatched: true,
    evidenceCoverageScore: 80,
    assertions: [
      { id: 'as_25', type: 'outputIncludes', status: 'pass', expected: '25°C', actual: '25°C', explanation: 'Core threshold matched' },
      { id: 'as_26', type: 'latencyLessThanMs', status: 'fail', expected: '1000', actual: '2400', explanation: 'Response time exceeded 1000ms SLA' }
    ],
    createdAt: subDays(2),
    updatedAt: subDays(2)
  });

  regressions.push({
    id: 'reg_ict_2',
    runId: r2_2_id,
    caseId: c2_3,
    previousResultId: 'res_ict_r1_3',
    regressionType: 'latency_increase',
    severity: 'medium',
    description: 'Latency spiked by 160% (from 920ms to 2400ms), breaching the 1000ms service level agreement threshold.',
    createdAt: subDays(2)
  });

  // VM Decom c2_4 (Down from partial to failure. Score dropped from 70 to 30)
  results.push({
    id: 'res_ict_r2_4',
    runId: r2_2_id,
    caseId: c2_4,
    actualOutput: 'Backup your virtual machine machine then remove it from standard hypervisor directory. Ensure you check with tech ops.',
    status: 'fail',
    score: 30,
    latencyMs: 2600,
    evidenceMatched: false,
    evidenceCoverageScore: 25,
    assertions: [
      { id: 'as_27', type: 'outputIncludes', status: 'fail', expected: 'Snapshot', actual: 'None', explanation: 'Missing explicit snapshot instruction' }
    ],
    failureReason: 'Model produced extremely vague responses that lack actionable steps specified in playbook guidelines.',
    createdAt: subDays(2),
    updatedAt: subDays(2)
  });



  // ===================== SUITE 3 (CAMPUS COMPASS SOURCE-GROUNDED ANSWERS) =====================
  // Run 1 - Baseline v1.0.0 (Decent, average score 80)
  const r3_1_id = 'run_campus_v100';
  runs.push({
    id: r3_1_id,
    suiteId: s3Id,
    modelName: 'gemini-2.5-flash',
    systemVersion: 'v1.4.2',
    status: 'completed',
    startedAt: subDays(4),
    completedAt: subDays(4),
    averageScore: 90.0, // (100 + 100 + 80 + 80)/4 = 90
    passCount: 2,
    partialCount: 2,
    failCount: 0,
    averageLatencyMs: 1150,
    notes: 'Completed evaluation sweep of student bot RAG framework with default system prompt configuration.',
    createdAt: subDays(4),
    updatedAt: subDays(4)
  });

  // Prereq Quantum Space (Pass)
  results.push({
    id: 'res_campus_r1_1',
    runId: r3_1_id,
    caseId: c3_1,
    actualOutput: 'Prerequisites for PHY-301 are PHY-201 and MAT-203. Both courses require a final letter grade of C- or above.',
    status: 'pass',
    score: 100,
    latencyMs: 990,
    evidenceMatched: true,
    evidenceCoverageScore: 100,
    assertions: [
      { id: 'as_28', type: 'outputIncludes', status: 'pass', expected: 'PHY-201', actual: 'PHY-201', explanation: 'Found PHY-201' },
      { id: 'as_29', type: 'outputIncludes', status: 'pass', expected: 'MAT-203', actual: 'MAT-203', explanation: 'Found MAT-203' }
    ],
    createdAt: subDays(4),
    updatedAt: subDays(4)
  });

  // Parking Space (Pass)
  results.push({
    id: 'res_campus_r1_2',
    runId: r3_1_id,
    caseId: c3_2,
    actualOutput: 'Student parking passes are sold at standard prices of $180 per semester. Bring your student ID to Building 1A to pick it up, or purchase on the web.',
    status: 'pass',
    score: 100,
    latencyMs: 1100,
    evidenceMatched: true,
    evidenceCoverageScore: 100,
    assertions: [
      { id: 'as_30', type: 'outputIncludes', status: 'pass', expected: 'Building 1A', actual: 'Building 1A', explanation: 'Proper pickup directions' },
      { id: 'as_31', type: 'outputIncludes', status: 'pass', expected: '$180', actual: '$180 per semester', explanation: 'Cost matched successfully' }
    ],
    createdAt: subDays(4),
    updatedAt: subDays(4)
  });

  // Health Center (Partial)
  results.push({
    id: 'res_campus_r1_3',
    runId: r3_1_id,
    caseId: c3_3,
    actualOutput: 'Medical center operates urgent care walk-ins on Saturdays starting in the morning. Sundays are closed.',
    status: 'partial',
    score: 80,
    latencyMs: 1220,
    evidenceMatched: true,
    evidenceCoverageScore: 80,
    assertions: [
      { id: 'as_32', type: 'outputIncludes', status: 'pass', expected: 'urgent care', actual: 'urgent care', explanation: 'Indicated urgent care' },
      { id: 'as_33', type: 'outputIncludes', status: 'fail', expected: '9:00 AM', actual: 'None', explanation: 'Did not specify the doors open exactly at 9:00 AM' }
    ],
    createdAt: subDays(4),
    updatedAt: subDays(4)
  });

  // CS Appeal (Partial)
  results.push({
    id: 'res_campus_r1_4',
    runId: r3_1_id,
    caseId: c3_4,
    actualOutput: 'Grade appeals require submission of Grade-Appeal-Form. This must be raised with your advisor under a short window of 14 days.',
    status: 'partial',
    score: 80,
    latencyMs: 1300,
    evidenceMatched: true,
    evidenceCoverageScore: 90,
    assertions: [
      { id: 'as_34', type: 'outputIncludes', status: 'pass', expected: 'Grade-Appeal-Form', actual: 'Grade-Appeal-Form', explanation: 'Form citation verified' },
      { id: 'as_35', type: 'outputIncludes', status: 'pass', expected: '14 calendar days', actual: '14 days', explanation: 'Duration checklist matched' }
    ],
    createdAt: subDays(4),
    updatedAt: subDays(4)
  });


  // ===================== RUN 2: SUITE 3 Run 2 -> REGRESSED RUN (v1.5) =====================
  // Regressed run - Prerequisite case c3_1 regressed due to evidenceMatched lost! Mismatched!
  const r3_2_id = 'run_campus_v150';
  runs.push({
    id: r3_2_id,
    suiteId: s3Id,
    modelName: 'gemini-2.5-flash',
    systemVersion: 'v1.5.0-git-bc4d',
    status: 'completed',
    startedAt: subDays(1),
    completedAt: subDays(1),
    averageScore: 68.75, // (45 + 100 + 70 + 60)/4 = 68.75
    passCount: 1,
    partialCount: 2,
    failCount: 1,
    averageLatencyMs: 1320,
    notes: 'Regression test run on student gateway helper. Prompts refactored for brevity, causing RAG source grounding mismatch.',
    createdAt: subDays(1),
    updatedAt: subDays(1)
  });

  // Prerequisite c3_1 (Fled from Pass to Fail. EvidenceMatched lost!)
  // REGRESSION 3: Evidence lost! (evidenceMatched changed from true to false)
  results.push({
    id: 'res_campus_r2_1',
    runId: r3_2_id,
    caseId: c3_1,
    actualOutput: 'Enrollment limits specify Advanced Quantum Physics PHY-301 is open for Junior students. Please contact registrar regarding basic prerequisites check.',
    status: 'fail',
    score: 45,
    latencyMs: 1040,
    evidenceMatched: false, // Changed from true to false!
    evidenceCoverageScore: 15,
    assertions: [
      { id: 'as_36', type: 'outputIncludes', status: 'fail', expected: 'PHY-201', actual: 'None', explanation: 'Did not cite required Physics course' },
      { id: 'as_37', type: 'outputIncludes', status: 'fail', expected: 'MAT-203', actual: 'None', explanation: 'Did not cite required Calculus course' }
    ],
    failureReason: 'Model completely ignored context information regarding PHY-201 and MAT-203 requirements.',
    createdAt: subDays(1),
    updatedAt: subDays(1)
  });

  regressions.push({
    id: 'reg_campus_3',
    runId: r3_2_id,
    caseId: c3_1,
    previousResultId: 'res_campus_r1_1',
    regressionType: 'evidence_lost',
    severity: 'high',
    description: 'Evidence Grounding Failure: "evidenceMatched" changed from true to false. The RAG engine did not fetch or output the necessary reference sources (PHY-201, MAT-203) for course registration.',
    createdAt: subDays(1)
  });

  // Parking c3_2 (Pass still)
  results.push({
    id: 'res_campus_r2_2',
    runId: r3_2_id,
    caseId: c3_2,
    actualOutput: 'Student parking coupons: $180 per semester. Buy online or at Campus Police Building 1A.',
    status: 'pass',
    score: 100,
    latencyMs: 1110,
    evidenceMatched: true,
    evidenceCoverageScore: 100,
    assertions: [
      { id: 'as_38', type: 'outputIncludes', status: 'pass', expected: 'Building 1A', actual: 'Building 1A', explanation: 'Matched location' }
    ],
    createdAt: subDays(1),
    updatedAt: subDays(1)
  });

  // Health Center c3_3 (Partial)
  results.push({
    id: 'res_campus_r2_3',
    runId: r3_2_id,
    caseId: c3_3,
    actualOutput: 'Operating hours are morning walk-in Saturdays. Medical clinic closed Sunday.',
    status: 'partial',
    score: 70,
    latencyMs: 1350,
    evidenceMatched: true,
    evidenceCoverageScore: 70,
    assertions: [
      { id: 'as_39', type: 'outputIncludes', status: 'pass', expected: 'urgent care', actual: 'urgent care', explanation: 'Contains urgent care reference' }
    ],
    createdAt: subDays(1),
    updatedAt: subDays(1)
  });

  // CS Appeal c3_4 (Partial)
  results.push({
    id: 'res_campus_r2_4',
    runId: r3_2_id,
    caseId: c3_4,
    actualOutput: 'Submit your Grade-Appeal-Form within 14 days of publication to dispute grades.',
    status: 'partial',
    score: 60,
    latencyMs: 1480,
    evidenceMatched: true,
    evidenceCoverageScore: 80,
    assertions: [
      { id: 'as_40', type: 'outputIncludes', status: 'pass', expected: 'Grade-Appeal-Form', actual: 'Grade-Appeal-Form', explanation: 'Form index match' }
    ],
    createdAt: subDays(1),
    updatedAt: subDays(1)
  });

  return {
    suites,
    cases,
    sources,
    runs,
    results,
    regressions
  };
}

// Memory database instance
let dbCachedState: ServerState | null = null;

export function getDb(): ServerState {
  if (dbCachedState) {
    return dbCachedState;
  }

  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, 'utf-8');
      if (data.trim() !== '') {
        dbCachedState = JSON.parse(data);
        return dbCachedState!;
      }
    }
  } catch (error) {
    console.error('Failed to parse db-store.json, creating a fresh seeded state', error);
  }

  // Generate seed
  const seeded = getSeedData();
  dbCachedState = seeded;
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(seeded, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write db-store.json', err);
  }
  return dbCachedState!;
}

export function saveDb(state: ServerState): ServerState {
  dbCachedState = state;
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing to database store', err);
  }
  return state;
}

// Mutations helpers
export function addSuite(suite: Omit<EvalSuite, 'id' | 'createdAt' | 'updatedAt'>): EvalSuite {
  const db = getDb();
  const newSuite: EvalSuite = {
    ...suite,
    id: generateId('suite'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.suites.unshift(newSuite);
  saveDb(db);
  return newSuite;
}

export function addCase(testCase: Omit<EvalCase, 'id' | 'createdAt' | 'updatedAt'>): EvalCase {
  const db = getDb();
  const newCase: EvalCase = {
    ...testCase,
    id: generateId('case'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.cases.push(newCase);
  saveDb(db);
  return newCase;
}

export function addSource(source: Omit<EvidenceSource, 'id' | 'createdAt' | 'updatedAt'>): EvidenceSource {
  const db = getDb();
  const newSource: EvidenceSource = {
    ...source,
    id: generateId('source'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.sources.push(newSource);
  saveDb(db);
  return newSource;
}
