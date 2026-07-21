import fs from 'fs';
import path from 'path';
import { 
  Repository, 
  PullRequest, 
  OverrideRule, 
  Review, 
  ChatMessage, 
  ContributorPoint, 
  AuditLog, 
  WebhookEvent, 
  SystemSettings,
  ReviewReplay,
  User,
  Session,
  Notification,
  GitHubIssue
} from '../types.js';

const DB_FILE = path.join(process.cwd(), 'db.json');

interface Schema {
  repositories: Repository[];
  pullRequests: PullRequest[];
  rules: OverrideRule[];
  reviews: Review[];
  chatMessages: ChatMessage[];
  contributorPoints: ContributorPoint[];
  auditLogs: AuditLog[];
  webhookEvents: WebhookEvent[];
  settings: SystemSettings;
  replays: ReviewReplay[];
  users: User[];
  sessions: Session[];
  notifications: Notification[];
  issues: GitHubIssue[];
}

const DEFAULT_RULES: OverrideRule[] = [
  {
    id: 'rule_sensitive_files',
    key: 'sensitive_files',
    label: 'Sensitive Paths Protection',
    description: 'Flag PRs that modify auth, payment, database schemas, or CI/CD configuration files.',
    type: 'boolean',
    value: true,
    isEnabled: true,
    category: 'security'
  },
  {
    id: 'rule_large_pr',
    key: 'large_pr',
    label: 'PR Size Limit',
    description: 'Flag PRs that change more than a specific number of lines of code.',
    type: 'number',
    value: 200,
    isEnabled: true,
    category: 'size'
  },
  {
    id: 'rule_first_time',
    key: 'first_time',
    label: 'First-time Contributor Validation',
    description: 'Always flag or request manual verification for authors with zero prior merged PRs.',
    type: 'boolean',
    value: true,
    isEnabled: true,
    category: 'contributor'
  },
  {
    id: 'rule_secrets_detected',
    key: 'secrets_detected',
    label: 'Secret and Credentials Scanning',
    description: 'Scan diffs for password formulas, env declarations, secret tokens, or private keys.',
    type: 'boolean',
    value: true,
    isEnabled: true,
    category: 'security'
  },
  {
    id: 'rule_confidence_threshold',
    key: 'confidence_threshold',
    label: 'Min AI Confidence Score',
    description: 'Flag PR reviews where the AI rating falls below this percentage threshold.',
    type: 'number',
    value: 80,
    isEnabled: true,
    category: 'security'
  },
  {
    id: 'rule_deleted_tests',
    key: 'deleted_tests',
    label: 'Deleted Test Code Alert',
    description: 'Flag and block auto-merge if test files (.test.ts, spec.js, etc.) are removed or scaled down.',
    type: 'boolean',
    value: true,
    isEnabled: true,
    category: 'ci'
  }
];

const DEFAULT_SETTINGS: SystemSettings = {
  aiModel: 'gemini-3.5-flash',
  aiPromptTemplate: `You are the autonomous MergeKeeper. Analyze the PR details, files changed, and code diff below.
Evaluate based on: Correctness, Security, Performance, Maintainability, and Test Coverage.

Generate inline comments if issues are found, referencing files and lines.
Provide a final verdict: approve, request_changes, or flag (for critical/security escalations).
Specify a confidence score (0-100) and clear reasoning.`,
  reviewStrictness: 'standard',
  webhookSecret: 'pr_agent_secret_secure_1337',
  autoMergeDefault: true,
  isMaintenanceMode: false,
  pointsOnMerge: 15,
  allowedAdminEmails: ['anasabubakar7000@gmail.com', 'adesanyafuhad5@gmail.com']
};

class JsonDatabase {
  private cache: Schema | null = null;

  private initializeDb() {
    if (!fs.existsSync(DB_FILE)) {
      const initialSchema: Schema = {
        repositories: [],
        pullRequests: [],
        rules: DEFAULT_RULES,
        reviews: [],
        chatMessages: [],
        contributorPoints: [],
        auditLogs: [],
        webhookEvents: [],
        settings: DEFAULT_SETTINGS,
        replays: [],
        users: [],
        sessions: [],
        notifications: [],
        issues: []
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialSchema, null, 2), 'utf8');
      this.cache = initialSchema;
    } else {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.cache = JSON.parse(raw);
      } catch (e) {
        console.error("Error reading db file, regenerating fresh database", e);
        const initialSchema: Schema = {
          repositories: [],
          pullRequests: [],
          rules: DEFAULT_RULES,
          reviews: [],
          chatMessages: [],
          contributorPoints: [],
          auditLogs: [],
          webhookEvents: [],
          settings: DEFAULT_SETTINGS,
          replays: [],
          users: [],
          sessions: [],
          notifications: [],
          issues: []
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialSchema, null, 2), 'utf8');
        this.cache = initialSchema;
      }
    }
  }

  private getData(): Schema {
    if (!this.cache) {
      this.initializeDb();
    }
    const data = this.cache!;
    if (!data.repositories) data.repositories = [];
    if (!data.pullRequests) data.pullRequests = [];
    if (!data.rules) data.rules = DEFAULT_RULES;
    if (!data.reviews) data.reviews = [];
    if (!data.chatMessages) data.chatMessages = [];
    if (!data.contributorPoints) data.contributorPoints = [];
    if (!data.auditLogs) data.auditLogs = [];
    if (!data.webhookEvents) data.webhookEvents = [];
    if (!data.settings) data.settings = DEFAULT_SETTINGS;
    if (!data.settings.allowedAdminEmails) {
      data.settings.allowedAdminEmails = ['anasabubakar7000@gmail.com', 'adesanyafuhad5@gmail.com'];
    }
    if (!data.replays) data.replays = [];
    if (!data.users) data.users = [];
    if (!data.sessions) data.sessions = [];
    if (!data.notifications) data.notifications = [];
    if (!data.issues) data.issues = [];
    return data;
  }

  private saveData(data: Schema) {
    this.cache = data;
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error("Failed to write to file database", err);
    }
  }

  // REPOSITORIES
  getRepos(): Repository[] {
    return this.getData().repositories;
  }

  addRepo(repo: Repository): Repository {
    const data = this.getData();
    // Prevent duplicate entries
    if (!data.repositories.some(r => r.id === repo.id)) {
      data.repositories.push(repo);
      this.saveData(data);
    }
    return repo;
  }

  deleteRepo(id: string): boolean {
    const data = this.getData();
    const len = data.repositories.length;
    data.repositories = data.repositories.filter(r => r.id !== id);
    if (data.repositories.length !== len) {
      // Also delete associated PRs
      data.pullRequests = data.pullRequests.filter(pr => pr.repoId !== id);
      this.saveData(data);
      return true;
    }
    return false;
  }

  // PULL REQUESTS
  getPRs(): PullRequest[] {
    return this.getData().pullRequests;
  }

  getPR(id: string): PullRequest | undefined {
    return this.getData().pullRequests.find(pr => pr.id === id);
  }

  addPR(pr: PullRequest): PullRequest {
    const data = this.getData();
    data.pullRequests = data.pullRequests.filter(p => p.id !== pr.id);
    data.pullRequests.unshift(pr);
    this.saveData(data);
    return pr;
  }

  updatePR(id: string, updates: Partial<PullRequest>): PullRequest | undefined {
    const data = this.getData();
    const prIdx = data.pullRequests.findIndex(pr => pr.id === id);
    if (prIdx !== -1) {
      data.pullRequests[prIdx] = { ...data.pullRequests[prIdx], ...updates, updatedAt: new Date().toISOString() };
      this.saveData(data);
      return data.pullRequests[prIdx];
    }
    return undefined;
  }

  // RULES
  getRules(): OverrideRule[] {
    return this.getData().rules;
  }

  updateRule(id: string, value: string | number | boolean, isEnabled: boolean): OverrideRule | undefined {
    const data = this.getData();
    const ruleIdx = data.rules.findIndex(r => r.id === id);
    if (ruleIdx !== -1) {
      data.rules[ruleIdx].value = value;
      data.rules[ruleIdx].isEnabled = isEnabled;
      this.saveData(data);
      return data.rules[ruleIdx];
    }
    return undefined;
  }

  // REVIEWS
  getReviews(): Review[] {
    return this.getData().reviews;
  }

  getReviewForPR(prId: string): Review | undefined {
    return this.getData().reviews.find(r => r.prId === prId);
  }

  addReview(review: Review): Review {
    const data = this.getData();
    data.reviews = data.reviews.filter(r => r.prId !== review.prId);
    data.reviews.push(review);
    this.saveData(data);
    return review;
  }

  // REPLAYS
  getReplaysForPR(prId: string): ReviewReplay[] {
    const data = this.getData();
    return data.replays.filter(r => r.prId === prId);
  }

  addReplay(replay: ReviewReplay): ReviewReplay {
    const data = this.getData();
    data.replays.push(replay);
    this.saveData(data);
    return replay;
  }

  // CHAT MESSAGES
  getChatMessages(prId: string): ChatMessage[] {
    return this.getData().chatMessages.filter(msg => msg.prId === prId);
  }

  addChatMessage(msg: ChatMessage): ChatMessage {
    const data = this.getData();
    data.chatMessages.push(msg);
    this.saveData(data);
    return msg;
  }

  // CONTRIBUTOR POINTS
  getPoints(): ContributorPoint[] {
    return this.getData().contributorPoints;
  }

  updatePoints(username: string, change: number, isNewMerge: boolean = false): ContributorPoint {
    const data = this.getData();
    let point = data.contributorPoints.find(p => p.username === username);
    if (!point) {
      point = {
        id: `pt_${username}_${Date.now()}`,
        username,
        avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80`,
        points: 0,
        streak: 1,
        prsMerged: 0,
        reviewsCompleted: 0,
        achievements: ['First Contribution']
      };
      data.contributorPoints.push(point);
    }

    point.points += change;
    if (isNewMerge) {
      point.prsMerged += 1;
      const lastDateStr = point.lastContributionDate;
      const today = new Date().toISOString().split('T')[0];
      if (lastDateStr) {
        const lastDate = lastDateStr.split('T')[0];
        if (lastDate !== today) {
          const diffTime = Math.abs(new Date(today).getTime() - new Date(lastDate).getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            point.streak += 1;
          } else if (diffDays > 1) {
            point.streak = 1;
          }
        }
      } else {
        point.streak = 1;
      }
      point.lastContributionDate = new Date().toISOString();

      if (point.prsMerged >= 5 && !point.achievements.includes('Streak Master')) {
        point.achievements.push('Streak Master');
      }
      if (point.points >= 100 && !point.achievements.includes('Elite Contributor')) {
        point.achievements.push('Elite Contributor');
      }
    } else {
      point.reviewsCompleted += 1;
    }

    this.saveData(data);
    return point;
  }

  // AUDIT LOGS
  getAuditLogs(): AuditLog[] {
    return this.getData().auditLogs;
  }

  addAuditLog(action: string, details: string): AuditLog {
    const data = this.getData();
    const log: AuditLog = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    data.auditLogs.unshift(log);
    if (data.auditLogs.length > 200) {
      data.auditLogs = data.auditLogs.slice(0, 200);
    }
    this.saveData(data);
    return log;
  }

  // WEBHOOK EVENTS
  getWebhookEvents(): WebhookEvent[] {
    return this.getData().webhookEvents;
  }

  addWebhookEvent(eventName: string, payload: any, status: 'success' | 'failed' | 'ignored', response: string): WebhookEvent {
    const data = this.getData();
    const event: WebhookEvent = {
      id: `wh_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      eventName,
      payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
      status,
      response,
      timestamp: new Date().toISOString()
    };
    data.webhookEvents.unshift(event);
    if (data.webhookEvents.length > 50) {
      data.webhookEvents = data.webhookEvents.slice(0, 50);
    }
    this.saveData(data);
    return event;
  }

  // SETTINGS
  getSettings(): SystemSettings {
    return this.getData().settings;
  }

  updateSettings(updates: Partial<SystemSettings>): SystemSettings {
    const data = this.getData();
    data.settings = { ...data.settings, ...updates };
    this.saveData(data);
    return data.settings;
  }

  // USER MANAGEMENT
  getUsers(): User[] {
    return this.getData().users;
  }

  getUser(id: string): User | undefined {
    return this.getData().users.find(u => u.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    return this.getData().users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  getUserByUsername(username: string): User | undefined {
    return this.getData().users.find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  createUser(user: User): User {
    const data = this.getData();
    data.users.push(user);
    this.saveData(data);
    return user;
  }

  updateUser(userId: string, updates: Partial<User>): User | undefined {
    const data = this.getData();
    const idx = data.users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      data.users[idx] = { ...data.users[idx], ...updates };
      this.saveData(data);
      return data.users[idx];
    }
    return undefined;
  }

  // SESSIONS
  getSessions(): Session[] {
    return this.getData().sessions;
  }

  getSession(id: string): Session | undefined {
    return this.getData().sessions.find(s => s.id === id);
  }

  createSession(session: Session): Session {
    const data = this.getData();
    data.sessions.push(session);
    this.saveData(data);
    return session;
  }

  deleteSession(id: string): boolean {
    const data = this.getData();
    const len = data.sessions.length;
    data.sessions = data.sessions.filter(s => s.id !== id);
    if (data.sessions.length !== len) {
      this.saveData(data);
      return true;
    }
    return false;
  }

  // NOTIFICATIONS
  getNotifications(userId: string): Notification[] {
    const data = this.getData();
    return data.notifications.filter(n => n.userId === userId);
  }

  addNotification(notif: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): Notification {
    const data = this.getData();
    const newNotif: Notification = {
      ...notif,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      isRead: false
    };
    data.notifications.unshift(newNotif);
    if (data.notifications.length > 500) {
      data.notifications = data.notifications.slice(0, 500);
    }
    this.saveData(data);
    return newNotif;
  }

  markNotificationAsRead(id: string): boolean {
    const data = this.getData();
    const idx = data.notifications.findIndex(n => n.id === id);
    if (idx !== -1) {
      data.notifications[idx].isRead = true;
      this.saveData(data);
      return true;
    }
    return false;
  }

  markAllNotificationsAsRead(userId: string): boolean {
    const data = this.getData();
    let modified = false;
    data.notifications = data.notifications.map(n => {
      if (n.userId === userId && !n.isRead) {
        modified = true;
        return { ...n, isRead: true };
      }
      return n;
    });
    if (modified) {
      this.saveData(data);
    }
    return modified;
  }

  // ISSUES
  getIssues(): GitHubIssue[] {
    const data = this.getData();
    if (!data.issues) data.issues = [];
    return data.issues;
  }

  addIssue(issue: GitHubIssue): GitHubIssue {
    const data = this.getData();
    if (!data.issues) data.issues = [];
    data.issues = data.issues.filter(i => i.id !== issue.id);
    data.issues.unshift(issue);
    this.saveData(data);
    return issue;
  }

  deleteIssue(id: string): boolean {
    const data = this.getData();
    if (!data.issues) data.issues = [];
    const len = data.issues.length;
    data.issues = data.issues.filter(i => i.id !== id);
    if (data.issues.length !== len) {
      this.saveData(data);
      return true;
    }
    return false;
  }

  // PURGE ALL MOCK DATA FOR GITHUB SOURCE OF TRUTH
  purgeMockData() {
    const data = this.getData();
    data.repositories = [];
    data.pullRequests = [];
    data.reviews = [];
    data.chatMessages = [];
    data.contributorPoints = [];
    data.notifications = [];
    data.issues = [];
    data.webhookEvents = [];
    this.saveData(data);
  }
}

export const db = new JsonDatabase();
